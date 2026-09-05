import {roundMoney} from "@platform/core";
import {database} from "@platform/database";
import {ApplicationError, notFound} from "../errors";
import {fingerprint} from "../bookings/security";
import {confirmApiBookingAfterPayment} from "../api-bookings/payment";
import {resolveConfiguredPaymentProvider} from "./registry";

export async function initiateApiBookingPayment(apiBookingId: string) {
  const provider = resolveConfiguredPaymentProvider();
  const booking = await database().apiBooking.findUnique({where: {id: apiBookingId}});
  if (!booking) notFound("API booking");
  if (booking.paymentMode !== "PAY_NOW") throw new ApplicationError("PAYMENT_NOT_REQUIRED", "This API booking is configured for pay at hotel", 400);
  if (booking.paymentState === "CAPTURED") throw new ApplicationError("PAYMENT_ALREADY_CAPTURED", "Payment has already been captured", 400);
  if (booking.status !== "PENDING") throw new ApplicationError("API_BOOKING_NOT_PAYABLE", "Only a pending API booking can start online payment", 409);

  const amount = Math.max(0, roundMoney(Number(booking.totalAmount)));
  if (amount <= 0) throw new ApplicationError("PAYMENT_ALREADY_COVERED", "The API booking does not require an online payment", 400);
  const returnUrl = `${siteOrigin()}/api-booking/${booking.id}?payment=return`;
  const requestFingerprint = fingerprint({apiBookingId, provider: provider.key, amount, currency: booking.currency, returnUrl, action: "initiate-api-payment"});
  const idempotencyKey = `api-payment-${booking.id}`;
  const existing = await database().apiPaymentAttempt.findUnique({where: {idempotencyKey}});
  if (existing) {
    assertFingerprint(existing.requestFingerprint, requestFingerprint);
    return apiPaymentAttemptView(existing);
  }

  const attempt = await database().apiPaymentAttempt.create({data: {
    apiBookingId: booking.id,
    provider: provider.key,
    amount,
    currency: booking.currency,
    idempotencyKey,
    requestFingerprint,
    returnUrl,
  }});

  try {
    const providerResult = await provider.createPayment({
      attemptId: attempt.id,
      bookingId: booking.id,
      bookingReference: booking.reference,
      amount,
      currency: booking.currency,
      returnUrl,
      guestEmail: booking.guestEmail,
    });
    const updated = await database().apiPaymentAttempt.update({where: {id: attempt.id}, data: {
      externalPaymentId: providerResult.externalPaymentId,
      status: providerResult.status,
      redirectUrl: providerResult.redirectUrl ?? null,
      completedAt: providerResult.status === "CAPTURED" ? new Date() : null,
    }});
    if (providerResult.status === "CAPTURED") {
      await database().apiBooking.update({where: {id: booking.id}, data: {paymentState: "CAPTURED"}});
      await confirmApiBookingAfterPayment(booking.id);
    }
    return apiPaymentAttemptView(updated);
  } catch (error) {
    const failureCode = providerFailureCode(error);
    await database().$transaction(async (tx) => {
      await tx.apiPaymentAttempt.updateMany({where: {id: attempt.id, status: "INITIATED"}, data: {status: "FAILED", failureCode, completedAt: new Date()}});
      await tx.apiBooking.updateMany({where: {id: booking.id, paymentState: {not: "CAPTURED"}}, data: {paymentState: "FAILED", status: "FAILED", errorCode: failureCode, errorMessage: error instanceof Error ? error.message : "Online payment could not be started"}});
    }).catch(() => undefined);
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError("PAYMENT_PROVIDER_ERROR", "The payment provider could not start the API booking payment", 502);
  }
}

export function apiPaymentAttemptView(attempt: {id: string; provider: string; status: string; amount: unknown; currency: string; redirectUrl: string | null; externalPaymentId: string | null; failureCode: string | null; createdAt: Date; completedAt: Date | null}) {
  return {
    id: attempt.id,
    provider: attempt.provider,
    status: attempt.status,
    amount: Number(attempt.amount),
    currency: attempt.currency,
    redirectUrl: attempt.redirectUrl,
    externalPaymentId: attempt.externalPaymentId,
    failureCode: attempt.failureCode,
    createdAt: attempt.createdAt,
    completedAt: attempt.completedAt,
  };
}

function assertFingerprint(actual: string, expected: string): void {
  if (actual !== expected) throw new ApplicationError("IDEMPOTENCY_KEY_REUSED", "This API payment request was already used for different payment details", 409);
}

function providerFailureCode(error: unknown): string {
  if (error instanceof ApplicationError) return error.code.slice(0, 120);
  if (error instanceof Error && error.name) return error.name.slice(0, 120);
  return "PROVIDER_ERROR";
}

function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_URL?.trim();
  const origin = configured ? (/^https?:\/\//i.test(configured) ? configured : "https://" + configured) : "https://handmekey.com";
  return origin.replace(/\/$/, "");
}
