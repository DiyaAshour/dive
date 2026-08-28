import {randomBytes} from "node:crypto";
import {roundMoney} from "@platform/core";
import type {AdminPayoutUpdate, PartnerSettlementPeriod} from "@platform/contracts";
import {database} from "@platform/database";
import {ApplicationError, badRequest, notFound} from "../errors";
import {requirePlatformAdmin} from "../admin/authorization";
import {requireHotelPermission} from "../hotels/authorization";

const DAY_MS = 86_400_000;
const SETTLED_BOOKING_STATUSES = ["CONFIRMED", "MODIFIED", "CANCELLED", "NO_SHOW"] as const;
const PAYMENT_CAPTURE_STATES = ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

type SettlementIssue = Readonly<{bookingId: string; reference: string; code: string; message: string; variance?: number}>;
type SettlementLine = Readonly<{
  bookingId: string;
  reference: string;
  departure: string;
  status: string;
  paymentMode: string;
  paymentState: string;
  totalAmount: number;
  expectedRetained: number;
  providerCaptured: number;
  providerRefunded: number;
  walletDebited: number;
  walletRefunded: number;
  actualRetained: number;
  commissionDue: number;
  partnerNet: number;
}>;

type SettlementSnapshot = Readonly<{
  hotelId: string;
  hotelName: string;
  currency: string;
  period: {from: string; to: string; basis: "DEPARTURE_DATE"};
  eligibleBookingCount: number;
  payAtHotelBookingCount: number;
  expectedCollected: number;
  actualCollected: number;
  completedRefunds: number;
  platformCommission: number;
  payAtHotelCommission: number;
  partnerNet: number;
  collectionVariance: number;
  issues: readonly SettlementIssue[];
  lines: readonly SettlementLine[];
}>;

export async function getHotelSettlementOverview(userId: string, hotelId: string, days = 30) {
  await requireHotelPermission(userId, hotelId, "finance:view");
  const safeDays = Math.max(1, Math.min(Math.trunc(days), 366));
  const to = utcDateOnly(new Date());
  const from = utcDateOnly(new Date(Date.now() - (safeDays - 1) * DAY_MS));
  const [snapshot, payouts, reconciliations] = await Promise.all([
    buildSettlementSnapshot(hotelId, {from, to}),
    database().partnerPayout.findMany({where: {hotelId}, orderBy: {createdAt: "desc"}, take: 24}),
    database().partnerReconciliation.findMany({where: {hotelId}, orderBy: {createdAt: "desc"}, take: 24}),
  ]);
  return {
    current: snapshot,
    payouts: payouts.map(payoutView),
    reconciliations: reconciliations.map(reconciliationView),
  };
}

export async function runPartnerReconciliation(userId: string, hotelId: string, input: PartnerSettlementPeriod) {
  await requireHotelPermission(userId, hotelId, "finance:manage");
  const snapshot = await buildSettlementSnapshot(hotelId, input);
  const status = snapshot.issues.length === 0 ? "CLEAN" as const : "REVIEW_REQUIRED" as const;
  const reconciliation = await database().partnerReconciliation.create({data: {
    hotelId,
    reconciliationNumber: reconciliationNumber(snapshot.period.from, snapshot.period.to, hotelId),
    periodStart: dateOnly(snapshot.period.from),
    periodEnd: dateOnly(snapshot.period.to),
    currency: snapshot.currency,
    status,
    eligibleBookingCount: snapshot.eligibleBookingCount,
    issueCount: snapshot.issues.length,
    expectedCollected: snapshot.expectedCollected,
    actualCollected: snapshot.actualCollected,
    completedRefunds: snapshot.completedRefunds,
    platformCommission: snapshot.platformCommission,
    payAtHotelCommission: snapshot.payAtHotelCommission,
    partnerNet: snapshot.partnerNet,
    collectionVariance: snapshot.collectionVariance,
    snapshot,
    createdByUserId: userId,
  }});
  await database().auditLog.create({data: {
    hotelId,
    actorUserId: userId,
    action: "PARTNER_RECONCILIATION_RUN",
    entityType: "PartnerReconciliation",
    entityId: reconciliation.id,
    after: {status, from: snapshot.period.from, to: snapshot.period.to, currency: snapshot.currency, issueCount: snapshot.issues.length, partnerNet: snapshot.partnerNet},
  }});
  return reconciliationView(reconciliation);
}

export async function createPartnerPayout(userId: string, hotelId: string, input: PartnerSettlementPeriod) {
  await requireHotelPermission(userId, hotelId, "finance:manage");
  const period = await resolvedPeriod(hotelId, input);
  const existing = await database().partnerPayout.findUnique({where: {hotelId_periodStart_periodEnd_currency: {
    hotelId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    currency: period.currency,
  }}});
  if (existing) return payoutView(existing);

  const snapshot = await buildSettlementSnapshot(hotelId, {from: period.from, to: period.to, currency: period.currency});
  if (snapshot.issues.length) {
    throw new ApplicationError("RECONCILIATION_REQUIRED", `Payout is blocked by ${snapshot.issues.length} reconciliation issue(s)`, 409);
  }
  if (snapshot.partnerNet <= 0) badRequest("NO_PAYOUT_DUE", "There is no positive platform-collected partner balance for this period");

  const result = await database().$transaction(async (tx) => {
    const raced = await tx.partnerPayout.findUnique({where: {hotelId_periodStart_periodEnd_currency: {
      hotelId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      currency: period.currency,
    }}});
    if (raced) return raced;

    const reconciliation = await tx.partnerReconciliation.create({data: {
      hotelId,
      reconciliationNumber: reconciliationNumber(period.from, period.to, hotelId),
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      currency: period.currency,
      status: "CLEAN",
      eligibleBookingCount: snapshot.eligibleBookingCount,
      issueCount: 0,
      expectedCollected: snapshot.expectedCollected,
      actualCollected: snapshot.actualCollected,
      completedRefunds: snapshot.completedRefunds,
      platformCommission: snapshot.platformCommission,
      payAtHotelCommission: snapshot.payAtHotelCommission,
      partnerNet: snapshot.partnerNet,
      collectionVariance: snapshot.collectionVariance,
      snapshot,
      createdByUserId: userId,
    }});
    const statement = await tx.partnerStatement.findUnique({where: {hotelId_periodStart_periodEnd_currency: {
      hotelId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      currency: period.currency,
    }}, select: {id: true}});
    const payout = await tx.partnerPayout.create({data: {
      hotelId,
      payoutNumber: payoutNumber(period.from, period.to, hotelId),
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      currency: period.currency,
      reconciliationId: reconciliation.id,
      statementId: statement?.id ?? null,
      platformCollectedGross: snapshot.actualCollected + snapshot.completedRefunds,
      completedRefunds: snapshot.completedRefunds,
      platformCommission: snapshot.platformCommission,
      payAtHotelCommission: snapshot.payAtHotelCommission,
      partnerNet: snapshot.partnerNet,
      status: "READY",
      snapshot: {...snapshot, payoutRule: "Only platform-collected PAY_NOW value for stays departing in the period is payable. PAY_AT_HOTEL commission is shown separately and is not silently netted from the payout."},
      createdByUserId: userId,
    }});
    await tx.auditLog.create({data: {
      hotelId,
      actorUserId: userId,
      action: "PARTNER_PAYOUT_CREATED",
      entityType: "PartnerPayout",
      entityId: payout.id,
      after: {payoutNumber: payout.payoutNumber, partnerNet: snapshot.partnerNet, currency: period.currency, reconciliationId: reconciliation.id, status: payout.status},
    }});
    return payout;
  });
  return payoutView(result);
}

export async function listPlatformPayoutQueue(adminUserId: string) {
  await requirePlatformAdmin(adminUserId);
  const payouts = await database().partnerPayout.findMany({orderBy: [{status: "asc"}, {createdAt: "desc"}], take: 250});
  const hotelIds = [...new Set(payouts.map((payout) => payout.hotelId))];
  const hotels = hotelIds.length ? await database().hotel.findMany({where: {id: {in: hotelIds}}, select: {id: true, name: true, city: true, countryCode: true}}) : [];
  const hotelById = new Map(hotels.map((hotel) => [hotel.id, hotel]));
  return payouts.map((payout) => ({...payoutView(payout), hotel: hotelById.get(payout.hotelId) ?? {id: payout.hotelId, name: "Unknown property", city: "", countryCode: ""}}));
}

export async function updatePlatformPayout(adminUserId: string, payoutId: string, input: AdminPayoutUpdate) {
  await requirePlatformAdmin(adminUserId);
  const payout = await database().partnerPayout.findUnique({where: {id: payoutId}});
  if (!payout) notFound("Partner payout");
  if (input.action === "PAID") {
    if (payout.status === "PAID") return payoutView(payout);
    if (payout.status === "VOID") throw new ApplicationError("PAYOUT_VOID", "A void payout cannot be marked paid", 409);
    const updated = await database().$transaction(async (tx) => {
      const row = await tx.partnerPayout.update({where: {id: payoutId}, data: {status: "PAID", externalReference: input.externalReference, paidByUserId: adminUserId, paidAt: new Date()}});
      await tx.partnerStatement.updateMany({where: {hotelId: payout.hotelId, periodStart: payout.periodStart, periodEnd: payout.periodEnd, currency: payout.currency, status: "ISSUED"}, data: {status: "PAID"}});
      await tx.auditLog.create({data: {hotelId: payout.hotelId, actorUserId: adminUserId, action: "PARTNER_PAYOUT_PAID", entityType: "PartnerPayout", entityId: payoutId, before: {status: payout.status}, after: {status: "PAID", externalReference: input.externalReference}}});
      return row;
    });
    return payoutView(updated);
  }

  if (payout.status === "PAID") throw new ApplicationError("PAYOUT_ALREADY_PAID", "A paid payout cannot be voided", 409);
  if (payout.status === "VOID") return payoutView(payout);
  const updated = await database().$transaction(async (tx) => {
    const row = await tx.partnerPayout.update({where: {id: payoutId}, data: {status: "VOID", voidedAt: new Date()}});
    await tx.auditLog.create({data: {hotelId: payout.hotelId, actorUserId: adminUserId, action: "PARTNER_PAYOUT_VOIDED", entityType: "PartnerPayout", entityId: payoutId, before: {status: payout.status}, after: {status: "VOID", note: input.note ?? null}}});
    return row;
  });
  return payoutView(updated);
}

async function buildSettlementSnapshot(hotelId: string, input: PartnerSettlementPeriod): Promise<SettlementSnapshot> {
  const period = await resolvedPeriod(hotelId, input);
  const endExclusive = new Date(period.periodEnd.getTime() + DAY_MS);
  const bookings = await database().booking.findMany({
    where: {
      hotelId,
      currency: period.currency,
      departure: {gte: period.periodStart, lt: endExclusive},
      status: {in: [...SETTLED_BOOKING_STATUSES]},
    },
    select: {
      id: true,
      reference: true,
      departure: true,
      status: true,
      paymentMode: true,
      paymentState: true,
      totalAmount: true,
      commissionAmount: true,
      refundableAmount: true,
      cancellationPenaltyAmount: true,
      paymentAttempts: {where: {status: "CAPTURED"}, select: {amount: true}},
      refunds: {where: {status: "COMPLETED"}, select: {amount: true}},
    },
    orderBy: [{departure: "asc"}, {reference: "asc"}],
    take: 5000,
  });
  const bookingIds = bookings.map((booking) => booking.id);
  const walletEntries = bookingIds.length ? await database().walletLedgerEntry.findMany({
    where: {bookingId: {in: bookingIds}, type: {in: ["BOOKING_DEBIT", "BOOKING_REFUND"]}},
    select: {bookingId: true, type: true, amount: true},
  }) : [];
  const walletByBooking = new Map<string, {debited: number; refunded: number}>();
  for (const entry of walletEntries) {
    if (!entry.bookingId) continue;
    const current = walletByBooking.get(entry.bookingId) ?? {debited: 0, refunded: 0};
    if (entry.type === "BOOKING_DEBIT") current.debited = roundMoney(current.debited + Math.max(0, -Number(entry.amount)));
    if (entry.type === "BOOKING_REFUND") current.refunded = roundMoney(current.refunded + Math.max(0, Number(entry.amount)));
    walletByBooking.set(entry.bookingId, current);
  }

  const issues: SettlementIssue[] = [];
  const lines: SettlementLine[] = [];
  let eligibleBookingCount = 0;
  let payAtHotelBookingCount = 0;
  let expectedCollected = 0;
  let actualCollected = 0;
  let completedRefunds = 0;
  let platformCommission = 0;
  let payAtHotelCommission = 0;
  let partnerNet = 0;

  for (const booking of bookings) {
    const totalAmount = roundMoney(Number(booking.totalAmount));
    const refundable = Math.max(0, roundMoney(Number(booking.refundableAmount ?? 0)));
    const expectedRetained = booking.status === "CANCELLED" || booking.status === "NO_SHOW"
      ? Math.max(0, roundMoney(totalAmount - refundable))
      : totalAmount;
    const providerCaptured = roundMoney(booking.paymentAttempts.reduce((sum, attempt) => sum + Number(attempt.amount), 0));
    const providerRefunded = roundMoney(booking.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0));
    const wallet = walletByBooking.get(booking.id) ?? {debited: 0, refunded: 0};
    const walletRetained = Math.max(0, roundMoney(wallet.debited - wallet.refunded));
    const actualRetained = roundMoney(providerCaptured - providerRefunded + walletRetained);
    const baseCommission = Math.max(0, roundMoney(Number(booking.commissionAmount)));
    const commissionDue = totalAmount > 0 ? roundMoney(baseCommission * (expectedRetained / totalAmount)) : 0;
    const linePartnerNet = booking.paymentMode === "PAY_NOW" ? roundMoney(expectedRetained - commissionDue) : 0;

    if (booking.paymentMode === "PAY_NOW") {
      eligibleBookingCount += 1;
      expectedCollected = roundMoney(expectedCollected + expectedRetained);
      actualCollected = roundMoney(actualCollected + actualRetained);
      completedRefunds = roundMoney(completedRefunds + providerRefunded + wallet.refunded);
      platformCommission = roundMoney(platformCommission + commissionDue);
      partnerNet = roundMoney(partnerNet + linePartnerNet);
      const paymentStateOk = PAYMENT_CAPTURE_STATES.includes(booking.paymentState as (typeof PAYMENT_CAPTURE_STATES)[number]);
      if (!paymentStateOk) issues.push({bookingId: booking.id, reference: booking.reference, code: "PAYMENT_STATE_NOT_SETTLED", message: `PAY_NOW booking is ${booking.paymentState}, not captured/refunded.`});
      const variance = roundMoney(actualRetained - expectedRetained);
      if (Math.abs(variance) > 0.01) issues.push({bookingId: booking.id, reference: booking.reference, code: "COLLECTION_MISMATCH", message: `Platform-retained value differs from the booking settlement snapshot by ${variance.toFixed(2)} ${period.currency}.`, variance});
      const originalCaptured = roundMoney(providerCaptured + wallet.debited);
      if (originalCaptured > totalAmount + 0.01) issues.push({bookingId: booking.id, reference: booking.reference, code: "OVER_CAPTURED", message: `Captured value ${originalCaptured.toFixed(2)} exceeds booking total ${totalAmount.toFixed(2)}.`});
      if (providerRefunded + wallet.refunded > originalCaptured + 0.01) issues.push({bookingId: booking.id, reference: booking.reference, code: "OVER_REFUNDED", message: "Completed refunds exceed captured platform value."});
      if (linePartnerNet < -0.01) issues.push({bookingId: booking.id, reference: booking.reference, code: "NEGATIVE_PARTNER_NET", message: "Partner net became negative and requires finance review."});
    } else {
      payAtHotelBookingCount += 1;
      payAtHotelCommission = roundMoney(payAtHotelCommission + commissionDue);
      if (providerCaptured > 0.01 || wallet.debited > 0.01) issues.push({bookingId: booking.id, reference: booking.reference, code: "UNEXPECTED_PLATFORM_CAPTURE", message: "PAY_AT_HOTEL booking contains platform-captured value."});
    }

    lines.push({
      bookingId: booking.id,
      reference: booking.reference,
      departure: utcDateOnly(booking.departure),
      status: booking.status,
      paymentMode: booking.paymentMode,
      paymentState: booking.paymentState,
      totalAmount,
      expectedRetained,
      providerCaptured,
      providerRefunded,
      walletDebited: wallet.debited,
      walletRefunded: wallet.refunded,
      actualRetained,
      commissionDue,
      partnerNet: linePartnerNet,
    });
  }

  return {
    hotelId,
    hotelName: period.hotelName,
    currency: period.currency,
    period: {from: period.from, to: period.to, basis: "DEPARTURE_DATE"},
    eligibleBookingCount,
    payAtHotelBookingCount,
    expectedCollected,
    actualCollected,
    completedRefunds,
    platformCommission,
    payAtHotelCommission,
    partnerNet,
    collectionVariance: roundMoney(actualCollected - expectedCollected),
    issues,
    lines,
  };
}

async function resolvedPeriod(hotelId: string, input: PartnerSettlementPeriod) {
  const periodStart = dateOnly(input.from);
  const periodEnd = dateOnly(input.to);
  if (periodEnd < periodStart) badRequest("INVALID_SETTLEMENT_PERIOD", "Settlement end date must be on or after start date");
  if ((periodEnd.getTime() - periodStart.getTime()) / DAY_MS > 366) badRequest("SETTLEMENT_PERIOD_TOO_LARGE", "Settlement periods cannot exceed 367 calendar days");
  const hotel = await database().hotel.findUnique({where: {id: hotelId}, select: {id: true, name: true, currency: true}});
  if (!hotel) notFound("Hotel");
  const currency = (input.currency ?? hotel.currency).trim().toUpperCase();
  return {from: input.from, to: input.to, periodStart, periodEnd, currency, hotelName: hotel.name};
}

function reconciliationView(row: {id:string;hotelId:string;reconciliationNumber:string;periodStart:Date;periodEnd:Date;currency:string;status:string;eligibleBookingCount:number;issueCount:number;expectedCollected:unknown;actualCollected:unknown;completedRefunds:unknown;platformCommission:unknown;payAtHotelCommission:unknown;partnerNet:unknown;collectionVariance:unknown;snapshot:unknown;createdByUserId:string;createdAt:Date}) {
  return {...row, expectedCollected:Number(row.expectedCollected), actualCollected:Number(row.actualCollected), completedRefunds:Number(row.completedRefunds), platformCommission:Number(row.platformCommission), payAtHotelCommission:Number(row.payAtHotelCommission), partnerNet:Number(row.partnerNet), collectionVariance:Number(row.collectionVariance)};
}

function payoutView(row: {id:string;hotelId:string;payoutNumber:string;periodStart:Date;periodEnd:Date;currency:string;reconciliationId:string;statementId:string|null;platformCollectedGross:unknown;completedRefunds:unknown;platformCommission:unknown;payAtHotelCommission:unknown;partnerNet:unknown;status:string;externalReference:string|null;snapshot:unknown;createdByUserId:string;paidByUserId:string|null;paidAt:Date|null;voidedAt:Date|null;createdAt:Date;updatedAt:Date}) {
  return {...row, platformCollectedGross:Number(row.platformCollectedGross), completedRefunds:Number(row.completedRefunds), platformCommission:Number(row.platformCommission), payAtHotelCommission:Number(row.payAtHotelCommission), partnerNet:Number(row.partnerNet)};
}

function dateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) badRequest("INVALID_DATE", "Use YYYY-MM-DD dates");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || utcDateOnly(parsed) !== value) badRequest("INVALID_DATE", `Invalid date: ${value}`);
  return parsed;
}

function utcDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function reconciliationNumber(from: string, to: string, hotelId: string) {
  return `HMK-RC-${compactDate(from)}-${compactDate(to)}-${hotelId.slice(-5).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function payoutNumber(from: string, to: string, hotelId: string) {
  return `HMK-PO-${compactDate(from)}-${compactDate(to)}-${hotelId.slice(-6).toUpperCase()}`;
}

function compactDate(value: string) {
  return value.replaceAll("-", "");
}
