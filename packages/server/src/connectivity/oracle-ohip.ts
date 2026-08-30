import {ApplicationError} from "../errors";

export type OracleOhipCredentials = Readonly<{
  clientId: string;
  clientSecret: string;
  appKey: string;
  scope: string;
}>;

export type OracleOhipConnectionConfig = Readonly<{
  gatewayUrl: string;
  enterpriseId: string;
  hotelCode: string;
  credentials: OracleOhipCredentials;
}>;

type TokenResponse = Readonly<{
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}>;

export function normalizeOracleGatewayUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new ApplicationError("INVALID_OHIP_GATEWAY", "Enter a valid Oracle OHIP gateway URL", 400); }
  if (url.protocol !== "https:") throw new ApplicationError("INVALID_OHIP_GATEWAY", "Oracle OHIP gateway must use HTTPS", 400);
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

export async function getOracleOhipAccessToken(config: OracleOhipConnectionConfig): Promise<{accessToken: string; expiresInSeconds: number | null}> {
  const gateway = normalizeOracleGatewayUrl(config.gatewayUrl);
  const basic = Buffer.from(`${config.credentials.clientId}:${config.credentials.clientSecret}`, "utf8").toString("base64");
  const body = new URLSearchParams({grant_type: "client_credentials", scope: config.credentials.scope});
  const response = await fetch(`${gateway}/oauth/v1/tokens`, {
    method: "POST",
    headers: {
      "authorization": `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
      "enterpriseId": config.enterpriseId,
      "x-app-key": config.credentials.appKey,
    },
    body,
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) throw new ApplicationError("OHIP_AUTH_FAILED", `Oracle OHIP authentication failed (${response.status}): ${raw.slice(0, 180)}`, 502);
  let parsed: TokenResponse;
  try { parsed = JSON.parse(raw) as TokenResponse; } catch { throw new ApplicationError("OHIP_AUTH_INVALID_RESPONSE", "Oracle OHIP returned an invalid authentication response", 502); }
  if (!parsed.access_token) throw new ApplicationError("OHIP_AUTH_MISSING_TOKEN", "Oracle OHIP did not return an access token", 502);
  return {accessToken: parsed.access_token, expiresInSeconds: Number.isFinite(parsed.expires_in) ? Number(parsed.expires_in) : null};
}

export async function oracleOhipRequest<T>(config: OracleOhipConnectionConfig, path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/")) throw new ApplicationError("INVALID_OHIP_PATH", "Oracle OHIP API path must start with /", 500);
  const {accessToken} = await getOracleOhipAccessToken(config);
  const gateway = normalizeOracleGatewayUrl(config.gatewayUrl);
  const response = await fetch(`${gateway}${path}`, {
    ...init,
    headers: {
      "accept": "application/json",
      "authorization": `Bearer ${accessToken}`,
      "x-app-key": config.credentials.appKey,
      "x-hotelid": config.hotelCode,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new ApplicationError("OHIP_API_FAILED", `Oracle OHIP API request failed (${response.status}) at ${path}: ${text.slice(0, 180)}`, 502);
  if (!text) return {} as T;
  try { return JSON.parse(text) as T; } catch { throw new ApplicationError("OHIP_API_INVALID_RESPONSE", "Oracle OHIP returned invalid JSON", 502); }
}
