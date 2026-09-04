import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import type {NextRequest} from "next/server";
import {ApplicationError, createAdminBlogAsset, objectStorage} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export const runtime="nodejs";

const MAX_IMAGE_BYTES=8*1024*1024;
const ALLOWED_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

export async function POST(request:NextRequest){
  try{
    const user=await requestAdminUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const form=await request.formData();
    const file=form.get("file");
    if(!(file instanceof File))throw new ApplicationError("BLOG_IMAGE_REQUIRED","Choose an image to upload",400);
    if(!ALLOWED_TYPES.has(file.type))throw new ApplicationError("BLOG_IMAGE_TYPE","Only JPEG, PNG and WebP images are supported",415);
    if(file.size<=0||file.size>MAX_IMAGE_BYTES)throw new ApplicationError("BLOG_IMAGE_SIZE","Blog images must be smaller than 8 MB",400);

    const bytes=new Uint8Array(await file.arrayBuffer());
    if(!matchesImageSignature(file.type,bytes))throw new ApplicationError("BLOG_IMAGE_SIGNATURE","The selected file does not match its image type",400);
    const extension=extensionFor(file.type);
    const objectName=`${randomUUID()}.${extension}`;

    let storage:ReturnType<typeof objectStorage>=null;
    try{
      storage=objectStorage();
    }catch(error){
      console.warn("Blog image object storage is unavailable; using database fallback.",error);
    }

    if(storage){
      const objectKey=`blog/images/${objectName}`;
      const publicUrl=storage.publicUrl(objectKey);
      if(publicUrl){
        try{
          const grant=await storage.createUploadGrant({objectKey,contentType:file.type,expiresInSeconds:10*60});
          const uploadResponse=await fetch(grant.url,{method:"PUT",headers:grant.headers,body:new Blob([bytes],{type:file.type})});
          if(!uploadResponse.ok)throw new Error(`Image storage returned ${uploadResponse.status}`);
          const stored=await storage.headObject(objectKey);
          if(!stored||stored.sizeBytes!==file.size)throw new Error("The uploaded image could not be verified");
          return ok({url:publicUrl,storage:"object",fileName:file.name,sizeBytes:file.size,contentType:file.type});
        }catch(error){
          console.warn("Blog image object upload failed; using database fallback.",error);
        }
      }
    }

    if(process.env.NODE_ENV==="production"){
      const asset=await createAdminBlogAsset(user.id,{contentType:file.type,bytes,originalFileName:file.name});
      const url=new URL(`/api/v1/blog/assets/${asset.id}`,request.nextUrl.origin).toString();
      return ok({url,storage:"database",fileName:file.name,sizeBytes:file.size,contentType:file.type});
    }

    const publicRoot=resolveWebPublicRoot();
    const uploadDir=path.join(publicRoot,"uploads","blog");
    await mkdir(uploadDir,{recursive:true});
    await writeFile(path.join(uploadDir,objectName),bytes);
    const relativeUrl=`/uploads/blog/${objectName}`;
    return ok({url:new URL(relativeUrl,request.nextUrl.origin).toString(),storage:"local-dev",fileName:file.name,sizeBytes:file.size,contentType:file.type});
  }catch(error){return handleApiError(error);}
}

function resolveWebPublicRoot(){
  const cwd=process.cwd();
  if(cwd.replaceAll("\\","/").endsWith("/apps/web"))return path.join(cwd,"public");
  return path.join(cwd,"apps","web","public");
}

function extensionFor(contentType:string){
  if(contentType==="image/jpeg")return "jpg";
  if(contentType==="image/png")return "png";
  return "webp";
}

function matchesImageSignature(contentType:string,bytes:Uint8Array){
  if(contentType==="image/jpeg")return startsWith(bytes,[0xff,0xd8,0xff]);
  if(contentType==="image/png")return startsWith(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  if(contentType==="image/webp")return startsWith(bytes,[0x52,0x49,0x46,0x46])&&matchesAt(bytes,8,[0x57,0x45,0x42,0x50]);
  return false;
}

function startsWith(bytes:Uint8Array,signature:number[]){return matchesAt(bytes,0,signature);}
function matchesAt(bytes:Uint8Array,offset:number,signature:number[]){return signature.every((value,index)=>bytes[offset+index]===value);}
