import {createHash, createHmac, randomBytes, timingSafeEqual} from "node:crypto";
import {database} from "@platform/database";
import {queueEmail} from "../communications/email";
import {manualEmailContent} from "../communications/templates";
import {ApplicationError} from "../errors";
import {bookNuitee, findNuiteeBookingByClientReference, NuiteeApiError, nuiteeClientReference, type NuiteeBookingResult} from "./client";

const PAYMENT_PROVIDER = "NUITEE_PAYMENT_SDK";
const BOOKING_PROVIDER = "NUITEE";
const PROOF_TTL_MS = 30 * 60_000;

type JsonRecord = Record<string, unknown>;

export type NuiteeCheckoutProofInput = Readonly<{
  prebookId: string;
  transactionId: string;
  offerId: string;
  hotelId: string;
  hotelName: string;
  city: string;
  roomName: string | null;
  boardName: string | null;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  price: number;
  currency: string;
  cancellationPolicy: unknown;
  sandbox: boolean;
}>;

type ProofPayload = NuiteeCheckoutProofInput & Readonly<{v: 1; exp: number}>;

export type NuiteeCheckoutGuest = Readonly<{
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}>;

export type NuiteeCheckoutState = "payment_pending" | "processing" | "confirmed" | "needs_review";

export type NuiteeCheckoutView = Readonly<{
  state: NuiteeCheckoutState;
  reference: string;
  returnUrl?: string;
  hotelName: string;
  roomName: string | null;
  arrival: string;
  departure: string;
  amount: number;
  currency: string;
  bookingId: string | null;
  hotelConfirmationCode: string | null;
  providerStatus: string | null;
  message: string | null;
}>;

export function createNuiteeCheckoutProof(input: NuiteeCheckoutProofInput): string {
  const payload: ProofPayload = {...normalizeProof(input), v: 1, exp: Date.now() + PROOF_TTL_MS};
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export async function createNuiteeCheckoutSession(input: Readonly<{proof: string; guest: NuiteeCheckoutGuest; origin: string}>): Promise<NuiteeCheckoutView & {token: string}> {
  const proof = readProof(input.proof);
  const guest = normalizeGuest(input.guest);
  const db = database();
  const clientReference = nuiteeClientReference(proof.transactionId);
  const token = paymentRecoveryToken(proof.transactionId);
  const tokenHash = tokenFingerprint(token);
  const origin = cleanOrigin(input.origin);
  const returnUrl = `${origin}/nuitee-payment-return?token=${encodeURIComponent(token)}`;
  const storedReturnUrl = `${origin}/nuitee-payment-return`;
  const attemptKey = `NUITEE-SDK-${sha256(proof.transactionId).slice(0, 48)}`;
  const providerRequest = jsonSafe({
    prebookId: proof.prebookId,
    transactionId: proof.transactionId,
    offerId: proof.offerId,
    hotelId: proof.hotelId,
    firstName: guest.firstName,
    lastName: guest.lastName,
    sandbox: proof.sandbox,
    checkoutProofVersion: proof.v,
  });

  const existingAttempt = await db.apiPaymentAttempt.findFirst({
    where: {provider: PAYMENT_PROVIDER, externalPaymentId: proof.transactionId},
    include: {apiBooking: true},
  });
  if (existingAttempt) {
    const booking = existingAttempt.apiBooking;
    if (booking.clientReference !== clientReference || booking.hotelCode !== proof.hotelId) {
      throw new ApplicationError("NUITEE_CHECKOUT_MISMATCH", "The Nuitee checkout session does not match this prebook", 409);
    }
    await db.$transaction([
      db.apiBooking.update({where: {id: booking.id}, data: {
        guestName: `${guest.firstName} ${guest.lastName}`.trim(),
        guestEmail: guest.email,
        phone: guest.phone ?? null,
        hotelName: proof.hotelName,
        city: proof.city,
        roomName: proof.roomName,
        boardName: proof.boardName,
        rateKey: proof.offerId,
        currency: proof.currency,
        netAmount: proof.price,
        sellingAmount: proof.price,
        markupAmount: 0,
        totalAmount: proof.price,
        cancellationPolicy: jsonSafe(proof.cancellationPolicy),
        providerRequest,
      }}),
      db.apiPaymentAttempt.update({where: {id: existingAttempt.id}, data: {
        requestFingerprint: tokenHash,
        returnUrl: storedReturnUrl,
        ...(existingAttempt.status === "FAILED" || existingAttempt.status === "CANCELLED" ? {status: "REQUIRES_ACTION", failureCode: null} : {}),
      }}),
    ]);
    const refreshed = await db.apiBooking.findUnique({where: {id: booking.id}});
    if (!refreshed) throw new ApplicationError("NUITEE_CHECKOUT_NOT_FOUND", "The Nuitee checkout session could not be recovered", 404);
    const view = bookingView(refreshed, existingAttempt.status === "CAPTURED" || refreshed.status === "CONFIRMED" ? "confirmed" : "payment_pending", returnUrl);
    return {...view, token};
  }

  const reference = `HMK-N-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const booking = await db.apiBooking.upsert({
    where: {clientReference},
    create: {
      reference,
      provider: BOOKING_PROVIDER,
      clientReference,
      hotelCode: proof.hotelId,
      hotelName: proof.hotelName,
      city: proof.city,
      roomName: proof.roomName,
      boardName: proof.boardName,
      rateType: "NUITEE_PREBOOK",
      rateKey: proof.offerId,
      guestName: `${guest.firstName} ${guest.lastName}`.trim(),
      guestEmail: guest.email,
      phone: guest.phone ?? null,
      arrival: dateValue(proof.arrival),
      departure: dateValue(proof.departure),
      adults: proof.adults,
      children: proof.children,
      currency: proof.currency,
      netAmount: proof.price,
      sellingAmount: proof.price,
      markupAmount: 0,
      totalAmount: proof.price,
      paymentMode: "PAY_NOW",
      paymentState: "PENDING",
      status: "PENDING",
      cancellationPolicy: jsonSafe(proof.cancellationPolicy),
      providerRequest,
    },
    update: {
      guestName: `${guest.firstName} ${guest.lastName}`.trim(),
      guestEmail: guest.email,
      phone: guest.phone ?? null,
      providerRequest,
    },
  });

  const attempt = await db.apiPaymentAttempt.create({data: {
    apiBookingId: booking.id,
    provider: PAYMENT_PROVIDER,
    status: "REQUIRES_ACTION",
    amount: proof.price,
    currency: proof.currency,
    idempotencyKey: attemptKey,
    requestFingerprint: tokenHash,
    externalPaymentId: proof.transactionId,
    returnUrl: storedReturnUrl,
  }});
  return {...bookingView(booking, attempt.status === "CAPTURED" ? "confirmed" : "payment_pending", returnUrl), token};
}

export async function finalizeNuiteeCheckoutSession(token: string): Promise<NuiteeCheckoutView> {
  const clean = token.trim();
  if (!clean || clean.length < 20) throw new ApplicationError("NUITEE_CHECKOUT_TOKEN_INVALID", "The checkout recovery token is invalid", 400);
  const db = database();
  const attempt = await db.apiPaymentAttempt.findFirst({
    where: {provider: PAYMENT_PROVIDER, requestFingerprint: tokenFingerprint(clean)},
    include: {apiBooking: true},
  });
  if (!attempt) throw new ApplicationError("NUITEE_CHECKOUT_NOT_FOUND", "The checkout session could not be found", 404);
  const booking = attempt.apiBooking;
  if (booking.provider !== BOOKING_PROVIDER) throw new ApplicationError("NUITEE_CHECKOUT_MISMATCH", "The checkout session belongs to another provider", 409);

  if (booking.status === "CONFIRMED" || attempt.status === "CAPTURED") {
    const reconciled = booking.status === "CONFIRMED" ? booking : await reconcileBooking(booking.id);
    return bookingView(reconciled ?? booking, reconciled?.status === "CONFIRMED" ? "confirmed" : "processing");
  }

  if (booking.status === "FAILED" && booking.errorCode === "NUITEE_BOOKING_NEEDS_REVIEW") {
    const reconciled = await reconcileBooking(booking.id);
    if (reconciled?.status === "CONFIRMED") return bookingView(reconciled, "confirmed");
    return bookingView(booking, "needs_review", undefined, safeReviewMessage(booking.errorMessage));
  }

  if (attempt.status === "AUTHORIZED") {
    const reconciled = await reconcileBooking(booking.id);
    if (reconciled?.status === "CONFIRMED") return bookingView(reconciled, "confirmed");
    return bookingView(booking, "processing");
  }

  const claimed = await db.apiPaymentAttempt.updateMany({
    where: {id: attempt.id, status: "REQUIRES_ACTION"},
    data: {status: "AUTHORIZED", failureCode: null},
  });
  if (claimed.count !== 1) return bookingView(booking, "processing");

  const request = asRecord(booking.providerRequest);
  const prebookId = stringValue(request.prebookId);
  const transactionId = stringValue(request.transactionId);
  const firstName = stringValue(request.firstName);
  const lastName = stringValue(request.lastName);
  if (!prebookId || !transactionId || !firstName || !lastName) {
    await markNeedsReview(booking.id, attempt.id, "NUITEE_SESSION_DATA_MISSING", "Stored Nuitee checkout data is incomplete");
    const failed = await db.apiBooking.findUnique({where: {id: booking.id}});
    return bookingView(failed ?? booking, "needs_review", undefined, "The payment returned, but the booking session needs manual verification.");
  }

  try {
    const result = await bookNuitee({
      prebookId,
      transactionId,
      holderFirstName: firstName,
      holderLastName: lastName,
      email: booking.guestEmail,
      ...(booking.phone ? {phone: booking.phone} : {}),
    });
    if (!result.bookingId) throw new Error("Nuitee did not return a booking ID");
    const confirmed = await markConfirmed(booking.id, attempt.id, result);
    await queueNuiteeConfirmation(confirmed).catch((error) => console.error("Nuitee confirmation email could not be queued", error));
    return bookingView(confirmed, "confirmed");
  } catch (error) {
    const reconciled = await reconcileBooking(booking.id).catch(() => null);
    if (reconciled?.status === "CONFIRMED") return bookingView(reconciled, "confirmed");
    const detail = providerError(error);
    await markNeedsReview(booking.id, attempt.id, detail.code, detail.message);
    const failed = await db.apiBooking.findUnique({where: {id: booking.id}});
    return bookingView(failed ?? booking, "needs_review", undefined, "Payment returned successfully, but hotel confirmation needs verification. Do not pay again.");
  }
}

export async function reconcileNuiteeCheckoutByClientReference(clientReference: string): Promise<NuiteeCheckoutView | null> {
  const booking = await database().apiBooking.findUnique({where: {clientReference}});
  if (!booking || booking.provider !== BOOKING_PROVIDER) return null;
  const reconciled = await reconcileBooking(booking.id);
  return reconciled ? bookingView(reconciled, reconciled.status === "CONFIRMED" ? "confirmed" : "processing") : bookingView(booking, booking.status === "FAILED" ? "needs_review" : "processing");
}

async function reconcileBooking(bookingId: string) {
  const db = database();
  const booking = await db.apiBooking.findUnique({where: {id: bookingId}});
  if (!booking) return null;
  const result = await findNuiteeBookingByClientReference(booking.clientReference);
  if (!result?.bookingId) return booking;
  const attempt = await db.apiPaymentAttempt.findFirst({where: {apiBookingId: booking.id, provider: PAYMENT_PROVIDER}, orderBy: {createdAt: "desc"}});
  const confirmed = await markConfirmed(booking.id, attempt?.id ?? null, result);
  await queueNuiteeConfirmation(confirmed).catch((error) => console.error("Nuitee reconciled confirmation email could not be queued", error));
  return confirmed;
}

async function markConfirmed(bookingId: string, attemptId: string | null, result: NuiteeBookingResult) {
  const db = database();
  await db.$transaction(async (tx) => {
    await tx.apiBooking.update({where: {id: bookingId}, data: {
      status: "CONFIRMED",
      paymentState: "CAPTURED",
      providerReference: result.bookingId,
      providerResponse: jsonSafe(result.raw),
      errorCode: null,
      errorMessage: null,
      confirmedAt: new Date(),
    }});
    if (attemptId) await tx.apiPaymentAttempt.update({where: {id: attemptId}, data: {status: "CAPTURED", completedAt: new Date(), failureCode: null}});
    else await tx.apiPaymentAttempt.updateMany({where: {apiBookingId: bookingId, provider: PAYMENT_PROVIDER, status: {not: "CAPTURED"}}, data: {status: "CAPTURED", completedAt: new Date(), failureCode: null}});
  });
  return (await db.apiBooking.findUnique({where: {id: bookingId}}))!;
}

async function markNeedsReview(bookingId: string, attemptId: string, failureCode: string, message: string) {
  const db = database();
  await db.$transaction([
    db.apiBooking.update({where: {id: bookingId}, data: {status: "FAILED", errorCode: "NUITEE_BOOKING_NEEDS_REVIEW", errorMessage: `${failureCode}: ${message}`.slice(0, 4000)}}),
    db.apiPaymentAttempt.update({where: {id: attemptId}, data: {status: "AUTHORIZED", failureCode: failureCode.slice(0, 120)}}),
  ]);
}

async function queueNuiteeConfirmation(booking: any) {
  const provider = asRecord(booking.providerResponse);
  const data = asRecord(provider.data);
  const hotelConfirmation = stringValue(data.hotelConfirmationCode) ?? stringValue(data.confirmationCode) ?? stringValue(data.hotelConfirmationNumber);
  const subject = `Booking confirmed · ${booking.reference} · ${booking.hotelName}`;
  const content = manualEmailContent({
    subject,
    textBody: [
      `Hello ${booking.guestName},`,
      `Your HandMeKey hotel booking is confirmed.`,
      `Hotel: ${booking.hotelName}`,
      booking.roomName ? `Room: ${booking.roomName}` : "",
      `Stay: ${dateKey(booking.arrival)} → ${dateKey(booking.departure)}`,
      `Total: ${Number(booking.totalAmount).toFixed(2)} ${booking.currency}`,
      `HandMeKey reference: ${booking.reference}`,
      booking.providerReference ? `Nuitee booking ID: ${booking.providerReference}` : "",
      hotelConfirmation ? `Hotel confirmation: ${hotelConfirmation}` : "",
      "Keep this email for your records.",
    ].filter(Boolean).join("\n"),
  });
  await queueEmail({
    kind: "BOOKING_CONFIRMED",
    toEmail: booking.guestEmail,
    toName: booking.guestName,
    subject: content.subject,
    htmlBody: content.html,
    textBody: content.text,
    dedupeKey: `NUITEE_BOOKING_CONFIRMED:${booking.id}`,
    bookingId: booking.id,
  });
}

function bookingView(booking: any, state: NuiteeCheckoutState, returnUrl?: string, message: string | null = null): NuiteeCheckoutView {
  const provider = asRecord(booking.providerResponse);
  const data = asRecord(provider.data);
  return {
    state,
    reference: booking.reference,
    ...(returnUrl ? {returnUrl} : {}),
    hotelName: booking.hotelName,
    roomName: booking.roomName,
    arrival: dateKey(booking.arrival),
    departure: dateKey(booking.departure),
    amount: Number(booking.totalAmount),
    currency: booking.currency,
    bookingId: booking.providerReference,
    hotelConfirmationCode: stringValue(data.hotelConfirmationCode) ?? stringValue(data.confirmationCode) ?? stringValue(data.hotelConfirmationNumber),
    providerStatus: stringValue(data.status) ?? (booking.status === "CONFIRMED" ? "CONFIRMED" : null),
    message,
  };
}

function normalizeProof(input: NuiteeCheckoutProofInput): NuiteeCheckoutProofInput {
  const currency = input.currency.trim().toUpperCase();
  if (!input.prebookId.trim() || !input.transactionId.trim() || !input.offerId.trim() || !/^[A-Za-z0-9_-]+$/.test(input.hotelId.trim())) throw new Error("Invalid Nuitee checkout proof input");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(input.departure) || Date.parse(`${input.departure}T00:00:00Z`) <= Date.parse(`${input.arrival}T00:00:00Z`)) throw new Error("Invalid Nuitee stay dates");
  if (!Number.isFinite(input.price) || input.price <= 0 || !/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid Nuitee checkout amount");
  return {...input, prebookId: input.prebookId.trim(), transactionId: input.transactionId.trim(), offerId: input.offerId.trim(), hotelId: input.hotelId.trim(), hotelName: input.hotelName.trim(), city: input.city.trim() || input.hotelName.trim(), roomName: input.roomName?.trim() || null, boardName: input.boardName?.trim() || null, adults: Math.max(1, Math.min(20, Math.round(input.adults))), children: Math.max(0, Math.min(20, Math.round(input.children))), price: Number(input.price.toFixed(2)), currency};
}

function normalizeGuest(input: NuiteeCheckoutGuest): NuiteeCheckoutGuest {
  const firstName = input.firstName.trim().slice(0, 100);
  const lastName = input.lastName.trim().slice(0, 100);
  const email = input.email.trim().toLowerCase().slice(0, 254);
  const phone = input.phone?.trim().slice(0, 40);
  if (firstName.length < 2 || lastName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApplicationError("NUITEE_GUEST_INVALID", "Valid guest name and email are required", 400);
  return {firstName, lastName, email, ...(phone ? {phone} : {})};
}

function readProof(value: string): ProofPayload {
  const [encoded, signature, extra] = value.trim().split(".");
  if (!encoded || !signature || extra || !secureEqual(signature, sign(encoded))) throw new ApplicationError("NUITEE_CHECKOUT_PROOF_INVALID", "The checkout session is invalid or was modified", 400);
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); } catch { throw new ApplicationError("NUITEE_CHECKOUT_PROOF_INVALID", "The checkout session is invalid", 400); }
  const raw = asRecord(parsed);
  if (raw.v !== 1 || typeof raw.exp !== "number" || raw.exp < Date.now()) throw new ApplicationError("NUITEE_CHECKOUT_PROOF_EXPIRED", "The checkout session expired. Refresh the room rate and try again.", 409);
  return {...normalizeProof({
    prebookId: stringValue(raw.prebookId) ?? "",
    transactionId: stringValue(raw.transactionId) ?? "",
    offerId: stringValue(raw.offerId) ?? "",
    hotelId: stringValue(raw.hotelId) ?? "",
    hotelName: stringValue(raw.hotelName) ?? "",
    city: stringValue(raw.city) ?? "",
    roomName: nullableString(raw.roomName),
    boardName: nullableString(raw.boardName),
    arrival: stringValue(raw.arrival) ?? "",
    departure: stringValue(raw.departure) ?? "",
    adults: numberValue(raw.adults),
    children: numberValue(raw.children),
    price: numberValue(raw.price),
    currency: stringValue(raw.currency) ?? "",
    cancellationPolicy: raw.cancellationPolicy ?? null,
    sandbox: raw.sandbox === true,
  }), v: 1, exp: raw.exp};
}

function sign(value: string): string {return createHmac("sha256", checkoutSigningKey()).update(value).digest("base64url");}
function paymentRecoveryToken(transactionId: string): string {return createHmac("sha256", checkoutSigningKey()).update(`payment-return:${transactionId}`).digest("base64url");}
function checkoutSigningKey(): string {
  const dedicated = process.env.NUITEE_CHECKOUT_SIGNING_SECRET?.trim();
  const apiKey = process.env.NUITEE_API_KEY?.trim();
  const key = dedicated || apiKey;
  if (!key) throw new Error("Nuitee checkout signing secret is not configured");
  return key;
}
function secureEqual(left: string, right: string): boolean {const a=Buffer.from(left);const b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b);}
function tokenFingerprint(token: string): string {return `NUITEE_TOKEN_${sha256(token)}`;}
function sha256(value: string): string {return createHash("sha256").update(value).digest("hex");}
function dateValue(value: string): Date {return new Date(`${value}T00:00:00.000Z`);}
function dateKey(value: Date): string {return value.toISOString().slice(0, 10);}
function cleanOrigin(value: string): string {const url=new URL(value);if(url.protocol!=="https:"&&url.hostname!=="localhost")throw new ApplicationError("NUITEE_RETURN_ORIGIN_INVALID","Invalid payment return origin",400);return url.origin;}
function asRecord(value: unknown): JsonRecord {return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};}
function stringValue(value: unknown): string | null {return typeof value === "string" && value.trim() ? value.trim() : null;}
function nullableString(value: unknown): string | null {return stringValue(value);}
function numberValue(value: unknown): number {return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;}
function jsonSafe(value: unknown): any {return value === undefined ? null : JSON.parse(JSON.stringify(value));}
function safeReviewMessage(value: string | null): string {return value?.replace(/^.*?:\s*/, "").slice(0, 500) || "Payment returned, but the hotel confirmation requires manual verification. Do not pay again.";}
function providerError(error: unknown): {code: string; message: string} {
  if (error instanceof NuiteeApiError) return {code: `NUITEE_${error.code ?? error.status}`, message: error.description ?? error.providerMessage ?? error.message};
  if (error instanceof Error) return {code: error.name === "TimeoutError" ? "NUITEE_TIMEOUT" : "NUITEE_BOOK_FAILED", message: error.message};
  return {code: "NUITEE_BOOK_FAILED", message: "Nuitee booking confirmation failed"};
}
