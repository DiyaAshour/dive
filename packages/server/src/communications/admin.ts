import { database } from "@platform/database";
import type { Prisma } from "@platform/database";
import { ApplicationError, notFound } from "../errors";
import { requirePlatformAdmin } from "../admin/authorization";
import { emailCapabilities, processEmailOutboxItem } from "./email";

export const ADMIN_EMAIL_STATUSES = ["PENDING", "PROCESSING", "SENT", "FAILED", "DEAD"] as const;
export const ADMIN_EMAIL_KINDS = [
  "BOOKING_CONFIRMED",
  "BOOKING_MODIFIED",
  "BOOKING_CANCELLED",
  "PARTNER_BOOKING_NOTICE",
  "PRICE_WATCH",
  "PASSWORD_RESET",
  "EMAIL_VERIFICATION",
  "SECURITY_ALERT",
  "PARTNER_STATEMENT",
  "MANUAL_EMAIL",
] as const;

type AdminEmailStatus = (typeof ADMIN_EMAIL_STATUSES)[number];
type AdminEmailKind = (typeof ADMIN_EMAIL_KINDS)[number];

export type AdminEmailFilters = Readonly<{
  query?: string;
  status?: string;
  kind?: string;
  page?: number;
}>;

export async function getAdminEmailOperations(actorUserId: string, filters: AdminEmailFilters = {}) {
  await requirePlatformAdmin(actorUserId);
  const query = filters.query?.trim().slice(0, 160) ?? "";
  const status = ADMIN_EMAIL_STATUSES.find((value) => value === filters.status) as AdminEmailStatus | undefined;
  const kind = ADMIN_EMAIL_KINDS.find((value) => value === filters.kind) as AdminEmailKind | undefined;
  const page = Math.max(1, Math.min(Math.floor(filters.page ?? 1), 10_000));
  const pageSize = 50;

  const where: Prisma.EmailOutboxWhereInput = {
    ...(status ? {status} : {}),
    ...(kind ? {kind} : {}),
    ...(query ? {OR: [
      {toEmail: {contains: query, mode: "insensitive"}},
      {toName: {contains: query, mode: "insensitive"}},
      {subject: {contains: query, mode: "insensitive"}},
      {bookingId: {contains: query, mode: "insensitive"}},
      {hotelId: {contains: query, mode: "insensitive"}},
      {providerMessageId: {contains: query, mode: "insensitive"}},
    ]} : {}),
  };

  const db = database();
  const [items, total, pending, processing, sent, failed, dead] = await Promise.all([
    db.emailOutbox.findMany({
      where,
      select: {
        id: true,
        kind: true,
        toEmail: true,
        toName: true,
        subject: true,
        status: true,
        attempts: true,
        nextAttemptAt: true,
        provider: true,
        providerMessageId: true,
        lastError: true,
        bookingId: true,
        hotelId: true,
        userId: true,
        conversationId: true,
        sentAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {createdAt: "desc"},
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.emailOutbox.count({where}),
    db.emailOutbox.count({where: {status: "PENDING"}}),
    db.emailOutbox.count({where: {status: "PROCESSING"}}),
    db.emailOutbox.count({where: {status: "SENT"}}),
    db.emailOutbox.count({where: {status: "FAILED"}}),
    db.emailOutbox.count({where: {status: "DEAD"}}),
  ]);

  const bookingIds = [...new Set(items.flatMap((item) => item.bookingId ? [item.bookingId] : []))];
  const hotelIds = [...new Set(items.flatMap((item) => item.hotelId ? [item.hotelId] : []))];
  const [bookings, hotels] = await Promise.all([
    bookingIds.length ? db.booking.findMany({where: {id: {in: bookingIds}}, select: {id: true, reference: true}}) : [],
    hotelIds.length ? db.hotel.findMany({where: {id: {in: hotelIds}}, select: {id: true, name: true}}) : [],
  ]);
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking.reference]));
  const hotelById = new Map(hotels.map((hotel) => [hotel.id, hotel.name]));

  return {
    items: items.map((item) => ({
      ...item,
      bookingReference: item.bookingId ? bookingById.get(item.bookingId) ?? null : null,
      hotelName: item.hotelId ? hotelById.get(item.hotelId) ?? null : null,
    })),
    pagination: {page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize))},
    counts: {pending, processing, sent, failed, dead, total: pending + processing + sent + failed + dead},
    capability: emailCapabilities(),
    filters: {query, status: status ?? null, kind: kind ?? null},
  };
}

export async function retryAdminEmail(actorUserId: string, emailId: string) {
  await requirePlatformAdmin(actorUserId);
  const db = database();
  const queued = await db.$transaction(async (tx) => {
    const before = await tx.emailOutbox.findUnique({
      where: {id: emailId},
      select: {id: true, status: true, attempts: true, lastError: true, hotelId: true, bookingId: true, toEmail: true, subject: true},
    });
    if (!before) notFound("Email message");
    if (before.status === "SENT") throw new ApplicationError("EMAIL_ALREADY_SENT", "Sent email cannot be queued again", 409);
    if (before.status === "PROCESSING") throw new ApplicationError("EMAIL_IN_PROGRESS", "Email delivery is currently in progress", 409);
    if (before.status === "PENDING") throw new ApplicationError("EMAIL_ALREADY_QUEUED", "Email is already queued for delivery", 409);

    const updated = await tx.emailOutbox.update({
      where: {id: emailId},
      data: {
        status: "PENDING",
        attempts: 0,
        nextAttemptAt: new Date(),
        lastError: null,
        provider: null,
        providerMessageId: null,
        sentAt: null,
      },
      select: {id: true, status: true, attempts: true, nextAttemptAt: true, updatedAt: true},
    });

    await tx.auditLog.create({data: {
      actorUserId,
      hotelId: before.hotelId,
      action: "ADMIN_EMAIL_RETRY_QUEUED",
      entityType: "EmailOutbox",
      entityId: emailId,
      before: {status: before.status, attempts: before.attempts, lastError: before.lastError, bookingId: before.bookingId, toEmail: before.toEmail, subject: before.subject},
      after: {status: updated.status, attempts: updated.attempts, nextAttemptAt: updated.nextAttemptAt.toISOString()},
    }});
    return updated;
  });

  await processEmailOutboxItem(emailId).catch(() => undefined);
  return (await db.emailOutbox.findUnique({
    where: {id: emailId},
    select: {id: true, status: true, attempts: true, nextAttemptAt: true, updatedAt: true},
  })) ?? queued;
}
