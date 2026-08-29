import {randomUUID} from "node:crypto";
import {loyaltyTierForNights, type HandMeKeyLoyaltyTier} from "@platform/core";
import type {LoyaltyMemberUpdateInput, LoyaltyPointsAdjustmentInput, LoyaltyProgramSettingsInput} from "@platform/contracts";
import {database} from "@platform/database";
import {badRequest, notFound} from "../errors";
import {requirePlatformAdmin} from "../admin/authorization";
import {getLoyaltyProgramConfig, LOYALTY_PROGRAM_CONFIG_ID, loyaltyRuleSetFromProgram, mapProgramSettings} from "./config";

const USER_LIMIT = 50;
const LEDGER_LIMIT = 50;

export async function getAdminRewardsControlCenter(adminUserId: string, options: {search?: string; userId?: string} = {}) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const program = await getLoyaltyProgramConfig();
  const search = options.search?.trim().slice(0, 160) ?? "";
  const where = search ? {
    OR: [
      {email: {contains: search, mode: "insensitive" as const}},
      {displayName: {contains: search, mode: "insensitive" as const}},
    ],
  } : {};

  const [users, accountCount, activeCount, suspendedCount, pointAggregate] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{createdAt: "desc"}],
      take: USER_LIMIT,
      select: {id: true, email: true, displayName: true, platformRole: true, createdAt: true},
    }),
    db.loyaltyAccount.count(),
    db.loyaltyAccount.count({where: {status: "ACTIVE"}}),
    db.loyaltyAccount.count({where: {status: "SUSPENDED"}}),
    db.loyaltyAccount.aggregate({_sum: {pointsBalance: true, lifetimePointsEarned: true}}),
  ]);

  const userIds = users.map((user) => user.id);
  const [accounts, wallets] = await Promise.all([
    userIds.length ? db.loyaltyAccount.findMany({where: {userId: {in: userIds}}}) : Promise.resolve([]),
    userIds.length ? db.walletAccount.findMany({where: {userId: {in: userIds}}, select: {userId: true, balance: true, currency: true}}) : Promise.resolve([]),
  ]);
  const accountMap = new Map(accounts.map((account) => [account.userId, account]));
  const walletMap = new Map(wallets.map((wallet) => [wallet.userId, wallet]));

  const members = users.map((user) => {
    const account = accountMap.get(user.id);
    const wallet = walletMap.get(user.id);
    return {
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      platformRole: user.platformRole,
      createdAt: user.createdAt,
      status: account?.status ?? "ACTIVE" as const,
      tier: (account?.tier ?? "MEMBER") as HandMeKeyLoyaltyTier,
      tierOverride: (account?.tierOverride ?? null) as HandMeKeyLoyaltyTier | null,
      pointsBalance: account?.pointsBalance ?? 0,
      lifetimePointsEarned: account?.lifetimePointsEarned ?? 0,
      qualifyingNights: account?.qualifyingNights ?? 0,
      qualifyingStays: account?.qualifyingStays ?? 0,
      walletBalance: Number(wallet?.balance ?? 0),
      walletCurrency: wallet?.currency ?? "JOD",
    };
  });

  const selectedUserId = options.userId?.trim() || members[0]?.userId || null;
  const selectedMember = selectedUserId ? await getAdminRewardsMemberDetail(adminUserId, selectedUserId, false) : null;

  return {
    program,
    summary: {
      accounts: accountCount,
      active: activeCount,
      suspended: suspendedCount,
      pointsOutstanding: pointAggregate._sum.pointsBalance ?? 0,
      lifetimePointsEarned: pointAggregate._sum.lifetimePointsEarned ?? 0,
    },
    members,
    selectedMember,
  };
}

export async function getAdminRewardsMemberDetail(adminUserId: string, userId: string, verifyAdmin = true) {
  if (verifyAdmin) await requirePlatformAdmin(adminUserId);
  const db = database();
  const user = await db.user.findUnique({
    where: {id: userId},
    select: {id: true, email: true, displayName: true, platformRole: true, createdAt: true},
  });
  if (!user) notFound("User");
  const [account, wallet, ledger] = await Promise.all([
    db.loyaltyAccount.upsert({where: {userId}, create: {userId}, update: {}}),
    db.walletAccount.findUnique({where: {userId}, select: {balance: true, currency: true}}),
    db.loyaltyLedgerEntry.findMany({
      where: {userId},
      orderBy: {createdAt: "desc"},
      take: LEDGER_LIMIT,
      select: {id: true, bookingId: true, type: true, points: true, currency: true, eligibleAmount: true, pointsPerUnit: true, tierAtPosting: true, description: true, createdAt: true},
    }),
  ]);
  return {
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
    platformRole: user.platformRole,
    createdAt: user.createdAt,
    status: account.status,
    tier: account.tier as HandMeKeyLoyaltyTier,
    tierOverride: account.tierOverride as HandMeKeyLoyaltyTier | null,
    pointsBalance: account.pointsBalance,
    lifetimePointsEarned: account.lifetimePointsEarned,
    qualifyingNights: account.qualifyingNights,
    qualifyingStays: account.qualifyingStays,
    walletBalance: Number(wallet?.balance ?? 0),
    walletCurrency: wallet?.currency ?? "JOD",
    ledger: ledger.map((entry) => ({
      ...entry,
      eligibleAmount: entry.eligibleAmount === null ? null : Number(entry.eligibleAmount),
      tierAtPosting: entry.tierAtPosting as HandMeKeyLoyaltyTier,
    })),
  };
}

export async function updateAdminRewardsProgram(adminUserId: string, input: LoyaltyProgramSettingsInput) {
  await requirePlatformAdmin(adminUserId);
  validateProgramInput(input);
  const db = database();
  const before = await getLoyaltyProgramConfig();
  const row = await db.$transaction(async (tx) => {
    const updated = await tx.loyaltyProgramConfig.upsert({
      where: {id: LOYALTY_PROGRAM_CONFIG_ID},
      create: {id: LOYALTY_PROGRAM_CONFIG_ID, ...input, updatedByUserId: adminUserId},
      update: {...input, updatedByUserId: adminUserId},
    });
    await tx.auditLog.create({data: {
      actorUserId: adminUserId,
      action: "REWARDS_PROGRAM_UPDATED",
      entityType: "LoyaltyProgramConfig",
      entityId: LOYALTY_PROGRAM_CONFIG_ID,
      before: jsonValue(before),
      after: jsonValue(mapProgramSettings(updated)),
    }});
    return updated;
  });
  return mapProgramSettings(row);
}

export async function updateAdminRewardsMember(adminUserId: string, userId: string, input: LoyaltyMemberUpdateInput) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const user = await db.user.findUnique({where: {id: userId}, select: {id: true}});
  if (!user) notFound("User");
  const program = await getLoyaltyProgramConfig();
  const rules = loyaltyRuleSetFromProgram(program);

  await db.$transaction(async (tx) => {
    const before = await tx.loyaltyAccount.upsert({where: {userId}, create: {userId}, update: {}});
    const tier = (input.tierOverride ?? loyaltyTierForNights(input.qualifyingNights, rules)) as HandMeKeyLoyaltyTier;
    const after = await tx.loyaltyAccount.update({
      where: {userId},
      data: {
        status: input.status,
        tierOverride: input.tierOverride,
        tier,
        qualifyingNights: input.qualifyingNights,
        qualifyingStays: input.qualifyingStays,
      },
    });
    await tx.auditLog.create({data: {
      actorUserId: adminUserId,
      action: "REWARDS_MEMBERSHIP_UPDATED",
      entityType: "LoyaltyAccount",
      entityId: userId,
      before: jsonValue(accountSnapshot(before)),
      after: jsonValue({...accountSnapshot(after), reason: input.reason}),
    }});
  });
  return getAdminRewardsMemberDetail(adminUserId, userId, false);
}

export async function adjustAdminRewardsPoints(adminUserId: string, userId: string, input: LoyaltyPointsAdjustmentInput) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const user = await db.user.findUnique({where: {id: userId}, select: {id: true}});
  if (!user) notFound("User");

  await db.$transaction(async (tx) => {
    const account = await tx.loyaltyAccount.upsert({where: {userId}, create: {userId}, update: {}});
    const delta = input.mode === "ADD" ? input.points : input.mode === "REMOVE" ? -input.points : input.points - account.pointsBalance;
    if (delta === 0) badRequest("REWARDS_ADJUSTMENT_NOOP", "The requested points change does not alter the balance");
    const nextBalance = account.pointsBalance + delta;
    if (nextBalance < 0) badRequest("REWARDS_BALANCE_NEGATIVE", "Points balance cannot be negative");
    if (nextBalance > 2_000_000_000) badRequest("REWARDS_BALANCE_TOO_LARGE", "Points balance is too large");

    await tx.loyaltyLedgerEntry.create({data: {
      userId,
      type: "ADJUSTMENT",
      points: delta,
      tierAtPosting: account.tier,
      description: `Admin adjustment · ${input.reason}`,
      idempotencyKey: `ADMIN_REWARDS:${adminUserId}:${userId}:${randomUUID()}`,
    }});
    const after = await tx.loyaltyAccount.update({where: {userId}, data: {pointsBalance: nextBalance}});
    await tx.auditLog.create({data: {
      actorUserId: adminUserId,
      action: "REWARDS_POINTS_ADJUSTED",
      entityType: "LoyaltyAccount",
      entityId: userId,
      before: jsonValue({pointsBalance: account.pointsBalance}),
      after: jsonValue({pointsBalance: after.pointsBalance, delta, mode: input.mode, reason: input.reason}),
    }});
  }, {isolationLevel: "Serializable"});
  return getAdminRewardsMemberDetail(adminUserId, userId, false);
}

function validateProgramInput(input: LoyaltyProgramSettingsInput) {
  if (input.blackMinimumNights <= input.goldMinimumNights) badRequest("INVALID_REWARDS_TIERS", "Black tier must require more nights than Gold");
  if (input.minimumRedemptionPoints < input.redemptionStepPoints || input.minimumRedemptionPoints % input.redemptionStepPoints !== 0) {
    badRequest("INVALID_REDEMPTION_RULES", "Minimum redemption must be divisible by the redemption step");
  }
}

function accountSnapshot(account: {status: string; tier: string; tierOverride: string | null; pointsBalance: number; lifetimePointsEarned: number; qualifyingNights: number; qualifyingStays: number}) {
  return {
    status: account.status,
    tier: account.tier,
    tierOverride: account.tierOverride,
    pointsBalance: account.pointsBalance,
    lifetimePointsEarned: account.lifetimePointsEarned,
    qualifyingNights: account.qualifyingNights,
    qualifyingStays: account.qualifyingStays,
  };
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
