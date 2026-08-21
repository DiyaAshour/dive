import { randomUUID } from "node:crypto";
import type { CreateMediaUploadInput, DocumentDecisionInput, UpdateHotelPhotoInput } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError, badRequest, notFound } from "../errors";
import { requirePlatformAdmin } from "../admin/authorization";
import { requireHotelPermission } from "../hotels/authorization";
import { recordPublishMutation } from "../hotels/publishing-revision";
import { objectStorage } from "../storage/registry";

const UPLOAD_EXPIRY_SECONDS = 10 * 60;
const DOCUMENT_DOWNLOAD_EXPIRY_SECONDS = 5 * 60;
const SIGNATURE_READ_BYTES = 16;

export async function createMediaUpload(actorUserId: string, hotelId: string, input: CreateMediaUploadInput) {
  await requireHotelPermission(actorUserId, hotelId, input.kind === "HOTEL_IMAGE" ? "hotel:edit" : "publishing:manage");
  const storage = requireStorage();
  const extension = extensionFor(input.contentType);
  const objectKey = `hotels/${hotelId}/${input.kind === "HOTEL_IMAGE" ? "images" : "verification-documents"}/${randomUUID()}.${extension}`;
  const publicUrl = input.kind === "HOTEL_IMAGE" ? storage.publicUrl(objectKey) : null;
  if (input.kind === "HOTEL_IMAGE" && !publicUrl) {
    throw new ApplicationError("PUBLIC_MEDIA_URL_NOT_CONFIGURED", "STORAGE_PUBLIC_BASE_URL is required before hotel images can be uploaded", 503);
  }
  const uploadExpiresAt = new Date(Date.now() + UPLOAD_EXPIRY_SECONDS * 1000);
  const db = database();
  const media = await db.$transaction(async (tx) => {
    const created = await tx.mediaObject.create({
      data: {
        hotelId,
        uploadedByUserId: actorUserId,
        kind: input.kind,
        visibility: input.kind === "HOTEL_IMAGE" ? "PUBLIC" : "PRIVATE",
        objectKey,
        originalFileName: sanitizeFileName(input.fileName),
        contentType: input.contentType,
        expectedSizeBytes: input.sizeBytes,
        documentType: input.kind === "VERIFICATION_DOCUMENT" ? input.documentType : null,
        publicUrl,
        uploadExpiresAt,
      },
    });
    if (input.kind === "HOTEL_IMAGE") {
      await tx.hotelPhoto.create({data: {hotelId, mediaObjectId: created.id, alt: input.alt, sortOrder: input.sortOrder}});
    } else {
      await tx.hotelDocument.create({data: {hotelId, mediaObjectId: created.id, type: input.documentType}});
    }
    await tx.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: "MEDIA_UPLOAD_INITIATED",
        entityType: "MediaObject",
        entityId: created.id,
        after: {kind: input.kind, contentType: input.contentType, sizeBytes: input.sizeBytes, documentType: input.kind === "VERIFICATION_DOCUMENT" ? input.documentType : null},
      },
    });
    return created;
  });
  const upload = await storage.createUploadGrant({objectKey, contentType: input.contentType, expiresInSeconds: UPLOAD_EXPIRY_SECONDS});
  return {mediaId: media.id, kind: media.kind, upload};
}

export async function completeMediaUpload(actorUserId: string, hotelId: string, mediaId: string) {
  const db = database();
  const media = await db.mediaObject.findFirst({where: {id: mediaId, hotelId}, include: {document: true, photo: true}});
  if (!media) notFound("Media object");
  await requireHotelPermission(actorUserId, hotelId, media.kind === "HOTEL_IMAGE" ? "hotel:edit" : "publishing:manage");
  if (media.state === "READY") return mediaView(media);
  if (media.state === "DELETED") badRequest("MEDIA_DELETED", "Deleted media cannot be completed");
  if (media.uploadExpiresAt.getTime() < Date.now()) badRequest("UPLOAD_EXPIRED", "The upload grant expired; create a new upload");

  const storage = requireStorage();
  const stored = await storage.headObject(media.objectKey);
  if (!stored) badRequest("UPLOAD_NOT_FOUND", "The object was not found in storage");
  if (stored.sizeBytes !== media.expectedSizeBytes) badRequest("UPLOAD_SIZE_MISMATCH", "Uploaded file size does not match the declared file size");
  if (stored.contentType !== media.contentType.toLowerCase()) badRequest("UPLOAD_TYPE_MISMATCH", "Uploaded content type does not match the declared content type");
  const prefix = await storage.readPrefix(media.objectKey, SIGNATURE_READ_BYTES);
  if (!matchesFileSignature(media.contentType, prefix)) {
    await storage.deleteObject(media.objectKey);
    badRequest("UPLOAD_SIGNATURE_MISMATCH", "Uploaded file bytes do not match the declared file type");
  }

  await db.$transaction(async (tx) => {
    const updated = await tx.mediaObject.updateMany({where: {id: media.id, state: "PENDING_UPLOAD"}, data: {state: "READY", uploadedAt: new Date()}});
    if (updated.count !== 1) return;
    if (media.kind === "HOTEL_IMAGE") await recordPublishMutation(tx, hotelId, actorUserId, "hotel image uploaded");
    await tx.auditLog.create({
      data: {hotelId, actorUserId, action: "MEDIA_UPLOAD_COMPLETED", entityType: "MediaObject", entityId: media.id, after: {kind: media.kind, sizeBytes: stored.sizeBytes, contentType: stored.contentType, signatureVerified: true}},
    });
  });
  return getMediaForHotel(actorUserId, hotelId, mediaId);
}

export async function listHotelMedia(actorUserId: string, hotelId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  const media = await database().mediaObject.findMany({
    where: {hotelId, state: {not: "DELETED"}},
    include: {photo: true, document: true},
    orderBy: {createdAt: "desc"},
    take: 200,
  });
  return media.map(mediaView);
}

export async function updateHotelPhoto(actorUserId: string, hotelId: string, mediaId: string, input: UpdateHotelPhotoInput) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:edit");
  const db = database();
  const photo = await db.hotelPhoto.findFirst({where: {hotelId, mediaObjectId: mediaId, mediaObject: {state: "READY"}}, include: {mediaObject: true}});
  if (!photo) notFound("Hotel photo");
  await db.$transaction(async (tx) => {
    await tx.hotelPhoto.update({where: {id: photo.id}, data: {...(input.alt !== undefined ? {alt: input.alt} : {}), ...(input.sortOrder !== undefined ? {sortOrder: input.sortOrder} : {})}});
    await recordPublishMutation(tx, hotelId, actorUserId, "hotel photo metadata updated");
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "HOTEL_PHOTO_UPDATED", entityType: "HotelPhoto", entityId: photo.id, before: {alt: photo.alt, sortOrder: photo.sortOrder}, after: {alt: input.alt ?? photo.alt, sortOrder: input.sortOrder ?? photo.sortOrder}}});
  });
  return getMediaForHotel(actorUserId, hotelId, mediaId);
}

export async function deleteHotelMedia(actorUserId: string, hotelId: string, mediaId: string) {
  const db = database();
  const media = await db.mediaObject.findFirst({where: {id: mediaId, hotelId}, include: {photo: true, document: true}});
  if (!media) notFound("Media object");
  await requireHotelPermission(actorUserId, hotelId, media.kind === "HOTEL_IMAGE" ? "hotel:edit" : "publishing:manage");
  if (media.state === "DELETED") return {mediaId, deleted: true, reused: true};
  if (media.kind === "VERIFICATION_DOCUMENT" && media.state === "READY") {
    throw new ApplicationError("DOCUMENT_RETENTION_REQUIRED", "Uploaded verification documents are retained for audit; upload a replacement instead of deleting this document", 409);
  }

  await requireStorage().deleteObject(media.objectKey);
  await db.$transaction(async (tx) => {
    if (media.photo) await tx.hotelPhoto.delete({where: {id: media.photo.id}});
    if (media.document) await tx.hotelDocument.delete({where: {id: media.document.id}});
    await tx.mediaObject.update({where: {id: media.id}, data: {state: "DELETED", deletedAt: new Date()}});
    if (media.kind === "HOTEL_IMAGE" && media.state === "READY") await recordPublishMutation(tx, hotelId, actorUserId, "hotel image deleted");
    await tx.auditLog.create({data: {hotelId, actorUserId, action: "MEDIA_DELETED", entityType: "MediaObject", entityId: media.id, after: {kind: media.kind}}});
  });
  return {mediaId, deleted: true, reused: false};
}

export async function listPendingHotelDocuments(actorUserId: string) {
  await requirePlatformAdmin(actorUserId);
  const documents = await database().hotelDocument.findMany({
    where: {status: "PENDING", mediaObject: {state: "READY"}},
    include: {
      mediaObject: {select: {id: true, originalFileName: true, contentType: true, expectedSizeBytes: true, uploadedAt: true}},
      hotel: {select: {id: true, name: true, city: true, countryCode: true}},
    },
    orderBy: {submittedAt: "asc"},
    take: 200,
  });
  return documents;
}

export async function reviewHotelDocument(actorUserId: string, documentId: string, input: DocumentDecisionInput) {
  await requirePlatformAdmin(actorUserId);
  const db = database();
  const document = await db.hotelDocument.findUnique({where: {id: documentId}, include: {mediaObject: {select: {state: true}}}});
  if (!document) notFound("Hotel document");
  if (document.mediaObject.state !== "READY") badRequest("DOCUMENT_NOT_UPLOADED", "The document upload is not complete");
  if (document.status !== "PENDING") badRequest("DOCUMENT_ALREADY_REVIEWED", "This document has already been reviewed");

  return db.$transaction(async (tx) => {
    const result = await tx.hotelDocument.updateMany({
      where: {id: document.id, status: "PENDING"},
      data: input.decision === "APPROVE"
        ? {status: "APPROVED", reviewedByUserId: actorUserId, reviewedAt: new Date(), rejectionReason: null}
        : {status: "REJECTED", reviewedByUserId: actorUserId, reviewedAt: new Date(), rejectionReason: input.reason},
    });
    if (result.count !== 1) badRequest("DOCUMENT_ALREADY_REVIEWED", "This document has already been reviewed");
    await recordPublishMutation(tx, document.hotelId, actorUserId, `verification document ${input.decision.toLowerCase()}`);
    await tx.auditLog.create({
      data: {
        hotelId: document.hotelId,
        actorUserId,
        action: input.decision === "APPROVE" ? "HOTEL_DOCUMENT_APPROVED" : "HOTEL_DOCUMENT_REJECTED",
        entityType: "HotelDocument",
        entityId: document.id,
        after: input.decision === "APPROVE" ? {status: "APPROVED", type: document.type} : {status: "REJECTED", type: document.type, reason: input.reason},
      },
    });
    return {documentId: document.id, hotelId: document.hotelId, status: input.decision === "APPROVE" ? "APPROVED" as const : "REJECTED" as const};
  });
}

export async function createHotelDocumentDownload(actorUserId: string, documentId: string) {
  await requirePlatformAdmin(actorUserId);
  const document = await database().hotelDocument.findUnique({
    where: {id: documentId},
    include: {mediaObject: {select: {state: true, visibility: true, objectKey: true, originalFileName: true}}},
  });
  if (!document) notFound("Hotel document");
  if (document.mediaObject.state !== "READY" || document.mediaObject.visibility !== "PRIVATE") badRequest("DOCUMENT_NOT_AVAILABLE", "This document is not available for download");
  return requireStorage().createPrivateDownloadUrl(document.mediaObject.objectKey, document.mediaObject.originalFileName, DOCUMENT_DOWNLOAD_EXPIRY_SECONDS);
}

async function getMediaForHotel(actorUserId: string, hotelId: string, mediaId: string) {
  await requireHotelPermission(actorUserId, hotelId, "hotel:view");
  const media = await database().mediaObject.findFirst({where: {id: mediaId, hotelId}, include: {photo: true, document: true}});
  if (!media) notFound("Media object");
  return mediaView(media);
}

function mediaView(media: {
  id: string;
  kind: string;
  state: string;
  visibility: string;
  originalFileName: string;
  contentType: string;
  expectedSizeBytes: number;
  publicUrl: string | null;
  uploadExpiresAt: Date;
  uploadedAt: Date | null;
  createdAt: Date;
  photo: {id: string; alt: string | null; sortOrder: number} | null;
  document: {id: string; type: string; status: string; rejectionReason: string | null; submittedAt: Date; reviewedAt: Date | null} | null;
}) {
  return {
    id: media.id,
    kind: media.kind,
    state: media.state,
    visibility: media.visibility,
    originalFileName: media.originalFileName,
    contentType: media.contentType,
    sizeBytes: media.expectedSizeBytes,
    publicUrl: media.visibility === "PUBLIC" ? media.publicUrl : null,
    uploadExpiresAt: media.uploadExpiresAt,
    uploadedAt: media.uploadedAt,
    createdAt: media.createdAt,
    photo: media.photo,
    document: media.document,
  };
}

function requireStorage() {
  const storage = objectStorage();
  if (!storage) throw new ApplicationError("STORAGE_NOT_CONFIGURED", "Object storage is not configured", 503);
  return storage;
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "application/pdf": return "pdf";
    default: throw new ApplicationError("UNSUPPORTED_MEDIA_TYPE", "Unsupported media type", 415);
  }
}

function matchesFileSignature(contentType: string, bytes: Uint8Array): boolean {
  switch (contentType.toLowerCase()) {
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && matchesAt(bytes, 8, [0x57, 0x45, 0x42, 0x50]);
    case "application/pdf":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    default:
      return false;
  }
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return matchesAt(bytes, 0, signature);
}

function matchesAt(bytes: Uint8Array, offset: number, signature: readonly number[]): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 180) || "file";
}
