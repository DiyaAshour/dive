import { randomUUID } from "node:crypto";
import { database } from "@platform/database";
import { ApplicationError } from "../errors";
import { objectStorage } from "../storage/registry";
import { requirePlatformOwner } from "./access";

export const SITE_ASSET_KINDS = ["LOGO_MARK", "WORDMARK", "LOGO_LIGHT", "FAVICON", "OG_IMAGE"] as const;
export type SiteAssetKind = typeof SITE_ASSET_KINDS[number];

export type SiteAssetUploadInput = Readonly<{
  kind: SiteAssetKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}>;

type InitiatedAsset = Readonly<{
  kind: SiteAssetKind;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  publicUrl: string;
  expiresAt: string;
}>;

const UPLOAD_EXPIRY_SECONDS = 10 * 60;
const SIGNATURE_READ_BYTES = 128 * 1024;
const KIND_SET = new Set<string>(SITE_ASSET_KINDS);

const SPECS: Record<SiteAssetKind, Readonly<{
  maxBytes: number;
  allowedTypes: readonly string[];
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  recommended: string;
}>> = {
  LOGO_MARK: {
    maxBytes: 2_000_000,
    allowedTypes: ["image/png", "image/webp"],
    minWidth: 128,
    minHeight: 128,
    maxWidth: 4096,
    maxHeight: 4096,
    recommended: "512×512 PNG/WebP with transparency",
  },
  WORDMARK: {
    maxBytes: 2_000_000,
    allowedTypes: ["image/png", "image/webp"],
    minWidth: 320,
    minHeight: 60,
    maxWidth: 4096,
    maxHeight: 2048,
    recommended: "1200×300 PNG/WebP with transparency",
  },
  LOGO_LIGHT: {
    maxBytes: 2_000_000,
    allowedTypes: ["image/png", "image/webp"],
    minWidth: 320,
    minHeight: 60,
    maxWidth: 4096,
    maxHeight: 2048,
    recommended: "1200×300 light PNG/WebP with transparency",
  },
  FAVICON: {
    maxBytes: 512_000,
    allowedTypes: ["image/png", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"],
    minWidth: 32,
    minHeight: 32,
    maxWidth: 1024,
    maxHeight: 1024,
    recommended: "512×512 PNG or ICO",
  },
  OG_IMAGE: {
    maxBytes: 5_000_000,
    allowedTypes: ["image/png", "image/jpeg", "image/webp"],
    minWidth: 600,
    minHeight: 315,
    maxWidth: 6000,
    maxHeight: 4000,
    recommended: "1200×630 PNG/JPEG/WebP",
  },
};

export function siteAssetUploadSpecs() {
  return Object.fromEntries(SITE_ASSET_KINDS.map((kind) => [kind, {
    maxBytes: SPECS[kind].maxBytes,
    allowedTypes: SPECS[kind].allowedTypes,
    recommended: SPECS[kind].recommended,
  }])) as Record<SiteAssetKind, {maxBytes: number; allowedTypes: readonly string[]; recommended: string}>;
}

export async function createSiteAssetUpload(actorUserId: string, rawInput: SiteAssetUploadInput) {
  await requirePlatformOwner(actorUserId);
  const input = validateUploadInput(rawInput);
  const storage = requirePublicStorage();
  const objectKey = `site/brand/${input.kind.toLowerCase()}/${randomUUID()}.${extensionFor(input.contentType)}`;
  const publicUrl = storage.publicUrl(objectKey);
  if (!publicUrl) throw new ApplicationError("PUBLIC_MEDIA_URL_NOT_CONFIGURED", "STORAGE_PUBLIC_BASE_URL is required before brand assets can be uploaded", 503);
  const upload = await storage.createUploadGrant({objectKey, contentType: input.contentType, expiresInSeconds: UPLOAD_EXPIRY_SECONDS});

  await database().auditLog.create({data: {
    actorUserId,
    action: "SITE_ASSET_UPLOAD_INITIATED",
    entityType: "PlatformSiteAsset",
    entityId: objectKey,
    after: {
      kind: input.kind,
      fileName: sanitizeFileName(input.fileName),
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      publicUrl,
      expiresAt: upload.expiresAt,
    },
  }});

  return {
    assetKey: objectKey,
    kind: input.kind,
    publicUrl,
    upload,
    recommended: SPECS[input.kind].recommended,
  };
}

export async function completeSiteAssetUpload(actorUserId: string, assetKey: string) {
  await requirePlatformOwner(actorUserId);
  if (!assetKey.startsWith("site/brand/") || assetKey.length > 500) {
    throw new ApplicationError("INVALID_SITE_ASSET_KEY", "Invalid site asset key", 400);
  }

  const initiation = await database().auditLog.findFirst({
    where: {
      actorUserId,
      action: "SITE_ASSET_UPLOAD_INITIATED",
      entityType: "PlatformSiteAsset",
      entityId: assetKey,
    },
    orderBy: {createdAt: "desc"},
    select: {after: true},
  });
  const initiated = parseInitiatedAsset(initiation?.after);
  if (!initiated) throw new ApplicationError("SITE_ASSET_UPLOAD_NOT_FOUND", "No valid site asset upload was initiated for this file", 404);
  if (new Date(initiated.expiresAt).getTime() < Date.now()) {
    throw new ApplicationError("UPLOAD_EXPIRED", "The upload grant expired; choose the file again", 400);
  }

  const storage = requirePublicStorage();
  const stored = await storage.headObject(assetKey);
  if (!stored) throw new ApplicationError("UPLOAD_NOT_FOUND", "The uploaded file was not found in storage", 400);
  if (stored.sizeBytes !== initiated.sizeBytes) throw new ApplicationError("UPLOAD_SIZE_MISMATCH", "Uploaded file size does not match the selected file", 400);
  if ((stored.contentType ?? "").toLowerCase() !== initiated.contentType.toLowerCase()) {
    throw new ApplicationError("UPLOAD_TYPE_MISMATCH", "Uploaded content type does not match the selected file", 400);
  }

  const bytes = await storage.readPrefix(assetKey, SIGNATURE_READ_BYTES);
  if (!matchesFileSignature(initiated.contentType, bytes)) {
    await storage.deleteObject(assetKey).catch(() => undefined);
    throw new ApplicationError("UPLOAD_SIGNATURE_MISMATCH", "The uploaded bytes do not match the declared image type", 400);
  }

  const dimensions = imageDimensions(initiated.contentType, bytes);
  if (!dimensions) {
    await storage.deleteObject(assetKey).catch(() => undefined);
    throw new ApplicationError("IMAGE_DIMENSIONS_UNREADABLE", "Could not verify the image dimensions", 400);
  }
  try {
    validateDimensions(initiated.kind, dimensions.width, dimensions.height);
  } catch (error) {
    await storage.deleteObject(assetKey).catch(() => undefined);
    throw error;
  }

  await database().auditLog.create({data: {
    actorUserId,
    action: "SITE_ASSET_UPLOAD_COMPLETED",
    entityType: "PlatformSiteAsset",
    entityId: assetKey,
    after: {
      kind: initiated.kind,
      fileName: initiated.fileName,
      contentType: initiated.contentType,
      sizeBytes: stored.sizeBytes,
      publicUrl: initiated.publicUrl,
      width: dimensions.width,
      height: dimensions.height,
      signatureVerified: true,
    },
  }});

  return {
    assetKey,
    kind: initiated.kind,
    publicUrl: initiated.publicUrl,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function validateUploadInput(input: SiteAssetUploadInput): SiteAssetUploadInput {
  if (!KIND_SET.has(input.kind)) throw new ApplicationError("INVALID_SITE_ASSET_KIND", "Unsupported site asset type", 400);
  const kind = input.kind as SiteAssetKind;
  const contentType = input.contentType.trim().toLowerCase();
  const spec = SPECS[kind];
  if (!spec.allowedTypes.includes(contentType)) {
    throw new ApplicationError("UNSUPPORTED_SITE_ASSET_TYPE", `Unsupported image type for ${kind}`, 415);
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 1 || input.sizeBytes > spec.maxBytes) {
    throw new ApplicationError("INVALID_SITE_ASSET_SIZE", `File must be smaller than ${Math.ceil(spec.maxBytes / 1_000_000)} MB`, 400);
  }
  return {kind, fileName: sanitizeFileName(input.fileName), contentType, sizeBytes: input.sizeBytes};
}

function parseInitiatedAsset(value: unknown): InitiatedAsset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.kind !== "string" || !KIND_SET.has(record.kind)) return null;
  if (typeof record.fileName !== "string" || typeof record.contentType !== "string" || typeof record.publicUrl !== "string" || typeof record.expiresAt !== "string") return null;
  if (typeof record.sizeBytes !== "number" || !Number.isInteger(record.sizeBytes)) return null;
  return {
    kind: record.kind as SiteAssetKind,
    fileName: record.fileName,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    publicUrl: record.publicUrl,
    expiresAt: record.expiresAt,
  };
}

function validateDimensions(kind: SiteAssetKind, width: number, height: number) {
  const spec = SPECS[kind];
  if (width < spec.minWidth || height < spec.minHeight || width > spec.maxWidth || height > spec.maxHeight) {
    throw new ApplicationError("INVALID_SITE_ASSET_DIMENSIONS", `${kind} dimensions must fit ${spec.minWidth}×${spec.minHeight} to ${spec.maxWidth}×${spec.maxHeight}px. Recommended: ${spec.recommended}`, 400);
  }
  if ((kind === "LOGO_MARK" || kind === "FAVICON") && Math.max(width, height) / Math.min(width, height) > 1.35) {
    throw new ApplicationError("INVALID_SITE_ASSET_ASPECT_RATIO", `${kind} should be approximately square`, 400);
  }
  if ((kind === "WORDMARK" || kind === "LOGO_LIGHT") && width / height < 2) {
    throw new ApplicationError("INVALID_SITE_ASSET_ASPECT_RATIO", `${kind} should be a horizontal logo`, 400);
  }
}

function requirePublicStorage() {
  const storage = objectStorage();
  if (!storage) throw new ApplicationError("STORAGE_NOT_CONFIGURED", "Object storage is not configured", 503);
  return storage;
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/webp": return "webp";
    case "image/x-icon":
    case "image/vnd.microsoft.icon": return "ico";
    default: throw new ApplicationError("UNSUPPORTED_SITE_ASSET_TYPE", "Unsupported image type", 415);
  }
}

function sanitizeFileName(value: string): string {
  const safe = value.trim().replace(/[^a-zA-Z0-9._ -]+/g, "_").slice(0, 160);
  return safe || "brand-image";
}

function matchesFileSignature(contentType: string, bytes: Uint8Array): boolean {
  switch (contentType.toLowerCase()) {
    case "image/png": return startsWith(bytes, [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
    case "image/jpeg": return startsWith(bytes, [0xff,0xd8,0xff]);
    case "image/webp": return startsWith(bytes, [0x52,0x49,0x46,0x46]) && matchesAt(bytes, 8, [0x57,0x45,0x42,0x50]);
    case "image/x-icon":
    case "image/vnd.microsoft.icon": return startsWith(bytes, [0x00,0x00,0x01,0x00]);
    default: return false;
  }
}

function imageDimensions(contentType: string, bytes: Uint8Array): {width: number; height: number} | null {
  switch (contentType.toLowerCase()) {
    case "image/png": return pngDimensions(bytes);
    case "image/jpeg": return jpegDimensions(bytes);
    case "image/webp": return webpDimensions(bytes);
    case "image/x-icon":
    case "image/vnd.microsoft.icon": return icoDimensions(bytes);
    default: return null;
  }
}

function pngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) return null;
  return {width: readU32BE(bytes, 16), height: readU32BE(bytes, 20)};
}

function icoDimensions(bytes: Uint8Array): {width: number; height: number} | null {
  if (bytes.length < 6) return null;
  const count = byteAt(bytes, 4) | (byteAt(bytes, 5) << 8);
  if (count < 1 || bytes.length < 6 + (count * 16)) return null;
  let width = 0;
  let height = 0;
  for (let index = 0; index < count; index += 1) {
    const offset = 6 + (index * 16);
    width = Math.max(width, byteAt(bytes, offset) || 256);
    height = Math.max(height, byteAt(bytes, offset + 1) || 256);
  }
  return width && height ? {width, height} : null;
}

function jpegDimensions(bytes: Uint8Array): {width: number; height: number} | null {
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (byteAt(bytes, offset) !== 0xff) { offset += 1; continue; }
    const marker = byteAt(bytes, offset + 1);
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    if (offset + 4 >= bytes.length) break;
    const length = (byteAt(bytes, offset + 2) << 8) | byteAt(bytes, offset + 3);
    if (length < 2) break;
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4,0xc8,0xcc].includes(marker);
    if (isSof && offset + 8 < bytes.length) {
      return {
        height: (byteAt(bytes, offset + 5) << 8) | byteAt(bytes, offset + 6),
        width: (byteAt(bytes, offset + 7) << 8) | byteAt(bytes, offset + 8),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): {width: number; height: number} | null {
  if (bytes.length < 30) return null;
  const chunk = String.fromCharCode(byteAt(bytes, 12), byteAt(bytes, 13), byteAt(bytes, 14), byteAt(bytes, 15));
  if (chunk === "VP8X") {
    return {width: 1 + readU24LE(bytes, 24), height: 1 + readU24LE(bytes, 27)};
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const b1 = byteAt(bytes, 21), b2 = byteAt(bytes, 22), b3 = byteAt(bytes, 23), b4 = byteAt(bytes, 24);
    return {width: 1 + (((b2 & 0x3f) << 8) | b1), height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6))};
  }
  if (chunk === "VP8 " && bytes.length >= 30 && byteAt(bytes, 23) === 0x9d && byteAt(bytes, 24) === 0x01 && byteAt(bytes, 25) === 0x2a) {
    return {width: ((byteAt(bytes, 27) << 8) | byteAt(bytes, 26)) & 0x3fff, height: ((byteAt(bytes, 29) << 8) | byteAt(bytes, 28)) & 0x3fff};
  }
  return null;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return matchesAt(bytes, 0, signature);
}

function matchesAt(bytes: Uint8Array, offset: number, signature: readonly number[]) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function readU32BE(bytes: Uint8Array, offset: number) {
  return ((byteAt(bytes, offset) * 0x1000000) + (byteAt(bytes, offset + 1) << 16) + (byteAt(bytes, offset + 2) << 8) + byteAt(bytes, offset + 3)) >>> 0;
}

function readU24LE(bytes: Uint8Array, offset: number) {
  return byteAt(bytes, offset) | (byteAt(bytes, offset + 1) << 8) | (byteAt(bytes, offset + 2) << 16);
}

function byteAt(bytes: Uint8Array, offset: number): number {
  return bytes[offset] ?? 0;
}
