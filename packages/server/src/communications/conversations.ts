import { timingSafeEqual } from "node:crypto";
import { database } from "@platform/database";
import { ApplicationError, notFound } from "../errors";
import { requirePlatformAdmin } from "../admin/authorization";
import { queueEmail, emailCapabilities } from "./email";
import { manualEmailContent } from "./templates";

export type AdminComposeEmailInput = Readonly<{
  conversationId?: string | null;
  toEmail?: string | null;
  toName?: string | null;
  subject?: string | null;
  textBody: string;
}>;

export type InboundEmailInput = Readonly<{
  conversationId?: string | null;
  toEmail: string;
  fromEmail: string;
  fromName?: string | null;
  subject?: string | null;
  textBody: string;
  htmlBody?: string | null;
  providerMessageId?: string | null;
  inReplyTo?: string | null;
}>;

export async function getAdminEmailConversationInbox(actorUserId: string, input: Readonly<{query?: string; page?: number}> = {}) {
  await requirePlatformAdmin(actorUserId);

  // Pull recent Resend inbound messages when the inbox is opened as a low-latency
  // fallback in addition to the hourly maintenance job. Failures never block Admin.
  await syncResendInboundEmails(25).catch((error) => {
    console.error(JSON.stringify({event: "resend_inbound_inbox_sync_failed", message: errorMessage(error)}));
  });

  const db = database();
  const query = input.query?.trim().slice(0, 160) ?? "";
  const page = Math.max(1, Math.min(Math.floor(input.page ?? 1), 10_000));
  const pageSize = 30;
  const where = query ? {
    OR: [
      {participantEmail: {contains: query, mode: "insensitive" as const}},
      {participantName: {contains: query, mode: "insensitive" as const}},
      {subject: {contains: query, mode: "insensitive" as const}},
    ],
  } : {};
  const [items, total, unread] = await Promise.all([
    db.adminEmailConversation.findMany({
      where,
      include: {messages: {orderBy: {createdAt: "desc"}, take: 1, select: {direction: true, textBody: true, createdAt: true}}},
      orderBy: {lastMessageAt: "desc"},
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.adminEmailConversation.count({where}),
    db.adminEmailConversation.aggregate({_sum: {unreadCount: true}}),
  ]);
  return {
    items: items.map((item) => ({...item, latestMessage: item.messages[0] ?? null, messages: undefined})),
    unread: unread._sum.unreadCount ?? 0,
    pagination: {page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize))},
    query,
    capability: {...emailCapabilities(), inbound: inboundEmailCapabilities()},
  };
}

export async function getAdminEmailConversation(actorUserId: string, conversationId: string) {
  await requirePlatformAdmin(actorUserId);
  const db = database();
  const conversation = await db.adminEmailConversation.findUnique({
    where: {id: conversationId},
    include: {
      messages: {
        orderBy: {createdAt: "asc"},
        include: {outbox: {select: {status: true, attempts: true, lastError: true, provider: true, providerMessageId: true, sentAt: true}}},
      },
    },
  });
  if (!conversation) notFound("Email conversation");
  if (conversation.unreadCount > 0) await db.adminEmailConversation.update({where: {id: conversation.id}, data: {unreadCount: 0}});
  return {...conversation, unreadCount: 0, capability: {...emailCapabilities(), inbound: inboundEmailCapabilities()}};
}

export async function sendAdminConversationEmail(actorUserId: string, input: AdminComposeEmailInput) {
  await requirePlatformAdmin(actorUserId);
  const textBody = cleanBody(input.textBody);
  if (!textBody) throw new ApplicationError("EMAIL_BODY_REQUIRED", "Email body is required", 400);
  const db = database();
  let conversation = input.conversationId ? await db.adminEmailConversation.findUnique({where: {id: input.conversationId}}) : null;
  if (input.conversationId && !conversation) notFound("Email conversation");

  const recipientEmail = normalizeEmail(conversation?.participantEmail ?? input.toEmail ?? "");
  if (!isEmail(recipientEmail)) throw new ApplicationError("INVALID_EMAIL_RECIPIENT", "A valid recipient email is required", 400);
  const recipientName = conversation?.participantName ?? (input.toName?.trim().slice(0, 120) || null);
  const baseSubject = cleanSubject(conversation?.subject ?? input.subject ?? "");
  if (!baseSubject) throw new ApplicationError("EMAIL_SUBJECT_REQUIRED", "Email subject is required", 400);

  if (!conversation) {
    conversation = await db.adminEmailConversation.create({data: {
      participantEmail: recipientEmail,
      participantName: recipientName,
      subject: baseSubject,
      createdByUserId: actorUserId,
      lastMessageAt: new Date(),
    }});
  }

  const subject = input.conversationId && !/^re:/i.test(baseSubject) ? `Re: ${baseSubject}` : baseSubject;
  const fromEmail = senderAddress();
  const content = manualEmailContent({subject, textBody});
  const message = await db.adminEmailConversationMessage.create({data: {
    conversationId: conversation.id,
    direction: "OUTBOUND",
    fromEmail,
    toEmail: recipientEmail,
    toName: recipientName,
    subject,
    textBody,
    htmlBody: content.html,
    createdByUserId: actorUserId,
  }});
  const replyTo = conversationReplyAddress(conversation.id);
  await queueEmail({
    kind: "MANUAL_EMAIL",
    toEmail: recipientEmail,
    toName: recipientName,
    subject,
    htmlBody: content.html,
    textBody: content.text,
    dedupeKey: `admin-manual-email:${message.id}`,
    conversationId: conversation.id,
    conversationMessageId: message.id,
    replyTo,
  });
  await Promise.all([
    db.adminEmailConversation.update({where: {id: conversation.id}, data: {lastMessageAt: new Date(), status: "OPEN"}}),
    db.auditLog.create({data: {
      actorUserId,
      action: input.conversationId ? "ADMIN_EMAIL_REPLY_QUEUED" : "ADMIN_EMAIL_CONVERSATION_CREATED",
      entityType: "AdminEmailConversation",
      entityId: conversation.id,
      after: {toEmail: recipientEmail, subject, messageId: message.id},
    }}),
  ]);
  return {conversationId: conversation.id, messageId: message.id};
}

/**
 * Legacy/forwarder inbound gateway. It remains available for providers that POST
 * normalized messages and authenticate with EMAIL_INBOUND_WEBHOOK_SECRET.
 */
export async function ingestInboundAdminEmail(secret: string | null, input: InboundEmailInput) {
  requireInboundSecret(secret);
  return persistInboundAdminEmail(input);
}

/**
 * Pull received mail directly from Resend. The API response itself is authenticated
 * with RESEND_API_KEY, so this path does not trust a public webhook body.
 */
export async function syncResendInboundEmails(limit = 50): Promise<{configured: boolean; scanned: number; imported: number; skipped: number; failed: number; providerStatus?: number}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return {configured: false, scanned: 0, imported: 0, skipped: 0, failed: 0};

  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
  const listResponse = await fetch(`https://api.resend.com/emails/receiving?limit=${safeLimit}`, {
    headers: {authorization: `Bearer ${apiKey}`},
    cache: "no-store",
  });
  if (!listResponse.ok) {
    console.error(JSON.stringify({event: "resend_receiving_list_rejected", status: listResponse.status}));
    return {configured: true, scanned: 0, imported: 0, skipped: 0, failed: 1, providerStatus: listResponse.status};
  }

  const payload = await listResponse.json().catch(() => null) as {data?: unknown[]} | null;
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  let scanned = 0;
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Process oldest first so a sequence of replies preserves the conversation timeline.
  for (const raw of [...rows].reverse()) {
    scanned += 1;
    const summary = asRecord(raw);
    const emailId = stringValue(summary.id) || stringValue(summary.email_id);
    if (!emailId) {
      skipped += 1;
      continue;
    }

    const providerMessageId = `resend-received:${emailId}`;
    const duplicate = await database().adminEmailConversationMessage.findUnique({
      where: {providerMessageId},
      select: {id: true},
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    try {
      const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
        headers: {authorization: `Bearer ${apiKey}`},
        cache: "no-store",
      });
      if (!response.ok) {
        failed += 1;
        console.error(JSON.stringify({event: "resend_received_email_retrieve_rejected", emailId, status: response.status}));
        continue;
      }

      const received = asRecord(await response.json().catch(() => null));
      const from = parseAddress(stringValue(received.from) || stringValue(summary.from));
      const toValues = stringArray(received.to).length ? stringArray(received.to) : stringArray(summary.to);
      const to = chooseHandMeKeyRecipient(toValues);
      if (!from.email || !to) {
        skipped += 1;
        continue;
      }

      const htmlBody = stringValue(received.html) || null;
      const textBody = cleanBody(stringValue(received.text) || htmlToText(htmlBody ?? ""));
      if (!textBody) {
        skipped += 1;
        continue;
      }

      const result = await persistInboundAdminEmail({
        toEmail: to,
        fromEmail: from.email,
        fromName: from.name,
        subject: stringValue(received.subject) || stringValue(summary.subject) || null,
        textBody,
        htmlBody,
        providerMessageId,
        inReplyTo: headerValue(received.headers, "in-reply-to"),
      });
      result.duplicate ? (skipped += 1) : (imported += 1);
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({event: "resend_received_email_import_failed", emailId, message: errorMessage(error)}));
    }
  }

  return {configured: true, scanned, imported, skipped, failed, providerStatus: listResponse.status};
}

export function inboundEmailCapabilities() {
  const domain = configuredInboundDomain();
  const resendReceiving = Boolean(process.env.RESEND_API_KEY?.trim());
  const normalizedGateway = Boolean(domain && process.env.EMAIL_INBOUND_WEBHOOK_SECRET?.trim());
  return {configured: resendReceiving || normalizedGateway, domain, provider: resendReceiving ? "resend" : normalizedGateway ? "gateway" : null};
}

async function persistInboundAdminEmail(input: InboundEmailInput) {
  const fromEmail = normalizeEmail(input.fromEmail);
  const toEmail = normalizeEmail(input.toEmail);
  if (!isEmail(fromEmail) || !isEmail(toEmail)) throw new ApplicationError("INVALID_INBOUND_EMAIL", "Inbound email addresses are invalid", 400);
  const textBody = cleanBody(input.textBody);
  if (!textBody) throw new ApplicationError("INBOUND_EMAIL_BODY_REQUIRED", "Inbound email body is required", 400);
  const db = database();
  if (input.providerMessageId) {
    const existing = await db.adminEmailConversationMessage.findUnique({where: {providerMessageId: input.providerMessageId}});
    if (existing) return {conversationId: existing.conversationId, messageId: existing.id, duplicate: true};
  }

  let conversationId = input.conversationId?.trim() || extractConversationId(toEmail);
  if (!conversationId && input.inReplyTo) {
    const matched = await db.adminEmailConversationMessage.findFirst({
      where: {OR: [{providerMessageId: input.inReplyTo}, {outbox: {is: {providerMessageId: input.inReplyTo}}}]},
      select: {conversationId: true},
    });
    conversationId = matched?.conversationId ?? null;
  }

  let conversation = conversationId ? await db.adminEmailConversation.findUnique({where: {id: conversationId}}) : null;
  if (conversation && normalizeEmail(conversation.participantEmail) !== fromEmail) conversation = null;

  // Standard mailbox replies may arrive at support@handmekey.com without a plus
  // conversation token. Match the most recent open thread by participant + subject.
  if (!conversation) {
    const subjectKey = normalizedThreadSubject(input.subject ?? "");
    if (subjectKey) {
      const candidates = await db.adminEmailConversation.findMany({
        where: {participantEmail: fromEmail, status: "OPEN"},
        orderBy: {lastMessageAt: "desc"},
        take: 20,
      });
      conversation = candidates.find((candidate) => normalizedThreadSubject(candidate.subject) === subjectKey) ?? null;
    }
  }

  if (!conversation) {
    conversation = await db.adminEmailConversation.create({data: {
      subject: cleanSubject(input.subject ?? "") || "Email conversation",
      participantEmail: fromEmail,
      participantName: input.fromName?.trim().slice(0, 120) || null,
      lastMessageAt: new Date(),
      unreadCount: 1,
    }});
  } else {
    conversation = await db.adminEmailConversation.update({where: {id: conversation.id}, data: {lastMessageAt: new Date(), unreadCount: {increment: 1}, status: "OPEN"}});
  }
  const message = await db.adminEmailConversationMessage.create({data: {
    conversationId: conversation.id,
    direction: "INBOUND",
    fromEmail,
    fromName: input.fromName?.trim().slice(0, 120) || null,
    toEmail,
    subject: cleanSubject(input.subject ?? "") || conversation.subject,
    textBody,
    htmlBody: input.htmlBody?.slice(0, 200_000) || null,
    providerMessageId: input.providerMessageId?.trim().slice(0, 300) || null,
    inReplyTo: input.inReplyTo?.trim().slice(0, 300) || null,
    receivedAt: new Date(),
  }});
  return {conversationId: conversation.id, messageId: message.id, duplicate: false};
}

function conversationReplyAddress(conversationId: string): string | null {
  const domain = process.env.EMAIL_INBOUND_DOMAIN?.trim().toLowerCase();
  return domain ? `reply+${conversationId}@${domain}` : process.env.EMAIL_REPLY_TO?.trim() || "support@handmekey.com";
}
function extractConversationId(toEmail: string): string | null {
  const domain = process.env.EMAIL_INBOUND_DOMAIN?.trim().toLowerCase();
  if (!domain) return null;
  const match = toEmail.match(new RegExp(`^reply\\+([a-z0-9]+)@${escapeRegex(domain)}$`, "i"));
  return match?.[1] ?? null;
}
function requireInboundSecret(value: string | null) {
  const expected = process.env.EMAIL_INBOUND_WEBHOOK_SECRET?.trim();
  if (!expected || !value) throw new ApplicationError("INBOUND_EMAIL_UNAUTHORIZED", "Inbound email gateway is not authorized", 401);
  const a = Buffer.from(expected);
  const b = Buffer.from(value);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ApplicationError("INBOUND_EMAIL_UNAUTHORIZED", "Inbound email gateway is not authorized", 401);
}
function senderAddress() {
  const raw = process.env.EMAIL_FROM?.trim() || "bookings@handmekey.com";
  const match = raw.match(/<([^>]+)>/);
  return normalizeEmail(match?.[1] ?? raw);
}
function configuredInboundDomain(): string | null {
  const explicit = process.env.EMAIL_INBOUND_DOMAIN?.trim().toLowerCase();
  if (explicit) return explicit;
  const reply = parseAddress(process.env.EMAIL_REPLY_TO?.trim() || "support@handmekey.com").email;
  return reply.includes("@") ? reply.split("@").pop() ?? null : null;
}
function chooseHandMeKeyRecipient(values: string[]): string | null {
  const allowed = configuredRecipientDomains();
  for (const raw of values) {
    const email = parseAddress(raw).email;
    const domain = email.split("@").pop()?.toLowerCase();
    if (isEmail(email) && domain && allowed.has(domain)) return email;
  }
  return null;
}
function configuredRecipientDomains(): Set<string> {
  const domains = new Set<string>();
  const addEmail = (raw: string | undefined) => {
    const email = parseAddress(raw ?? "").email;
    const domain = email.split("@").pop()?.toLowerCase();
    if (domain) domains.add(domain);
  };
  addEmail(process.env.EMAIL_REPLY_TO || "support@handmekey.com");
  addEmail(process.env.EMAIL_FROM || "bookings@handmekey.com");
  const inbound = process.env.EMAIL_INBOUND_DOMAIN?.trim().toLowerCase();
  if (inbound) domains.add(inbound);
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://handmekey.com").hostname.toLowerCase();
    if (host) domains.add(host.replace(/^www\./, ""));
  } catch {}
  return domains;
}
function parseAddress(value: string): {email: string; name: string | null} {
  const text = value.trim();
  const match = text.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    const email = normalizeEmail(match[2] ?? "");
    const name = (match[1] ?? "").trim().replace(/^['"]|['"]$/g, "").slice(0, 120) || null;
    return {email, name};
  }
  return {email: normalizeEmail(text), name: null};
}
function headerValue(headers: unknown, wanted: string): string | null {
  const key = wanted.toLowerCase();
  if (Array.isArray(headers)) {
    for (const item of headers) {
      const row = asRecord(item);
      const name = (stringValue(row.name) || stringValue(row.key)).toLowerCase();
      if (name === key) return stringValue(row.value) || null;
    }
    return null;
  }
  const record = asRecord(headers);
  for (const [name, value] of Object.entries(record)) {
    if (name.toLowerCase() === key) return stringValue(value) || null;
  }
  return null;
}
function normalizedThreadSubject(value: string): string {
  return cleanSubject(value).replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, "").trim().toLowerCase();
}
function htmlToText(value: string): string {
  return value
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function asRecord(value: unknown): Record<string, unknown> {return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};}
function stringValue(value: unknown): string {return typeof value === "string" ? value.trim() : "";}
function stringArray(value: unknown): string[] {return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : typeof value === "string" ? [value] : [];}
function errorMessage(error: unknown): string {return (error instanceof Error ? error.message : "Unknown inbound email error").slice(0, 2_000);}
function escapeRegex(value: string) {return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");}
function cleanSubject(value: string) {return value.replace(/[\r\n]+/g, " ").trim().slice(0, 180);}
function cleanBody(value: string) {return value.replace(/\r\n/g, "\n").trim().slice(0, 50_000);}
function normalizeEmail(value: string) {return value.trim().toLowerCase();}
function isEmail(value: string) {return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;}
