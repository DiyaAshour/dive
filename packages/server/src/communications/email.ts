import { database } from "@platform/database";

const MAX_ATTEMPTS = 8;
const STALE_PROCESSING_MS = 10 * 60_000;

export type EmailKind =
  | "BOOKING_CONFIRMED"
  | "BOOKING_MODIFIED"
  | "BOOKING_CANCELLED"
  | "PARTNER_BOOKING_NOTICE"
  | "PRICE_WATCH"
  | "PASSWORD_RESET"
  | "EMAIL_VERIFICATION"
  | "SECURITY_ALERT"
  | "PARTNER_STATEMENT";

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
}>;

export function emailCapabilities() {
  const provider = normalizedProvider();
  if (provider === "resend") {
    return {
      configured: Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()),
      provider,
    } as const;
  }
  return {configured: false, provider: null} as const;
}

export async function queueEmail(input: QueueEmailInput) {
  const toEmail = normalizeEmail(input.toEmail);
  if (!toEmail) throw new Error("Email recipient is required");
  return database().emailOutbox.upsert({
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
    },
    update: {},
  });
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
    orderBy: [{nextAttemptAt: "asc"}, {createdAt: "asc"}],
    take: Math.max(1, Math.min(limit, 200)),
  });

  let sent = 0;
  let failed = 0;
  let processed = 0;
  for (const row of rows) {
    const claimed = await db.emailOutbox.updateMany({
      where: {id: row.id, status: {in: ["PENDING", "FAILED"]}, attempts: {lt: MAX_ATTEMPTS}},
      data: {status: "PROCESSING", attempts: {increment: 1}},
    });
    if (claimed.count !== 1) continue;
    processed += 1;
    try {
      const providerMessageId = await sendWithConfiguredProvider({
        toEmail: row.toEmail,
        toName: row.toName,
        subject: row.subject,
        htmlBody: row.htmlBody,
        textBody: row.textBody,
      });
      await db.emailOutbox.update({
        where: {id: row.id},
        data: {
          status: "SENT",
          provider: capability.provider,
          providerMessageId,
          sentAt: new Date(),
          lastError: null,
        },
      });
      sent += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const dead = attempts >= MAX_ATTEMPTS;
      const retryDelayMs = Math.min(6 * 60 * 60_000, 30_000 * Math.pow(2, Math.max(0, attempts - 1)));
      await db.emailOutbox.update({
        where: {id: row.id},
        data: {
          status: dead ? "DEAD" : "FAILED",
          nextAttemptAt: dead ? row.nextAttemptAt : new Date(Date.now() + retryDelayMs),
          lastError: errorMessage(error),
        },
      });
      failed += 1;
    }
  }
  return {processed, sent, failed, disabled: false};
}

async function sendWithConfiguredProvider(input: Readonly<{toEmail: string; toName: string | null; subject: string; htmlBody: string; textBody: string}>): Promise<string> {
  const provider = normalizedProvider();
  if (provider !== "resend") throw new Error("No email provider is configured");
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Resend email provider is missing RESEND_API_KEY or EMAIL_FROM");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {"content-type": "application/json", authorization: `Bearer ${apiKey}`},
    body: JSON.stringify({
      from,
      to: [input.toName ? `${input.toName} <${input.toEmail}>` : input.toEmail],
      subject: input.subject,
      html: input.htmlBody,
      text: input.textBody,
      ...(process.env.EMAIL_REPLY_TO?.trim() ? {reply_to: process.env.EMAIL_REPLY_TO.trim()} : {}),
    }),
  });
  const body = await response.json().catch(() => ({})) as {id?: unknown; message?: unknown; name?: unknown};
  if (!response.ok || typeof body.id !== "string") {
    throw new Error(`Email provider rejected delivery (${response.status}): ${typeof body.message === "string" ? body.message : typeof body.name === "string" ? body.name : "unknown error"}`);
  }
  return body.id;
}

function normalizedProvider(): string {
  return (process.env.EMAIL_PROVIDER ?? "none").trim().toLowerCase();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function errorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : "Unknown email delivery error";
  return value.slice(0, 2_000);
}
