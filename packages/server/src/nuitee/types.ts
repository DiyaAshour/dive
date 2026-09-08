export type NuiteeSearchInput = Readonly<{
  destination: string;
  countryCode?: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  childrenAges?: readonly number[];
  guestNationality?: string;
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
  stars?: readonly number[];
  freeCancellation?: boolean;
  paymentMode?: "PAY_NOW" | "PAY_AT_HOTEL";
  maxRatesPerHotel?: number;
  limit?: number;
}>;

export type NuiteeCancellation = Readonly<{
  amount: number;
  from: string | null;
  currency: string | null;
  timezone: string | null;
}>;

export type NuiteeOffer = Readonly<{
  offerId: string;
  rateId: string | null;
  roomName: string;
  mappedRoomId: string | null;
  boardCode: string | null;
  boardName: string | null;
  total: number;
  currency: string;
  averageNightlyTotal: number;
  availableToSell: number;
  paymentModes: readonly ("PAY_NOW" | "PAY_AT_HOTEL")[];
  freeCancellationNow: boolean;
  cancellationPolicy: {name: string; rules: readonly NuiteeCancellation[]};
  promotion: {name: string; discountPercent: number} | null;
}>;

export type NuiteePhoto = Readonly<{url: string; alt: string; sortOrder: number}>;

export type NuiteeRoom = Readonly<{
  id: string;
  name: string;
  description: string | null;
  maxAdults: number | null;
  maxChildren: number | null;
  maxOccupancy: number | null;
  sizeValue: number | null;
  sizeUnit: string | null;
  beds: ReadonlyArray<{quantity: number; type: string; size: string | null}>;
  amenities: ReadonlyArray<{code: string; name: string}>;
  photos: readonly NuiteePhoto[];
}>;

export type NuiteeSearchResult = Readonly<{
  id: string;
  slug: string;
  source: "NUITEE_API";
  providerHotelCode: string;
  name: string;
  city: string;
  countryCode: string;
  area: string | null;
  address: string | null;
  starRating: number | null;
  currency: string;
  coverPhoto: NuiteePhoto | null;
  photos: readonly NuiteePhoto[];
  amenities: ReadonlyArray<{code: string; name: string; category: string | null}>;
  reviewSummary: {count: number; overall: number | null};
  availableOffers: number;
  rates: readonly NuiteeOffer[];
  from: NuiteeOffer;
}>;

export type NuiteeHotelDetails = Readonly<{
  id: string;
  slug: string;
  source: "NUITEE_API";
  providerHotelCode: string;
  name: string;
  city: string;
  countryCode: string;
  area: string | null;
  address: string | null;
  description: string | null;
  importantInformation: string | null;
  location: {latitude: number; longitude: number} | null;
  starRating: number | null;
  currency: string;
  coverPhoto: NuiteePhoto | null;
  photos: readonly NuiteePhoto[];
  rooms: readonly NuiteeRoom[];
  amenities: ReadonlyArray<{code: string; name: string; category: string | null}>;
  reviewSummary: {count: number; overall: number | null};
  checkInTime: string | null;
  checkInEndTime: string | null;
  checkOutTime: string | null;
  checkInInstructions: readonly string[];
  checkInSpecialInstructions: string | null;
  offers: readonly NuiteeOffer[];
  sandbox: boolean;
}>;

export type NuiteePrebook = Readonly<{
  prebookId: string;
  transactionId: string | null;
  secretKey: string | null;
  offerId: string;
  hotelId: string;
  price: number;
  currency: string;
  commission: number | null;
  roomName: string | null;
  boardName: string | null;
  cancellationPolicy: {name: string; rules: readonly NuiteeCancellation[]};
  sandbox: boolean;
  raw: unknown;
}>;

export type NuiteeBookingInput = Readonly<{
  prebookId: string;
  transactionId: string;
  holderFirstName: string;
  holderLastName: string;
  email: string;
  phone: string;
}>;

export type NuiteeBookingResult = Readonly<{
  bookingId: string | null;
  hotelConfirmationCode: string | null;
  status: string | null;
  raw: unknown;
}>;
