import type {NextRequest} from "next/server";
import {assignExperimentForContext} from "@platform/server";
import {handleApiError,ok} from "@/lib/api";
import {applyExperimentSubjectCookies,experimentRequestContext} from "@/lib/experiment-subject";

export async function GET(request:NextRequest,{params}:{params:Promise<{key:string}>}){
  try{
    const {key}=await params;
    const subject=await experimentRequestContext(request);
    const result=await assignExperimentForContext(decodeURIComponent(key),subject.context);
    const response=ok(result);
    applyExperimentSubjectCookies(response,subject.cookies);
    response.headers.set("Cache-Control","private, no-store");
    return response;
  }catch(error){return handleApiError(error);}
}
