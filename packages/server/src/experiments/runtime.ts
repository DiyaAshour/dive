import { database, type Prisma } from "@platform/database";
import { assignExperiment, recordExperimentExposure, recordExperimentMetric } from "./service";

export type ExperimentSubjectContext = Readonly<{
  userId?: string | null;
  sessionId?: string | null;
  deviceId?: string | null;
}>;

export async function assignExperimentForContext(key:string,context:ExperimentSubjectContext){
  const subjectKey=await experimentSubjectKey(key,context);
  if(!subjectKey)return {eligible:false as const,reason:"SUBJECT_UNAVAILABLE" as const};
  return assignExperiment(key,subjectKey);
}

export async function exposeExperimentForContext(input:Readonly<{
  exposureId?:string;
  experimentKey:string;
  context:ExperimentSubjectContext;
  sessionId?:string|null;
  metadata?:Prisma.InputJsonObject|null;
}>){
  const subjectKey=await experimentSubjectKey(input.experimentKey,input.context);
  if(!subjectKey)return {recorded:false as const,exposureId:input.exposureId??"",variantKey:null,reason:"SUBJECT_UNAVAILABLE" as const};
  const result=await recordExperimentExposure({
    exposureId:input.exposureId,
    experimentKey:input.experimentKey,
    subjectKey,
    sessionId:input.sessionId??input.context.sessionId??null,
    context:input.metadata??null,
  });
  return {...result,reason:null};
}

export async function recordExperimentMetricForContext(input:Readonly<{
  metricEventId?:string;
  experimentKey:string;
  context:ExperimentSubjectContext;
  metric:string;
  value?:number;
  properties?:Prisma.InputJsonObject|null;
}>){
  const subjectKey=await experimentSubjectKey(input.experimentKey,input.context);
  if(!subjectKey)return {recorded:false as const,metricEventId:input.metricEventId??"",variantKey:null,reason:"SUBJECT_UNAVAILABLE" as const};
  const result=await recordExperimentMetric({
    metricEventId:input.metricEventId,
    experimentKey:input.experimentKey,
    subjectKey,
    metric:input.metric,
    value:input.value,
    properties:input.properties??null,
  });
  return {...result,reason:null};
}

export async function experimentSubjectKey(key:string,context:ExperimentSubjectContext):Promise<string|null>{
  const experiment=await database().experiment.findUnique({where:{key:normalizeKey(key)},select:{allocationBasis:true}});
  if(!experiment)return null;
  if(experiment.allocationBasis==="SESSION")return context.sessionId?.trim()?`session:${context.sessionId.trim()}`:null;
  if(experiment.allocationBasis==="DEVICE")return context.deviceId?.trim()?`device:${context.deviceId.trim()}`:null;
  if(context.userId?.trim())return `user:${context.userId.trim()}`;
  return context.deviceId?.trim()?`anonymous:${context.deviceId.trim()}`:null;
}

function normalizeKey(value:string):string{
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"");
}
