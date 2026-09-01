import { database } from "@platform/database";

export type BookableDemoCarInput = Readonly<{
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  transmission: "Automatic" | "Manual";
  fuel: "Petrol" | "Diesel" | "Hybrid" | "Electric";
  seats: number;
  bags: number;
  doors: number;
  dailyPrice: number;
  supplier: string;
  deposit: number;
  unlimitedMileage: boolean;
  freeCancellation: boolean;
  airportPickup: boolean;
  airConditioning: boolean;
  image: string;
  imageAlt: string;
}>;

/**
 * Materializes one of the trusted web demo catalog entries into the Cars
 * reservation tables. The caller must pass a record selected from the
 * server-side demo catalog, never arbitrary client supplied pricing.
 */
export async function ensureBookableDemoCar(input: BookableDemoCarInput) {
  const db = database();
  const existing = await db.carVehicle.findUnique({where: {id: input.id}, select: {id: true, companyId: true, homeLocationId: true}});
  if (existing) return existing;

  const supplierKey = slugify(input.supplier) || "handmekey-rentals";
  const companySlug = `demo-${supplierKey}`;
  const locationId = `demo-${supplierKey}-qaia`;

  return db.$transaction(async (tx) => {
    const company = await tx.carRentalCompany.upsert({
      where: {slug: companySlug},
      update: {
        status: "ACTIVE",
        verified: true,
        city: "Amman",
        countryCode: "JO",
        address: "Queen Alia International Airport, Amman, Jordan",
        timezone: "Asia/Amman",
        currency: "JOD",
      },
      create: {
        name: input.supplier,
        slug: companySlug,
        city: "Amman",
        countryCode: "JO",
        address: "Queen Alia International Airport, Amman, Jordan",
        timezone: "Asia/Amman",
        currency: "JOD",
        status: "ACTIVE",
        verified: true,
      },
    });

    const location = await tx.carRentalLocation.upsert({
      where: {id: locationId},
      update: {
        companyId: company.id,
        name: "Queen Alia International Airport",
        city: "Amman",
        address: "Queen Alia International Airport, Amman, Jordan",
        airportCode: "AMM",
        pickupEnabled: true,
        returnEnabled: true,
        active: true,
      },
      create: {
        id: locationId,
        companyId: company.id,
        name: "Queen Alia International Airport",
        city: "Amman",
        address: "Queen Alia International Airport, Amman, Jordan",
        airportCode: "AMM",
        pickupEnabled: true,
        returnEnabled: true,
        active: true,
      },
    });

    const vehicle = await tx.carVehicle.upsert({
      where: {id: input.id},
      update: {},
      create: {
        id: input.id,
        companyId: company.id,
        homeLocationId: location.id,
        make: input.brand,
        model: input.model,
        year: input.year,
        category: input.category,
        transmission: input.transmission === "Automatic" ? "AUTOMATIC" : "MANUAL",
        fuel: fuelValue(input.fuel),
        seats: input.seats,
        bags: input.bags,
        doors: input.doors,
        airConditioning: input.airConditioning,
        dailyPrice: input.dailyPrice,
        deposit: input.deposit,
        freeCancellation: input.freeCancellation,
        unlimitedMileage: input.unlimitedMileage,
        airportPickup: input.airportPickup,
        imageUrl: input.image,
        imageAlt: input.imageAlt,
        status: "ACTIVE",
      },
      select: {id: true, companyId: true, homeLocationId: true},
    });

    return vehicle;
  });
}

function fuelValue(value: BookableDemoCarInput["fuel"]) {
  if (value === "Petrol") return "PETROL" as const;
  if (value === "Diesel") return "DIESEL" as const;
  if (value === "Hybrid") return "HYBRID" as const;
  return "ELECTRIC" as const;
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 42);
}
