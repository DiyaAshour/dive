import { database } from "@platform/database";
import { badRequest, notFound } from "../errors";
import { requirePlatformAdmin } from "./authorization";

export type CarCompanyDecisionInput = Readonly<{
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";
  verified: boolean;
}>;

export type AdminCarVehicleUpdateInput = Readonly<{
  make: string;
  model: string;
  year: number;
  category: string;
  transmission: "AUTOMATIC" | "MANUAL";
  fuel: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
  seats: number;
  bags: number;
  doors: number;
  airConditioning: boolean;
  dailyPrice: number;
  deposit: number;
  freeCancellation: boolean;
  unlimitedMileage: boolean;
  airportPickup: boolean;
  homeLocationId?: string | null | undefined;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
}>;

type CarReservationStatusValue = "HOLD" | "CONFIRMED" | "MODIFIED" | "CANCELLED" | "NO_SHOW" | "COMPLETED" | "EXPIRED";

const BOOKED_STATUSES: CarReservationStatusValue[] = ["CONFIRMED", "MODIFIED", "COMPLETED"];
const UPCOMING_STATUSES: CarReservationStatusValue[] = ["HOLD", "CONFIRMED", "MODIFIED"];

export async function getAdminCarOverview(adminUserId: string) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const now = new Date();
  const [
    companyCount,
    activeCompanies,
    pendingCompanies,
    suspendedCompanies,
    vehicleCount,
    activeVehicles,
    reservationCount,
    upcomingReservations,
    bookedValue,
    recentReservations,
    recentCompanies,
  ] = await Promise.all([
    db.carRentalCompany.count(),
    db.carRentalCompany.count({where: {status: "ACTIVE"}}),
    db.carRentalCompany.count({where: {status: "PENDING_REVIEW"}}),
    db.carRentalCompany.count({where: {status: "SUSPENDED"}}),
    db.carVehicle.count(),
    db.carVehicle.count({where: {status: "ACTIVE"}}),
    db.carReservation.count(),
    db.carReservation.count({where: {status: {in: UPCOMING_STATUSES}, pickupAt: {gte: now}}}),
    db.carReservation.aggregate({where: {status: {in: BOOKED_STATUSES}}, _sum: {total: true}}),
    db.carReservation.findMany({
      orderBy: {createdAt: "desc"},
      take: 8,
      include: {company: true, vehicle: true, pickupLocation: true, returnLocation: true},
    }),
    db.carRentalCompany.findMany({
      orderBy: {createdAt: "desc"},
      take: 6,
      include: {_count: {select: {vehicles: true, locations: true, reservations: true, memberships: true}}},
    }),
  ]);

  return {
    metrics: {
      companyCount,
      activeCompanies,
      pendingCompanies,
      suspendedCompanies,
      vehicleCount,
      activeVehicles,
      reservationCount,
      upcomingReservations,
      bookedValue: Number(bookedValue._sum.total ?? 0),
    },
    recentReservations: recentReservations.map(serializeAdminReservation),
    recentCompanies: recentCompanies.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city,
      countryCode: row.countryCode,
      status: row.status,
      verified: row.verified,
      currency: row.currency,
      createdAt: row.createdAt.toISOString(),
      counts: row._count,
    })),
  };
}

export async function listAdminCarCompanies(adminUserId: string, filters: {query?: string; status?: string} = {}) {
  await requirePlatformAdmin(adminUserId);
  const query = filters.query?.trim();
  const allowedStatus = new Set(["DRAFT", "PENDING_REVIEW", "ACTIVE", "SUSPENDED"]);
  const status = filters.status && allowedStatus.has(filters.status)
    ? filters.status as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED"
    : undefined;
  const db = database();
  const rows = await db.carRentalCompany.findMany({
    where: {
      ...(status ? {status} : {}),
      ...(query ? {OR: [
        {name: {contains: query, mode: "insensitive"}},
        {city: {contains: query, mode: "insensitive"}},
        {slug: {contains: query, mode: "insensitive"}},
        {supportEmail: {contains: query, mode: "insensitive"}},
      ]} : {}),
    },
    orderBy: {createdAt: "desc"},
    include: {_count: {select: {vehicles: true, locations: true, reservations: true, memberships: true}}},
  });

  const companyIds = rows.map((row) => row.id);
  const [valueGroups, upcomingGroups] = companyIds.length ? await Promise.all([
    db.carReservation.groupBy({
      by: ["companyId"],
      where: {companyId: {in: companyIds}, status: {in: BOOKED_STATUSES}},
      _sum: {total: true},
    }),
    db.carReservation.groupBy({
      by: ["companyId"],
      where: {companyId: {in: companyIds}, status: {in: UPCOMING_STATUSES}, pickupAt: {gte: new Date()}},
      _count: {id: true},
    }),
  ]) : [[], []];

  const values = new Map(valueGroups.map((group) => [group.companyId, Number(group._sum.total ?? 0)]));
  const upcoming = new Map(upcomingGroups.map((group) => [group.companyId, group._count.id]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    countryCode: row.countryCode,
    address: row.address,
    currency: row.currency,
    status: row.status,
    verified: row.verified,
    supportEmail: row.supportEmail,
    supportPhone: row.supportPhone,
    commissionRate: Number(row.commissionRate),
    createdAt: row.createdAt.toISOString(),
    counts: row._count,
    bookedValue: values.get(row.id) ?? 0,
    upcomingReservations: upcoming.get(row.id) ?? 0,
  }));
}

export async function getAdminCarCompany(adminUserId: string, companyId: string) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const company = await db.carRentalCompany.findUnique({
    where: {id: companyId},
    include: {
      _count: {select: {vehicles: true, locations: true, reservations: true, memberships: true}},
      locations: {orderBy: [{active: "desc"}, {createdAt: "asc"}]},
      vehicles: {orderBy: [{status: "asc"}, {createdAt: "desc"}], take: 40, include: {homeLocation: true}},
      reservations: {
        orderBy: {createdAt: "desc"},
        take: 25,
        include: {vehicle: true, pickupLocation: true, returnLocation: true},
      },
      memberships: {orderBy: {createdAt: "asc"}},
    },
  });
  if (!company) notFound("Car rental company");

  const memberIds = company.memberships.map((membership) => membership.userId);
  const [users, gross, upcomingReservations] = await Promise.all([
    memberIds.length ? db.user.findMany({
      where: {id: {in: memberIds}},
      select: {id: true, displayName: true, email: true, platformRole: true},
    }) : Promise.resolve([]),
    db.carReservation.aggregate({where: {companyId, status: {in: BOOKED_STATUSES}}, _sum: {total: true}}),
    db.carReservation.count({where: {companyId, status: {in: UPCOMING_STATUSES}, pickupAt: {gte: new Date()}}}),
  ]);
  const userById = new Map(users.map((user) => [user.id, user]));

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
    counts: company._count,
    bookedValue: Number(gross._sum.total ?? 0),
    upcomingReservations,
    members: company.memberships.map((membership) => ({
      id: membership.id,
      userId: membership.userId,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt.toISOString(),
      user: userById.get(membership.userId) ?? null,
    })),
    locations: company.locations.map((location) => ({
      id: location.id,
      name: location.name,
      city: location.city,
      address: location.address,
      airportCode: location.airportCode,
      pickupEnabled: location.pickupEnabled,
      returnEnabled: location.returnEnabled,
      active: location.active,
    })),
    vehicles: company.vehicles.map((vehicle) => ({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      category: vehicle.category,
      transmission: vehicle.transmission,
      fuel: vehicle.fuel,
      seats: vehicle.seats,
      bags: vehicle.bags,
      doors: vehicle.doors,
      airConditioning: vehicle.airConditioning,
      dailyPrice: Number(vehicle.dailyPrice),
      deposit: Number(vehicle.deposit),
      freeCancellation: vehicle.freeCancellation,
      unlimitedMileage: vehicle.unlimitedMileage,
      airportPickup: vehicle.airportPickup,
      status: vehicle.status,
      homeLocation: vehicle.homeLocation ? {id: vehicle.homeLocation.id, name: vehicle.homeLocation.name} : null,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    })),
    reservations: company.reservations.map(serializeAdminReservation),
  };
}

export async function getAdminCarVehicle(adminUserId: string, companyId: string, vehicleId: string) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const vehicle = await db.carVehicle.findFirst({
    where: {id: vehicleId, companyId},
    include: {
      homeLocation: true,
      company: {select: {id: true, name: true, currency: true, status: true, verified: true}},
    },
  });
  if (!vehicle) notFound("Car vehicle");

  const [locations, catalogLink] = await Promise.all([
    db.carRentalLocation.findMany({
      where: {companyId},
      orderBy: [{active: "desc"}, {name: "asc"}],
      select: {id: true, name: true, city: true, active: true},
    }),
    db.carVehicleCatalogLink.findUnique({
      where: {vehicleId},
      include: {catalogVehicle: true},
    }),
  ]);

  return {
    id: vehicle.id,
    companyId: vehicle.companyId,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    category: vehicle.category,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    seats: vehicle.seats,
    bags: vehicle.bags,
    doors: vehicle.doors,
    airConditioning: vehicle.airConditioning,
    dailyPrice: Number(vehicle.dailyPrice),
    deposit: Number(vehicle.deposit),
    freeCancellation: vehicle.freeCancellation,
    unlimitedMileage: vehicle.unlimitedMileage,
    airportPickup: vehicle.airportPickup,
    status: vehicle.status,
    homeLocationId: vehicle.homeLocationId,
    homeLocation: vehicle.homeLocation ? {id: vehicle.homeLocation.id, name: vehicle.homeLocation.name, city: vehicle.homeLocation.city} : null,
    company: vehicle.company,
    locations,
    catalog: catalogLink ? {
      id: catalogLink.catalogVehicle.id,
      make: catalogLink.catalogVehicle.make,
      model: catalogLink.catalogVehicle.model,
      year: catalogLink.catalogVehicle.year,
      generation: catalogLink.catalogVehicle.generation,
      trim: catalogLink.catalogVehicle.trim,
      provider: catalogLink.catalogVehicle.provider,
      primaryImageUrl: catalogLink.catalogVehicle.primaryImageUrl,
      matchedBy: catalogLink.matchedBy,
    } : null,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export async function updateAdminCarVehicle(adminUserId: string, companyId: string, vehicleId: string, input: AdminCarVehicleUpdateInput) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const existing = await db.carVehicle.findFirst({
    where: {id: vehicleId, companyId},
    select: {id: true, make: true, model: true, year: true},
  });
  if (!existing) notFound("Car vehicle");

  const make = input.make.trim();
  const model = input.model.trim();
  const category = input.category.trim();
  if (!make || !model || !category) badRequest("CAR_VEHICLE_FIELDS_REQUIRED", "Make, model and category are required");
  if (!Number.isInteger(input.year) || input.year < 1990 || input.year > new Date().getUTCFullYear() + 1) badRequest("CAR_YEAR_INVALID", "Vehicle year is invalid");
  if (!Number.isInteger(input.seats) || input.seats < 1 || input.seats > 16) badRequest("CAR_SEATS_INVALID", "Vehicle seat count is invalid");
  if (!Number.isInteger(input.bags) || input.bags < 0 || input.bags > 20) badRequest("CAR_BAGS_INVALID", "Vehicle bag count is invalid");
  if (!Number.isInteger(input.doors) || input.doors < 2 || input.doors > 8) badRequest("CAR_DOORS_INVALID", "Vehicle door count is invalid");
  if (!Number.isFinite(input.dailyPrice) || input.dailyPrice <= 0) badRequest("CAR_PRICE_INVALID", "Daily price must be greater than zero");
  if (!Number.isFinite(input.deposit) || input.deposit <= 0) badRequest("CAR_DEPOSIT_REQUIRED", "A deposit greater than zero is required for every vehicle");

  const homeLocationId = input.homeLocationId?.trim() || null;
  if (homeLocationId) {
    const location = await db.carRentalLocation.findFirst({where: {id: homeLocationId, companyId}, select: {id: true}});
    if (!location) notFound("Car rental location");
  }

  const identityChanged = existing.make !== make || existing.model !== model || existing.year !== input.year;
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.carVehicle.update({
      where: {id: vehicleId},
      data: {
        make,
        model,
        year: input.year,
        category,
        transmission: input.transmission,
        fuel: input.fuel,
        seats: input.seats,
        bags: input.bags,
        doors: input.doors,
        airConditioning: input.airConditioning,
        dailyPrice: input.dailyPrice,
        deposit: input.deposit,
        freeCancellation: input.freeCancellation,
        unlimitedMileage: input.unlimitedMileage,
        airportPickup: input.airportPickup,
        homeLocationId,
        status: input.status,
      },
      include: {homeLocation: true},
    });
    if (identityChanged) {
      await tx.carVehicleCatalogLink.deleteMany({where: {vehicleId}});
    }
    return row;
  });

  return {
    id: updated.id,
    companyId: updated.companyId,
    make: updated.make,
    model: updated.model,
    year: updated.year,
    category: updated.category,
    status: updated.status,
    dailyPrice: Number(updated.dailyPrice),
    deposit: Number(updated.deposit),
    visualLinkCleared: identityChanged,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function listAdminCarReservations(adminUserId: string, filters: {query?: string; status?: string; companyId?: string} = {}) {
  await requirePlatformAdmin(adminUserId);
  const query = filters.query?.trim();
  const allowedStatus = new Set<CarReservationStatusValue>(["HOLD", "CONFIRMED", "MODIFIED", "CANCELLED", "NO_SHOW", "COMPLETED", "EXPIRED"]);
  const status = filters.status && allowedStatus.has(filters.status as CarReservationStatusValue)
    ? filters.status as CarReservationStatusValue
    : undefined;

  const where: any = {
    ...(status ? {status} : {}),
    ...(filters.companyId ? {companyId: filters.companyId} : {}),
    ...(query ? {OR: [
      {reference: {contains: query, mode: "insensitive"}},
      {guestName: {contains: query, mode: "insensitive"}},
      {guestEmail: {contains: query, mode: "insensitive"}},
      {company: {name: {contains: query, mode: "insensitive"}}},
      {vehicle: {make: {contains: query, mode: "insensitive"}}},
      {vehicle: {model: {contains: query, mode: "insensitive"}}},
    ]} : {}),
  };

  const rows = await database().carReservation.findMany({
    where,
    orderBy: {createdAt: "desc"},
    take: 500,
    include: {company: true, vehicle: true, pickupLocation: true, returnLocation: true},
  });
  return rows.map(serializeAdminReservation);
}

export async function getAdminCarReservation(adminUserId: string, reservationId: string) {
  await requirePlatformAdmin(adminUserId);
  const row = await database().carReservation.findUnique({
    where: {id: reservationId},
    include: {company: true, vehicle: true, pickupLocation: true, returnLocation: true},
  });
  if (!row) notFound("Car reservation");
  return serializeAdminReservation(row);
}

export async function updateAdminCarCompany(adminUserId: string, companyId: string, input: CarCompanyDecisionInput) {
  await requirePlatformAdmin(adminUserId);
  if (input.status === "ACTIVE" && !input.verified) badRequest("CAR_COMPANY_VERIFICATION_REQUIRED", "An active car rental company must be verified");
  const existing = await database().carRentalCompany.findUnique({where: {id: companyId}, select: {id: true}});
  if (!existing) notFound("Car rental company");
  const row = await database().carRentalCompany.update({where: {id: companyId}, data: {status: input.status, verified: input.verified}});
  return {id: row.id, name: row.name, status: row.status, verified: row.verified, updatedAt: row.updatedAt.toISOString()};
}

function serializeAdminReservation(reservation: any) {
  const total = Number(reservation.total);
  const commissionRate = Number(reservation.commissionRate ?? reservation.company.commissionRate);
  const commission = Number(reservation.commissionAmount ?? roundMoney(total * commissionRate));
  const collectedBy = reservation.paymentCollector === "HANDMEKEY" ? "HANDMEKEY" : "COMPANY";
  const onlineCollection = reservation.paymentMode === "PAY_NOW";
  const financeEligible = collectedBy === "HANDMEKEY" || onlineCollection
    ? ["CONFIRMED", "MODIFIED", "COMPLETED"].includes(reservation.status)
    : reservation.status === "COMPLETED";
  const companyPayable = financeEligible && collectedBy === "HANDMEKEY" ? roundMoney(total - commission) : 0;
  const commissionReceivable = financeEligible && collectedBy === "COMPANY" ? commission : 0;

  return {
    id: reservation.id,
    reference: reservation.reference,
    companyId: reservation.companyId,
    companyName: reservation.company.name,
    companyStatus: reservation.company.status,
    companyVerified: reservation.company.verified,
    guestName: reservation.guestName,
    guestEmail: reservation.guestEmail,
    guestPhone: reservation.guestPhone,
    driverAgeRange: reservation.driverAgeRange,
    status: reservation.status,
    paymentMode: reservation.paymentMode,
    paymentCollector: reservation.paymentCollector,
    collectedBy,
    financeEligible,
    currency: reservation.currency,
    pickupAt: reservation.pickupAt.toISOString(),
    returnAt: reservation.returnAt.toISOString(),
    vehicleId: reservation.vehicleId,
    vehicle: `${reservation.vehicle.make} ${reservation.vehicle.model}`,
    vehicleYear: reservation.vehicle.year,
    vehicleCategory: reservation.vehicle.category,
    pickupLocation: reservation.pickupLocation.name,
    pickupAddress: reservation.pickupLocation.address,
    returnLocation: reservation.returnLocation.name,
    returnAddress: reservation.returnLocation.address,
    dailyRate: Number(reservation.dailyRate),
    rentalDays: reservation.rentalDays,
    subtotal: Number(reservation.subtotal),
    fees: Number(reservation.fees),
    total,
    deposit: Number(reservation.deposit),
    commissionRate,
    platformCommission: commission,
    estimatedPartnerNet: roundMoney(total - commission),
    companyPayable,
    commissionReceivable,
    financialNetCompanyDelta: roundMoney(companyPayable - commissionReceivable),
    cancellationNote: reservation.cancellationNote,
    confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
    cancelledAt: reservation.cancelledAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
