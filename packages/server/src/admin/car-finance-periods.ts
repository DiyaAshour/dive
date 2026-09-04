import { database } from "@platform/database";
import { badRequest, notFound } from "../errors";
import { requirePlatformAdmin } from "./authorization";
import { createAdminCarSettlement, getAdminCarFinance } from "./car-finance";

type FinanceFilters = Readonly<{
  companyId?: string;
  from?: string;
  to?: string;
}>;

type CloseMonthInput = Readonly<{
  companyId: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}>;

export async function getAdminCarFinancePeriods(adminUserId: string, filters: FinanceFilters = {}) {
  const finance = await getAdminCarFinance(adminUserId, filters);
  const selectedCompany = finance.selectedCompany;

  if (!selectedCompany) {
    return {
      ...finance,
      periodSettlement: null,
      periodClosed: false,
      canClosePeriod: false,
      closePeriodReason: "No rental company is selected.",
      closedPeriods: [],
    };
  }

  const rows = finance.reservations.filter((row) => {
    const accountingDate = row.collectedBy === "HANDMEKEY" || row.paymentMode === "PAY_NOW"
      ? row.createdAt.slice(0, 10)
      : row.returnAt.slice(0, 10);
    return accountingDate >= finance.period.from && accountingDate <= finance.period.to;
  });

  const eligible = rows.filter((row) => row.financeEligible);
  const unsettled = eligible.filter((row) => !row.settlementId);
  const platformCollected = moneySum(eligible.filter((row) => row.collectedBy === "HANDMEKEY").map((row) => row.total));
  const companyCollected = moneySum(eligible.filter((row) => row.collectedBy === "COMPANY").map((row) => row.total));
  const platformCommission = moneySum(eligible.map((row) => row.platformCommission));
  const companyPayable = moneySum(unsettled.map((row) => row.companyPayable));
  const commissionReceivable = moneySum(unsettled.map((row) => row.commissionReceivable));
  const unsettledNet = roundMoney(companyPayable - commissionReceivable);
  const ledgerBalance = finance.metrics.ledgerBalance;

  const periodSettlement = finance.settlements.find((settlement) =>
    settlement.status !== "VOID"
    && settlement.periodStart === finance.period.from
    && settlement.periodEnd === finance.period.to,
  ) ?? null;
  const fullMonth = isFullCalendarMonth(finance.period.from, finance.period.to);
  const today = isoDate(new Date());
  const periodEnded = finance.period.to < today;
  const periodClosed = Boolean(periodSettlement);
  const canClosePeriod = fullMonth && periodEnded && !periodClosed;
  const closePeriodReason = periodClosed
    ? "This month is already closed. Open it from Closed periods to review its archived bookings."
    : !fullMonth
      ? "Choose a full calendar month before closing the finance period."
      : !periodEnded
        ? "This month is still open. Close it after the month has fully ended so later bookings are not left out."
        : null;

  return {
    ...finance,
    metrics: {
      ...finance.metrics,
      bookingCount: eligible.length,
      unsettledBookingCount: unsettled.length,
      grossBookingValue: moneySum(eligible.map((row) => row.total)),
      platformCollected,
      companyCollected,
      platformCommission,
      companyPayable,
      commissionReceivable,
      unsettledNet,
      accountBalance: roundMoney(ledgerBalance + unsettledNet),
    },
    reservations: rows,
    periodSettlement,
    periodClosed,
    canClosePeriod,
    closePeriodReason,
    closedPeriods: finance.settlements
      .filter((settlement) => settlement.status !== "VOID")
      .map((settlement) => ({
        id: settlement.id,
        settlementNumber: settlement.settlementNumber,
        periodStart: settlement.periodStart,
        periodEnd: settlement.periodEnd,
        bookingCount: settlement.bookingCount,
        netAmount: settlement.netAmount,
        currency: settlement.currency,
        direction: settlement.direction,
        status: settlement.status,
      })),
  };
}

export async function closeAdminCarFinanceMonth(adminUserId: string, input: CloseMonthInput) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const company = await db.carRentalCompany.findUnique({ where: { id: input.companyId } });
  if (!company) notFound("Car rental company");

  if (!isFullCalendarMonth(input.periodStart, input.periodEnd)) {
    badRequest("CAR_FINANCE_MONTH_REQUIRED", "Finance periods must be a complete calendar month");
  }
  const today = isoDate(new Date());
  if (input.periodEnd >= today) {
    badRequest("CAR_FINANCE_MONTH_STILL_OPEN", `The ${monthLabel(input.periodStart)} finance period is still open. Close it after ${input.periodEnd}.`);
  }

  const periodStart = new Date(`${input.periodStart}T00:00:00.000Z`);
  const periodEnd = new Date(`${input.periodEnd}T00:00:00.000Z`);
  const existing = await db.carFinanceSettlement.findFirst({
    where: {
      companyId: company.id,
      periodStart,
      periodEnd,
      status: { not: "VOID" },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return serializePeriodSettlement(existing);

  try {
    return await createAdminCarSettlement(adminUserId, input);
  } catch (error) {
    if (!isApplicationErrorCode(error, "CAR_SETTLEMENT_EMPTY")) throw error;
  }

  // An empty month still needs a durable close marker, otherwise the UI can never
  // distinguish "reviewed and closed" from "not processed yet".
  const now = new Date();
  const settlementNumber = `HMKC-MONTH-${input.periodStart.slice(0, 7).replace("-", "")}-${Date.now().toString(36).toUpperCase()}`;
  const created = await db.$transaction(async (tx) => {
    const raced = await tx.carFinanceSettlement.findFirst({
      where: { companyId: company.id, periodStart, periodEnd, status: { not: "VOID" } },
      orderBy: { createdAt: "desc" },
    });
    if (raced) return raced;

    const settlement = await tx.carFinanceSettlement.create({
      data: {
        companyId: company.id,
        settlementNumber,
        periodStart,
        periodEnd,
        currency: company.currency,
        bookingCount: 0,
        grossBookingValue: 0,
        platformCollectedGross: 0,
        companyCollectedGross: 0,
        platformCommission: 0,
        companyCommissionReceivable: 0,
        companyGrossPayable: 0,
        netAmount: 0,
        direction: "BALANCED",
        status: "PAID",
        notes: input.notes?.trim().slice(0, 3000) || null,
        snapshot: {
          signedNet: 0,
          reservations: [],
          emptyPeriod: true,
          closedAsMonthlyPeriod: true,
        },
        createdByUserId: adminUserId,
        paidByUserId: adminUserId,
        paidAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: "CAR_FINANCE_EMPTY_MONTH_CLOSED",
        entityType: "CarFinanceSettlement",
        entityId: settlement.id,
        after: {
          settlementNumber,
          companyId: company.id,
          bookingCount: 0,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      },
    });
    return settlement;
  });

  return serializePeriodSettlement(created);
}

function isApplicationErrorCode(error: unknown, code: string) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === code);
}

function serializePeriodSettlement(row: any) {
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

function isFullCalendarMonth(from: string, to: string) {
  if (!validDateString(from) || !validDateString(to) || from.slice(0, 7) !== to.slice(0, 7)) return false;
  if (!from.endsWith("-01")) return false;
  const [year, month] = from.split("-").map(Number);
  const last = new Date(Date.UTC(year!, month!, 0));
  return to === isoDate(last);
}

function monthLabel(value: string) {
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function validDateString(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()));
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
