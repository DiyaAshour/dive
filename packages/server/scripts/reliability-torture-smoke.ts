import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import dotenv from "dotenv";

dotenv.config({path: new URL("../../../.env", import.meta.url)});

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const email = `reliability-${suffix}@handmekey.invalid`;
const password = "Reliability-Torture-Smoke-Pass!";
const [{database}, server] = await Promise.all([import("@platform/database"), import("../src/index")]);
const previousPayTabsKey = process.env.PAYTABS_SERVER_KEY;
process.env.PAYTABS_SERVER_KEY = `reliability-paytabs-${suffix}-server-key`;
let hotelId: string | null = null;

try {
  const registered = await server.registerUser({email, password, displayName: "Reliability Torture Smoke"});
  const hotel = await server.createHotel(registered.user.id, {
    name: "Reliability Torture Smoke Hotel",
    city: "Amman",
    countryCode: "JO",
    address: "Reliability torture smoke address, Amman",
    timezone: "Asia/Amman",
    currency: "JOD",
  });
  hotelId = hotel.id;
  const room = await server.createRoomType(registered.user.id, hotel.id, roomInput());
  const rate = await server.createRatePlan(registered.user.id, hotel.id, {
    roomTypeId: room.id,
    name: "Reliability Flexible",
    code: "RELIABILITY-FLEX",
    refundable: true,
    mealPlan: "ROOM_ONLY",
    allowPayNow: true,
    allowPayAtHotel: true,
  });

  const dates = Array.from({length: 28}, (_, index) => utcDay(index + 4));
  await server.upsertCalendar(registered.user.id, hotel.id, {
    entries: dates.map((date, index) => ({
      date,
      roomTypeId: room.id,
      ratePlanId: rate.id,
      baseRate: 90 + index,
      available: index < 3 ? 1 : 5,
      overbookingLimit: 0,
      minStay: 1,
      maxStay: null,
      closed: false,
      stopSell: false,
    })),
  });
  await database().hotel.update({where: {id: hotel.id}, data: {status: "ACTIVE", verified: true}});

  await verifyLastRoomConcurrency({userId: registered.user.id, hotelId: hotel.id, roomTypeId: room.id, ratePlanId: rate.id, arrival: dates[0]!, departure: dates[2]!});
  await verifyDoubleConfirm({userId: registered.user.id, hotelId: hotel.id, roomTypeId: room.id, ratePlanId: rate.id, arrival: dates[4]!, departure: dates[6]!});
  await verifyDuplicatePayTabsCallback({userId: registered.user.id, hotelId: hotel.id, roomTypeId: room.id, ratePlanId: rate.id, arrival: dates[8]!, departure: dates[10]!});
  await verifyHoldExpiryDuringCapture({userId: registered.user.id, hotelId: hotel.id, roomTypeId: room.id, ratePlanId: rate.id, arrival: dates[12]!, departure: dates[14]!});
  await verifyConcurrentRefundCap({userId: registered.user.id, hotelId: hotel.id, roomTypeId: room.id, ratePlanId: rate.id, arrival: dates[16]!, departure: dates[18]!});
  await verifyConcurrentRefundCompletion({userId: registered.user.id, hotelId: hotel.id, roomTypeId: room.id, ratePlanId: rate.id, arrival: dates[20]!, departure: dates[22]!});

  console.log("[reliability-torture-smoke] last-room race, double confirm, duplicate callback, expiry/capture race and refund concurrency passed");
} finally {
  if (hotelId) await cleanupHotel(hotelId);
  await database().user.deleteMany({where: {email}});
  if (previousPayTabsKey === undefined) delete process.env.PAYTABS_SERVER_KEY;
  else process.env.PAYTABS_SERVER_KEY = previousPayTabsKey;
  await database().$disconnect();
}

async function verifyLastRoomConcurrency(input: StaySetup) {
  const request = (tag: string) => server.createBookingHold({
    hotelId: input.hotelId,
    roomTypeId: input.roomTypeId,
    ratePlanId: input.ratePlanId,
    arrival: input.arrival,
    departure: input.departure,
    adults: 1,
    children: 0,
    guestName: `Last Room ${tag}`,
    guestEmail: email,
    paymentMode: "PAY_AT_HOTEL",
  }, {userId: input.userId, idempotencyKey: `reliability-last-room-${suffix}-${tag}`});

  const results = await Promise.allSettled([request("A"), request("B")]);
  const winners = results.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof request>>> => result.status === "fulfilled");
  const losers = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  assert.equal(winners.length, 1, "exactly one guest must win the final room");
  assert.equal(losers.length, 1, "the competing final-room hold must fail safely");
  assert.ok(isExpectedBookingRace(losers[0]!.reason), `unexpected final-room race error: ${String(losers[0]!.reason)}`);

  const inventory = await database().inventoryDay.findMany({where: {roomTypeId: input.roomTypeId, date: {in: stayDates(input.arrival, input.departure).map(dateObject)}}, orderBy: {date: "asc"}});
  assert.equal(inventory.length, 2);
  assert.ok(inventory.every((day) => day.available === 0), "last-room inventory must never drop below zero");
}

async function verifyDoubleConfirm(input: StaySetup) {
  const hold = await createHold({...input, paymentMode: "PAY_AT_HOTEL", key: `double-confirm-${suffix}`});
  const key = `double-confirm-event-${suffix}`;
  const results = await Promise.allSettled([
    server.confirmBooking(hold.booking.id, key, {userId: input.userId}),
    server.confirmBooking(hold.booking.id, key, {userId: input.userId}),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      assert.ok(isRetryableConcurrency(result.reason), `unexpected double-confirm error: ${String(result.reason)}`);
      await server.confirmBooking(hold.booking.id, key, {userId: input.userId});
    }
  }
  const [booking, events, financialEvents] = await Promise.all([
    database().booking.findUniqueOrThrow({where: {id: hold.booking.id}}),
    database().bookingEvent.findMany({where: {bookingId: hold.booking.id, type: "CONFIRMED"}}),
    database().financialEvent.findMany({where: {bookingId: hold.booking.id, referenceType: "BOOKING_CONFIRMATION"}}),
  ]);
  assert.equal(booking.status, "CONFIRMED");
  assert.equal(events.length, 1, "double confirm must create one confirmation event");
  assert.equal(financialEvents.length, 5, "double confirm must post the financial confirmation ledger once");
}

async function verifyDuplicatePayTabsCallback(input: StaySetup) {
  const hold = await createHold({...input, paymentMode: "PAY_NOW", key: `duplicate-callback-${suffix}`});
  const attempt = await createPayTabsAttempt(hold.booking.id, hold.booking.amounts.total, hold.booking.currency, `duplicate-callback-${suffix}`);
  const transactionRef = `TORTURE-DUP-${suffix}`;
  const callback = signedPayTabsCallback(attempt.id, transactionRef);

  const results = await Promise.allSettled([
    server.handlePayTabsCallback(callback.rawBody, callback.signature),
    server.handlePayTabsCallback(callback.rawBody, callback.signature),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      assert.ok(isRetryableConcurrency(result.reason), `duplicate payment callback was not retry-safe: ${String(result.reason)}`);
      const replay = await server.handlePayTabsCallback(callback.rawBody, callback.signature);
      assert.equal(replay.status, "CAPTURED");
    } else {
      assert.equal(result.value.status, "CAPTURED");
    }
  }

  const replayAfterLostResponse = await server.handlePayTabsCallback(callback.rawBody, callback.signature);
  assert.equal(replayAfterLostResponse.status, "CAPTURED", "provider callback must be safe to replay after a lost HTTP response");
  await server.confirmBooking(hold.booking.id, `duplicate-callback-confirm-${suffix}`, {userId: input.userId});

  const [booking, paymentEvents, attempts] = await Promise.all([
    database().booking.findUniqueOrThrow({where: {id: hold.booking.id}}),
    database().bookingEvent.findMany({where: {bookingId: hold.booking.id, type: "PAYMENT_CAPTURED"}}),
    database().paymentAttempt.findMany({where: {bookingId: hold.booking.id}}),
  ]);
  assert.equal(booking.paymentState, "CAPTURED");
  assert.equal(booking.status, "CONFIRMED");
  assert.equal(paymentEvents.length, 1, "duplicate provider callbacks must create one payment capture event");
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0]!.externalPaymentId, transactionRef);
}

async function verifyHoldExpiryDuringCapture(input: StaySetup) {
  const hold = await createHold({...input, paymentMode: "PAY_NOW", key: `expiry-capture-${suffix}`});
  const attempt = await createPayTabsAttempt(hold.booking.id, hold.booking.amounts.total, hold.booking.currency, `expiry-capture-${suffix}`);
  await database().booking.update({where: {id: hold.booking.id}, data: {holdExpiresAt: new Date(Date.now() - 60_000)}});
  const transactionRef = `TORTURE-EXP-${suffix}`;
  const callback = signedPayTabsCallback(attempt.id, transactionRef);

  const race = await Promise.allSettled([
    server.handlePayTabsCallback(callback.rawBody, callback.signature),
    server.expireStaleHolds(100),
  ]);
  for (const result of race) {
    if (result.status === "rejected") assert.ok(isRetryableConcurrency(result.reason), `unexpected expiry/capture race error: ${String(result.reason)}`);
  }
  await server.handlePayTabsCallback(callback.rawBody, callback.signature);
  await server.expireStaleHolds(100);

  const [booking, refunds, paymentEvents, expiredEvents] = await Promise.all([
    database().booking.findUniqueOrThrow({where: {id: hold.booking.id}}),
    database().refund.findMany({where: {bookingId: hold.booking.id, status: {in: ["REQUESTED", "APPROVED", "PROCESSING", "COMPLETED"]}}}),
    database().bookingEvent.findMany({where: {bookingId: hold.booking.id, type: "PAYMENT_CAPTURED"}}),
    database().bookingEvent.findMany({where: {bookingId: hold.booking.id, type: "EXPIRED"}}),
  ]);
  assert.equal(booking.status, "EXPIRED", "expired hold must not become a confirmed booking after late capture");
  assert.equal(booking.paymentState, "CAPTURED");
  assert.equal(paymentEvents.length, 1);
  assert.equal(expiredEvents.length, 1);
  assert.equal(refunds.length, 1, "late captured payment must produce one compensating refund request");
  assert.equal(Number(refunds[0]!.amount), Number(booking.totalAmount));
}

async function verifyConcurrentRefundCap(input: StaySetup) {
  const booking = await createCapturedConfirmedBooking(input, `refund-cap-${suffix}`);
  const total = Number(booking.totalAmount);
  const results = await Promise.allSettled([
    server.requestRefund(booking.id, {amount: total, reason: "Concurrency refund A", externalReference: `refund-cap-a-${suffix}`}, input.userId),
    server.requestRefund(booking.id, {amount: total, reason: "Concurrency refund B", externalReference: `refund-cap-b-${suffix}`}, input.userId),
  ]);
  const successful = results.filter((result) => result.status === "fulfilled");
  assert.ok(successful.length >= 1, "one refund request should be accepted");
  for (const result of results) {
    if (result.status === "rejected") assert.ok(isExpectedRefundRace(result.reason), `unexpected concurrent refund error: ${String(result.reason)}`);
  }
  const committed = await database().refund.aggregate({where: {bookingId: booking.id, status: {in: ["REQUESTED", "APPROVED", "PROCESSING", "COMPLETED"]}}, _sum: {amount: true}});
  assert.ok(Number(committed._sum.amount ?? 0) <= total + 0.001, "concurrent refund requests must never exceed the refundable booking cap");
}

async function verifyConcurrentRefundCompletion(input: StaySetup) {
  const booking = await createCapturedConfirmedBooking(input, `refund-completion-${suffix}`);
  const amount = Math.round(Number(booking.totalAmount) * 0.4 * 100) / 100;
  const refund = await server.requestRefund(booking.id, {amount, reason: "Concurrent completion", externalReference: `refund-completion-request-${suffix}`}, input.userId);
  const results = await Promise.allSettled([
    server.completeRefundRecord(refund.id, `refund-complete-${suffix}`, input.userId),
    server.completeRefundRecord(refund.id, `refund-complete-${suffix}`, input.userId),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      assert.ok(isRetryableConcurrency(result.reason), `unexpected concurrent refund completion error: ${String(result.reason)}`);
      await server.completeRefundRecord(refund.id, `refund-complete-${suffix}`, input.userId);
    }
  }
  const [row, ledger, events] = await Promise.all([
    database().refund.findUniqueOrThrow({where: {id: refund.id}}),
    database().financialEvent.findMany({where: {bookingId: booking.id, type: "REFUND", referenceId: refund.id}}),
    database().bookingEvent.findMany({where: {bookingId: booking.id, type: "REFUND_RECORDED"}}),
  ]);
  assert.equal(row.status, "COMPLETED");
  assert.equal(ledger.length, 1, "a concurrently completed refund must hit the financial ledger once");
  assert.equal(events.length, 1, "a concurrently completed refund must create one booking event");
}

async function createCapturedConfirmedBooking(input: StaySetup, key: string) {
  const hold = await createHold({...input, paymentMode: "PAY_NOW", key});
  const externalReference = `capture-${key}`;
  await database().paymentAttempt.create({data: {
    bookingId: hold.booking.id,
    provider: "SMOKE_PROVIDER",
    status: "CAPTURED",
    amount: hold.booking.amounts.total,
    currency: hold.booking.currency,
    idempotencyKey: `${key}:attempt`,
    requestFingerprint: `${key}:fingerprint`,
    externalPaymentId: externalReference,
    returnUrl: "https://example.invalid/reliability",
    completedAt: new Date(),
  }});
  await server.recordPaymentCaptured(hold.booking.id, externalReference, input.userId);
  await server.confirmBooking(hold.booking.id, `${key}:confirm`, {userId: input.userId});
  return database().booking.findUniqueOrThrow({where: {id: hold.booking.id}});
}

async function createHold(input: StaySetup & {paymentMode: "PAY_NOW" | "PAY_AT_HOTEL"; key: string}) {
  return server.createBookingHold({
    hotelId: input.hotelId,
    roomTypeId: input.roomTypeId,
    ratePlanId: input.ratePlanId,
    arrival: input.arrival,
    departure: input.departure,
    adults: 2,
    children: 0,
    guestName: `Reliability Guest ${input.key.slice(-8)}`,
    guestEmail: email,
    paymentMode: input.paymentMode,
  }, {userId: input.userId, idempotencyKey: `${input.key}:hold`});
}

async function createPayTabsAttempt(bookingId: string, amount: number, currency: string, key: string) {
  return database().paymentAttempt.create({data: {
    bookingId,
    provider: "paytabs",
    status: "REQUIRES_ACTION",
    amount,
    currency,
    idempotencyKey: `${key}:attempt`,
    requestFingerprint: `${key}:fingerprint`,
    externalPaymentId: null,
    returnUrl: "https://example.invalid/paytabs-return",
    redirectUrl: "https://example.invalid/paytabs-redirect",
  }});
}

function signedPayTabsCallback(attemptId: string, transactionRef: string) {
  const rawBody = JSON.stringify({cart_id: attemptId, tran_ref: transactionRef, payment_result: {response_status: "A", response_code: "100", response_message: "Authorised"}});
  const signature = createHmac("sha256", process.env.PAYTABS_SERVER_KEY!).update(rawBody).digest("hex");
  return {rawBody, signature};
}

function isExpectedBookingRace(error: unknown) {
  return error instanceof server.ApplicationError && ["INVENTORY_UNAVAILABLE", "INVENTORY_CHANGED", "BOOKING_CONCURRENCY_RETRY"].includes(error.code);
}
function isRetryableConcurrency(error: unknown) {
  return error instanceof server.ApplicationError && ["BOOKING_CONCURRENCY_RETRY", "REFUND_CONCURRENCY_RETRY", "INVENTORY_CHANGED"].includes(error.code)
    || typeof error === "object" && error !== null && "code" in error && ["P2034", "P2002"].includes(String((error as {code?: unknown}).code));
}
function isExpectedRefundRace(error: unknown) {
  return error instanceof server.ApplicationError && ["REFUND_EXCEEDS_OUTSTANDING", "REFUND_CONCURRENCY_RETRY"].includes(error.code)
    || isRetryableConcurrency(error);
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

function stayDates(arrival: string, departure: string) {
  const dates: string[] = [];
  const cursor = dateObject(arrival);
  const end = dateObject(departure);
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
function utcDay(offset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)).toISOString().slice(0, 10);
}
function dateObject(value: string) {return new Date(`${value}T00:00:00.000Z`);}

type StaySetup = Readonly<{userId: string; hotelId: string; roomTypeId: string; ratePlanId: string; arrival: string; departure: string}>;

function roomInput() {
  return {
    name: "Reliability King",
    code: "RELIABILITY-KING",
    description: "Room product used for booking and payment concurrency torture tests.",
    unitType: "ROOM" as const,
    quantity: 5,
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
