import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({path: new URL("../../../.env", import.meta.url)});

const email = "reservation-center-smoke@handmekey.invalid";
const password = "Reservation-Center-Smoke-Pass!";

const [{database}, server] = await Promise.all([
  import("@platform/database"),
  import("../src/index"),
]);

let hotelId: string | null = null;

try {
  const previous = await database().user.findUnique({where: {email}, select: {hotelMemberships: {select: {hotelId: true}}}});
  if (previous?.hotelMemberships.length) await database().hotel.deleteMany({where: {id: {in: previous.hotelMemberships.map((membership) => membership.hotelId)}}});
  await database().user.deleteMany({where: {email}});

  const registered = await server.registerUser({email, password, displayName: "Reservation Center Partner"});
  const hotel = await server.createHotel(registered.user.id, {name: "Reservation Operations Smoke Hotel", city: "Amman", countryCode: "JO", address: "Reservation smoke test address, Amman", timezone: "UTC", currency: "JOD"});
  hotelId = hotel.id;

  const roomA = await server.createRoomType(registered.user.id, hotel.id, roomInput("Classic King", "KING", 5));
  const roomB = await server.createRoomType(registered.user.id, hotel.id, roomInput("Premium Twin", "TWIN", 3));
  const rateA = await server.createRatePlan(registered.user.id, hotel.id, {roomTypeId: roomA.id, name: "Flexible King", code: "FLEX-K", refundable: true, mealPlan: "ROOM_ONLY", allowPayNow: true, allowPayAtHotel: true});
  const rateB = await server.createRatePlan(registered.user.id, hotel.id, {roomTypeId: roomB.id, name: "Flexible Twin", code: "FLEX-T", refundable: true, mealPlan: "BREAKFAST", allowPayNow: true, allowPayAtHotel: true});

  const today = utcDay(0);
  const dates = Array.from({length: 11}, (_, index) => utcDay(index - 1));
  await server.upsertCalendar(registered.user.id, hotel.id, {entries: dates.flatMap((date, index) => [
    {date, roomTypeId: roomA.id, ratePlanId: rateA.id, baseRate: 100 + index, available: 5, overbookingLimit: 0, minStay: 1, maxStay: null, closed: false, stopSell: false},
    {date, roomTypeId: roomB.id, ratePlanId: rateB.id, baseRate: 145 + index, available: 3, overbookingLimit: 0, minStay: 1, maxStay: null, closed: false, stopSell: false},
  ])});
  await database().hotel.update({where: {id: hotel.id}, data: {status: "ACTIVE", verified: true}});

  const noShowArrival = utcDay(-1);
  const noShowDeparture = utcDay(1);
  const noShowHold = await server.createBookingHold({hotelId: hotel.id, roomTypeId: roomA.id, ratePlanId: rateA.id, arrival: noShowArrival, departure: noShowDeparture, adults: 2, children: 0, guestName: "No Show Smoke Guest", guestEmail: "no-show-smoke@handmekey.invalid", paymentMode: "PAY_AT_HOTEL"}, {idempotencyKey: "reservation-smoke-no-show-hold"});
  const noShowBooking = await server.confirmBooking(noShowHold.booking.id, "reservation-smoke-no-show-confirm", {userId: registered.user.id});
  assert.equal(noShowBooking.status, "CONFIRMED");

  const futureArrival = utcDay(3);
  const futureDeparture = utcDay(5);
  const futureHold = await server.createBookingHold({hotelId: hotel.id, roomTypeId: roomA.id, ratePlanId: rateA.id, arrival: futureArrival, departure: futureDeparture, adults: 2, children: 0, guestName: "Modify Cancel Smoke Guest", guestEmail: "modify-cancel-smoke@handmekey.invalid", paymentMode: "PAY_AT_HOTEL"}, {idempotencyKey: "reservation-smoke-future-hold"});
  const futureBooking = await server.confirmBooking(futureHold.booking.id, "reservation-smoke-future-confirm", {userId: registered.user.id});
  assert.equal(futureBooking.status, "CONFIRMED");

  await assert.rejects(() => server.markHotelReservationNoShow(registered.user.id, hotel.id, futureBooking.id, "reservation-smoke-too-early"), (error: unknown) => error instanceof server.ApplicationError && error.code === "NO_SHOW_TOO_EARLY");

  const modifiedArrival = utcDay(4);
  const modifiedDeparture = utcDay(6);
  const modified = await server.modifyHotelReservation(registered.user.id, hotel.id, futureBooking.id, {roomTypeId: roomB.id, ratePlanId: rateB.id, arrival: modifiedArrival, departure: modifiedDeparture, adults: 2, children: 0}, "reservation-smoke-modify");
  assert.equal(modified.status, "MODIFIED");
  assert.equal(modified.revision, 2);
  assert.equal(modified.roomType.id, roomB.id);
  assert.equal(modified.arrival, modifiedArrival);

  const preview = await server.previewHotelReservationCancellation(registered.user.id, hotel.id, futureBooking.id);
  assert.equal(preview.policy.name, "Flexible 1 day");
  assert.equal(preview.penaltyAmount, 0);
  assert.ok(preview.refundableAmount > 0);

  const cancelled = await server.cancelHotelReservation(registered.user.id, hotel.id, futureBooking.id, "reservation-smoke-cancel");
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.cancellation.penaltyAmount, 0);

  const noShow = await server.markHotelReservationNoShow(registered.user.id, hotel.id, noShowBooking.id, "reservation-smoke-no-show");
  assert.equal(noShow.status, "NO_SHOW");
  assert.equal(noShow.cancellation.penaltyAmount, noShow.amounts.total);
  assert.equal(noShow.cancellation.refundableAmount, 0);

  const noShowList = await server.listHotelReservationCenter(registered.user.id, hotel.id, {date: today, scope: "NO_SHOW", q: ""});
  assert.equal(noShowList.reservations.length, 1);
  assert.equal(noShowList.reservations[0]?.reference, noShow.reference);
  const cancelledList = await server.listHotelReservationCenter(registered.user.id, hotel.id, {date: modifiedArrival, scope: "CANCELLED", q: ""});
  assert.equal(cancelledList.reservations.length, 1);
  assert.equal(cancelledList.reservations[0]?.reference, cancelled.reference);
  const searchList = await server.listHotelReservationCenter(registered.user.id, hotel.id, {date: modifiedArrival, scope: "CANCELLED", q: cancelled.reference.slice(-6)});
  assert.equal(searchList.reservations.length, 1);

  const detail = await server.getHotelReservationDetail(registered.user.id, hotel.id, noShow.id);
  assert.equal(detail.status, "NO_SHOW");
  assert.equal(detail.canMarkNoShow, false);

  const [todayInventory, modifiedInventory, audits] = await Promise.all([
    database().inventoryDay.findUnique({where: {roomTypeId_date: {roomTypeId: roomA.id, date: new Date(`${today}T00:00:00.000Z`)}}}),
    database().inventoryDay.findUnique({where: {roomTypeId_date: {roomTypeId: roomB.id, date: new Date(`${modifiedArrival}T00:00:00.000Z`)}}}),
    database().auditLog.findMany({where: {hotelId: hotel.id, actorUserId: registered.user.id, action: {in: ["BOOKING_MODIFIED_BY_HOTEL", "BOOKING_CANCELLED_BY_HOTEL", "BOOKING_MARKED_NO_SHOW"]}}}),
  ]);
  assert.equal(todayInventory?.available, 5);
  assert.equal(modifiedInventory?.available, 3);
  assert.equal(audits.length, 3);

  console.log("[reservation-management-smoke] modify, cancellation, no-show, inventory, search and audit checks passed");
} finally {
  if (hotelId) await database().hotel.deleteMany({where: {id: hotelId}});
  await database().user.deleteMany({where: {email}});
  await database().$disconnect();
}

function utcDay(offset: number) { const now = new Date(); const value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)); return value.toISOString().slice(0, 10); }
function roomInput(name: string, code: string, quantity: number) { return {name, code, description: `${name} configured for the reservation-management integration smoke flow with complete occupancy and room details.`, unitType: "ROOM" as const, quantity, maxGuests: 3, maxAdults: 2, maxChildren: 1, maxInfants: 1, bedroomCount: 1, livingRoomCount: 0, bathroomCount: 1, privateBathroom: true, sizeValue: 35, sizeUnit: "SQM" as const, smokingPolicy: "NON_SMOKING" as const, extraBedCount: 0, cribCount: 1, allowsCribAndExtraBed: false, active: true, beds: [{area: "Bedroom 1", type: code === "TWIN" ? "SINGLE" as const : "KING" as const, quantity: code === "TWIN" ? 2 : 1, sortOrder: 0}], amenities: [{code: "AIR_CONDITIONING", name: "Air conditioning", category: "Comfort"}, {code: "WIFI", name: "Wi-Fi", category: "Connectivity"}, {code: "PRIVATE_BATHROOM", name: "Private bathroom", category: "Bathroom"}]}; }
