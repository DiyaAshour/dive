import type { InitiatePaymentInput } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError, badRequest, notFound } from "../errors";
import type { BookingAccessContext } from "../bookings/service";
import { completeRefundRecord, recordPaymentCaptured } from "../bookings/service";
import { requireBookingAccess } from "../bookings/authorization";
import { fingerprint } from "../bookings/security";
import { requireHotelPermission } from "../hotels/authorization";
import { resolveConfiguredPaymentProvider, resolvePaymentProvider } from "./registry";
import type { ProviderCreatePaymentResult } from "./provider";

export async function initiatePayment(
  bookingId: string,
  input: InitiatePaymentInput,
  idempotencyKey: string,
  context: BookingAccessContext,
) {
  await requireBookingAccess(bookingId, context);
  const provider = resolveConfiguredPaymentProvider();
  const requestFingerprint = fingerprint({bookingId, returnUrl: input.returnUrl, provider: provider.key, action: "initiate-payment"});
  const existing = await database().paymentAttempt.findUnique({where: {idempotencyKey}});
  if (existing) {
    assertFingerprint(existing.requestFingerprint, requestFingerprint);
    return paymentAttemptView(existing.id);
  }

  const booking = await database().booking.findUnique({where: {id: bookingId}});
  if (!booking) notFound("Booking");
  if (booking.paymentMode !== "PAY_NOW") badRequest("PAYMENT_NOT_REQUIRED", "This booking is configured for pay at hotel");
  if (booking.paymentState === "CAPTURED") badRequest("PAYMENT_ALREADY_CAPTURED", "Payment has already been captured");
  if (booking.status !== "HOLD") throw new ApplicationError("BOOKING_NOT_PAYABLE", "Only an active booking hold can start online payment", 409);
  if (!booking.holdExpiresAt || booking.holdExpiresAt.getTime() <= Date.now()) throw new ApplicationError("HOLD_EXPIRED", "Booking hold expired before payment could start", 409);

  let attempt: Awaited<ReturnType<typeof createPaymentAttempt>>;
  try {
    attempt = await createPaymentAttempt({
      bookingId,
      provider: provider.key,
      amount: Number(booking.totalAmount),
      currency: booking.currency,
      idempotencyKey,
      requestFingerprint,
      returnUrl: input.returnUrl,
    });
  } catch (error) {
    if (!isPrismaUniqueConflict(error)) throw error;
    const raced = await database().paymentAttempt.findUnique({where: {idempotencyKey}});
    if (!raced) throw error;
    assertFingerprint(raced.requestFingerprint, requestFingerprint);
    return paymentAttemptView(raced.id);
  }

  let providerResult: ProviderCreatePaymentResult;
  try {
    providerResult = await provider.createPayment({
      attemptId: attempt.id,
      bookingId,
      bookingReference: booking.reference,
      amount: Number(booking.totalAmount),
      currency: booking.currency,
      returnUrl: input.returnUrl,
      guestEmail: booking.guestEmail,
    });
  } catch (error) {
    await markPaymentAttemptFailed(attempt.id, bookingId, provider.key, context.userId ?? null, error);
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError("PAYMENT_PROVIDER_ERROR", "The payment provider could not start the payment", 502);
  }

  await database().$transaction(async (tx) => {
    await tx.paymentAttempt.update({where: {id: attempt.id}, data: {
      externalPaymentId: providerResult.externalPaymentId,
      status: providerResult.status,
      redirectUrl: providerResult.redirectUrl ?? null,
      completedAt: providerResult.status === "CAPTURED" ? new Date() : null,
    }});
    await tx.bookingEvent.create({data: {bookingId, type: "PAYMENT_INITIATED", actorUserId: context.userId ?? null, data: {attemptId: attempt.id, provider: provider.key, status: providerResult.status}}});
  });

  if (providerResult.status === "CAPTURED") {
    await recordPaymentCaptured(bookingId, providerResult.externalPaymentId, context.userId ?? null, attempt.id);
  }
  return paymentAttemptView(attempt.id);
}

export async function processRefund(refundId: string, userId: string) {
  const refund = await database().refund.findUnique({where: {id: refundId}, include: {booking: {include: {paymentAttempts: {where: {status: "CAPTURED"}, orderBy: {completedAt: "desc"}, take: 1}}}}});
  if (!refund) notFound("Refund");
  await requireHotelPermission(userId, refund.booking.hotelId, "finance:manage");
  if (refund.status === "COMPLETED") return refund;
  if (refund.status === "REJECTED") throw new ApplicationError("REFUND_REJECTED", "Rejected refund cannot be processed", 409);
  if (refund.status === "PROCESSING") throw new ApplicationError("REFUND_ALREADY_PROCESSING", "This refund is already being processed", 409);

  const payment = refund.booking.paymentAttempts[0];
  if (!payment?.externalPaymentId) throw new ApplicationError("PAYMENT_REFERENCE_MISSING", "Captured provider payment reference is missing", 409);
  const provider = resolvePaymentProvider(payment.provider);

  const claimed = await database().refund.updateMany({
    where: {id: refundId, status: {in: ["REQUESTED", "APPROVED", "FAILED"]}},
    data: {status: "PROCESSING", provider: provider.key, failureCode: null},
  });
  if (claimed.count !== 1) {
    const current = await database().refund.findUnique({where: {id: refundId}});
    if (current?.status === "COMPLETED") return current;
    throw new ApplicationError("REFUND_STATE_CHANGED", "Refund state changed while processing; reload before retrying", 409);
  }

  try {
    const result = await provider.refundPayment({refundId, externalPaymentId: payment.externalPaymentId, amount: Number(refund.amount), currency: refund.currency});
    await database().refund.update({where: {id: refundId}, data: {externalReference: result.externalRefundId, status: "PROCESSING"}});
    if (result.status === "COMPLETED") return completeRefundRecord(refundId, result.externalRefundId, userId);
    return database().refund.findUnique({where: {id: refundId}});
  } catch (error) {
    await database().refund.updateMany({where: {id: refundId, status: "PROCESSING"}, data: {status: "FAILED", failureCode: providerFailureCode(error)}}).catch(() => undefined);
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError("REFUND_PROVIDER_ERROR", "The payment provider could not process the refund", 502);
  }
}

export async function paymentAttemptView(attemptId: string) {
  const attempt = await database().paymentAttempt.findUnique({where: {id: attemptId}, select: {
    id: true,
    bookingId: true,
    provider: true,
    status: true,
    amount: true,
    currency: true,
    redirectUrl: true,
    failureCode: true,
    createdAt: true,
    completedAt: true,
  }});
  if (!attempt) notFound("Payment attempt");
  return {...attempt, amount: Number(attempt.amount)};
}

async function createPaymentAttempt(data: {
  bookingId: string;
  provider: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  requestFingerprint: string;
  returnUrl: string;
}) {
  return database().paymentAttempt.create({data});
}

async function markPaymentAttemptFailed(attemptId: string, bookingId: string, provider: string, actorUserId: string | null, error: unknown) {
  await database().$transaction(async (tx) => {
    await tx.paymentAttempt.updateMany({where: {id: attemptId, status: "INITIATED"}, data: {status: "FAILED", failureCode: providerFailureCode(error), completedAt: new Date()}});
    await tx.booking.updateMany({where: {id: bookingId, paymentState: {in: ["PENDING", "FAILED"]}}, data: {paymentState: "FAILED"}});
    await tx.bookingEvent.create({data: {bookingId, type: "PAYMENT_FAILED", actorUserId, data: {attemptId, provider, code: providerFailureCode(error)}}});
  }).catch(() => undefined);
}

function assertFingerprint(actual: string, expected: string): void {
  if (actual !== expected) throw new ApplicationError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used for a different payment request", 409);
}

function providerFailureCode(error: unknown): string {
  if (error instanceof ApplicationError) return error.code.slice(0, 120);
  if (error instanceof Error && error.name) return error.name.slice(0, 120);
  return "PROVIDER_ERROR";
}

function isPrismaUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as {code?: unknown}).code === "P2002";
}
