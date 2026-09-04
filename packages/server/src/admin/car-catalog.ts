import { database } from "@platform/database";
import { badRequest } from "../errors";
import { requirePlatformAdmin } from "./authorization";

export type CarCatalogProvider = "MANUAL" | "IMAGIN" | "EVOX" | "OEM";
export type CarCatalogAssetKind =
  | "HERO"
  | "EXTERIOR_FRONT"
  | "EXTERIOR_FRONT_LEFT"
  | "EXTERIOR_FRONT_RIGHT"
  | "EXTERIOR_SIDE_LEFT"
  | "EXTERIOR_SIDE_RIGHT"
  | "EXTERIOR_REAR_LEFT"
  | "EXTERIOR_REAR_RIGHT"
  | "EXTERIOR_REAR"
  | "SPIN_FRAME"
  | "INTERIOR_DASHBOARD"
  | "INTERIOR_FRONT_SEATS"
  | "INTERIOR_REAR_SEATS"
  | "INTERIOR_PANORAMA"
  | "TRUNK"
  | "INFOTAINMENT"
  | "STEERING_WHEEL"
  | "OTHER";

export type CarCatalogImportAsset = Readonly<{
  type: CarCatalogAssetKind;
  url: string;
  angle?: string;
  spinFrame?: number;
  paintCode?: string;
  paintName?: string;
  width?: number;
  height?: number;
  sortOrder?: number;
  sourceRef?: string;
}>;

export type CarCatalogImportVehicle = Readonly<{
  slug: string;
  make: string;
  model: string;
  year: number;
  generation?: string;
  trim?: string;
  bodyType?: string;
  category: string;
  transmission?: "AUTOMATIC" | "MANUAL";
  fuel?: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
  seats?: number;
  bags?: number;
  doors?: number;
  provider: CarCatalogProvider;
  providerVehicleId?: string;
  providerRevision?: string;
  primaryImageUrl?: string;
  reviewed?: boolean;
  assets?: readonly CarCatalogImportAsset[];
}>;

export async function getAdminCarCatalogOverview(adminUserId: string) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const [vehicles, activeVehicles, reviewedVehicles, assetCount, exteriorSpinCars, interiorSpinCars, providers] = await Promise.all([
    db.carCatalogVehicle.count(),
    db.carCatalogVehicle.count({where: {active: true}}),
    db.carCatalogVehicle.count({where: {active: true, reviewed: true}}),
    db.carCatalogAsset.count({where: {active: true}}),
    db.carCatalogVehicle.count({where: {active: true, exterior360Available: true}}),
    db.carCatalogVehicle.count({where: {active: true, interior360Available: true}}),
    db.carCatalogVehicle.groupBy({_count: {_all: true}, by: ["provider"], where: {active: true}}),
  ]);

  return {
    vehicles,
    activeVehicles,
    reviewedVehicles,
    assetCount,
    exterior360Cars: exteriorSpinCars,
    interior360Cars: interiorSpinCars,
    providers: providers.map((row) => ({provider: row.provider, vehicles: row._count._all})),
  };
}

export async function importCarCatalogVehicles(
  adminUserId: string,
  records: readonly CarCatalogImportVehicle[],
  options: {replaceAssets?: boolean} = {},
) {
  await requirePlatformAdmin(adminUserId);
  if (records.length < 1 || records.length > 100) badRequest("CAR_CATALOG_IMPORT_SIZE", "Import must contain between 1 and 100 vehicles");

  const db = database();
  let assetsWritten = 0;
  const imported: Array<{id:string;slug:string;make:string;model:string;year:number;provider:CarCatalogProvider;assets:number}> = [];

  for (const record of records) {
    const assets = record.assets ?? [];
    const spinFrames = assets.filter((asset) => asset.type === "SPIN_FRAME").length;
    const interior360 = assets.some((asset) => asset.type === "INTERIOR_PANORAMA");
    const primaryImageUrl = record.primaryImageUrl?.trim()
      || assets.find((asset) => asset.type === "HERO")?.url
      || assets.find((asset) => asset.type === "EXTERIOR_FRONT_LEFT")?.url
      || assets.find((asset) => asset.type === "EXTERIOR_FRONT")?.url
      || undefined;

    const result = await db.$transaction(async (tx) => {
      const vehicle = await tx.carCatalogVehicle.upsert({
        where: {slug: record.slug},
        create: {
          slug: record.slug,
          make: record.make,
          model: record.model,
          year: record.year,
          generation: record.generation || null,
          trim: record.trim || null,
          bodyType: record.bodyType || null,
          category: record.category,
          transmission: record.transmission || null,
          fuel: record.fuel || null,
          seats: record.seats ?? null,
          bags: record.bags ?? null,
          doors: record.doors ?? null,
          provider: record.provider,
          providerVehicleId: record.providerVehicleId || null,
          providerRevision: record.providerRevision || null,
          primaryImageUrl: primaryImageUrl || null,
          exterior360Available: spinFrames >= 8,
          interior360Available: interior360,
          reviewed: record.reviewed ?? false,
          active: true,
          lastSyncedAt: new Date(),
        },
        update: {
          make: record.make,
          model: record.model,
          year: record.year,
          generation: record.generation || null,
          trim: record.trim || null,
          bodyType: record.bodyType || null,
          category: record.category,
          transmission: record.transmission || null,
          fuel: record.fuel || null,
          seats: record.seats ?? null,
          bags: record.bags ?? null,
          doors: record.doors ?? null,
          provider: record.provider,
          providerVehicleId: record.providerVehicleId || null,
          providerRevision: record.providerRevision || null,
          ...(primaryImageUrl ? {primaryImageUrl} : {}),
          ...(assets.length ? {exterior360Available: spinFrames >= 8, interior360Available: interior360} : {}),
          ...(record.reviewed !== undefined ? {reviewed: record.reviewed} : {}),
          active: true,
          lastSyncedAt: new Date(),
        },
      });

      if (options.replaceAssets && assets.length) {
        await tx.carCatalogAsset.deleteMany({where: {catalogVehicleId: vehicle.id, provider: record.provider}});
      }
      if (assets.length) {
        await tx.carCatalogAsset.createMany({
          data: assets.map((asset, index) => ({
            catalogVehicleId: vehicle.id,
            type: asset.type,
            provider: record.provider,
            url: asset.url,
            angle: asset.angle || null,
            spinFrame: asset.spinFrame ?? null,
            paintCode: asset.paintCode || null,
            paintName: asset.paintName || null,
            width: asset.width ?? null,
            height: asset.height ?? null,
            sortOrder: asset.sortOrder ?? index,
            sourceRef: asset.sourceRef || null,
            active: true,
          })),
        });
      }
      return vehicle;
    });

    assetsWritten += assets.length;
    imported.push({
      id: result.id,
      slug: result.slug,
      make: result.make,
      model: result.model,
      year: result.year,
      provider: result.provider,
      assets: assets.length,
    });
  }

  return {vehiclesImported: imported.length, assetsWritten, imported};
}
