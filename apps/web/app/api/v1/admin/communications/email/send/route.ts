import type {NextRequest} from "next/server";
import {sendAdminConversationEmail} from "@platform/server";
import {handleApiError,ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function POST(request:NextRequest){
  try{
    const user=await requestAdminUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
    if(!body)return Response.json({data:null,error:{code:"VALIDATION_ERROR",message:"Request body is required"}},{status:400});
    return ok(await sendAdminConversationEmail(user.id,{
      conversationId:typeof body.conversationId==="string"?body.conversationId:null,
      toEmail:typeof body.toEmail==="string"?body.toEmail:null,
      toName:typeof body.toName==="string"?body.toName:null,
      subject:typeof body.subject==="string"?body.subject:null,
      textBody:typeof body.textBody==="string"?body.textBody:"",
    }),{status:201});
  }catch(error){return handleApiError(error);}
}
