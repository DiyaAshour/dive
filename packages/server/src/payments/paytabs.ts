import { createHmac, timingSafeEqual } from "node:crypto";
import { database } from "@platform/database";
import { ApplicationError } from "../errors";
import { recordPaymentCaptured } from "../bookings/service";
import { confirmApiBookingAfterPayment } from "../api-bookings/payment";
import type { PaymentProvider, ProviderCreatePaymentRequest, ProviderCreatePaymentResult, ProviderRefundRequest, ProviderRefundResult } from "./provider";

export function createPayTabsProviderFromEnv(): PaymentProvider | null {
  const profileId = process.env.PAYTABS_PROFILE_ID?.trim();
  const serverKey = process.env.PAYTABS_SERVER_KEY?.trim();
  if (!profileId || !serverKey) return null;
  const endpoint = (process.env.PAYTABS_ENDPOINT ?? "https://secure-jordan.paytabs.com").trim().replace(/\/$/, "");
  return new PayTabsProvider(profileId, serverKey, endpoint);
}

export async function handlePayTabsCallback(rawBody: string, signature: string | null | undefined) {
  const serverKey = process.env.PAYTABS_SERVER_KEY?.trim();
  if (!serverKey) throw new ApplicationError("PAYTABS_NOT_CONFIGURED", "PayTabs callback is not configured", 503);
  if (!signature || !verifyPayTabsSignature(rawBody, signature, serverKey)) {
    throw new ApplicationError("PAYTABS_SIGNATURE_INVALID", "Payment callback signature is invalid", 401);
  }
  let payload: PayTabsResponse;
  try { payload = JSON.parse(rawBody) as PayTabsResponse; }
  catch { throw new ApplicationError("PAYTABS_CALLBACK_INVALID", "Payment callback body is invalid", 400); }
  const attemptId = stringValue(payload.cart_id);
  const transactionRef = stringValue(payload.tran_ref);
  const responseStatus = stringValue(payload.payment_result?.response_status);
  if (!attemptId || !transactionRef) throw new ApplicationError("PAYTABS_CALLBACK_INCOMPLETE", "Payment callback is missing transaction identifiers", 400);

  const attempt = await database().paymentAttempt.findUnique({where: {id: attemptId}});
  if (attempt && attempt.provider === "paytabs") return handlePartnerPaymentCallback(attempt, responseStatus, transactionRef, payload);

  const apiAttempt = await database().apiPaymentAttempt.findUnique({where: {id: attemptId}});
  if (!apiAttempt || apiAttempt.provider !== "paytabs") throw new ApplicationError("PAYMENT_ATTEMPT_NOT_FOUND", "Payment attempt does not match this callback", 404);
  if (responseStatus === "A") {
    await database().$transaction(async (tx) => {
      await tx.apiPaymentAttempt.updateMany({where: {id: apiAttempt.id, status: {not: "CAPTURED"}}, data: {status: "CAPTURED", externalPaymentId: transactionRef, completedAt: new Date(), failureCode: null}});
      await tx.apiBooking.updateMany({where: {id: apiAttempt.apiBookingId, paymentState: {not: "CAPTURED"}}, data: {paymentState: "CAPTURED"}});
    });
    await confirmApiBookingAfterPayment(apiAttempt.apiBookingId);
    return {accepted: true, status: "CAPTURED" as const};
  }

  if (apiAttempt.status !== "CAPTURED") {
    const code = stringValue(payload.payment_result?.response_code) || "PAYTABS_DECLINED";
    await database().$transaction(async (tx) => {
      await tx.apiPaymentAttempt.updateMany({where: {id: apiAttempt.id, status: {not: "CAPTURED"}}, data: {status: "FAILED", externalPaymentId: transactionRef, failureCode: code.slice(0,120), completedAt: new Date()}});
      await tx.apiBooking.updateMany({where: {id: apiAttempt.apiBookingId, paymentState: {not: "CAPTURED"}}, data: {paymentState: "FAILED", status: "FAILED", errorCode: code.slice(0,120), errorMessage: "PayTabs declined the API booking payment"}});
    });
  }
  return {accepted: true, status: "FAILED" as const};
}

async function handlePartnerPaymentCallback(attempt: {id: string; bookingId: string; provider: string; status: string}, responseStatus: string | null, transactionRef: string, payload: PayTabsResponse) {
  if (responseStatus === "A") {
    await database().paymentAttempt.update({where: {id: attempt.id}, data: {status: "CAPTURED", externalPaymentId: transactionRef, completedAt: new Date(), failureCode: null}});
    await recordPaymentCaptured(attempt.bookingId, transactionRef, null, attempt.id);
    return {accepted: true, status: "CAPTURED" as const};
  }

  if (attempt.status !== "CAPTURED") {
    const code = stringValue(payload.payment_result?.response_code) || "PAYTABS_DECLINED";
    await database().$transaction(async (tx) => {
      await tx.paymentAttempt.updateMany({where: {id: attempt.id, status: {not: "CAPTURED"}}, data: {status: "FAILED", externalPaymentId: transactionRef, failureCode: code.slice(0,120), completedAt: new Date()}});
      await tx.booking.updateMany({where: {id: attempt.bookingId, paymentState: {not: "CAPTURED"}}, data: {paymentState: "FAILED"}});
      await tx.bookingEvent.upsert({
        where: {idempotencyKey: `paytabs-failed:${transactionRef}`},
        create: {bookingId: attempt.bookingId, type: "PAYMENT_FAILED", idempotencyKey: `paytabs-failed:${transactionRef}`, requestFingerprint: `paytabs:${transactionRef}`, data: {attemptId: attempt.id, provider: "paytabs", responseStatus, responseCode: code}},
        update: {},
      });
    });
  }
  return {accepted: true, status: "FAILED" as const};
}

export function verifyPayTabsSignature(rawBody: string, signature: string, serverKey: string): boolean {
  const expectedHex = createHmac("sha256", serverKey).update(rawBody).digest("hex");
  const expected = Buffer.from(expectedHex, "utf8");
  const actual = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

class PayTabsProvider implements PaymentProvider {
  readonly key = "paytabs";
  constructor(private readonly profileId: string, private readonly serverKey: string, private readonly endpoint: string) {}

  async createPayment(request: ProviderCreatePaymentRequest): Promise<ProviderCreatePaymentResult> {
    const callback = process.env.PAYTABS_CALLBACK_URL?.trim() || `${siteOrigin()}/api/v1/payments/paytabs/callback`;
    const response = await this.request({
      profile_id: Number(this.profileId),
      tran_type: "sale",
      tran_class: "ecom",
      cart_id: request.attemptId,
      cart_description: `HandMeKey booking ${request.bookingReference}`,
      cart_currency: request.currency,
      cart_amount: request.amount,
      customer_details: {email: request.guestEmail},
      return: request.returnUrl,
      callback,
    });
    const transactionRef = stringValue(response.tran_ref);
    if (!transactionRef) throw new ApplicationError("PAYTABS_RESPONSE_INVALID", "Payment provider did not return a transaction reference", 502);
    const responseStatus = stringValue(response.payment_result?.response_status);
    if (responseStatus === "A") return {externalPaymentId: transactionRef, status: "CAPTURED"};
    const redirectUrl = stringValue(response.redirect_url);
    if (redirectUrl) return {externalPaymentId: transactionRef, status: "REQUIRES_ACTION", redirectUrl};
    throw providerRejected(response);
  }

  async refundPayment(request: ProviderRefundRequest): Promise<ProviderRefundResult> {
    const response = await this.request({
      profile_id: Number(this.profileId),
      tran_type: "refund",
      tran_class: "ecom",
      cart_id: request.refundId,
      cart_description: `HandMeKey refund ${request.refundId}`,
      cart_currency: request.currency,
      cart_amount: request.amount,
      tran_ref: request.externalPaymentId,
    });
    const reference = stringValue(response.tran_ref) || stringValue(response.previous_tran_ref);
    if (!reference) throw new ApplicationError("PAYTABS_REFUND_RESPONSE_INVALID", "Refund provider did not return a transaction reference", 502);
    return {externalRefundId: reference, status: stringValue(response.payment_result?.response_status) === "A" ? "COMPLETED" : "PENDING"};
  }

  private async request(body: Record<string, unknown>): Promise<PayTabsResponse> {
    const response = await fetch(`${this.endpoint}/payment/request`, {
      method: "POST",
      headers: {"content-type": "application/json", authorization: this.serverKey},
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as PayTabsResponse;
    if (!response.ok) throw new ApplicationError("PAYTABS_HTTP_ERROR", `PayTabs returned HTTP ${response.status}`, 502);
    return payload;
  }
}

type PayTabsResponse = Readonly<{
  tran_ref?: unknown;
  previous_tran_ref?: unknown;
  cart_id?: unknown;
  redirect_url?: unknown;
  message?: unknown;
  payment_result?: Readonly<{response_status?: unknown; response_code?: unknown; response_message?: unknown}>;
}>;

function providerRejected(response: PayTabsResponse): ApplicationError {
  const code = stringValue(response.payment_result?.response_code) || "PAYTABS_REJECTED";
  const message = stringValue(response.payment_result?.response_message) || stringValue(response.message) || "Payment provider rejected the request";
  return new ApplicationError(code.slice(0,120), message.slice(0,500), 402);
}
function stringValue(value: unknown): string | null {return typeof value === "string" && value.trim() ? value.trim() : typeof value === "number" ? String(value) : null;}
function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_URL?.trim();
  const origin = configured ? (/^https?:\/\//i.test(configured) ? configured : "https://" + configured) : "https://handmekey.com";
  return origin.replace(/\/$/, "");
}
