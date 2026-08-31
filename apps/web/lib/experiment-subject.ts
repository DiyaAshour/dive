import {randomUUID} from "node:crypto";
import type {NextRequest,NextResponse} from "next/server";
import {requestUser} from "./request-auth";

const DEVICE_COOKIE="hmk_exp_device";
const SESSION_COOKIE="hmk_exp_session";

export async function experimentRequestContext(request:NextRequest){
  const user=await requestUser(request);
  const existingDevice=request.cookies.get(DEVICE_COOKIE)?.value?.trim()||null;
  const existingSession=request.cookies.get(SESSION_COOKIE)?.value?.trim()||null;
  const deviceId=existingDevice??randomUUID();
  const sessionId=existingSession??randomUUID();
  return {
    context:{userId:user?.id??null,deviceId,sessionId},
    sessionId,
    cookies:{setDevice:!existingDevice,setSession:!existingSession,deviceId,sessionId},
  };
}

export function applyExperimentSubjectCookies(response:NextResponse,cookies:Readonly<{setDevice:boolean;setSession:boolean;deviceId:string;sessionId:string}>):void{
  const secure=process.env.NODE_ENV==="production";
  if(cookies.setDevice)response.cookies.set(DEVICE_COOKIE,cookies.deviceId,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:365*24*60*60});
  if(cookies.setSession)response.cookies.set(SESSION_COOKIE,cookies.sessionId,{httpOnly:true,secure,sameSite:"lax",path:"/"});
}
