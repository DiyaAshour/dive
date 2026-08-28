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
import { captureHotelView, captureSearchDemand } from "../growth/analytics";
import { promotionBaseRate, selectBestPromotion, type PromotionCandidate } from "../promotions/engine";

type StayInput = Readonly<{arrival: string; departure: string; adults: number; children: number}>;
type PublicPhoto = Readonly<{url: string; alt: string | null; sortOrder: number}>;
type StoredPhoto = Readonly<{alt: string | null; sortOrder: number; mediaObject: Readonly<{publicUrl: string | null}>}>;
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
  promotions: Array<Readonly<{promotion: PromotionCandidate}>>;
  cancellationPolicy: PolicyRow | null;
}>;
type RoomRow = Readonly<{
  id: string;
  name: string;
  description: string | null;
  unitType: string;
  quantity: number;
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  maxInfants: number;
  bedroomCount: number;
  livingRoomCount: number;
  bathroomCount: number;
  privateBathroom: boolean;
  sizeValue: unknown;
  sizeUnit: string;
  smokingPolicy: string;
  extraBedCount: number;
  cribCount: number;
  allowsCribAndExtraBed: boolean;
  beds: Array<Readonly<{area: string; type: string; quantity: number; sortOrder: number}>>;
  amenities: PublicAmenity[];
  photos: PublicPhoto[];
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

type ReviewSummary = Readonly<{count: number; overall: number | null}>;

const livePhotoQuery = {
  where: {mediaObject: {state: "READY" as const}},
  select: {alt: true, sortOrder: true, mediaObject: {select: {publicUrl: true}}},
  orderBy: {sortOrder: "asc" as const},
};

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
      photos: {...livePhotoQuery, take: 1},
      amenities: {select: {code: true, name: true, category: true}, orderBy: {name: "asc"}, take: 6},
    },
    orderBy: [{verified: "desc"}, {updatedAt: "desc"}],
    take: Math.max(1, Math.min(limit, 24)),
  });
  const reviewMap = await reviewSummaries(hotels.map((hotel) => hotel.id));
  return hotels.map((hotel) => {
    const photos = publicPhotos(hotel.photos);
    return {...hotel, reviewSummary: reviewMap.get(hotel.id) ?? {count: 0, overall: null}, coverPhoto: photos[0] ?? null, photos: undefined};
  });
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
      photos: livePhotoQuery,
      amenities: {select: {code: true, name: true, category: true}, orderBy: {name: "asc"}},
      roomTypes: {
        where: {active: true, maxGuests: {gte: input.adults + input.children}, maxAdults: {gte: input.adults}, maxChildren: {gte: input.children}},
        include: {
          beds: {select: {area: true, type: true, quantity: true, sortOrder: true}, orderBy: {sortOrder: "asc"}},
          amenities: {select: {code: true, name: true, category: true}, orderBy: [{category: "asc"}, {name: "asc"}]},
          photos: livePhotoQuery,
          inventory: {where: {date: {in: dates}}, select: {date: true, available: true, overbookingLimit: true}},
          ratePlans: {
            where: {active: true},
            include: {
              rates: {where: {date: {in: dates}}, orderBy: {date: "asc"}, select: {date: true, baseRate: true, minStay: true, maxStay: true, closed: true, stopSell: true}},
              cancellationPolicy: {include: {rules: {orderBy: {minimumDaysBeforeArrival: "desc"}}}},
              promotions: {where: {promotion: {status: "ACTIVE"}}, include: {promotion: true}},
            },
          },
        },
      },
    },
    take: 200,
  });

  const reviewMap = await reviewSummaries(hotels.map((hotel) => hotel.id));
  const requestedAmenities = new Set(input.amenities);
  const results = hotels.flatMap((rawHotel) => {
    const hotel: HotelRow = {...rawHotel, photos: publicPhotos(rawHotel.photos), roomTypes: rawHotel.roomTypes.map((room) => ({...room, photos: publicPhotos(room.photos)}))};
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
      reviewSummary: reviewMap.get(hotel.id) ?? {count: 0, overall: null},
      currency: hotel.currency,
      coverPhoto: hotel.photos[0] ?? null,
      amenities: hotel.amenities,
      availableOffers: offers.length,
      from: cheapest,
    }];
  });

  results.sort((a, b) => compareResults(a, b, input.sort));
  await captureSearchDemand(input, results.map((result) => result.id));
  return {query: input, nights: stay.nights.length, count: results.length, results};
}

export async function getPublicHotelDetails(hotelId: string, stayInput: StayInput, options: Readonly<{trackView?: boolean}> = {}) {
  const stay = buildStayDates(stayInput.arrival, stayInput.departure);
  const dates = stay.nights.map(parseDateOnly);
  const rawHotel = await database().hotel.findFirst({
    where: {status: "ACTIVE", verified: true, OR: [{id: hotelId}, {slug: hotelId}]},
    include: {
      photos: livePhotoQuery,
      amenities: {select: {code: true, name: true, category: true}, orderBy: [{category: "asc"}, {name: "asc"}]},
      roomTypes: {
        where: {active: true, maxGuests: {gte: stayInput.adults + stayInput.children}, maxAdults: {gte: stayInput.adults}, maxChildren: {gte: stayInput.children}},
        include: {
          beds: {select: {area: true, type: true, quantity: true, sortOrder: true}, orderBy: {sortOrder: "asc"}},
          amenities: {select: {code: true, name: true, category: true}, orderBy: [{category: "asc"}, {name: "asc"}]},
          photos: livePhotoQuery,
          inventory: {where: {date: {in: dates}}, select: {date: true, available: true, overbookingLimit: true}},
          ratePlans: {
            where: {active: true},
            include: {
              rates: {where: {date: {in: dates}}, orderBy: {date: "asc"}, select: {date: true, baseRate: true, minStay: true, maxStay: true, closed: true, stopSell: true}},
              cancellationPolicy: {include: {rules: {orderBy: {minimumDaysBeforeArrival: "desc"}}}},
              promotions: {where: {promotion: {status: "ACTIVE"}}, include: {promotion: true}},
            },
          },
        },
      },
    },
  });
  if (!rawHotel) notFound("Hotel");
  const hotel: HotelRow = {...rawHotel, photos: publicPhotos(rawHotel.photos), roomTypes: rawHotel.roomTypes.map((room) => ({...room, photos: publicPhotos(room.photos)}))};
  const offers = buildOffers(hotel, stay, stayInput).sort((a, b) => a.total - b.total);
  const reviewMap = await reviewSummaries([hotel.id]);
  if (options.trackView !== false) await captureHotelView(hotel.id, {arrival: stay.arrival, departure: stay.departure});
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
    reviewSummary: reviewMap.get(hotel.id) ?? {count: 0, overall: null},
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
  const stayDates = stay.nights.map(parseDateOnly);
  return hotel.roomTypes.flatMap((room) => {
    if (room.maxGuests < guests.adults + guests.children || room.maxAdults < guests.adults || room.maxChildren < guests.children) return [];
    if (room.inventory.length !== stayLength) return [];
    const available = room.inventory.map((row) => row.available + (hotel.overbookingEnabled ? row.overbookingLimit : 0));
    if (available.some((count) => count <= 0)) return [];
    const availableToSell = Math.min(...available);
    return room.ratePlans.flatMap((plan) => {
      if (!plan.cancellationPolicy || plan.rates.length !== stayLength) return [];
      if (plan.rates.some((rate) => rate.closed || rate.stopSell || rate.minStay > stayLength || (rate.maxStay !== null && rate.maxStay < stayLength))) return [];
      const promotion = selectBestPromotion(plan.promotions.map((item) => item.promotion), stayDates);
      const nightly = plan.rates.map((rate) => {
        const base = promotionBaseRate(Number(rate.baseRate), promotion);
        return {date: rate.date, ...calculatePrice(base, {serviceRate: Number(hotel.serviceRate), taxRate: Number(hotel.taxRate)})};
      });
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
        roomDescription: room.description,
        unitType: room.unitType,
        quantity: room.quantity,
        maxGuests: room.maxGuests,
        maxAdults: room.maxAdults,
        maxChildren: room.maxChildren,
        maxInfants: room.maxInfants,
        bedroomCount: room.bedroomCount,
        livingRoomCount: room.livingRoomCount,
        bathroomCount: room.bathroomCount,
        privateBathroom: room.privateBathroom,
        sizeValue: room.sizeValue === null ? null : Number(room.sizeValue),
        sizeUnit: room.sizeUnit,
        smokingPolicy: room.smokingPolicy,
        extraBedCount: room.extraBedCount,
        cribCount: room.cribCount,
        allowsCribAndExtraBed: room.allowsCribAndExtraBed,
        beds: room.beds,
        roomAmenities: room.amenities,
        roomPhotos: room.photos,
        ratePlanId: plan.id,
        ratePlanName: plan.name,
        ratePlanCode: plan.code,
        mealPlan: plan.mealPlan,
        promotion,
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

async function reviewSummaries(hotelIds: readonly string[]): Promise<Map<string, ReviewSummary>> {
  if (!hotelIds.length) return new Map();
  const rows = await database().guestReview.groupBy({
    by: ["hotelId"],
    where: {hotelId: {in: [...hotelIds]}, status: "PUBLISHED"},
    _count: {_all: true},
    _avg: {overall: true},
  });
  return new Map(rows.map((row) => [row.hotelId, {count: row._count._all, overall: row._avg.overall === null ? null : Math.round(row._avg.overall * 10) / 10}]));
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

function publicPhotos(photos: readonly StoredPhoto[]): PublicPhoto[] {
  return photos.flatMap((photo) => photo.mediaObject.publicUrl ? [{url: photo.mediaObject.publicUrl, alt: photo.alt, sortOrder: photo.sortOrder}] : []);
}

function compareResults(a: {name: string; starRating: number | null; from: {total: number}}, b: {name: string; starRating: number | null; from: {total: number}}, sort: DiscoverySearchInput["sort"]) {
  if (sort === "PRICE_ASC") return a.from.total - b.from.total || a.name.localeCompare(b.name);
  if (sort === "PRICE_DESC") return b.from.total - a.from.total || a.name.localeCompare(b.name);
  if (sort === "STARS_DESC") return (b.starRating ?? 0) - (a.starRating ?? 0) || a.from.total - b.from.total;
  return (b.starRating ?? 0) - (a.starRating ?? 0) || a.from.total - b.from.total || a.name.localeCompare(b.name);
}
