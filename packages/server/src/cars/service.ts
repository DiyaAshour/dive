import { database } from "@platform/database";
import { badRequest, forbidden, notFound } from "../errors";
import { resolveAutomaticCarVisual } from "./auto-visuals";

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
  catalogVehicleId?: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  bodyType?: string;
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
  const db = database();
  const rows = await db.carVehicle.findMany({
    where: {companyId: membership.companyId},
    orderBy: [{status: "asc"}, {createdAt: "desc"}],
    include: {homeLocation: true},
  });
  const links = rows.length ? await db.carVehicleCatalogLink.findMany({
    where: {vehicleId: {in: rows.map((row) => row.id)}},
    include: {catalogVehicle: true},
  }) : [];
  const catalogByVehicle = new Map(links.map((link) => [link.vehicleId, link.catalogVehicle]));
  return rows.map((row) => serializeVehicle(row, catalogByVehicle.get(row.id)));
}

export async function createCarVehicle(userId: string, input: CreateCarVehicleInput) {
  const membership = await requireCompany(userId);
  const db = database();
  let catalog = input.catalogVehicleId ? await db.carCatalogVehicle.findFirst({where: {id: input.catalogVehicleId, active: true}}) : null;
  if (input.catalogVehicleId && !catalog) notFound("Car catalog vehicle");

  const automaticVisual = await resolveAutomaticCarVisual({
    preferredCatalogVehicleId: catalog?.id,
    make: catalog?.make ?? input.make,
    model: catalog ? [catalog.model, catalog.trim].filter(Boolean).join(" ") : input.model,
    year: catalog?.year ?? input.year,
    trim: catalog?.trim ?? input.trim,
    bodyType: catalog?.bodyType ?? input.bodyType,
    category: catalog?.category ?? input.category,
    transmission: catalog?.transmission ?? input.transmission,
    fuel: catalog?.fuel ?? input.fuel,
    seats: catalog?.seats ?? input.seats,
    bags: catalog?.bags ?? input.bags,
    doors: catalog?.doors ?? input.doors,
  });
  if (automaticVisual?.catalog) catalog = automaticVisual.catalog;

  const year = catalog?.year ?? input.year;
  const seats = catalog?.seats ?? input.seats;
  const make = catalog?.make ?? input.make.trim();
  const model = catalog ? [catalog.model, catalog.trim].filter(Boolean).join(" ") : input.model.trim();
  const category = catalog?.category ?? input.category.trim();
  const transmission = catalog?.transmission ?? input.transmission;
  const fuel = catalog?.fuel ?? input.fuel;
  const bags = catalog?.bags ?? input.bags ?? 2;
  const doors = catalog?.doors ?? input.doors ?? 4;

  if (year < 1990 || year > new Date().getUTCFullYear() + 1) badRequest("CAR_YEAR_INVALID", "Vehicle year is invalid");
  if (seats < 1 || seats > 16) badRequest("CAR_SEATS_INVALID", "Vehicle seat count is invalid");
  if (input.dailyPrice <= 0) badRequest("CAR_PRICE_INVALID", "Daily price must be greater than zero");
  if (!Number.isFinite(input.deposit) || input.deposit <= 0) badRequest("CAR_DEPOSIT_REQUIRED", "A deposit greater than zero is required for every vehicle");

  if (input.homeLocationId) {
    const location = await db.carRentalLocation.findFirst({where: {id: input.homeLocationId, companyId: membership.companyId}});
    if (!location) notFound("Car rental location");
  }

  const row = await db.$transaction(async (tx) => {
    const vehicle = await tx.carVehicle.create({
      data: {
        companyId: membership.companyId,
        homeLocationId: input.homeLocationId || null,
        make,
        model,
        year,
        category,
        transmission,
        fuel,
        seats,
        bags,
        doors,
        dailyPrice: input.dailyPrice,
        deposit: input.deposit,
        freeCancellation: input.freeCancellation ?? true,
        unlimitedMileage: input.unlimitedMileage ?? false,
        airportPickup: input.airportPickup ?? false,
        imageUrl: catalog?.primaryImageUrl ?? input.imageUrl?.trim() ?? null,
        imageAlt: catalog ? `${make} ${model} ${year}` : input.imageAlt?.trim() || null,
        status: "ACTIVE",
      },
      include: {homeLocation: true},
    });
    if (catalog) {
      await tx.carVehicleCatalogLink.create({
        data: {
          vehicleId: vehicle.id,
          catalogVehicleId: catalog.id,
          matchedBy: input.catalogVehicleId ? "PARTNER" : automaticVisual?.matchedBy ?? "AUTO_EXACT",
        },
      });
    }
    return vehicle;
  });
  return serializeVehicle(row, catalog);
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
  const db = database();
  const rows = await db.carVehicle.findMany({
    where: {status: "ACTIVE", deposit: {gt: 0}, company: {status: "ACTIVE", verified: true}},
    orderBy: [{dailyPrice: "asc"}, {createdAt: "desc"}],
    include: {company: true, homeLocation: true},
  });
  const links = rows.length ? await db.carVehicleCatalogLink.findMany({
    where: {vehicleId: {in: rows.map((row) => row.id)}},
    include: {catalogVehicle: true},
  }) : [];
  const catalogByVehicle = new Map(links.map((link) => [link.vehicleId, link.catalogVehicle]));
  return rows.map((row) => {
    const catalog = catalogByVehicle.get(row.id);
    return {
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
      imageUrl: catalog?.primaryImageUrl ?? row.imageUrl,
      imageAlt: catalog ? `${catalog.make} ${catalog.model}${catalog.trim ? ` ${catalog.trim}` : ""} ${catalog.year}` : row.imageAlt,
      catalogVehicleId: catalog?.id ?? null,
      visualProvider: catalog?.provider ?? null,
      exterior360Available: catalog?.exterior360Available ?? false,
      interior360Available: catalog?.interior360Available ?? false,
      location: row.homeLocation?.name ?? row.company.city,
    };
  });
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

function serializeVehicle(row: any, catalog?: any) {
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
    imageUrl: catalog?.primaryImageUrl ?? row.imageUrl,
    imageAlt: catalog ? `${catalog.make} ${catalog.model}${catalog.trim ? ` ${catalog.trim}` : ""} ${catalog.year}` : row.imageAlt,
    status: row.status,
    catalog: catalog ? {
      id: catalog.id,
      slug: catalog.slug,
      make: catalog.make,
      model: catalog.model,
      year: catalog.year,
      generation: catalog.generation,
      trim: catalog.trim,
      provider: catalog.provider,
      primaryImageUrl: catalog.primaryImageUrl,
      exterior360Available: catalog.exterior360Available,
      interior360Available: catalog.interior360Available,
    } : null,
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
