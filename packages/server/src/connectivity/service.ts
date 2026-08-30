import {randomUUID} from "node:crypto";
import {database} from "@platform/database";
import {ApplicationError} from "../errors";
import {requireHotelPermission} from "../hotels/authorization";
import {decryptConnectivitySecret, encryptConnectivitySecret} from "./secrets";
import {getOracleOhipAccessToken, normalizeOracleGatewayUrl, type OracleOhipConnectionConfig, type OracleOhipCredentials} from "./oracle-ohip";

type ConnectionRow = Readonly<{
  id: string;
  hotelId: string;
  provider: string;
  status: string;
  environment: string;
  gatewayUrl: string | null;
  enterpriseId: string | null;
  externalHotelCode: string | null;
  encryptedCredentials: string | null;
  capabilities: unknown;
  roomMappings: unknown;
  ratePlanMappings: unknown;
  lastHealthCheckAt: Date | null;
  lastHealthyAt: Date | null;
  lastSyncAt: Date | null;
  lastError: string | null;
  connectedAt: Date | null;
  disconnectedAt: Date | null;
  updatedAt: Date;
}>;

export type OracleConnectionInput = Readonly<{
  environment: "UAT" | "PRODUCTION";
  gatewayUrl: string;
  enterpriseId: string;
  hotelCode: string;
  clientId: string;
  clientSecret: string;
  appKey: string;
  scope: string;
}>;

export async function getHotelConnectivityWorkspace(userId: string, hotelId: string) {
  await requireHotelPermission(userId, hotelId, "hotel:view");
  const [connection, hotel] = await Promise.all([
    readConnection(hotelId),
    database().hotel.findUnique({
      where: {id: hotelId},
      select: {
        id: true,
        name: true,
        roomTypes: {orderBy: {name: "asc"}, select: {id: true, name: true, code: true, active: true, ratePlans: {orderBy: {name: "asc"}, select: {id: true, name: true, code: true, active: true}}}},
      },
    }),
  ]);
  if (!hotel) throw new ApplicationError("HOTEL_NOT_FOUND", "Hotel not found", 404);
  return {
    connection: connection ? publicConnection(connection) : null,
    rooms: hotel.roomTypes,
    providers: [
      {id: "ORACLE_OHIP", name: "Oracle OPERA Cloud / OHIP", mode: "ENTERPRISE", available: true},
      {id: "SITEMINDER", name: "SiteMinder", mode: "SELF_SERVICE", available: false},
      {id: "CLOUDBEDS", name: "Cloudbeds", mode: "SELF_SERVICE", available: false},
      {id: "MEWS", name: "Mews", mode: "SELF_SERVICE", available: false},
      {id: "HANDMEKEY_NATIVE", name: "HandMeKey Managed", mode: "NATIVE", available: true},
    ],
  };
}

export async function saveOracleOhipConnection(userId: string, hotelId: string, raw: OracleConnectionInput) {
  await requireHotelPermission(userId, hotelId, "hotel:edit");
  const input = validateOracleInput(raw);
  const credentials: OracleOhipCredentials = {clientId: input.clientId, clientSecret: input.clientSecret, appKey: input.appKey, scope: input.scope};
  const encrypted = encryptConnectivitySecret(credentials);
  const id = randomUUID();
  const capabilities = JSON.stringify({auth: true, reservations: true, availability: true, rates: true, businessEvents: true, contentDiscovery: "depends-on-ohip-subscription"});
  await database().$executeRawUnsafe(
    `INSERT INTO "HotelConnectivityConnection" ("id","hotelId","provider","status","environment","gatewayUrl","enterpriseId","externalHotelCode","encryptedCredentials","capabilities","createdByUserId","updatedByUserId","createdAt","updatedAt")
     VALUES ($1,$2,'ORACLE_OHIP','CONFIGURED',$3,$4,$5,$6,$7,$8::jsonb,$9,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
     ON CONFLICT ("hotelId") DO UPDATE SET
       "provider"='ORACLE_OHIP', "status"='CONFIGURED', "environment"=EXCLUDED."environment", "gatewayUrl"=EXCLUDED."gatewayUrl",
       "enterpriseId"=EXCLUDED."enterpriseId", "externalHotelCode"=EXCLUDED."externalHotelCode", "encryptedCredentials"=EXCLUDED."encryptedCredentials",
       "capabilities"=EXCLUDED."capabilities", "lastError"=NULL, "disconnectedAt"=NULL, "updatedByUserId"=$9, "updatedAt"=CURRENT_TIMESTAMP`,
    id, hotelId, input.environment, input.gatewayUrl, input.enterpriseId, input.hotelCode, encrypted, capabilities, userId,
  );
  await audit(userId, hotelId, "HOTEL_CONNECTIVITY_CONFIGURED", {provider: "ORACLE_OHIP", environment: input.environment, gatewayUrl: input.gatewayUrl, enterpriseId: input.enterpriseId, hotelCode: input.hotelCode});
  const connection = await readConnection(hotelId);
  if (!connection) throw new ApplicationError("CONNECTIVITY_SAVE_FAILED", "Could not save hotel connection", 500);
  return publicConnection(connection);
}

export async function testHotelConnectivity(userId: string, hotelId: string) {
  await requireHotelPermission(userId, hotelId, "hotel:edit");
  const connection = await requireConnection(hotelId);
  if (connection.provider !== "ORACLE_OHIP") throw new ApplicationError("CONNECTIVITY_PROVIDER_UNSUPPORTED", "Connection testing is not available for this provider yet", 400);
  const config = oracleConfig(connection);
  try {
    const token = await getOracleOhipAccessToken(config);
    await database().$executeRawUnsafe(
      `UPDATE "HotelConnectivityConnection" SET "status"='CONNECTED', "lastHealthCheckAt"=CURRENT_TIMESTAMP, "lastHealthyAt"=CURRENT_TIMESTAMP,
       "lastError"=NULL, "connectedAt"=COALESCE("connectedAt", CURRENT_TIMESTAMP), "disconnectedAt"=NULL, "updatedByUserId"=$2, "updatedAt"=CURRENT_TIMESTAMP WHERE "hotelId"=$1`,
      hotelId, userId,
    );
    await audit(userId, hotelId, "HOTEL_CONNECTIVITY_TEST_SUCCEEDED", {provider: connection.provider, tokenExpiresInSeconds: token.expiresInSeconds});
    return {ok: true, provider: connection.provider, tokenExpiresInSeconds: token.expiresInSeconds};
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Connection test failed";
    await database().$executeRawUnsafe(
      `UPDATE "HotelConnectivityConnection" SET "status"='DEGRADED', "lastHealthCheckAt"=CURRENT_TIMESTAMP, "lastError"=$2, "updatedByUserId"=$3, "updatedAt"=CURRENT_TIMESTAMP WHERE "hotelId"=$1`,
      hotelId, message, userId,
    );
    await audit(userId, hotelId, "HOTEL_CONNECTIVITY_TEST_FAILED", {provider: connection.provider, error: message});
    throw error;
  }
}

export async function updateHotelConnectivityMappings(userId: string, hotelId: string, input: {roomMappings: Array<{localId: string; externalCode: string}>; ratePlanMappings: Array<{localId: string; externalCode: string}>}) {
  await requireHotelPermission(userId, hotelId, "hotel:edit");
  await requireConnection(hotelId);
  const roomIds = new Set((await database().roomType.findMany({where: {hotelId}, select: {id: true}})).map((row) => row.id));
  const planIds = new Set((await database().ratePlan.findMany({where: {roomType: {hotelId}}, select: {id: true}})).map((row) => row.id));
  const roomMappings = validateMappings(input.roomMappings, roomIds, "room");
  const ratePlanMappings = validateMappings(input.ratePlanMappings, planIds, "rate plan");
  await database().$executeRawUnsafe(
    `UPDATE "HotelConnectivityConnection" SET "roomMappings"=$2::jsonb, "ratePlanMappings"=$3::jsonb, "updatedByUserId"=$4, "updatedAt"=CURRENT_TIMESTAMP WHERE "hotelId"=$1`,
    hotelId, JSON.stringify(roomMappings), JSON.stringify(ratePlanMappings), userId,
  );
  await audit(userId, hotelId, "HOTEL_CONNECTIVITY_MAPPING_UPDATED", {rooms: roomMappings.length, ratePlans: ratePlanMappings.length});
  const connection = await requireConnection(hotelId);
  return publicConnection(connection);
}

export async function disconnectHotelConnectivity(userId: string, hotelId: string) {
  await requireHotelPermission(userId, hotelId, "hotel:edit");
  const connection = await requireConnection(hotelId);
  await database().$executeRawUnsafe(
    `UPDATE "HotelConnectivityConnection" SET "status"='DISCONNECTED', "disconnectedAt"=CURRENT_TIMESTAMP, "lastError"=NULL, "updatedByUserId"=$2, "updatedAt"=CURRENT_TIMESTAMP WHERE "hotelId"=$1`,
    hotelId, userId,
  );
  await audit(userId, hotelId, "HOTEL_CONNECTIVITY_DISCONNECTED", {provider: connection.provider});
  return {ok: true};
}

async function readConnection(hotelId: string): Promise<ConnectionRow | null> {
  const rows = await database().$queryRawUnsafe<ConnectionRow[]>(`SELECT * FROM "HotelConnectivityConnection" WHERE "hotelId"=$1 LIMIT 1`, hotelId);
  return rows[0] ?? null;
}

async function requireConnection(hotelId: string) {
  const connection = await readConnection(hotelId);
  if (!connection) throw new ApplicationError("HOTEL_CONNECTIVITY_NOT_CONFIGURED", "No external property system is connected", 404);
  return connection;
}

function publicConnection(row: ConnectionRow) {
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    environment: row.environment,
    gatewayUrl: row.gatewayUrl,
    enterpriseId: row.enterpriseId,
    externalHotelCode: row.externalHotelCode,
    capabilities: row.capabilities,
    roomMappings: Array.isArray(row.roomMappings) ? row.roomMappings : [],
    ratePlanMappings: Array.isArray(row.ratePlanMappings) ? row.ratePlanMappings : [],
    lastHealthCheckAt: row.lastHealthCheckAt?.toISOString() ?? null,
    lastHealthyAt: row.lastHealthyAt?.toISOString() ?? null,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastError: row.lastError,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    disconnectedAt: row.disconnectedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    credentialsConfigured: Boolean(row.encryptedCredentials),
  };
}

function oracleConfig(row: ConnectionRow): OracleOhipConnectionConfig {
  if (!row.gatewayUrl || !row.enterpriseId || !row.externalHotelCode || !row.encryptedCredentials) throw new ApplicationError("OHIP_CONFIG_INCOMPLETE", "Oracle OHIP connection is incomplete", 400);
  return {gatewayUrl: row.gatewayUrl, enterpriseId: row.enterpriseId, hotelCode: row.externalHotelCode, credentials: decryptConnectivitySecret<OracleOhipCredentials>(row.encryptedCredentials)};
}

function validateOracleInput(input: OracleConnectionInput): OracleConnectionInput {
  const environment = input.environment === "UAT" ? "UAT" : "PRODUCTION";
  const clean = (value: string, label: string, max = 300) => {
    const result = value?.trim();
    if (!result || result.length > max) throw new ApplicationError("INVALID_OHIP_CONFIG", `${label} is required`, 400);
    return result;
  };
  return {
    environment,
    gatewayUrl: normalizeOracleGatewayUrl(input.gatewayUrl),
    enterpriseId: clean(input.enterpriseId, "Enterprise ID", 120),
    hotelCode: clean(input.hotelCode, "Hotel code", 80),
    clientId: clean(input.clientId, "Client ID", 200),
    clientSecret: clean(input.clientSecret, "Client secret", 500),
    appKey: clean(input.appKey, "Application key", 200),
    scope: clean(input.scope, "OAuth scope", 500),
  };
}

function validateMappings(rows: Array<{localId: string; externalCode: string}>, allowedIds: ReadonlySet<string>, label: string) {
  if (!Array.isArray(rows) || rows.length > 500) throw new ApplicationError("INVALID_CONNECTIVITY_MAPPING", `Invalid ${label} mappings`, 400);
  const seen = new Set<string>();
  return rows.map((row) => {
    const localId = row.localId?.trim();
    const externalCode = row.externalCode?.trim();
    if (!allowedIds.has(localId) || !externalCode || externalCode.length > 120 || seen.has(localId)) throw new ApplicationError("INVALID_CONNECTIVITY_MAPPING", `Invalid ${label} mapping`, 400);
    seen.add(localId);
    return {localId, externalCode};
  });
}

async function audit(actorUserId: string, hotelId: string, action: string, after: unknown) {
  await database().auditLog.create({data: {actorUserId, hotelId, action, entityType: "HotelConnectivity", entityId: hotelId, after: after as never}});
}
