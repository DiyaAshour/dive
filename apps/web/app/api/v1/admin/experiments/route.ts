import type {NextRequest} from "next/server";
import {createPlatformExperiment, listPlatformExperiments} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    return ok(await listPlatformExperiments(user.id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const raw = await request.json().catch(() => null);
    const parsed = parseExperimentPayload(raw);
    if (!parsed.ok) return Response.json({data:null,error:{code:"INVALID_EXPERIMENT",message:parsed.message}},{status:400});
    return ok(await createPlatformExperiment(user.id, parsed.value), {status: 201});
  } catch (error) {
    return handleApiError(error);
  }
}

function parseExperimentPayload(raw: unknown): {ok:true;value:Parameters<typeof createPlatformExperiment>[1]} | {ok:false;message:string} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {ok:false,message:"An experiment payload is required"};
  const value = raw as Record<string, unknown>;
  const variantsRaw = value.variants;
  if (typeof value.key !== "string" || typeof value.name !== "string" || typeof value.primaryMetric !== "string") return {ok:false,message:"key, name and primaryMetric are required"};
  if (!Array.isArray(variantsRaw) || variantsRaw.length < 2) return {ok:false,message:"At least two variants are required"};
  const variants = [] as Array<{key:string;name:string;weight:number;configuration?:Record<string, unknown>|null}>;
  for (const rawVariant of variantsRaw) {
    if (!rawVariant || typeof rawVariant !== "object" || Array.isArray(rawVariant)) return {ok:false,message:"Each variant must be an object"};
    const variant = rawVariant as Record<string, unknown>;
    if (typeof variant.key !== "string" || typeof variant.name !== "string" || !Number.isInteger(variant.weight) || Number(variant.weight) <= 0) return {ok:false,message:"Each variant requires key, name and a positive integer weight"};
    if (variant.configuration !== undefined && variant.configuration !== null && (typeof variant.configuration !== "object" || Array.isArray(variant.configuration))) return {ok:false,message:"Variant configuration must be an object"};
    variants.push({key:variant.key,name:variant.name,weight:Number(variant.weight),configuration:(variant.configuration as Record<string, unknown> | null | undefined)});
  }
  const allocationBasis = value.allocationBasis;
  if (allocationBasis !== undefined && allocationBasis !== "USER" && allocationBasis !== "SESSION" && allocationBasis !== "DEVICE") return {ok:false,message:"allocationBasis must be USER, SESSION or DEVICE"};
  const trafficPercent = value.trafficPercent;
  if (trafficPercent !== undefined && (!Number.isInteger(trafficPercent) || Number(trafficPercent) < 0 || Number(trafficPercent) > 10000)) return {ok:false,message:"trafficPercent must be an integer between 0 and 10000"};
  const eligibility = objectOrNull(value.eligibility);
  if (value.eligibility !== undefined && eligibility === undefined) return {ok:false,message:"eligibility must be an object or null"};
  const guardrailMetrics = value.guardrailMetrics;
  if (guardrailMetrics !== undefined && guardrailMetrics !== null && !Array.isArray(guardrailMetrics)) return {ok:false,message:"guardrailMetrics must be an array or null"};
  const startsAt = parseOptionalDate(value.startsAt);
  const endsAt = parseOptionalDate(value.endsAt);
  if (value.startsAt !== undefined && value.startsAt !== null && startsAt === undefined) return {ok:false,message:"startsAt must be an ISO date"};
  if (value.endsAt !== undefined && value.endsAt !== null && endsAt === undefined) return {ok:false,message:"endsAt must be an ISO date"};
  return {ok:true,value:{
    key:value.key,
    name:value.name,
    description:typeof value.description === "string" ? value.description : null,
    allocationBasis:allocationBasis as "USER"|"SESSION"|"DEVICE"|undefined,
    trafficPercent:trafficPercent === undefined ? undefined : Number(trafficPercent),
    eligibility:eligibility ?? null,
    primaryMetric:value.primaryMetric,
    guardrailMetrics:Array.isArray(guardrailMetrics) ? guardrailMetrics : null,
    startsAt:startsAt ?? null,
    endsAt:endsAt ?? null,
    variants,
  }};
}

function objectOrNull(value: unknown): Record<string, unknown> | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
