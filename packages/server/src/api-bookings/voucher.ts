import {database} from "@platform/database";
import {extractHotelbedsRateComments} from "../hotelbeds/content";

export async function getApiBookingVoucher(id: string) {
  const booking = await database().apiBooking.findUnique({where: {id}});
  if (!booking) return null;
  const request = record(booking.providerRequest);
  const response = record(booking.providerResponse);
  const supplier = findSupplier(response);
  const hotelAddress = findHotelAddress(response) ?? stringValue(request.hotelAddress);
  const rateComments = stringValue(request.rateComments) ?? extractHotelbedsRateComments(response);
  const childrenAges = Array.isArray(booking.childrenAges)
    ? booking.childrenAges.map(Number).filter((age) => Number.isInteger(age) && age >= 0 && age <= 17)
    : [];
  return {
    id: booking.id,
    status: booking.status,
    handMeKeyReference: booking.reference,
    hotelbedsReference: booking.providerReference,
    clientReference: booking.clientReference,
    hotel: {
      code: booking.hotelCode,
      name: booking.hotelName,
      city: booking.city,
      address: hotelAddress,
    },
    guest: {name: booking.guestName, email: booking.guestEmail},
    arrival: booking.arrival.toISOString().slice(0, 10),
    departure: booking.departure.toISOString().slice(0, 10),
    adults: booking.adults,
    children: booking.children,
    childrenAges,
    roomName: booking.roomName,
    boardName: booking.boardName,
    rateComments,
    supplier: {
      name: supplier?.name ?? "Hotelbeds",
      vatNumber: supplier?.vatNumber ?? null,
    },
  };
}

function findSupplier(value: unknown): {name: string; vatNumber: string | null} | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findSupplier(item);
      if (result) return result;
    }
    return null;
  }
  const source = value as Record<string, unknown>;
  const direct = record(source.supplier);
  const name = stringValue(direct.name) ?? stringValue(direct.supplierName);
  if (name) return {name, vatNumber: stringValue(direct.vatNumber) ?? stringValue(direct.vat)};
  for (const child of Object.values(source)) {
    const result = findSupplier(child);
    if (result) return result;
  }
  return null;
}

function findHotelAddress(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findHotelAddress(item);
      if (result) return result;
    }
    return null;
  }
  const source = value as Record<string, unknown>;
  const hotel = record(source.hotel);
  const direct = addressValue(hotel.address);
  if (direct) return direct;
  for (const child of Object.values(source)) {
    const result = findHotelAddress(child);
    if (result) return result;
  }
  return null;
}

function addressValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  const source = record(value);
  return stringValue(source.content) ?? stringValue(source.address) ?? stringValue(source.street);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}
