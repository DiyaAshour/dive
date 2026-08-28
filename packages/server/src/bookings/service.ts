import {
  buildStayDates,
  calculatePrice,
  evaluateCancellation,
  holdExpiresAt,
  parseDateOnly,
  roundMoney,
  type CancellationPolicySnapshot,
} from "@platform/core";
import type { BookingQuoteInput, CreateBookingHoldInput, CreateRefundInput, ModifyBookingInput } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError, badRequest, notFound } from "../errors";
import { requireHotelPermission } from "../hotels/authorization";
import { promotionBaseRate, selectBestPromotion, type AppliedPromotion } from "../promotions/engine";
import { requireBookingAccess } from "./authorization";
import { InventoryConcurrencyError, InventoryUnavailableError, releaseInventory, reserveInventory } from "./inventory";
import { bookingAccessToken, bookingAccessTokenHash, fingerprint, reservationReference } from "./security";

export type BookingAccessContext = Readonly<{userId?: string | null; accessToken?: string | null}>;
type NightPrice = Readonly<{date: Date; base: number; service: number; tax: number; total: number}>;
type DbClient = Pick<ReturnType<typeof database>, "ratePlan" | "dailyRate" | "inventoryDay" | "refund">;
type TransactionLike = Pick<DbClient, "ratePlan" | "dailyRate" | "inventoryDay">;
type HotelPricing = Readonly<{id: string; serviceRate: unknown; taxRate: unknown; timezone: string}>;
type PolicyJson = {name: string; rules: Array<{minimumDaysBeforeArrival: number; penaltyType: string; penaltyValue: number | null}>; noShowPenaltyType: string; noShowPenaltyValue: number | null};

type PricedStay = Readonly<{
  nights: readonly NightPrice[];
  policy: CancellationPolicySnapshot;
  promotion: AppliedPromotion | null;
  ratePlan: Readonly<{
    id: string;
    name: string;
    code: string;
    allowPayNow: boolean;
    allowPayAtHotel: boolean;
    roomType: Readonly<{id: string; name: string; maxGuests: number; maxAdults: number; maxChildren: number}>;
  }>;
}>;

export async function quoteBooking(input: BookingQuoteInput) {
  const hotel = await database().hotel.findUnique({where: {id: input.hotelId}});
  if (!hotel || hotel.status !== "ACTIVE" || !hotel.verified) conflict("HOTEL_NOT_BOOKABLE", "Hotel is not open for bookings");
  const stay = buildStayDates(input.arrival, input.departure);
  const priced = await priceStay(database(), hotel, input.roomTypeId, input.ratePlanId, stay.nights);
  assertRoomOccupancy(priced.ratePlan.roomType, input.adults, input.children);
  const availableToSell = await availableToSellForStay(database(), input.roomTypeId, priced.nights.map((night) => night.date), hotel.overbookingEnabled);
  const totals = sumPrices(priced.nights);
  return {
    hotel: {id: hotel.id, name: hotel.name, currency: hotel.currency},
    roomType: priced.ratePlan.roomType,
    ratePlan: {id: priced.ratePlan.id, name: priced.ratePlan.name, code: priced.ratePlan.code},
    arrival: input.arrival,
    departure: input.departure,
    occupancy: {adults: input.adults, children: input.children},
    nights: stay.nights.length,
    amounts: totals,
    promotion: priced.promotion,
    allowedPaymentModes: [priced.ratePlan.allowPayNow ? "PAY_NOW" : null, priced.ratePlan.allowPayAtHotel ? "PAY_AT_HOTEL" : null].filter(Boolean),
    cancellationPolicy: priced.policy,
    availableToSell,
  };
}

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
      assertRoomOccupancy(priced.ratePlan.roomType, input.adults, input.children);
      assertPaymentModeAllowed(input.paymentMode, priced.ratePlan);
      await reserveInventory(inventoryPort(tx), input.roomTypeId, priced.nights.map((night) => night.date), hotel.overbookingEnabled);

      const totals = sumPrices(priced.nights);
      const commissionAmount = roundMoney(totals.base * Number(hotel.commissionRate));
      const booking = await tx.booking.create({data: {
        reference: reservationReference(),
        userId: context.userId ?? null,
        hotelId: hotel.id,
        roomTypeId: input.roomTypeId,
        ratePlanId: input.ratePlanId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        adults: input.adults,
        children: input.children,
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
        promotionNameSnapshot: priced.promotion?.name ?? null,
        promotionDiscountPercentSnapshot: priced.promotion?.discountPercent ?? null,
        cancellationPolicySnapshot: policyToJson(priced.policy),
        idempotencyKey: context.idempotencyKey,
        requestFingerprint,
        accessTokenHash: bookingAccessTokenHash(accessToken),
        holdExpiresAt: holdExpiresAt(),
        nights: {create: priced.nights.map((night) => ({revision: 1, date: night.date, baseAmount: night.base, serviceAmount: night.service, taxAmount: night.tax, totalAmount: night.total}))},
        events: {create: {type: "HOLD_CREATED", actorUserId: context.userId ?? null, data: {arrival: input.arrival, departure: input.departure, adults: input.adults, children: input.children, total: totals.total, cancellationPolicy: priced.policy.name, promotion: priced.promotion}}},
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
      await createAutomaticRefundIfNeeded(tx, booking, Number(booking.totalAmount), "Hold expired after payment capture");
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
      const adults = input.adults ?? booking.adults;
      const children = input.children ?? booking.children;
      assertRoomOccupancy(priced.ratePlan.roomType, adults, children);
      assertPaymentModeAllowed(booking.paymentMode, priced.ratePlan);
      const oldNights = await tx.bookingNight.findMany({where: {bookingId, revision: booking.revision}});
      const oldKeys = new Set(oldNights.map((night) => dateKey(night.date)));
      const newKeys = new Set(priced.nights.map((night) => dateKey(night.date)));
      const roomChanged = booking.roomTypeId !== input.roomTypeId;
      const reserveDates = roomChanged ? priced.nights.map((night) => night.date) : priced.nights.filter((night) => !oldKeys.has(dateKey(night.date))).map((night) => night.date);
      const releaseDates = roomChanged ? oldNights.map((night) => night.date) : oldNights.filter((night) => !newKeys.has(dateKey(night.date))).map((night) => night.date);
      await reserveInventory(inventoryPort(tx), input.roomTypeId, reserveDates, booking.hotel.overbookingEnabled);
      await releaseInventory(inventoryPort(tx), booking.roomTypeId, releaseDates);

      const totals = sumPrices(priced.nights);
      const newCommission = roundMoney(totals.base * Number(booking.commissionRateSnapshot));
      const newRevision = booking.revision + 1;
      const nextStatus = booking.status === "HOLD" ? "HOLD" : "MODIFIED";
      await tx.booking.update({where: {id: bookingId}, data: {
        roomTypeId: input.roomTypeId,
        ratePlanId: input.ratePlanId,
        arrival: parseDateOnly(input.arrival),
        departure: parseDateOnly(input.departure),
        adults,
        children,
        status: nextStatus,
        revision: newRevision,
        baseAmount: totals.base,
        serviceAmount: totals.service,
        taxAmount: totals.tax,
        totalAmount: totals.total,
        commissionAmount: newCommission,
        promotionNameSnapshot: priced.promotion?.name ?? null,
        promotionDiscountPercentSnapshot: priced.promotion?.discountPercent ?? null,
        cancellationPolicySnapshot: policyToJson(priced.policy),
      }});
      await tx.bookingNight.createMany({data: priced.nights.map((night) => ({bookingId, revision: newRevision, date: night.date, baseAmount: night.base, serviceAmount: night.service, taxAmount: night.tax, totalAmount: night.total}))});
      const event = await tx.bookingEvent.create({data: {bookingId, type: "MODIFIED", actorUserId: context.userId ?? null, idempotencyKey, requestFingerprint, data: {fromRevision: booking.revision, toRevision: newRevision, adults, children, oldTotal: Number(booking.totalAmount), newTotal: totals.total, cancellationPolicy: priced.policy.name, promotion: priced.promotion}}});
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

export async function previewCancellation(bookingId: string, context: BookingAccessContext) {
  await requireBookingAccess(bookingId, context);
  const booking = await database().booking.findUnique({where: {id: bookingId}, include: {hotel: {select: {timezone: true}}, nights: {where: {}}}});
  if (!booking) notFound("Booking");
  if (booking.status === "CANCELLED") return {policy: cancellationPolicyFromJson(booking.cancellationPolicySnapshot), penaltyAmount: Number(booking.cancellationPenaltyAmount), refundableAmount: Number(booking.refundableAmount ?? 0), alreadyCancelled: true};
  if (!isMutableStatus(booking.status)) conflict("BOOKING_NOT_CANCELLABLE", "Booking cannot be cancelled in its current state");
  const currentNights = booking.nights.filter((night) => night.revision === booking.revision);
  return {...cancellationEvaluation(booking, booking.hotel.timezone, currentNights), alreadyCancelled: false};
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
    const booking = await tx.booking.findUnique({where: {id: bookingId}, include: {hotel: {select: {timezone: true}}}});
    if (!booking) notFound("Booking");
    if (booking.status === "CANCELLED") return booking.id;
    if (!isMutableStatus(booking.status)) conflict("BOOKING_NOT_CANCELLABLE", "Booking cannot be cancelled in its current state");
    const nights = await tx.bookingNight.findMany({where: {bookingId, revision: booking.revision}, orderBy: {date: "asc"}});
    const evaluation = cancellationEvaluation(booking, booking.hotel.timezone, nights);
    await releaseInventory(inventoryPort(tx), booking.roomTypeId, nights.map((night) => night.date));
    await tx.booking.update({where: {id: bookingId}, data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      holdExpiresAt: null,
      cancellationPenaltyAmount: evaluation.penaltyAmount,
      refundableAmount: evaluation.refundableAmount,
    }});
    const event = await tx.bookingEvent.create({data: {bookingId, type: "CANCELLED", actorUserId: context.userId ?? null, idempotencyKey, requestFingerprint, data: {penaltyAmount: evaluation.penaltyAmount, refundableAmount: evaluation.refundableAmount, daysBeforeArrival: evaluation.daysBeforeArrival, policy: evaluation.policy.name}}});
    if ((booking.status === "CONFIRMED" || booking.status === "MODIFIED") && evaluation.refundableAmount > 0) {
      await tx.financialEvent.create({data: {bookingId, hotelId: booking.hotelId, type: "CANCELLATION_ADJUSTMENT", amount: -evaluation.refundableAmount, currency: booking.currency, referenceType: "BOOKING_CANCELLATION", referenceId: event.id}});
    }
    await createAutomaticRefundIfNeeded(tx, booking, evaluation.refundableAmount, `Cancellation under policy: ${evaluation.policy.name}`);
    return bookingId;
  }, {isolationLevel: "Serializable"});
  return bookingView(resultId);
}

export async function recordPaymentCaptured(bookingId: string, externalReference: string, actorUserId?: string | null, paymentAttemptId?: string | null) {
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
    if (paymentAttemptId) await tx.paymentAttempt.updateMany({where: {id: paymentAttemptId, bookingId}, data: {status: "CAPTURED", externalPaymentId: externalReference, completedAt: new Date()}});
    await tx.bookingEvent.create({data: {bookingId, type: "PAYMENT_CAPTURED", actorUserId: actorUserId ?? null, idempotencyKey, requestFingerprint, data: {externalReference, paymentAttemptId: paymentAttemptId ?? null}}});
    if (booking.status === "CANCELLED" || booking.status === "EXPIRED") await createAutomaticRefundIfNeeded(tx, booking, Number(booking.totalAmount), `Payment captured after booking became ${booking.status}`);
    return bookingId;
  }, {isolationLevel: "Serializable"});
  return bookingView(resultId);
}

export async function requestRefund(bookingId: string, input: CreateRefundInput, userId: string) {
  const initial = await database().booking.findUnique({where: {id: bookingId}, select: {id: true, hotelId: true}});
  if (!initial) notFound("Booking");
  await requireHotelPermission(userId, initial.hotelId, "finance:manage");

  return database().$transaction(async (tx) => {
    await tx.$queryRaw<Array<{id: string}>>`SELECT "id" FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({where: {id: bookingId}});
    if (!booking) notFound("Booking");
    if (booking.paymentState !== "CAPTURED" && booking.paymentState !== "PARTIALLY_REFUNDED") badRequest("NOTHING_REFUNDABLE", "Booking does not have captured payment available for refund");
    const committed = await tx.refund.aggregate({where: {bookingId, status: {in: ["REQUESTED", "APPROVED", "PROCESSING", "COMPLETED"]}}, _sum: {amount: true}});
    const policyCap = booking.status === "CANCELLED" && booking.refundableAmount !== null ? Number(booking.refundableAmount) : Number(booking.totalAmount);
    const outstanding = roundMoney(policyCap - Number(committed._sum.amount ?? 0));
    if (input.amount > outstanding) badRequest("REFUND_EXCEEDS_OUTSTANDING", `Refund cannot exceed ${outstanding.toFixed(2)} ${booking.currency}`);
    return tx.refund.create({data: {bookingId, amount: input.amount, currency: booking.currency, reason: input.reason, requestedByUserId: userId, externalReference: input.externalReference ?? null}});
  }, {isolationLevel: "ReadCommitted"});
}

export async function completeRefund(refundId: string, userId: string, externalReference?: string) {
  const initial = await database().refund.findUnique({where: {id: refundId}, include: {booking: true}});
  if (!initial) notFound("Refund");
  await requireHotelPermission(userId, initial.booking.hotelId, "finance:manage");
  return completeRefundRecord(refundId, externalReference, userId);
}

export async function completeRefundRecord(refundId: string, externalReference: string | undefined, actorUserId: string | null) {
  try {
    const resultId = await database().$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({where: {id: refundId}, include: {booking: true}});
      if (!refund) notFound("Refund");
      if (refund.status === "COMPLETED") return refund.id;
      if (refund.status === "REJECTED") conflict("REFUND_REJECTED", "Rejected refund cannot be completed");
      await tx.refund.update({where: {id: refundId}, data: {status: "COMPLETED", completedAt: new Date(), externalReference: externalReference ?? refund.externalReference}});
      await tx.financialEvent.create({data: {bookingId: refund.bookingId, hotelId: refund.booking.hotelId, type: "REFUND", amount: -Number(refund.amount), currency: refund.currency, referenceType: "REFUND", referenceId: refundId}});
      await tx.bookingEvent.create({data: {bookingId: refund.bookingId, type: "REFUND_RECORDED", actorUserId: actorUserId, data: {refundId, amount: Number(refund.amount)}}});
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
    try {
      const changed = await database().$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({where: {id: item.id}});
        if (!booking || booking.status !== "HOLD" || !booking.holdExpiresAt || booking.holdExpiresAt.getTime() > Date.now()) return false;
        const nights = await tx.bookingNight.findMany({where: {bookingId: booking.id, revision: booking.revision}});
        await releaseInventory(inventoryPort(tx), booking.roomTypeId, nights.map((night) => night.date));
        await tx.booking.update({where: {id: booking.id}, data: {status: "EXPIRED", holdExpiresAt: null}});
        await createAutomaticRefundIfNeeded(tx, booking, Number(booking.totalAmount), "Hold expired after payment capture");
        await tx.bookingEvent.create({data: {bookingId: booking.id, type: "EXPIRED"}});
        return true;
      }, {isolationLevel: "Serializable"});
      if (changed) expired += 1;
    } catch (error) {
      if (!isPrismaSerializationConflict(error)) throw error;
    }
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
      paymentAttempts: {select: {id: true, provider: true, status: true, amount: true, currency: true, redirectUrl: true, failureCode: true, createdAt: true, completedAt: true}, orderBy: {createdAt: "asc"}},
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
    occupancy: {adults: booking.adults, children: booking.children},
    arrival: dateKey(booking.arrival),
    departure: dateKey(booking.departure),
    status: booking.status,
    revision: booking.revision,
    paymentMode: booking.paymentMode,
    paymentState: booking.paymentState,
    currency: booking.currency,
    amounts: {base: Number(booking.baseAmount), service: Number(booking.serviceAmount), tax: Number(booking.taxAmount), total: Number(booking.totalAmount)},
    promotion: booking.promotionNameSnapshot ? {name: booking.promotionNameSnapshot, discountPercent: Number(booking.promotionDiscountPercentSnapshot ?? 0)} : null,
    cancellation: {policy: cancellationPolicyFromJson(booking.cancellationPolicySnapshot), penaltyAmount: Number(booking.cancellationPenaltyAmount), refundableAmount: booking.refundableAmount === null ? null : Number(booking.refundableAmount)},
    holdExpiresAt: booking.holdExpiresAt,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    nights: booking.nights.filter((night) => night.revision === booking.revision).map((night) => ({date: dateKey(night.date), base: Number(night.baseAmount), service: Number(night.serviceAmount), tax: Number(night.taxAmount), total: Number(night.totalAmount)})),
    events: booking.events,
    refunds: booking.refunds.map((refund) => ({...refund, amount: Number(refund.amount)})),
    paymentAttempts: booking.paymentAttempts.map((attempt) => ({...attempt, amount: Number(attempt.amount)})),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

async function priceStay(tx: TransactionLike, hotel: HotelPricing, roomTypeId: string, ratePlanId: string, dates: readonly string[]): Promise<PricedStay> {
  const dateValues = dates.map(parseDateOnly);
  const ratePlan = await tx.ratePlan.findFirst({
    where: {id: ratePlanId, roomTypeId, active: true, roomType: {hotelId: hotel.id, active: true}},
    include: {
      roomType: {select: {id: true, name: true, maxGuests: true, maxAdults: true, maxChildren: true}},
      cancellationPolicy: {include: {rules: {orderBy: {minimumDaysBeforeArrival: "desc"}}}},
      promotions: {where: {promotion: {status: "ACTIVE"}}, include: {promotion: true}},
    },
  });
  if (!ratePlan) conflict("RATE_PLAN_NOT_AVAILABLE", "Rate plan is not available for this room type");
  if (!ratePlan.cancellationPolicy) conflict("CANCELLATION_POLICY_NOT_CONFIGURED", "Rate plan does not have a cancellation policy");
  const rates = await tx.dailyRate.findMany({where: {ratePlanId, date: {in: dateValues}}, orderBy: {date: "asc"}});
  if (rates.length !== dates.length) conflict("RATE_NOT_CONFIGURED", "A rate is missing for one or more stay dates");
  if (rates.some((rate) => rate.closed || rate.stopSell)) conflict("RATE_RESTRICTED", "Selected stay includes a closed or stop-sell date");

  const stayLength = dates.length;
  const arrivalRate = rates[0];
  const arrivalDate = dates[0];
  if (!arrivalRate || !arrivalDate) conflict("RATE_NOT_CONFIGURED", "Arrival rate is not configured");
  if (arrivalRate.closedToArrival) conflict("CLOSED_TO_ARRIVAL", "This rate plan does not allow arrival on the selected date");
  if (arrivalRate.minStay > stayLength || (arrivalRate.maxStay !== null && arrivalRate.maxStay < stayLength)) conflict("STAY_LENGTH_RESTRICTED", "Selected stay length does not satisfy the arrival-date restriction");

  const bookingLeadDays = calendarDayDifference(localDateInTimeZone(new Date(), hotel.timezone), arrivalDate);
  if (bookingLeadDays < arrivalRate.minAdvanceBookingDays) conflict("ADVANCE_BOOKING_TOO_SOON", `Arrival requires at least ${arrivalRate.minAdvanceBookingDays} day(s) advance booking`);
  if (arrivalRate.maxAdvanceBookingDays !== null && bookingLeadDays > arrivalRate.maxAdvanceBookingDays) conflict("ADVANCE_BOOKING_TOO_FAR", `Arrival can be booked at most ${arrivalRate.maxAdvanceBookingDays} day(s) in advance`);

  const departureDate = nextDateAfter(dates[dates.length - 1]!);
  const departureRestriction = await tx.dailyRate.findUnique({where: {ratePlanId_date: {ratePlanId, date: parseDateOnly(departureDate)}}, select: {closedToDeparture: true}});
  if (departureRestriction?.closedToDeparture) conflict("CLOSED_TO_DEPARTURE", "This rate plan does not allow departure on the selected date");

  const promotion = selectBestPromotion(ratePlan.promotions.map((item) => item.promotion), dateValues);
  const nights = rates.map((rate) => {
    const base = promotionBaseRate(Number(rate.baseRate), promotion);
    return {date: rate.date, ...calculatePrice(base, {serviceRate: Number(hotel.serviceRate), taxRate: Number(hotel.taxRate)})};
  });
  return {nights, promotion, policy: policySnapshot(ratePlan.cancellationPolicy), ratePlan: {id: ratePlan.id, name: ratePlan.name, code: ratePlan.code, allowPayNow: ratePlan.allowPayNow, allowPayAtHotel: ratePlan.allowPayAtHotel, roomType: ratePlan.roomType}};
}

async function availableToSellForStay(tx: Pick<DbClient, "inventoryDay">, roomTypeId: string, dates: readonly Date[], overbookingEnabled: boolean): Promise<number> {
  const rows = await tx.inventoryDay.findMany({where: {roomTypeId, date: {in: [...dates]}}, select: {date: true, available: true, overbookingLimit: true}});
  if (rows.length !== dates.length) conflict("INVENTORY_NOT_CONFIGURED", "Inventory is missing for one or more stay dates");
  const remaining = rows.map((row) => row.available + (overbookingEnabled ? row.overbookingLimit : 0));
  if (remaining.some((value) => value <= 0)) conflict("INVENTORY_UNAVAILABLE", "No inventory is available for one or more stay dates");
  return Math.min(...remaining);
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

function cancellationEvaluation(booking: {status: string; paymentState: string; arrival: Date; totalAmount: unknown; cancellationPolicySnapshot: unknown}, hotelTimeZone: string, nights: Array<{totalAmount: unknown; date: Date}>) {
  const policy = cancellationPolicyFromJson(booking.cancellationPolicySnapshot);
  if (booking.status === "HOLD") {
    const captured = booking.paymentState === "CAPTURED" || booking.paymentState === "PARTIALLY_REFUNDED";
    return {policy, daysBeforeArrival: 0, penaltyType: "NONE" as const, penaltyAmount: 0, refundableAmount: captured ? Number(booking.totalAmount) : 0, rule: "CANCELLATION" as const};
  }
  const firstNight = [...nights].sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  if (!firstNight) throw new ApplicationError("BOOKING_NIGHTS_MISSING", "Booking does not contain nightly pricing snapshots", 500);
  return {policy, ...evaluateCancellation({arrival: dateKey(booking.arrival), hotelTimeZone, totalAmount: Number(booking.totalAmount), firstNightAmount: Number(firstNight.totalAmount), policy})};
}

function policySnapshot(policy: {name: string; noShowPenaltyType: string; noShowPenaltyValue: unknown; rules: Array<{minimumDaysBeforeArrival: number; penaltyType: string; penaltyValue: unknown}>}): CancellationPolicySnapshot {
  return {
    name: policy.name,
    noShowPenaltyType: policy.noShowPenaltyType as CancellationPolicySnapshot["noShowPenaltyType"],
    noShowPenaltyValue: policy.noShowPenaltyValue === null ? null : Number(policy.noShowPenaltyValue),
    rules: policy.rules.map((rule) => ({minimumDaysBeforeArrival: rule.minimumDaysBeforeArrival, penaltyType: rule.penaltyType as CancellationPolicySnapshot["rules"][number]["penaltyType"], penaltyValue: rule.penaltyValue === null ? null : Number(rule.penaltyValue)})),
  };
}

function policyToJson(policy: CancellationPolicySnapshot): PolicyJson {
  return {name: policy.name, noShowPenaltyType: policy.noShowPenaltyType, noShowPenaltyValue: policy.noShowPenaltyValue ?? null, rules: policy.rules.map((rule) => ({minimumDaysBeforeArrival: rule.minimumDaysBeforeArrival, penaltyType: rule.penaltyType, penaltyValue: rule.penaltyValue ?? null}))};
}

function cancellationPolicyFromJson(value: unknown): CancellationPolicySnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApplicationError("INVALID_CANCELLATION_SNAPSHOT", "Stored cancellation policy is invalid", 500);
  const raw = value as Record<string, unknown>;
  if (typeof raw.name !== "string" || typeof raw.noShowPenaltyType !== "string" || !Array.isArray(raw.rules)) throw new ApplicationError("INVALID_CANCELLATION_SNAPSHOT", "Stored cancellation policy is invalid", 500);
  const rules = raw.rules.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new ApplicationError("INVALID_CANCELLATION_SNAPSHOT", "Stored cancellation rule is invalid", 500);
    const rule = item as Record<string, unknown>;
    if (typeof rule.minimumDaysBeforeArrival !== "number" || typeof rule.penaltyType !== "string") throw new ApplicationError("INVALID_CANCELLATION_SNAPSHOT", "Stored cancellation rule is invalid", 500);
    return {minimumDaysBeforeArrival: rule.minimumDaysBeforeArrival, penaltyType: rule.penaltyType as CancellationPolicySnapshot["rules"][number]["penaltyType"], penaltyValue: typeof rule.penaltyValue === "number" ? rule.penaltyValue : null};
  });
  return {name: raw.name, noShowPenaltyType: raw.noShowPenaltyType as CancellationPolicySnapshot["noShowPenaltyType"], noShowPenaltyValue: typeof raw.noShowPenaltyValue === "number" ? raw.noShowPenaltyValue : null, rules};
}

async function createAutomaticRefundIfNeeded(tx: Pick<DbClient, "refund">, booking: {id: string; currency: string; paymentState: string}, allowedAmount: number, reason: string) {
  if ((booking.paymentState !== "CAPTURED" && booking.paymentState !== "PARTIALLY_REFUNDED") || allowedAmount <= 0) return;
  const committed = await tx.refund.aggregate({where: {bookingId: booking.id, status: {in: ["REQUESTED", "APPROVED", "PROCESSING", "COMPLETED"]}}, _sum: {amount: true}});
  const remaining = roundMoney(allowedAmount - Number(committed._sum.amount ?? 0));
  if (remaining > 0) await tx.refund.create({data: {bookingId: booking.id, amount: remaining, currency: booking.currency, reason}});
}

function assertPaymentModeAllowed(mode: string, ratePlan: {allowPayNow: boolean; allowPayAtHotel: boolean}) {
  if (mode === "PAY_NOW" && !ratePlan.allowPayNow) conflict("PAYMENT_MODE_NOT_ALLOWED", "This rate plan does not allow pay now");
  if (mode === "PAY_AT_HOTEL" && !ratePlan.allowPayAtHotel) conflict("PAYMENT_MODE_NOT_ALLOWED", "This rate plan does not allow pay at hotel");
}

function assertRoomOccupancy(room: {maxGuests: number; maxAdults: number; maxChildren: number}, adults: number, children: number) {
  if (adults > room.maxAdults || children > room.maxChildren || adults + children > room.maxGuests) {
    conflict("ROOM_CAPACITY_EXCEEDED", "The selected room does not fit the requested adults and children");
  }
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

function localDateInTimeZone(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone, year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new ApplicationError("HOTEL_DATE_UNAVAILABLE", "Unable to resolve the hotel's local date", 500);
  return `${year}-${month}-${day}`;
}

function calendarDayDifference(from: string, to: string): number {
  return Math.round((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86_400_000);
}

function nextDateAfter(value: string): string {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return dateKey(date);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
