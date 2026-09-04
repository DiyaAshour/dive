import { NextRequest } from "next/server";
import { z } from "zod";
import { importCarCatalogVehicles } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

const schema = z.object({
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
  cutoutUrl: z.string().trim().url(),
  width: z.number().int().min(800).max(6000).default(1600),
  height: z.number().int().min(450).max(4000).default(900),
  angle: z.enum(["front-left-3q", "front-right-3q"]).default("front-left-3q"),
  sourceRef: z.string().trim().min(1).max(500).default("HandMeKey standardized cutout"),
  reviewed: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}}, {status:401});
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const record = {
      slug: v.slug,
      make: v.make,
      model: v.model,
      year: v.year,
      category: v.category,
      provider: "HANDMEKEY" as const,
      primaryImageUrl: v.cutoutUrl,
      reviewed: v.reviewed,
      ...(v.generation ? {generation:v.generation} : {}),
      ...(v.trim ? {trim:v.trim} : {}),
      ...(v.bodyType ? {bodyType:v.bodyType} : {}),
      ...(v.transmission ? {transmission:v.transmission} : {}),
      ...(v.fuel ? {fuel:v.fuel} : {}),
      ...(v.seats !== undefined ? {seats:v.seats} : {}),
      ...(v.bags !== undefined ? {bags:v.bags} : {}),
      ...(v.doors !== undefined ? {doors:v.doors} : {}),
      assets: [{
        type: v.angle === "front-right-3q" ? "EXTERIOR_FRONT_RIGHT" as const : "EXTERIOR_FRONT_LEFT" as const,
        url: v.cutoutUrl,
        angle: v.angle,
        width: v.width,
        height: v.height,
        sortOrder: 0,
        sourceRef: v.sourceRef,
      }],
    };
    const result = await importCarCatalogVehicles(user.id, [record], {replaceAssets:true});
    return ok({standard:{background:"transparent",framing:"vehicle centered",preferredCanvas:"1600x900",preferredFormat:"WebP or PNG"}, result}, {status:201});
  } catch (error) {
    return handleApiError(error);
  }
}
