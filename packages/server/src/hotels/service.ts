import { randomBytes } from "node:crypto";
import type { CreateHotelRequest, CreateRatePlanRequest, CreateRoomTypeRequest, UpdateCancellationPolicyInput, UpdateRoomTypeRequest, UpsertCalendarRequest } from "@platform/contracts";
import { database } from "@platform/database";
import { syncHotelDestinationLinks } from "../discovery/destinations";
import type { Prisma } from "@platform/database";
import { badRequest, notFound } from "../errors";
import { requireHotelPermission } from "./authorization";
import { recordPublishMutation } from "./publishing-revision";

function slugPart(value: string): string {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9\s-]/g, "").trim().toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 70) || "hotel";
}

export async function createHotel(ownerUserId: string, input: CreateHotelRequest) {
  const slug = `${slugPart(input.name)}-${randomBytes(3).toString("hex")}`;
  const db = database();
  const hotel = await db.$transaction(async (tx) => {
    const hotel = await tx.hotel.create({data: {name: input.name.trim(), slug, city: input.city.trim(), countryCode: input.countryCode, address: input.address.trim(), timezone: input.timezone, currency: input.currency, memberships: {create: {userId: ownerUserId, role: "OWNER"}}}});
    await tx.user.updateMany({where: {id: ownerUserId, platformRole: "GUEST"}, data: {platformRole: "HOTEL_USER"}});
    await tx.auditLog.create({data: {hotelId: hotel.id, actorUserId: ownerUserId, action: "HOTEL_CREATED", entityType: "Hotel", entityId: hotel.id, after: {status: hotel.status, publishRevision: hotel.publishRevision}}});
    return hotel;
  });
  await syncHotelDestinationLinks(hotel.id);
  return hotel;
}

export async function createRoomType(actorUserId: string, hotelId: string, input: CreateRoomTypeRequest) {
  await requireHotelPermission(actorUserId, hotelId, "rooms:manage");
  return database().$transaction(async (tx) => {
    const roomType = await tx.roomType.create({data: {
      hotelId,
      ...roomProductData(input),
      beds: {create: input.beds},
      amenities: {create: input.amenities},
    }});
    await recordPublishMutation(tx, hotelId, actorUserId, "room type created");
    const product = await tx.roomType.findUnique({where: {id: roomType.id}, select: roomProductSelect});
    if (!product) notFound("Room type");
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "ROOM_TYPE_CREATED", entityType: "RoomType", entityId: roomType.id, after: roomProductAuditValue(product)}});
    return serializeRoomProduct(product);
  });
}

export async function listRoomTypesForManagement(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  const hotel = await database().hotel.findUnique({where: {id: hotelId}, select: {id: true, name: true, city: true, status: true, roomTypes: {select: roomProductSelect, orderBy: {createdAt: "asc"}}}});
  if (!hotel) notFound("Hotel");
  return {...hotel, roomTypes: hotel.roomTypes.map(serializeRoomProduct)};
}

export async function getRoomTypeForManagement(actorUserId: string, hotelId: string, roomTypeId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  const roomType = await database().roomType.findFirst({where: {id: roomTypeId, hotelId}, select: roomProductSelect});
  if (!roomType) notFound("Room type");
  return serializeRoomProduct(roomType);
}

export async function updateRoomType(actorUserId: string, hotelId: string, roomTypeId: string, input: UpdateRoomTypeRequest) {
  await requireHotelPermission(actorUserId, hotelId, "rooms:manage");
  return database().$transaction(async (tx) => {
    const before = await tx.roomType.findFirst({where: {id: roomTypeId, hotelId}, select: roomProductSelect});
    if (!before) notFound("Room type");
    await tx.roomType.update({where: {id: roomTypeId}, data: roomProductData(input)});
    await tx.roomBed.deleteMany({where: {roomTypeId}});
    await tx.roomAmenity.deleteMany({where: {roomTypeId}});
    if (input.beds.length) await tx.roomBed.createMany({data: input.beds.map((bed) => ({roomTypeId, ...bed}))});
    if (input.amenities.length) await tx.roomAmenity.createMany({data: input.amenities.map((amenity) => ({roomTypeId, ...amenity}))});
    await recordPublishMutation(tx, hotelId, actorUserId, "room product updated");
    const after = await tx.roomType.findUnique({where: {id: roomTypeId}, select: roomProductSelect});
    if (!after) notFound("Room type");
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "ROOM_TYPE_UPDATED", entityType: "RoomType", entityId: roomTypeId, before: roomProductAuditValue(before), after: roomProductAuditValue(after)}});
    return serializeRoomProduct(after);
  });
}

export async function createRatePlan(actorUserId: string, hotelId: string, input: CreateRatePlanRequest) {
  await requireHotelPermission(actorUserId, hotelId, "rates:manage");
  const roomType = await database().roomType.findFirst({where: {id: input.roomTypeId, hotelId}, select: {id: true}});
  if (!roomType) notFound("Room type");
  return database().$transaction(async (tx) => {
    const policy = defaultCancellationPolicy(input.refundable);
    const ratePlan = await tx.ratePlan.create({data: {
      roomTypeId: input.roomTypeId,
      name: input.name,
      code: input.code,
      refundable: input.refundable,
      mealPlan: input.mealPlan,
      allowPayNow: input.allowPayNow,
      allowPayAtHotel: input.allowPayAtHotel,
      cancellationPolicy: {create: {name: policy.name, noShowPenaltyType: policy.noShowPenaltyType, noShowPenaltyValue: policy.noShowPenaltyValue, rules: {create: policy.rules}}},
    }, include: {cancellationPolicy: {include: {rules: true}}}});
    await recordPublishMutation(tx, hotelId, actorUserId, "rate plan created");
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "RATE_PLAN_CREATED", entityType: "RatePlan", entityId: ratePlan.id, after: {name: ratePlan.name, code: ratePlan.code, allowPayNow: ratePlan.allowPayNow, allowPayAtHotel: ratePlan.allowPayAtHotel}}});
    return ratePlan;
  });
}

export async function updateRatePlanCancellationPolicy(actorUserId: string, hotelId: string, ratePlanId: string, input: UpdateCancellationPolicyInput) {
  await requireHotelPermission(actorUserId, hotelId, "rates:manage");
  const db = database();
  const ratePlan = await db.ratePlan.findFirst({where: {id: ratePlanId, roomType: {hotelId}}, include: {cancellationPolicy: {include: {rules: true}}}});
  if (!ratePlan) notFound("Rate plan");

  return db.$transaction(async (tx) => {
    const before = ratePlan.cancellationPolicy ? policyAuditValue(ratePlan.cancellationPolicy) : {};
    if (ratePlan.cancellationPolicy) {
      await tx.cancellationRule.deleteMany({where: {policyId: ratePlan.cancellationPolicy.id}});
      await tx.cancellationPolicy.update({where: {id: ratePlan.cancellationPolicy.id}, data: {
        name: input.name,
        noShowPenaltyType: input.noShowPenaltyType,
        noShowPenaltyValue: input.noShowPenaltyValue ?? null,
        rules: {create: input.rules.map((rule) => ({minimumDaysBeforeArrival: rule.minimumDaysBeforeArrival, penaltyType: rule.penaltyType, penaltyValue: rule.penaltyValue ?? null}))},
      }});
    } else {
      await tx.cancellationPolicy.create({data: {
        ratePlanId,
        name: input.name,
        noShowPenaltyType: input.noShowPenaltyType,
        noShowPenaltyValue: input.noShowPenaltyValue ?? null,
        rules: {create: input.rules.map((rule) => ({minimumDaysBeforeArrival: rule.minimumDaysBeforeArrival, penaltyType: rule.penaltyType, penaltyValue: rule.penaltyValue ?? null}))},
      }});
    }
    const updated = await tx.cancellationPolicy.findUnique({where: {ratePlanId}, include: {rules: {orderBy: {minimumDaysBeforeArrival: "desc"}}}});
    const after = updated ? policyAuditValue(updated) : {};
    await recordPublishMutation(tx, hotelId, actorUserId, "cancellation policy updated");
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "CANCELLATION_POLICY_UPDATED", entityType: "RatePlan", entityId: ratePlanId, before, after}});
    return updated;
  });
}

export async function upsertCalendar(actorUserId: string, hotelId: string, input: UpsertCalendarRequest) {
  await requireHotelPermission(actorUserId, hotelId, "rates:manage");
  const db = database();
  const hotel = await db.hotel.findUnique({where: {id: hotelId}, select: {overbookingEnabled: true}});
  if (!hotel) notFound("Hotel");
  if (!hotel.overbookingEnabled && input.entries.some((entry) => entry.overbookingLimit > 0)) badRequest("OVERBOOKING_DISABLED", "Enable hotel overbooking before setting an overbooking limit");
  const roomTypeIds = [...new Set(input.entries.map((entry) => entry.roomTypeId))];
  const ratePlanIds = [...new Set(input.entries.map((entry) => entry.ratePlanId))];
  const roomTypes = await db.roomType.findMany({where: {hotelId, id: {in: roomTypeIds}}, select: {id: true}});
  if (roomTypes.length !== roomTypeIds.length) badRequest("INVALID_ROOM_TYPE", "One or more room types do not belong to this hotel");
  const ratePlans = await db.ratePlan.findMany({where: {id: {in: ratePlanIds}, roomType: {hotelId}}, select: {id: true, roomTypeId: true}});
  if (ratePlans.length !== ratePlanIds.length) badRequest("INVALID_RATE_PLAN", "One or more rate plans do not belong to this hotel");
  const ratePlanRoomType = new Map(ratePlans.map((plan) => [plan.id, plan.roomTypeId]));
  if (input.entries.some((entry) => ratePlanRoomType.get(entry.ratePlanId) !== entry.roomTypeId)) badRequest("RATE_PLAN_ROOM_MISMATCH", "Each rate plan must belong to the supplied room type");

  await db.$transaction(async (tx) => {
    for (const entry of input.entries) {
      if (entry.maxStay !== null && entry.maxStay < entry.minStay) badRequest("INVALID_STAY_LIMIT", "maxStay cannot be lower than minStay");
      const date = new Date(`${entry.date}T00:00:00.000Z`);
      await tx.dailyRate.upsert({where: {ratePlanId_date: {ratePlanId: entry.ratePlanId, date}}, create: {ratePlanId: entry.ratePlanId, date, baseRate: entry.baseRate, minStay: entry.minStay, maxStay: entry.maxStay, closed: entry.closed, stopSell: entry.stopSell}, update: {baseRate: entry.baseRate, minStay: entry.minStay, maxStay: entry.maxStay, closed: entry.closed, stopSell: entry.stopSell}});
      await tx.inventoryDay.upsert({where: {roomTypeId_date: {roomTypeId: entry.roomTypeId, date}}, create: {roomTypeId: entry.roomTypeId, date, available: entry.available, overbookingLimit: entry.overbookingLimit}, update: {available: entry.available, overbookingLimit: entry.overbookingLimit}});
    }
    await recordPublishMutation(tx, hotelId, actorUserId, "calendar rates or inventory updated");
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "CALENDAR_UPSERTED", entityType: "Calendar", after: {entries: input.entries.length}}});
  });
  return {updated: input.entries.length};
}

export async function getHotelWorkspace(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  const hotel = await database().hotel.findUnique({where: {id: hotelId}, include: {roomTypes: {orderBy: {createdAt: "asc"}, include: {beds: {orderBy: {sortOrder: "asc"}}, amenities: {orderBy: [{category: "asc"}, {name: "asc"}]}, photos: {where: {mediaObject: {state: "READY"}}, include: {mediaObject: {select: {publicUrl: true}}}, orderBy: {sortOrder: "asc"}}, ratePlans: {include: {cancellationPolicy: {include: {rules: {orderBy: {minimumDaysBeforeArrival: "desc"}}}}}}}}, memberships: {where: {status: "ACTIVE"}, select: {id: true, role: true, user: {select: {id: true, email: true, displayName: true}}}}}});
  if (!hotel) notFound("Hotel");
  return hotel;
}

export async function listUserHotels(userId: string) {
  const user = await database().user.findUnique({where: {id: userId}, select: {hotelMemberships: {where: {status: "ACTIVE"}, select: {role: true, hotel: {select: {id: true, name: true, slug: true, city: true, countryCode: true, status: true, verified: true, publishRevision: true, publishedRevision: true}}}, orderBy: {createdAt: "asc"}}}});
  if (!user) notFound("User");
  return user.hotelMemberships.map((membership) => ({...membership.hotel, role: membership.role}));
}

export async function updateHotelPricingPolicy(actorUserId: string, hotelId: string, input: {serviceRate: number; taxRate: number}) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:edit");
  return database().$transaction(async (tx) => {
    const before = await tx.hotel.findUnique({where: {id: hotelId}, select: {serviceRate: true, taxRate: true}});
    if (!before) notFound("Hotel");
    const hotel = await tx.hotel.update({where: {id: hotelId}, data: {serviceRate: input.serviceRate, taxRate: input.taxRate}, select: {id: true, serviceRate: true, taxRate: true}});
    await recordPublishMutation(tx, hotelId, actorUserId, "pricing policy updated");
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "PRICING_POLICY_UPDATED", entityType: "Hotel", entityId: hotelId, before: {serviceRate: before.serviceRate.toString(), taxRate: before.taxRate.toString()}, after: {serviceRate: hotel.serviceRate.toString(), taxRate: hotel.taxRate.toString()}}});
    return hotel;
  });
}

export async function getCalendar(actorUserId: string, hotelId: string, from: string, to: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) badRequest("INVALID_DATE_RANGE", "A valid from/to date range is required");
  const [rates, inventory] = await Promise.all([
    database().dailyRate.findMany({where: {date: {gte: fromDate, lte: toDate}, ratePlan: {roomType: {hotelId}}}, include: {ratePlan: {select: {id: true, name: true, code: true, roomTypeId: true}}}, orderBy: [{date: "asc"}, {ratePlanId: "asc"}]}),
    database().inventoryDay.findMany({where: {date: {gte: fromDate, lte: toDate}, roomType: {hotelId}}, orderBy: [{date: "asc"}, {roomTypeId: "asc"}]}),
  ]);
  return {rates, inventory};
}

function defaultCancellationPolicy(refundable: boolean) {
  if (!refundable) return {name: "Non-refundable", noShowPenaltyType: "FULL_STAY" as const, noShowPenaltyValue: null, rules: [{minimumDaysBeforeArrival: 0, penaltyType: "FULL_STAY" as const, penaltyValue: null}]};
  return {name: "Flexible 1 day", noShowPenaltyType: "FULL_STAY" as const, noShowPenaltyValue: null, rules: [
    {minimumDaysBeforeArrival: 1, penaltyType: "NONE" as const, penaltyValue: null},
    {minimumDaysBeforeArrival: 0, penaltyType: "FIRST_NIGHT" as const, penaltyValue: null},
  ]};
}

function policyAuditValue(policy: {name: string; noShowPenaltyType: string; noShowPenaltyValue: unknown; rules: Array<{minimumDaysBeforeArrival: number; penaltyType: string; penaltyValue: unknown}>}) {
  return {name: policy.name, noShowPenaltyType: policy.noShowPenaltyType, noShowPenaltyValue: policy.noShowPenaltyValue === null ? null : String(policy.noShowPenaltyValue), rules: policy.rules.map((rule) => ({minimumDaysBeforeArrival: rule.minimumDaysBeforeArrival, penaltyType: rule.penaltyType, penaltyValue: rule.penaltyValue === null ? null : String(rule.penaltyValue)}))};
}

const roomProductSelect = {
  id: true,
  hotelId: true,
  name: true,
  code: true,
  description: true,
  unitType: true,
  quantity: true,
  maxGuests: true,
  maxAdults: true,
  maxChildren: true,
  maxInfants: true,
  bedroomCount: true,
  livingRoomCount: true,
  bathroomCount: true,
  privateBathroom: true,
  sizeValue: true,
  sizeUnit: true,
  smokingPolicy: true,
  extraBedCount: true,
  cribCount: true,
  allowsCribAndExtraBed: true,
  active: true,
  beds: {select: {id: true, area: true, type: true, quantity: true, sortOrder: true}, orderBy: {sortOrder: "asc" as const}},
  amenities: {select: {id: true, code: true, name: true, category: true}, orderBy: [{category: "asc" as const}, {name: "asc" as const}]},
  photos: {where: {mediaObject: {state: "READY" as const}}, select: {id: true, alt: true, sortOrder: true, mediaObject: {select: {publicUrl: true}}}, orderBy: {sortOrder: "asc" as const}},
  ratePlans: {select: {id: true, name: true, code: true, active: true}},
  _count: {select: {bookings: true, inventory: true}},
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RoomTypeSelect;

type RoomProduct = Prisma.RoomTypeGetPayload<{select: typeof roomProductSelect}>;

function roomProductData(input: CreateRoomTypeRequest | UpdateRoomTypeRequest) {
  return {
    name: input.name,
    code: input.code,
    description: input.description,
    unitType: input.unitType,
    quantity: input.quantity,
    maxGuests: input.maxGuests,
    maxAdults: input.maxAdults,
    maxChildren: input.maxChildren,
    maxInfants: input.maxInfants,
    bedroomCount: input.bedroomCount,
    livingRoomCount: input.livingRoomCount,
    bathroomCount: input.bathroomCount,
    privateBathroom: input.privateBathroom,
    sizeValue: input.sizeValue,
    sizeUnit: input.sizeUnit,
    smokingPolicy: input.smokingPolicy,
    extraBedCount: input.extraBedCount,
    cribCount: input.cribCount,
    allowsCribAndExtraBed: input.allowsCribAndExtraBed,
    active: input.active,
  };
}

function serializeRoomProduct(room: RoomProduct) {
  return {
    ...room,
    sizeValue: room.sizeValue === null ? null : Number(room.sizeValue),
    photos: room.photos.flatMap((photo) => photo.mediaObject.publicUrl ? [{id: photo.id, url: photo.mediaObject.publicUrl, alt: photo.alt, sortOrder: photo.sortOrder}] : []),
  };
}

function roomProductAuditValue(room: RoomProduct) {
  const serialized = serializeRoomProduct(room);
  return {
    name: serialized.name,
    code: serialized.code,
    description: serialized.description,
    unitType: serialized.unitType,
    quantity: serialized.quantity,
    maxGuests: serialized.maxGuests,
    maxAdults: serialized.maxAdults,
    maxChildren: serialized.maxChildren,
    maxInfants: serialized.maxInfants,
    bedroomCount: serialized.bedroomCount,
    livingRoomCount: serialized.livingRoomCount,
    bathroomCount: serialized.bathroomCount,
    privateBathroom: serialized.privateBathroom,
    sizeValue: serialized.sizeValue,
    sizeUnit: serialized.sizeUnit,
    smokingPolicy: serialized.smokingPolicy,
    extraBedCount: serialized.extraBedCount,
    cribCount: serialized.cribCount,
    allowsCribAndExtraBed: serialized.allowsCribAndExtraBed,
    active: serialized.active,
    beds: serialized.beds.map(({area, type, quantity, sortOrder}) => ({area, type, quantity, sortOrder})),
    amenities: serialized.amenities.map(({code, name, category}) => ({code, name, category})),
  };
}
