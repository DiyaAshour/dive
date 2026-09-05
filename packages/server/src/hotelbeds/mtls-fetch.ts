import {createPrivateKey, createPublicKey, X509Certificate} from "node:crypto";
import {request} from "node:https";
import {brotliDecompressSync, gunzipSync, inflateSync} from "node:zlib";

const HOTELBEDS_MTLS_HOSTS = new Map<string, string>([
  ["api.hotelbeds.com", "api-mtls.hotelbeds.com"],
  ["api.test.hotelbeds.com", "api-mtls.test.hotelbeds.com"],
  ["api-mtls.hotelbeds.com", "api-mtls.hotelbeds.com"],
  ["api-mtls.test.hotelbeds.com", "api-mtls.test.hotelbeds.com"],
]);
const originalFetch = globalThis.fetch.bind(globalThis);
let installed = false;

export function installHotelbedsMtlsFetch(): void {
  if (installed) return;
  installed = true;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    if (!usesHotelbedsMtls(url)) return originalFetch(input, init);
    return hotelbedsMtlsFetch(url, input, init);
  }) as typeof fetch;
}

function requestUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input;
  if (typeof input === "string") return new URL(input);
  return new URL(input.url);
}

function usesHotelbedsMtls(url: URL): boolean {
  return HOTELBEDS_MTLS_HOSTS.has(url.hostname.toLowerCase())
    && url.pathname.startsWith("/hotel-api/")
    && envFlag("HOTELBEDS_MTLS_ENABLED");
}

async function hotelbedsMtlsFetch(url: URL, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const credentials = hotelbedsMtlsCredentials();
  const requestInput = typeof Request !== "undefined" && input instanceof Request ? input : null;
  const method = init?.method ?? requestInput?.method ?? "GET";
  const headers = new Headers(requestInput?.headers);
  if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  const body = await requestBody(requestInput, init?.body);
  if (body && !headers.has("content-length")) headers.set("content-length", String(body.byteLength));

  const targetUrl = new URL(url);
  const mtlsHost = HOTELBEDS_MTLS_HOSTS.get(url.hostname.toLowerCase());
  if (!mtlsHost) throw new Error("Unsupported Hotelbeds mTLS host");
  targetUrl.hostname = mtlsHost;

  return new Promise<Response>((resolve, reject) => {
    const req = request(targetUrl, {
      method,
      headers: headersToObject(headers),
      cert: credentials.cert,
      key: credentials.key,
      ...(credentials.passphrase ? {passphrase: credentials.passphrase} : {}),
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      ...(init?.signal ? {signal: init.signal} : requestInput?.signal ? {signal: requestInput.signal} : {}),
    }, (res) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      res.on("data", (chunk: Buffer | Uint8Array | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += buffer.byteLength;
        if (totalBytes > 50 * 1024 * 1024) {
          req.destroy(new Error("Hotelbeds response exceeded 50 MB"));
          return;
        }
        chunks.push(buffer);
      });
      res.once("error", reject);
      res.once("end", () => {
        try {
          const responseHeaders = responseHeadersFrom(res.headers);
          const encoding = responseHeaders.get("content-encoding")?.toLowerCase() ?? "";
          const compressed = Buffer.concat(chunks);
          const decoded = decodeBody(compressed, encoding);
          if (decoded !== compressed) {
            responseHeaders.delete("content-encoding");
            responseHeaders.delete("content-length");
          }
          const responseBody = Uint8Array.from(decoded).buffer;
          resolve(new Response(responseBody, {
            status: res.statusCode ?? 500,
            statusText: res.statusMessage ?? "",
            headers: responseHeaders,
          }));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.once("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function hotelbedsMtlsCredentials(): {cert: string; key: string; passphrase?: string} {
  const cert = normalizePem(process.env.HOTELBEDS_MTLS_CERT);
  const key = normalizePem(process.env.HOTELBEDS_MTLS_KEY);
  const passphrase = process.env.HOTELBEDS_MTLS_KEY_PASSPHRASE?.trim() || undefined;
  if (!cert || !key) throw new Error("HOTELBEDS_MTLS_ENABLED requires HOTELBEDS_MTLS_CERT and HOTELBEDS_MTLS_KEY");

  try {
    const certificate = new X509Certificate(cert);
    const now = Date.now();
    if (now < Date.parse(certificate.validFrom) || now > Date.parse(certificate.validTo)) throw new Error("certificate is not currently valid");
    const privateKey = createPrivateKey({key, format: "pem", ...(passphrase ? {passphrase} : {})});
    const certificatePublicKey = Buffer.from(certificate.publicKey.export({format: "der", type: "spki"}));
    const privatePublicKey = Buffer.from(createPublicKey(privateKey).export({format: "der", type: "spki"}));
    if (!certificatePublicKey.equals(privatePublicKey)) throw new Error("certificate and private key do not match");
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid certificate or private key";
    throw new Error(`Invalid Hotelbeds mTLS credentials: ${message}`);
  }

  return passphrase ? {cert, key, passphrase} : {cert, key};
}

function normalizePem(value: string | undefined): string {
  return value?.replace(/\\n/g, "\n").trim() ?? "";
}

function envFlag(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

async function requestBody(requestInput: Request | null, override: BodyInit | null | undefined): Promise<Buffer | undefined> {
  if (override !== undefined && override !== null) {
    if (typeof override === "string") return Buffer.from(override);
    if (override instanceof URLSearchParams) return Buffer.from(override.toString());
    if (override instanceof Blob) return Buffer.from(await override.arrayBuffer());
    if (override instanceof ArrayBuffer) return Buffer.from(override);
    if (ArrayBuffer.isView(override)) return Buffer.from(override.buffer, override.byteOffset, override.byteLength);
    throw new Error("Hotelbeds mTLS transport received an unsupported request body");
  }
  if (!requestInput || !requestInput.body) return undefined;
  return Buffer.from(await requestInput.clone().arrayBuffer());
}

function headersToObject(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => { output[key] = value; });
  return output;
}

function responseHeadersFrom(source: import("node:http").IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else if (value !== undefined) headers.set(key, value);
  }
  return headers;
}

function decodeBody(body: Buffer, encoding: string): Buffer {
  if (!body.byteLength || !encoding) return body;
  if (encoding.includes("gzip")) return gunzipSync(body);
  if (encoding.includes("deflate")) return inflateSync(body);
  if (encoding.includes("br")) return brotliDecompressSync(body);
  return body;
}

installHotelbedsMtlsFetch();
