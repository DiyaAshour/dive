import {database} from "@platform/database";
import {badRequest, notFound} from "../errors";
import {requireHotelPermission} from "../hotels/authorization";

export type NuiteeHotelClaim = Readonly<{
  providerHotelId:string;
  providerHotelName:string;
  claimedAt:Date|null;
}>;

export async function getNuiteeHotelClaim(actorUserId:string,hotelId:string):Promise<NuiteeHotelClaim|null>{
  await requireHotelPermission(actorUserId,hotelId,"hotel:view");
  const row=await database().nuiteeContentHotel.findFirst({
    where:{claimedByHotelId:hotelId},
    select:{providerHotelId:true,name:true,claimedAt:true},
  });
  return row?{providerHotelId:row.providerHotelId,providerHotelName:row.name,claimedAt:row.claimedAt}:null;
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

function normalizeProviderHotelId(value:string):string{
  return value.trim().replace(/^nuitee:/i,"").replace(/^nuitee-/i,"").slice(0,128);
}