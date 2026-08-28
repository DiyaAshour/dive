import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({path: new URL("../../../.env", import.meta.url)});

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const email = `finance-settlement-${suffix}@handmekey.invalid`;
const password = "Finance-Settlement-Smoke-Pass!";
const [{database}, server] = await Promise.all([import("@platform/database"), import("../src/index")]);
let hotelId: string | null = null;

try {
  const registered = await server.registerUser({email, password, displayName: "Finance Settlement Smoke"});
  const hotel = await server.createHotel(registered.user.id, {
    name: "Finance Settlement Smoke Hotel",
    city: "Amman",
    countryCode: "JO",
    address: "Finance settlement smoke address, Amman",
    timezone: "Asia/Amman",
    currency: "JOD",
  });
  hotelId = hotel.id;
  const room = await server.createRoomType(registered.user.id, hotel.id, roomInput());
  const rate = await server.createRatePlan(registered.user.id, hotel.id, {
    roomTypeId: room.id,
    name: "Settlement Flexible",
    code: "SETTLE-FLEX",
    refundable: true,
    mealPlan: "ROOM_ONLY",
    allowPayNow: true,
    allowPayAtHotel: true,
  });

  const futureDates = Array.from({length: 10}, (_, index) => utcDay(index + 3));
  await server.upsertCalendar(registered.user.id, hotel.id, {
    entries: futureDates.map((date, index) => ({
      date,
      roomTypeId: room.id,
      ratePlanId: rate.id,
      baseRate: 100 + index,
      available: 8,
      overbookingLimit: 0,
      minStay: 1,
      maxStay: null,
      closed: false,
      stopSell: false,
    })),
  });
  await database().hotel.update({where: {id: hotel.id}, data: {status: "ACTIVE", verified: true}});

  const payNow = await createConfirmedBooking({
    userId: registered.user.id,
    hotelId: hotel.id,
    roomTypeId: room.id,
    ratePlanId: rate.id,
    arrival: futureDates[0]!,
    departure: futureDates[2]!,
    paymentMode: "PAY_NOW",
    key: `settlement-clean-card-${suffix}`,
    capturedRatio: 1,
  });
  const payAtHotel = await createConfirmedBooking({
    userId: registered.user.id,
    hotelId: hotel.id,
    roomTypeId: room.id,
    ratePlanId: rate.id,
    arrival: futureDates[3]!,
    departure: futureDates[5]!,
    paymentMode: "PAY_AT_HOTEL",
    key: `settlement-hotel-${suffix}`,
  });

  await database().booking.update({where: {id: payNow.id}, data: {arrival: dateObject(utcDay(-6)), departure: dateObject(utcDay(-4))}});
  await database().booking.update({where: {id: payAtHotel.id}, data: {arrival: dateObject(utcDay(-5)), departure: dateObject(utcDay(-3))}});

  const cleanPeriod = {from: utcDay(-7), to: utcDay(-2)};
  const reconciliation = await server.runPartnerReconciliation(registered.user.id, hotel.id, cleanPeriod);
  assert.equal(reconciliation.status, "CLEAN");
  assert.equal(reconciliation.issueCount, 0);
  assert.equal(reconciliation.eligibleBookingCount, 1);
  assert.ok(reconciliation.partnerNet > 0);
  assert.ok(reconciliation.payAtHotelCommission > 0);
  assert.equal(reconciliation.collectionVariance, 0);

  const payout = await server.createPartnerPayout(registered.user.id, hotel.id, cleanPeriod);
  assert.equal(payout.status, "READY");
  assert.ok(payout.partnerNet > 0);
  assert.equal(payout.payAtHotelCommission, reconciliation.payAtHotelCommission);
  const replay = await server.createPartnerPayout(registered.user.id, hotel.id, cleanPeriod);
  assert.equal(replay.id, payout.id);

  await assert.rejects(
    () => server.createPartnerPayout(registered.user.id, hotel.id, {from: utcDay(-1), to: utcDay(0)}),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "PAYOUT_PERIOD_NOT_CLOSED",
  );

  const mismatch = await createConfirmedBooking({
    userId: registered.user.id,
    hotelId: hotel.id,
    roomTypeId: room.id,
    ratePlanId: rate.id,
    arrival: futureDates[6]!,
    departure: futureDates[8]!,
    paymentMode: "PAY_NOW",
    key: `settlement-mismatch-${suffix}`,
    capturedRatio: 0.9,
  });
  await database().booking.update({where: {id: mismatch.id}, data: {arrival: dateObject(utcDay(-13)), departure: dateObject(utcDay(-11))}});
  const reviewPeriod = {from: utcDay(-14), to: utcDay(-10)};
  const review = await server.runPartnerReconciliation(registered.user.id, hotel.id, reviewPeriod);
  assert.equal(review.status, "REVIEW_REQUIRED");
  assert.ok(review.issueCount >= 1);
  await assert.rejects(
    () => server.createPartnerPayout(registered.user.id, hotel.id, reviewPeriod),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "RECONCILIATION_REQUIRED",
  );

  await database().user.update({where: {id: registered.user.id}, data: {platformRole: "PLATFORM_ADMIN"}});
  const queue = await server.listPlatformPayoutQueue(registered.user.id);
  assert.ok(queue.some((item: {id: string}) => item.id === payout.id));
  const paid = await server.updatePlatformPayout(registered.user.id, payout.id, {action: "PAID", externalReference: `BANK-${suffix}`});
  assert.equal(paid.status, "PAID");
  assert.equal(paid.externalReference, `BANK-${suffix}`);
  const paidReplay = await server.updatePlatformPayout(registered.user.id, payout.id, {action: "PAID", externalReference: `BANK-${suffix}`});
  assert.equal(paidReplay.status, "PAID");

  const audits = await database().auditLog.findMany({where: {hotelId: hotel.id, action: {in: ["PARTNER_RECONCILIATION_RUN", "PARTNER_PAYOUT_CREATED", "PARTNER_PAYOUT_PAID"]}}});
  assert.ok(audits.some((entry) => entry.action === "PARTNER_PAYOUT_CREATED"));
  assert.ok(audits.some((entry) => entry.action === "PARTNER_PAYOUT_PAID"));
  assert.ok(audits.filter((entry) => entry.action === "PARTNER_RECONCILIATION_RUN").length >= 2);

  console.log("[finance-settlement-smoke] clean reconciliation, blocked mismatch, payout idempotency, closed-period guard and admin paid lifecycle passed");
} finally {
  if (hotelId) await cleanupHotel(hotelId);
  await database().user.deleteMany({where: {email}});
  await database().$disconnect();
}

async function createConfirmedBooking(input: {
  userId: string;
  hotelId: string;
  roomTypeId: string;
  ratePlanId: string;
  arrival: string;
  departure: string;
  paymentMode: "PAY_NOW" | "PAY_AT_HOTEL";
  key: string;
  capturedRatio?: number;
}) {
  const hold = await server.createBookingHold({
    hotelId: input.hotelId,
    roomTypeId: input.roomTypeId,
    ratePlanId: input.ratePlanId,
    arrival: input.arrival,
    departure: input.departure,
    adults: 2,
    children: 0,
    guestName: `Settlement Guest ${input.key.slice(-8)}`,
    guestEmail: email,
    paymentMode: input.paymentMode,
  }, {userId: input.userId, idempotencyKey: `${input.key}:hold`});

  if (input.paymentMode === "PAY_NOW") {
    const total = hold.booking.amounts.total;
    const captured = Math.round(total * (input.capturedRatio ?? 1) * 100) / 100;
    await database().paymentAttempt.create({data: {
      bookingId: hold.booking.id,
      provider: "SMOKE_PROVIDER",
      status: "CAPTURED",
      amount: captured,
      currency: hold.booking.currency,
      idempotencyKey: `${input.key}:payment-attempt`,
      requestFingerprint: `${input.key}:fingerprint`,
      externalPaymentId: `${input.key}:external`,
      returnUrl: "https://example.invalid/settlement-smoke",
      completedAt: new Date(),
    }});
    await database().booking.update({where: {id: hold.booking.id}, data: {paymentState: "CAPTURED"}});
  }

  return server.confirmBooking(hold.booking.id, `${input.key}:confirm`, {userId: input.userId});
}

async function cleanupHotel(id: string) {
  await database().partnerPayout.deleteMany({where: {hotelId: id}});
  await database().partnerReconciliation.deleteMany({where: {hotelId: id}});
  await database().partnerStatement.deleteMany({where: {hotelId: id}});
  await database().bookingInvoice.deleteMany({where: {hotelId: id}});
  const bookings = await database().booking.findMany({where: {hotelId: id}, select: {id: true}});
  const bookingIds = bookings.map((booking) => booking.id);
  if (bookingIds.length) {
    await database().$transaction([
      database().bookingEvent.deleteMany({where: {bookingId: {in: bookingIds}}}),
      database().paymentAttempt.deleteMany({where: {bookingId: {in: bookingIds}}}),
      database().refund.deleteMany({where: {bookingId: {in: bookingIds}}}),
      database().financialEvent.deleteMany({where: {bookingId: {in: bookingIds}}}),
      database().walletLedgerEntry.deleteMany({where: {bookingId: {in: bookingIds}}}),
    ]);
    await database().booking.deleteMany({where: {id: {in: bookingIds}}});
  }
  await database().hotel.deleteMany({where: {id}});
}

function utcDay(offset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)).toISOString().slice(0, 10);
}

function dateObject(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function roomInput() {
  return {
    name: "Settlement King",
    code: "SETTLE-KING",
    description: "Room product used to validate partner collection reconciliation, commission separation and payout lifecycle.",
    unitType: "ROOM" as const,
    quantity: 8,
    maxGuests: 2,
    maxAdults: 2,
    maxChildren: 0,
    maxInfants: 0,
    bedroomCount: 1,
    livingRoomCount: 0,
    bathroomCount: 1,
    privateBathroom: true,
    sizeValue: 34,
    sizeUnit: "SQM" as const,
    smokingPolicy: "NON_SMOKING" as const,
    extraBedCount: 0,
    cribCount: 0,
    allowsCribAndExtraBed: false,
    active: true,
    beds: [{area: "Bedroom", type: "KING" as const, quantity: 1, sortOrder: 0}],
    amenities: [],
  };
}
