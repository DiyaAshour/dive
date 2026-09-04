import { randomUUID } from "node:crypto";
import { database } from "@platform/database";
import { ApplicationError, badRequest, notFound } from "../errors";
import { objectStorage } from "../storage/registry";
import { requirePlatformAdmin } from "./authorization";
import type { CarCatalogAssetKind } from "./car-catalog";

const UPLOAD_EXPIRY_SECONDS = 10 * 60;
const SIGNATURE_READ_BYTES = 32;
const MAX_CUTOUT_BYTES = 12 * 1024 * 1024;
const CUTOUT_TYPES = ["HERO", "EXTERIOR_FRONT", "EXTERIOR_FRONT_LEFT", "EXTERIOR_FRONT_RIGHT", "EXTERIOR_SIDE_LEFT", "EXTERIOR_SIDE_RIGHT", "EXTERIOR_REAR_LEFT", "EXTERIOR_REAR_RIGHT", "EXTERIOR_REAR"] as const satisfies readonly CarCatalogAssetKind[];

type CutoutType = typeof CUTOUT_TYPES[number];

export type CreateCarCatalogCutoutUploadInput = Readonly<{
  fileName: string;
  contentType: "image/png" | "image/webp";
  sizeBytes: number;
  type?: CutoutType | undefined;
  angle?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  sourceRef?: string | undefined;
}>;

export async function listCarCatalogCutoutUploads(adminUserId: string, catalogVehicleId: string) {
  await requirePlatformAdmin(adminUserId);
  await requireCatalogVehicle(catalogVehicleId);
  const rows = await database().carCatalogAssetUpload.findMany({
    where: {catalogVehicleId, state: {not: "DELETED"}},
    orderBy: {createdAt: "desc"},
    take: 50,
  });
  return rows.map(uploadView);
}

export async function createCarCatalogCutoutUpload(adminUserId: string, catalogVehicleId: string, input: CreateCarCatalogCutoutUploadInput) {
  await requirePlatformAdmin(adminUserId);
  const vehicle = await requireCatalogVehicle(catalogVehicleId);
  validateInput(input);

  const storage = requireStorage();
  const extension = input.contentType === "image/png" ? "png" : "webp";
  const objectKey = `cars/catalog/${catalogVehicleId}/cutouts/${randomUUID()}.${extension}`;
  const publicUrl = storage.publicUrl(objectKey);
  if (!publicUrl) throw new ApplicationError("PUBLIC_MEDIA_URL_NOT_CONFIGURED", "STORAGE_PUBLIC_BASE_URL is required before catalog cutouts can be uploaded", 503);

  const uploadExpiresAt = new Date(Date.now() + UPLOAD_EXPIRY_SECONDS * 1000);
  const row = await database().carCatalogAssetUpload.create({
    data: {
      catalogVehicleId,
      uploadedByUserId: adminUserId,
      type: input.type ?? "EXTERIOR_FRONT_LEFT",
      angle: input.angle?.trim().slice(0, 80) || "front-left-3q",
      objectKey,
      publicUrl,
      originalFileName: sanitizeFileName(input.fileName),
      contentType: input.contentType,
      expectedSizeBytes: input.sizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      sourceRef: input.sourceRef?.trim().slice(0, 500) || "HandMeKey standardized cutout",
      uploadExpiresAt,
    },
  });
  const upload = await storage.createUploadGrant({objectKey, contentType: input.contentType, expiresInSeconds: UPLOAD_EXPIRY_SECONDS});
  return {
    vehicle: {id: vehicle.id, make: vehicle.make, model: vehicle.model, year: vehicle.year, trim: vehicle.trim},
    item: uploadView(row),
    upload,
    standard: cutoutStandard(),
  };
}

export async function completeCarCatalogCutoutUpload(adminUserId: string, catalogVehicleId: string, uploadId: string) {
  await requirePlatformAdmin(adminUserId);
  const db = database();
  const row = await db.carCatalogAssetUpload.findFirst({where: {id: uploadId, catalogVehicleId}});
  if (!row) notFound("Car catalog cutout upload");
  if (row.state === "DELETED") badRequest("CATALOG_CUTOUT_DELETED", "Deleted cutout uploads cannot be completed");
  if (row.state === "READY") {
    const asset = await db.carCatalogAsset.findFirst({where: {catalogVehicleId, provider: "HANDMEKEY", sourceRef: `upload:${row.id}`, active: true}});
    return {item: uploadView(row), asset, standard: cutoutStandard()};
  }
  if (row.uploadExpiresAt.getTime() < Date.now()) badRequest("UPLOAD_EXPIRED", "The upload grant expired; create a new upload");

  const storage = requireStorage();
  const stored = await storage.headObject(row.objectKey);
  if (!stored) badRequest("UPLOAD_NOT_FOUND", "The uploaded cutout was not found in storage");
  if (stored.sizeBytes !== row.expectedSizeBytes) badRequest("UPLOAD_SIZE_MISMATCH", "Uploaded file size does not match the declared file size");
  if ((stored.contentType ?? "").toLowerCase() !== row.contentType.toLowerCase()) badRequest("UPLOAD_TYPE_MISMATCH", "Uploaded content type does not match the declared image type");
  const prefix = await storage.readPrefix(row.objectKey, SIGNATURE_READ_BYTES);
  if (!matchesFileSignature(row.contentType, prefix)) {
    await storage.deleteObject(row.objectKey);
    await db.carCatalogAssetUpload.update({where: {id: row.id}, data: {state: "DELETED", deletedAt: new Date()}});
    badRequest("UPLOAD_SIGNATURE_MISMATCH", "Uploaded file bytes do not match the declared image type");
  }

  const result = await db.$transaction(async (tx) => {
    const ready = await tx.carCatalogAssetUpload.update({where: {id: row.id}, data: {state: "READY", uploadedAt: new Date()}});
    await tx.carCatalogAsset.updateMany({
      where: {catalogVehicleId, provider: "HANDMEKEY", type: row.type, active: true},
      data: {active: false},
    });
    const asset = await tx.carCatalogAsset.create({
      data: {
        catalogVehicleId,
        type: row.type,
        provider: "HANDMEKEY",
        url: row.publicUrl,
        angle: row.angle,
        width: row.width,
        height: row.height,
        sortOrder: 0,
        active: true,
        sourceRef: `upload:${row.id}`,
      },
    });
    if (["HERO", "EXTERIOR_FRONT_LEFT", "EXTERIOR_FRONT_RIGHT", "EXTERIOR_FRONT"].includes(row.type)) {
      await tx.carCatalogVehicle.update({
        where: {id: catalogVehicleId},
        data: {primaryImageUrl: row.publicUrl, provider: "HANDMEKEY", lastSyncedAt: new Date()},
      });
    }
    return {ready, asset};
  });
  return {item: uploadView(result.ready), asset: result.asset, standard: cutoutStandard()};
}

function validateInput(input: CreateCarCatalogCutoutUploadInput) {
  if (!input.fileName.trim()) badRequest("CATALOG_CUTOUT_FILENAME_REQUIRED", "Cutout filename is required");
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_CUTOUT_BYTES) {
    badRequest("CATALOG_CUTOUT_SIZE_INVALID", "Cutout images must be between 1 byte and 12 MB");
  }
  if (!["image/png", "image/webp"].includes(input.contentType)) {
    throw new ApplicationError("UNSUPPORTED_MEDIA_TYPE", "Catalog cutouts must be PNG or WebP", 415);
  }
  if (input.type && !CUTOUT_TYPES.includes(input.type)) badRequest("CATALOG_CUTOUT_TYPE_INVALID", "Cutout angle type is invalid");
  if (input.width !== undefined && (!Number.isInteger(input.width) || input.width < 400 || input.width > 8000)) badRequest("CATALOG_CUTOUT_WIDTH_INVALID", "Cutout width is invalid");
  if (input.height !== undefined && (!Number.isInteger(input.height) || input.height < 225 || input.height > 6000)) badRequest("CATALOG_CUTOUT_HEIGHT_INVALID", "Cutout height is invalid");
}

async function requireCatalogVehicle(id: string) {
  const vehicle = await database().carCatalogVehicle.findFirst({where: {id, active: true}, select: {id: true, make: true, model: true, year: true, trim: true}});
  if (!vehicle) notFound("Car catalog vehicle");
  return vehicle;
}

function requireStorage() {
  const storage = objectStorage();
  if (!storage) throw new ApplicationError("STORAGE_NOT_CONFIGURED", "Object storage is not configured", 503);
  return storage;
}

function cutoutStandard() {
  return {
    background: "transparent",
    preferredAngle: "front-left-3q",
    preferredCanvas: {width: 1600, height: 900},
    formats: ["image/webp", "image/png"],
    framing: "whole vehicle centered with consistent ground clearance and no text/background props",
  } as const;
}

function uploadView(row: {
  id:string;catalogVehicleId:string;type:string;angle:string|null;publicUrl:string;originalFileName:string;contentType:string;expectedSizeBytes:number;width:number|null;height:number|null;sourceRef:string|null;state:string;uploadExpiresAt:Date;uploadedAt:Date|null;createdAt:Date;
}) {
  return {
    id: row.id,
    catalogVehicleId: row.catalogVehicleId,
    type: row.type,
    angle: row.angle,
    url: row.state === "READY" ? row.publicUrl : null,
    originalFileName: row.originalFileName,
    contentType: row.contentType,
    sizeBytes: row.expectedSizeBytes,
    width: row.width,
    height: row.height,
    sourceRef: row.sourceRef,
    state: row.state,
    uploadExpiresAt: row.uploadExpiresAt.toISOString(),
    uploadedAt: row.uploadedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[\\/\0\r\n]/g, "_").slice(0, 180) || "vehicle-cutout";
}

function matchesFileSignature(contentType: string, bytes: Uint8Array) {
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
