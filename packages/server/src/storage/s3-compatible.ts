import { createHash, createHmac } from "node:crypto";
import type { ObjectStorageProvider, StorageUploadGrant, StorageUploadRequest, StoredObjectMetadata } from "./provider";

type S3CompatibleOptions = Readonly<{
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  pathStyle: boolean;
  publicBaseUrl: string | null;
}>;

const EMPTY_PAYLOAD_HASH = sha256("");
const MAX_PREFIX_READ_BYTES = 128 * 1024;

export class S3CompatibleStorage implements ObjectStorageProvider {
  readonly name = "s3-compatible";
  private readonly endpoint: URL;

  constructor(private readonly options: S3CompatibleOptions) {
    this.endpoint = new URL(options.endpoint);
    if (this.endpoint.protocol !== "https:" && this.endpoint.hostname !== "localhost" && this.endpoint.hostname !== "127.0.0.1") {
      throw new Error("S3 endpoint must use HTTPS outside local development");
    }
  }

  async createUploadGrant(input: StorageUploadRequest): Promise<StorageUploadGrant> {
    const expiresInSeconds = clampExpiry(input.expiresInSeconds);
    const now = new Date();
    const url = presignUrl({
      method: "PUT",
      url: this.objectUrl(input.objectKey),
      region: this.options.region,
      accessKeyId: this.options.accessKeyId,
      secretAccessKey: this.options.secretAccessKey,
      expiresInSeconds,
      now,
      signedHeaders: {"content-type": input.contentType},
    });
    return {
      method: "PUT",
      url: url.toString(),
      headers: {"content-type": input.contentType},
      expiresAt: new Date(now.getTime() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async headObject(objectKey: string): Promise<StoredObjectMetadata | null> {
    const url = this.objectUrl(objectKey);
    const headers = authorizationHeaders("HEAD", url, this.options);
    const response = await fetch(url, {method: "HEAD", headers, cache: "no-store"});
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Object storage HEAD failed with status ${response.status}`);
    const contentLength = Number(response.headers.get("content-length"));
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) throw new Error("Object storage returned an invalid content length");
    return {
      sizeBytes: contentLength,
      contentType: normalizeContentType(response.headers.get("content-type")),
      etag: response.headers.get("etag"),
    };
  }

  async readPrefix(objectKey: string, maxBytes: number): Promise<Uint8Array> {
    const byteCount = Math.max(1, Math.min(Math.trunc(maxBytes), MAX_PREFIX_READ_BYTES));
    const url = this.objectUrl(objectKey);
    const range = `bytes=0-${byteCount - 1}`;
    const headers = authorizationHeaders("GET", url, this.options, {range});
    const response = await fetch(url, {method: "GET", headers, cache: "no-store"});
    if (!response.ok) throw new Error(`Object storage prefix read failed with status ${response.status}`);
    const body = new Uint8Array(await response.arrayBuffer());
    return body.length <= byteCount ? body : body.slice(0, byteCount);
  }

  async createPrivateDownloadUrl(objectKey: string, fileName: string, expiresInSeconds: number): Promise<string> {
    const url = this.objectUrl(objectKey);
    url.searchParams.set("response-content-disposition", `attachment; filename="${safeDownloadName(fileName)}"`);
    return presignUrl({
      method: "GET",
      url,
      region: this.options.region,
      accessKeyId: this.options.accessKeyId,
      secretAccessKey: this.options.secretAccessKey,
      expiresInSeconds: clampExpiry(expiresInSeconds),
      now: new Date(),
      signedHeaders: {},
    }).toString();
  }

  publicUrl(objectKey: string): string | null {
    if (!this.options.publicBaseUrl) return null;
    const base = new URL(ensureTrailingSlash(this.options.publicBaseUrl));
    const encoded = objectKey.split("/").map(awsEncode).join("/");
    return new URL(encoded, base).toString();
  }

  async deleteObject(objectKey: string): Promise<void> {
    const url = this.objectUrl(objectKey);
    const headers = authorizationHeaders("DELETE", url, this.options);
    const response = await fetch(url, {method: "DELETE", headers, cache: "no-store"});
    if (!response.ok && response.status !== 404) throw new Error(`Object storage DELETE failed with status ${response.status}`);
  }

  private objectUrl(objectKey: string): URL {
    const url = new URL(this.endpoint.toString());
    url.search = "";
    url.hash = "";
    const prefix = url.pathname.replace(/\/+$/, "");
    const encodedKey = objectKey.split("/").map(awsEncode).join("/");
    if (this.options.pathStyle) {
      url.pathname = `${prefix}/${awsEncode(this.options.bucket)}/${encodedKey}`;
    } else {
      url.hostname = `${this.options.bucket}.${url.hostname}`;
      url.pathname = `${prefix}/${encodedKey}`;
    }
    return url;
  }
}

type PresignInput = Readonly<{
  method: "GET" | "PUT";
  url: URL;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresInSeconds: number;
  now: Date;
  signedHeaders: Readonly<Record<string, string>>;
}>;

function presignUrl(input: PresignInput): URL {
  const url = new URL(input.url.toString());
  const amzDate = formatAmzDate(input.now);
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${input.region}/s3/aws4_request`;
  const headers = normalizedHeaders(url, input.signedHeaders);
  const signedHeaderNames = Object.keys(headers).sort();
  url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  url.searchParams.set("X-Amz-Credential", `${input.accessKeyId}/${scope}`);
  url.searchParams.set("X-Amz-Date", amzDate);
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  url.searchParams.set("X-Amz-SignedHeaders", signedHeaderNames.join(";"));

  const canonicalRequest = [
    input.method,
    canonicalPath(url.pathname),
    canonicalQuery(url),
    canonicalHeaders(headers, signedHeaderNames),
    signedHeaderNames.join(";"),
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signature = hmacHex(signingKey(input.secretAccessKey, dateStamp, input.region), stringToSign);
  url.searchParams.set("X-Amz-Signature", signature);
  return url;
}

function authorizationHeaders(
  method: "GET" | "HEAD" | "DELETE",
  url: URL,
  options: S3CompatibleOptions,
  extraHeaders: Readonly<Record<string, string>> = {},
): Record<string, string> {
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${options.region}/s3/aws4_request`;
  const requestHeaders: Record<string, string> = {
    ...extraHeaders,
    "x-amz-content-sha256": EMPTY_PAYLOAD_HASH,
    "x-amz-date": amzDate,
  };
  const canonical = normalizedHeaders(url, requestHeaders);
  const signedHeaderNames = Object.keys(canonical).sort();
  const canonicalRequest = [
    method,
    canonicalPath(url.pathname),
    canonicalQuery(url),
    canonicalHeaders(canonical, signedHeaderNames),
    signedHeaderNames.join(";"),
    EMPTY_PAYLOAD_HASH,
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signature = hmacHex(signingKey(options.secretAccessKey, dateStamp, options.region), stringToSign);
  return {
    ...requestHeaders,
    authorization: `AWS4-HMAC-SHA256 Credential=${options.accessKeyId}/${scope}, SignedHeaders=${signedHeaderNames.join(";")}, Signature=${signature}`,
  };
}

function normalizedHeaders(url: URL, supplied: Readonly<Record<string, string>>): Record<string, string> {
  const result: Record<string, string> = {host: url.host};
  for (const [name, value] of Object.entries(supplied)) result[name.toLowerCase()] = value.trim().replace(/\s+/g, " ");
  return result;
}

function canonicalHeaders(headers: Readonly<Record<string, string>>, names: readonly string[]): string {
  return `${names.map((name) => `${name}:${headers[name] ?? ""}`).join("\n")}\n`;
}

function canonicalQuery(url: URL): string {
  return [...url.searchParams.entries()]
    .map(([key, value]) => [awsEncode(key), awsEncode(value)] as const)
    .sort(([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function canonicalPath(pathname: string): string {
  return pathname.split("/").map((segment) => awsEncode(safeDecode(segment))).join("/") || "/";
}

function signingKey(secret: string, dateStamp: string, region: string): Buffer {
  const dateKey = hmac(Buffer.from(`AWS4${secret}`, "utf8"), dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

function hmac(key: Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function hmacHex(key: Buffer, data: string): string {
  return createHmac("sha256", key).update(data, "utf8").digest("hex");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function normalizeContentType(value: string | null): string | null {
  return value?.split(";", 1)[0]?.trim().toLowerCase() || null;
}

function clampExpiry(seconds: number): number {
  if (!Number.isInteger(seconds) || seconds < 60 || seconds > 3600) throw new Error("Signed URL expiry must be between 60 and 3600 seconds");
  return seconds;
}

function safeDownloadName(value: string): string {
  return value.replace(/["\\\r\n]/g, "_").slice(0, 180) || "document";
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
