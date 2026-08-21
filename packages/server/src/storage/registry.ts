import type { ObjectStorageProvider } from "./provider";
import { S3CompatibleStorage } from "./s3-compatible";

let cached: ObjectStorageProvider | null | undefined;

export function objectStorage(): ObjectStorageProvider | null {
  if (cached !== undefined) return cached;
  const provider = (process.env.STORAGE_PROVIDER ?? "none").trim().toLowerCase();
  if (provider === "none") {
    cached = null;
    return cached;
  }
  if (provider !== "s3") throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);

  const endpoint = required("S3_ENDPOINT");
  const region = required("S3_REGION");
  const bucket = required("S3_BUCKET");
  const accessKeyId = required("S3_ACCESS_KEY_ID");
  const secretAccessKey = required("S3_SECRET_ACCESS_KEY");
  const publicBaseUrl = optional("STORAGE_PUBLIC_BASE_URL");
  cached = new S3CompatibleStorage({
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    pathStyle: parseBoolean(process.env.S3_PATH_STYLE, true),
    publicBaseUrl,
  });
  return cached;
}

export function resetObjectStorageForTests(): void {
  cached = undefined;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when STORAGE_PROVIDER=s3`);
  return value;
}

function optional(name: string): string | null {
  return process.env[name]?.trim() || null;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("S3_PATH_STYLE must be true or false");
}
