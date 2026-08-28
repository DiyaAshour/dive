import { database } from "@platform/database";
import { bookingEmail, partnerBookingEmail, priceWatchEmail } from "./templates";
import { queueEmail } from "./email";
import { ensureBookingInvoice, ensureCancellationNote } from "../finance/service";

export async function queueBookingLifecycleEmails(bookingId: string, kind: "CONFIRMED" | "MODIFIED" | "CANCELLED") {
  const booking = await database().booking.findUnique({
    where: {id: bookingId},
    include: {
      hotel: {
        select: {
          name: true,
          memberships: {
            where: {status: "ACTIVE", role: {in: ["OWNER", "MANAGER", "FRONT_DESK"]}},
            select: {user: {select: {id: true, email: true, displayName: true}}},
          },
        },
      },
    },
  });
  if (!booking) return {queued: 0};

  const site = siteOrigin();
  let invoiceUrl: string | null = null;
  if (kind === "CANCELLED") {
    const note = await ensureCancellationNote(bookingId);
    invoiceUrl = `${site}/invoice/${encodeURIComponent(note.id)}?token=${encodeURIComponent(note.accessToken)}`;
  } else {
    const invoice = await ensureBookingInvoice(bookingId);
    invoiceUrl = `${site}/invoice/${encodeURIComponent(invoice.id)}?token=${encodeURIComponent(invoice.accessToken)}`;
  }
  const bookingUrl = `${site}/booking/${encodeURIComponent(bookingId)}`;
  const paymentLabel = booking.paymentMode === "PAY_AT_HOTEL"
    ? "Pay at hotel / الدفع في الفندق"
    : booking.paymentState === "CAPTURED"
      ? "Paid online / مدفوع إلكترونياً"
      : "Online payment / دفع إلكتروني";
  const guestContent = bookingEmail({
    kind,
    guestName: booking.guestName,
    hotelName: booking.hotel.name,
    bookingReference: booking.reference,
    arrival: dateKey(booking.arrival),
    departure: dateKey(booking.departure),
    total: Number(booking.totalAmount),
    currency: booking.currency,
    paymentLabel,
    invoiceUrl,
    bookingUrl,
    cancellationPenalty: booking.cancellationPenaltyAmount === null ? null : Number(booking.cancellationPenaltyAmount),
    refundableAmount: booking.refundableAmount === null ? null : Number(booking.refundableAmount),
  });
  const guestKind = kind === "CONFIRMED" ? "BOOKING_CONFIRMED" : kind === "MODIFIED" ? "BOOKING_MODIFIED" : "BOOKING_CANCELLED";
  await queueEmail({
    kind: guestKind,
    toEmail: booking.guestEmail,
    toName: booking.guestName,
    subject: guestContent.subject,
    htmlBody: guestContent.html,
    textBody: guestContent.text,
    dedupeKey: `${guestKind}:${booking.id}:R${booking.revision}:guest`,
    bookingId: booking.id,
    hotelId: booking.hotelId,
    userId: booking.userId,
  });
  let queued = 1;

  const dashboardUrl = `${site}/hotel-dashboard/reservations?hotelId=${encodeURIComponent(booking.hotelId)}`;
  const partnerContent = partnerBookingEmail({
    kind,
    hotelName: booking.hotel.name,
    reference: booking.reference,
    guestName: booking.guestName,
    arrival: dateKey(booking.arrival),
    departure: dateKey(booking.departure),
    total: Number(booking.totalAmount),
    currency: booking.currency,
    dashboardUrl,
  });
  const partnerRecipients = uniqueRecipients(booking.hotel.memberships.map((membership) => membership.user));
  for (const recipient of partnerRecipients) {
    await queueEmail({
      kind: "PARTNER_BOOKING_NOTICE",
      toEmail: recipient.email,
      toName: recipient.displayName,
      subject: partnerContent.subject,
      htmlBody: partnerContent.html,
      textBody: partnerContent.text,
      dedupeKey: `PARTNER_BOOKING_NOTICE:${kind}:${booking.id}:R${booking.revision}:${recipient.id}`,
      bookingId: booking.id,
      hotelId: booking.hotelId,
      userId: recipient.id,
    });
    queued += 1;
  }
  return {queued};
}

export async function syncBookingLifecycleEmails(limit = 500) {
  const events = await database().bookingEvent.findMany({
    where: {type: {in: ["CONFIRMED", "MODIFIED", "CANCELLED"]}},
    select: {bookingId: true, type: true},
    orderBy: {createdAt: "desc"},
    take: Math.max(1, Math.min(limit, 2_000)),
  });
  let scanned = 0;
  for (const event of events) {
    scanned += 1;
    try {
      await queueBookingLifecycleEmails(event.bookingId, event.type as "CONFIRMED" | "MODIFIED" | "CANCELLED");
    } catch (error) {
      console.error(JSON.stringify({event: "booking_email_sync_failed", bookingId: event.bookingId, message: error instanceof Error ? error.message : "unknown error"}));
    }
  }
  return {scanned};
}

export async function syncPriceWatchNotificationEmails(limit = 500) {
  const notifications = await database().userNotification.findMany({
    where: {kind: {in: ["PRICE_DROP", "PRICE_TARGET_REACHED"]}},
    orderBy: {createdAt: "desc"},
    take: Math.max(1, Math.min(limit, 2_000)),
  });
  if (!notifications.length) return {scanned: 0};
  const userIds = [...new Set(notifications.map((notification) => notification.userId))];
  const users = await database().user.findMany({where: {id: {in: userIds}}, select: {id: true, email: true, displayName: true}});
  const byId = new Map(users.map((user) => [user.id, user]));
  for (const notification of notifications) {
    const user = byId.get(notification.userId);
    if (!user) continue;
    const content = priceWatchEmail({title: notification.title, body: notification.body, url: absoluteUrl(notification.link ?? "/account/alerts")});
    await queueEmail({
      kind: "PRICE_WATCH",
      toEmail: user.email,
      toName: user.displayName,
      subject: content.subject,
      htmlBody: content.html,
      textBody: content.text,
      dedupeKey: `PRICE_WATCH:${notification.id}`,
      userId: user.id,
    });
  }
  return {scanned: notifications.length};
}

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");
}
function absoluteUrl(path: string): string {return /^https?:\/\//i.test(path) ? path : `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;}
function dateKey(value: Date): string {return value.toISOString().slice(0, 10);}
function uniqueRecipients<T extends {id:string;email:string;displayName:string}>(items:T[]):T[]{const seen=new Set<string>();return items.filter((item)=>{const key=item.email.trim().toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});}
