import type { NextRequest } from "next/server";
import { idempotencyKeySchema, modifyBookingSchema } from "@platform/contracts";
import {
  ApplicationError,
  bookingView,
  getBookingExperienceContext,
  modifyBooking,
  previewCancellation,
  queueBookingLifecycleEmails,
  requireBookingAccess,
  walletAppliedToBooking,
  withBookingConcurrencyRetry,
} from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { demoBookingView } from "@/lib/demo-booking";
import { bookingAccessContext, bookingToken, idempotencyKey } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;

    if (bookingId.startsWith("demo-booking-")) {
      const booking = await demoBookingView(bookingId, bookingToken(request));
      if (!booking) throw new ApplicationError("INVALID_BOOKING_ACCESS", "Demo reservation access expired or is invalid", 401);
      return ok(booking);
    }

    const access = await bookingAccessContext(request);
    await requireBookingAccess(bookingId, access);
    const [booking, experience, walletApplied] = await Promise.all([
      bookingView(bookingId),
      getBookingExperienceContext(bookingId),
      walletAppliedToBooking(bookingId),
    ]);

    const currentCancellation = isCancellationManageable(booking.status)
      ? await previewCancellation(bookingId, access)
      : booking.status === "CANCELLED"
        ? {
            policy: booking.cancellation.policy,
            penaltyAmount: booking.cancellation.penaltyAmount,
            refundableAmount: booking.cancellation.refundableAmount ?? 0,
            alreadyCancelled: true,
          }
        : null;

    return ok({
      ...booking,
      hotel: {...booking.hotel, ...experience.hotel},
      account: experience.account,
      viewer: {signedIn: Boolean(access.userId)},
      arrivalInfo: experience.arrivalInfo,
      today: experience.today,
      stayPhase: experience.stayPhase,
      cancellation: {...booking.cancellation, current: currentCancellation},
      wallet: {
        appliedAmount: walletApplied,
        remainingAmount: Math.max(0, Math.round((booking.amounts.total - walletApplied) * 100) / 100),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    if (bookingId.startsWith("demo-booking-")) {
      throw new ApplicationError("DEMO_BOOKING_READ_ONLY", "Demo reservations cannot be modified", 409);
    }
    const parsed = modifyBookingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    const access = await bookingAccessContext(request);
    const booking = await withBookingConcurrencyRetry(() => modifyBooking(bookingId, parsed.data, parsedKey.data, access));
    if (booking.status === "MODIFIED") await queueBookingLifecycleEmails(bookingId, "MODIFIED").catch((error) => console.error("[booking-email] modification queue failed", error));
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}

function isCancellationManageable(status: string): boolean {
  return status === "HOLD" || status === "CONFIRMED" || status === "MODIFIED";
}
