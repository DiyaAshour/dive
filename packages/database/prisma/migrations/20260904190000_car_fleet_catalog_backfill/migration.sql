-- Link fleet vehicles that already exist to the shared exact vehicle catalog.
--
-- This deliberately matches only make + model + year. A catalog trim is only
-- considered when the fleet model contains that trim as part of its stored
-- identity; a base model is never guessed to be one of several trims.
WITH candidates AS (
  SELECT
    fleet."id" AS "vehicleId",
    catalog."id" AS "catalogVehicleId",
    catalog."reviewed" AS "reviewed",
    catalog."provider" AS "provider",
    catalog."updatedAt" AS "updatedAt"
  FROM "CarVehicle" AS fleet
  JOIN "CarCatalogVehicle" AS catalog
    ON catalog."active" = true
   AND catalog."year" = fleet."year"
   AND (
     CASE
       WHEN regexp_replace(lower(trim(fleet."make")), '[^a-z0-9]+', '', 'g') IN ('mercedes', 'mercedesbenz') THEN 'mercedesbenz'
       WHEN regexp_replace(lower(trim(fleet."make")), '[^a-z0-9]+', '', 'g') = 'vw' THEN 'volkswagen'
       ELSE regexp_replace(lower(trim(fleet."make")), '[^a-z0-9]+', '', 'g')
     END
   ) = (
     CASE
       WHEN regexp_replace(lower(trim(catalog."make")), '[^a-z0-9]+', '', 'g') IN ('mercedes', 'mercedesbenz') THEN 'mercedesbenz'
       WHEN regexp_replace(lower(trim(catalog."make")), '[^a-z0-9]+', '', 'g') = 'vw' THEN 'volkswagen'
       ELSE regexp_replace(lower(trim(catalog."make")), '[^a-z0-9]+', '', 'g')
     END
   )
   AND regexp_replace(lower(trim(fleet."model")), '[^a-z0-9]+', '', 'g') =
     CASE
       WHEN catalog."trim" IS NULL OR trim(catalog."trim") = '' THEN
         regexp_replace(lower(trim(catalog."model")), '[^a-z0-9]+', '', 'g')
       ELSE
         regexp_replace(lower(concat_ws(' ', catalog."model", catalog."trim")), '[^a-z0-9]+', '', 'g')
     END
), resolved AS (
  SELECT DISTINCT ON ("vehicleId") "vehicleId", "catalogVehicleId"
  FROM candidates
  ORDER BY "vehicleId", "reviewed" DESC, ("provider" = 'IMAGIN') DESC, "updatedAt" DESC, "catalogVehicleId"
)
INSERT INTO "CarVehicleCatalogLink" ("vehicleId", "catalogVehicleId", "matchedBy", "createdAt", "updatedAt")
SELECT "vehicleId", "catalogVehicleId", 'AUTO_BACKFILL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM resolved
ON CONFLICT ("vehicleId") DO UPDATE
SET "catalogVehicleId" = EXCLUDED."catalogVehicleId",
    "matchedBy" = CASE
      WHEN "CarVehicleCatalogLink"."catalogVehicleId" = EXCLUDED."catalogVehicleId" THEN "CarVehicleCatalogLink"."matchedBy"
      ELSE 'AUTO_BACKFILL'
    END,
    "updatedAt" = CURRENT_TIMESTAMP;

-- Prefer the shared catalog image when the fleet row did not have its own
-- photo. Never overwrite a photo supplied by the rental company.
UPDATE "CarVehicle" AS fleet
SET "imageUrl" = catalog."primaryImageUrl",
    "imageAlt" = concat(catalog."make", ' ', catalog."model", ' ', catalog."year")
FROM "CarVehicleCatalogLink" AS link
JOIN "CarCatalogVehicle" AS catalog ON catalog."id" = link."catalogVehicleId"
WHERE link."vehicleId" = fleet."id"
  AND fleet."imageUrl" IS NULL
  AND catalog."primaryImageUrl" IS NOT NULL;
