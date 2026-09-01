import type { BookingMessageInput } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError, notFound } from "../errors";
import { requireBookingAccess } from "../bookings/authorization";
import { requireHotelPermission } from "../hotels/authorization";
import { queueEmail } from "../communications/email";
import { manualEmailContent } from "../communications/templates";

export type MessagingBookingAccess = Readonly<{userId?: string | null; accessToken?: string | null}>;

export async function listGuestBookingMessages(bookingId: string, context: MessagingBookingAccess) {
  await requireBookingAccess(bookingId, context);
  const booking = await database().booking.findUnique({where: {id: bookingId}, select: {id: true, conversation: {select: {id: true}}}});
  if (!booking) notFound("Booking");
  if (!booking.conversation) return [];
  await database().bookingMessage.updateMany({where: {conversationId: booking.conversation.id, senderKind: "HOTEL", guestReadAt: null}, data: {guestReadAt: new Date()}});
  return database().bookingMessage.findMany({where: {conversationId: booking.conversation.id}, orderBy: {createdAt: "asc"}, select: {id: true, senderKind: true, body: true, createdAt: true}});
}

export async function sendGuestBookingMessage(bookingId: string, input: BookingMessageInput, context: MessagingBookingAccess) {
  await requireBookingAccess(bookingId, context);
  const db = database();
  const result = await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({where: {id: bookingId}, select: {id: true, hotelId: true, status: true}});
    if (!booking) notFound("Booking");
    if (booking.status !== "CONFIRMED" && booking.status !== "MODIFIED") throw new ApplicationError("MESSAGING_NOT_AVAILABLE", "Messaging is available only for confirmed reservations", 409);
    const conversation = await tx.bookingConversation.upsert({where: {bookingId}, create: {bookingId, hotelId: booking.hotelId}, update: {updatedAt: new Date()}});
    const message = await tx.bookingMessage.create({data: {conversationId: conversation.id, senderUserId: context.userId ?? null, senderKind: "GUEST", body: input.body, guestReadAt: new Date()}});
    await tx.bookingConversation.update({where: {id: conversation.id}, data: {updatedAt: message.createdAt}});
    return {id: message.id, senderKind: message.senderKind, body: message.body, createdAt: message.createdAt};
  });

  await queueBookingMessageEmails(bookingId, result.id, "GUEST", result.body).catch((error) => {
    console.error(JSON.stringify({event: "booking_message_email_failed", bookingId, messageId: result.id, message: error instanceof Error ? error.message : "unknown error"}));
  });
  return result;
}

export async function listHotelConversations(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:view");
  const conversations = await database().bookingConversation.findMany({
    where: {hotelId},
    include: {
      booking: {select: {id: true, reference: true, guestName: true, arrival: true, departure: true, status: true}},
      messages: {orderBy: {createdAt: "desc"}, take: 1, select: {body: true, senderKind: true, createdAt: true}},
    },
    orderBy: {updatedAt: "desc"},
    take: 200,
  });
  const unread = await database().bookingMessage.groupBy({
    by: ["conversationId"],
    where: {conversation: {hotelId}, senderKind: "GUEST", hotelReadAt: null},
    _count: {_all: true},
  });
  const unreadByConversation = new Map(unread.map((item) => [item.conversationId, item._count._all]));
  return conversations.map((conversation) => ({
    id: conversation.id,
    booking: {...conversation.booking, arrival: conversation.booking.arrival.toISOString().slice(0, 10), departure: conversation.booking.departure.toISOString().slice(0, 10)},
    latestMessage: conversation.messages[0] ?? null,
    unreadCount: unreadByConversation.get(conversation.id) ?? 0,
    updatedAt: conversation.updatedAt,
  }));
}

export async function listHotelBookingMessages(actorUserId: string, hotelId: string, bookingId: string) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:view");
  const booking = await database().booking.findFirst({where: {id: bookingId, hotelId}, select: {id: true, conversation: {select: {id: true}}}});
  if (!booking) notFound("Booking");
  if (!booking.conversation) return [];
  await database().bookingMessage.updateMany({where: {conversationId: booking.conversation.id, senderKind: "GUEST", hotelReadAt: null}, data: {hotelReadAt: new Date()}});
  return database().bookingMessage.findMany({where: {conversationId: booking.conversation.id}, orderBy: {createdAt: "asc"}, select: {id: true, senderKind: true, body: true, createdAt: true, sender: {select: {displayName: true}}}});
}

export async function sendHotelBookingMessage(actorUserId: string, hotelId: string, bookingId: string, input: BookingMessageInput) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:manage");
  const result = await database().$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({where: {id: bookingId, hotelId}, select: {id: true, status: true}});
    if (!booking) notFound("Booking");
    if (booking.status !== "CONFIRMED" && booking.status !== "MODIFIED") throw new ApplicationError("MESSAGING_NOT_AVAILABLE", "Messaging is available only for confirmed reservations", 409);
    const conversation = await tx.bookingConversation.upsert({where: {bookingId}, create: {bookingId, hotelId}, update: {updatedAt: new Date()}});
    const message = await tx.bookingMessage.create({data: {conversationId: conversation.id, senderUserId: actorUserId, senderKind: "HOTEL", body: input.body, hotelReadAt: new Date()}});
    await tx.bookingConversation.update({where: {id: conversation.id}, data: {updatedAt: message.createdAt}});
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "BOOKING_MESSAGE_SENT", entityType: "Booking", entityId: bookingId, after: {messageId: message.id, bodyLength: input.body.length}}});
    return {id: message.id, senderKind: message.senderKind, body: message.body, createdAt: message.createdAt};
  });

  await queueBookingMessageEmails(bookingId, result.id, "HOTEL", result.body).catch((error) => {
    console.error(JSON.stringify({event: "booking_message_email_failed", bookingId, messageId: result.id, message: error instanceof Error ? error.message : "unknown error"}));
  });
  return result;
}

async function queueBookingMessageEmails(bookingId: string, messageId: string, senderKind: "GUEST" | "HOTEL", body: string) {
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

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");
  if (senderKind === "HOTEL") {
    const bookingUrl = `${site}/booking/${encodeURIComponent(booking.id)}`;
    const subject = `New message from ${booking.hotel.name} · ${booking.reference}`;
    const content = manualEmailContent({
      subject,
      textBody: `Hello ${booking.guestName},\n\n${booking.hotel.name} sent you a new message about booking ${booking.reference}:\n\n${body}\n\nOpen your booking and reply: ${bookingUrl}`,
    });
    await queueEmail({
      kind: "MANUAL_EMAIL",
      toEmail: booking.guestEmail,
      toName: booking.guestName,
      subject: content.subject,
      htmlBody: content.html,
      textBody: content.text,
      dedupeKey: `BOOKING_MESSAGE:guest:${messageId}`,
      bookingId: booking.id,
      hotelId: booking.hotelId,
      userId: booking.userId,
    });
    return {queued: 1};
  }

  const dashboardUrl = `${site}/hotel-dashboard/reservations?hotelId=${encodeURIComponent(booking.hotelId)}`;
  const subject = `New guest message · ${booking.reference} · ${booking.guestName}`;
  const content = manualEmailContent({
    subject,
    textBody: `${booking.guestName} sent a new message about booking ${booking.reference}:\n\n${body}\n\nOpen the reservation in Partner Hub: ${dashboardUrl}`,
  });
  const recipients = uniqueRecipients(booking.hotel.memberships.map((membership) => membership.user));
  for (const recipient of recipients) {
    await queueEmail({
      kind: "MANUAL_EMAIL",
      toEmail: recipient.email,
      toName: recipient.displayName,
      subject: content.subject,
      htmlBody: content.html,
      textBody: content.text,
      dedupeKey: `BOOKING_MESSAGE:partner:${messageId}:${recipient.id}`,
      bookingId: booking.id,
      hotelId: booking.hotelId,
      userId: recipient.id,
    });
  }
  return {queued: recipients.length};
}

function uniqueRecipients<T extends {id: string; email: string; displayName: string}>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const email = item.email.trim().toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}
