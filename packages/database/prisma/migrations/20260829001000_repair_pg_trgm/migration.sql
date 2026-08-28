-- Repair Search 2 databases that were originally created with `prisma db push`
-- and later adopted into migration history. `db push` creates the Prisma tables,
-- but it does not execute the raw SQL from the Search 2 migration, so pg_trgm
-- and its GIN indexes can be missing even though the migration is marked applied.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "DestinationAlias_normalized_trgm_idx"
  ON "DestinationAlias" USING GIN ("normalized" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Destination_nameEn_trgm_idx"
  ON "Destination" USING GIN (LOWER("nameEn") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Destination_nameAr_trgm_idx"
  ON "Destination" USING GIN (LOWER(COALESCE("nameAr", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Hotel_name_trgm_idx"
  ON "Hotel" USING GIN (LOWER("name") gin_trgm_ops);
