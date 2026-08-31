import type {NextRequest} from "next/server";
import {recordExperimentMetricForContext} from "@platform/server";
import {handleApiError,ok} from "@/lib/api";
import {applyExperimentSubjectCookies,experimentRequestContext} from "@/lib/experiment-subject";

export async function POST(request:NextRequest,{params}:{params:Promise<{key:string}>}){
  try{
    const {key}=await params;
    const raw=await request.json().catch(()=>null);
    if(!raw||typeof raw!=="object"||Array.isArray(raw))return bad("Metric payload must be an object");
    const body=raw as Record<string,unknown>;
    const metric=typeof body.metric==="string"?body.metric.trim():"";
    if(!metric||metric.length>100)return bad("metric is required and must be at most 100 characters");
    const value=body.value===undefined?1:Number(body.value);
    if(!Number.isFinite(value)||Math.abs(value)>1_000_000_000)return bad("value must be a finite number within the accepted range");
    if(body.metricEventId!==undefined&&(typeof body.metricEventId!=="string"||body.metricEventId.length>160))return bad("metricEventId must be a string up to 160 characters");
    if(body.properties!==undefined&&body.properties!==null&&(typeof body.properties!=="object"||Array.isArray(body.properties)))return bad("properties must be an object");
    const subject=await experimentRequestContext(request);
    const result=await recordExperimentMetricForContext({
      metricEventId:typeof body.metricEventId==="string"?body.metricEventId:undefined,
      experimentKey:decodeURIComponent(key),
      context:subject.context,
      metric,
      value,
      properties:(body.properties??null) as Record<string,never>|null,
    });
    const response=ok(result);
    applyExperimentSubjectCookies(response,subject.cookies);
    response.headers.set("Cache-Control","private, no-store");
    return response;
  }catch(error){return handleApiError(error);}
}

function bad(message:string){return Response.json({data:null,error:{code:"INVALID_EXPERIMENT_METRIC",message}},{status:400});}
