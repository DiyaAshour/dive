import { randomUUID } from "node:crypto";
import { database } from "@platform/database";
import { ApplicationError, badRequest, forbidden, notFound } from "../errors";
import { objectStorage } from "../storage/registry";
import { syncCarVehicleVisual } from "./auto-visuals";

const UPLOAD_EXPIRY_SECONDS = 10 * 60;
const SIGNATURE_READ_BYTES = 16;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export const CAR_PHOTO_CATEGORIES = [
  "EXTERIOR_FRONT",
  "EXTERIOR_REAR",
  "EXTERIOR_LEFT",
  "EXTERIOR_RIGHT",
  "INTERIOR_DASHBOARD",
  "INTERIOR_FRONT_SEATS",
  "INTERIOR_REAR_SEATS",
  "TRUNK",
  "INFOTAINMENT",
  "STEERING_WHEEL",
  "ODOMETER",
  "KEYS_ACCESSORIES",
  "OTHER",
] as const;

export type CarPhotoCategory = typeof CAR_PHOTO_CATEGORIES[number];

export type CreateCarVehiclePhotoUploadInput = Readonly<{
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  category: CarPhotoCategory;
  alt?: string;
}>;

export type UpdateCarVehiclePhotoInput = Readonly<{
  category?: CarPhotoCategory;
  alt?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}>;

export async function listCarVehicleMedia(userId: string, vehicleId: string) {
  await requireVehicleAccess(userId, vehicleId);
  return listVehiclePhotos(vehicleId, false);
}

export async function getCarVehicleMediaManager(userId: string, vehicleId: string) {
  const access = await requireVehicleAccess(userId, vehicleId);
  const [photos, visualSync] = await Promise.all([
    listVehiclePhotos(vehicleId, false),
    syncCarVehicleVisual(vehicleId).catch((error) => {
      console.error("[cars:media] Existing fleet visual sync failed", error);
      return null;
    }),
  ]);
  const modelVisuals = visualSync?.status === "LINKED"
    ? visualSync.assets.map((asset, index) => catalogAssetView(visualSync.catalog, asset, index, vehicleId))
    : [];
  return {
    vehicle: {
      id: access.vehicle.id,
      make: access.vehicle.make,
      model: access.vehicle.model,
      year: access.vehicle.year,
      category: access.vehicle.category,
      status: access.vehicle.status,
    },
    company: {
      id: access.membership.companyId,
      name: access.company.name,
      currency: access.company.currency,
    },
    photos,
    modelVisuals,
    catalog: visualSync?.catalog ? {
      id: visualSync.catalog.id,
      make: visualSync.catalog.make,
      model: visualSync.catalog.model,
      trim: visualSync.catalog.trim,
      year: visualSync.catalog.year,
      provider: visualSync.catalog.provider,
      exterior360Available: visualSync.catalog.exterior360Available,
      interior360Available: visualSync.catalog.interior360Available,
    } : null,
    visualSyncStatus: visualSync?.status ?? "UNMATCHED",
  };
}

export async function createCarVehiclePhotoUpload(userId: string, vehicleId: string, input: CreateCarVehiclePhotoUploadInput) {
  await requireVehicleAccess(userId, vehicleId);
  validateUploadInput(input);

  const storage = requireStorage();
  const extension = extensionFor(input.contentType);
  const objectKey = `cars/vehicles/${vehicleId}/images/${randomUUID()}.${extension}`;
  const publicUrl = storage.publicUrl(objectKey);
  if (!publicUrl) {
    throw new ApplicationError("PUBLIC_MEDIA_URL_NOT_CONFIGURED", "STORAGE_PUBLIC_BASE_URL is required before car images can be uploaded", 503);
  }

  const db = database();
  const existingPhotoCount = await db.carVehiclePhoto.count({where: {vehicleId, state: {not: "DELETED"}}});
  const nextSort = await db.carVehiclePhoto.aggregate({where: {vehicleId, state: {not: "DELETED"}}, _max: {sortOrder: true}});
  const uploadExpiresAt = new Date(Date.now() + UPLOAD_EXPIRY_SECONDS * 1000);
  const photo = await db.carVehiclePhoto.create({
    data: {
      vehicleId,
      uploadedByUserId: userId,
      category: input.category,
      objectKey,
      publicUrl,
      originalFileName: sanitizeFileName(input.fileName),
      contentType: input.contentType,
      expectedSizeBytes: input.sizeBytes,
      alt: input.alt?.trim().slice(0, 180) || null,
      sortOrder: (nextSort._max.sortOrder ?? -1) + 1,
      isPrimary: existingPhotoCount === 0,
      uploadExpiresAt,
    },
  });
  const upload = await storage.createUploadGrant({objectKey, contentType: input.contentType, expiresInSeconds: UPLOAD_EXPIRY_SECONDS});
  return {photo: photoView(photo), upload};
}

export async function completeCarVehiclePhotoUpload(userId: string, vehicleId: string, photoId: string) {
  await requireVehicleAccess(userId, vehicleId);
  const db = database();
  const photo = await db.carVehiclePhoto.findFirst({where: {id: photoId, vehicleId}});
  if (!photo) notFound("Car vehicle photo");
  if (photo.state === "READY") return photoView(photo);
  if (photo.state === "DELETED") badRequest("CAR_PHOTO_DELETED", "Deleted vehicle media cannot be completed");
  if (photo.uploadExpiresAt.getTime() < Date.now()) badRequest("UPLOAD_EXPIRED", "The upload grant expired; create a new upload");

  const storage = requireStorage();
  const stored = await storage.headObject(photo.objectKey);
  if (!stored) badRequest("UPLOAD_NOT_FOUND", "The uploaded image was not found in storage");
  if (stored.sizeBytes !== photo.expectedSizeBytes) badRequest("UPLOAD_SIZE_MISMATCH", "Uploaded file size does not match the declared file size");
  if ((stored.contentType ?? "").toLowerCase() !== photo.contentType.toLowerCase()) badRequest("UPLOAD_TYPE_MISMATCH", "Uploaded content type does not match the declared image type");
  const prefix = await storage.readPrefix(photo.objectKey, SIGNATURE_READ_BYTES);
  if (!matchesFileSignature(photo.contentType, prefix)) {
    await storage.deleteObject(photo.objectKey);
    await db.carVehiclePhoto.update({where: {id: photo.id}, data: {state: "DELETED", deletedAt: new Date()}});
    badRequest("UPLOAD_SIGNATURE_MISMATCH", "Uploaded file bytes do not match the declared image type");
  }

  const completed = await db.$transaction(async (tx) => {
    const ready = await tx.carVehiclePhoto.update({where: {id: photo.id}, data: {state: "READY", uploadedAt: new Date()}});
    const primary = await tx.carVehiclePhoto.findFirst({where: {vehicleId, state: "READY", isPrimary: true}, select: {id: true}});
    if (!primary) {
      await tx.carVehiclePhoto.update({where: {id: ready.id}, data: {isPrimary: true}});
      return {...ready, isPrimary: true};
    }
    return ready;
  });
  return photoView(completed);
}

export async function updateCarVehiclePhoto(userId: string, vehicleId: string, photoId: string, input: UpdateCarVehiclePhotoInput) {
  await requireVehicleAccess(userId, vehicleId);
  const db = database();
  const photo = await db.carVehiclePhoto.findFirst({where: {id: photoId, vehicleId, state: "READY"}});
  if (!photo) notFound("Car vehicle photo");
  if (input.sortOrder !== undefined && (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 9999)) {
    badRequest("CAR_PHOTO_SORT_INVALID", "Photo order must be a non-negative integer");
  }

  const updated = await db.$transaction(async (tx) => {
    if (input.isPrimary === true) {
      await tx.carVehiclePhoto.updateMany({where: {vehicleId, state: "READY", id: {not: photoId}}, data: {isPrimary: false}});
    }
    return tx.carVehiclePhoto.update({
      where: {id: photoId},
      data: {
        ...(input.category !== undefined ? {category: input.category} : {}),
        ...(input.alt !== undefined ? {alt: input.alt?.trim().slice(0, 180) || null} : {}),
        ...(input.sortOrder !== undefined ? {sortOrder: input.sortOrder} : {}),
        ...(input.isPrimary !== undefined ? {isPrimary: input.isPrimary} : {}),
      },
    });
  });
  return photoView(updated);
}

export async function deleteCarVehiclePhoto(userId: string, vehicleId: string, photoId: string) {
  await requireVehicleAccess(userId, vehicleId);
  const db = database();
  const photo = await db.carVehiclePhoto.findFirst({where: {id: photoId, vehicleId}});
  if (!photo) notFound("Car vehicle photo");
  if (photo.state === "DELETED") return {photoId, deleted: true};

  await requireStorage().deleteObject(photo.objectKey).catch(() => undefined);
  await db.$transaction(async (tx) => {
    await tx.carVehiclePhoto.update({where: {id: photo.id}, data: {state: "DELETED", isPrimary: false, deletedAt: new Date()}});
    if (photo.isPrimary) {
      const replacement = await tx.carVehiclePhoto.findFirst({
        where: {vehicleId, state: "READY", id: {not: photo.id}},
        orderBy: [{sortOrder: "asc"}, {createdAt: "asc"}],
        select: {id: true},
      });
      if (replacement) await tx.carVehiclePhoto.update({where: {id: replacement.id}, data: {isPrimary: true}});
    }
  });
  return {photoId, deleted: true};
}

export async function listPublicCarVehiclePhotos(vehicleId: string) {
  const db = database();
  const [supplierPhotos, link] = await Promise.all([
    listVehiclePhotos(vehicleId, true),
    db.carVehicleCatalogLink.findUnique({
      where: {vehicleId},
      include: {
        catalogVehicle: {
          include: {assets: {where: {active: true}, orderBy: [{sortOrder: "asc"}, {createdAt: "asc"}], take: 160}},
        },
      },
    }),
  ]);

  if (!link) return supplierPhotos;
  const catalog = link.catalogVehicle;
  const catalogPhotos = catalog.assets.map((asset, index) => catalogAssetView(catalog, asset, index, vehicleId));
  if (catalog.primaryImageUrl && !catalog.assets.some((asset) => asset.type === "HERO")) {
    catalogPhotos.unshift({
      id: `catalog-primary-${catalog.id}`,
      vehicleId,
      category: "HERO",
      url: catalog.primaryImageUrl,
      originalFileName: "catalog-primary",
      contentType: "image/webp",
      sizeBytes: 0,
      alt: `${catalog.make} ${catalog.model}${catalog.trim ? ` ${catalog.trim}` : ""} ${catalog.year}`,
      sortOrder: -1,
      isPrimary: true,
      state: "READY",
      uploadExpiresAt: catalog.updatedAt.toISOString(),
      uploadedAt: catalog.updatedAt.toISOString(),
      createdAt: catalog.createdAt.toISOString(),
    });
  }
  return [...catalogPhotos, ...supplierPhotos];
}

async function listVehiclePhotos(vehicleId: string, readyOnly: boolean) {
  const rows = await database().carVehiclePhoto.findMany({
    where: {vehicleId, ...(readyOnly ? {state: "READY" as const} : {state: {not: "DELETED" as const}})},
    orderBy: [{isPrimary: "desc"}, {sortOrder: "asc"}, {createdAt: "asc"}],
    take: 80,
  });
  return rows.map(photoView);
}

async function requireVehicleAccess(userId: string, vehicleId: string) {
  const db = database();
  const membership = await db.carCompanyMembership.findFirst({
    where: {userId, status: "ACTIVE"},
    orderBy: {createdAt: "asc"},
    select: {companyId: true, role: true},
  });
  if (!membership) forbidden("Car rental company access required");
  const vehicle = await db.carVehicle.findFirst({
    where: {id: vehicleId, companyId: membership.companyId},
    select: {id: true, make: true, model: true, year: true, category: true, status: true},
  });
  if (!vehicle) notFound("Car vehicle");
  const company = await db.carRentalCompany.findUnique({where: {id: membership.companyId}, select: {id: true, name: true, currency: true}});
  if (!company) notFound("Car rental company");
  return {membership, vehicle, company};
}

function validateUploadInput(input: CreateCarVehiclePhotoUploadInput) {
  if (!input.fileName.trim()) badRequest("CAR_PHOTO_FILENAME_REQUIRED", "Image filename is required");
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_IMAGE_BYTES) {
    badRequest("CAR_PHOTO_SIZE_INVALID", "Vehicle images must be between 1 byte and 15 MB");
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(input.contentType)) {
    throw new ApplicationError("UNSUPPORTED_MEDIA_TYPE", "Vehicle images must be JPEG, PNG or WebP", 415);
  }
  if (!CAR_PHOTO_CATEGORIES.includes(input.category)) badRequest("CAR_PHOTO_CATEGORY_INVALID", "Vehicle photo category is invalid");
}

function photoView(photo: {
  id: string;
  vehicleId: string;
  category: string;
  publicUrl: string;
  originalFileName: string;
  contentType: string;
  expectedSizeBytes: number;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
  state: string;
  uploadExpiresAt: Date;
  uploadedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: photo.id,
    vehicleId: photo.vehicleId,
    category: photo.category as CarPhotoCategory,
    url: photo.state === "READY" ? photo.publicUrl : null,
    originalFileName: photo.originalFileName,
    contentType: photo.contentType,
    sizeBytes: photo.expectedSizeBytes,
    alt: photo.alt,
    sortOrder: photo.sortOrder,
    isPrimary: photo.isPrimary,
    state: photo.state,
    uploadExpiresAt: photo.uploadExpiresAt.toISOString(),
    uploadedAt: photo.uploadedAt?.toISOString() ?? null,
    createdAt: photo.createdAt.toISOString(),
  };
}

function catalogAssetView(catalog: any, asset: any, index: number, vehicleId = "catalog") {
  return {
    id: `catalog-${asset.id}`,
    vehicleId,
    category: asset.type,
    url: asset.url,
    originalFileName: `catalog-${asset.type.toLowerCase()}`,
    contentType: "image/webp",
    sizeBytes: 0,
    alt: `${catalog.make} ${catalog.model}${catalog.trim ? ` ${catalog.trim}` : ""} ${catalog.year}`,
    sortOrder: asset.sortOrder ?? index,
    isPrimary: asset.type === "HERO" || index === 0,
    state: "READY",
    uploadExpiresAt: asset.updatedAt.toISOString(),
    uploadedAt: asset.updatedAt.toISOString(),
    createdAt: asset.createdAt.toISOString(),
  };
}

function requireStorage() {
  const storage = objectStorage();
  if (!storage) throw new ApplicationError("STORAGE_NOT_CONFIGURED", "Object storage is not configured", 503);
  return storage;
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[\\/\0\r\n]/g, "_").slice(0, 180) || "vehicle-photo";
}

function extensionFor(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  throw new ApplicationError("UNSUPPORTED_MEDIA_TYPE", "Unsupported vehicle image type", 415);
}

function matchesFileSignature(contentType: string, bytes: Uint8Array) {
  if (contentType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (contentType === "image/png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (contentType === "image/webp") return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && matchesAt(bytes, 8, [0x57, 0x45, 0x42, 0x50]);
  return false;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return matchesAt(bytes, 0, signature);
}

function matchesAt(bytes: Uint8Array, offset: number, signature: readonly number[]) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}
