import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalDatabase = globalThis as unknown as {databaseClient?: PrismaClient};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const adapter = new PrismaPg({connectionString});
  return new PrismaClient({adapter});
}

export function database(): PrismaClient {
  if (!globalDatabase.databaseClient) globalDatabase.databaseClient = createClient();
  return globalDatabase.databaseClient;
}
