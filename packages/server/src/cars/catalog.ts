import { database } from "@platform/database";

export type CarCatalogSearchInput = Readonly<{
  query?: string;
  make?: string;
  year?: number;
  limit?: number;
}>;

export async function searchCarCatalog(input: CarCatalogSearchInput = {}) {
  const query = input.query?.trim();
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 60);
  const rows = await database().carCatalogVehicle.findMany({
    where: {
      active: true,
      ...(input.make ? {make: {equals: input.make.trim(), mode: "insensitive" as const}} : {}),
      ...(input.year ? {year: input.year} : {}),
      ...(query ? {
        OR: [
          {make: {contains: query, mode: "insensitive" as const}},
          {model: {contains: query, mode: "insensitive" as const}},
          {trim: {contains: query, mode: "insensitive" as const}},
          {generation: {contains: query, mode: "insensitive" as const}},
          {bodyType: {contains: query, mode: "insensitive" as const}},
        ],
      } : {}),
    },
    orderBy: [{make: "asc"}, {model: "asc"}, {year: "desc"}, {trim: "asc"}],
    take: limit,
    include: {
      assets: {
        where: {active: true},
        orderBy: [{sortOrder: "asc"}, {createdAt: "asc"}],
        take: 12,
      },
    },
  });
  return rows.map(serializeCatalogVehicle);
}

export async function getCarCatalogVehicle(catalogVehicleId: string) {
  const row = await database().carCatalogVehicle.findFirst({
    where: {id: catalogVehicleId, active: true},
    include: {
      assets: {where: {active: true}, orderBy: [{sortOrder: "asc"}, {createdAt: "asc"}]},
    },
  });
  return row ? serializeCatalogVehicle(row) : null;
}

export async function getCarCatalogForFleetVehicle(vehicleId: string) {
  const link = await database().carVehicleCatalogLink.findUnique({
    where: {vehicleId},
    include: {
      catalogVehicle: {
        include: {assets: {where: {active: true}, orderBy: [{sortOrder: "asc"}, {createdAt: "asc"}]}},
      },
    },
  });
  return link ? {
    matchedBy: link.matchedBy,
    catalog: serializeCatalogVehicle(link.catalogVehicle),
  } : null;
}

export async function listCarCatalogVisualsForFleetVehicle(vehicleId: string) {
  const match = await getCarCatalogForFleetVehicle(vehicleId);
  return match?.catalog.assets ?? [];
}

function serializeCatalogVehicle(row: any) {
  const assets = (row.assets ?? []).map((asset: any) => ({
    id: asset.id,
    type: asset.type,
    provider: asset.provider,
    url: asset.url,
    angle: asset.angle,
    spinFrame: asset.spinFrame,
    paintCode: asset.paintCode,
    paintName: asset.paintName,
    width: asset.width,
    height: asset.height,
    sortOrder: asset.sortOrder,
  }));
  const hero = row.primaryImageUrl
    ?? assets.find((asset: any) => asset.type === "HERO")?.url
    ?? assets.find((asset: any) => asset.type === "EXTERIOR_FRONT_LEFT")?.url
    ?? assets.find((asset: any) => asset.type === "EXTERIOR_FRONT")?.url
    ?? null;

  return {
    id: row.id,
    slug: row.slug,
    make: row.make,
    model: row.model,
    year: row.year,
    generation: row.generation,
    trim: row.trim,
    bodyType: row.bodyType,
    category: row.category,
    transmission: row.transmission,
    fuel: row.fuel,
    seats: row.seats,
    bags: row.bags,
    doors: row.doors,
    provider: row.provider,
    providerVehicleId: row.providerVehicleId,
    primaryImageUrl: hero,
    exterior360Available: row.exterior360Available,
    interior360Available: row.interior360Available,
    reviewed: row.reviewed,
    assets,
  };
}
