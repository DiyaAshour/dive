import {isNuiteeWebhookConfigured,parseNuiteeWebhookEnvelope,processNuiteeWebhook,verifyNuiteeWebhookAuthorization} from "@platform/server";

export async function POST(request:Request){
  if(!isNuiteeWebhookConfigured())return Response.json({error:{code:"WEBHOOK_NOT_CONFIGURED",message:"Nuitee webhook authentication is not configured"}},{status:503});
  if(!verifyNuiteeWebhookAuthorization(request.headers.get("authorization")))return Response.json({error:{code:"UNAUTHORIZED",message:"Invalid webhook authorization"}},{status:401});
  let body:unknown;
  try{body=await request.json();}catch{return Response.json({error:{code:"INVALID_JSON",message:"Invalid webhook JSON"}},{status:400});}
  try{
    const envelope=parseNuiteeWebhookEnvelope(body);
    const result=await processNuiteeWebhook(envelope);
    return Response.json({data:{accepted:true,...result}},{status:200,headers:{"cache-control":"no-store"}});
  }catch(error){
    const message=error instanceof Error?error.message:"Webhook processing failed";
    console.error("Nuitee webhook processing failed",{message});
    return Response.json({error:{code:"WEBHOOK_PROCESSING_FAILED",message}},{status:500,headers:{"cache-control":"no-store"}});
  }
}
