import { localDateInTimeZone, parseDateOnly } from "@platform/core";
import type {
  CreateGuestRequestInput,
  ExpectedArrivalInput,
  FrontDeskNoteInput,
  HotelReservationQuery,
  StaffArrivalInput,
  UpdateGuestRequestStatusInput,
} from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError, badRequest, forbidden, notFound, unauthorized } from "../errors";
import { requireHotelPermission } from "../hotels/authorization";
import { requireBookingAccess } from "../bookings/authorization";
import { bookingAccessTokenHash } from "../bookings/security";

export type OperationsBookingAccess = Readonly<{userId?: string | null; accessToken?: string | null}>;

const ACTIVE_RESERVATION_STATUSES: Array<"CONFIRMED" | "MODIFIED"> = ["CONFIRMED", "MODIFIED"];

export async function listMyTrips(userId: string) {
  const bookings = await database().booking.findMany({
    where: {userId},
    include: {
      hotel: {
        select: {
          id: true,
          name: true,
          city: true,
          countryCode: true,
          timezone: true,
          photos: {
            where: {mediaObject: {state: "READY"}},
            select: {alt: true, mediaObject: {select: {publicUrl: true}}},
            orderBy: {sortOrder: "asc"},
            take: 1,
          },
        },
      },
      roomType: {select: {id: true, name: true}},
      ratePlan: {select: {id: true, name: true}},
      guestRequests: {select: {id: true, status: true}},
    },
    orderBy: [{arrival: "desc"}, {createdAt: "desc"}],
    take: 250,
  });

  return bookings.map((booking) => {
    const arrival = dateKey(booking.arrival);
    const departure = dateKey(booking.departure);
    const today = localDateInTimeZone(new Date(), booking.hotel.timezone);
    return {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      tripState: tripState(booking.status, arrival, departure, today),
      paymentMode: booking.paymentMode,
      paymentState: booking.paymentState,
      adults: booking.adults,
      children: booking.children,
      currency: booking.currency,
      totalAmount: Number(booking.totalAmount),
      arrival,
      departure,
      expectedArrivalTime: booking.expectedArrivalTime,
      arrivalStatus: booking.arrivalStatus,
      hotel: {
        id: booking.hotel.id,
        name: booking.hotel.name,
        city: booking.hotel.city,
        countryCode: booking.hotel.countryCode,
        coverPhoto: booking.hotel.photos[0]?.mediaObject.publicUrl
          ? {url: booking.hotel.photos[0].mediaObject.publicUrl, alt: booking.hotel.photos[0].alt}
          : null,
      },
      roomType: booking.roomType,
      ratePlan: booking.ratePlan,
      openRequestCount: booking.guestRequests.filter((request) => request.status !== "RESOLVED").length,
    };
  });
}

export async function linkBookingToAccount(userId: string, bookingId: string, accessToken: string | null | undefined) {
  if (!accessToken) unauthorized("Booking access token required to add this reservation to your account");
  const db = database();
  const [user, booking] = await Promise.all([
    db.user.findUnique({where: {id: userId}, select: {id: true, email: true}}),
    db.booking.findUnique({where: {id: bookingId}, select: {id: true, userId: true, guestEmail: true, accessTokenHash: true}}),
  ]);
  if (!user) notFound("User");
  if (!booking) notFound("Booking");
  if (booking.accessTokenHash !== bookingAccessTokenHash(accessToken)) forbidden("Booking access token is invalid");
  if (booking.userId === userId) return {bookingId, linked: true, reused: true};
  if (booking.userId) throw new ApplicationError("BOOKING_ALREADY_LINKED", "This booking already belongs to another account", 409);
  if (normalizeEmail(booking.guestEmail) !== normalizeEmail(user.email)) {
    forbidden("The booking email must match the signed-in account before it can be linked");
  }

  return db.$transaction(async (tx) => {
    const linked = await tx.booking.updateMany({where: {id: bookingId, userId: null}, data: {userId}});
    if (linked.count !== 1) {
      const current = await tx.booking.findUnique({where: {id: bookingId}, select: {userId: true}});
      if (current?.userId === userId) return {bookingId, linked: true, reused: true};
      throw new ApplicationError("BOOKING_ALREADY_LINKED", "This booking was linked to another account", 409);
    }
    await tx.bookingEvent.create({data: {bookingId, type: "ACCOUNT_LINKED", actorUserId: userId, data: {accountEmail: user.email}}});
    return {bookingId, linked: true, reused: false};
  });
}

export async function updateExpectedArrival(bookingId: string, input: ExpectedArrivalInput, context: OperationsBookingAccess) {
  await requireBookingAccess(bookingId, context);
  const db = database();
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({where: {id: bookingId}});
    if (!booking) notFound("Booking");
    assertOperationalBooking(booking.status);
    if (booking.arrivalStatus === "ARRIVED") {
      throw new ApplicationError("GUEST_ALREADY_ARRIVED", "Arrival details cannot be changed after the hotel marks the guest as arrived", 409);
    }
    const nextStatus = input.expectedArrivalTime ? "EXPECTED" as const : "NOT_PROVIDED" as const;
    await tx.booking.update({where: {id: bookingId}, data: {expectedArrivalTime: input.expectedArrivalTime, arrivalStatus: nextStatus}});
    await tx.bookingEvent.create({data: {
      bookingId,
      type: "ARRIVAL_UPDATED",
      actorUserId: context.userId ?? null,
      data: {source: "GUEST", beforeTime: booking.expectedArrivalTime, afterTime: input.expectedArrivalTime, beforeStatus: booking.arrivalStatus, afterStatus: nextStatus},
    }});
    return {bookingId, expectedArrivalTime: input.expectedArrivalTime, arrivalStatus: nextStatus};
  });
}

export async function listGuestRequests(bookingId: string, context: OperationsBookingAccess) {
  await requireBookingAccess(bookingId, context);
  return database().bookingGuestRequest.findMany({
    where: {bookingId},
    orderBy: {createdAt: "asc"},
    select: {id: true, category: true, message: true, status: true, createdAt: true, updatedAt: true},
  });
}

export async function createGuestRequest(bookingId: string, input: CreateGuestRequestInput, context: OperationsBookingAccess) {
  await requireBookingAccess(bookingId, context);
  const db = database();
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({where: {id: bookingId}, select: {id: true, status: true}});
    if (!booking) notFound("Booking");
    assertOperationalBooking(booking.status);
    const request = await tx.bookingGuestRequest.create({data: {
      bookingId,
      category: input.category,
      message: input.message,
      createdByUserId: context.userId ?? null,
    }});
    await tx.bookingEvent.create({data: {
      bookingId,
      type: "REQUEST_CREATED",
      actorUserId: context.userId ?? null,
      data: {requestId: request.id, category: request.category},
    }});
    return request;
  });
}

export async function updateHotelArrival(actorUserId: string, hotelId: string, bookingId: string, input: StaffArrivalInput) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:manage");
  const db = database();
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({where: {id: bookingId, hotelId}});
    if (!booking) notFound("Booking");
    assertOperationalBooking(booking.status);

    let nextTime = input.expectedArrivalTime !== undefined ? input.expectedArrivalTime : booking.expectedArrivalTime;
    let nextStatus = input.arrivalStatus ?? booking.arrivalStatus;
    if (input.arrivalStatus === "NOT_PROVIDED") nextTime = null;
    if (input.arrivalStatus === undefined && input.expectedArrivalTime !== undefined) {
      nextStatus = input.expectedArrivalTime ? "EXPECTED" : "NOT_PROVIDED";
    }
    if (nextStatus === "EXPECTED" && !nextTime) badRequest("ARRIVAL_TIME_REQUIRED", "Expected arrival status requires an arrival time");

    await tx.booking.update({where: {id: bookingId}, data: {expectedArrivalTime: nextTime, arrivalStatus: nextStatus}});
    await tx.bookingEvent.create({data: {
      bookingId,
      type: "ARRIVAL_UPDATED",
      actorUserId,
      data: {source: "HOTEL", beforeTime: booking.expectedArrivalTime, afterTime: nextTime, beforeStatus: booking.arrivalStatus, afterStatus: nextStatus},
    }});
    await tx.auditLog.create({data: {
      hotelId,
      actorUserId,
      action: "BOOKING_ARRIVAL_UPDATED",
      entityType: "Booking",
      entityId: bookingId,
      before: {expectedArrivalTime: booking.expectedArrivalTime, arrivalStatus: booking.arrivalStatus},
      after: {expectedArrivalTime: nextTime, arrivalStatus: nextStatus},
    }});
    return {bookingId, expectedArrivalTime: nextTime, arrivalStatus: nextStatus};
  });
}

export async function updateGuestRequestStatus(
  actorUserId: string,
  hotelId: string,
  bookingId: string,
  requestId: string,
  input: UpdateGuestRequestStatusInput,
) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:manage");
  const db = database();
  return db.$transaction(async (tx) => {
    const request = await tx.bookingGuestRequest.findFirst({where: {id: requestId, bookingId, booking: {hotelId}}});
    if (!request) notFound("Guest request");
    if (request.status === input.status) return request;
    const updated = await tx.bookingGuestRequest.update({where: {id: request.id}, data: {status: input.status}});
    await tx.bookingEvent.create({data: {bookingId, type: "REQUEST_STATUS_UPDATED", actorUserId, data: {requestId, before: request.status, after: input.status}}});
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "GUEST_REQUEST_STATUS_UPDATED", entityType: "BookingGuestRequest", entityId: requestId, before: {status: request.status}, after: {status: input.status}}});
    return updated;
  });
}

export async function addFrontDeskNote(actorUserId: string, hotelId: string, bookingId: string, input: FrontDeskNoteInput) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:manage");
  const db = database();
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({where: {id: bookingId, hotelId}, select: {id: true}});
    if (!booking) notFound("Booking");
    const note = await tx.bookingFrontDeskNote.create({data: {bookingId, authorUserId: actorUserId, body: input.body}});
    await tx.bookingEvent.create({data: {bookingId, type: "FRONT_DESK_NOTE_ADDED", actorUserId, data: {noteId: note.id}}});
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "FRONT_DESK_NOTE_ADDED", entityType: "BookingFrontDeskNote", entityId: note.id, after: {bookingId}}});
    return note;
  });
}

export async function listFrontDeskNotes(actorUserId: string, hotelId: string, bookingId: string) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:view");
  const booking = await database().booking.findFirst({where: {id: bookingId, hotelId}, select: {id: true}});
  if (!booking) notFound("Booking");
  return database().bookingFrontDeskNote.findMany({
    where: {bookingId},
    orderBy: {createdAt: "desc"},
    take: 100,
    select: {id: true, body: true, createdAt: true, author: {select: {id: true, displayName: true, email: true}}},
  });
}

export async function listHotelReservationOperations(actorUserId: string, hotelId: string, query: HotelReservationQuery) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:view");
  const date = parseDateOnly(query.date);
  const bookings = await database().booking.findMany({
    where: reservationDateFilter(hotelId, date, query.scope),
    include: {
      roomType: {select: {id: true, name: true}},
      ratePlan: {select: {id: true, name: true}},
      guestRequests: {orderBy: {createdAt: "asc"}, select: {id: true, category: true, message: true, status: true, createdAt: true}},
      frontDeskNotes: {orderBy: {createdAt: "desc"}, take: 3, select: {id: true, body: true, createdAt: true, author: {select: {displayName: true}}}},
    },
    orderBy: [{expectedArrivalTime: "asc"}, {guestName: "asc"}],
    take: 500,
  });
  return {
    hotelId,
    date: query.date,
    scope: query.scope,
    count: bookings.length,
    reservations: bookings.map((booking) => ({
      id: booking.id,
      reference: booking.reference,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      adults: booking.adults,
      children: booking.children,
      arrival: dateKey(booking.arrival),
      departure: dateKey(booking.departure),
      expectedArrivalTime: booking.expectedArrivalTime,
      arrivalStatus: booking.arrivalStatus,
      status: booking.status,
      paymentMode: booking.paymentMode,
      paymentState: booking.paymentState,
      currency: booking.currency,
      totalAmount: Number(booking.totalAmount),
      roomType: booking.roomType,
      ratePlan: booking.ratePlan,
      guestRequests: booking.guestRequests,
      frontDeskNotes: booking.frontDeskNotes,
    })),
  };
}

export async function hotelReservationCsv(actorUserId: string, hotelId: string, query: HotelReservationQuery) {
  const report = await listHotelReservationOperations(actorUserId, hotelId, query);
  const header = ["Booking reference", "Guest", "Email", "Adults", "Children", "Arrival", "Departure", "Expected arrival", "Arrival status", "Booking status", "Room type", "Rate plan", "Payment", "Open requests"];
  const rows = report.reservations.map((booking) => [
    booking.reference,
    booking.guestName,
    booking.guestEmail,
    String(booking.adults),
    String(booking.children),
    booking.arrival,
    booking.departure,
    booking.expectedArrivalTime ?? "",
    booking.arrivalStatus,
    booking.status,
    booking.roomType.name,
    booking.ratePlan.name,
    `${booking.paymentMode}/${booking.paymentState}`,
    String(booking.guestRequests.filter((request) => request.status !== "RESOLVED").length),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function reservationDateFilter(hotelId: string, date: Date, scope: HotelReservationQuery["scope"]) {
  const active = {hotelId, status: {in: ACTIVE_RESERVATION_STATUSES}};
  if (scope === "ARRIVALS") return {...active, arrival: date};
  if (scope === "DEPARTURES") return {...active, departure: date};
  if (scope === "IN_HOUSE") return {...active, arrivalStatus: "ARRIVED" as const, arrival: {lte: date}, departure: {gt: date}};
  return {
    ...active,
    OR: [
      {arrival: date},
      {departure: date},
      {arrivalStatus: "ARRIVED" as const, arrival: {lt: date}, departure: {gt: date}},
    ],
  };
}

function assertOperationalBooking(status: string): void {
  if (!ACTIVE_RESERVATION_STATUSES.includes(status as "CONFIRMED" | "MODIFIED")) {
    throw new ApplicationError("BOOKING_NOT_OPERATIONAL", "Arrival details and guest requests are available only for confirmed reservations", 409);
  }
}

function tripState(status: string, arrival: string, departure: string, today: string): "UPCOMING" | "CURRENT" | "PAST" | "CANCELLED" {
  if (status === "CANCELLED" || status === "EXPIRED") return "CANCELLED";
  if (departure <= today) return "PAST";
  if (arrival > today) return "UPCOMING";
  return "CURRENT";
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function csvCell(value: string): string {
  const flattened = value.replace(/\r?\n/g, " ");
  const safe = /^\s*[=+\-@]/.test(flattened) ? `'${flattened}` : flattened;
  return /[",]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
