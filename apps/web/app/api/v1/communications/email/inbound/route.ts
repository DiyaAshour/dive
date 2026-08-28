import type {NextRequest} from "next/server";
import {ingestInboundAdminEmail} from "@platform/server";
import {handleApiError,ok} from "@/lib/api";

export async function POST(request:NextRequest){
  try{
    const authorization=request.headers.get("authorization");
    const bearer=authorization?.toLowerCase().startsWith("bearer ")?authorization.slice(7).trim():null;
    const secret=request.headers.get("x-handmekey-email-secret")??bearer;
    const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
    if(!body)return Response.json({data:null,error:{code:"VALIDATION_ERROR",message:"Request body is required"}},{status:400});
    return ok(await ingestInboundAdminEmail(secret,{
      conversationId:typeof body.conversationId==="string"?body.conversationId:null,
      toEmail:typeof body.toEmail==="string"?body.toEmail:"",
      fromEmail:typeof body.fromEmail==="string"?body.fromEmail:"",
      fromName:typeof body.fromName==="string"?body.fromName:null,
      subject:typeof body.subject==="string"?body.subject:null,
      textBody:typeof body.textBody==="string"?body.textBody:"",
      htmlBody:typeof body.htmlBody==="string"?body.htmlBody:null,
      providerMessageId:typeof body.providerMessageId==="string"?body.providerMessageId:null,
      inReplyTo:typeof body.inReplyTo==="string"?body.inReplyTo:null,
    }),{status:202});
  }catch(error){return handleApiError(error);}
}
