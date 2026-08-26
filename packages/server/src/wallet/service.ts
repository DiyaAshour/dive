import { roundMoney } from "@platform/core";
import { database } from "@platform/database";
import { ApplicationError, badRequest, notFound } from "../errors";
import { cancelBooking, type BookingAccessContext } from "../bookings/service";
import { settleCompletedStayRewards } from "../loyalty/service";

export const WALLET_CURRENCY = "JOD";
export const REWARDS_POINTS_PER_JOD = 400;
export const MIN_REDEMPTION_POINTS = 400;
export const REDEMPTION_STEP_POINTS = 20;
const ACTIVITY_LIMIT = 30;

type WalletDb = Pick<ReturnType<typeof database>, "walletAccount" | "walletLedgerEntry">;

export type WalletOverview = Readonly<{
  currency: string;
  balance: number;
  pointsPerJod: number;
  minimumRedemptionPoints: number;
  redemptionStepPoints: number;
  convertiblePoints: number;
  convertibleAmount: number;
  recentActivity: ReadonlyArray<Readonly<{
    id: string;
    bookingId: string | null;
    type: "REWARDS_CONVERSION" | "BOOKING_DEBIT" | "BOOKING_REFUND" | "ADJUSTMENT";
    amount: number;
    currency: string;
    sourcePoints: number | null;
    description: string;
    createdAt: Date;
  }>>;
}>;

export async function getWalletOverview(userId: string): Promise<WalletOverview> {
  await settleCompletedStayRewards(userId);
  await reconcileWalletRefunds(userId);
  const db = database();
  const [wallet, loyalty, activity] = await Promise.all([
    db.walletAccount.upsert({where: {userId}, create: {userId, currency: WALLET_CURRENCY}, update: {}}),
    db.loyaltyAccount.upsert({where: {userId}, create: {userId}, update: {}}),
    db.walletLedgerEntry.findMany({where: {userId}, orderBy: {createdAt: "desc"}, take: ACTIVITY_LIMIT}),
  ]);
  const convertiblePoints = loyalty.pointsBalance - (loyalty.pointsBalance % REDEMPTION_STEP_POINTS);
  return {
    currency: wallet.currency,
    balance: Number(wallet.balance),
    pointsPerJod: REWARDS_POINTS_PER_JOD,
    minimumRedemptionPoints: MIN_REDEMPTION_POINTS,
    redemptionStepPoints: REDEMPTION_STEP_POINTS,
    convertiblePoints,
    convertibleAmount: roundMoney(convertiblePoints / REWARDS_POINTS_PER_JOD),
    recentActivity: activity.map((entry) => ({
      id: entry.id,
      bookingId: entry.bookingId,
      type: entry.type,
      amount: Number(entry.amount),
      currency: entry.currency,
      sourcePoints: entry.sourcePoints,
      description: entry.description,
      createdAt: entry.createdAt,
    })),
  };
}

export async function convertRewardsToWallet(userId: string, rawPoints: number, idempotencyKey: string) {
  const points = Math.trunc(rawPoints);
  if (!Number.isFinite(rawPoints) || points !== rawPoints) badRequest("INVALID_POINTS", "Points must be a whole number");
  if (points < MIN_REDEMPTION_POINTS) badRequest("REDEMPTION_TOO_SMALL", `Redeem at least ${MIN_REDEMPTION_POINTS} points`);
  if (points % REDEMPTION_STEP_POINTS !== 0) badRequest("INVALID_REDEMPTION_STEP", `Redeem points in steps of ${REDEMPTION_STEP_POINTS}`);
  const amount = roundMoney(points / REWARDS_POINTS_PER_JOD);
  const walletKey = `WALLET_REWARDS:${userId}:${idempotencyKey}`;
  const loyaltyKey = `LOYALTY_REDEMPTION:${userId}:${idempotencyKey}`;
  const db = database();

  const existing = await db.walletLedgerEntry.findUnique({where: {idempotencyKey: walletKey}});
  if (existing) return getWalletOverview(userId);

  try {
    await db.$transaction(async (tx) => {
      const duplicate = await tx.walletLedgerEntry.findUnique({where: {idempotencyKey: walletKey}, select: {id: true}});
      if (duplicate) return;
      const loyalty = await tx.loyaltyAccount.upsert({where: {userId}, create: {userId}, update: {}});
      if (loyalty.pointsBalance < points) badRequest("INSUFFICIENT_REWARDS", "You do not have enough Rewards points");
      const wallet = await tx.walletAccount.upsert({where: {userId}, create: {userId, currency: WALLET_CURRENCY}, update: {}});
      if (wallet.currency !== WALLET_CURRENCY) throw new ApplicationError("WALLET_CURRENCY_MISMATCH", "Wallet currency is not supported for Rewards conversion", 409);

      await tx.loyaltyLedgerEntry.create({data: {
        userId,
        type: "REDEMPTION",
        points: -points,
        currency: WALLET_CURRENCY,
        eligibleAmount: amount,
        pointsPerUnit: REWARDS_POINTS_PER_JOD,
        tierAtPosting: loyalty.tier,
        description: `${points} Rewards points converted to HandMeKey Wallet`,
        idempotencyKey: loyaltyKey,
      }});
      await tx.loyaltyAccount.update({where: {userId}, data: {pointsBalance: {decrement: points}}});
      await tx.walletLedgerEntry.create({data: {
        userId,
        type: "REWARDS_CONVERSION",
        amount,
        currency: WALLET_CURRENCY,
        sourcePoints: points,
        description: `${points} Rewards points converted to wallet credit`,
        idempotencyKey: walletKey,
      }});
      await tx.walletAccount.update({where: {userId}, data: {balance: {increment: amount}}});
    }, {isolationLevel: "Serializable"});
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }
  return getWalletOverview(userId);
}

export async function applyWalletToBooking(bookingId: string, userId: string, rawAmount: number, idempotencyKey: string) {
  const requestedAmount = roundMoney(rawAmount);
  if (!Number.isFinite(rawAmount) || requestedAmount <= 0) badRequest("INVALID_WALLET_AMOUNT", "Wallet amount must be greater than zero");
  const db = database();
  const key = `WALLET_BOOKING:${bookingId}:${idempotencyKey}`;
  const existing = await db.walletLedgerEntry.findUnique({where: {idempotencyKey: key}});
  if (existing) return walletBookingSummary(bookingId, userId, Number(existing.amount) * -1);

  const booking = await db.booking.findUnique({where: {id: bookingId}, select: {id: true, userId: true, status: true, holdExpiresAt: true, totalAmount: true, currency: true, paymentMode: true}});
  if (!booking) notFound("Booking");
  if (booking.userId !== userId) throw new ApplicationError("WALLET_BOOKING_FORBIDDEN", "Wallet can only be used on your own booking", 403);
  if (booking.status !== "HOLD") throw new ApplicationError("BOOKING_NOT_PAYABLE", "Wallet can only be applied to an active booking hold", 409);
  if (!booking.holdExpiresAt || booking.holdExpiresAt.getTime() <= Date.now()) throw new ApplicationError("HOLD_EXPIRED", "Booking hold expired before wallet credit could be applied", 409);
  if (booking.currency !== WALLET_CURRENCY) badRequest("WALLET_CURRENCY_UNSUPPORTED", "Wallet is currently available for JOD bookings only");

  let appliedAmount = 0;
  try {
    appliedAmount = await db.$transaction(async (tx) => {
      const duplicate = await tx.walletLedgerEntry.findUnique({where: {idempotencyKey: key}});
      if (duplicate) return Number(duplicate.amount) * -1;
      const wallet = await tx.walletAccount.upsert({where: {userId}, create: {userId, currency: WALLET_CURRENCY}, update: {}});
      if (wallet.currency !== booking.currency) badRequest("WALLET_CURRENCY_MISMATCH", "Wallet currency does not match the booking currency");
      const alreadyApplied = await walletAppliedToBookingWithClient(tx, bookingId);
      const remainingBeforeWallet = Math.max(0, roundMoney(Number(booking.totalAmount) - alreadyApplied));
      const amount = Math.min(requestedAmount, Number(wallet.balance), remainingBeforeWallet);
      const rounded = roundMoney(amount);
      if (rounded <= 0) badRequest("WALLET_BALANCE_EMPTY", "No wallet balance is available for this booking");

      const claimed = await tx.walletAccount.updateMany({
        where: {userId, balance: {gte: rounded}},
        data: {balance: {decrement: rounded}},
      });
      if (claimed.count !== 1) throw new ApplicationError("WALLET_BALANCE_CHANGED", "Wallet balance changed; refresh and try again", 409);
      await tx.walletLedgerEntry.create({data: {
        userId,
        bookingId,
        type: "BOOKING_DEBIT",
        amount: -rounded,
        currency: booking.currency,
        description: `Wallet applied to booking ${bookingId}`,
        idempotencyKey: key,
      }});
      const remaining = roundMoney(Number(booking.totalAmount) - alreadyApplied - rounded);
      if (remaining <= 0 && booking.paymentMode === "PAY_NOW") {
        await tx.booking.update({where: {id: bookingId}, data: {paymentState: "CAPTURED"}});
        await tx.bookingEvent.create({data: {bookingId, type: "PAYMENT_CAPTURED", actorUserId: userId, data: {provider: "HANDMEKEY_WALLET", amount: rounded, currency: booking.currency, fullyCovered: true}}});
      }
      return rounded;
    }, {isolationLevel: "Serializable"});
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const raced = await db.walletLedgerEntry.findUnique({where: {idempotencyKey: key}});
    if (!raced) throw error;
    appliedAmount = Number(raced.amount) * -1;
  }
  return walletBookingSummary(bookingId, userId, appliedAmount);
}

export async function walletAppliedToBooking(bookingId: string): Promise<number> {
  return walletAppliedToBookingWithClient(database(), bookingId);
}

export async function cancelBookingWithWallet(bookingId: string, idempotencyKey: string, context: BookingAccessContext) {
  const result = await cancelBooking(bookingId, idempotencyKey, context);
  const booking = await database().booking.findUnique({where: {id: bookingId}, select: {userId: true, refundableAmount: true}});
  if (!booking?.userId) return result;
  await reconcileBookingWalletRefund(bookingId, booking.userId, Number(booking.refundableAmount ?? 0), "Wallet credit returned after booking cancellation");
  return result;
}

export async function reconcileWalletRefunds(userId: string): Promise<number> {
  const db = database();
  const debits = await db.walletLedgerEntry.findMany({
    where: {userId, type: "BOOKING_DEBIT", bookingId: {not: null}},
    select: {bookingId: true},
    distinct: ["bookingId"],
  });
  const bookingIds = debits.flatMap((entry) => entry.bookingId ? [entry.bookingId] : []);
  if (!bookingIds.length) return 0;
  const bookings = await db.booking.findMany({
    where: {id: {in: bookingIds}, userId, status: {in: ["CANCELLED", "EXPIRED"]}},
    select: {id: true, status: true, totalAmount: true, refundableAmount: true},
  });
  let refunded = 0;
  for (const booking of bookings) {
    const cap = booking.status === "EXPIRED" ? Number(booking.totalAmount) : Number(booking.refundableAmount ?? 0);
    refunded += await reconcileBookingWalletRefund(booking.id, userId, cap, booking.status === "EXPIRED" ? "Wallet credit returned after booking hold expired" : "Wallet credit returned after booking cancellation");
  }
  return roundMoney(refunded);
}

export async function refundWalletForBookingWithClient(
  tx: WalletDb,
  bookingId: string,
  userId: string | null,
  maxRefundAmount: number,
  reason: string,
): Promise<number> {
  if (!userId || maxRefundAmount <= 0) return 0;
  const netApplied = await walletAppliedToBookingWithClient(tx, bookingId);
  const amount = roundMoney(Math.min(netApplied, maxRefundAmount));
  if (amount <= 0) return 0;
  const key = `WALLET_BOOKING_REFUND:${bookingId}`;
  const existing = await tx.walletLedgerEntry.findUnique({where: {idempotencyKey: key}});
  if (existing) return 0;
  await tx.walletAccount.upsert({where: {userId}, create: {userId, currency: WALLET_CURRENCY}, update: {}});
  await tx.walletLedgerEntry.create({data: {
    userId,
    bookingId,
    type: "BOOKING_REFUND",
    amount,
    currency: WALLET_CURRENCY,
    description: reason,
    idempotencyKey: key,
  }});
  await tx.walletAccount.update({where: {userId}, data: {balance: {increment: amount}}});
  return amount;
}

async function reconcileBookingWalletRefund(bookingId: string, userId: string, maxAmount: number, reason: string): Promise<number> {
  if (maxAmount <= 0) return 0;
  return database().$transaction(async (tx) => {
    const walletRefund = await refundWalletForBookingWithClient(tx, bookingId, userId, maxAmount, reason);
    if (walletRefund <= 0) return 0;

    let toRemoveFromProviderRefund = walletRefund;
    const automaticRefunds = await tx.refund.findMany({
      where: {bookingId, requestedByUserId: null, status: {in: ["REQUESTED", "APPROVED"]}},
      orderBy: {createdAt: "desc"},
    });
    for (const refund of automaticRefunds) {
      if (toRemoveFromProviderRefund <= 0) break;
      const amount = Number(refund.amount);
      if (amount <= toRemoveFromProviderRefund + 0.0001) {
        toRemoveFromProviderRefund = roundMoney(toRemoveFromProviderRefund - amount);
        await tx.refund.delete({where: {id: refund.id}});
      } else {
        await tx.refund.update({where: {id: refund.id}, data: {amount: roundMoney(amount - toRemoveFromProviderRefund)}});
        toRemoveFromProviderRefund = 0;
      }
    }
    return walletRefund;
  }, {isolationLevel: "Serializable"});
}

async function walletBookingSummary(bookingId: string, userId: string, justAppliedAmount: number) {
  const db = database();
  const [booking, wallet, appliedAmount] = await Promise.all([
    db.booking.findUnique({where: {id: bookingId}, select: {totalAmount: true, currency: true}}),
    db.walletAccount.findUnique({where: {userId}}),
    walletAppliedToBooking(bookingId),
  ]);
  if (!booking) notFound("Booking");
  return {
    appliedNow: roundMoney(justAppliedAmount),
    appliedAmount,
    remainingAmount: Math.max(0, roundMoney(Number(booking.totalAmount) - appliedAmount)),
    walletBalance: Number(wallet?.balance ?? 0),
    currency: booking.currency,
  };
}

async function walletAppliedToBookingWithClient(tx: WalletDb, bookingId: string): Promise<number> {
  const total = await tx.walletLedgerEntry.aggregate({
    where: {bookingId, type: {in: ["BOOKING_DEBIT", "BOOKING_REFUND"]}},
    _sum: {amount: true},
  });
  return Math.max(0, roundMoney(-Number(total._sum.amount ?? 0)));
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: string}).code === "P2002";
}
