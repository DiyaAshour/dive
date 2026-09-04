import type {NextRequest} from "next/server";
import {getPublicBlogAsset} from "@platform/server";
import {handleApiError} from "@/lib/api";

export const runtime="nodejs";

export async function GET(_request:NextRequest,{params}:{params:Promise<{assetId:string}>}){
  try{
    const {assetId}=await params;
    const asset=await getPublicBlogAsset(assetId);
    const body=new Uint8Array(asset.bytes).buffer;
    return new Response(body,{
      status:200,
      headers:{
        "content-type":asset.contentType,
        "content-length":String(asset.sizeBytes),
        "cache-control":"public, max-age=31536000, immutable",
        "x-content-type-options":"nosniff",
        "etag":`\"${assetId}\"`,
      },
    });
  }catch(error){return handleApiError(error);}
}
