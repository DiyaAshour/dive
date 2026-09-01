import { database } from "@platform/database";
import { badRequest, notFound } from "../errors";

export type CreateCarReservationInput = Readonly<{
  vehicleId: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  driverAgeRange: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  pickupLocationId?: string;
  returnLocationId?: string;
}>;

export async function getPublicCarVehicle(vehicleId: string) {
  const row = await database().carVehicle.findFirst({
    where: {id: vehicleId, status: "ACTIVE", company: {status: "ACTIVE", verified: true}},
    include: {
      company: {include: {locations: {where: {active: true}, orderBy: {createdAt: "asc"}}}},
      homeLocation: true,
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    brand: row.make,
    model: row.model,
    year: row.year,
    category: row.category,
    transmission: row.transmission === "AUTOMATIC" ? "Automatic" : "Manual",
    fuel: fuelLabel(row.fuel),
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
    supplier: row.company.name,
    supplierVerified: row.company.verified,
    currency: row.company.currency,
    homeLocation: row.homeLocation ? publicLocation(row.homeLocation) : null,
    locations: row.company.locations.map(publicLocation),
  };
}

export async function createCarReservation(userId: string, input: CreateCarReservationInput) {
  const pickupAt = parseRentalDateTime(input.pickupDate, input.pickupTime);
  const returnAt = parseRentalDateTime(input.returnDate, input.returnTime);
  if (returnAt.getTime() <= pickupAt.getTime()) badRequest("CAR_RENTAL_PERIOD_INVALID", "Return must be after pick-up");

  const db = database();
  const vehicle = await db.carVehicle.findFirst({
    where: {id: input.vehicleId, status: "ACTIVE", company: {status: "ACTIVE", verified: true}},
    include: {company: true, homeLocation: true},
  });
  if (!vehicle) notFound("Car vehicle");

  const fallbackLocationId = vehicle.homeLocationId ?? (await db.carRentalLocation.findFirst({where:{companyId:vehicle.companyId,active:true},orderBy:{createdAt:"asc"},select:{id:true}}))?.id;
  const pickupLocationId = input.pickupLocationId || fallbackLocationId;
  const returnLocationId = input.returnLocationId || pickupLocationId;
  if (!pickupLocationId || !returnLocationId) badRequest("CAR_LOCATION_REQUIRED", "A pickup and return location are required");

  const locations = await db.carRentalLocation.findMany({
    where: {companyId: vehicle.companyId, id: {in: [pickupLocationId, returnLocationId]}, active: true},
  });
  if (!locations.some((location)=>location.id===pickupLocationId&&location.pickupEnabled)) badRequest("CAR_PICKUP_LOCATION_INVALID", "Pickup location is unavailable");
  if (!locations.some((location)=>location.id===returnLocationId&&location.returnEnabled)) badRequest("CAR_RETURN_LOCATION_INVALID", "Return location is unavailable");

  const conflict = await db.carReservation.findFirst({
    where: {
      vehicleId: vehicle.id,
      status: {in: ["HOLD", "CONFIRMED", "MODIFIED"]},
      pickupAt: {lt: returnAt},
      returnAt: {gt: pickupAt},
    },
    select: {id: true},
  });
  if (conflict) badRequest("CAR_NOT_AVAILABLE", "This vehicle is no longer available for the selected period");

  const blockedDay = await db.carAvailabilityDay.findFirst({
    where: {vehicleId: vehicle.id, date: {gte: startOfUtcDay(pickupAt), lt: startOfUtcDay(returnAt)}, available: false},
    select: {id: true},
  });
  if (blockedDay) badRequest("CAR_NOT_AVAILABLE", "This vehicle is unavailable on one or more selected dates");

  const rentalDays = Math.max(1, Math.ceil((returnAt.getTime()-pickupAt.getTime())/86_400_000));
  const dayRate = Number(vehicle.dailyPrice);
  const subtotal = roundMoney(dayRate * rentalDays);
  const fees = 0;
  const total = roundMoney(subtotal + fees);
  const reference = reservationReference();

  const row = await db.carReservation.create({
    data: {
      reference,
      companyId: vehicle.companyId,
      vehicleId: vehicle.id,
      pickupLocationId,
      returnLocationId,
      userId,
      guestName: input.guestName.trim(),
      guestEmail: input.guestEmail.trim().toLowerCase(),
      guestPhone: input.guestPhone?.trim() || null,
      driverAgeRange: input.driverAgeRange.trim(),
      pickupAt,
      returnAt,
      status: "CONFIRMED",
      paymentMode: "PAY_AT_COUNTER",
      currency: vehicle.company.currency,
      dailyRate: dayRate,
      rentalDays,
      subtotal,
      fees,
      total,
      deposit: Number(vehicle.deposit),
      confirmedAt: new Date(),
    },
    include: {vehicle:true,pickupLocation:true,returnLocation:true,company:true},
  });
  return serializeReservation(row);
}

export async function listMyCarReservations(userId: string) {
  const rows = await database().carReservation.findMany({
    where: {userId},
    orderBy: {pickupAt: "desc"},
    include: {vehicle:true,pickupLocation:true,returnLocation:true,company:true},
  });
  return rows.map(serializeReservation);
}

export async function getMyCarReservation(userId: string, reservationId: string) {
  const row = await database().carReservation.findFirst({
    where: {id: reservationId, userId},
    include: {vehicle:true,pickupLocation:true,returnLocation:true,company:true},
  });
  return row ? serializeReservation(row) : null;
}

function serializeReservation(row: any) {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    paymentMode: row.paymentMode,
    guestName: row.guestName,
    guestEmail: row.guestEmail,
    guestPhone: row.guestPhone,
    driverAgeRange: row.driverAgeRange,
    pickupAt: row.pickupAt.toISOString(),
    returnAt: row.returnAt.toISOString(),
    rentalDays: row.rentalDays,
    dailyRate: Number(row.dailyRate),
    subtotal: Number(row.subtotal),
    fees: Number(row.fees),
    total: Number(row.total),
    deposit: Number(row.deposit),
    currency: row.currency,
    vehicle: {id:row.vehicle.id,make:row.vehicle.make,model:row.vehicle.model,year:row.vehicle.year,category:row.vehicle.category,imageUrl:row.vehicle.imageUrl,imageAlt:row.vehicle.imageAlt},
    company: {id:row.company.id,name:row.company.name,verified:row.company.verified},
    pickupLocation: publicLocation(row.pickupLocation),
    returnLocation: publicLocation(row.returnLocation),
    createdAt: row.createdAt.toISOString(),
  };
}

function publicLocation(row:{id:string;name:string;city:string;address:string;airportCode:string|null}){return{id:row.id,name:row.name,city:row.city,address:row.address,airportCode:row.airportCode};}
function parseRentalDateTime(date:string,time:string){const value=new Date(`${date}T${time}:00Z`);if(Number.isNaN(value.getTime()))badRequest("CAR_RENTAL_DATE_INVALID","Rental date or time is invalid");return value;}
function startOfUtcDay(value:Date){return new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate()));}
function roundMoney(value:number){return Math.round((value+Number.EPSILON)*100)/100;}
function reservationReference(){return `HMKC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;}
function fuelLabel(value:string){if(value==="PETROL")return"Petrol";if(value==="DIESEL")return"Diesel";if(value==="HYBRID")return"Hybrid";return"Electric";}
