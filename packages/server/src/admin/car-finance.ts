import {database} from "@platform/database";
import {badRequest, notFound} from "../errors";
import {requirePlatformAdmin} from "./authorization";

type FinanceFilters = Readonly<{
  companyId?: string;
  from?: string;
  to?: string;
}>;

type SettlementInput = Readonly<{
  companyId: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}>;

const PLATFORM_ELIGIBLE_STATUSES = ["CONFIRMED", "MODIFIED", "COMPLETED"] as const;

export async function getAdminCarFinance(adminUserId: string, filters: FinanceFilters = {}) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const companies = await db.carRentalCompany.findMany({
    orderBy: {name: "asc"},
    select: {id: true, name: true, slug: true, status: true, verified: true, currency: true, commissionRate: true},
  });

  if (!companies.length) {
    return {
      companies: [],
      selectedCompany: null,
      period: defaultPeriod(),
      metrics: emptyMetrics(),
      reservations: [],
      settlements: [],
      transactions: [],
    };
  }

  const selectedCompany = companies.find((company) => company.id === filters.companyId) ?? companies[0];
  const period = resolvePeriod(filters.from, filters.to);
  const range = inclusiveRange(period.from, period.to);

  const reservations = await db.carReservation.findMany({
    where: {
      companyId: selectedCompany.id,
      OR: [
        {createdAt: {gte: range.start, lt: range.endExclusive}},
        {returnAt: {gte: range.start, lt: range.endExclusive}},
      ],
    },
    orderBy: {createdAt: "desc"},
    take: 500,
    include: {vehicle: true},
  });

  const reservationIds = reservations.map((row) => row.id);
  const [settledItems, settlements, transactions, ledgerAggregate] = await Promise.all([
    reservationIds.length ? db.carFinanceSettlementItem.findMany({
      where: {reservationId: {in: reservationIds}},
      select: {reservationId: true, settlementId: true},
    }) : Promise.resolve([]),
    db.carFinanceSettlement.findMany({
      where: {companyId: selectedCompany.id},
      orderBy: {createdAt: "desc"},
      take: 30,
    }),
    db.carFinanceTransaction.findMany({
      where: {companyId: selectedCompany.id},
      orderBy: {createdAt: "desc"},
      take: 80,
    }),
    db.carFinanceTransaction.aggregate({
      where: {companyId: selectedCompany.id},
      _sum: {companyBalanceDelta: true},
    }),
  ]);

  const settledByReservation = new Map(settledItems.map((item) => [item.reservationId, item.settlementId]));
  const rows = reservations.map((row) => financeReservation(row, settledByReservation.get(row.id) ?? null));
  const eligible = rows.filter((row) => row.financeEligible);
  const unsettled = eligible.filter((row) => !row.settlementId);

  const platformCollected = moneySum(eligible.filter((row) => row.collectedBy === "HANDMEKEY").map((row) => row.total));
  const companyCollected = moneySum(eligible.filter((row) => row.collectedBy === "COMPANY").map((row) => row.total));
  const commission = moneySum(eligible.map((row) => row.platformCommission));
  const companyPayable = moneySum(unsettled.map((row) => row.companyPayable));
  const commissionReceivable = moneySum(unsettled.map((row) => row.commissionReceivable));
  const unsettledNet = roundMoney(companyPayable - commissionReceivable);
  const ledgerBalance = roundMoney(Number(ledgerAggregate._sum.companyBalanceDelta ?? 0));
  const accountBalance = roundMoney(ledgerBalance + unsettledNet);

  return {
    companies: companies.map((company) => ({
      ...company,
      commissionRate: Number(company.commissionRate),
    })),
    selectedCompany: {
      ...selectedCompany,
      commissionRate: Number(selectedCompany.commissionRate),
    },
    period,
    metrics: {
      bookingCount: eligible.length,
      unsettledBookingCount: unsettled.length,
      grossBookingValue: moneySum(eligible.map((row) => row.total)),
      platformCollected,
      companyCollected,
      platformCommission: commission,
      companyPayable,
      commissionReceivable,
      unsettledNet,
      ledgerBalance,
      accountBalance,
    },
    reservations: rows,
    settlements: settlements.map(serializeSettlement),
    transactions: transactions.map((row) => ({
      id: row.id,
      reservationId: row.reservationId,
      settlementId: row.settlementId,
      type: row.type,
      currency: row.currency,
      amount: Number(row.amount),
      companyBalanceDelta: Number(row.companyBalanceDelta),
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function createAdminCarSettlement(adminUserId: string, input: SettlementInput) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const company = await db.carRentalCompany.findUnique({where: {id: input.companyId}});
  if (!company) notFound("Car rental company");

  const period = resolvePeriod(input.periodStart, input.periodEnd);
  const range = inclusiveRange(period.from, period.to);
  const candidates = await db.carReservation.findMany({
    where: {
      companyId: company.id,
      OR: [
        {paymentMode: "PAY_NOW", status: {in: [...PLATFORM_ELIGIBLE_STATUSES]}, createdAt: {gte: range.start, lt: range.endExclusive}},
        {paymentMode: "PAY_AT_COUNTER", status: "COMPLETED", returnAt: {gte: range.start, lt: range.endExclusive}},
      ],
    },
    orderBy: {createdAt: "asc"},
    include: {vehicle: true},
  });

  if (!candidates.length) badRequest("CAR_SETTLEMENT_EMPTY", "No financially eligible car bookings were found in this period");
  const existing = await db.carFinanceSettlementItem.findMany({
    where: {reservationId: {in: candidates.map((row) => row.id)}},
    select: {reservationId: true},
  });
  const alreadySettled = new Set(existing.map((row) => row.reservationId));
  const reservations = candidates.filter((row) => !alreadySettled.has(row.id));
  if (!reservations.length) badRequest("CAR_SETTLEMENT_ALREADY_RECONCILED", "All eligible bookings in this period are already in a settlement");

  const items = reservations.map((row) => financeReservation(row, null));
  const grossBookingValue = moneySum(items.map((item) => item.total));
  const platformCollectedGross = moneySum(items.filter((item) => item.collectedBy === "HANDMEKEY").map((item) => item.total));
  const companyCollectedGross = moneySum(items.filter((item) => item.collectedBy === "COMPANY").map((item) => item.total));
  const platformCommission = moneySum(items.map((item) => item.platformCommission));
  const companyCommissionReceivable = moneySum(items.map((item) => item.commissionReceivable));
  const companyGrossPayable = moneySum(items.map((item) => item.companyPayable));
  const signedNet = roundMoney(companyGrossPayable - companyCommissionReceivable);
  const direction = signedNet > 0 ? "PLATFORM_OWES_COMPANY" : signedNet < 0 ? "COMPANY_OWES_PLATFORM" : "BALANCED";
  const netAmount = Math.abs(signedNet);
  const settlementNumber = makeSettlementNumber();

  const settlement = await db.$transaction(async (tx) => {
    const created = await tx.carFinanceSettlement.create({
      data: {
        companyId: company.id,
        settlementNumber,
        periodStart: range.start,
        periodEnd: new Date(`${period.to}T00:00:00.000Z`),
        currency: company.currency,
        bookingCount: items.length,
        grossBookingValue,
        platformCollectedGross,
        companyCollectedGross,
        platformCommission,
        companyCommissionReceivable,
        companyGrossPayable,
        netAmount,
        direction,
        status: "READY",
        notes: input.notes?.trim().slice(0, 3000) || null,
        snapshot: {
          signedNet,
          commissionRateAtCompanyLevel: Number(company.commissionRate),
          reservations: items.map((item) => ({
            reservationId: item.id,
            reference: item.reference,
            paymentMode: item.paymentMode,
            collectedBy: item.collectedBy,
            gross: item.total,
            commission: item.platformCommission,
            companyPayable: item.companyPayable,
            commissionReceivable: item.commissionReceivable,
          })),
        },
        createdByUserId: adminUserId,
      },
    });

    await tx.carFinanceSettlementItem.createMany({
      data: items.map((item) => ({
        settlementId: created.id,
        reservationId: item.id,
        reservationReference: item.reference,
        paymentMode: item.paymentMode,
        grossAmount: item.total,
        commissionAmount: item.platformCommission,
        companyPayable: item.companyPayable,
        companyReceivable: item.commissionReceivable,
        netCompanyDelta: roundMoney(item.companyPayable - item.commissionReceivable),
      })),
    });

    const ledgerRows = items.flatMap((item) => {
      if (item.collectedBy === "HANDMEKEY") {
        return [
          {
            companyId: company.id,
            reservationId: item.id,
            settlementId: created.id,
            type: "CUSTOMER_PAYMENT" as const,
            currency: company.currency,
            amount: item.total,
            companyBalanceDelta: item.total,
            metadata: {reference: item.reference, collector: "HANDMEKEY"},
            createdByUserId: adminUserId,
          },
          {
            companyId: company.id,
            reservationId: item.id,
            settlementId: created.id,
            type: "PLATFORM_COMMISSION" as const,
            currency: company.currency,
            amount: item.platformCommission,
            companyBalanceDelta: -item.platformCommission,
            metadata: {reference: item.reference, collector: "HANDMEKEY", withheld: true},
            createdByUserId: adminUserId,
          },
        ];
      }
      return [
        {
          companyId: company.id,
          reservationId: item.id,
          settlementId: created.id,
          type: "COMPANY_COLLECTED_PAYMENT" as const,
          currency: company.currency,
          amount: item.total,
          companyBalanceDelta: 0,
          metadata: {reference: item.reference, collector: "COMPANY"},
          createdByUserId: adminUserId,
        },
        {
          companyId: company.id,
          reservationId: item.id,
          settlementId: created.id,
          type: "PLATFORM_COMMISSION" as const,
          currency: company.currency,
          amount: item.platformCommission,
          companyBalanceDelta: -item.platformCommission,
          metadata: {reference: item.reference, collector: "COMPANY", receivable: true},
          createdByUserId: adminUserId,
        },
      ];
    });
    await tx.carFinanceTransaction.createMany({data: ledgerRows});

    await tx.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: "CAR_FINANCE_SETTLEMENT_CREATED",
        entityType: "CarFinanceSettlement",
        entityId: created.id,
        after: {
          settlementNumber,
          companyId: company.id,
          bookingCount: items.length,
          signedNet,
          direction,
          periodStart: period.from,
          periodEnd: period.to,
        },
      },
    });
    return created;
  });

  return serializeSettlement(settlement);
}

export async function markAdminCarSettlementPaid(adminUserId: string, settlementId: string, externalReference?: string, notes?: string) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const settlement = await db.carFinanceSettlement.findUnique({where: {id: settlementId}});
  if (!settlement) notFound("Car finance settlement");
  if (settlement.status !== "READY") badRequest("CAR_SETTLEMENT_NOT_PAYABLE", "Only ready settlements can be marked paid");

  const reference = externalReference?.trim().slice(0, 300) || null;
  if (settlement.direction !== "BALANCED" && !reference) {
    badRequest("CAR_SETTLEMENT_REFERENCE_REQUIRED", "A bank or payment reference is required");
  }

  const paid = await db.$transaction(async (tx) => {
    const updated = await tx.carFinanceSettlement.update({
      where: {id: settlement.id},
      data: {
        status: "PAID",
        externalReference: reference,
        notes: notes?.trim().slice(0, 3000) || settlement.notes,
        paidByUserId: adminUserId,
        paidAt: new Date(),
      },
    });

    const amount = Number(settlement.netAmount);
    if (amount > 0 && settlement.direction !== "BALANCED") {
      await tx.carFinanceTransaction.create({
        data: {
          companyId: settlement.companyId,
          settlementId: settlement.id,
          type: settlement.direction === "PLATFORM_OWES_COMPANY" ? "COMPANY_PAYOUT" : "COMPANY_REMITTANCE",
          currency: settlement.currency,
          amount,
          companyBalanceDelta: settlement.direction === "PLATFORM_OWES_COMPANY" ? -amount : amount,
          metadata: {settlementNumber: settlement.settlementNumber, externalReference: reference},
          createdByUserId: adminUserId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: "CAR_FINANCE_SETTLEMENT_PAID",
        entityType: "CarFinanceSettlement",
        entityId: settlement.id,
        before: {status: settlement.status},
        after: {
          status: "PAID",
          direction: settlement.direction,
          amount,
          externalReference: reference,
        },
      },
    });
    return updated;
  });

  return serializeSettlement(paid);
}

function financeReservation(row: any, settlementId: string | null) {
  const total = Number(row.total);
  const commissionRate = Number(row.commissionRate);
  const platformCommission = Number(row.commissionAmount);
  const collectedBy = row.paymentMode === "PAY_NOW" ? "HANDMEKEY" : "COMPANY";
  const financeEligible = collectedBy === "HANDMEKEY"
    ? PLATFORM_ELIGIBLE_STATUSES.includes(row.status)
    : row.status === "COMPLETED";
  const companyPayable = financeEligible && collectedBy === "HANDMEKEY" ? roundMoney(total - platformCommission) : 0;
  const commissionReceivable = financeEligible && collectedBy === "COMPANY" ? platformCommission : 0;

  return {
    id: row.id,
    reference: row.reference,
    guestName: row.guestName,
    vehicle: `${row.vehicle.make} ${row.vehicle.model}`,
    status: row.status,
    paymentMode: row.paymentMode,
    collectedBy,
    financeEligible,
    currency: row.currency,
    total,
    commissionRate,
    platformCommission,
    companyPayable,
    commissionReceivable,
    netCompanyDelta: roundMoney(companyPayable - commissionReceivable),
    settlementId,
    pickupAt: row.pickupAt.toISOString(),
    returnAt: row.returnAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeSettlement(row: any) {
  return {
    id: row.id,
    companyId: row.companyId,
    settlementNumber: row.settlementNumber,
    periodStart: isoDate(row.periodStart),
    periodEnd: isoDate(row.periodEnd),
    currency: row.currency,
    bookingCount: row.bookingCount,
    grossBookingValue: Number(row.grossBookingValue),
    platformCollectedGross: Number(row.platformCollectedGross),
    companyCollectedGross: Number(row.companyCollectedGross),
    platformCommission: Number(row.platformCommission),
    companyCommissionReceivable: Number(row.companyCommissionReceivable),
    companyGrossPayable: Number(row.companyGrossPayable),
    netAmount: Number(row.netAmount),
    direction: row.direction,
    status: row.status,
    externalReference: row.externalReference,
    notes: row.notes,
    attachmentUrl: row.attachmentUrl,
    createdByUserId: row.createdByUserId,
    paidByUserId: row.paidByUserId,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function resolvePeriod(from?: string, to?: string) {
  const fallback = defaultPeriod();
  const resolvedFrom = validDateString(from) ? from! : fallback.from;
  const resolvedTo = validDateString(to) ? to! : fallback.to;
  if (resolvedFrom > resolvedTo) badRequest("CAR_FINANCE_PERIOD_INVALID", "Finance period start must be on or before the end date");
  return {from: resolvedFrom, to: resolvedTo};
}

function defaultPeriod() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, month + 1, 0));
  const to = isoDate(last);
  return {from, to};
}

function inclusiveRange(from: string, to: string) {
  return {
    start: new Date(`${from}T00:00:00.000Z`),
    endExclusive: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86_400_000),
  };
}

function validDateString(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()));
}

function emptyMetrics() {
  return {
    bookingCount: 0,
    unsettledBookingCount: 0,
    grossBookingValue: 0,
    platformCollected: 0,
    companyCollected: 0,
    platformCommission: 0,
    companyPayable: 0,
    commissionReceivable: 0,
    unsettledNet: 0,
    ledgerBalance: 0,
    accountBalance: 0,
  };
}

function moneySum(values: number[]) {
  return roundMoney(values.reduce((sum, value) => sum + value, 0));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function makeSettlementNumber() {
  const now = new Date();
  return `HMKC-STL-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
