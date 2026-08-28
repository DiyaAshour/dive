import {localDateInTimeZone, parseDateOnly} from "@platform/core";
import type {ModifyBookingInput, ReservationCenterQuery} from "@platform/contracts";
import {database} from "@platform/database";
import type {Prisma} from "@platform/database";
import {ApplicationError, notFound} from "../errors";
import {requireHotelPermission} from "../hotels/authorization";
import {bookingView, modifyBooking, previewCancellation} from "../bookings/service";
import {cancelBookingWithWallet} from "../wallet/service";

const ACTIVE_STATUSES = ["CONFIRMED", "MODIFIED"] as const;

export async function listHotelReservationCenter(actorUserId: string, hotelId: string, query: ReservationCenterQuery) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:view");
  const date = parseDateOnly(query.date);
  const scoped = reservationCenterFilter(hotelId, date, query.scope);
  const where: Prisma.BookingWhereInput = query.q
    ? {
        AND: [
          scoped,
          {
            OR: [
              {reference: {contains: query.q, mode: "insensitive"}},
              {guestName: {contains: query.q, mode: "insensitive"}},
              {guestEmail: {contains: query.q, mode: "insensitive"}},
            ],
          },
        ],
      }
    : scoped;

  const [bookings, dailyBookings] = await Promise.all([
    database().booking.findMany({
      where,
      select: {
        id: true,
        reference: true,
        guestName: true,
        guestEmail: true,
        adults: true,
        children: true,
        arrival: true,
        departure: true,
        expectedArrivalTime: true,
        arrivalStatus: true,
        status: true,
        paymentMode: true,
        paymentState: true,
        currency: true,
        totalAmount: true,
        roomType: {select: {id: true, name: true}},
        ratePlan: {select: {id: true, name: true}},
        guestRequests: {select: {status: true}},
        _count: {select: {frontDeskNotes: true}},
      },
      orderBy: [{arrival: "asc"}, {expectedArrivalTime: "asc"}, {guestName: "asc"}],
      take: 500,
    }),
    database().booking.findMany({
      where: reservationCenterFilter(hotelId, date, "ALL"),
      select: {
        status: true,
        arrival: true,
        departure: true,
        arrivalStatus: true,
        guestRequests: {select: {status: true}},
      },
      take: 1000,
    }),
  ]);

  const reservations = bookings.map((booking) => {
    const arrival = dateKey(booking.arrival);
    const departure = dateKey(booking.departure);
    return {
      id: booking.id,
      reference: booking.reference,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      adults: booking.adults,
      children: booking.children,
      arrival,
      departure,
      expectedArrivalTime: booking.expectedArrivalTime,
      arrivalStatus: booking.arrivalStatus,
      status: booking.status,
      paymentMode: booking.paymentMode,
      paymentState: booking.paymentState,
      currency: booking.currency,
      totalAmount: Number(booking.totalAmount),
      roomType: booking.roomType,
      ratePlan: booking.ratePlan,
      openRequestCount: booking.guestRequests.filter((request) => request.status !== "RESOLVED").length,
      noteCount: booking._count.frontDeskNotes,
      operationalState: operationalState(booking.status, booking.arrivalStatus, arrival, departure, query.date),
    };
  });

  return {
    hotelId,
    date: query.date,
    scope: query.scope,
    q: query.q,
    count: reservations.length,
    stats: {
      arrivals: dailyBookings.filter((booking) => booking.status !== "CANCELLED" && booking.status !== "NO_SHOW" && dateKey(booking.arrival) === query.date).length,
      departures: dailyBookings.filter((booking) => booking.status !== "CANCELLED" && booking.status !== "NO_SHOW" && dateKey(booking.departure) === query.date).length,
      inHouse: dailyBookings.filter((booking) => booking.status !== "CANCELLED" && booking.status !== "NO_SHOW" && booking.arrivalStatus === "ARRIVED" && dateKey(booking.arrival) <= query.date && dateKey(booking.departure) > query.date).length,
      cancelled: dailyBookings.filter((booking) => booking.status === "CANCELLED").length,
      noShow: dailyBookings.filter((booking) => booking.status === "NO_SHOW").length,
      openRequests: dailyBookings.reduce((sum, booking) => sum + booking.guestRequests.filter((request) => request.status !== "RESOLVED").length, 0),
    },
    reservations,
  };
}

export async function getHotelReservationDetail(actorUserId: string, hotelId: string, bookingId: string) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:view");
  const operational = await database().booking.findFirst({
    where: {id: bookingId, hotelId},
    select: {
      id: true,
      expectedArrivalTime: true,
      arrivalStatus: true,
      hotel: {select: {timezone: true}},
      guestRequests: {
        orderBy: {createdAt: "asc"},
        select: {id: true, category: true, message: true, status: true, createdAt: true, updatedAt: true},
      },
      frontDeskNotes: {
        orderBy: {createdAt: "desc"},
        take: 100,
        select: {id: true, body: true, createdAt: true, author: {select: {displayName: true, email: true}}},
      },
    },
  });
  if (!operational) notFound("Booking");

  const view = await bookingView(bookingId);
  const today = localDateInTimeZone(new Date(), operational.hotel.timezone);
  const active = view.status === "CONFIRMED" || view.status === "MODIFIED";
  const checkedIn = operational.arrivalStatus === "ARRIVED";
  const arrivalPassed = view.arrival < today;

  return {
    ...view,
    expectedArrivalTime: operational.expectedArrivalTime,
    arrivalStatus: operational.arrivalStatus,
    timezone: operational.hotel.timezone,
    today,
    canModify: active && !checkedIn && !arrivalPassed && view.paymentState !== "CAPTURED",
    canCancel: active && !checkedIn && !arrivalPassed,
    canMarkNoShow: active && !checkedIn && arrivalPassed,
    guestRequests: operational.guestRequests,
    frontDeskNotes: operational.frontDeskNotes,
  };
}

export async function modifyHotelReservation(
  actorUserId: string,
  hotelId: string,
  bookingId: string,
  input: ModifyBookingInput,
  idempotencyKey: string,
) {
  const before = await hotelReservationForMutation(actorUserId, hotelId, bookingId);
  if (before.arrivalStatus === "ARRIVED") {
    throw new ApplicationError("GUEST_ALREADY_ARRIVED", "Checked-in stays cannot be modified from the reservation center", 409);
  }
  const today = localDateInTimeZone(new Date(), before.hotel.timezone);
  if (dateKey(before.arrival) < today) {
    throw new ApplicationError("ARRIVAL_DATE_PASSED", "Past-arrival reservations cannot be modified from the reservation center", 409);
  }
  const updated = await modifyBooking(bookingId, input, idempotencyKey, {userId: actorUserId});
  await database().auditLog.create({
    data: {
      hotelId,
      actorUserId,
      action: "BOOKING_MODIFIED_BY_HOTEL",
      entityType: "Booking",
      entityId: bookingId,
      before: {
        roomTypeId: before.roomTypeId,
        ratePlanId: before.ratePlanId,
        arrival: dateKey(before.arrival),
        departure: dateKey(before.departure),
        adults: before.adults,
        children: before.children,
        status: before.status,
        revision: before.revision,
        totalAmount: Number(before.totalAmount),
      },
      after: {
        roomTypeId: updated.roomType.id,
        ratePlanId: updated.ratePlan.id,
        arrival: updated.arrival,
        departure: updated.departure,
        adults: updated.occupancy.adults,
        children: updated.occupancy.children,
        status: updated.status,
        revision: updated.revision,
        totalAmount: updated.amounts.total,
      },
    },
  });
  return getHotelReservationDetail(actorUserId, hotelId, bookingId);
}

export async function previewHotelReservationCancellation(actorUserId: string, hotelId: string, bookingId: string) {
  const booking = await hotelReservationForMutation(actorUserId, hotelId, bookingId);
  if (booking.arrivalStatus === "ARRIVED") {
    throw new ApplicationError("GUEST_ALREADY_ARRIVED", "Checked-in stays cannot be cancelled from the reservation center", 409);
  }
  const today = localDateInTimeZone(new Date(), booking.hotel.timezone);
  if (dateKey(booking.arrival) < today) {
    throw new ApplicationError("USE_NO_SHOW", "The arrival date has passed; use the no-show action instead", 409);
  }
  return previewCancellation(bookingId, {userId: actorUserId});
}

export async function cancelHotelReservation(actorUserId: string, hotelId: string, bookingId: string, idempotencyKey: string) {
  const before = await hotelReservationForMutation(actorUserId, hotelId, bookingId);
  if (before.arrivalStatus === "ARRIVED") {
    throw new ApplicationError("GUEST_ALREADY_ARRIVED", "Checked-in stays cannot be cancelled from the reservation center", 409);
  }
  const today = localDateInTimeZone(new Date(), before.hotel.timezone);
  if (dateKey(before.arrival) < today) {
    throw new ApplicationError("USE_NO_SHOW", "The arrival date has passed; use the no-show action instead", 409);
  }
  const updated = await cancelBookingWithWallet(bookingId, idempotencyKey, {userId: actorUserId});
  await database().auditLog.create({
    data: {
      hotelId,
      actorUserId,
      action: "BOOKING_CANCELLED_BY_HOTEL",
      entityType: "Booking",
      entityId: bookingId,
      before: {status: before.status, totalAmount: Number(before.totalAmount)},
      after: {
        status: updated.status,
        penaltyAmount: updated.cancellation.penaltyAmount,
        refundableAmount: updated.cancellation.refundableAmount,
      },
    },
  });
  return getHotelReservationDetail(actorUserId, hotelId, bookingId);
}

export async function markHotelReservationNoShow(actorUserId: string, hotelId: string, bookingId: string, idempotencyKey: string) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:manage");
  const initial = await database().booking.findFirst({
    where: {id: bookingId, hotelId},
    select: {
      id: true,
      status: true,
      arrival: true,
      arrivalStatus: true,
      totalAmount: true,
      hotel: {select: {timezone: true}},
    },
  });
  if (!initial) notFound("Booking");
  if (initial.status === "NO_SHOW") return getHotelReservationDetail(actorUserId, hotelId, bookingId);
  if (initial.status !== "CONFIRMED" && initial.status !== "MODIFIED") {
    throw new ApplicationError("BOOKING_NOT_NO_SHOW_ELIGIBLE", "Only active confirmed reservations can be marked as no-show", 409);
  }
  if (initial.arrivalStatus === "ARRIVED") {
    throw new ApplicationError("GUEST_ALREADY_ARRIVED", "A checked-in guest cannot be marked as no-show", 409);
  }

  const today = localDateInTimeZone(new Date(), initial.hotel.timezone);
  if (today <= dateKey(initial.arrival)) {
    throw new ApplicationError("NO_SHOW_TOO_EARLY", "No-show can be recorded only after the scheduled arrival date has passed", 409);
  }

  const cancelKey = `NO_SHOW:${idempotencyKey}`;
  const cancelled = await cancelBookingWithWallet(bookingId, cancelKey, {userId: actorUserId});

  await database().$transaction(async (tx) => {
    const current = await tx.booking.findFirst({where: {id: bookingId, hotelId}, select: {status: true}});
    if (!current) notFound("Booking");
    if (current.status === "NO_SHOW") return;
    if (current.status !== "CANCELLED") {
      throw new ApplicationError("NO_SHOW_TRANSITION_FAILED", "Reservation did not reach the cancellation settlement state", 409);
    }
    const event = await tx.bookingEvent.findUnique({where: {idempotencyKey: cancelKey}, select: {id: true, type: true}});
    if (!event || event.type !== "CANCELLED") {
      throw new ApplicationError("NO_SHOW_TRANSITION_FAILED", "No-show settlement event could not be verified", 409);
    }
    await tx.booking.update({where: {id: bookingId}, data: {status: "NO_SHOW"}});
    await tx.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: "BOOKING_MARKED_NO_SHOW",
        entityType: "Booking",
        entityId: bookingId,
        before: {status: initial.status, arrival: dateKey(initial.arrival), arrivalStatus: initial.arrivalStatus},
        after: {
          status: "NO_SHOW",
          penaltyAmount: cancelled.cancellation.penaltyAmount,
          refundableAmount: cancelled.cancellation.refundableAmount,
          settlementEventId: event.id,
        },
      },
    });
  });

  return getHotelReservationDetail(actorUserId, hotelId, bookingId);
}

export async function hotelReservationCenterCsv(actorUserId: string, hotelId: string, query: ReservationCenterQuery) {
  const report = await listHotelReservationCenter(actorUserId, hotelId, query);
  const header = [
    "Booking reference",
    "Guest",
    "Email",
    "Adults",
    "Children",
    "Arrival",
    "Departure",
    "Expected arrival",
    "Arrival status",
    "Booking status",
    "Room type",
    "Rate plan",
    "Payment",
    "Total",
    "Open requests",
    "Front desk notes",
  ];
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
    `${booking.totalAmount.toFixed(2)} ${booking.currency}`,
    String(booking.openRequestCount),
    String(booking.noteCount),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

async function hotelReservationForMutation(actorUserId: string, hotelId: string, bookingId: string) {
  await requireHotelPermission(actorUserId, hotelId, "bookings:manage");
  const booking = await database().booking.findFirst({
    where: {id: bookingId, hotelId},
    select: {
      id: true,
      status: true,
      arrivalStatus: true,
      roomTypeId: true,
      ratePlanId: true,
      arrival: true,
      departure: true,
      adults: true,
      children: true,
      revision: true,
      totalAmount: true,
      hotel: {select: {timezone: true}},
    },
  });
  if (!booking) notFound("Booking");
  return booking;
}

function reservationCenterFilter(hotelId: string, date: Date, scope: ReservationCenterQuery["scope"]): Prisma.BookingWhereInput {
  if (scope === "ARRIVALS") return {hotelId, status: {in: [...ACTIVE_STATUSES]}, arrival: date};
  if (scope === "DEPARTURES") return {hotelId, status: {in: [...ACTIVE_STATUSES]}, departure: date};
  if (scope === "IN_HOUSE") return {hotelId, status: {in: [...ACTIVE_STATUSES]}, arrivalStatus: "ARRIVED", arrival: {lte: date}, departure: {gt: date}};
  if (scope === "CANCELLED") return {hotelId, status: "CANCELLED", arrival: {lte: date}, departure: {gt: date}};
  if (scope === "NO_SHOW") return {hotelId, status: "NO_SHOW", arrival: {lte: date}, departure: {gt: date}};
  return {
    hotelId,
    OR: [
      {status: {in: [...ACTIVE_STATUSES]}, arrival: date},
      {status: {in: [...ACTIVE_STATUSES]}, departure: date},
      {status: {in: [...ACTIVE_STATUSES]}, arrivalStatus: "ARRIVED", arrival: {lte: date}, departure: {gt: date}},
      {status: "CANCELLED", arrival: {lte: date}, departure: {gt: date}},
      {status: "NO_SHOW", arrival: {lte: date}, departure: {gt: date}},
    ],
  };
}

function operationalState(status: string, arrivalStatus: string, arrival: string, departure: string, date: string) {
  if (status === "CANCELLED") return "CANCELLED" as const;
  if (status === "NO_SHOW") return "NO_SHOW" as const;
  if (arrivalStatus === "ARRIVED" && arrival <= date && departure > date) return "IN_HOUSE" as const;
  if (arrival === date) return "ARRIVAL" as const;
  if (departure === date) return "DEPARTURE" as const;
  return "ACTIVE" as const;
}

function csvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}
