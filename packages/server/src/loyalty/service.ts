import {
  buildStayDates,
  calculateLoyaltyPoints,
  localDateInTimeZone,
  loyaltyPointsPerJod,
  loyaltyTierForNights,
  loyaltyTierProgress,
  type HandMeKeyLoyaltyTier,
} from "@platform/core";
import { database } from "@platform/database";
import { ApplicationError } from "../errors";

const ELIGIBLE_CURRENCY = "JOD";
const LEDGER_LIMIT = 24;

export type LoyaltyOverview = Readonly<{
  tier: HandMeKeyLoyaltyTier;
  pointsBalance: number;
  lifetimePointsEarned: number;
  qualifyingNights: number;
  qualifyingStays: number;
  pointsPerJod: number;
  progress: ReturnType<typeof loyaltyTierProgress>;
  recentActivity: ReadonlyArray<Readonly<{
    id: string;
    bookingId: string | null;
    bookingReference: string | null;
    hotelName: string | null;
    type: "EARN" | "ADJUSTMENT" | "REDEMPTION" | "REVERSAL" | "EXPIRY";
    points: number;
    eligibleAmount: number | null;
    currency: string | null;
    tierAtPosting: HandMeKeyLoyaltyTier;
    createdAt: Date;
  }>>;
}>;

export async function getLoyaltyOverview(userId: string): Promise<LoyaltyOverview> {
  await settleCompletedStayRewards(userId);
  const db = database();
  const account = await db.loyaltyAccount.upsert({
    where: {userId},
    create: {userId},
    update: {},
  });
  const entries = await db.loyaltyLedgerEntry.findMany({
    where: {userId},
    orderBy: {createdAt: "desc"},
    take: LEDGER_LIMIT,
    select: {
      id: true,
      bookingId: true,
      type: true,
      points: true,
      eligibleAmount: true,
      currency: true,
      tierAtPosting: true,
      createdAt: true,
    },
  });
  const bookingIds = entries.flatMap((entry) => entry.bookingId ? [entry.bookingId] : []);
  const bookings = bookingIds.length ? await db.booking.findMany({
    where: {id: {in: bookingIds}},
    select: {id: true, reference: true, hotel: {select: {name: true}}},
  }) : [];
  const bookingMap = new Map(bookings.map((booking) => [booking.id, booking]));
  const tier = account.tier as HandMeKeyLoyaltyTier;

  return {
    tier,
    pointsBalance: account.pointsBalance,
    lifetimePointsEarned: account.lifetimePointsEarned,
    qualifyingNights: account.qualifyingNights,
    qualifyingStays: account.qualifyingStays,
    pointsPerJod: loyaltyPointsPerJod(tier),
    progress: loyaltyTierProgress(account.qualifyingNights),
    recentActivity: entries.map((entry) => {
      const booking = entry.bookingId ? bookingMap.get(entry.bookingId) : undefined;
      return {
        id: entry.id,
        bookingId: entry.bookingId,
        bookingReference: booking?.reference ?? null,
        hotelName: booking?.hotel.name ?? null,
        type: entry.type,
        points: entry.points,
        eligibleAmount: entry.eligibleAmount === null ? null : Number(entry.eligibleAmount),
        currency: entry.currency,
        tierAtPosting: entry.tierAtPosting as HandMeKeyLoyaltyTier,
        createdAt: entry.createdAt,
      };
    }),
  };
}

export async function settleCompletedStayRewards(userId: string): Promise<{posted: number; points: number}> {
  const db = database();
  const userExists = await db.user.findUnique({where: {id: userId}, select: {id: true}});
  if (!userExists) throw new ApplicationError("ACCOUNT_NOT_FOUND", "Account not found", 404);

  const now = new Date();
  const bookings = await db.booking.findMany({
    where: {
      userId,
      status: {in: ["CONFIRMED", "MODIFIED"]},
      departure: {lte: now},
      currency: ELIGIBLE_CURRENCY,
    },
    select: {
      id: true,
      reference: true,
      arrival: true,
      departure: true,
      baseAmount: true,
      currency: true,
      hotel: {select: {name: true, timezone: true}},
    },
    orderBy: [{departure: "asc"}, {createdAt: "asc"}],
  });

  if (!bookings.length) return {posted: 0, points: 0};
  const existing = await db.loyaltyLedgerEntry.findMany({
    where: {userId, bookingId: {in: bookings.map((booking) => booking.id)}, type: "EARN"},
    select: {bookingId: true},
  });
  const postedBookingIds = new Set(existing.flatMap((entry) => entry.bookingId ? [entry.bookingId] : []));
  let posted = 0;
  let points = 0;

  for (const booking of bookings) {
    if (postedBookingIds.has(booking.id)) continue;
    const today = localDateInTimeZone(now, booking.hotel.timezone);
    const departure = booking.departure.toISOString().slice(0, 10);
    if (departure > today) continue;

    const arrival = booking.arrival.toISOString().slice(0, 10);
    const nights = buildStayDates(arrival, departure).nights.length;
    const idempotencyKey = `LOYALTY_STAY_EARN:${booking.id}`;

    try {
      const result = await db.$transaction(async (tx) => {
        const duplicate = await tx.loyaltyLedgerEntry.findUnique({where: {idempotencyKey}, select: {id: true}});
        if (duplicate) return {posted: false, points: 0};

        const account = await tx.loyaltyAccount.upsert({
          where: {userId},
          create: {userId},
          update: {},
        });
        const tierAtPosting = loyaltyTierForNights(account.qualifyingNights);
        const earnedPoints = calculateLoyaltyPoints(Number(booking.baseAmount), tierAtPosting, booking.currency);
        if (earnedPoints <= 0) return {posted: false, points: 0};
        const nextQualifyingNights = account.qualifyingNights + nights;

        await tx.loyaltyLedgerEntry.create({
          data: {
            userId,
            bookingId: booking.id,
            type: "EARN",
            points: earnedPoints,
            currency: booking.currency,
            eligibleAmount: booking.baseAmount,
            pointsPerUnit: loyaltyPointsPerJod(tierAtPosting),
            tierAtPosting,
            description: `Completed stay ${booking.reference} · ${booking.hotel.name}`,
            idempotencyKey,
          },
        });
        await tx.loyaltyAccount.update({
          where: {userId},
          data: {
            pointsBalance: {increment: earnedPoints},
            lifetimePointsEarned: {increment: earnedPoints},
            qualifyingNights: {increment: nights},
            qualifyingStays: {increment: 1},
            tier: loyaltyTierForNights(nextQualifyingNights),
          },
        });
        return {posted: true, points: earnedPoints};
      });
      if (result.posted) {
        posted += 1;
        points += result.points;
      }
    } catch (error) {
      if (isUniqueConstraintError(error)) continue;
      throw error;
    }
  }

  return {posted, points};
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: string}).code === "P2002";
}
