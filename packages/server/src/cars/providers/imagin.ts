import { badRequest } from "../../errors";
import type { CarCatalogImportAsset, CarCatalogImportVehicle } from "../../admin/car-catalog";

const IMAGIN_CDN = "https://cdn.imagin.studio";
const STATIC_WIDTH = 1200;
const SPIN_WIDTH = 1200;

export type ImaginVehicleSelection = Readonly<{
  make: string;
  modelFamily: string;
  modelRange?: string | undefined;
  modelVariant?: string | undefined;
  modelYear?: number | undefined;
  powerTrain?: string | undefined;
  transmission?: string | undefined;
  bodySize?: string | undefined;
  trim?: string | undefined;
  paintId?: string | undefined;
  paintDescription?: string | undefined;
}>;

export type ImaginCatalogImportInput = Readonly<{
  slug: string;
  displayModel?: string | undefined;
  generation?: string | undefined;
  trimName?: string | undefined;
  bodyType?: string | undefined;
  category: string;
  transmission?: "AUTOMATIC" | "MANUAL" | undefined;
  fuel?: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC" | undefined;
  seats?: number | undefined;
  bags?: number | undefined;
  doors?: number | undefined;
  reviewed?: boolean | undefined;
  selection: ImaginVehicleSelection;
}>;

export function imaginConfigured() {
  return Boolean(imaginCustomerId());
}

export async function getImaginCarListing(filters: Partial<ImaginVehicleSelection> = {}) {
  const customer = requireImaginCustomerId();
  const url = new URL(`${IMAGIN_CDN}/getCarListing`);
  url.searchParams.set("customer", customer);
  appendVehicleSelection(url.searchParams, filters);

  const response = await fetch(url, {
    headers: {accept: "application/json"},
    cache: "no-store",
  });
  if (!response.ok) {
    badRequest("IMAGIN_LISTING_FAILED", `IMAGIN vehicle listing failed with status ${response.status}`);
  }
  const data = await response.json().catch(() => null) as unknown;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    badRequest("IMAGIN_LISTING_INVALID", "IMAGIN returned an invalid vehicle listing response");
  }
  return data as Record<string, unknown>;
}

export function buildImaginCatalogVehicle(input: ImaginCatalogImportInput): CarCatalogImportVehicle {
  const selection = normalizeSelection(input.selection);
  const year = selection.modelYear;
  if (!year) badRequest("IMAGIN_MODEL_YEAR_REQUIRED", "A model year is required before importing an exact IMAGIN vehicle");

  const hero = imageUrl(selection, {angle: "23", width: STATIC_WIDTH, zoomType: "relative"});
  const staticAssets: CarCatalogImportAsset[] = [
    visual("HERO", hero, "23", 0, selection),
    visual("EXTERIOR_FRONT", imageUrl(selection, {angle: "200", width: STATIC_WIDTH, zoomType: "adaptive"}), "200", 1, selection),
    visual("EXTERIOR_SIDE_RIGHT", imageUrl(selection, {angle: "05", width: STATIC_WIDTH, zoomType: "relative"}), "05", 2, selection),
    visual("EXTERIOR_REAR", imageUrl(selection, {angle: "13", width: STATIC_WIDTH, zoomType: "relative"}), "13", 3, selection),
    visual("EXTERIOR_SIDE_LEFT", imageUrl(selection, {angle: "21", width: STATIC_WIDTH, zoomType: "relative"}), "21", 4, selection),
  ];
  const spinAssets: CarCatalogImportAsset[] = Array.from({length: 32}, (_, index) => {
    const angle = String(200 + index);
    return {
      type: "SPIN_FRAME",
      url: imageUrl(selection, {angle, width: SPIN_WIDTH, zoomType: "adaptive"}),
      angle,
      spinFrame: index,
      paintCode: selection.paintId,
      paintName: selection.paintDescription,
      width: SPIN_WIDTH,
      sortOrder: 100 + index,
      sourceRef: sourceRef(selection, angle),
    };
  });

  return {
    slug: input.slug,
    make: selection.make,
    model: input.displayModel?.trim() || selection.modelFamily,
    year,
    generation: input.generation?.trim() || undefined,
    trim: input.trimName?.trim() || selection.modelRange || undefined,
    bodyType: input.bodyType?.trim() || undefined,
    category: input.category.trim(),
    transmission: input.transmission,
    fuel: input.fuel,
    seats: input.seats,
    bags: input.bags,
    doors: input.doors,
    provider: "IMAGIN",
    providerVehicleId: providerVehicleId(selection),
    providerRevision: "cdn-v1",
    primaryImageUrl: hero,
    reviewed: input.reviewed ?? false,
    assets: [...staticAssets, ...spinAssets],
  };
}

function visual(type: CarCatalogImportAsset["type"], url: string, angle: string, sortOrder: number, selection: ImaginVehicleSelection): CarCatalogImportAsset {
  return {
    type,
    url,
    angle,
    paintCode: selection.paintId,
    paintName: selection.paintDescription,
    width: STATIC_WIDTH,
    sortOrder,
    sourceRef: sourceRef(selection, angle),
  };
}

function imageUrl(selection: ImaginVehicleSelection, customization: {angle:string;width:number;zoomType:"relative"|"adaptive"}) {
  const customer = requireImaginCustomerId();
  const url = new URL(`${IMAGIN_CDN}/getImage`);
  url.searchParams.set("customer", customer);
  appendVehicleSelection(url.searchParams, selection);
  url.searchParams.set("angle", customization.angle);
  url.searchParams.set("zoomType", customization.zoomType);
  url.searchParams.set("width", String(customization.width));
  url.searchParams.set("fileType", "webp");
  url.searchParams.set("billingTag", "handmekey-cars");
  return url.toString();
}

function appendVehicleSelection(params: URLSearchParams, selection: Partial<ImaginVehicleSelection>) {
  set(params, "make", selection.make);
  set(params, "modelFamily", selection.modelFamily);
  set(params, "modelRange", selection.modelRange);
  set(params, "modelVariant", selection.modelVariant);
  if (selection.modelYear) params.set("modelYear", String(selection.modelYear));
  set(params, "powerTrain", selection.powerTrain);
  set(params, "transmission", selection.transmission);
  set(params, "bodySize", selection.bodySize);
  set(params, "trim", selection.trim);
  set(params, "paintId", selection.paintId);
  set(params, "paintDescription", selection.paintDescription);
}

function normalizeSelection(input: ImaginVehicleSelection): ImaginVehicleSelection {
  const make = input.make.trim();
  const modelFamily = input.modelFamily.trim();
  if (!make || !modelFamily) badRequest("IMAGIN_VEHICLE_REQUIRED", "Make and model family are required");
  return {
    make,
    modelFamily,
    modelRange: clean(input.modelRange),
    modelVariant: clean(input.modelVariant),
    modelYear: input.modelYear,
    powerTrain: clean(input.powerTrain),
    transmission: clean(input.transmission),
    bodySize: clean(input.bodySize),
    trim: clean(input.trim),
    paintId: clean(input.paintId),
    paintDescription: clean(input.paintDescription),
  };
}

function providerVehicleId(selection: ImaginVehicleSelection) {
  return [selection.make, selection.modelFamily, selection.modelRange, selection.modelVariant, selection.modelYear, selection.powerTrain, selection.bodySize, selection.trim]
    .filter((value) => value !== undefined && value !== null && String(value).trim())
    .map((value) => String(value).trim().toLowerCase())
    .join("|");
}

function sourceRef(selection: ImaginVehicleSelection, angle: string) {
  return `imagin:${providerVehicleId(selection)}:angle:${angle}`;
}

function requireImaginCustomerId() {
  const customer = imaginCustomerId();
  if (!customer) badRequest("IMAGIN_NOT_CONFIGURED", "IMAGIN_CUSTOMER_ID is not configured");
  return customer;
}

function imaginCustomerId() {
  return process.env.IMAGIN_CUSTOMER_ID?.trim() || process.env.IMAGIN_CUSTOMER_KEY?.trim() || "";
}

function set(params: URLSearchParams, key: string, value: string | undefined) {
  const cleaned = clean(value);
  if (cleaned) params.set(key, cleaned);
}

function clean(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned || undefined;
}
