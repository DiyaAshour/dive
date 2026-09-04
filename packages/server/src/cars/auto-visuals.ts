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
  const requestedModel = normalize([input.model, input.trim].filter(Boolean).join(" "));
  return candidates.find((candidate) => {
    if (normalizeMake(candidate.make) !== requestedMake) return false;
    const exactModel = normalize(candidate.model);
    const exactVariant = normalize([candidate.model, candidate.trim].filter(Boolean).join(" "));
    return requestedModel === exactModel || requestedModel === exactVariant;
  }) ?? null;
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
