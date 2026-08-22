import type { BookingMessageInput } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError, notFound } from "../errors";
import { requireBookingAccess } from "../bookings/authorization";
import { requireHotelPermission } from "../hotels/authorization";

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
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({where: {id: bookingId}, select: {id: true, hotelId: true, status: true}});
    if (!booking) notFound("Booking");
    if (booking.status !== "CONFIRMED" && booking.status !== "MODIFIED") throw new ApplicationError("MESSAGING_NOT_AVAILABLE", "Messaging is available only for confirmed reservations", 409);
    const conversation = await tx.bookingConversation.upsert({where: {bookingId}, create: {bookingId, hotelId: booking.hotelId}, update: {updatedAt: new Date()}});
    const message = await tx.bookingMessage.create({data: {conversationId: conversation.id, senderUserId: context.userId ?? null, senderKind: "GUEST", body: input.body, guestReadAt: new Date()}});
    await tx.bookingConversation.update({where: {id: conversation.id}, data: {updatedAt: message.createdAt}});
    return {id: message.id, senderKind: message.senderKind, body: message.body, createdAt: message.createdAt};
  });
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
  return database().$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({where: {id: bookingId, hotelId}, select: {id: true, status: true}});
    if (!booking) notFound("Booking");
    if (booking.status !== "CONFIRMED" && booking.status !== "MODIFIED") throw new ApplicationError("MESSAGING_NOT_AVAILABLE", "Messaging is available only for confirmed reservations", 409);
    const conversation = await tx.bookingConversation.upsert({where: {bookingId}, create: {bookingId, hotelId}, update: {updatedAt: new Date()}});
    const message = await tx.bookingMessage.create({data: {conversationId: conversation.id, senderUserId: actorUserId, senderKind: "HOTEL", body: input.body, hotelReadAt: new Date()}});
    await tx.bookingConversation.update({where: {id: conversation.id}, data: {updatedAt: message.createdAt}});
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "BOOKING_MESSAGE_SENT", entityType: "Booking", entityId: bookingId, after: {messageId: message.id, bodyLength: input.body.length}}});
    return {id: message.id, senderKind: message.senderKind, body: message.body, createdAt: message.createdAt};
  });
}
