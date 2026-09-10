import {database} from "@platform/database";
import {badRequest, notFound} from "../errors";
import {requireHotelPermission} from "../hotels/authorization";

type RawRecord=Record<string,unknown>;

export type NuiteeHotelClaim = Readonly<{
  providerHotelId:string;
  providerHotelName:string;
  claimedAt:Date|null;
}>;

export type NuiteeHotelClaimCandidate=Readonly<{
  providerHotelId:string;
  name:string;
  city:string|null;
  area:string|null;
  address:string|null;
  starRating:number|null;
  coverPhoto:string|null;
}>;

export async function getNuiteeHotelClaim(actorUserId:string,hotelId:string):Promise<NuiteeHotelClaim|null>{
  await requireHotelPermission(actorUserId,hotelId,"hotel:view");
  const row=await database().nuiteeContentHotel.findFirst({
    where:{claimedByHotelId:hotelId},
    select:{providerHotelId:true,name:true,claimedAt:true},
  });
  return row?{providerHotelId:row.providerHotelId,providerHotelName:row.name,claimedAt:row.claimedAt}:null;
}

export async function searchClaimableNuiteeHotels(actorUserId:string,hotelId:string,rawQuery:string,limit=8):Promise<NuiteeHotelClaimCandidate[]>{
  await requireHotelPermission(actorUserId,hotelId,"hotel:view");
  const query=rawQuery.trim().slice(0,120);
  if(query.length<2)return[];
  const tokens=[...new Set(query.split(/\s+/).map((token)=>token.trim()).filter((token)=>token.length>=2))].slice(0,5);
  if(!tokens.length)return[];
  const take=Math.max(1,Math.min(12,Math.trunc(limit)||8));
  const rows=await database().nuiteeContentHotel.findMany({
    where:{
      claimedByHotelId:null,
      AND:tokens.map((token)=>({
        OR:[
          {name:{contains:token,mode:"insensitive" as const}},
          {city:{contains:token,mode:"insensitive" as const}},
          {area:{contains:token,mode:"insensitive" as const}},
          {address:{contains:token,mode:"insensitive" as const}},
        ],
      })),
    },
    orderBy:[{starRating:"desc"},{name:"asc"}],
    take,
    select:{providerHotelId:true,name:true,city:true,area:true,address:true,starRating:true,raw:true},
  });
  return rows.map((row)=>({
    providerHotelId:row.providerHotelId,
    name:row.name,
    city:row.city,
    area:row.area,
    address:row.address,
    starRating:row.starRating,
    coverPhoto:providerCoverPhoto(row.raw),
  }));
}

export async function claimNuiteeHotel(actorUserId:string,hotelId:string,rawProviderHotelId:string):Promise<NuiteeHotelClaim>{
  await requireHotelPermission(actorUserId,hotelId,"hotel:edit");
  const providerHotelId=normalizeProviderHotelId(rawProviderHotelId);
  if(!providerHotelId)badRequest("INVALID_NUITEE_HOTEL_ID","Enter a valid Nuitee hotel ID");

  return database().$transaction(async(tx)=>{
    const hotel=await tx.hotel.findUnique({where:{id:hotelId},select:{id:true,name:true}});
    if(!hotel)notFound("Hotel");

    const provider=await tx.nuiteeContentHotel.findUnique({
      where:{providerHotelId},
      select:{providerHotelId:true,name:true,claimedByHotelId:true,claimedAt:true},
    });
    if(!provider)badRequest("NUITEE_HOTEL_NOT_FOUND","This Nuitee hotel ID is not stored in HandMeKey yet");
    if(provider.claimedByHotelId&&provider.claimedByHotelId!==hotelId){
      badRequest("NUITEE_HOTEL_ALREADY_CLAIMED","This Nuitee hotel is already linked to another partner property");
    }

    const existing=await tx.nuiteeContentHotel.findFirst({
      where:{claimedByHotelId:hotelId,providerHotelId:{not:providerHotelId}},
      select:{providerHotelId:true},
    });
    if(existing)badRequest("PARTNER_HOTEL_ALREADY_LINKED","This partner property is already linked to a different Nuitee hotel ID");

    const claimedAt=provider.claimedByHotelId===hotelId&&provider.claimedAt?provider.claimedAt:new Date();
    const updated=await tx.nuiteeContentHotel.update({
      where:{providerHotelId},
      data:{claimedByHotelId:hotelId,claimedAt},
      select:{providerHotelId:true,name:true,claimedAt:true},
    });

    await tx.auditLog.create({data:{
      hotelId,
      actorUserId,
      action:"NUITEE_HOTEL_CLAIMED",
      entityType:"NuiteeContentHotel",
      entityId:providerHotelId,
      after:{providerHotelId,providerHotelName:updated.name,partnerHotelName:hotel.name},
    }});

    return {providerHotelId:updated.providerHotelId,providerHotelName:updated.name,claimedAt:updated.claimedAt};
  });
}

export async function releaseNuiteeHotelClaim(actorUserId:string,hotelId:string):Promise<{released:boolean}>{
  await requireHotelPermission(actorUserId,hotelId,"hotel:edit");
  return database().$transaction(async(tx)=>{
    const current=await tx.nuiteeContentHotel.findFirst({
      where:{claimedByHotelId:hotelId},
      select:{providerHotelId:true,name:true},
    });
    if(!current)return {released:false};
    await tx.nuiteeContentHotel.update({
      where:{providerHotelId:current.providerHotelId},
      data:{claimedByHotelId:null,claimedAt:null},
    });
    await tx.auditLog.create({data:{
      hotelId,
      actorUserId,
      action:"NUITEE_HOTEL_CLAIM_RELEASED",
      entityType:"NuiteeContentHotel",
      entityId:current.providerHotelId,
      before:{providerHotelId:current.providerHotelId,providerHotelName:current.name},
    }});
    return {released:true};
  });
}

export async function resolveClaimedNuiteeHotel(rawProviderHotelId:string):Promise<{hotelId:string;slug:string}|null>{
  const providerHotelId=normalizeProviderHotelId(rawProviderHotelId);
  if(!providerHotelId)return null;
  const row=await database().nuiteeContentHotel.findUnique({
    where:{providerHotelId},
    select:{claimedByHotelId:true},
  });
  if(!row?.claimedByHotelId)return null;
  const hotel=await database().hotel.findUnique({
    where:{id:row.claimedByHotelId},
    select:{id:true,slug:true},
  });
  return hotel?{hotelId:hotel.id,slug:hotel.slug}:null;
}

function providerCoverPhoto(rawValue:unknown):string|null{
  const raw=record(rawValue);
  const main=text(raw.main_photo)??text(raw.mainPhoto);
  if(main)return main;
  const images=Array.isArray(raw.hotelImages)?raw.hotelImages:[];
  for(const image of images){
    const item=record(image);
    const url=text(item.urlHd)??text(item.url);
    if(url)return url;
  }
  return null;
}

function record(value:unknown):RawRecord{
  return value&&typeof value==="object"&&!Array.isArray(value)?value as RawRecord:{};
}

function text(value:unknown):string|null{
  return typeof value==="string"&&value.trim()?value.trim():null;
}

function normalizeProviderHotelId(value:string):string{
  return value.trim().replace(/^nuitee:/i,"").replace(/^nuitee-/i,"").slice(0,128);
}
