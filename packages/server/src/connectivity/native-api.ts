import {createHash, createHmac, randomBytes, randomUUID, timingSafeEqual} from "node:crypto";
import {lookup} from "node:dns/promises";
import {isIP} from "node:net";
import {database} from "@platform/database";
import {ApplicationError} from "../errors";
import {requireHotelPermission} from "../hotels/authorization";
import {decryptConnectivitySecret, encryptConnectivitySecret} from "./secrets";

type JsonRecord=Record<string,unknown>;
type Mapping={localId:string;externalCode:string};

type ConnectionRow=Readonly<{
  id:string;
  hotelId:string;
  provider:string;
  status:string;
  environment:string;
  gatewayUrl:string|null;
  enterpriseId:string|null;
  externalHotelCode:string|null;
  encryptedCredentials:string|null;
  capabilities:unknown;
  roomMappings:unknown;
  ratePlanMappings:unknown;
  lastHealthCheckAt:Date|null;
  lastHealthyAt:Date|null;
  lastSyncAt:Date|null;
  lastError:string|null;
  connectedAt:Date|null;
  disconnectedAt:Date|null;
  createdByUserId:string;
  updatedByUserId:string;
  createdAt:Date;
  updatedAt:Date;
}>;

type NativeCredentials=Readonly<{
  version:1;
  apiKeyHash:string;
  apiKeyPrefix:string;
  webhookUrl:string|null;
  webhookSecret:string;
}>;

export type HandMeKeyConnectivityContext=Readonly<{
  connectionId:string;
  hotelId:string;
  environment:string;
}>;

export type HandMeKeyAriUpdate=Readonly<{
  roomCode:string;
  ratePlanCode?:string|null;
  date:string;
  rate?:number;
  available?:number;
  overbookingLimit?:number;
  minStay?:number;
  maxStay?:number|null;
  minAdvanceBookingDays?:number;
  maxAdvanceBookingDays?:number|null;
  closedToArrival?:boolean;
  closedToDeparture?:boolean;
  closed?:boolean;
  stopSell?:boolean;
}>;

export type HandMeKeyAriPush=Readonly<{updates:HandMeKeyAriUpdate[]}>;

const MAX_ARI_UPDATES=500;
const MAX_EVENT_BATCH=100;
const API_KEY_SECRET_BYTES=32;
const WEBHOOK_SECRET_BYTES=32;
const ACTIVE_EVENT_TYPES=["CONFIRMED","MODIFIED","CANCELLED"] as const;

export async function saveHandMeKeyApiConnection(userId:string,hotelId:string,input:{webhookUrl?:string|null;environment?:"UAT"|"PRODUCTION"}){
  await requireHotelPermission(userId,hotelId,"hotel:edit");
  const db=database();
  const existing=await readConnectionByHotel(hotelId);
  if(existing&&existing.provider!=="HANDMEKEY_API"&&existing.status!=="DISCONNECTED"){
    throw new ApplicationError("CONNECTIVITY_PROVIDER_ACTIVE","Disconnect the current property-system connection before enabling the HandMeKey Connectivity API",409);
  }
  const hotel=await db.hotel.findUnique({where:{id:hotelId},select:{id:true,slug:true}});
  if(!hotel)throw new ApplicationError("HOTEL_NOT_FOUND","Hotel not found",404);
  const webhookUrl=await normalizeAndValidateWebhookUrl(input.webhookUrl??null);
  const connectionId=existing?.id??randomUUID();
  const environment=input.environment==="UAT"?"UAT":"PRODUCTION";
  const secret=randomBytes(API_KEY_SECRET_BYTES).toString("base64url");
  const apiKey=`hmk_${environment==="UAT"?"test":"live"}_${connectionId}_${secret}`;
  const webhookSecret=randomBytes(WEBHOOK_SECRET_BYTES).toString("base64url");
  const credentials:NativeCredentials={version:1,apiKeyHash:sha256(apiKey),apiKeyPrefix:apiKey.slice(0,Math.min(apiKey.length,28)),webhookUrl,webhookSecret};
  const encrypted=encryptConnectivitySecret(credentials);
  const capabilities=JSON.stringify({auth:true,ariPush:true,reservationFeed:true,reservationAck:true,webhooks:true,idempotency:true,roomMapping:true,ratePlanMapping:true});
  await db.$executeRawUnsafe(
    `INSERT INTO "HotelConnectivityConnection" ("id","hotelId","provider","status","environment","externalHotelCode","encryptedCredentials","capabilities","createdByUserId","updatedByUserId","connectedAt","lastHealthCheckAt","lastHealthyAt","createdAt","updatedAt")
     VALUES ($1,$2,'HANDMEKEY_API','CONNECTED',$3,$4,$5,$6::jsonb,$7,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
     ON CONFLICT ("hotelId") DO UPDATE SET "provider"='HANDMEKEY_API',"status"='CONNECTED',"environment"=EXCLUDED."environment","gatewayUrl"=NULL,"enterpriseId"=NULL,
       "externalHotelCode"=EXCLUDED."externalHotelCode","encryptedCredentials"=EXCLUDED."encryptedCredentials","capabilities"=EXCLUDED."capabilities","lastError"=NULL,
       "connectedAt"=COALESCE("HotelConnectivityConnection"."connectedAt",CURRENT_TIMESTAMP),"disconnectedAt"=NULL,"lastHealthCheckAt"=CURRENT_TIMESTAMP,"lastHealthyAt"=CURRENT_TIMESTAMP,
       "updatedByUserId"=$7,"updatedAt"=CURRENT_TIMESTAMP`,
    connectionId,hotelId,environment,hotel.slug,encrypted,capabilities,userId,
  );
  await db.auditLog.create({data:{hotelId,actorUserId:userId,action:"HANDMEKEY_CONNECTIVITY_API_ENABLED",entityType:"HotelConnectivity",entityId:connectionId,after:{environment,webhookConfigured:Boolean(webhookUrl),apiKeyPrefix:credentials.apiKeyPrefix} as never}});
  return{connection:await getPublicNativeConnection(hotelId),credentials:{apiKey,webhookSigningSecret:webhookSecret,shownOnce:true}};
}

export async function updateHandMeKeyApiWebhook(userId:string,hotelId:string,input:{webhookUrl?:string|null}){
  await requireHotelPermission(userId,hotelId,"hotel:edit");
  const connection=await requireNativeConnectionByHotel(hotelId);
  const current=readNativeCredentials(connection);
  const webhookUrl=await normalizeAndValidateWebhookUrl(input.webhookUrl??null);
  const next:NativeCredentials={...current,webhookUrl};
  await database().$executeRawUnsafe(`UPDATE "HotelConnectivityConnection" SET "encryptedCredentials"=$2,"updatedByUserId"=$3,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,connection.id,encryptConnectivitySecret(next),userId);
  await database().auditLog.create({data:{hotelId,actorUserId:userId,action:"HANDMEKEY_CONNECTIVITY_WEBHOOK_UPDATED",entityType:"HotelConnectivity",entityId:connection.id,after:{webhookConfigured:Boolean(webhookUrl)} as never}});
  return{ok:true,webhookUrl};
}

export async function rotateHandMeKeyApiKey(userId:string,hotelId:string){
  await requireHotelPermission(userId,hotelId,"hotel:edit");
  const connection=await requireNativeConnectionByHotel(hotelId);
  const current=readNativeCredentials(connection);
  const secret=randomBytes(API_KEY_SECRET_BYTES).toString("base64url");
  const apiKey=`hmk_${connection.environment==="UAT"?"test":"live"}_${connection.id}_${secret}`;
  const next:NativeCredentials={...current,apiKeyHash:sha256(apiKey),apiKeyPrefix:apiKey.slice(0,Math.min(apiKey.length,28))};
  await database().$executeRawUnsafe(`UPDATE "HotelConnectivityConnection" SET "encryptedCredentials"=$2,"status"='CONNECTED',"lastError"=NULL,"updatedByUserId"=$3,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,connection.id,encryptConnectivitySecret(next),userId);
  await database().auditLog.create({data:{hotelId,actorUserId:userId,action:"HANDMEKEY_CONNECTIVITY_API_KEY_ROTATED",entityType:"HotelConnectivity",entityId:connection.id,after:{apiKeyPrefix:next.apiKeyPrefix} as never}});
  return{apiKey,apiKeyPrefix:next.apiKeyPrefix,shownOnce:true};
}

export async function authenticateHandMeKeyConnectivity(authorization:string|null):Promise<HandMeKeyConnectivityContext>{
  const apiKey=bearerToken(authorization);
  if(!apiKey)throw new ApplicationError("CONNECTIVITY_UNAUTHORIZED","A valid HandMeKey Connectivity API bearer token is required",401);
  const parsed=parseApiKey(apiKey);
  if(!parsed)throw new ApplicationError("CONNECTIVITY_UNAUTHORIZED","Invalid HandMeKey Connectivity API key",401);
  const connection=await readConnectionById(parsed.connectionId);
  if(!connection||connection.provider!=="HANDMEKEY_API"||connection.status==="DISCONNECTED"||!connection.encryptedCredentials){
    throw new ApplicationError("CONNECTIVITY_UNAUTHORIZED","Invalid or disconnected HandMeKey Connectivity API key",401);
  }
  const credentials=readNativeCredentials(connection);
  const supplied=Buffer.from(sha256(apiKey),"hex");
  const expected=Buffer.from(credentials.apiKeyHash,"hex");
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw new ApplicationError("CONNECTIVITY_UNAUTHORIZED","Invalid HandMeKey Connectivity API key",401);
  await database().$executeRawUnsafe(`UPDATE "HotelConnectivityConnection" SET "lastHealthCheckAt"=CURRENT_TIMESTAMP,"lastHealthyAt"=CURRENT_TIMESTAMP,"status"='CONNECTED',"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,connection.id);
  return{connectionId:connection.id,hotelId:connection.hotelId,environment:connection.environment};
}

export async function getHandMeKeyConnectivityProperty(context:HandMeKeyConnectivityContext){
  const connection=await requireConnectionContext(context);
  const hotel=await database().hotel.findUnique({
    where:{id:context.hotelId},
    select:{id:true,name:true,slug:true,city:true,countryCode:true,currency:true,status:true,verified:true,roomTypes:{where:{active:true},orderBy:{name:"asc"},select:{id:true,name:true,code:true,quantity:true,maxGuests:true,maxAdults:true,maxChildren:true,ratePlans:{where:{active:true},orderBy:{name:"asc"},select:{id:true,name:true,code:true,refundable:true,mealPlan:true}}}}},
  });
  if(!hotel)throw new ApplicationError("HOTEL_NOT_FOUND","Hotel not found",404);
  const roomMappings=asMappings(connection.roomMappings);
  const planMappings=asMappings(connection.ratePlanMappings);
  return{
    hotel:{id:hotel.id,name:hotel.name,slug:hotel.slug,city:hotel.city,countryCode:hotel.countryCode,currency:hotel.currency,status:hotel.status,verified:hotel.verified},
    rooms:hotel.roomTypes.map((room)=>({
      id:room.id,name:room.name,code:room.code,externalCode:externalCodeFor(room.id,roomMappings,room.code),quantity:room.quantity,maxGuests:room.maxGuests,maxAdults:room.maxAdults,maxChildren:room.maxChildren,
      ratePlans:room.ratePlans.map((plan)=>({id:plan.id,name:plan.name,code:plan.code,externalCode:externalCodeFor(plan.id,planMappings,plan.code),refundable:plan.refundable,mealPlan:plan.mealPlan})),
    })),
    capabilities:connection.capabilities,
  };
}

export async function pushHandMeKeyAri(context:HandMeKeyConnectivityContext,input:HandMeKeyAriPush,idempotencyKey:string|null){
  const connection=await requireConnectionContext(context);
  const key=cleanIdempotencyKey(idempotencyKey);
  if(key){
    const existing=await database().$queryRawUnsafe<Array<{id:string;status:string;payload:unknown}>>(`SELECT "id","status","payload" FROM "HotelConnectivityEvent" WHERE "connectionId"=$1 AND "idempotencyKey"=$2 LIMIT 1`,connection.id,key);
    if(existing[0])return{accepted:true,reused:true,eventId:existing[0].id,updatedDays:payloadNumber(existing[0].payload,"updatedDays")};
  }
  if(!input||!Array.isArray(input.updates)||input.updates.length<1||input.updates.length>MAX_ARI_UPDATES){
    throw new ApplicationError("INVALID_ARI_BATCH",`ARI updates must contain between 1 and ${MAX_ARI_UPDATES} rows`,400);
  }
  const db=database();
  const hotel=await db.hotel.findUnique({where:{id:context.hotelId},select:{id:true,overbookingEnabled:true,roomTypes:{select:{id:true,name:true,code:true,quantity:true,ratePlans:{select:{id:true,name:true,code:true}}}}}});
  if(!hotel)throw new ApplicationError("HOTEL_NOT_FOUND","Hotel not found",404);
  const roomMappings=asMappings(connection.roomMappings);
  const planMappings=asMappings(connection.ratePlanMappings);
  const roomByExternal=new Map<string,(typeof hotel.roomTypes)[number]>();
  for(const room of hotel.roomTypes){roomByExternal.set(normalizeCode(room.code),room);const mapped=externalCodeFor(room.id,roomMappings,null);if(mapped)roomByExternal.set(normalizeCode(mapped),room);}
  const planByRoomAndExternal=new Map<string,(typeof hotel.roomTypes)[number]["ratePlans"][number]>();
  for(const room of hotel.roomTypes)for(const plan of room.ratePlans){
    planByRoomAndExternal.set(`${room.id}::${normalizeCode(plan.code)}`,plan);
    const mapped=externalCodeFor(plan.id,planMappings,null);if(mapped)planByRoomAndExternal.set(`${room.id}::${normalizeCode(mapped)}`,plan);
  }
  const normalized=input.updates.map((row,index)=>normalizeAriRow(row,index,hotel.overbookingEnabled,roomByExternal,planByRoomAndExternal));
  const rateIds=[...new Set(normalized.flatMap((row)=>row.ratePlanId?[row.ratePlanId]:[]))];
  const dates=[...new Set(normalized.map((row)=>row.date.toISOString()))].map((value)=>new Date(value));
  const [existingRates,existingInventory]=await Promise.all([
    rateIds.length?db.dailyRate.findMany({where:{ratePlanId:{in:rateIds},date:{in:dates}}}):Promise.resolve([]),
    db.inventoryDay.findMany({where:{roomTypeId:{in:[...new Set(normalized.map((row)=>row.roomTypeId))]},date:{in:dates}}}),
  ]);
  const rateByKey=new Map(existingRates.map((row)=>[`${row.ratePlanId}::${dateKey(row.date)}`,row]));
  const inventoryByKey=new Map(existingInventory.map((row)=>[`${row.roomTypeId}::${dateKey(row.date)}`,row]));
  const eventId=randomUUID();
  await db.$transaction(async(tx)=>{
    for(const row of normalized){
      const rateKey=row.ratePlanId?`${row.ratePlanId}::${dateKey(row.date)}`:null;
      const currentRate=rateKey?rateByKey.get(rateKey):undefined;
      if(row.touchesRate){
        if(!row.ratePlanId)throw new ApplicationError("RATE_PLAN_REQUIRED",`ratePlanCode is required for pricing/restriction update on ${dateKey(row.date)}`,400);
        if(!currentRate&&row.rate===undefined)throw new ApplicationError("BASE_RATE_REQUIRED",`A base rate is required when creating ${dateKey(row.date)}`,400);
        const baseRate=row.rate??Number(currentRate!.baseRate);
        const minStay=row.minStay??currentRate?.minStay??1;
        const maxStay=row.maxStay===undefined?(currentRate?.maxStay??null):row.maxStay;
        const minAdvanceBookingDays=row.minAdvanceBookingDays??currentRate?.minAdvanceBookingDays??0;
        const maxAdvanceBookingDays=row.maxAdvanceBookingDays===undefined?(currentRate?.maxAdvanceBookingDays??null):row.maxAdvanceBookingDays;
        if(maxStay!==null&&maxStay<minStay)throw new ApplicationError("INVALID_STAY_LIMIT",`maxStay cannot be lower than minStay on ${dateKey(row.date)}`,400);
        if(maxAdvanceBookingDays!==null&&maxAdvanceBookingDays<minAdvanceBookingDays)throw new ApplicationError("INVALID_BOOKING_WINDOW",`maxAdvanceBookingDays cannot be lower than minAdvanceBookingDays on ${dateKey(row.date)}`,400);
        await tx.dailyRate.upsert({where:{ratePlanId_date:{ratePlanId:row.ratePlanId,date:row.date}},create:{ratePlanId:row.ratePlanId,date:row.date,baseRate,minStay,maxStay,minAdvanceBookingDays,maxAdvanceBookingDays,closedToArrival:row.closedToArrival??false,closedToDeparture:row.closedToDeparture??false,closed:row.closed??false,stopSell:row.stopSell??false},update:{baseRate,minStay,maxStay,minAdvanceBookingDays,maxAdvanceBookingDays,closedToArrival:row.closedToArrival??currentRate?.closedToArrival??false,closedToDeparture:row.closedToDeparture??currentRate?.closedToDeparture??false,closed:row.closed??currentRate?.closed??false,stopSell:row.stopSell??currentRate?.stopSell??false}});
      }
      if(row.touchesInventory){
        const current=inventoryByKey.get(`${row.roomTypeId}::${dateKey(row.date)}`);
        const available=row.available??current?.available??row.roomQuantity;
        const overbookingLimit=row.overbookingLimit??current?.overbookingLimit??0;
        await tx.inventoryDay.upsert({where:{roomTypeId_date:{roomTypeId:row.roomTypeId,date:row.date}},create:{roomTypeId:row.roomTypeId,date:row.date,available,overbookingLimit},update:{available,overbookingLimit}});
      }
    }
    await tx.$executeRawUnsafe(`INSERT INTO "HotelConnectivityEvent" ("id","connectionId","type","direction","idempotencyKey","payload","status","attempts","processedAt","createdAt","updatedAt") VALUES ($1,$2,'ARI_PUSH','INBOUND',$3,$4::jsonb,'PROCESSED',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,eventId,connection.id,key,JSON.stringify({updatedDays:normalized.length,rows:normalized.map((row)=>({date:dateKey(row.date),roomTypeId:row.roomTypeId,ratePlanId:row.ratePlanId}))}));
    await tx.$executeRawUnsafe(`UPDATE "HotelConnectivityConnection" SET "status"='CONNECTED',"lastSyncAt"=CURRENT_TIMESTAMP,"lastHealthyAt"=CURRENT_TIMESTAMP,"lastHealthCheckAt"=CURRENT_TIMESTAMP,"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,connection.id);
    await tx.auditLog.create({data:{hotelId:context.hotelId,actorUserId:connection.updatedByUserId,action:"CONNECTIVITY_ARI_PUSHED",entityType:"HotelConnectivity",entityId:eventId,after:{provider:"HANDMEKEY_API",updatedDays:normalized.length,idempotencyKey:key} as never}});
  });
  return{accepted:true,reused:false,eventId,updatedDays:normalized.length};
}

export async function syncBookingConnectivityEvents(limit=500){
  const db=database();
  const connections=await db.$queryRawUnsafe<ConnectionRow[]>(`SELECT * FROM "HotelConnectivityConnection" WHERE "status"='CONNECTED' AND "provider" IN ('HANDMEKEY_API','ORACLE_OHIP')`);
  if(!connections.length)return{queued:0,scanned:0};
  const byHotel=new Map(connections.map((row)=>[row.hotelId,row]));
  const events=await db.bookingEvent.findMany({
    where:{type:{in:[...ACTIVE_EVENT_TYPES]},booking:{hotelId:{in:[...byHotel.keys()]}}},
    orderBy:{createdAt:"desc"},
    take:Math.max(1,Math.min(5000,Math.trunc(limit)||500)),
    select:{id:true,type:true,createdAt:true,booking:{select:{id:true,reference:true,hotelId:true,status:true,revision:true,guestName:true,guestEmail:true,adults:true,children:true,arrival:true,departure:true,paymentMode:true,paymentState:true,currency:true,baseAmount:true,serviceAmount:true,taxAmount:true,totalAmount:true,cancellationPenaltyAmount:true,refundableAmount:true,confirmedAt:true,cancelledAt:true,roomType:{select:{id:true,name:true,code:true}},ratePlan:{select:{id:true,name:true,code:true}},nights:{select:{revision:true,date:true,baseAmount:true,serviceAmount:true,taxAmount:true,totalAmount:true}}}}},
  });
  let queued=0;
  for(const source of [...events].reverse()){
    const booking=source.booking;
    const connection=byHotel.get(booking.hotelId);
    if(!connection)continue;
    if(connection.connectedAt&&source.createdAt<connection.connectedAt)continue;
    const roomMappings=asMappings(connection.roomMappings);
    const planMappings=asMappings(connection.ratePlanMappings);
    const payload={
      schemaVersion:1,
      eventType:source.type==="CONFIRMED"?"reservation.created":source.type==="MODIFIED"?"reservation.modified":"reservation.cancelled",
      sourceEventId:source.id,
      occurredAt:source.createdAt.toISOString(),
      reservation:{
        id:booking.id,reference:booking.reference,status:booking.status,revision:booking.revision,
        guest:{name:booking.guestName,email:booking.guestEmail,adults:booking.adults,children:booking.children},
        stay:{arrival:dateKey(booking.arrival),departure:dateKey(booking.departure)},
        room:{id:booking.roomType.id,code:booking.roomType.code,externalCode:externalCodeFor(booking.roomType.id,roomMappings,booking.roomType.code),name:booking.roomType.name},
        ratePlan:{id:booking.ratePlan.id,code:booking.ratePlan.code,externalCode:externalCodeFor(booking.ratePlan.id,planMappings,booking.ratePlan.code),name:booking.ratePlan.name},
        payment:{mode:booking.paymentMode,state:booking.paymentState},
        amounts:{currency:booking.currency,base:Number(booking.baseAmount),service:Number(booking.serviceAmount),tax:Number(booking.taxAmount),total:Number(booking.totalAmount),cancellationPenalty:Number(booking.cancellationPenaltyAmount),refundable:booking.refundableAmount===null?null:Number(booking.refundableAmount)},
        confirmedAt:booking.confirmedAt?.toISOString()??null,cancelledAt:booking.cancelledAt?.toISOString()??null,
        nights:booking.nights.filter((night)=>night.revision===booking.revision).sort((a,b)=>a.date.getTime()-b.date.getTime()).map((night)=>({date:dateKey(night.date),base:Number(night.baseAmount),service:Number(night.serviceAmount),tax:Number(night.taxAmount),total:Number(night.totalAmount)})),
      },
    };
    const result=await db.$executeRawUnsafe(`INSERT INTO "HotelConnectivityEvent" ("id","connectionId","type","direction","externalId","idempotencyKey","payload","status","attempts","nextAttemptAt","createdAt","updatedAt") VALUES ($1,$2,$3,'OUTBOUND',$4,$5,$6::jsonb,'PENDING',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("connectionId","idempotencyKey") WHERE "idempotencyKey" IS NOT NULL DO NOTHING`,randomUUID(),connection.id,String(payload.eventType),booking.reference,`booking-event:${source.id}`,JSON.stringify(payload));
    if(result>0)queued+=1;
  }
  return{queued,scanned:events.length};
}

export async function listHandMeKeyReservationEvents(context:HandMeKeyConnectivityContext,rawLimit=50){
  await requireConnectionContext(context);
  await syncBookingConnectivityEvents(1000);
  const limit=Math.max(1,Math.min(MAX_EVENT_BATCH,Math.trunc(rawLimit)||50));
  const rows=await database().$queryRawUnsafe<Array<{id:string;type:string;externalId:string|null;payload:unknown;status:string;attempts:number;createdAt:Date;processedAt:Date|null}>>(
    `SELECT "id","type","externalId","payload","status","attempts","createdAt","processedAt" FROM "HotelConnectivityEvent" WHERE "connectionId"=$1 AND "direction"='OUTBOUND' AND "status" IN ('PENDING','DELIVERED','FAILED') ORDER BY "createdAt" ASC LIMIT $2`,context.connectionId,limit,
  );
  await touchSync(context.connectionId);
  return{events:rows.map((row)=>({id:row.id,type:row.type,externalId:row.externalId,status:row.status,attempts:row.attempts,createdAt:row.createdAt.toISOString(),payload:row.payload})),hasMore:rows.length===limit};
}

export async function acknowledgeHandMeKeyReservationEvent(context:HandMeKeyConnectivityContext,eventId:string){
  await requireConnectionContext(context);
  const id=eventId.trim();
  if(!id||id.length>100)throw new ApplicationError("INVALID_EVENT_ID","Invalid connectivity event ID",400);
  const updated=await database().$executeRawUnsafe(`UPDATE "HotelConnectivityEvent" SET "status"='ACKED',"processedAt"=CURRENT_TIMESTAMP,"lastError"=NULL,"nextAttemptAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "connectionId"=$2 AND "direction"='OUTBOUND' AND "status" IN ('PENDING','DELIVERED','FAILED')`,id,context.connectionId);
  if(updated===0)throw new ApplicationError("CONNECTIVITY_EVENT_NOT_FOUND","Reservation event not found or already acknowledged",404);
  await touchSync(context.connectionId);
  return{acknowledged:true,eventId:id};
}

export async function runConnectivityWebhookDelivery(limit=100){
  const queued=await syncBookingConnectivityEvents(1500);
  const rows=await database().$queryRawUnsafe<Array<{id:string;connectionId:string;type:string;payload:unknown;attempts:number;createdAt:Date;encryptedCredentials:string;hotelId:string}>>(
    `SELECT e."id",e."connectionId",e."type",e."payload",e."attempts",e."createdAt",c."encryptedCredentials",c."hotelId" FROM "HotelConnectivityEvent" e JOIN "HotelConnectivityConnection" c ON c."id"=e."connectionId" WHERE c."provider"='HANDMEKEY_API' AND c."status"='CONNECTED' AND e."direction"='OUTBOUND' AND e."status" IN ('PENDING','FAILED') AND (e."nextAttemptAt" IS NULL OR e."nextAttemptAt"<=CURRENT_TIMESTAMP) ORDER BY e."createdAt" ASC LIMIT $1`,Math.max(1,Math.min(500,Math.trunc(limit)||100)),
  );
  let delivered=0,failed=0,skipped=0;
  for(const row of rows){
    let credentials:NativeCredentials;
    try{credentials=decryptConnectivitySecret<NativeCredentials>(row.encryptedCredentials);}catch{failed+=1;await markDeliveryFailure(row,"Unable to decrypt webhook credentials");continue;}
    if(!credentials.webhookUrl){skipped+=1;continue;}
    try{
      const target=await normalizeAndValidateWebhookUrl(credentials.webhookUrl);
      if(!target){skipped+=1;continue;}
      const body=JSON.stringify({id:row.id,type:row.type,createdAt:row.createdAt.toISOString(),payload:row.payload});
      const timestamp=String(Math.floor(Date.now()/1000));
      const signature=createHmac("sha256",credentials.webhookSecret).update(`${timestamp}.${body}`).digest("hex");
      const response=await fetch(target,{method:"POST",headers:{"content-type":"application/json","user-agent":"HandMeKey-Connectivity/1.0","x-handmekey-event":row.type,"x-handmekey-delivery":row.id,"x-handmekey-timestamp":timestamp,"x-handmekey-signature":`sha256=${signature}`},body,cache:"no-store",signal:AbortSignal.timeout(10_000)});
      if(!response.ok)throw new Error(`Webhook returned HTTP ${response.status}`);
      await database().$executeRawUnsafe(`UPDATE "HotelConnectivityEvent" SET "status"='DELIVERED',"attempts"="attempts"+1,"lastError"=NULL,"nextAttemptAt"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,row.id);
      await database().$executeRawUnsafe(`UPDATE "HotelConnectivityConnection" SET "lastSyncAt"=CURRENT_TIMESTAMP,"lastHealthyAt"=CURRENT_TIMESTAMP,"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,row.connectionId);
      delivered+=1;
    }catch(error){failed+=1;await markDeliveryFailure(row,error instanceof Error?error.message:"Webhook delivery failed");}
  }
  return{queued:queued.queued,deliveriesScanned:rows.length,delivered,failed,skipped};
}

export async function getHandMeKeyApiConnectionSettings(userId:string,hotelId:string){
  await requireHotelPermission(userId,hotelId,"hotel:view");
  const connection=await readConnectionByHotel(hotelId);
  if(!connection||connection.provider!=="HANDMEKEY_API"||!connection.encryptedCredentials)return null;
  const credentials=readNativeCredentials(connection);
  return{apiKeyPrefix:credentials.apiKeyPrefix,webhookUrl:credentials.webhookUrl,webhookConfigured:Boolean(credentials.webhookUrl),webhookSigningConfigured:Boolean(credentials.webhookSecret)};
}

async function markDeliveryFailure(row:{id:string;connectionId:string;attempts:number},message:string){
  const attempts=row.attempts+1;
  const delayMinutes=Math.min(60,Math.max(1,2**Math.min(6,attempts-1)));
  const retryAt=new Date(Date.now()+delayMinutes*60_000);
  const clean=message.slice(0,500);
  await database().$executeRawUnsafe(`UPDATE "HotelConnectivityEvent" SET "status"='FAILED',"attempts"="attempts"+1,"lastError"=$2,"nextAttemptAt"=$3,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,row.id,clean,retryAt);
  await database().$executeRawUnsafe(`UPDATE "HotelConnectivityConnection" SET "lastError"=$2,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,row.connectionId,clean);
}

async function touchSync(connectionId:string){
  await database().$executeRawUnsafe(`UPDATE "HotelConnectivityConnection" SET "lastSyncAt"=CURRENT_TIMESTAMP,"lastHealthyAt"=CURRENT_TIMESTAMP,"lastError"=NULL,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,connectionId);
}

async function getPublicNativeConnection(hotelId:string){
  const row=await readConnectionByHotel(hotelId);
  if(!row)throw new ApplicationError("CONNECTIVITY_SAVE_FAILED","Could not load the saved connectivity configuration",500);
  const credentials=row.encryptedCredentials?readNativeCredentials(row):null;
  return{id:row.id,provider:row.provider,status:row.status,environment:row.environment,externalHotelCode:row.externalHotelCode,capabilities:row.capabilities,roomMappings:Array.isArray(row.roomMappings)?row.roomMappings:[],ratePlanMappings:Array.isArray(row.ratePlanMappings)?row.ratePlanMappings:[],lastHealthCheckAt:row.lastHealthCheckAt?.toISOString()??null,lastHealthyAt:row.lastHealthyAt?.toISOString()??null,lastSyncAt:row.lastSyncAt?.toISOString()??null,lastError:row.lastError,connectedAt:row.connectedAt?.toISOString()??null,credentialsConfigured:Boolean(row.encryptedCredentials),apiKeyPrefix:credentials?.apiKeyPrefix??null,webhookUrl:credentials?.webhookUrl??null};
}

async function requireConnectionContext(context:HandMeKeyConnectivityContext){
  const row=await readConnectionById(context.connectionId);
  if(!row||row.hotelId!==context.hotelId||row.provider!=="HANDMEKEY_API"||row.status==="DISCONNECTED")throw new ApplicationError("CONNECTIVITY_DISCONNECTED","The HandMeKey Connectivity API connection is not active",401);
  return row;
}

async function requireNativeConnectionByHotel(hotelId:string){
  const row=await readConnectionByHotel(hotelId);
  if(!row||row.provider!=="HANDMEKEY_API"||!row.encryptedCredentials)throw new ApplicationError("HANDMEKEY_API_NOT_CONFIGURED","HandMeKey Connectivity API is not configured for this property",404);
  return row;
}

async function readConnectionByHotel(hotelId:string):Promise<ConnectionRow|null>{
  const rows=await database().$queryRawUnsafe<ConnectionRow[]>(`SELECT * FROM "HotelConnectivityConnection" WHERE "hotelId"=$1 LIMIT 1`,hotelId);
  return rows[0]??null;
}

async function readConnectionById(id:string):Promise<ConnectionRow|null>{
  const rows=await database().$queryRawUnsafe<ConnectionRow[]>(`SELECT * FROM "HotelConnectivityConnection" WHERE "id"=$1 LIMIT 1`,id);
  return rows[0]??null;
}

function readNativeCredentials(connection:Pick<ConnectionRow,"encryptedCredentials">):NativeCredentials{
  if(!connection.encryptedCredentials)throw new ApplicationError("CONNECTIVITY_CREDENTIALS_MISSING","Connectivity credentials are missing",500);
  const value=decryptConnectivitySecret<NativeCredentials>(connection.encryptedCredentials);
  if(value.version!==1||!value.apiKeyHash||!value.webhookSecret)throw new ApplicationError("CONNECTIVITY_CREDENTIALS_INVALID","Connectivity credentials are invalid",500);
  return value;
}

function normalizeAriRow(row:HandMeKeyAriUpdate,index:number,overbookingEnabled:boolean,roomByExternal:Map<string,{id:string;name:string;code:string;quantity:number;ratePlans:Array<{id:string;name:string;code:string}>}>,planByRoomAndExternal:Map<string,{id:string;name:string;code:string}>){
  if(!row||typeof row!=="object")throw new ApplicationError("INVALID_ARI_ROW",`ARI row ${index+1} is invalid`,400);
  const roomCode=cleanCode(row.roomCode,"roomCode",index);
  const room=roomByExternal.get(normalizeCode(roomCode));
  if(!room)throw new ApplicationError("UNKNOWN_ROOM_CODE",`Unknown roomCode '${roomCode}' on ARI row ${index+1}`,400);
  const date=parseDate(row.date,index);
  const ratePlanCode=typeof row.ratePlanCode==="string"&&row.ratePlanCode.trim()?row.ratePlanCode.trim():null;
  const plan=ratePlanCode?planByRoomAndExternal.get(`${room.id}::${normalizeCode(ratePlanCode)}`):undefined;
  if(ratePlanCode&&!plan)throw new ApplicationError("UNKNOWN_RATE_PLAN_CODE",`Unknown ratePlanCode '${ratePlanCode}' for room '${roomCode}' on ARI row ${index+1}`,400);
  const rate=optionalMoney(row.rate,"rate",index);
  const available=optionalInteger(row.available,"available",index,0,room.quantity);
  const overbookingLimit=optionalInteger(row.overbookingLimit,"overbookingLimit",index,0,1000);
  if((overbookingLimit??0)>0&&!overbookingEnabled)throw new ApplicationError("OVERBOOKING_DISABLED",`Overbooking is disabled for ARI row ${index+1}`,400);
  const minStay=optionalInteger(row.minStay,"minStay",index,1,365);
  const maxStay=row.maxStay===null?null:optionalInteger(row.maxStay,"maxStay",index,1,365);
  const minAdvanceBookingDays=optionalInteger(row.minAdvanceBookingDays,"minAdvanceBookingDays",index,0,730);
  const maxAdvanceBookingDays=row.maxAdvanceBookingDays===null?null:optionalInteger(row.maxAdvanceBookingDays,"maxAdvanceBookingDays",index,0,730);
  const touchesRate=rate!==undefined||minStay!==undefined||row.maxStay!==undefined||minAdvanceBookingDays!==undefined||row.maxAdvanceBookingDays!==undefined||row.closedToArrival!==undefined||row.closedToDeparture!==undefined||row.closed!==undefined||row.stopSell!==undefined;
  const touchesInventory=available!==undefined||overbookingLimit!==undefined;
  if(!touchesRate&&!touchesInventory)throw new ApplicationError("EMPTY_ARI_ROW",`ARI row ${index+1} does not change rate, restrictions, or inventory`,400);
  if(touchesRate&&!plan)throw new ApplicationError("RATE_PLAN_REQUIRED",`ratePlanCode is required on ARI row ${index+1}`,400);
  return{roomTypeId:room.id,roomQuantity:room.quantity,ratePlanId:plan?.id??null,date,rate,available,overbookingLimit,minStay,maxStay,maxAdvanceBookingDays,minAdvanceBookingDays,closedToArrival:optionalBoolean(row.closedToArrival,"closedToArrival",index),closedToDeparture:optionalBoolean(row.closedToDeparture,"closedToDeparture",index),closed:optionalBoolean(row.closed,"closed",index),stopSell:optionalBoolean(row.stopSell,"stopSell",index),touchesRate,touchesInventory};
}

function optionalMoney(value:unknown,label:string,index:number):number|undefined{
  if(value===undefined)return undefined;
  const number=typeof value==="number"?value:Number.NaN;
  if(!Number.isFinite(number)||number<0||number>1_000_000)throw new ApplicationError("INVALID_ARI_VALUE",`${label} is invalid on ARI row ${index+1}`,400);
  return Math.round((number+Number.EPSILON)*100)/100;
}

function optionalInteger(value:unknown,label:string,index:number,min:number,max:number):number|undefined{
  if(value===undefined)return undefined;
  if(typeof value!=="number"||!Number.isInteger(value)||value<min||value>max)throw new ApplicationError("INVALID_ARI_VALUE",`${label} is invalid on ARI row ${index+1}`,400);
  return value;
}

function optionalBoolean(value:unknown,label:string,index:number):boolean|undefined{
  if(value===undefined)return undefined;
  if(typeof value!=="boolean")throw new ApplicationError("INVALID_ARI_VALUE",`${label} must be boolean on ARI row ${index+1}`,400);
  return value;
}

function cleanCode(value:unknown,label:string,index:number):string{
  if(typeof value!=="string"||!value.trim()||value.trim().length>120)throw new ApplicationError("INVALID_ARI_VALUE",`${label} is invalid on ARI row ${index+1}`,400);
  return value.trim();
}

function parseDate(value:unknown,index:number):Date{
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new ApplicationError("INVALID_ARI_DATE",`date must be YYYY-MM-DD on ARI row ${index+1}`,400);
  const date=new Date(`${value}T00:00:00.000Z`);
  if(Number.isNaN(date.getTime())||dateKey(date)!==value)throw new ApplicationError("INVALID_ARI_DATE",`Invalid date on ARI row ${index+1}`,400);
  const today=new Date();today.setUTCHours(0,0,0,0);
  const max=new Date(today);max.setUTCDate(max.getUTCDate()+730);
  if(date<today||date>max)throw new ApplicationError("ARI_DATE_OUT_OF_RANGE",`ARI date on row ${index+1} must be between today and 730 days ahead`,400);
  return date;
}

function asMappings(value:unknown):Mapping[]{
  if(!Array.isArray(value))return[];
  return value.flatMap((item)=>{
    if(!item||typeof item!=="object")return[];
    const row=item as JsonRecord;
    return typeof row.localId==="string"&&typeof row.externalCode==="string"&&row.localId.trim()&&row.externalCode.trim()?[{localId:row.localId.trim(),externalCode:row.externalCode.trim()}]:[];
  });
}

function externalCodeFor(localId:string,mappings:Mapping[],fallback:string|null):string|null{return mappings.find((item)=>item.localId===localId)?.externalCode??fallback;}
function normalizeCode(value:string):string{return value.trim().toLocaleLowerCase("en-US");}
function dateKey(value:Date):string{return value.toISOString().slice(0,10);}
function sha256(value:string):string{return createHash("sha256").update(value,"utf8").digest("hex");}
function bearerToken(value:string|null):string|null{if(!value)return null;const match=value.match(/^Bearer\s+(.+)$/i);return match?.[1]?.trim()||null;}
function parseApiKey(value:string):{connectionId:string}|null{const match=value.match(/^hmk_(?:live|test)_([0-9a-f-]{36})_[A-Za-z0-9_-]{20,}$/i);return match?.[1]?{connectionId:match[1]}:null;}
function cleanIdempotencyKey(value:string|null):string|null{const key=value?.trim()??"";if(!key)return null;if(key.length>160)throw new ApplicationError("IDEMPOTENCY_KEY_TOO_LONG","x-idempotency-key must be 160 characters or fewer",400);return key;}
function payloadNumber(value:unknown,key:string):number{if(!value||typeof value!=="object")return 0;const number=(value as JsonRecord)[key];return typeof number==="number"?number:0;}

async function normalizeAndValidateWebhookUrl(value:string|null):Promise<string|null>{
  const raw=value?.trim()??"";
  if(!raw)return null;
  let url:URL;
  try{url=new URL(raw);}catch{throw new ApplicationError("INVALID_WEBHOOK_URL","Enter a valid webhook URL",400);}
  if(url.protocol!=="https:"||url.username||url.password||(url.port&&url.port!=="443"))throw new ApplicationError("INVALID_WEBHOOK_URL","Webhook URL must use public HTTPS on port 443",400);
  const host=url.hostname.toLowerCase();
  if(host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local"))throw new ApplicationError("INVALID_WEBHOOK_URL","Webhook URL must use a public hostname",400);
  if(isIP(host)){if(isPrivateAddress(host))throw new ApplicationError("INVALID_WEBHOOK_URL","Webhook URL cannot target a private or local network",400);}
  else{
    try{const resolved=await lookup(host,{all:true,verbatim:true});if(!resolved.length||resolved.some((entry)=>isPrivateAddress(entry.address)))throw new Error("private");}
    catch{throw new ApplicationError("INVALID_WEBHOOK_URL","Webhook hostname must resolve to a public internet address",400);}
  }
  url.hash="";
  return url.toString();
}

function isPrivateAddress(address:string):boolean{
  if(address.includes(":")){
    const value=address.toLowerCase();
    return value==="::1"||value==="::"||value.startsWith("fc")||value.startsWith("fd")||value.startsWith("fe8")||value.startsWith("fe9")||value.startsWith("fea")||value.startsWith("feb");
  }
  const parts=address.split(".").map(Number);
  if(parts.length!==4||parts.some((part)=>!Number.isInteger(part)||part<0||part>255))return true;
  const a=parts[0]??-1;
  const b=parts[1]??-1;
  return a===0||a===10||a===127||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===198&&(b===18||b===19))||a>=224;
}
