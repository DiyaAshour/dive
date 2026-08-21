import {
  buildStayDates,
  calculatePrice,
  evaluateCancellation,
  parseDateOnly,
  roundMoney,
  type CancellationPolicySnapshot,
} from "@platform/core";
import type { DiscoverySearchInput } from "@platform/contracts";
import { database } from "@platform/database";
import { notFound } from "../errors";

type StayInput = Readonly<{arrival: string; departure: string; adults: number; children: number}>;
type PublicPhoto = Readonly<{url: string; alt: string | null; sortOrder: number}>;
type PublicAmenity = Readonly<{code: string; name: string; category: string | null}>;
type InventoryRow = Readonly<{date: Date; available: number; overbookingLimit: number}>;
type RateRow = Readonly<{date: Date; baseRate: unknown; minStay: number; maxStay: number | null; closed: boolean; stopSell: boolean}>;
type PolicyRow = Readonly<{
  name: string;
  noShowPenaltyType: string;
  noShowPenaltyValue: unknown;
  rules: Array<Readonly<{minimumDaysBeforeArrival: number; penaltyType: string; penaltyValue: unknown}>>;
}>;
type RatePlanRow = Readonly<{
  id: string;
  name: string;
  code: string;
  mealPlan: string;
  allowPayNow: boolean;
  allowPayAtHotel: boolean;
  rates: RateRow[];
  cancellationPolicy: PolicyRow | null;
}>;
type RoomRow = Readonly<{
  id: string;
  name: string;
  maxAdults: number;
  maxChildren: number;
  inventory: InventoryRow[];
  ratePlans: RatePlanRow[];
}>;
type HotelRow = Readonly<{
  id: string;
  name: string;
  slug: string;
  city: string;
  countryCode: string;
  address: string;
  area: string | null;
  description: string | null;
  starRating: number | null;
  latitude: unknown;
  longitude: unknown;
  checkInTime: string | null;
  checkOutTime: string | null;
  timezone: string;
  currency: string;
  serviceRate: unknown;
  taxRate: unknown;
  overbookingEnabled: boolean;
  photos: PublicPhoto[];
  amenities: PublicAmenity[];
  roomTypes: RoomRow[];
}>;

export async function listFeaturedHotels(limit = 6) {
  const hotels = await database().hotel.findMany({
    where: {status: "ACTIVE", verified: true},
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      countryCode: true,
      area: true,
      starRating: true,
      description: true,
      photos: {select: {url: true, alt: true, sortOrder: true}, orderBy: {sortOrder: "asc"}, take: 1},
      amenities: {select: {code: true, name: true, category: true}, orderBy: {name: "asc"}, take: 6},
    },
    orderBy: [{verified: "desc"}, {updatedAt: "desc"}],
    take: Math.max(1, Math.min(limit, 24)),
  });
  return hotels.map((hotel) => ({...hotel, coverPhoto: hotel.photos[0] ?? null, photos: undefined}));
}

export async function searchHotels(input: DiscoverySearchInput) {
  const stay = buildStayDates(input.arrival, input.departure);
  const dates = stay.nights.map(parseDateOnly);
  const destination = input.destination.trim();
  const hotels = await database().hotel.findMany({
    where: {
      status: "ACTIVE",
      verified: true,
      ...(input.stars.length ? {starRating: {in: input.stars}} : {}),
      OR: [
        {name: {contains: destination, mode: "insensitive"}},
        {city: {contains: destination, mode: "insensitive"}},
        {area: {contains: destination, mode: "insensitive"}},
        {address: {contains: destination, mode: "insensitive"}},
        {countryCode: {equals: destination.toUpperCase()}},
      ],
    },
    include: {
      photos: {select: {url: true, alt: true, sortOrder: true}, orderBy: {sortOrder: "asc"}},
      amenities: {select: {code: true, name: true, category: true}, orderBy: {name: "asc"}},
      roomTypes: {
        where: {active: true, maxAdults: {gte: input.adults}, maxChildren: {gte: input.children}},
        include: {
          inventory: {where: {date: {in: dates}}, select: {date: true, available: true, overbookingLimit: true}},
          ratePlans: {
            where: {active: true},
            include: {
              rates: {where: {date: {in: dates}}, orderBy: {date: "asc"}, select: {date: true, baseRate: true, minStay: true, maxStay: true, closed: true, stopSell: true}},
              cancellationPolicy: {include: {rules: {orderBy: {minimumDaysBeforeArrival: "desc"}}}},
            },
          },
        },
      },
    },
    take: 200,
  });

  const requestedAmenities = new Set(input.amenities);
  const results = hotels.flatMap((hotel) => {
    if (requestedAmenities.size && ![...requestedAmenities].every((code) => hotel.amenities.some((amenity) => amenity.code === code))) return [];
    const offers = buildOffers(hotel, stay, input).filter((offer) => {
      if (input.freeCancellation && !offer.freeCancellationNow) return false;
      if (input.paymentMode && !offer.paymentModes.includes(input.paymentMode)) return false;
      if (input.minPrice !== undefined && offer.averageNightlyTotal < input.minPrice) return false;
      if (input.maxPrice !== undefined && offer.averageNightlyTotal > input.maxPrice) return false;
      return true;
    });
    if (!offers.length) return [];
    const cheapest = offers.reduce((best, offer) => offer.total < best.total ? offer : best);
    return [{
      id: hotel.id,
      slug: hotel.slug,
      name: hotel.name,
      city: hotel.city,
      countryCode: hotel.countryCode,
      area: hotel.area,
      starRating: hotel.starRating,
      currency: hotel.currency,
      coverPhoto: hotel.photos[0] ?? null,
      amenities: hotel.amenities,
      availableOffers: offers.length,
      from: cheapest,
    }];
  });

  results.sort((a, b) => compareResults(a, b, input.sort));
  return {query: input, nights: stay.nights.length, count: results.length, results};
}

export async function getPublicHotelDetails(hotelId: string, stayInput: StayInput) {
  const stay = buildStayDates(stayInput.arrival, stayInput.departure);
  const dates = stay.nights.map(parseDateOnly);
  const hotel = await database().hotel.findFirst({
    where: {id: hotelId, status: "ACTIVE", verified: true},
    include: {
      photos: {select: {url: true, alt: true, sortOrder: true}, orderBy: {sortOrder: "asc"}},
      amenities: {select: {code: true, name: true, category: true}, orderBy: [{category: "asc"}, {name: "asc"}]},
      roomTypes: {
        where: {active: true, maxAdults: {gte: stayInput.adults}, maxChildren: {gte: stayInput.children}},
        include: {
          inventory: {where: {date: {in: dates}}, select: {date: true, available: true, overbookingLimit: true}},
          ratePlans: {
            where: {active: true},
            include: {
              rates: {where: {date: {in: dates}}, orderBy: {date: "asc"}, select: {date: true, baseRate: true, minStay: true, maxStay: true, closed: true, stopSell: true}},
              cancellationPolicy: {include: {rules: {orderBy: {minimumDaysBeforeArrival: "desc"}}}},
            },
          },
        },
      },
    },
  });
  if (!hotel) notFound("Hotel");
  const offers = buildOffers(hotel, stay, stayInput).sort((a, b) => a.total - b.total);
  return {
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    city: hotel.city,
    countryCode: hotel.countryCode,
    address: hotel.address,
    area: hotel.area,
    description: hotel.description,
    starRating: hotel.starRating,
    location: hotel.latitude === null || hotel.longitude === null ? null : {latitude: Number(hotel.latitude), longitude: Number(hotel.longitude)},
    checkInTime: hotel.checkInTime,
    checkOutTime: hotel.checkOutTime,
    timezone: hotel.timezone,
    currency: hotel.currency,
    photos: hotel.photos,
    amenities: hotel.amenities,
    stay: {arrival: stay.arrival, departure: stay.departure, nights: stay.nights.length, adults: stayInput.adults, children: stayInput.children},
    offers,
  };
}

function buildOffers(hotel: HotelRow, stay: Readonly<{arrival: string; departure: string; nights: readonly string[]}>, guests: Readonly<{adults: number; children: number}>) {
  const stayLength = stay.nights.length;
  return hotel.roomTypes.flatMap((room) => {
    if (room.maxAdults < guests.adults || room.maxChildren < guests.children) return [];
    if (room.inventory.length !== stayLength) return [];
    const available = room.inventory.map((row) => row.available + (hotel.overbookingEnabled ? row.overbookingLimit : 0));
    if (available.some((count) => count <= 0)) return [];
    const availableToSell = Math.min(...available);
    return room.ratePlans.flatMap((plan) => {
      if (!plan.cancellationPolicy || plan.rates.length !== stayLength) return [];
      if (plan.rates.some((rate) => rate.closed || rate.stopSell || rate.minStay > stayLength || (rate.maxStay !== null && rate.maxStay < stayLength))) return [];
      const nightly = plan.rates.map((rate) => ({date: rate.date, ...calculatePrice(Number(rate.baseRate), {serviceRate: Number(hotel.serviceRate), taxRate: Number(hotel.taxRate)})}));
      const totals = {
        base: roundMoney(nightly.reduce((sum, night) => sum + night.base, 0)),
        service: roundMoney(nightly.reduce((sum, night) => sum + night.service, 0)),
        tax: roundMoney(nightly.reduce((sum, night) => sum + night.tax, 0)),
        total: roundMoney(nightly.reduce((sum, night) => sum + night.total, 0)),
      };
      const policy = policySnapshot(plan.cancellationPolicy);
      const cancellation = evaluateCancellation({arrival: stay.arrival, hotelTimeZone: hotel.timezone, totalAmount: totals.total, firstNightAmount: nightly[0]?.total ?? 0, policy});
      const paymentModes = [plan.allowPayNow ? "PAY_NOW" : null, plan.allowPayAtHotel ? "PAY_AT_HOTEL" : null].filter((value): value is "PAY_NOW" | "PAY_AT_HOTEL" => value !== null);
      return [{
        roomTypeId: room.id,
        roomName: room.name,
        maxAdults: room.maxAdults,
        maxChildren: room.maxChildren,
        ratePlanId: plan.id,
        ratePlanName: plan.name,
        ratePlanCode: plan.code,
        mealPlan: plan.mealPlan,
        paymentModes,
        cancellationPolicy: policy,
        cancellationNow: cancellation,
        freeCancellationNow: cancellation.penaltyAmount === 0,
        availableToSell,
        amounts: totals,
        total: totals.total,
        averageNightlyTotal: roundMoney(totals.total / stayLength),
      }];
    });
  });
}

function policySnapshot(policy: PolicyRow): CancellationPolicySnapshot {
  return {
    name: policy.name,
    noShowPenaltyType: policy.noShowPenaltyType as CancellationPolicySnapshot["noShowPenaltyType"],
    noShowPenaltyValue: policy.noShowPenaltyValue === null ? null : Number(policy.noShowPenaltyValue),
    rules: policy.rules.map((rule) => ({
      minimumDaysBeforeArrival: rule.minimumDaysBeforeArrival,
      penaltyType: rule.penaltyType as CancellationPolicySnapshot["rules"][number]["penaltyType"],
      penaltyValue: rule.penaltyValue === null ? null : Number(rule.penaltyValue),
    })),
  };
}

function compareResults(a: {name: string; starRating: number | null; from: {total: number}}, b: {name: string; starRating: number | null; from: {total: number}}, sort: DiscoverySearchInput["sort"]) {
  if (sort === "PRICE_ASC") return a.from.total - b.from.total || a.name.localeCompare(b.name);
  if (sort === "PRICE_DESC") return b.from.total - a.from.total || a.name.localeCompare(b.name);
  if (sort === "STARS_DESC") return (b.starRating ?? 0) - (a.starRating ?? 0) || a.from.total - b.from.total;
  return (b.starRating ?? 0) - (a.starRating ?? 0) || a.from.total - b.from.total || a.name.localeCompare(b.name);
}
