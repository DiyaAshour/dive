import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({path: new URL("../../.env", import.meta.url)});

// `prisma generate` does not need a live database connection, but Prisma
// still evaluates this config during Vercel builds. Keep generation working
// when DATABASE_URL has not been injected yet; runtime/database commands still
// require the real DATABASE_URL from the environment.
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://invalid:invalid@127.0.0.1:5432/invalid";

export default defineConfig({
  schema: "prisma",
  migrations: {path: "prisma/migrations"},
  datasource: {url: databaseUrl},
});
