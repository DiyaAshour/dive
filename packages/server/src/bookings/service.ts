import { buildStayDates, calculatePrice, holdExpiresAt, parseDateOnly, roundMoney } from "@platform/core";
import type { CreateBookingHoldInput, CreateRefundInput, ModifyBookingInput } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError, badRequest, notFound } from "../errors";
import { requireHotelPermission } from "../hotels/authorization";
import { requireBookingAccess } from "./authorization";
import { InventoryConcurrencyError, InventoryUnavailableError, releaseInventory, reserveInventory } from "./inventory";
import { bookingAccessToken, bookingAccessTokenHash, fingerprint, reservationReference } from "./security";

export type BookingAccessContext = Readonly<{userId?: string | null; accessToken?: string | null}>;
type NightPrice = Readonly<{date: Date; base: number; service: number; tax: number; total: number}>;
type DbClient = ReturnType<typeof database>;
type TransactionLike = Pick<DbClient, "ratePlan" | "dailyRate" | "inventoryDay">;
type HotelPricing = Readonly<{id: string; serviceRate: unknown; taxRate: unknown}>;

export async function createBookingHold(input: CreateBookingHoldInput, context: Readonly<{userId?: string | null; idempotencyKey: string}>) {
  const stay = buildStayDates(input.arrival, input.departure);
  const requestFingerprint = fingerprint(input);
  const accessToken = bookingAccessToken(context.idempotencyKey);
  const existing = await database().booking.findUnique({where: {idempotencyKey: context.idempotencyKey}});
  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint) conflict("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used for a different request");
    return {booking: await bookingView(existing.id), bookingAccessToken: accessToken, reused: true};
  }

  try {
    const bookingId = await database().$transaction(async (tx) => {
      const raced = await tx.booking.findUnique({where: {idempotencyKey: context.idempotencyKey}});
      if (raced) {
        if (raced.requestFingerprint !== requestFingerprint) conflict("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used for a different request");
        return raced.id;
      }

      const hotel = await tx.hotel.findUnique({where: {id: input.hotelId}});
      if (!hotel || hotel.status !== "ACTIVE" || !hotel.verified) conflict("HOTEL_NOT_BOOKABLE", "Hotel is not open for bookings");
      const priced = await priceStay(tx, hotel, input.roomTypeId, input.ratePlanId, stay.nights);
      await reserveInventory(inventoryPort(tx), input.roomTypeId, priced.map((night) => night.date), hotel.overbookingEnabled);

      const totals = sumPrices(priced);
      const commissionAmount = roundMoney(totals.base * Number(hotel.commissionRate));
      const booking = await tx.booking.create({data: {
        reference: reservationReference(),
        userId: context.userId ?? null,
        hotelId: hotel.id,
        roomTypeId: input.roomTypeId,
        ratePlanId: input.ratePlanId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        arrival: parseDateOnly(input.arrival),
        departure: parseDateOnly(input.departure),
        paymentMode: input.paymentMode,
        paymentState: input.paymentMode === "PAY_NOW" ? "PENDING" : "NOT_REQUIRED",
        currency: hotel.currency,
        baseAmount: totals.base,
        serviceAmount: totals.service,
        taxAmount: totals.tax,
        totalAmount: totals.total,
        commissionRateSnapshot: hotel.commissionRate,
        commissionAmount,
        idempotencyKey: context.idempotencyKey,
        requestFingerprint,
        accessTokenHash: bookingAccessTokenHash(accessToken),
        holdExpiresAt: holdExpiresAt(),
        nights: {create: priced.map((night) => ({revision: 1, date: night.date, baseAmount: night.base, serviceAmount: night.service, taxAmount: night.tax, totalAmount: night.total}))},
        events: {create: {type: "HOLD_CREATED", actorUserId: context.userId ?? null, data: {arrival: input.arrival, departure: input.departure, total: totals.total}}},
      }});
      return booking.id;
    }, {isolationLevel: "Serializable"});
    return {booking: await bookingView(bookingId), bookingAccessToken: accessToken, reused: false};
  } catch (error) {
    translateBookingConcurrencyError(error);
  }
}

export async function confirmBooking(bookingId: string, idempotencyKey: string, context: BookingAccessContext) {
  await requireBookingAccess(bookingId, context);
  const requestFingerprint = fingerprint({bookingId, action: "confirm"});
  const result = await database().$transaction(async (tx) => {
    const replay = await tx.bookingEvent.findUnique({where: {idempotencyKey}});
    if (replay) {
      assertFingerprint(replay.requestFingerprint, requestFingerprint);
      return {bookingId: replay.bookingId, expired: replay.type === "EXPIRED"};
    }

    const booking = await tx.booking.findUnique({where: {id: bookingId}});
    if (!booking) notFound("Booking");
    if (booking.status === "CONFIRMED" || booking.status === "MODIFIED") return {bookingId: booking.id, expired: false};
    if (booking.status !== "HOLD") conflict("BOOKING_NOT_CONFIRMABLE", "Booking is not in hold state");

    if (booking.holdExpiresAt && booking.holdExpiresAt.getTime() <= Date.now()) {
      const nights = await tx.bookingNight.findMany({where: {bookingId, revision: booking.revision}});
      await releaseInventory(inventoryPort(tx), booking.roomTypeId, nights.map((night) => night.date));
      await tx.booking.update({where: {id: booking.id}, data: {status: "EXPIRED", holdExpiresAt: null}});
      await tx.bookingEvent.create({data: {bookingId, type: "EXPIRED", actorUserId: context.userId ?? null, idempotencyKey, requestFingerprint}});
      return {bookingId, expired: true};
    }

    if (booking.paymentMode === "PAY_NOW" && booking.paymentState !== "CAPTURED") conflict("PAYMENT_REQUIRED", "Pay-now booking cannot be confirmed before payment is captured");
    await tx.booking.update({where: {id: bookingId}, data: {status: "CONFIRMED", confirmedAt: new Date(), holdExpiresAt: null}});
    const event = await tx.bookingEvent.create({data: {bookingId, type: "CONFIRMED", actorUserId: context.userId ?? null, idempotencyKey, requestFingerprint}});
    await tx.financialEvent.createMany({data: confirmationFinancialEvents(booking, event.id)});
    return {bookingId, expired: false};
  }, {isolationLevel: "Serializable"});

  if (result.expired) conflict("HOLD_EXPIRED", "Booking hold expired before confirmation");
  return bookingView(result.bookingId);
}

export async function modifyBooking(bookingId: string, input: ModifyBookingInput, idempotencyKey: string, context: BookingAccessContext) {
  await requireBookingAccess(bookingId, context);
  const requestFingerprint = fingerprint({bookingId, ...input});
  try {
    const resultId = await database().$transaction(async (tx) => {
      const replay = await tx.bookingEvent.findUnique({where: {idempotencyKey}});
      if (replay) {
        assertFingerprint(replay.requestFingerprint, requestFingerprint);
        return replay.bookingId;
      }

      const booking = await tx.booking.findUnique({where: {id: bookingId}, include: {hotel: true}});
      if (!booking) notFound("Booking");
      if (!isMutableStatus(booking.status)) conflict("BOOKING_NOT_MODIFIABLE", "Booking cannot be modified in its current state");
      if (booking.paymentState === "CAPTURED") conflict("PAYMENT_ADJUSTMENT_REQUIRED", "Captured pay-now bookings require payment adjustment support before price-changing modification");
      if (booking.status === "HOLD" && booking.holdExpiresAt && booking.holdExpiresAt.getTime() <= Date.now()) conflict("HOLD_EXPIRED", "Booking hold has expired");

      const stay = buildStayDates(input.arrival, input.departure);
      const priced = await priceStay(tx, booking.hotel, input.roomTypeId, input.ratePlanId, stay.nights);
      const oldNights = await tx.bookingNight.findMany({where: {bookingId, revision: booking.revision}});
      const oldKeys = new Set(oldNights.map((night) => dateKey(night.date)));
      const newKeys = new Set(priced.map((night) => dateKey(night.date)));
      const roomChanged = booking.roomTypeId !== input.roomTypeId;
      const reserveDates = roomChanged ? priced.map((night) => night.date) : priced.filter((night) => !oldKeys.has(dateKey(night.date))).map((night) => night.date);
      const releaseDates = roomChanged ? oldNights.map((night) => night.date) : oldNights.filter((night) => !newKeys.has(dateKey(night.date))).map((night) => night.date);

      await reserveInventory(inventoryPort(tx), input.roomTypeId, reserveDates, booking.hotel.overbookingEnabled);
      await releaseInventory(inventoryPort(tx), booking.roomTypeId, releaseDates);

      const totals = sumPrices(priced);
      const newCommission = roundMoney(totals.base * Number(booking.commissionRateSnapshot));
      const newRevision = booking.revision + 1;
      const nextStatus = booking.status === "HOLD" ? "HOLD" : "MODIFIED";
      await tx.booking.update({where: {id: bookingId}, data: {
        roomTypeId: input.roomTypeId,
        ratePlanId: input.ratePlanId,
        arrival: parseDateOnly(input.arrival),
        departure: parseDateOnly(input.departure),
        status: nextStatus,
        revision: newRevision,
        baseAmount: totals.base,
        serviceAmount: totals.service,
        taxAmount: totals.tax,
        totalAmount: totals.total,
        commissionAmount: newCommission,
      }});
      await tx.bookingNight.createMany({data: priced.map((night) => ({bookingId, revision: newRevision, date: night.date, baseAmount: night.base, serviceAmount: night.service, taxAmount: night.tax, totalAmount: night.total}))});
      const event = await tx.bookingEvent.create({data: {
        bookingId,
        type: "MODIFIED",
        actorUserId: context.userId ?? null,
        idempotencyKey,
        requestFingerprint,
        data: {fromRevision: booking.revision, toRevision: newRevision, oldTotal: Number(booking.totalAmount), newTotal: totals.total},
      }});
      if (booking.status !== "HOLD") {
        const deltas = financialDeltas(booking, totals, newCommission, event.id);
        if (deltas.length) await tx.financialEvent.createMany({data: deltas});
      }
      return bookingId;
    }, {isolationLevel: "Serializable"});
    return bookingView(resultId);
  } catch (error) {
    translateBookingConcurrencyError(error);
  }
}

export async function cancelBooking(bookingId: string, idempotencyKey: string, context: BookingAccessContext) {
  await requireBookingAccess(bookingId, context);
  const requestFingerprint = fingerprint({bookingId, action: "cancel"});
  const resultId = await database().$transaction(async (tx) => {
    const replay = await tx.bookingEvent.findUnique({where: {idempotencyKey}});
    if (replay) {
      assertFingerprint(replay.requestFingerprint, requestFingerprint);
      return replay.bookingId;
    }
    const booking = await tx.booking.findUnique({where: {id: bookingId}});
    if (!booking) notFound("Booking");
    if (booking.status === "CANCELLED") return booking.id;
    if (!isMutableStatus(booking.status)) conflict("BOOKING_NOT_CANCELLABLE", "Booking cannot be cancelled in its current state");
    const nights = await tx.bookingNight.findMany({where: {bookingId, revision: booking.revision}});
    await releaseInventory(inventoryPort(tx), booking.roomTypeId, nights.map((night) => night.date));
    await tx.booking.update({where: {id: bookingId}, data: {status: "CANCELLED", cancelledAt: new Date(), holdExpiresAt: null}});
    await tx.bookingEvent.create({data: {bookingId, type: "CANCELLED", actorUserId: context.userId ?? null, idempotencyKey, requestFingerprint}});
    return bookingId;
  }, {isolationLevel: "Serializable"});
  return bookingView(resultId);
}

export async function recordPaymentCaptured(bookingId: string, externalReference: string, actorUserId?: string | null) {
  const requestFingerprint = fingerprint({bookingId, externalReference, action: "payment-captured"});
  const idempotencyKey = `payment:${externalReference}`;
  const resultId = await database().$transaction(async (tx) => {
    const replay = await tx.bookingEvent.findUnique({where: {idempotencyKey}});
    if (replay) {
      assertFingerprint(replay.requestFingerprint, requestFingerprint);
      return replay.bookingId;
    }
    const booking = await tx.booking.findUnique({where: {id: bookingId}});
    if (!booking) notFound("Booking");
    if (booking.paymentMode !== "PAY_NOW") badRequest("PAYMENT_NOT_REQUIRED", "Booking is configured for pay at hotel");
    await tx.booking.update({where: {id: bookingId}, data: {paymentState: "CAPTURED"}});
    await tx.bookingEvent.create({data: {bookingId, type: "PAYMENT_CAPTURED", actorUserId: actorUserId ?? null, idempotencyKey, requestFingerprint, data: {externalReference}}});
    return bookingId;
  }, {isolationLevel: "Serializable"});
  return bookingView(resultId);
}

export async function requestRefund(bookingId: string, input: CreateRefundInput, userId: string) {
  const booking = await database().booking.findUnique({where: {id: bookingId}});
  if (!booking) notFound("Booking");
  await requireHotelPermission(userId, booking.hotelId, "finance:manage");
  if (booking.paymentState !== "CAPTURED" && booking.paymentState !== "PARTIALLY_REFUNDED") badRequest("NOTHING_REFUNDABLE", "Booking does not have captured payment available for refund");
  const committed = await database().refund.aggregate({where: {bookingId, status: {in: ["REQUESTED", "APPROVED", "COMPLETED"]}}, _sum: {amount: true}});
  const outstanding = roundMoney(Number(booking.totalAmount) - Number(committed._sum.amount ?? 0));
  if (input.amount > outstanding) badRequest("REFUND_EXCEEDS_OUTSTANDING", `Refund cannot exceed ${outstanding.toFixed(2)} ${booking.currency}`);
  return database().refund.create({data: {bookingId, amount: input.amount, currency: booking.currency, reason: input.reason, requestedByUserId: userId, externalReference: input.externalReference}});
}

export async function completeRefund(refundId: string, userId: string, externalReference?: string) {
  const initial = await database().refund.findUnique({where: {id: refundId}, include: {booking: true}});
  if (!initial) notFound("Refund");
  await requireHotelPermission(userId, initial.booking.hotelId, "finance:manage");
  try {
    const resultId = await database().$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({where: {id: refundId}, include: {booking: true}});
      if (!refund) notFound("Refund");
      if (refund.status === "COMPLETED") return refund.id;
      if (refund.status === "REJECTED") conflict("REFUND_REJECTED", "Rejected refund cannot be completed");
      await tx.refund.update({where: {id: refundId}, data: {status: "COMPLETED", completedAt: new Date(), externalReference: externalReference ?? refund.externalReference}});
      await tx.financialEvent.create({data: {bookingId: refund.bookingId, hotelId: refund.booking.hotelId, type: "REFUND", amount: -Number(refund.amount), currency: refund.currency, referenceType: "REFUND", referenceId: refundId}});
      await tx.bookingEvent.create({data: {bookingId: refund.bookingId, type: "REFUND_RECORDED", actorUserId: userId, data: {refundId, amount: Number(refund.amount)}}});
      const totals = await tx.refund.aggregate({where: {bookingId: refund.bookingId, status: "COMPLETED"}, _sum: {amount: true}});
      const refunded = Number(totals._sum.amount ?? 0);
      await tx.booking.update({where: {id: refund.bookingId}, data: {paymentState: refunded >= Number(refund.booking.totalAmount) ? "REFUNDED" : "PARTIALLY_REFUNDED"}});
      return refund.id;
    }, {isolationLevel: "Serializable"});
    return database().refund.findUnique({where: {id: resultId}});
  } catch (error) {
    if (isPrismaSerializationConflict(error)) conflict("REFUND_CONCURRENCY_RETRY", "Refund changed concurrently; retry the operation");
    throw error;
  }
}

export async function expireStaleHolds(limit = 100): Promise<number> {
  const stale = await database().booking.findMany({where: {status: "HOLD", holdExpiresAt: {lte: new Date()}}, select: {id: true}, orderBy: {holdExpiresAt: "asc"}, take: Math.max(1, Math.min(limit, 500))});
  let expired = 0;
  for (const item of stale) {
    const changed = await database().$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({where: {id: item.id}});
      if (!booking || booking.status !== "HOLD" || !booking.holdExpiresAt || booking.holdExpiresAt.getTime() > Date.now()) return false;
      const nights = await tx.bookingNight.findMany({where: {bookingId: booking.id, revision: booking.revision}});
      await releaseInventory(inventoryPort(tx), booking.roomTypeId, nights.map((night) => night.date));
      await tx.booking.update({where: {id: booking.id}, data: {status: "EXPIRED", holdExpiresAt: null}});
      await tx.bookingEvent.create({data: {bookingId: booking.id, type: "EXPIRED"}});
      return true;
    }, {isolationLevel: "Serializable"});
    if (changed) expired += 1;
  }
  return expired;
}

export async function bookingView(bookingId: string) {
  const booking = await database().booking.findUnique({
    where: {id: bookingId},
    include: {
      hotel: {select: {name: true}},
      roomType: {select: {name: true}},
      ratePlan: {select: {name: true}},
      nights: {orderBy: [{revision: "asc"}, {date: "asc"}]},
      events: {select: {type: true, data: true, createdAt: true}, orderBy: {createdAt: "asc"}},
      refunds: {select: {id: true, amount: true, currency: true, reason: true, status: true, createdAt: true, completedAt: true}, orderBy: {createdAt: "asc"}},
    },
  });
  if (!booking) notFound("Booking");
  return {
    id: booking.id,
    reference: booking.reference,
    hotel: {id: booking.hotelId, name: booking.hotel.name},
    roomType: {id: booking.roomTypeId, name: booking.roomType.name},
    ratePlan: {id: booking.ratePlanId, name: booking.ratePlan.name},
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    arrival: dateKey(booking.arrival),
    departure: dateKey(booking.departure),
    status: booking.status,
    revision: booking.revision,
    paymentMode: booking.paymentMode,
    paymentState: booking.paymentState,
    currency: booking.currency,
    amounts: {base: Number(booking.baseAmount), service: Number(booking.serviceAmount), tax: Number(booking.taxAmount), total: Number(booking.totalAmount)},
    holdExpiresAt: booking.holdExpiresAt,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    nights: booking.nights.filter((night) => night.revision === booking.revision).map((night) => ({date: dateKey(night.date), base: Number(night.baseAmount), service: Number(night.serviceAmount), tax: Number(night.taxAmount), total: Number(night.totalAmount)})),
    events: booking.events,
    refunds: booking.refunds.map((refund) => ({...refund, amount: Number(refund.amount)})),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

async function priceStay(tx: TransactionLike, hotel: HotelPricing, roomTypeId: string, ratePlanId: string, dates: readonly string[]): Promise<NightPrice[]> {
  const ratePlan = await tx.ratePlan.findFirst({where: {id: ratePlanId, roomTypeId, active: true, roomType: {hotelId: hotel.id, active: true}}});
  if (!ratePlan) conflict("RATE_PLAN_NOT_AVAILABLE", "Rate plan is not available for this room type");
  const dateValues = dates.map(parseDateOnly);
  const rates = await tx.dailyRate.findMany({where: {ratePlanId, date: {in: dateValues}}, orderBy: {date: "asc"}});
  if (rates.length !== dates.length) conflict("RATE_NOT_CONFIGURED", "A rate is missing for one or more stay dates");
  const stayLength = dates.length;
  if (rates.some((rate) => rate.closed || rate.stopSell || rate.minStay > stayLength || (rate.maxStay !== null && rate.maxStay < stayLength))) conflict("RATE_RESTRICTED", "Selected stay is closed or restricted by the rate plan");
  return rates.map((rate) => ({date: rate.date, ...calculatePrice(Number(rate.baseRate), {serviceRate: Number(hotel.serviceRate), taxRate: Number(hotel.taxRate)})}));
}

function inventoryPort(tx: Pick<DbClient, "inventoryDay">) {
  return {
    async load(roomTypeId: string, date: Date) {
      return tx.inventoryDay.findUnique({where: {roomTypeId_date: {roomTypeId, date}}, select: {id: true, available: true, overbookingLimit: true}});
    },
    async compareAndDecrement(id: string, expectedAvailable: number) {
      const result = await tx.inventoryDay.updateMany({where: {id, available: expectedAvailable}, data: {available: {decrement: 1}}});
      return result.count === 1;
    },
    async increment(id: string) {
      await tx.inventoryDay.update({where: {id}, data: {available: {increment: 1}}});
    },
  };
}

function sumPrices(nights: readonly NightPrice[]) {
  return {
    base: roundMoney(nights.reduce((sum, night) => sum + night.base, 0)),
    service: roundMoney(nights.reduce((sum, night) => sum + night.service, 0)),
    tax: roundMoney(nights.reduce((sum, night) => sum + night.tax, 0)),
    total: roundMoney(nights.reduce((sum, night) => sum + night.total, 0)),
  };
}

function confirmationFinancialEvents(booking: {id: string; hotelId: string; currency: string; totalAmount: unknown; baseAmount: unknown; serviceAmount: unknown; taxAmount: unknown; commissionAmount: unknown}, referenceId: string) {
  const common = {bookingId: booking.id, hotelId: booking.hotelId, currency: booking.currency, referenceType: "BOOKING_CONFIRMATION", referenceId};
  return [
    {...common, type: "BOOKING_GROSS" as const, amount: Number(booking.totalAmount)},
    {...common, type: "ROOM_BASE" as const, amount: Number(booking.baseAmount)},
    {...common, type: "EMPLOYEE_SERVICE" as const, amount: Number(booking.serviceAmount)},
    {...common, type: "TAX" as const, amount: Number(booking.taxAmount)},
    {...common, type: "PLATFORM_COMMISSION" as const, amount: Number(booking.commissionAmount)},
  ];
}

function financialDeltas(booking: {id: string; hotelId: string; currency: string; totalAmount: unknown; baseAmount: unknown; serviceAmount: unknown; taxAmount: unknown; commissionAmount: unknown}, totals: {base: number; service: number; tax: number; total: number}, commission: number, referenceId: string) {
  const common = {bookingId: booking.id, hotelId: booking.hotelId, currency: booking.currency, referenceType: "BOOKING_MODIFICATION", referenceId};
  const values = [
    ["BOOKING_GROSS", roundMoney(totals.total - Number(booking.totalAmount))],
    ["ROOM_BASE", roundMoney(totals.base - Number(booking.baseAmount))],
    ["EMPLOYEE_SERVICE", roundMoney(totals.service - Number(booking.serviceAmount))],
    ["TAX", roundMoney(totals.tax - Number(booking.taxAmount))],
    ["PLATFORM_COMMISSION", roundMoney(commission - Number(booking.commissionAmount))],
  ] as const;
  return values.filter(([, amount]) => amount !== 0).map(([type, amount]) => ({...common, type, amount}));
}

function isMutableStatus(status: string): status is "HOLD" | "CONFIRMED" | "MODIFIED" {
  return status === "HOLD" || status === "CONFIRMED" || status === "MODIFIED";
}

function translateBookingConcurrencyError(error: unknown): never {
  if (error instanceof InventoryUnavailableError) conflict("INVENTORY_UNAVAILABLE", `No inventory is available for ${dateKey(error.date)}`);
  if (error instanceof InventoryConcurrencyError) conflict("INVENTORY_CHANGED", "Inventory changed while booking; retry with the same idempotency key");
  if (isPrismaSerializationConflict(error)) conflict("BOOKING_CONCURRENCY_RETRY", "Booking conflicted with another transaction; retry safely with the same idempotency key");
  throw error;
}

function isPrismaSerializationConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: unknown}).code === "P2034";
}

function assertFingerprint(actual: string | null, expected: string): void {
  if (actual && actual !== expected) conflict("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used for another operation");
}

function conflict(code: string, message: string): never {
  throw new ApplicationError(code, message, 409);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
