import assert from "node:assert/strict";
import dotenv from "dotenv";
import {bulkCalendarUpdateRequestSchema, createRoomTypeRequestSchema} from "@platform/contracts";

dotenv.config({path: new URL("../../../.env", import.meta.url)});

const email = "rate-management-smoke@handmekey.invalid";
const password = "Rate-Management-Smoke-Pass!";
const [{database}, server] = await Promise.all([import("@platform/database"), import("../src/index")]);
let hotelId: string | null = null;

try {
  const previous = await database().user.findUnique({where: {email}, select: {hotelMemberships: {select: {hotelId: true}}}});
  if (previous?.hotelMemberships.length) await database().hotel.deleteMany({where: {id: {in: previous.hotelMemberships.map((membership) => membership.hotelId)}}});
  await database().user.deleteMany({where: {email}});

  const registered = await server.registerUser({email, password, displayName: "Rate Management Smoke"});
  const hotel = await server.createHotel(registered.user.id, {
    name: "Rate Management Smoke Hotel",
    city: "Amman",
    countryCode: "JO",
    address: "Rate management smoke test address, Amman",
    timezone: "Asia/Amman",
    currency: "JOD",
  });
  hotelId = hotel.id;

  const room = await server.createRoomType(registered.user.id, hotel.id, createRoomTypeRequestSchema.parse({
    name: "King Room",
    code: "KING",
    description: "A complete room product used to verify bulk rate, inventory and restriction management behavior.",
    unitType: "ROOM",
    quantity: 5,
    maxGuests: 2,
    maxAdults: 2,
    maxChildren: 0,
    maxInfants: 0,
    bedroomCount: 1,
    livingRoomCount: 0,
    bathroomCount: 1,
    privateBathroom: true,
    sizeValue: 32,
    sizeUnit: "SQM",
    smokingPolicy: "NON_SMOKING",
    extraBedCount: 0,
    cribCount: 0,
    allowsCribAndExtraBed: false,
    active: true,
    beds: [{area: "Bedroom", type: "KING", quantity: 1, sortOrder: 0}],
    amenities: [],
  }));
  const ratePlan = await server.createRatePlan(registered.user.id, hotel.id, {
    roomTypeId: room.id,
    name: "Flexible",
    code: "FLEX",
    refundable: true,
    mealPlan: "ROOM_ONLY",
    allowPayNow: true,
    allowPayAtHotel: true,
  });

  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 10);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);

  const first = bulkCalendarUpdateRequestSchema.parse({
    roomTypeId: room.id,
    ratePlanId: ratePlan.id,
    from,
    to,
    rate: {mode: "SET", value: 100},
    available: 5,
    minStay: 1,
    closed: false,
    stopSell: false,
  });
  const firstResult = await server.bulkUpdateRateCalendar(registered.user.id, hotel.id, first);
  assert.equal(firstResult.updatedDays, 7);

  const calendar = await server.getCalendar(registered.user.id, hotel.id, from, to);
  assert.equal(calendar.rates.length, 7);
  assert.equal(calendar.inventory.length, 7);
  assert.ok(calendar.rates.every((rate: {baseRate: unknown}) => Number(rate.baseRate) === 100));
  assert.ok(calendar.inventory.every((day: {available: number}) => day.available === 5));

  await server.bulkUpdateRateCalendar(registered.user.id, hotel.id, bulkCalendarUpdateRequestSchema.parse({
    roomTypeId: room.id,
    ratePlanId: ratePlan.id,
    from,
    to,
    rate: {mode: "PERCENT", value: 10},
  }));
  const repriced = await server.getCalendar(registered.user.id, hotel.id, from, to);
  assert.ok(repriced.rates.every((rate: {baseRate: unknown}) => Number(rate.baseRate) === 110));

  await server.bulkUpdateRateCalendar(registered.user.id, hotel.id, bulkCalendarUpdateRequestSchema.parse({
    roomTypeId: room.id,
    ratePlanId: ratePlan.id,
    from,
    to: from,
    minStay: 2,
    maxStay: 5,
    stopSell: true,
  }));
  const restricted = await server.getCalendar(registered.user.id, hotel.id, from, from);
  assert.equal(restricted.rates[0]?.minStay, 2);
  assert.equal(restricted.rates[0]?.maxStay, 5);
  assert.equal(restricted.rates[0]?.stopSell, true);

  await assert.rejects(
    () => server.bulkUpdateRateCalendar(registered.user.id, hotel.id, bulkCalendarUpdateRequestSchema.parse({roomTypeId: room.id, ratePlanId: ratePlan.id, from, to: from, available: 6})),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "INVENTORY_EXCEEDS_ROOM_QUANTITY",
  );
  await assert.rejects(
    () => server.bulkUpdateRateCalendar(registered.user.id, hotel.id, bulkCalendarUpdateRequestSchema.parse({roomTypeId: room.id, ratePlanId: ratePlan.id, from, to: from, overbookingLimit: 1})),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "OVERBOOKING_DISABLED",
  );

  const audit = await database().auditLog.findFirst({where: {hotelId: hotel.id, actorUserId: registered.user.id, action: "RATE_CALENDAR_BULK_UPDATED", entityId: ratePlan.id}});
  assert.ok(audit);
  console.log("[rate-management-smoke] bulk pricing, inventory, restrictions, safeguards and audit checks passed");
} finally {
  if (hotelId) await database().hotel.deleteMany({where: {id: hotelId}});
  await database().user.deleteMany({where: {email}});
  await database().$disconnect();
}
