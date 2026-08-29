import type { BookingQuoteInput } from "@platform/contracts";
import { getDemoHotelDetails } from "../discovery/demo-hotel-fallback";

export function getDemoBookingQuote(input: BookingQuoteInput) {
  if (!input.hotelId.startsWith("demo-")) return null;

  const hotel = getDemoHotelDetails(input.hotelId, {
    arrival: input.arrival,
    departure: input.departure,
    adults: input.adults,
    children: input.children,
  });
  if (!hotel) return null;

  const offer = hotel.offers.find(
    (candidate) =>
      candidate.roomTypeId === input.roomTypeId &&
      candidate.ratePlanId === input.ratePlanId,
  );
  if (!offer) return null;

  return {
    hotel: { id: hotel.id, name: hotel.name, currency: hotel.currency },
    roomType: {
      id: offer.roomTypeId,
      name: offer.roomName,
      maxGuests: offer.maxGuests,
      maxAdults: offer.maxAdults,
      maxChildren: offer.maxChildren,
    },
    ratePlan: {
      id: offer.ratePlanId,
      name: offer.ratePlanName,
      code: offer.ratePlanCode,
    },
    arrival: input.arrival,
    departure: input.departure,
    occupancy: { adults: input.adults, children: input.children },
    nights: hotel.stay.nights,
    amounts: offer.amounts,
    promotion: offer.promotion,
    allowedPaymentModes: offer.paymentModes,
    cancellationPolicy: offer.cancellationPolicy,
    availableToSell: offer.availableToSell,
  };
}
