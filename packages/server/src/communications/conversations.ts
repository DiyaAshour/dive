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

export async function ingestInboundAdminEmail(secret: string | null, input: InboundEmailInput) {
  requireInboundSecret(secret);
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

export function inboundEmailCapabilities() {
  const domain = process.env.EMAIL_INBOUND_DOMAIN?.trim().toLowerCase() || null;
  return {configured: Boolean(domain && process.env.EMAIL_INBOUND_WEBHOOK_SECRET?.trim()), domain};
}

function conversationReplyAddress(conversationId: string): string | null {
  const domain = process.env.EMAIL_INBOUND_DOMAIN?.trim().toLowerCase();
  return domain ? `reply+${conversationId}@${domain}` : process.env.EMAIL_REPLY_TO?.trim() || null;
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
  const raw = process.env.EMAIL_FROM?.trim() || "support@handmekey.com";
  const match = raw.match(/<([^>]+)>/);
  return normalizeEmail(match?.[1] ?? raw);
}
function escapeRegex(value: string) {return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");}
function cleanSubject(value: string) {return value.replace(/[\r\n]+/g, " ").trim().slice(0, 180);}
function cleanBody(value: string) {return value.replace(/\r\n/g, "\n").trim().slice(0, 50_000);}
function normalizeEmail(value: string) {return value.trim().toLowerCase();}
function isEmail(value: string) {return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;}
