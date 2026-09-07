import {localDateInTimeZone} from "@platform/core";
import {database} from "@platform/database";
import {notFound} from "../errors";
import {requireHotelPermission} from "../hotels/authorization";
import {listHotelReservationCenter} from "./reservation-management";

const DAY_MS = 86_400_000;

type InventoryRow = Readonly<{
  roomTypeId: string;
  date: Date;
  available: number;
  overbookingLimit: number;
}>;

type InventoryAlert = Readonly<{
  roomTypeId: string;
  roomName: string;
  date: string;
  available: number | null;
  quantity: number;
  kind: "LOW" | "SOLD_OUT" | "MISSING";
}>;

export async function getPartnerTodayDashboard(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  const db = database();
  const hotel = await db.hotel.findUnique({
    where: {id: hotelId},
    select: {
      id: true,
      timezone: true,
      overbookingEnabled: true,
      roomTypes: {
        where: {active: true},
        orderBy: {name: "asc"},
        select: {id: true, name: true, quantity: true},
      },
    },
  });
  if (!hotel) notFound("Hotel");

  const today = localDateInTimeZone(new Date(), hotel.timezone);
  const rangeStart = new Date(`${today}T00:00:00.000Z`);
  const rangeEnd = new Date(rangeStart.getTime() + (6 * DAY_MS));
  const roomIds = hotel.roomTypes.map((room) => room.id);
  const last24Hours = new Date(Date.now() - DAY_MS);
  const inventoryPromise: Promise<InventoryRow[]> = roomIds.length
    ? db.inventoryDay.findMany({
        where: {roomTypeId: {in: roomIds}, date: {gte: rangeStart, lte: rangeEnd}},
        select: {roomTypeId: true, date: true, available: true, overbookingLimit: true},
        orderBy: [{date: "asc"}, {roomTypeId: "asc"}],
      })
    : Promise.resolve([]);

  const [report, unreadMessages, newBookings, inventoryRows] = await Promise.all([
    listHotelReservationCenter(actorUserId, hotelId, {date: today, scope: "ALL", q: ""}),
    db.bookingMessage.count({
      where: {conversation: {hotelId}, senderKind: "GUEST", hotelReadAt: null},
    }),
    db.booking.count({
      where: {hotelId, status: {in: ["CONFIRMED", "MODIFIED"]}, createdAt: {gte: last24Hours}},
    }),
    inventoryPromise,
  ]);

  const roomById = new Map(hotel.roomTypes.map((room) => [room.id, room]));
  const seenToday = new Set<string>();
  const inventoryAlerts: InventoryAlert[] = inventoryRows.flatMap((row): InventoryAlert[] => {
    const room = roomById.get(row.roomTypeId);
    if (!room) return [];
    const date = row.date.toISOString().slice(0, 10);
    if (date === today) seenToday.add(room.id);
    const sellable = row.available + (hotel.overbookingEnabled ? row.overbookingLimit : 0);
    const threshold = Math.max(1, Math.min(3, Math.ceil(room.quantity * 0.2)));
    if (sellable > threshold) return [];
    return [{
      roomTypeId: room.id,
      roomName: room.name,
      date,
      available: sellable,
      quantity: room.quantity,
      kind: sellable <= 0 ? "SOLD_OUT" : "LOW",
    }];
  });

  for (const room of hotel.roomTypes) {
    if (!seenToday.has(room.id)) {
      inventoryAlerts.unshift({
        roomTypeId: room.id,
        roomName: room.name,
        date: today,
        available: null,
        quantity: room.quantity,
        kind: "MISSING",
      });
    }
  }

  return {
    date: today,
    timezone: hotel.timezone,
    stats: {
      ...report.stats,
      unreadMessages,
      newBookings,
    },
    reservations: report.reservations.slice(0, 12),
    inventoryAlerts: inventoryAlerts.slice(0, 8),
    attentionCount: report.stats.openRequests + unreadMessages + inventoryAlerts.length,
  };
}
