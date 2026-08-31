import type {NextRequest} from "next/server";
import {exposeExperimentForContext} from "@platform/server";
import {handleApiError,ok} from "@/lib/api";
import {applyExperimentSubjectCookies,experimentRequestContext} from "@/lib/experiment-subject";

export async function POST(request:NextRequest,{params}:{params:Promise<{key:string}>}){
  try{
    const {key}=await params;
    const raw=await request.json().catch(()=>null);
    if(raw!==null&&(typeof raw!=="object"||Array.isArray(raw)))return bad("Exposure payload must be an object");
    const body=(raw??{}) as Record<string,unknown>;
    if(body.exposureId!==undefined&&(typeof body.exposureId!=="string"||body.exposureId.length>160))return bad("exposureId must be a string up to 160 characters");
    if(body.metadata!==undefined&&body.metadata!==null&&(typeof body.metadata!=="object"||Array.isArray(body.metadata)))return bad("metadata must be an object");
    const subject=await experimentRequestContext(request);
    const result=await exposeExperimentForContext({
      exposureId:typeof body.exposureId==="string"?body.exposureId:undefined,
      experimentKey:decodeURIComponent(key),
      context:subject.context,
      sessionId:subject.sessionId,
      metadata:(body.metadata??null) as Record<string,never>|null,
    });
    const response=ok(result);
    applyExperimentSubjectCookies(response,subject.cookies);
    response.headers.set("Cache-Control","private, no-store");
    return response;
  }catch(error){return handleApiError(error);}
}

function bad(message:string){return Response.json({data:null,error:{code:"INVALID_EXPOSURE",message}},{status:400});}
