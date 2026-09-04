import { database } from "@platform/database";
import { upsertCarCatalogVehicles } from "../admin/car-catalog";
import { buildImaginCatalogVehicle, imaginConfigured, verifyExactImaginVehicle } from "./providers/imagin";

export type AutomaticCarVisualInput = Readonly<{
  preferredCatalogVehicleId?: string | undefined;
  make: string;
  model: string;
  year: number;
  trim?: string | undefined;
  bodyType?: string | undefined;
  category: string;
  transmission: "AUTOMATIC" | "MANUAL";
  fuel: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
  seats: number;
  bags?: number | undefined;
  doors?: number | undefined;
}>;

export type AutomaticCarVisualMatch = Readonly<{
  catalog: any;
  matchedBy: "AUTO_EXACT" | "AUTO_IMAGIN";
  generated: boolean;
}>;

export type CarVehicleVisualSync = Readonly<{
  status: "LINKED" | "UNMATCHED";
  matchedBy: string | null;
  catalog: any | null;
  assets: readonly any[];
}>;

/**
 * Resolves a fleet vehicle to one exact shared visual record. When the exact
 * catalog entry exists but has no artwork yet, the configured automotive
 * imagery provider hydrates it with studio angles and a 32-frame exterior
 * spin. A provider outage never blocks a partner from saving fleet inventory.
 */
export async function resolveAutomaticCarVisual(input: AutomaticCarVisualInput): Promise<AutomaticCarVisualMatch | null> {
  const candidate = input.preferredCatalogVehicleId
    ? await findPreferredCandidate(input.preferredCatalogVehicleId)
    : await findExactCandidate(input);

  if (candidate && visualReady(candidate)) {
    return {catalog: candidate, matchedBy: "AUTO_EXACT", generated: false};
  }

  if (!imaginConfigured()) {
    return candidate ? {catalog: candidate, matchedBy: "AUTO_EXACT", generated: false} : null;
  }

  try {
    const catalogInput = candidate ? fromCandidate(input, candidate) : fromFleetInput(input);
    const verification = await verifyExactImaginVehicle(catalogInput.selection);
    if (!verification.exact) {
      console.warn("[cars:auto-visuals] Provider returned a substitute; visual was not published", {
        make: input.make,
        model: input.model,
        year: input.year,
        requestFound: verification.requestFound,
        requestResolved: verification.requestResolved,
        performedMatches: verification.performedMatches,
      });
      return candidate ? {catalog: candidate, matchedBy: "AUTO_EXACT", generated: false} : null;
    }
    const record = buildImaginCatalogVehicle(catalogInput);
    const result = await upsertCarCatalogVehicles([record], {replaceAssets: true});
    const imported = result.imported[0];
    if (!imported) return candidate ? {catalog: candidate, matchedBy: "AUTO_EXACT", generated: false} : null;
    const hydrated = await database().carCatalogVehicle.findUnique({where: {id: imported.id}});
    return hydrated ? {catalog: hydrated, matchedBy: "AUTO_IMAGIN", generated: true} : null;
  } catch (error) {
    console.error("[cars:auto-visuals] Exact vehicle visual resolution failed", safeError(error), {
      make: input.make,
      model: input.model,
      year: input.year,
    });
    return candidate ? {catalog: candidate, matchedBy: "AUTO_EXACT", generated: false} : null;
  }
}

export function automaticCarVisualsConfigured() {
  return imaginConfigured();
}

/**
 * Hydrates one existing fleet row with its shared catalog visual. This is
 * intentionally idempotent and never falls back to a different make, model,
 * year, or trim. It is called when a partner opens that vehicle's media page,
 * so old fleet rows receive the same automatic behavior as new rows.
 */
export async function syncCarVehicleVisual(vehicleId: string): Promise<CarVehicleVisualSync | null> {
  const db = database();
  const vehicle = await db.carVehicle.findUnique({
    where: {id: vehicleId},
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      category: true,
      transmission: true,
      fuel: true,
      seats: true,
      bags: true,
      doors: true,
      imageUrl: true,
    },
  });
  if (!vehicle) return null;

  const existing = await db.carVehicleCatalogLink.findUnique({
    where: {vehicleId},
    include: {
      catalogVehicle: {
        include: {assets: {where: {active: true}, orderBy: [{sortOrder: "asc"}, {createdAt: "asc"}] }},
      },
    },
  });

  const automatic = await resolveAutomaticCarVisual({
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    category: vehicle.category,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    seats: vehicle.seats,
    bags: vehicle.bags,
    doors: vehicle.doors,
  });

  let catalog = automatic?.catalog ?? null;
  if (!catalog && existing && exactCatalogIdentity(vehicle, existing.catalogVehicle)) {
    catalog = existing.catalogVehicle;
  }

  if (!catalog || !exactCatalogIdentity(vehicle, catalog)) {
    if (existing && !exactCatalogIdentity(vehicle, existing.catalogVehicle)) {
      await db.carVehicleCatalogLink.delete({where: {vehicleId}}).catch(() => undefined);
    }
    return {status: "UNMATCHED", matchedBy: null, catalog: null, assets: []};
  }

  const fullCatalog = await db.carCatalogVehicle.findFirst({
    where: {id: catalog.id, active: true},
    include: {assets: {where: {active: true}, orderBy: [{sortOrder: "asc"}, {createdAt: "asc"}] }},
  });
  if (!fullCatalog || !exactCatalogIdentity(vehicle, fullCatalog)) {
    return {status: "UNMATCHED", matchedBy: null, catalog: null, assets: []};
  }

  const matchedBy = existing?.catalogVehicleId === fullCatalog.id
    ? existing.matchedBy
    : automatic?.matchedBy ?? "AUTO_BACKFILL";
  await db.$transaction(async (tx) => {
    await tx.carVehicleCatalogLink.upsert({
      where: {vehicleId},
      create: {vehicleId, catalogVehicleId: fullCatalog.id, matchedBy},
      update: {catalogVehicleId: fullCatalog.id, matchedBy, updatedAt: new Date()},
    });
    if (!vehicle.imageUrl && fullCatalog.primaryImageUrl) {
      await tx.carVehicle.update({
        where: {id: vehicleId},
        data: {imageUrl: fullCatalog.primaryImageUrl, imageAlt: `${fullCatalog.make} ${fullCatalog.model}${fullCatalog.trim ? ` ${fullCatalog.trim}` : ""} ${fullCatalog.year}`},
      });
    }
  });

  return {status: "LINKED", matchedBy, catalog: fullCatalog, assets: fullCatalog.assets};
}

async function findPreferredCandidate(id: string) {
  return database().carCatalogVehicle.findFirst({
    where: {id, active: true},
    include: {_count: {select: {assets: {where: {active: true}}}}},
  });
}

async function findExactCandidate(input: AutomaticCarVisualInput) {
  const candidates = await database().carCatalogVehicle.findMany({
    where: {active: true, year: input.year},
    include: {_count: {select: {assets: {where: {active: true}}}}},
    orderBy: [{reviewed: "desc"}, {updatedAt: "desc"}],
    take: 100,
  });
  const requestedMake = normalizeMake(input.make);
  const requestedModels = new Set([
    normalize(input.model),
    input.trim ? normalize([input.model, input.trim].filter(Boolean).join(" ")) : "",
  ].filter(Boolean));
  return candidates.find((candidate) => {
    if (normalizeMake(candidate.make) !== requestedMake) return false;
    const exactIdentity = candidate.trim
      ? normalize([candidate.model, candidate.trim].filter(Boolean).join(" "))
      : normalize(candidate.model);
    return requestedModels.has(exactIdentity);
  }) ?? null;
}

function exactCatalogIdentity(vehicle: {make: string; model: string; year: number}, catalog: {make: string; model: string; trim?: string | null; year: number}) {
  if (vehicle.year !== catalog.year || normalizeMake(vehicle.make) !== normalizeMake(catalog.make)) return false;
  const identity = catalog.trim
    ? normalize([catalog.model, catalog.trim].filter(Boolean).join(" "))
    : normalize(catalog.model);
  return normalize(vehicle.model) === identity;
}

function fromCandidate(input: AutomaticCarVisualInput, candidate: any) {
  return {
    slug: candidate.slug,
    displayModel: candidate.model,
    generation: candidate.generation || undefined,
    trimName: candidate.trim || undefined,
    bodyType: candidate.bodyType || undefined,
    category: candidate.category,
    transmission: candidate.transmission || input.transmission,
    fuel: candidate.fuel || input.fuel,
    seats: candidate.seats ?? input.seats,
    bags: candidate.bags ?? input.bags,
    doors: candidate.doors ?? input.doors,
    reviewed: candidate.reviewed,
    selection: {
      make: candidate.make,
      modelFamily: candidate.model,
      modelRange: candidate.trim || undefined,
      modelVariant: candidate.bodyType || undefined,
      modelYear: candidate.year,
      powerTrain: providerFuel(candidate.fuel || input.fuel),
      transmission: String(candidate.transmission || input.transmission).toLowerCase(),
      bodySize: candidate.doors ? String(candidate.doors) : undefined,
    },
  };
}

function fromFleetInput(input: AutomaticCarVisualInput) {
  return {
    slug: [input.make, input.model, input.trim ?? "", input.year].map(slugPart).filter(Boolean).join("-").slice(0, 160),
    displayModel: input.model.trim(),
    trimName: input.trim?.trim() || undefined,
    bodyType: input.bodyType?.trim() || input.category,
    category: input.category,
    transmission: input.transmission,
    fuel: input.fuel,
    seats: input.seats,
    bags: input.bags,
    doors: input.doors,
    reviewed: false,
    selection: {
      make: input.make.trim(),
      modelFamily: input.model.trim(),
      modelRange: input.trim?.trim() || undefined,
      modelVariant: input.bodyType?.trim() || undefined,
      modelYear: input.year,
      powerTrain: providerFuel(input.fuel),
      transmission: input.transmission.toLowerCase(),
      bodySize: input.doors ? String(input.doors) : undefined,
    },
  };
}

function visualReady(candidate: any) {
  return Boolean(candidate.primaryImageUrl || candidate.exterior360Available || candidate.interior360Available || candidate._count?.assets);
}

function normalizeMake(value: string) {
  const normalized = normalize(value);
  if (normalized === "mercedes" || normalized === "mercedes benz") return "mercedes benz";
  if (normalized === "vw") return "volkswagen";
  return normalized;
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

function slugPart(value: string | number) {
  return String(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function providerFuel(value: string) {
  if (value === "PETROL") return "petrol";
  if (value === "DIESEL") return "diesel";
  if (value === "HYBRID") return "hybrid";
  return "electric";
}

function safeError(error: unknown) {
  return error instanceof Error ? {name: error.name, message: error.message} : {message: "Unknown provider error"};
}
