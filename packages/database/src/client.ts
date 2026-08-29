import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalDatabase = globalThis as unknown as {databaseClient?: PrismaClient};

function resolveConnectionString(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
  ];

  const connectionString = candidates.find((value) => value?.trim())?.trim();
  if (!connectionString) {
    throw new Error(
      "Database connection is not configured. Set DATABASE_URL or a Vercel Neon connection variable.",
    );
  }

  return connectionString;
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({connectionString: resolveConnectionString()});
  return new PrismaClient({adapter});
}

export function database(): PrismaClient {
  if (!globalDatabase.databaseClient) globalDatabase.databaseClient = createClient();
  return globalDatabase.databaseClient;
}
