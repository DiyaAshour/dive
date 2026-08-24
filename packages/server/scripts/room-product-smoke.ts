import assert from "node:assert/strict";
import dotenv from "dotenv";
import {createRoomTypeRequestSchema, updateRoomTypeRequestSchema} from "@platform/contracts";

dotenv.config({path: new URL("../../../.env", import.meta.url)});

const email = "phase21-room-partner@handmekey.invalid";
const password = "Phase21-Room-Partner-Pass!";

const [{database}, server] = await Promise.all([
  import("@platform/database"),
  import("../src/index"),
]);

let hotelId: string | null = null;

try {
  const previous = await database().user.findUnique({where: {email}, select: {hotelMemberships: {select: {hotelId: true}}}});
  if (previous?.hotelMemberships.length) await database().hotel.deleteMany({where: {id: {in: previous.hotelMemberships.map((membership) => membership.hotelId)}}});
  await database().user.deleteMany({where: {email}});

  const registered = await server.registerUser({email, password, displayName: "Phase 21 Room Partner"});
  const hotel = await server.createHotel(registered.user.id, {
    name: "Phase 21 Room Product Hotel",
    city: "Amman",
    countryCode: "JO",
    address: "Room product smoke test address, Amman",
    timezone: "Asia/Amman",
    currency: "JOD",
  });
  hotelId = hotel.id;

  const createdInput = createRoomTypeRequestSchema.parse({
    name: "One-Bedroom Residence",
    code: "ONE-BED",
    description: "A complete one-bedroom residence created to verify structured occupancy, sleeping areas and room facilities.",
    unitType: "APARTMENT",
    quantity: 3,
    maxGuests: 3,
    maxAdults: 2,
    maxChildren: 1,
    maxInfants: 1,
    bedroomCount: 1,
    livingRoomCount: 1,
    bathroomCount: 1,
    privateBathroom: true,
    sizeValue: 55,
    sizeUnit: "SQM",
    smokingPolicy: "NON_SMOKING",
    extraBedCount: 0,
    cribCount: 1,
    allowsCribAndExtraBed: false,
    active: true,
    beds: [{area: "Bedroom 1", type: "EXTRA_LARGE_DOUBLE", quantity: 1, sortOrder: 0}],
    amenities: [
      {code: "AIR_CONDITIONING", name: "Air conditioning", category: "Comfort"},
      {code: "PRIVATE_BATHROOM", name: "Private bathroom", category: "Bathroom"},
      {code: "FLAT_SCREEN_TV", name: "Flat-screen TV", category: "Media"},
    ],
  });
  const created = await server.createRoomType(registered.user.id, hotel.id, createdInput);
  assert.equal(created.maxGuests, 3);
  assert.equal(created.beds[0]?.type, "EXTRA_LARGE_DOUBLE");

  const updatedInput = updateRoomTypeRequestSchema.parse({
    ...createdInput,
    name: "Two-Bedroom King Residence",
    code: "TWO-BED",
    quantity: 4,
    maxGuests: 4,
    maxAdults: 4,
    maxChildren: 0,
    bedroomCount: 2,
    sizeValue: 100,
    beds: [
      {area: "Bedroom 1", type: "KING", quantity: 1, sortOrder: 0},
      {area: "Bedroom 2", type: "KING", quantity: 1, sortOrder: 1},
    ],
    amenities: [
      ...createdInput.amenities,
      {code: "BALCONY", name: "Balcony", category: "Outdoor"},
      {code: "CITY_VIEW", name: "City view", category: "View"},
    ],
  });
  const updated = await server.updateRoomType(registered.user.id, hotel.id, created.id, updatedInput);
  assert.equal(updated.name, "Two-Bedroom King Residence");
  assert.equal(updated.beds.length, 2);
  assert.deepEqual(updated.beds.map((bed: {area: string}) => bed.area), ["Bedroom 1", "Bedroom 2"]);
  assert.equal(updated.amenities.length, 5);

  const catalog = await server.listRoomTypesForManagement(registered.user.id, hotel.id);
  assert.equal(catalog.roomTypes.length, 1);
  assert.equal(catalog.roomTypes[0]?.sizeValue, 100);
  assert.ok(await database().auditLog.findFirst({where: {hotelId: hotel.id, actorUserId: registered.user.id, action: "ROOM_TYPE_UPDATED", entityId: created.id}}));

  const now = new Date();
  const arrival = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2));
  const departure = new Date(arrival);
  departure.setUTCDate(departure.getUTCDate() + 1);
  const arrivalDate = arrival.toISOString().slice(0, 10);
  const departureDate = departure.toISOString().slice(0, 10);
  const ratePlan = await server.createRatePlan(registered.user.id, hotel.id, {
    roomTypeId: created.id,
    name: "Flexible room smoke rate",
    code: "FLEX",
    refundable: true,
    mealPlan: "ROOM_ONLY",
    allowPayNow: true,
    allowPayAtHotel: true,
  });
  await server.upsertCalendar(registered.user.id, hotel.id, {entries: [{date: arrivalDate, roomTypeId: created.id, ratePlanId: ratePlan.id, baseRate: 125, available: 4, overbookingLimit: 0, minStay: 1, maxStay: null, closed: false, stopSell: false}]});

  const media = await database().mediaObject.create({data: {
    hotelId: hotel.id,
    uploadedByUserId: registered.user.id,
    kind: "HOTEL_IMAGE",
    state: "READY",
    visibility: "PUBLIC",
    objectKey: `smoke/${hotel.id}/two-bedroom.jpg`,
    originalFileName: "two-bedroom.jpg",
    contentType: "image/jpeg",
    expectedSizeBytes: 100,
    publicUrl: "https://example.invalid/two-bedroom.jpg",
    uploadExpiresAt: new Date(Date.now() + 86_400_000),
    uploadedAt: new Date(),
  }});
  await database().hotelPhoto.create({data: {hotelId: hotel.id, roomTypeId: created.id, mediaObjectId: media.id, alt: "Two-bedroom room smoke image", sortOrder: 0}});
  await database().hotel.update({where: {id: hotel.id}, data: {status: "ACTIVE", verified: true}});

  const publicHotel = await server.getPublicHotelDetails(hotel.id, {arrival: arrivalDate, departure: departureDate, adults: 4, children: 0}, {trackView: false});
  assert.equal(publicHotel.offers.length, 1);
  const offer = publicHotel.offers[0];
  assert.equal(offer?.maxGuests, 4);
  assert.equal(offer?.beds.length, 2);
  assert.equal(offer?.roomAmenities.length, 5);
  assert.equal(offer?.roomPhotos[0]?.url, "https://example.invalid/two-bedroom.jpg");

  const quote = await server.quoteBooking({hotelId: hotel.id, roomTypeId: created.id, ratePlanId: ratePlan.id, arrival: arrivalDate, departure: departureDate, adults: 4, children: 0});
  assert.deepEqual(quote.occupancy, {adults: 4, children: 0});
  await assert.rejects(
    () => server.quoteBooking({hotelId: hotel.id, roomTypeId: created.id, ratePlanId: ratePlan.id, arrival: arrivalDate, departure: departureDate, adults: 5, children: 0}),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "ROOM_CAPACITY_EXCEEDED",
  );
  await assert.rejects(
    () => server.createBookingHold({hotelId: hotel.id, roomTypeId: created.id, ratePlanId: ratePlan.id, arrival: arrivalDate, departure: departureDate, adults: 5, children: 0, guestName: "Capacity Smoke Guest", guestEmail: email, paymentMode: "PAY_AT_HOTEL"}, {userId: registered.user.id, idempotencyKey: "phase21-over-capacity-hold"}),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "ROOM_CAPACITY_EXCEEDED",
  );

  console.log("[room-product-smoke] create, edit, audit, calendar, capacity and guest-card projection checks passed");
} finally {
  if (hotelId) await database().hotel.deleteMany({where: {id: hotelId}});
  await database().user.deleteMany({where: {email}});
  await database().$disconnect();
}
