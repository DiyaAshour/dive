import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({path: new URL("../../../.env", import.meta.url)});

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
const experimentKey = `platform-10x-${suffix}`;
const outboxKey = `platform-10x-outbox-${suffix}`;
const jobKey = `platform-10x-job-${suffix}`;
const analyticsEventId = `platform-10x-analytics-${suffix}`;
const exposureId = `platform-10x-exposure-${suffix}`;
const metricEventId = `platform-10x-metric-${suffix}`;
const searchEntityId = `platform-10x-search-${suffix}`;
const [{database}, server] = await Promise.all([import("@platform/database"), import("../src/index")]);

try {
  await verifyExperimentPlatform();
  await verifyDurableOutbox();
  await verifyDurableJobs();
  await verifyVersionedAnalytics();
  await verifySearchIndexQueue();
  console.log("[platform-10x-smoke] experiments, outbox, durable jobs, analytics and search indexing passed");
} finally {
  const db = database();
  const experiment = await db.experiment.findUnique({where:{key:experimentKey},select:{id:true}}).catch(() => null);
  if (experiment) await db.experiment.delete({where:{id:experiment.id}});
  await db.platformOutboxEvent.deleteMany({where:{OR:[
    {deduplicationKey:{contains:suffix}},
    {aggregateId:{contains:suffix}},
  ]}});
  await db.platformDurableJob.deleteMany({where:{dedupeKey:{contains:suffix}}});
  await db.analyticsEnvelope.deleteMany({where:{eventId:{contains:suffix}}});
  await db.searchIndexTask.deleteMany({where:{entityId:{contains:suffix}}});
  await db.$disconnect();
}

async function verifyExperimentPlatform() {
  await server.createExperiment({
    key:experimentKey,
    name:"Platform 10x Smoke",
    primaryMetric:"booking_conversion",
    trafficPercent:10000,
    guardrailMetrics:["booking_error_rate","payment_error_rate"],
    variants:[
      {key:"control",name:"Control",weight:50,configuration:{layout:"control"}},
      {key:"variant-b",name:"Variant B",weight:50,configuration:{layout:"variant-b"}},
    ],
  });
  await server.startExperiment(experimentKey);

  const first = await server.assignExperiment(experimentKey,"sticky-subject");
  const second = await server.assignExperiment(experimentKey,"sticky-subject");
  assert.equal(first.eligible,true);
  assert.equal(second.eligible,true);
  if (!first.eligible || !second.eligible) throw new Error("experiment assignment unexpectedly ineligible");
  assert.equal(first.variantKey,second.variantKey,"assignment must be sticky");
  assert.equal(second.reused,true,"second assignment should reuse persisted assignment");

  const counts = new Map<string,number>();
  for (let index=0; index<2000; index+=1) {
    const assignment = await server.assignExperiment(experimentKey,`subject-${index}`);
    assert.equal(assignment.eligible,true);
    if (assignment.eligible) counts.set(assignment.variantKey,(counts.get(assignment.variantKey)??0)+1);
  }
  const control = counts.get("control") ?? 0;
  const variant = counts.get("variant-b") ?? 0;
  assert.ok(control > 800 && control < 1200,`control distribution was unexpectedly skewed: ${control}`);
  assert.ok(variant > 800 && variant < 1200,`variant distribution was unexpectedly skewed: ${variant}`);

  const exposure = await server.recordExperimentExposure({exposureId,experimentKey,subjectKey:"sticky-subject",sessionId:"smoke-session",context:{surface:"home"}});
  const exposureReplay = await server.recordExperimentExposure({exposureId,experimentKey,subjectKey:"sticky-subject",sessionId:"smoke-session",context:{surface:"home"}});
  assert.equal(exposure.recorded,true);
  assert.equal(exposureReplay.recorded,false,"exposure replay must be idempotent");

  const metric = await server.recordExperimentMetric({metricEventId,experimentKey,subjectKey:"sticky-subject",metric:"booking_conversion",value:1,properties:{source:"smoke"}});
  const metricReplay = await server.recordExperimentMetric({metricEventId,experimentKey,subjectKey:"sticky-subject",metric:"booking_conversion",value:1,properties:{source:"smoke"}});
  assert.equal(metric.recorded,true);
  assert.equal(metricReplay.recorded,false,"metric replay must be idempotent");

  const report = await server.experimentReport(experimentKey);
  assert.equal(report.variants.length,2);
  assert.equal(report.sampleRatioMismatch.reason === "OK" || report.sampleRatioMismatch.reason === "INSUFFICIENT_SAMPLE",true);

  await server.setExperimentKillSwitch(experimentKey,true);
  const killed = await server.assignExperiment(experimentKey,"new-after-kill");
  assert.deepEqual(killed,{eligible:false,reason:"KILLED"},"kill switch must stop new assignments immediately");
  await server.setExperimentKillSwitch(experimentKey,false);
}

async function verifyDurableOutbox() {
  const db = database();
  const first = await server.enqueueOutboxEvent(db,{
    topic:"smoke",
    aggregateType:"Smoke",
    aggregateId:`smoke-${suffix}`,
    eventType:"smoke_event",
    deduplicationKey:outboxKey,
    payload:{suffix},
  });
  const replay = await server.enqueueOutboxEvent(db,{
    topic:"smoke",
    aggregateType:"Smoke",
    aggregateId:`smoke-${suffix}`,
    eventType:"smoke_event",
    deduplicationKey:outboxKey,
    payload:{suffix},
  });
  assert.equal(first.id,replay.id);
  assert.equal(replay.reused,true,"outbox dedupe key must collapse retries");
  let deliveries=0;
  await server.processOutboxBatch({smoke:async(event) => {if(event.id===first.id) deliveries+=1;}},{batchSize:100});
  await server.processOutboxBatch({smoke:async(event) => {if(event.id===first.id) deliveries+=1;}},{batchSize:100});
  assert.equal(deliveries,1,"outbox event must publish once after successful delivery");
  const row = await db.platformOutboxEvent.findUniqueOrThrow({where:{id:first.id}});
  assert.equal(row.status,"PUBLISHED");
}

async function verifyDurableJobs() {
  const db = database();
  const first = await server.enqueueDurableJob(db,{queue:"smoke",type:"ONCE",dedupeKey:jobKey,payload:{suffix}});
  const replay = await server.enqueueDurableJob(db,{queue:"smoke",type:"ONCE",dedupeKey:jobKey,payload:{suffix}});
  assert.equal(first.id,replay.id);
  assert.equal(replay.reused,true);
  let executions=0;
  await server.processDurableJobBatch("smoke",{ONCE:async(job)=>{if(job.id===first.id) executions+=1;}},{batchSize:20});
  await server.processDurableJobBatch("smoke",{ONCE:async(job)=>{if(job.id===first.id) executions+=1;}},{batchSize:20});
  assert.equal(executions,1,"completed durable job must not execute again");
  const row = await db.platformDurableJob.findUniqueOrThrow({where:{id:first.id}});
  assert.equal(row.status,"COMPLETED");
}

async function verifyVersionedAnalytics() {
  const db = database();
  const first = await server.recordAnalyticsEvent({eventId:analyticsEventId,name:"platform_10x_smoke",source:"system",properties:{suffix}});
  const replay = await server.recordAnalyticsEvent({eventId:analyticsEventId,name:"platform_10x_smoke",source:"system",properties:{suffix}});
  assert.equal(first.reused,false);
  assert.equal(replay.reused,true,"analytics eventId must be idempotent");
  const envelope = await db.analyticsEnvelope.findUniqueOrThrow({where:{eventId:analyticsEventId}});
  const outbox = await db.platformOutboxEvent.findUniqueOrThrow({where:{deduplicationKey:`analytics:${analyticsEventId}`}});
  assert.equal(envelope.name,"platform_10x_smoke");
  assert.equal(outbox.topic,"analytics","analytics write must create a durable export event");
}

async function verifySearchIndexQueue() {
  const db = database();
  await server.queueHotelSearchIndex(searchEntityId,1,"DELETE");
  const result = await server.processSearchIndexBatch({batchSize:20});
  assert.ok(result.completed >= 1,"search indexing batch should process queued tasks");
  const row = await db.searchIndexTask.findUniqueOrThrow({where:{entityType_entityId_revision:{entityType:"HOTEL",entityId:searchEntityId,revision:1}}});
  assert.equal(row.status,"COMPLETED");
  const normalized = server.normalizeSearchText("  إِربِد ـ الأردن  ");
  assert.equal(normalized,"اربد الاردن","Arabic search normalization must be deterministic");
}
