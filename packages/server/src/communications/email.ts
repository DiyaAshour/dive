import { database } from "@platform/database";

// Resend is selected automatically in production when RESEND_API_KEY is configured.
// Every queued transactional email gets one immediate delivery attempt. The outbox
// remains the source of truth so the worker/admin retry path can safely recover
// transient failures without sending duplicate messages.
const MAX_ATTEMPTS = 8;
const STALE_PROCESSING_MS = 10 * 60_000;
const DEFAULT_EMAIL_FROM = "HandMeKey <bookings@handmekey.com>";
const DEFAULT_EMAIL_REPLY_TO = "support@handmekey.com";

export type EmailKind =
  | "BOOKING_CONFIRMED"
  | "BOOKING_MODIFIED"
  | "BOOKING_CANCELLED"
  | "PARTNER_BOOKING_NOTICE"
  | "BOOKING_MESSAGE"
  | "PRICE_WATCH"
  | "PASSWORD_RESET"
  | "EMAIL_VERIFICATION"
  | "SECURITY_ALERT"
  | "PARTNER_STATEMENT"
  | "MANUAL_EMAIL";

export type QueueEmailInput = Readonly<{
  kind: EmailKind;
  toEmail: string;
  toName?: string | null;
  subject: string;
  htmlBody: string;
  textBody: string;
  dedupeKey: string;
  bookingId?: string | null;
  hotelId?: string | null;
  userId?: string | null;
  conversationId?: string | null;
  conversationMessageId?: string | null;
  replyTo?: string | null;
}>;

type DeliveryResult = Readonly<{
  processed: boolean;
  sent: boolean;
  failed: boolean;
  disabled: boolean;
}>;

export function emailCapabilities() {
  const provider = normalizedProvider();
  if (provider === "resend") {
    return {
      configured: Boolean(process.env.RESEND_API_KEY?.trim()),
      provider,
    } as const;
  }
  return {configured: false, provider: null} as const;
}

export async function queueEmail(input: QueueEmailInput) {
  const toEmail = normalizeEmail(input.toEmail);
  if (!toEmail) throw new Error("Email recipient is required");

  const db = database();
  const row = await db.emailOutbox.upsert({
    where: {dedupeKey: input.dedupeKey},
    create: {
      kind: input.kind,
      toEmail,
      toName: input.toName?.trim() || null,
      subject: input.subject.trim(),
      htmlBody: input.htmlBody,
      textBody: input.textBody,
      dedupeKey: input.dedupeKey,
      bookingId: input.bookingId ?? null,
      hotelId: input.hotelId ?? null,
      userId: input.userId ?? null,
      conversationId: input.conversationId ?? null,
      conversationMessageId: input.conversationMessageId ?? null,
      replyTo: input.replyTo?.trim() || null,
    },
    update: {},
  });

  // Delivery is intentionally best-effort from the request path. A Resend/network
  // failure is persisted as FAILED with backoff, but must not roll back a booking,
  // password reset request, message, or other primary business action.
  if (emailCapabilities().configured && (row.status === "PENDING" || row.status === "FAILED")) {
    await processEmailOutboxItem(row.id).catch((error) => {
      console.error(JSON.stringify({
        event: "immediate_email_delivery_failed",
        emailId: row.id,
        message: errorMessage(error),
      }));
    });
  }

  return (await db.emailOutbox.findUnique({where: {id: row.id}})) ?? row;
}

export async function processEmailOutboxItem(emailId: string): Promise<DeliveryResult> {
  const capability = emailCapabilities();
  if (!capability.configured) return {processed: false, sent: false, failed: false, disabled: true};

  const db = database();
  const row = await db.emailOutbox.findUnique({where: {id: emailId}});
  if (!row) return {processed: false, sent: false, failed: false, disabled: false};
  if (row.status !== "PENDING" && row.status !== "FAILED") {
    return {processed: false, sent: row.status === "SENT", failed: false, disabled: false};
  }
  if (row.attempts >= MAX_ATTEMPTS || row.nextAttemptAt.getTime() > Date.now()) {
    return {processed: false, sent: false, failed: false, disabled: false};
  }

  const claimed = await db.emailOutbox.updateMany({
    where: {
      id: row.id,
      status: {in: ["PENDING", "FAILED"]},
      attempts: {lt: MAX_ATTEMPTS},
      nextAttemptAt: {lte: new Date()},
    },
    data: {status: "PROCESSING", attempts: {increment: 1}},
  });
  if (claimed.count !== 1) return {processed: false, sent: false, failed: false, disabled: false};

  const attemptNumber = row.attempts + 1;
  try {
    const providerMessageId = await sendWithConfiguredProvider({
      toEmail: row.toEmail,
      toName: row.toName,
      subject: row.subject,
      htmlBody: row.htmlBody,
      textBody: row.textBody,
      replyTo: row.replyTo,
    });
    const sentAt = new Date();
    await db.$transaction(async (tx) => {
      await tx.emailOutbox.update({
        where: {id: row.id},
        data: {status: "SENT", provider: capability.provider, providerMessageId, sentAt, lastError: null},
      });
      if (row.conversationMessageId) {
        await tx.adminEmailConversationMessage.updateMany({
          where: {id: row.conversationMessageId},
          data: {providerMessageId, sentAt},
        });
      }
    });
    return {processed: true, sent: true, failed: false, disabled: false};
  } catch (error) {
    const dead = attemptNumber >= MAX_ATTEMPTS;
    const retryDelayMs = Math.min(6 * 60 * 60_000, 30_000 * Math.pow(2, Math.max(0, attemptNumber - 1)));
    await db.emailOutbox.update({
      where: {id: row.id},
      data: {
        status: dead ? "DEAD" : "FAILED",
        nextAttemptAt: dead ? row.nextAttemptAt : new Date(Date.now() + retryDelayMs),
        lastError: errorMessage(error),
      },
    });
    return {processed: true, sent: false, failed: true, disabled: false};
  }
}

export async function processEmailOutbox(limit = 50): Promise<{processed: number; sent: number; failed: number; disabled: boolean}> {
  const capability = emailCapabilities();
  if (!capability.configured) return {processed: 0, sent: 0, failed: 0, disabled: true};

  const db = database();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
  await db.emailOutbox.updateMany({
    where: {status: "PROCESSING", updatedAt: {lt: staleBefore}},
    data: {status: "FAILED", nextAttemptAt: new Date(), lastError: "Delivery worker lease expired before completion"},
  });

  const rows = await db.emailOutbox.findMany({
    where: {
      status: {in: ["PENDING", "FAILED"]},
      attempts: {lt: MAX_ATTEMPTS},
      nextAttemptAt: {lte: new Date()},
    },
    select: {id: true},
    orderBy: [{nextAttemptAt: "asc"}, {createdAt: "asc"}],
    take: Math.max(1, Math.min(limit, 200)),
  });

  let sent = 0;
  let failed = 0;
  let processed = 0;
  for (const row of rows) {
    const result = await processEmailOutboxItem(row.id);
    if (!result.processed) continue;
    processed += 1;
    if (result.sent) sent += 1;
    if (result.failed) failed += 1;
  }
  return {processed, sent, failed, disabled: false};
}

async function sendWithConfiguredProvider(input: Readonly<{toEmail: string; toName: string | null; subject: string; htmlBody: string; textBody: string; replyTo: string | null}>): Promise<string> {
  const provider = normalizedProvider();
  if (provider !== "resend") throw new Error("No email provider is configured");
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
  if (!apiKey) throw new Error("Resend email provider is missing RESEND_API_KEY");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {"content-type": "application/json", authorization: `Bearer ${apiKey}`},
    body: JSON.stringify({
      from,
      to: [input.toName ? `${input.toName} <${input.toEmail}>` : input.toEmail],
      subject: input.subject,
      html: input.htmlBody,
      text: input.textBody,
      reply_to: input.replyTo ?? process.env.EMAIL_REPLY_TO?.trim() ?? DEFAULT_EMAIL_REPLY_TO,
    }),
  });
  const body = await response.json().catch(() => ({})) as {id?: unknown; message?: unknown; name?: unknown};
  if (!response.ok || typeof body.id !== "string") {
    throw new Error(`Email provider rejected delivery (${response.status}): ${typeof body.message === "string" ? body.message : typeof body.name === "string" ? body.name : "unknown error"}`);
  }
  return body.id;
}

function normalizedProvider(): string {
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  return (process.env.EMAIL_PROVIDER ?? "none").trim().toLowerCase();
}
function normalizeEmail(value: string): string {return value.trim().toLowerCase();}
function errorMessage(error: unknown): string {const value = error instanceof Error ? error.message : "Unknown email delivery error"; return value.slice(0, 2_000);}
