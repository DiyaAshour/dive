import {timingSafeEqual} from "node:crypto";
import {database} from "@platform/database";
import {reconcileNuiteeCheckoutByClientReference} from "./checkout-session";

type JsonRecord=Record<string,unknown>;
export type NuiteeWebhookEnvelope=Readonly<{eventId:string;eventName:string;sandbox:boolean;request:JsonRecord;response:JsonRecord}>;

export function isNuiteeWebhookConfigured():boolean{return Boolean(process.env.NUITEE_WEBHOOK_TOKEN?.trim());}

export function verifyNuiteeWebhookAuthorization(header:string|null):boolean{
  const expected=process.env.NUITEE_WEBHOOK_TOKEN?.trim();
  if(!expected||!header)return false;
  const raw=header.trim();
  const candidate=raw.toLowerCase().startsWith("bearer ")?raw.slice(7).trim():raw;
  const left=Buffer.from(candidate);
  const right=Buffer.from(expected);
  return left.length===right.length&&timingSafeEqual(left,right);
}

export function parseNuiteeWebhookEnvelope(input:unknown):NuiteeWebhookEnvelope{
  const body=record(input);
  const eventId=text(body.event_id)??text(body.eventId);
  const eventName=text(body.event_name)??text(body.eventName);
  if(!eventId||!eventName)throw new Error("Nuitee webhook event_id and event_name are required");
  return {
    eventId,
    eventName,
    sandbox:body.sandbox===true,
    request:parseNestedJson(body.request),
    response:parseNestedJson(body.response),
  };
}

export async function processNuiteeWebhook(envelope:NuiteeWebhookEnvelope){
  const db=database();
  const existing=await db.analyticsEnvelope.findUnique({where:{eventId:envelope.eventId}});
  if(existing&&record(existing.properties).processed===true)return {duplicate:true,processed:true};

  const baseProperties=jsonSafe({processed:false,eventName:envelope.eventName,sandbox:envelope.sandbox,request:envelope.request,response:envelope.response});
  await db.analyticsEnvelope.upsert({
    where:{eventId:envelope.eventId},
    create:{eventId:envelope.eventId,name:envelope.eventName,source:"NUITEE_WEBHOOK",properties:baseProperties,occurredAt:new Date()},
    update:{name:envelope.eventName,source:"NUITEE_WEBHOOK",properties:baseProperties},
  });

  try{
    await applyEvent(envelope);
    await db.analyticsEnvelope.update({where:{eventId:envelope.eventId},data:{properties:jsonSafe({...baseProperties,processed:true,processedAt:new Date().toISOString()})}});
    return {duplicate:Boolean(existing),processed:true};
  }catch(error){
    const message=error instanceof Error?error.message:"Nuitee webhook processing failed";
    await db.analyticsEnvelope.update({where:{eventId:envelope.eventId},data:{properties:jsonSafe({...baseProperties,processed:false,processingError:message.slice(0,1000)})}}).catch(()=>undefined);
    throw error;
  }
}

async function applyEvent(envelope:NuiteeWebhookEnvelope){
  const event=envelope.eventName;
  if(event==="booking.book"){
    const clientReference=findValue(envelope.request,["clientReference","client_reference"])
      ??findValue(envelope.response,["clientReference","client_reference"]);
    if(clientReference)await reconcileNuiteeCheckoutByClientReference(clientReference);
    return;
  }

  const booking=await findApiBooking(envelope);
  if(!booking)return;
  const db=database();

  if(event==="booking.book_error"){
    const code=findValue(envelope.response,["code","errorCode","error_code"])??"NUITEE_BOOK_ERROR";
    const message=findValue(envelope.response,["description","message","errorMessage","error_message"])??"Nuitee reported a booking confirmation error";
    await db.$transaction([
      db.apiBooking.updateMany({where:{id:booking.id,status:{not:"CONFIRMED"}},data:{status:"FAILED",errorCode:"NUITEE_BOOKING_NEEDS_REVIEW",errorMessage:`${code}: ${message}`.slice(0,4000)}}),
      db.apiPaymentAttempt.updateMany({where:{apiBookingId:booking.id,provider:"NUITEE_PAYMENT_SDK",status:{not:"CAPTURED"}},data:{status:"AUTHORIZED",failureCode:String(code).slice(0,120)}}),
    ]);
    return;
  }

  if(event==="booking.book.hotelConfirmationNumber"){
    const confirmation=findValue(envelope.response,["hotelConfirmationCode","hotelConfirmationNumber","confirmationCode"]);
    if(!confirmation)return;
    const previous=record(booking.providerResponse);
    const data=record(previous.data);
    await db.apiBooking.update({where:{id:booking.id},data:{providerResponse:jsonSafe({...previous,data:{...data,hotelConfirmationCode:confirmation},hotelConfirmationWebhook:envelope.response})}});
    return;
  }

  if(event==="booking.cancel"){
    await db.apiBooking.updateMany({where:{id:booking.id,status:{not:"CANCELLED"}},data:{status:"CANCELLED",cancelledAt:new Date(),providerResponse:jsonSafe({booking:booking.providerResponse,cancellationWebhook:envelope.response})}});
  }
}

async function findApiBooking(envelope:NuiteeWebhookEnvelope){
  const db=database();
  const clientReference=findValue(envelope.request,["clientReference","client_reference"])
    ??findValue(envelope.response,["clientReference","client_reference"]);
  if(clientReference){
    const byReference=await db.apiBooking.findUnique({where:{clientReference}});
    if(byReference?.provider==="NUITEE")return byReference;
  }
  const bookingId=findValue(envelope.response,["bookingId","booking_id"])
    ??findValue(envelope.request,["bookingId","booking_id"]);
  if(!bookingId)return null;
  return db.apiBooking.findFirst({where:{provider:"NUITEE",providerReference:bookingId}});
}

function findValue(root:unknown,keys:string[],depth=0):string|null{
  if(depth>5)return null;
  const item=record(root);
  for(const key of keys){const direct=text(item[key]);if(direct)return direct;}
  for(const value of Object.values(item)){
    if(value&&typeof value==="object"){
      if(Array.isArray(value)){
        for(const entry of value){const found=findValue(entry,keys,depth+1);if(found)return found;}
      }else{
        const found=findValue(value,keys,depth+1);if(found)return found;
      }
    }
  }
  return null;
}
function parseNestedJson(value:unknown):JsonRecord{
  if(typeof value==="string"){
    try{return record(JSON.parse(value));}catch{return {raw:value.slice(0,20000)};}
  }
  return record(value);
}
function record(value:unknown):JsonRecord{return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};}
function text(value:unknown):string|null{return typeof value==="string"&&value.trim()?value.trim():typeof value==="number"&&Number.isFinite(value)?String(value):null;}
function jsonSafe(value:unknown):any{return value===undefined?null:JSON.parse(JSON.stringify(value));}
