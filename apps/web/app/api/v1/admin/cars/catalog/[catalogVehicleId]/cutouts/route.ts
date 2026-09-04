import { NextRequest } from "next/server";
import { z } from "zod";
import { createCarCatalogCutoutUpload, listCarCatalogCutoutUploads } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

const inputSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.enum(["image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(12 * 1024 * 1024),
  type: z.enum(["HERO", "EXTERIOR_FRONT", "EXTERIOR_FRONT_LEFT", "EXTERIOR_FRONT_RIGHT", "EXTERIOR_SIDE_LEFT", "EXTERIOR_SIDE_RIGHT", "EXTERIOR_REAR_LEFT", "EXTERIOR_REAR_RIGHT", "EXTERIOR_REAR"]).optional(),
  angle: z.string().trim().max(80).optional(),
  width: z.number().int().min(400).max(8000).optional(),
  height: z.number().int().min(225).max(6000).optional(),
  sourceRef: z.string().trim().max(500).optional(),
});

export async function GET(request: NextRequest, {params}: {params: Promise<{catalogVehicleId:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}}, {status:401});
    const {catalogVehicleId} = await params;
    return ok(await listCarCatalogCutoutUploads(user.id, catalogVehicleId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, {params}: {params: Promise<{catalogVehicleId:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}}, {status:401});
    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const {catalogVehicleId} = await params;
    return ok(await createCarCatalogCutoutUpload(user.id, catalogVehicleId, parsed.data), {status:201});
  } catch (error) {
    return handleApiError(error);
  }
}
