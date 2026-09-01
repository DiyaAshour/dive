import type { CreatePriceWatchInput, SaveSearchInput } from "@platform/contracts";
import { database } from "@platform/database";
import { badRequest, notFound } from "../errors";
import { getPublicHotelDetails } from "../discovery/service";
import { queuePriceWatchNotificationEmail } from "../communications/booking";

export async function createSavedSearch(userId: string, input: SaveSearchInput) {
  return database().savedSearch.create({data: {
    ownerUserId: userId,
    name: input.name,
    destination: input.destination,
    destinationKey: destinationKey(input.destination),
    arrival: dateOnly(input.arrival),
    departure: dateOnly(input.departure),
    adults: input.adults,
    children: input.children,
    filters: input.filters,
  }});
}

export async function listSavedSearches(userId: string) {
  return database().savedSearch.findMany({
    where: {ownerUserId: userId, active: true},
    orderBy: {updatedAt: "desc"},
    take: 100,
  });
}

export async function removeSavedSearch(userId: string, searchId: string) {
  const result = await database().savedSearch.updateMany({where: {id: searchId, ownerUserId: userId}, data: {active: false}});
  if (result.count !== 1) notFound("Saved search");
  return {removed: true};
}

export async function createPriceWatch(userId: string, input: CreatePriceWatchInput) {
  const priceInput = {
    arrival: input.arrival,
    departure: input.departure,
    adults: input.adults,
    children: input.children,
    ...(input.roomTypeId ? {roomTypeId: input.roomTypeId} : {}),
  };
  const snapshot = await currentHotelPrice(input.hotelId, priceInput);
  const db = database();
  const unique = {
    ownerUserId_hotelId_arrival_departure_adults_children: {
      ownerUserId: userId,
      hotelId: input.hotelId,
      arrival: dateOnly(input.arrival),
      departure: dateOnly(input.departure),
      adults: input.adults,
      children: input.children,
    },
  } as const;
  const existing = await db.priceWatch.findUnique({where: unique});
  if (existing) {
    const nextRoomTypeId = input.roomTypeId ?? null;
    const roomChanged = existing.roomTypeId !== nextRoomTypeId;
    const lowest = roomChanged ? snapshot.total : Math.min(Number(existing.lowestSeenTotal), snapshot.total);
    return db.priceWatch.update({where: {id: existing.id}, data: {
      hotelName: snapshot.hotelName,
      roomTypeId: nextRoomTypeId,
      roomTypeName: nextRoomTypeId ? snapshot.roomTypeName : null,
      currency: snapshot.currency,
      baselineTotal: roomChanged ? snapshot.total : existing.baselineTotal,
      lastSeenTotal: snapshot.total,
      lowestSeenTotal: lowest,
      lastNotifiedTotal: snapshot.total,
      targetTotal: input.targetTotal ?? null,
      active: true,
      lastCheckedAt: new Date(),
      triggeredAt: input.targetTotal !== undefined && snapshot.total <= input.targetTotal ? new Date() : null,
    }});
  }
  return db.priceWatch.create({data: {
    ownerUserId: userId,
    hotelId: input.hotelId,
    hotelName: snapshot.hotelName,
    roomTypeId: input.roomTypeId ?? null,
    roomTypeName: input.roomTypeId ? snapshot.roomTypeName : null,
    arrival: dateOnly(input.arrival),
    departure: dateOnly(input.departure),
    adults: input.adults,
    children: input.children,
    currency: snapshot.currency,
    baselineTotal: snapshot.total,
    lastSeenTotal: snapshot.total,
    lowestSeenTotal: snapshot.total,
    lastNotifiedTotal: snapshot.total,
    targetTotal: input.targetTotal ?? null,
    lastCheckedAt: new Date(),
    triggeredAt: input.targetTotal !== undefined && snapshot.total <= input.targetTotal ? new Date() : null,
  }});
}

export async function listPriceWatches(userId: string) {
  return database().priceWatch.findMany({where: {ownerUserId: userId, active: true}, orderBy: {updatedAt: "desc"}, take: 100});
}

export async function removePriceWatch(userId: string, watchId: string) {
  const result = await database().priceWatch.updateMany({where: {id: watchId, ownerUserId: userId}, data: {active: false}});
  if (result.count !== 1) notFound("Price watch");
  return {removed: true};
}

export async function listUserNotifications(userId: string, limit = 50) {
  return database().userNotification.findMany({where: {userId}, orderBy: {createdAt: "desc"}, take: Math.max(1, Math.min(limit, 100))});
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const result = await database().userNotification.updateMany({where: {id: notificationId, userId}, data: {readAt: new Date()}});
  if (result.count !== 1) notFound("Notification");
  return {read: true};
}

export async function evaluateActivePriceWatches(limit = 100): Promise<{checked: number; notified: number}> {
  const db = database();
  const watches = await db.priceWatch.findMany({
    where: {active: true, departure: {gt: dateOnly(new Date().toISOString().slice(0, 10))}},
    orderBy: [{lastCheckedAt: "asc"}, {createdAt: "asc"}],
    take: Math.max(1, Math.min(limit, 500)),
  });
  let checked = 0;
  let notified = 0;
  for (const watch of watches) {
    checked += 1;
    const input = {
      arrival: key(watch.arrival),
      departure: key(watch.departure),
      adults: watch.adults,
      children: watch.children,
      ...(watch.roomTypeId ? {roomTypeId: watch.roomTypeId} : {}),
    };
    try {
      const snapshot = await currentHotelPrice(watch.hotelId, input);
      const previousLow = Number(watch.lowestSeenTotal);
      const previousNotified = Number(watch.lastNotifiedTotal);
      const target = watch.targetTotal === null ? null : Number(watch.targetTotal);
      const targetCrossed = target !== null && snapshot.total <= target && (watch.triggeredAt === null || Number(watch.lastSeenTotal) > target);
      const meaningfulNewLow = snapshot.total < previousLow && snapshot.total <= previousNotified * 0.99;
      const shouldNotify = targetCrossed || meaningfulNewLow;
      const nextLow = Math.min(previousLow, snapshot.total);
      const now = new Date();
      let notificationId: string | null = null;
      await db.$transaction(async (tx) => {
        await tx.priceWatch.update({where: {id: watch.id}, data: {
          hotelName: snapshot.hotelName,
          roomTypeName: watch.roomTypeId ? snapshot.roomTypeName : null,
          currency: snapshot.currency,
          lastSeenTotal: snapshot.total,
          lowestSeenTotal: nextLow,
          lastNotifiedTotal: shouldNotify ? snapshot.total : watch.lastNotifiedTotal,
          lastCheckedAt: now,
          triggeredAt: targetCrossed ? now : watch.triggeredAt,
        }});
        if (shouldNotify) {
          const kind = targetCrossed ? "PRICE_TARGET_REACHED" : "PRICE_DROP";
          const watchedName = watch.roomTypeName ? `${snapshot.hotelName} · ${watch.roomTypeName}` : snapshot.hotelName;
          const title = targetCrossed ? `Target price reached at ${watchedName}` : `New lowest price at ${watchedName}`;
          const stayLabel = watch.roomTypeName ? `${watch.roomTypeName} stay` : "watched stay";
          const body = targetCrossed
            ? `Your ${stayLabel} is now ${snapshot.total.toFixed(2)} ${snapshot.currency}, at or below your target of ${target?.toFixed(2)} ${snapshot.currency}.`
            : `Your ${stayLabel} dropped to ${snapshot.total.toFixed(2)} ${snapshot.currency}. Last alerted price: ${previousNotified.toFixed(2)} ${snapshot.currency}.`;
          const notification = await tx.userNotification.create({data: {
            userId: watch.ownerUserId,
            kind,
            title,
            body,
            link: hotelLink(watch.hotelId, watch.arrival, watch.departure, watch.adults, watch.children),
            data: {watchId: watch.id, hotelId: watch.hotelId, roomTypeId: watch.roomTypeId, roomTypeName: watch.roomTypeName, total: snapshot.total, currency: snapshot.currency},
          }});
          notificationId = notification.id;
        }
      });
      if (shouldNotify) notified += 1;
      if (notificationId) {
        await queuePriceWatchNotificationEmail(notificationId).catch((error) => {
          console.error(JSON.stringify({event: "price_watch_email_queue_failed", notificationId, message: error instanceof Error ? error.message : "unknown error"}));
        });
      }
    } catch (error) {
      console.error(`[price-watch] failed for ${watch.id}`, error);
      await db.priceWatch.update({where: {id: watch.id}, data: {lastCheckedAt: new Date()}}).catch(() => undefined);
    }
  }
  return {checked, notified};
}

async function currentHotelPrice(hotelId: string, input: Readonly<{arrival: string; departure: string; adults: number; children: number; roomTypeId?: string}>) {
  const hotel = await getPublicHotelDetails(hotelId, input, {trackView: false});
  const offers = input.roomTypeId ? hotel.offers.filter((offer) => offer.roomTypeId === input.roomTypeId) : hotel.offers;
  const offer = offers.reduce<(typeof offers)[number] | undefined>((best, candidate) => !best || candidate.total < best.total ? candidate : best, undefined);
  if (!offer) {
    if (input.roomTypeId) badRequest("NO_WATCHABLE_ROOM_RATE", "The selected room type has no live sellable rate for this stay");
    badRequest("NO_WATCHABLE_RATE", "This hotel has no live sellable rate for the selected stay");
  }
  return {hotelName: hotel.name, currency: hotel.currency, total: offer.total, roomTypeId: offer.roomTypeId, roomTypeName: offer.roomName};
}

function destinationKey(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function key(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function hotelLink(hotelId: string, arrival: Date, departure: Date, adults: number, children: number): string {
  const query = new URLSearchParams({arrival: key(arrival), departure: key(departure), adults: String(adults), children: String(children)});
  return `/hotel/${hotelId}?${query.toString()}`;
}
