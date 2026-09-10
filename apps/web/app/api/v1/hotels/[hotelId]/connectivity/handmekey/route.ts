import {getSessionUser, rotateHandMeKeyApiKey, saveHandMeKeyApiConnection, unauthorized, updateHandMeKeyApiWebhook} from "@platform/server";
import {NextRequest} from "next/server";
import {handleApiError, ok} from "@/lib/api";
import {readSessionToken} from "@/lib/session";

export async function PUT(request:NextRequest,{params}:{params:Promise<{hotelId:string}>}){
  try{
    const user=await getSessionUser(readSessionToken(request));
    if(!user)unauthorized();
    const {hotelId}=await params;
    const body=await request.json().catch(()=>({})) as Record<string,unknown>;
    const result=await saveHandMeKeyApiConnection(user.id,hotelId,{environment:body.environment==="UAT"?"UAT":"PRODUCTION",webhookUrl:typeof body.webhookUrl==="string"?body.webhookUrl:null});
    return ok(result);
  }catch(error){return handleApiError(error);}
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{hotelId:string}>}){
  try{
    const user=await getSessionUser(readSessionToken(request));
    if(!user)unauthorized();
    const {hotelId}=await params;
    const body=await request.json().catch(()=>({})) as Record<string,unknown>;
    return ok(await updateHandMeKeyApiWebhook(user.id,hotelId,{webhookUrl:typeof body.webhookUrl==="string"?body.webhookUrl:null}));
  }catch(error){return handleApiError(error);}
}

export async function POST(request:NextRequest,{params}:{params:Promise<{hotelId:string}>}){
  try{
    const user=await getSessionUser(readSessionToken(request));
    if(!user)unauthorized();
    const {hotelId}=await params;
    return ok(await rotateHandMeKeyApiKey(user.id,hotelId));
  }catch(error){return handleApiError(error);}
}
