import { database } from "@platform/database";
import { objectStorage } from "../storage/registry";

export async function expirePendingMediaUploads(limit = 200): Promise<number> {
  const batchSize = Math.max(1, Math.min(Math.trunc(limit), 500));
  const expired = await database().mediaObject.findMany({
    where: {state: "PENDING_UPLOAD", uploadExpiresAt: {lt: new Date()}},
    select: {id: true, hotelId: true, objectKey: true, photo: {select: {id: true}}, document: {select: {id: true}}},
    orderBy: {uploadExpiresAt: "asc"},
    take: batchSize,
  });
  if (expired.length === 0) return 0;

  const storage = objectStorage();
  let completed = 0;
  for (const media of expired) {
    try {
      if (storage) await storage.deleteObject(media.objectKey);
      await database().$transaction(async (tx) => {
        const claimed = await tx.mediaObject.updateMany({where: {id: media.id, state: "PENDING_UPLOAD", uploadExpiresAt: {lt: new Date()}}, data: {state: "DELETED", deletedAt: new Date()}});
        if (claimed.count !== 1) return;
        if (media.photo) await tx.hotelPhoto.deleteMany({where: {id: media.photo.id}});
        if (media.document) await tx.hotelDocument.deleteMany({where: {id: media.document.id}});
        await tx.auditLog.create({data: {hotelId: media.hotelId, actorUserId: null, action: "MEDIA_UPLOAD_EXPIRED", entityType: "MediaObject", entityId: media.id}});
        completed += 1;
      });
    } catch (error) {
      console.error(JSON.stringify({event:"media_upload_cleanup_failed", mediaId:media.id, message:error instanceof Error ? error.message : "unknown error", at:new Date().toISOString()}));
    }
  }
  return completed;
}
