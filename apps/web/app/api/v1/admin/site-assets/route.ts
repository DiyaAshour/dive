import type {NextRequest} from "next/server";
import {createSiteAssetUpload, siteAssetUploadSpecs, SITE_ASSET_KINDS, type SiteAssetKind} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

const SITE_ASSET_KIND_SET = new Set<string>(SITE_ASSET_KINDS);

export async function GET(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    return ok(siteAssetUploadSpecs());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body.kind !== "string" || !SITE_ASSET_KIND_SET.has(body.kind) || typeof body.fileName !== "string" || typeof body.sizeBytes !== "number") {
      return invalid("A valid site asset payload is required");
    }
    let contentType = typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : "";
    if (!contentType && body.fileName.toLowerCase().endsWith(".ico")) contentType = "image/x-icon";
    if (!contentType) return invalid("The image content type is required");

    return ok(await createSiteAssetUpload(user.id, {
      kind: body.kind as SiteAssetKind,
      fileName: body.fileName,
      contentType,
      sizeBytes: body.sizeBytes,
    }));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}

function invalid(message: string) {
  return Response.json({data:null,error:{code:"INVALID_REQUEST",message}},{status:400});
}
