import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";

const BASELINE = "20260828000000_baseline";
const here = dirname(fileURLToPath(import.meta.url));
const databaseDir = resolve(here, "..");
const repoDir = resolve(databaseDir, "../..");
const prismaCli = resolve(repoDir, "node_modules/prisma/build/index.js");

dotenv.config({path: resolve(repoDir, ".env")});
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = new pg.Client({connectionString});
await client.connect();
try {
  const migrationTable = await client.query(`SELECT to_regclass('public."_prisma_migrations"') AS name`);
  const hasMigrationTable = Boolean(migrationTable.rows[0]?.name);
  const hotelTable = await client.query(`SELECT to_regclass('public."Hotel"') AS name`);
  const hasApplicationSchema = Boolean(hotelTable.rows[0]?.name);

  if (!hasMigrationTable && hasApplicationSchema) {
    const requiredTables = [
      "Hotel",
      "Booking",
      "PaymentAttempt",
      "EmailOutbox",
      "BookingInvoice",
      "WalletAccount",
      "AdminEmailConversation",
    ];
    const tableRows = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])`,
      [requiredTables],
    );
    const present = new Set(tableRows.rows.map((row) => row.table_name));
    const missing = requiredTables.filter((table) => !present.has(table));
    if (missing.length) {
      throw new Error(`Refusing to baseline an unknown database shape. Missing tables: ${missing.join(", ")}`);
    }

    console.log(`Existing HandMeKey database detected. Marking ${BASELINE} as already applied without changing application rows.`);
    runPrisma(["migrate", "resolve", "--applied", BASELINE, "--config", "prisma.config.ts"]);
  } else if (!hasMigrationTable) {
    console.log("Empty database detected. The baseline will be applied normally.");
  } else {
    console.log("Prisma migration history already exists; no baseline adoption is required.");
  }
} finally {
  await client.end();
}

runPrisma(["migrate", "deploy", "--config", "prisma.config.ts"]);
console.log("HandMeKey database migrations are deployed.");

function runPrisma(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: databaseDir,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
