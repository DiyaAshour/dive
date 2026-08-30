import {createCipheriv, createDecipheriv, randomBytes} from "node:crypto";
import {ApplicationError} from "../errors";

const VERSION = "v1";

function encryptionKey(): Buffer {
  const raw = process.env.CONNECTIVITY_ENCRYPTION_KEY?.trim();
  if (!raw) throw new ApplicationError("CONNECTIVITY_ENCRYPTION_NOT_CONFIGURED", "CONNECTIVITY_ENCRYPTION_KEY is required for external hotel connections", 503);
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new ApplicationError("CONNECTIVITY_ENCRYPTION_KEY_INVALID", "CONNECTIVITY_ENCRYPTION_KEY must be a base64-encoded 32-byte key", 503);
  return key;
}

export function encryptConnectivitySecret(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptConnectivitySecret<T>(value: string): T {
  const [version, ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (version !== VERSION || !ivRaw || !tagRaw || !encryptedRaw) throw new ApplicationError("CONNECTIVITY_SECRET_INVALID", "Stored connectivity credentials are invalid", 500);
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    throw new ApplicationError("CONNECTIVITY_SECRET_DECRYPT_FAILED", "Could not decrypt connectivity credentials", 500);
  }
}
