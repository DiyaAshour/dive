import type { CreateMediaUploadInput, HotelPhotoCategory, UpdateHotelPhotoInput } from "@platform/contracts";
import { database } from "@platform/database";
import { notFound } from "../errors";
import { requireHotelPermission } from "../hotels/authorization";
import { recordPublishMutation } from "../hotels/publishing-revision";
import { createMediaUpload, deleteHotelMedia, listHotelMedia, updateHotelPhoto } from "./service";

export async function listHotelMediaWithCategories(actorUserId: string, hotelId: string) {
  const media = await listHotelMedia(actorUserId, hotelId);
  const photoIds = media.flatMap((item) => item.photo ? [item.photo.id] : []);
  const categoryMap = await hotelPhotoCategoryMap(hotelId, photoIds);
  return media.map((item) => item.photo ? {...item, photo: {...item.photo, category: categoryMap.get(item.photo.id) ?? defaultCategory(item.photo.roomTypeId)}} : item);
}

export async function createMediaUploadWithCategory(actorUserId: string, hotelId: string, input: CreateMediaUploadInput) {
  const result = await createMediaUpload(actorUserId, hotelId, input);
  if (input.kind === "HOTEL_IMAGE") {
    const photo = await database().hotelPhoto.findFirst({where: {hotelId, mediaObjectId: result.mediaId}, select: {id: true}});
    if (!photo) notFound("Hotel photo");
    await database().hotelPhotoCategoryAssignment.upsert({
      where: {photoId: photo.id},
      create: {photoId: photo.id, hotelId, category: input.category},
      update: {hotelId, category: input.category},
    });
  }
  return result;
}

export async function updateHotelPhotoWithCategory(actorUserId: string, hotelId: string, mediaId: string, input: UpdateHotelPhotoInput) {
  const {category, ...baseInput} = input;
  const hasBaseUpdate = baseInput.alt !== undefined || baseInput.sortOrder !== undefined || baseInput.roomTypeId !== undefined;
  if (hasBaseUpdate) await updateHotelPhoto(actorUserId, hotelId, mediaId, baseInput);

  if (category !== undefined) {
    await requireHotelPermission(actorUserId, hotelId, "hotel:edit");
    const db = database();
    const photo = await db.hotelPhoto.findFirst({
      where: {hotelId, mediaObjectId: mediaId, mediaObject: {state: "READY"}},
      select: {id: true, roomTypeId: true},
    });
    if (!photo) notFound("Hotel photo");
    const before = await db.hotelPhotoCategoryAssignment.findUnique({where: {photoId: photo.id}, select: {category: true}});
    const previousCategory = (before?.category ?? defaultCategory(photo.roomTypeId)) as HotelPhotoCategory;
    if (previousCategory !== category) {
      await db.$transaction(async (tx) => {
        await tx.hotelPhotoCategoryAssignment.upsert({
          where: {photoId: photo.id},
          create: {photoId: photo.id, hotelId, category},
          update: {hotelId, category},
        });
        await recordPublishMutation(tx, hotelId, actorUserId, "hotel photo category updated");
        await tx.auditLog.create({data: {
          hotelId,
          actorUserId,
          action: "HOTEL_PHOTO_CATEGORY_UPDATED",
          entityType: "HotelPhoto",
          entityId: photo.id,
          before: {category: previousCategory},
          after: {category},
        }});
      });
    }
  }

  const media = await listHotelMediaWithCategories(actorUserId, hotelId);
  const updated = media.find((item) => item.id === mediaId);
  if (!updated) notFound("Media object");
  return updated;
}

export async function deleteHotelMediaWithCategory(actorUserId: string, hotelId: string, mediaId: string) {
  const photo = await database().hotelPhoto.findFirst({where: {hotelId, mediaObjectId: mediaId}, select: {id: true}});
  const result = await deleteHotelMedia(actorUserId, hotelId, mediaId);
  if (photo) await database().hotelPhotoCategoryAssignment.deleteMany({where: {photoId: photo.id, hotelId}});
  return result;
}

export async function hotelPhotoCategoryMap(hotelId: string, photoIds?: readonly string[]) {
  if (photoIds && photoIds.length === 0) return new Map<string, HotelPhotoCategory>();
  const rows = await database().hotelPhotoCategoryAssignment.findMany({
    where: {hotelId, ...(photoIds ? {photoId: {in: [...photoIds]}} : {})},
    select: {photoId: true, category: true},
  });
  return new Map(rows.map((row) => [row.photoId, row.category as HotelPhotoCategory]));
}

function defaultCategory(roomTypeId: string | null): HotelPhotoCategory {
  return roomTypeId ? "ROOM" : "OTHER";
}
