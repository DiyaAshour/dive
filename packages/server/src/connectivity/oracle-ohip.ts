import {createHash} from "node:crypto";
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

type CachedToken={accessToken:string;expiresAt:number;expiresInSeconds:number|null};
const tokenCache=new Map<string,CachedToken>();
const TOKEN_RENEWAL_SKEW_MS=60_000;

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
  const cacheKey=oracleTokenCacheKey(config);
  const cached=tokenCache.get(cacheKey);
  if(cached&&Date.now()<cached.expiresAt-TOKEN_RENEWAL_SKEW_MS)return{accessToken:cached.accessToken,expiresInSeconds:Math.max(0,Math.floor((cached.expiresAt-Date.now())/1000))};
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
  const expiresInSeconds=Number.isFinite(parsed.expires_in)?Number(parsed.expires_in):null;
  const expiresAt=jwtExpiryMs(parsed.access_token)??(expiresInSeconds?Date.now()+expiresInSeconds*1000:Date.now()+5*60_000);
  tokenCache.set(cacheKey,{accessToken:parsed.access_token,expiresAt,expiresInSeconds});
  return {accessToken: parsed.access_token, expiresInSeconds};
}

export async function oracleOhipRequest<T>(config: OracleOhipConnectionConfig, path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/")) throw new ApplicationError("INVALID_OHIP_PATH", "Oracle OHIP API path must start with /", 500);
  const first=await getOracleOhipAccessToken(config);
  let response=await executeOracleRequest(config,path,init,first.accessToken);
  if(response.status===401){
    tokenCache.delete(oracleTokenCacheKey(config));
    const renewed=await getOracleOhipAccessToken(config);
    response=await executeOracleRequest(config,path,init,renewed.accessToken);
  }
  const text = await response.text();
  if (!response.ok) throw new ApplicationError("OHIP_API_FAILED", `Oracle OHIP API request failed (${response.status}) at ${path}: ${text.slice(0, 180)}`, 502);
  if (!text) return {} as T;
  try { return JSON.parse(text) as T; } catch { throw new ApplicationError("OHIP_API_INVALID_RESPONSE", "Oracle OHIP returned invalid JSON", 502); }
}

async function executeOracleRequest(config:OracleOhipConnectionConfig,path:string,init:RequestInit,accessToken:string){
  const gateway=normalizeOracleGatewayUrl(config.gatewayUrl);
  return fetch(`${gateway}${path}`,{
    ...init,
    headers:{
      "accept":"application/json",
      "authorization":`Bearer ${accessToken}`,
      "x-app-key":config.credentials.appKey,
      "x-hotelid":config.hotelCode,
      ...(init.headers??{}),
    },
    cache:"no-store",
  });
}

function oracleTokenCacheKey(config:OracleOhipConnectionConfig):string{
  return createHash("sha256").update([normalizeOracleGatewayUrl(config.gatewayUrl),config.enterpriseId,config.hotelCode,config.credentials.clientId,config.credentials.scope,config.credentials.clientSecret].join("\u0000"),"utf8").digest("hex");
}

function jwtExpiryMs(token:string):number|null{
  const parts=token.split(".");
  if(parts.length<2)return null;
  try{
    const parsed=JSON.parse(Buffer.from(parts[1]!,"base64url").toString("utf8")) as {exp?:unknown};
    return typeof parsed.exp==="number"&&Number.isFinite(parsed.exp)?parsed.exp*1000:null;
  }catch{return null;}
}
