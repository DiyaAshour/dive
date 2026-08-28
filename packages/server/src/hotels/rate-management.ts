import type {BulkCalendarUpdateRequest, RateAdjustment} from "@platform/contracts";
import {database} from "@platform/database";
import {badRequest, notFound} from "../errors";
import {requireHotelPermission} from "./authorization";
import {recordPublishMutation} from "./publishing-revision";

const DAY_MS = 86_400_000;
const MAX_BULK_DAYS = 366;

export async function getRateManagementWorkspace(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  const hotel = await database().hotel.findUnique({
    where: {id: hotelId},
    select: {
      id: true,
      name: true,
      city: true,
      status: true,
      currency: true,
      overbookingEnabled: true,
      roomTypes: {
        orderBy: [{active: "desc"}, {createdAt: "asc"}],
        select: {
          id: true,
          name: true,
          code: true,
          quantity: true,
          active: true,
          ratePlans: {
            orderBy: [{active: "desc"}, {createdAt: "asc"}],
            select: {id: true, name: true, code: true, active: true, refundable: true, mealPlan: true},
          },
        },
      },
    },
  });
  if (!hotel) notFound("Hotel");
  return hotel;
}

export async function bulkUpdateRateCalendar(actorUserId: string, hotelId: string, input: BulkCalendarUpdateRequest) {
  await requireHotelPermission(actorUserId, hotelId, "rates:manage");
  const db = database();
  const fromDate = parseDateOnly(input.from);
  const toDate = parseDateOnly(input.to);
  if (fromDate > toDate) badRequest("INVALID_DATE_RANGE", "The start date must be on or before the end date");
  const rangeDays = Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1;
  if (rangeDays > MAX_BULK_DAYS) badRequest("DATE_RANGE_TOO_LARGE", `A bulk rate update can cover at most ${MAX_BULK_DAYS} days`);

  const weekdays = new Set(input.weekdays);
  const dates: Date[] = [];
  for (let cursor = new Date(fromDate); cursor <= toDate; cursor = new Date(cursor.getTime() + DAY_MS)) {
    if (weekdays.has(cursor.getUTCDay())) dates.push(cursor);
  }
  if (!dates.length) badRequest("NO_DATES_SELECTED", "The selected weekdays do not occur inside this date range");

  const [hotel, roomType, ratePlan] = await Promise.all([
    db.hotel.findUnique({where: {id: hotelId}, select: {id: true, overbookingEnabled: true}}),
    db.roomType.findFirst({where: {id: input.roomTypeId, hotelId}, select: {id: true, quantity: true}}),
    db.ratePlan.findFirst({where: {id: input.ratePlanId, roomTypeId: input.roomTypeId, roomType: {hotelId}}, select: {id: true}}),
  ]);
  if (!hotel) notFound("Hotel");
  if (!roomType) badRequest("INVALID_ROOM_TYPE", "The room type does not belong to this hotel");
  if (!ratePlan) badRequest("RATE_PLAN_ROOM_MISMATCH", "The rate plan does not belong to the selected room type");
  if (!hotel.overbookingEnabled && input.overbookingLimit !== undefined && input.overbookingLimit > 0) {
    badRequest("OVERBOOKING_DISABLED", "Enable controlled overbooking for the hotel before setting an overbooking limit");
  }
  if (input.available !== undefined && input.available > roomType.quantity) {
    badRequest("INVENTORY_EXCEEDS_ROOM_QUANTITY", `Availability cannot exceed the room type quantity of ${roomType.quantity}`);
  }

  const touchesRate = input.rate !== undefined || input.minStay !== undefined || input.maxStay !== undefined || input.minAdvanceBookingDays !== undefined || input.maxAdvanceBookingDays !== undefined || input.closedToArrival !== undefined || input.closedToDeparture !== undefined || input.closed !== undefined || input.stopSell !== undefined;
  const touchesInventory = input.available !== undefined || input.overbookingLimit !== undefined;
  const [existingRates, existingInventory] = await Promise.all([
    touchesRate ? db.dailyRate.findMany({where: {ratePlanId: input.ratePlanId, date: {in: dates}}}) : Promise.resolve([]),
    touchesInventory ? db.inventoryDay.findMany({where: {roomTypeId: input.roomTypeId, date: {in: dates}}}) : Promise.resolve([]),
  ]);
  const rateByDate = new Map(existingRates.map((rate) => [dateKey(rate.date), rate]));
  const inventoryByDate = new Map(existingInventory.map((inventory) => [dateKey(inventory.date), inventory]));

  if (touchesRate) {
    const missingRateDate = dates.find((date) => !rateByDate.has(dateKey(date)) && input.rate?.mode !== "SET");
    if (missingRateDate) {
      badRequest("MISSING_BASE_RATE", `Set a base rate first for ${dateKey(missingRateDate)} before applying relative pricing or restrictions`);
    }
  }

  await db.$transaction(async (tx) => {
    for (const date of dates) {
      const key = dateKey(date);
      if (touchesRate) {
        const current = rateByDate.get(key);
        const baseRate = input.rate ? adjustedRate(current ? Number(current.baseRate) : null, input.rate, key) : Number(current!.baseRate);
        const minStay = input.minStay ?? current?.minStay ?? 1;
        const maxStay = input.maxStay !== undefined ? input.maxStay : current?.maxStay ?? null;
        const minAdvanceBookingDays = input.minAdvanceBookingDays ?? current?.minAdvanceBookingDays ?? 0;
        const maxAdvanceBookingDays = input.maxAdvanceBookingDays !== undefined ? input.maxAdvanceBookingDays : current?.maxAdvanceBookingDays ?? null;
        if (maxStay !== null && maxStay < minStay) badRequest("INVALID_STAY_LIMIT", `maxStay cannot be lower than minStay on ${key}`);
        if (maxAdvanceBookingDays !== null && maxAdvanceBookingDays < minAdvanceBookingDays) badRequest("INVALID_ADVANCE_BOOKING_WINDOW", `maxAdvanceBookingDays cannot be lower than minAdvanceBookingDays on ${key}`);
        await tx.dailyRate.upsert({
          where: {ratePlanId_date: {ratePlanId: input.ratePlanId, date}},
          create: {
            ratePlanId: input.ratePlanId,
            date,
            baseRate,
            minStay,
            maxStay,
            minAdvanceBookingDays,
            maxAdvanceBookingDays,
            closedToArrival: input.closedToArrival ?? false,
            closedToDeparture: input.closedToDeparture ?? false,
            closed: input.closed ?? false,
            stopSell: input.stopSell ?? false,
          },
          update: {
            baseRate,
            minStay,
            maxStay,
            minAdvanceBookingDays,
            maxAdvanceBookingDays,
            closedToArrival: input.closedToArrival ?? current?.closedToArrival ?? false,
            closedToDeparture: input.closedToDeparture ?? current?.closedToDeparture ?? false,
            closed: input.closed ?? current?.closed ?? false,
            stopSell: input.stopSell ?? current?.stopSell ?? false,
          },
        });
      }

      if (touchesInventory) {
        const current = inventoryByDate.get(key);
        const available = input.available ?? current?.available ?? roomType.quantity;
        const overbookingLimit = input.overbookingLimit ?? current?.overbookingLimit ?? 0;
        if (!hotel.overbookingEnabled && overbookingLimit > 0) badRequest("OVERBOOKING_DISABLED", `Overbooking is disabled for ${key}`);
        if (available > roomType.quantity) badRequest("INVENTORY_EXCEEDS_ROOM_QUANTITY", `Availability cannot exceed ${roomType.quantity} on ${key}`);
        await tx.inventoryDay.upsert({
          where: {roomTypeId_date: {roomTypeId: input.roomTypeId, date}},
          create: {roomTypeId: input.roomTypeId, date, available, overbookingLimit},
          update: {available, overbookingLimit},
        });
      }
    }

    await recordPublishMutation(tx, hotelId, actorUserId, "rate management calendar updated");
    await tx.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: "RATE_CALENDAR_BULK_UPDATED",
        entityType: "RatePlan",
        entityId: input.ratePlanId,
        after: {
          roomTypeId: input.roomTypeId,
          from: input.from,
          to: input.to,
          weekdays: input.weekdays,
          updatedDays: dates.length,
          changes: {
            rate: input.rate ?? null,
            available: input.available ?? null,
            overbookingLimit: input.overbookingLimit ?? null,
            minStay: input.minStay ?? null,
            maxStay: input.maxStay === undefined ? "UNCHANGED" : input.maxStay,
            minAdvanceBookingDays: input.minAdvanceBookingDays ?? null,
            maxAdvanceBookingDays: input.maxAdvanceBookingDays === undefined ? "UNCHANGED" : input.maxAdvanceBookingDays,
            closedToArrival: input.closedToArrival ?? null,
            closedToDeparture: input.closedToDeparture ?? null,
            closed: input.closed ?? null,
            stopSell: input.stopSell ?? null,
          },
        },
      },
    });
  });

  return {updatedDays: dates.length, from: input.from, to: input.to, roomTypeId: input.roomTypeId, ratePlanId: input.ratePlanId};
}

function parseDateOnly(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || dateKey(parsed) !== value) badRequest("INVALID_DATE_RANGE", `Invalid calendar date: ${value}`);
  return parsed;
}

function adjustedRate(current: number | null, adjustment: RateAdjustment, date: string): number {
  let next: number;
  if (adjustment.mode === "SET") next = adjustment.value;
  else {
    if (current === null) badRequest("MISSING_BASE_RATE", `Set a base rate first for ${date}`);
    next = adjustment.mode === "ADD" ? current + adjustment.value : current * (1 + adjustment.value / 100);
  }
  const rounded = Math.round((next + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(rounded) || rounded < 0 || rounded > 1_000_000) badRequest("INVALID_RATE", `The resulting rate for ${date} is outside the allowed range`);
  return rounded;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
