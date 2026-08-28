import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";
import dotenv from "dotenv";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const databaseDir = resolve(here, "..");
const repoDir = resolve(databaseDir, "../..");

dotenv.config({path: resolve(repoDir, ".env")});
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("[db:search-setup] DATABASE_URL is not set; skipping PostgreSQL search extension setup.");
  process.exit(0);
}

const client = new pg.Client({connectionString});
let connected = false;

try {
  await client.connect();
  connected = true;

  const tables = await client.query(`
    SELECT
      to_regclass('public."Destination"') AS destination,
      to_regclass('public."DestinationAlias"') AS destination_alias,
      to_regclass('public."Hotel"') AS hotel
  `);
  const row = tables.rows[0] ?? {};

  if (!row.destination || !row.destination_alias || !row.hotel) {
    console.warn("[db:search-setup] Search tables are not present yet; run npm run db:push or npm run db:deploy first.");
    process.exitCode = 0;
  } else {
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await client.query(`CREATE INDEX IF NOT EXISTS "DestinationAlias_normalized_trgm_idx" ON "DestinationAlias" USING GIN ("normalized" gin_trgm_ops)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Destination_nameEn_trgm_idx" ON "Destination" USING GIN (LOWER("nameEn") gin_trgm_ops)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Destination_nameAr_trgm_idx" ON "Destination" USING GIN (LOWER(COALESCE("nameAr", '')) gin_trgm_ops)`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Hotel_name_trgm_idx" ON "Hotel" USING GIN (LOWER("name") gin_trgm_ops)`);
    console.log("[db:search-setup] pg_trgm and destination search indexes are ready.");
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[db:search-setup] Could not prepare pg_trgm search support: ${message}`);
  console.warn("[db:search-setup] The app may run without fuzzy destination search until the extension is enabled.");
  process.exitCode = 0;
} finally {
  if (connected) await client.end();
}
