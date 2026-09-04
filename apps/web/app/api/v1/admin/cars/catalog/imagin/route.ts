import { NextRequest } from "next/server";
import { z } from "zod";
import { buildImaginCatalogVehicle, getImaginCarListing, imaginConfigured, importCarCatalogVehicles } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

const selectionSchema = z.object({
  make: z.string().trim().min(1).max(80),
  modelFamily: z.string().trim().min(1).max(120),
  modelRange: z.string().trim().max(120).optional(),
  modelVariant: z.string().trim().max(120).optional(),
  modelYear: z.number().int().min(1990).max(new Date().getUTCFullYear() + 2),
  powerTrain: z.string().trim().max(80).optional(),
  transmission: z.string().trim().max(80).optional(),
  bodySize: z.string().trim().max(80).optional(),
  trim: z.string().trim().max(120).optional(),
  paintId: z.string().trim().max(120).optional(),
  paintDescription: z.string().trim().max(160).optional(),
});

const importSchema = z.object({
  slug: z.string().trim().min(3).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  displayModel: z.string().trim().max(120).optional(),
  generation: z.string().trim().max(100).optional(),
  trimName: z.string().trim().max(120).optional(),
  bodyType: z.string().trim().max(80).optional(),
  category: z.string().trim().min(2).max(80),
  transmission: z.enum(["AUTOMATIC", "MANUAL"]).optional(),
  fuel: z.enum(["PETROL", "DIESEL", "HYBRID", "ELECTRIC"]).optional(),
  seats: z.number().int().min(1).max(20).optional(),
  bags: z.number().int().min(0).max(20).optional(),
  doors: z.number().int().min(2).max(8).optional(),
  reviewed: z.boolean().default(false),
  selection: selectionSchema,
});

export async function GET(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}}, {status:401});
    if (!imaginConfigured()) return ok({configured:false, listing:null});

    const url = new URL(request.url);
    const yearValue = Number(url.searchParams.get("modelYear"));
    const filters = {
      ...(value(url, "make") ? {make: value(url, "make")} : {}),
      ...(value(url, "modelFamily") ? {modelFamily: value(url, "modelFamily")} : {}),
      ...(value(url, "modelRange") ? {modelRange: value(url, "modelRange")} : {}),
      ...(value(url, "modelVariant") ? {modelVariant: value(url, "modelVariant")} : {}),
      ...(Number.isInteger(yearValue) && yearValue > 0 ? {modelYear: yearValue} : {}),
      ...(value(url, "powerTrain") ? {powerTrain: value(url, "powerTrain")} : {}),
      ...(value(url, "bodySize") ? {bodySize: value(url, "bodySize")} : {}),
      ...(value(url, "trim") ? {trim: value(url, "trim")} : {}),
    };
    return ok({configured:true, listing: await getImaginCarListing(filters)});
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
    const record = buildImaginCatalogVehicle(parsed.data);
    const result = await importCarCatalogVehicles(user.id, [record], {replaceAssets:true});
    return ok({provider:"IMAGIN", exterior360Frames:32, result}, {status:201});
  } catch (error) {
    return handleApiError(error);
  }
}

function value(url: URL, key: string) {
  return url.searchParams.get(key)?.trim() || undefined;
}
