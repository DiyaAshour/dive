import { database } from "@platform/database";
import { badRequest, forbidden, notFound } from "../errors";

export type CreateCarCompanyInput = Readonly<{
  name: string;
  city: string;
  countryCode: string;
  address: string;
  timezone?: string;
  currency?: string;
  supportEmail?: string;
  supportPhone?: string;
}>;

export type CreateCarVehicleInput = Readonly<{
  make: string;
  model: string;
  year: number;
  category: string;
  transmission: "AUTOMATIC" | "MANUAL";
  fuel: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
  seats: number;
  bags?: number;
  doors?: number;
  dailyPrice: number;
  deposit: number;
  freeCancellation?: boolean;
  unlimitedMileage?: boolean;
  airportPickup?: boolean;
  imageUrl?: string;
  imageAlt?: string;
  homeLocationId?: string;
}>;

export type CreateCarLocationInput = Readonly<{
  name: string;
  city: string;
  address: string;
  airportCode?: string;
}>;

async function membershipForUser(userId: string) {
  const membership = await database().carCompanyMembership.findFirst({
    where: {userId, status: "ACTIVE"},
    orderBy: {createdAt: "asc"},
    include: {company: true},
  });
  return membership;
}

async function requireCompany(userId: string) {
  const membership = await membershipForUser(userId);
  if (!membership) forbidden("Car rental company access required");
  return membership;
}

export async function getCarCompanyForUser(userId: string) {
  const membership = await membershipForUser(userId);
  if (!membership) return null;
  const locations = await database().carRentalLocation.findMany({
    where: {companyId: membership.companyId},
    orderBy: [{active: "desc"}, {createdAt: "asc"}],
  });
  return {
    membership: {id: membership.id, role: membership.role, status: membership.status},
    company: serializeCompany(membership.company),
    locations: locations.map(serializeLocation),
  };
}

export async function createCarCompany(userId: string, input: CreateCarCompanyInput) {
  const existing = await membershipForUser(userId);
  if (existing) badRequest("CAR_COMPANY_EXISTS", "You already have access to a car rental company");

  const name = input.name.trim();
  const city = input.city.trim();
  const address = input.address.trim();
  if (!name || !city || !address) badRequest("CAR_COMPANY_FIELDS_REQUIRED", "Company name, city and address are required");

  const slug = `${slugify(name) || "rental"}-${Date.now().toString(36).slice(-6)}`;
  const db = database();
  const created = await db.$transaction(async (tx) => {
    const company = await tx.carRentalCompany.create({
      data: {
        name,
        slug,
        city,
        address,
        countryCode: input.countryCode.trim().toUpperCase().slice(0, 2) || "JO",
        timezone: input.timezone?.trim() || "Asia/Amman",
        currency: input.currency?.trim().toUpperCase().slice(0, 3) || "JOD",
        supportEmail: input.supportEmail?.trim() || null,
        supportPhone: input.supportPhone?.trim() || null,
      },
    });
    await tx.carCompanyMembership.create({
      data: {companyId: company.id, userId, role: "OWNER", status: "ACTIVE"},
    });
    const location = await tx.carRentalLocation.create({
      data: {
        companyId: company.id,
        name: city,
        city,
        address,
        pickupEnabled: true,
        returnEnabled: true,
      },
    });
    return {company, location};
  });

  return {company: serializeCompany(created.company), location: serializeLocation(created.location)};
}

export async function getCarDashboard(userId: string) {
  const membership = await requireCompany(userId);
  const db = database();
  const [vehicleCount, activeVehicles, maintenanceVehicles, locationCount, upcomingReservations, recentReservations] = await Promise.all([
    db.carVehicle.count({where: {companyId: membership.companyId}}),
    db.carVehicle.count({where: {companyId: membership.companyId, status: "ACTIVE"}}),
    db.carVehicle.count({where: {companyId: membership.companyId, status: "MAINTENANCE"}}),
    db.carRentalLocation.count({where: {companyId: membership.companyId, active: true}}),
    db.carReservation.count({where: {companyId: membership.companyId, status: {in: ["HOLD", "CONFIRMED", "MODIFIED"]}, pickupAt: {gte: new Date()}}}),
    db.carReservation.findMany({
      where: {companyId: membership.companyId},
      orderBy: {createdAt: "desc"},
      take: 6,
      include: {vehicle: true, pickupLocation: true, returnLocation: true},
    }),
  ]);

  return {
    company: serializeCompany(membership.company),
    membership: {role: membership.role, status: membership.status},
    metrics: {vehicleCount, activeVehicles, maintenanceVehicles, locationCount, upcomingReservations},
    recentReservations: recentReservations.map((reservation) => ({
      id: reservation.id,
      reference: reservation.reference,
      guestName: reservation.guestName,
      status: reservation.status,
      pickupAt: reservation.pickupAt.toISOString(),
      returnAt: reservation.returnAt.toISOString(),
      total: Number(reservation.total),
      currency: reservation.currency,
      vehicle: `${reservation.vehicle.make} ${reservation.vehicle.model}`,
      pickupLocation: reservation.pickupLocation.name,
      returnLocation: reservation.returnLocation.name,
    })),
  };
}

export async function listCarCompanyVehicles(userId: string) {
  const membership = await requireCompany(userId);
  const rows = await database().carVehicle.findMany({
    where: {companyId: membership.companyId},
    orderBy: [{status: "asc"}, {createdAt: "desc"}],
    include: {homeLocation: true},
  });
  return rows.map((row) => serializeVehicle(row));
}

export async function createCarVehicle(userId: string, input: CreateCarVehicleInput) {
  const membership = await requireCompany(userId);
  if (input.year < 1990 || input.year > new Date().getUTCFullYear() + 1) badRequest("CAR_YEAR_INVALID", "Vehicle year is invalid");
  if (input.seats < 1 || input.seats > 16) badRequest("CAR_SEATS_INVALID", "Vehicle seat count is invalid");
  if (input.dailyPrice <= 0) badRequest("CAR_PRICE_INVALID", "Daily price must be greater than zero");
  if (!Number.isFinite(input.deposit) || input.deposit <= 0) badRequest("CAR_DEPOSIT_REQUIRED", "A deposit greater than zero is required for every vehicle");

  if (input.homeLocationId) {
    const location = await database().carRentalLocation.findFirst({where: {id: input.homeLocationId, companyId: membership.companyId}});
    if (!location) notFound("Car rental location");
  }

  const row = await database().carVehicle.create({
    data: {
      companyId: membership.companyId,
      homeLocationId: input.homeLocationId || null,
      make: input.make.trim(),
      model: input.model.trim(),
      year: input.year,
      category: input.category.trim(),
      transmission: input.transmission,
      fuel: input.fuel,
      seats: input.seats,
      bags: input.bags ?? 2,
      doors: input.doors ?? 4,
      dailyPrice: input.dailyPrice,
      deposit: input.deposit,
      freeCancellation: input.freeCancellation ?? true,
      unlimitedMileage: input.unlimitedMileage ?? false,
      airportPickup: input.airportPickup ?? false,
      imageUrl: input.imageUrl?.trim() || null,
      imageAlt: input.imageAlt?.trim() || null,
      status: "ACTIVE",
    },
    include: {homeLocation: true},
  });
  return serializeVehicle(row);
}

export async function listCarCompanyLocations(userId: string) {
  const membership = await requireCompany(userId);
  const rows = await database().carRentalLocation.findMany({
    where: {companyId: membership.companyId},
    orderBy: [{active: "desc"}, {createdAt: "asc"}],
  });
  return rows.map(serializeLocation);
}

export async function createCarRentalLocation(userId: string, input: CreateCarLocationInput) {
  const membership = await requireCompany(userId);
  const row = await database().carRentalLocation.create({
    data: {
      companyId: membership.companyId,
      name: input.name.trim(),
      city: input.city.trim(),
      address: input.address.trim(),
      airportCode: input.airportCode?.trim().toUpperCase().slice(0, 3) || null,
    },
  });
  return serializeLocation(row);
}

export async function listCarCompanyReservations(userId: string) {
  const membership = await requireCompany(userId);
  const rows = await database().carReservation.findMany({
    where: {companyId: membership.companyId},
    orderBy: {pickupAt: "asc"},
    include: {vehicle: true, pickupLocation: true, returnLocation: true},
  });
  return rows.map((reservation) => ({
    id: reservation.id,
    reference: reservation.reference,
    guestName: reservation.guestName,
    guestEmail: reservation.guestEmail,
    guestPhone: reservation.guestPhone,
    status: reservation.status,
    pickupAt: reservation.pickupAt.toISOString(),
    returnAt: reservation.returnAt.toISOString(),
    vehicle: `${reservation.vehicle.make} ${reservation.vehicle.model}`,
    pickupLocation: reservation.pickupLocation.name,
    returnLocation: reservation.returnLocation.name,
    total: Number(reservation.total),
    deposit: Number(reservation.deposit),
    currency: reservation.currency,
    paymentMode: reservation.paymentMode,
  }));
}

export async function listPublicCarVehicles() {
  const rows = await database().carVehicle.findMany({
    where: {status: "ACTIVE", deposit: {gt: 0}, company: {status: "ACTIVE", verified: true}},
    orderBy: [{dailyPrice: "asc"}, {createdAt: "desc"}],
    include: {company: true, homeLocation: true},
  });
  return rows.map((row) => ({
    id: row.id,
    brand: row.make,
    model: row.model,
    year: row.year,
    category: row.category,
    transmission: row.transmission === "AUTOMATIC" ? "Automatic" : "Manual",
    fuel: titleFuel(row.fuel),
    seats: row.seats,
    bags: row.bags,
    supplier: row.company.name,
    supplierRating: 0,
    dailyPrice: Number(row.dailyPrice),
    deposit: Number(row.deposit),
    freeCancellation: row.freeCancellation,
    unlimitedMileage: row.unlimitedMileage,
    airportPickup: row.airportPickup,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    location: row.homeLocation?.name ?? row.company.city,
  }));
}

function serializeCompany(company: {
  id:string;name:string;slug:string;city:string;countryCode:string;address:string;timezone:string;currency:string;status:string;verified:boolean;supportEmail:string|null;supportPhone:string|null;commissionRate:unknown;createdAt:Date;updatedAt:Date;
}) {
  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    city: company.city,
    countryCode: company.countryCode,
    address: company.address,
    timezone: company.timezone,
    currency: company.currency,
    status: company.status,
    verified: company.verified,
    supportEmail: company.supportEmail,
    supportPhone: company.supportPhone,
    commissionRate: Number(company.commissionRate),
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

function serializeLocation(row: {id:string;companyId:string;name:string;city:string;address:string;airportCode:string|null;pickupEnabled:boolean;returnEnabled:boolean;active:boolean;createdAt:Date;updatedAt:Date}) {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    city: row.city,
    address: row.address,
    airportCode: row.airportCode,
    pickupEnabled: row.pickupEnabled,
    returnEnabled: row.returnEnabled,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeVehicle(row: any) {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    year: row.year,
    category: row.category,
    transmission: row.transmission,
    fuel: row.fuel,
    seats: row.seats,
    bags: row.bags,
    doors: row.doors,
    dailyPrice: Number(row.dailyPrice),
    deposit: Number(row.deposit),
    freeCancellation: row.freeCancellation,
    unlimitedMileage: row.unlimitedMileage,
    airportPickup: row.airportPickup,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    status: row.status,
    homeLocation: row.homeLocation ? {id: row.homeLocation.id, name: row.homeLocation.name, city: row.homeLocation.city} : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 46);
}

function titleFuel(value: string) {
  if (value === "PETROL") return "Petrol";
  if (value === "DIESEL") return "Diesel";
  if (value === "HYBRID") return "Hybrid";
  return "Electric";
}
