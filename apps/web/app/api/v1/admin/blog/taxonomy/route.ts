import type {NextRequest} from "next/server";
import {z} from "zod";
import {getAdminBlogTaxonomy, saveAdminBlogTaxonomy} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

const localeSchema=z.enum(["AR","EN"]);
const nodeSchema=z.object({
  id:z.string().trim().min(1).max(100),
  name:z.string().trim().min(2).max(40),
  slug:z.string().trim().max(80).default(""),
  parentId:z.string().trim().max(100).nullable(),
  sortOrder:z.number().int().min(0).max(500),
});
const bodySchema=z.object({locale:localeSchema,nodes:z.array(nodeSchema).max(120)});

export async function GET(request:NextRequest){
  try{
    const user=await requestAdminUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed=localeSchema.safeParse(request.nextUrl.searchParams.get("locale")??"AR");
    if(!parsed.success)return validationError(parsed.error);
    return ok(await getAdminBlogTaxonomy(user.id,parsed.data));
  }catch(error){return handleApiError(error);}
}

export async function PUT(request:NextRequest){
  try{
    const user=await requestAdminUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return validationError(parsed.error);
    return ok(await saveAdminBlogTaxonomy(user.id,parsed.data.locale,parsed.data.nodes));
  }catch(error){return handleApiError(error);}
}
