import { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminCarCatalogOverview, importCarCatalogVehicles } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

const providerSchema = z.enum(["MANUAL", "HANDMEKEY", "IMAGIN", "EVOX", "OEM"]);
const assetTypeSchema = z.enum([
  "HERO",
  "EXTERIOR_FRONT",
  "EXTERIOR_FRONT_LEFT",
  "EXTERIOR_FRONT_RIGHT",
  "EXTERIOR_SIDE_LEFT",
  "EXTERIOR_SIDE_RIGHT",
  "EXTERIOR_REAR_LEFT",
  "EXTERIOR_REAR_RIGHT",
  "EXTERIOR_REAR",
  "SPIN_FRAME",
  "INTERIOR_DASHBOARD",
  "INTERIOR_FRONT_SEATS",
  "INTERIOR_REAR_SEATS",
  "INTERIOR_PANORAMA",
  "TRUNK",
  "INFOTAINMENT",
  "STEERING_WHEEL",
  "OTHER",
]);

const assetSchema = z.object({
  type: assetTypeSchema,
  url: z.string().trim().url(),
  angle: z.string().trim().max(80).optional(),
  spinFrame: z.number().int().min(0).max(360).optional(),
  paintCode: z.string().trim().max(80).optional(),
  paintName: z.string().trim().max(120).optional(),
  width: z.number().int().positive().max(12000).optional(),
  height: z.number().int().positive().max(12000).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  sourceRef: z.string().trim().max(500).optional(),
});

const vehicleSchema = z.object({
  slug: z.string().trim().min(3).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  year: z.number().int().min(1990).max(new Date().getUTCFullYear() + 2),
  generation: z.string().trim().max(100).optional(),
  trim: z.string().trim().max(120).optional(),
  bodyType: z.string().trim().max(80).optional(),
  category: z.string().trim().min(2).max(80),
  transmission: z.enum(["AUTOMATIC", "MANUAL"]).optional(),
  fuel: z.enum(["PETROL", "DIESEL", "HYBRID", "ELECTRIC"]).optional(),
  seats: z.number().int().min(1).max(20).optional(),
  bags: z.number().int().min(0).max(20).optional(),
  doors: z.number().int().min(2).max(8).optional(),
  provider: providerSchema,
  providerVehicleId: z.string().trim().max(180).optional(),
  providerRevision: z.string().trim().max(180).optional(),
  primaryImageUrl: z.string().trim().url().optional(),
  reviewed: z.boolean().optional(),
  assets: z.array(assetSchema).max(180).optional(),
});

const importSchema = z.object({
  replaceAssets: z.boolean().default(true),
  vehicles: z.array(vehicleSchema).min(1).max(100),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}}, {status:401});
    return ok(await getAdminCarCatalogOverview(user.id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}}, {status:401});
    const parsed = importSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await importCarCatalogVehicles(user.id, parsed.data.vehicles, {replaceAssets: parsed.data.replaceAssets}), {status:201});
  } catch (error) {
    return handleApiError(error);
  }
}
