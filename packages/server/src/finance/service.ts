import { createHmac, timingSafeEqual } from "node:crypto";
import { roundMoney } from "@platform/core";
import { database } from "@platform/database";
import { ApplicationError, badRequest, notFound } from "../errors";
import { requireHotelPermission } from "../hotels/authorization";

export async function ensureBookingInvoice(bookingId: string) {
  return ensureInvoiceDocument(bookingId, "BOOKING_INVOICE");
}

export async function ensureCancellationNote(bookingId: string) {
  return ensureInvoiceDocument(bookingId, "CANCELLATION_NOTE");
}

export async function ensureUserBookingInvoices(userId: string) {
  const bookings = await database().booking.findMany({
    where: {userId, status: {in: ["CONFIRMED", "MODIFIED", "CANCELLED"]}},
    select: {id: true, status: true},
    orderBy: {createdAt: "desc"},
    take: 200,
  });
  for (const booking of bookings) {
    if (booking.status === "CANCELLED") await ensureCancellationNote(booking.id);
    else await ensureBookingInvoice(booking.id);
  }
}

export async function listUserInvoices(userId: string) {
  await ensureUserBookingInvoices(userId);
  const invoices = await database().bookingInvoice.findMany({
    where: {userId, status: "ISSUED"},
    orderBy: {issuedAt: "desc"},
    take: 200,
  });
  return invoices.map((invoice) => ({...invoiceView(invoice), accessToken: invoiceAccessToken(invoice.id)}));
}

export async function getInvoiceByToken(invoiceId: string, token: string | null | undefined) {
  if (!token || !verifyInvoiceAccessToken(invoiceId, token)) throw new ApplicationError("INVOICE_ACCESS_DENIED", "Invoice link is invalid or unavailable", 403);
  const invoice = await database().bookingInvoice.findUnique({where: {id: invoiceId}});
  if (!invoice || invoice.status !== "ISSUED") notFound("Invoice");
  return invoiceView(invoice);
}

export function invoiceAccessToken(invoiceId: string): string {
  return createHmac("sha256", securitySecret()).update(`invoice:${invoiceId}`).digest("base64url");
}

export function verifyInvoiceAccessToken(invoiceId: string, token: string): boolean {
  const expected = Buffer.from(invoiceAccessToken(invoiceId));
  const actual = Buffer.from(token.trim());
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function getHotelFinanceOverview(userId: string, hotelId: string, days = 30) {
  await requireHotelPermission(userId, hotelId, "finance:view");
  const safeDays = Math.max(1, Math.min(Math.trunc(days), 366));
  const from = new Date(Date.now() - safeDays * 86_400_000);
  const [hotel, events, statements, bookings] = await Promise.all([
    database().hotel.findUnique({where: {id: hotelId}, select: {id: true, name: true, currency: true, commissionRate: true}}),
    database().financialEvent.findMany({where: {hotelId, createdAt: {gte: from}}, orderBy: {createdAt: "desc"}, take: 10_000}),
    database().partnerStatement.findMany({where: {hotelId}, orderBy: {periodEnd: "desc"}, take: 24}),
    database().booking.findMany({where: {hotelId, createdAt: {gte: from}, status: {in: ["CONFIRMED", "MODIFIED", "CANCELLED"]}}, select: {id: true, reference: true, guestName: true, status: true, paymentMode: true, paymentState: true, totalAmount: true, commissionAmount: true, currency: true, confirmedAt: true, cancelledAt: true}, orderBy: {createdAt: "desc"}, take: 100}),
  ]);
  if (!hotel) notFound("Hotel");
  const totals = summarizeFinancialEvents(events);
  return {
    hotel: {...hotel, commissionRate: Number(hotel.commissionRate)},
    period: {days: safeDays, from, to: new Date()},
    totals,
    recentBookings: bookings.map((booking) => ({...booking, totalAmount: Number(booking.totalAmount), commissionAmount: Number(booking.commissionAmount)})),
    statements: statements.map(statementView),
  };
}

export async function issuePartnerStatement(userId: string, hotelId: string, input: Readonly<{from: string; to: string; currency?: string}>) {
  await requireHotelPermission(userId, hotelId, "finance:manage");
  const periodStart = dateOnly(input.from);
  const periodEnd = dateOnly(input.to);
  if (periodEnd.getTime() < periodStart.getTime()) badRequest("INVALID_STATEMENT_PERIOD", "Statement end date must be on or after start date");
  const hotel = await database().hotel.findUnique({where: {id: hotelId}, select: {id: true, name: true, currency: true}});
  if (!hotel) notFound("Hotel");
  const currency = (input.currency ?? hotel.currency).trim().toUpperCase();
  const existing = await database().partnerStatement.findUnique({where: {hotelId_periodStart_periodEnd_currency: {hotelId, periodStart, periodEnd, currency}}});
  if (existing) return statementView(existing);

  const endExclusive = new Date(periodEnd.getTime() + 86_400_000);
  const events = await database().financialEvent.findMany({
    where: {hotelId, currency, createdAt: {gte: periodStart, lt: endExclusive}},
    orderBy: {createdAt: "asc"},
  });
  const totals = summarizeFinancialEvents(events);
  const statementNumber = `HMK-ST-${periodStart.toISOString().slice(0,10).replaceAll("-","")}-${periodEnd.toISOString().slice(0,10).replaceAll("-","")}-${hotelId.slice(-6).toUpperCase()}`;
  const statement = await database().partnerStatement.create({data: {
    hotelId,
    statementNumber,
    periodStart,
    periodEnd,
    currency,
    bookingGross: totals.bookingGross,
    roomBase: totals.roomBase,
    serviceAmount: totals.serviceAmount,
    taxAmount: totals.taxAmount,
    platformCommission: totals.platformCommission,
    cancellationAdjustments: totals.cancellationAdjustments,
    refunds: totals.refunds,
    status: "ISSUED",
    issuedAt: new Date(),
    snapshot: {
      hotelName: hotel.name,
      eventCount: events.length,
      ledgerRule: "Amounts are sourced from append-only FinancialEvent records. Cancellation and refund rows remain visible as separate ledger adjustments.",
    },
  }});
  return statementView(statement);
}

async function ensureInvoiceDocument(bookingId: string, documentType: "BOOKING_INVOICE" | "CANCELLATION_NOTE") {
  const booking = await database().booking.findUnique({
    where: {id: bookingId},
    include: {hotel: {select: {name: true, address: true}}, roomType: {select: {name: true}}, ratePlan: {select: {name: true}}},
  });
  if (!booking) notFound("Booking");
  if (documentType === "BOOKING_INVOICE" && booking.status !== "CONFIRMED" && booking.status !== "MODIFIED") {
    throw new ApplicationError("INVOICE_NOT_AVAILABLE", "A booking invoice is issued after confirmation", 409);
  }
  if (documentType === "CANCELLATION_NOTE" && booking.status !== "CANCELLED") {
    throw new ApplicationError("CANCELLATION_NOTE_NOT_AVAILABLE", "Cancellation note is issued only after cancellation", 409);
  }
  const existing = await database().bookingInvoice.findUnique({where: {bookingId_revision_documentType: {bookingId, revision: booking.revision, documentType}}});
  if (existing) return {...invoiceView(existing), accessToken: invoiceAccessToken(existing.id)};

  const wallet = await database().walletLedgerEntry.aggregate({
    where: {bookingId, type: {in: ["BOOKING_DEBIT", "BOOKING_REFUND"]}},
    _sum: {amount: true},
  });
  const walletAmount = Math.max(0, roundMoney(-Number(wallet._sum.amount ?? 0)));
  const total = Number(booking.totalAmount);
  const amountDue = Math.max(0, roundMoney(total - walletAmount));
  const suffix = documentType === "CANCELLATION_NOTE" ? "CN" : "INV";
  const invoiceNumber = `HMK-${suffix}-${booking.reference}-R${booking.revision}`;
  const snapshot = {
    bookingReference: booking.reference,
    roomType: booking.roomType.name,
    ratePlan: booking.ratePlan.name,
    arrival: booking.arrival.toISOString().slice(0, 10),
    departure: booking.departure.toISOString().slice(0, 10),
    adults: booking.adults,
    children: booking.children,
    promotion: booking.promotionNameSnapshot,
    promotionDiscountPercent: booking.promotionDiscountPercentSnapshot === null ? null : Number(booking.promotionDiscountPercentSnapshot),
    cancellationPenalty: booking.cancellationPenaltyAmount === null ? null : Number(booking.cancellationPenaltyAmount),
    refundableAmount: booking.refundableAmount === null ? null : Number(booking.refundableAmount),
    issuedFromPersistedBookingSnapshot: true,
  };
  try {
    const created = await database().bookingInvoice.create({data: {
      bookingId,
      revision: booking.revision,
      documentType,
      invoiceNumber,
      dedupeKey: `${documentType}:${bookingId}:R${booking.revision}`,
      hotelId: booking.hotelId,
      userId: booking.userId,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      hotelName: booking.hotel.name,
      hotelAddress: booking.hotel.address,
      currency: booking.currency,
      baseAmount: booking.baseAmount,
      serviceAmount: booking.serviceAmount,
      taxAmount: booking.taxAmount,
      totalAmount: booking.totalAmount,
      walletAmount,
      amountDue,
      paymentMode: booking.paymentMode,
      paymentState: booking.paymentState,
      snapshot,
    }});
    return {...invoiceView(created), accessToken: invoiceAccessToken(created.id)};
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const raced = await database().bookingInvoice.findUnique({where: {bookingId_revision_documentType: {bookingId, revision: booking.revision, documentType}}});
    if (!raced) throw error;
    return {...invoiceView(raced), accessToken: invoiceAccessToken(raced.id)};
  }
}

function summarizeFinancialEvents(events: readonly {type: string; amount: unknown}[]) {
  const value = (type: string) => roundMoney(events.filter((event) => event.type === type).reduce((sum, event) => sum + Number(event.amount), 0));
  return {
    bookingGross: value("BOOKING_GROSS"),
    roomBase: value("ROOM_BASE"),
    serviceAmount: value("EMPLOYEE_SERVICE"),
    taxAmount: value("TAX"),
    platformCommission: value("PLATFORM_COMMISSION"),
    cancellationAdjustments: value("CANCELLATION_ADJUSTMENT"),
    refunds: value("REFUND"),
    eventCount: events.length,
  };
}

function invoiceView(invoice: {id:string;bookingId:string;revision:number;documentType:string;invoiceNumber:string;hotelId:string;userId:string|null;guestName:string;guestEmail:string;hotelName:string;hotelAddress:string;currency:string;baseAmount:unknown;serviceAmount:unknown;taxAmount:unknown;totalAmount:unknown;walletAmount:unknown;amountDue:unknown;paymentMode:string;paymentState:string;snapshot:unknown;status:string;issuedAt:Date;voidedAt:Date|null;createdAt:Date;updatedAt:Date}) {
  return {...invoice, baseAmount:Number(invoice.baseAmount),serviceAmount:Number(invoice.serviceAmount),taxAmount:Number(invoice.taxAmount),totalAmount:Number(invoice.totalAmount),walletAmount:Number(invoice.walletAmount),amountDue:Number(invoice.amountDue)};
}

function statementView(statement: {id:string;hotelId:string;statementNumber:string;periodStart:Date;periodEnd:Date;currency:string;bookingGross:unknown;roomBase:unknown;serviceAmount:unknown;taxAmount:unknown;platformCommission:unknown;cancellationAdjustments:unknown;refunds:unknown;status:string;snapshot:unknown;issuedAt:Date|null;createdAt:Date;updatedAt:Date}) {
  return {...statement,bookingGross:Number(statement.bookingGross),roomBase:Number(statement.roomBase),serviceAmount:Number(statement.serviceAmount),taxAmount:Number(statement.taxAmount),platformCommission:Number(statement.platformCommission),cancellationAdjustments:Number(statement.cancellationAdjustments),refunds:Number(statement.refunds)};
}

function dateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) badRequest("INVALID_DATE", "Use YYYY-MM-DD dates");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) badRequest("INVALID_DATE", "Invalid date");
  return parsed;
}

function securitySecret(): string {
  const secret = process.env.BOOKING_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 32) throw new ApplicationError("SECURITY_CONFIG_MISSING", "BOOKING_TOKEN_SECRET must be configured with at least 32 characters", 503);
  return secret;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: string}).code === "P2002";
}
