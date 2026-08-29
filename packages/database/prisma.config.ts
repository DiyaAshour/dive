import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({path: new URL("../../.env", import.meta.url)});

// Vercel's Neon Marketplace integration may expose the database connection
// under one of several standard variable names. Prefer DATABASE_URL, but keep
// Prisma generation and migration deployment compatible with the generated
// Neon variables as well.
const databaseUrl = process.env.DATABASE_URL
  ?? process.env.POSTGRES_PRISMA_URL
  ?? process.env.POSTGRES_URL
  ?? process.env.DATABASE_URL_UNPOOLED
  ?? process.env.POSTGRES_URL_NON_POOLING
  ?? "postgresql://invalid:invalid@127.0.0.1:5432/invalid";

export default defineConfig({
  schema: "prisma",
  migrations: {path: "prisma/migrations"},
  datasource: {url: databaseUrl},
});
