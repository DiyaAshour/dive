import type {NextRequest} from "next/server";
import {blogPostInputSchema} from "@platform/contracts";
import {updateAdminBlogPost} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function PATCH(request:NextRequest,{params}:{params:Promise<{postId:string}>}){
  try{
    const user=await requestAdminUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed=blogPostInputSchema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return validationError(parsed.error);
    return ok(await updateAdminBlogPost(user.id,(await params).postId,parsed.data));
  }catch(error){return handleApiError(error);}
}
