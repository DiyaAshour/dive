import {database} from "@platform/database";
import {badRequest,notFound} from "../errors";
import {requirePlatformAdmin} from "../admin/authorization";
import {requireHotelPermission} from "../hotels/authorization";

type RawRecord=Record<string,unknown>;

export const REQUIRED_NUITEE_CLAIM_DOCUMENT_TYPES=[
  "COMMERCIAL_REGISTRATION",
  "BUSINESS_LICENSE",
  "TAX_REGISTRATION",
  "OWNER_ID",
  "BANK_PROOF",
] as const;

export type NuiteeHotelClaim=Readonly<{
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

export type NuiteeHotelClaimRequestView=Readonly<{
  id:string;
  providerHotelId:string;
  providerHotelName:string;
  status:"PENDING"|"APPROVED"|"REJECTED"|"CANCELED";
  submittedAt:Date;
  reviewedAt:Date|null;
  rejectionReason:string|null;
}>;

export async function getNuiteeHotelClaim(actorUserId:string,hotelId:string):Promise<NuiteeHotelClaim|null>{
  await requireHotelPermission(actorUserId,hotelId,"hotel:view");
  return getClaim(hotelId);
}

export async function getNuiteeHotelClaimRequest(actorUserId:string,hotelId:string):Promise<NuiteeHotelClaimRequestView|null>{
  await requireHotelPermission(actorUserId,hotelId,"hotel:view");
  const row=await database().nuiteeHotelClaimRequest.findUnique({where:{hotelId}});
  if(!row)return null;
  const provider=await database().nuiteeContentHotel.findUnique({where:{providerHotelId:row.providerHotelId},select:{name:true}});
  return{
    id:row.id,
    providerHotelId:row.providerHotelId,
    providerHotelName:provider?.name??row.providerHotelId,
    status:row.status,
    submittedAt:row.submittedAt,
    reviewedAt:row.reviewedAt,
    rejectionReason:row.rejectionReason,
  };
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
    take:Math.min(30,take*3),
    select:{providerHotelId:true,name:true,city:true,area:true,address:true,starRating:true,raw:true},
  });
  const pending=rows.length?await database().nuiteeHotelClaimRequest.findMany({
    where:{status:"PENDING",hotelId:{not:hotelId},providerHotelId:{in:rows.map((row)=>row.providerHotelId)}},
    select:{providerHotelId:true},
  }):[];
  const blocked=new Set(pending.map((row)=>row.providerHotelId));
  return rows.filter((row)=>!blocked.has(row.providerHotelId)).slice(0,take).map((row)=>({
    providerHotelId:row.providerHotelId,
    name:row.name,
    city:row.city,
    area:row.area,
    address:row.address,
    starRating:row.starRating,
    coverPhoto:providerCoverPhoto(row.raw),
  }));
}

export async function getNuiteeClaimDocumentStatus(actorUserId:string,hotelId:string){
  await requireHotelPermission(actorUserId,hotelId,"hotel:view");
  return claimDocumentStatus(hotelId);
}

export async function submitNuiteeHotelClaimRequest(actorUserId:string,hotelId:string,rawProviderHotelId:string):Promise<NuiteeHotelClaimRequestView>{
  await requireHotelPermission(actorUserId,hotelId,"hotel:edit");
  const providerHotelId=normalizeProviderHotelId(rawProviderHotelId);
  if(!providerHotelId)badRequest("INVALID_NUITEE_HOTEL_ID","Select a valid supplier hotel");

  const db=database();
  const [hotel,provider,existingClaim,documents]=await Promise.all([
    db.hotel.findUnique({where:{id:hotelId},select:{id:true,name:true,city:true,countryCode:true}}),
    db.nuiteeContentHotel.findUnique({where:{providerHotelId},select:{providerHotelId:true,name:true,city:true,countryCode:true,address:true,starRating:true,claimedByHotelId:true}}),
    db.nuiteeContentHotel.findFirst({where:{claimedByHotelId:hotelId},select:{providerHotelId:true}}),
    claimDocumentStatus(hotelId),
  ]);
  if(!hotel)notFound("Hotel");
  if(!provider)badRequest("NUITEE_HOTEL_NOT_FOUND","This supplier hotel is not stored in HandMeKey yet");
  if(existingClaim&&existingClaim.providerHotelId!==providerHotelId)badRequest("PARTNER_HOTEL_ALREADY_LINKED","This partner property is already linked to another supplier hotel");
  if(provider.claimedByHotelId&&provider.claimedByHotelId!==hotelId)badRequest("NUITEE_HOTEL_ALREADY_CLAIMED","This supplier hotel is already linked to another partner property");
  if(provider.claimedByHotelId===hotelId){
    const current=await getClaim(hotelId);
    if(current)badRequest("NUITEE_HOTEL_ALREADY_CLAIMED","This supplier hotel is already linked to your property");
  }

  const missing=documents.filter((item)=>item.required&&!item.uploaded).map((item)=>item.type);
  if(missing.length)badRequest("CLAIM_DOCUMENTS_REQUIRED",`Upload all required ownership documents before submitting: ${missing.join(", ")}`);

  const competing=await db.nuiteeHotelClaimRequest.findFirst({where:{providerHotelId,status:"PENDING",hotelId:{not:hotelId}},select:{id:true}});
  if(competing)badRequest("NUITEE_HOTEL_CLAIM_PENDING","This hotel already has an ownership request under review");

  const snapshot={
    partnerHotel:{id:hotel.id,name:hotel.name,city:hotel.city,countryCode:hotel.countryCode},
    supplierHotel:{providerHotelId:provider.providerHotelId,name:provider.name,city:provider.city,countryCode:provider.countryCode,address:provider.address,starRating:provider.starRating},
    documents:documents.filter((item)=>item.uploaded).map((item)=>({type:item.type,documentId:item.documentId,status:item.status,fileName:item.fileName})),
  };

  const row=await db.$transaction(async(tx)=>{
    const existing=await tx.nuiteeHotelClaimRequest.findUnique({where:{hotelId}});
    const saved=existing
      ? await tx.nuiteeHotelClaimRequest.update({where:{hotelId},data:{providerHotelId,status:"PENDING",submittedByUserId:actorUserId,submittedAt:new Date(),reviewedByUserId:null,reviewedAt:null,rejectionReason:null,snapshot}})
      : await tx.nuiteeHotelClaimRequest.create({data:{hotelId,providerHotelId,status:"PENDING",submittedByUserId:actorUserId,snapshot}});
    await tx.auditLog.create({data:{hotelId,actorUserId,action:"NUITEE_HOTEL_CLAIM_REQUESTED",entityType:"NuiteeHotelClaimRequest",entityId:saved.id,after:snapshot}});
    return saved;
  });

  return{id:row.id,providerHotelId,providerHotelName:provider.name,status:row.status,submittedAt:row.submittedAt,reviewedAt:row.reviewedAt,rejectionReason:row.rejectionReason};
}

export async function cancelNuiteeHotelClaimRequest(actorUserId:string,hotelId:string):Promise<{canceled:boolean}>{
  await requireHotelPermission(actorUserId,hotelId,"hotel:edit");
  const db=database();
  const current=await db.nuiteeHotelClaimRequest.findUnique({where:{hotelId}});
  if(!current||current.status!=="PENDING")return{canceled:false};
  await db.$transaction(async(tx)=>{
    await tx.nuiteeHotelClaimRequest.update({where:{hotelId},data:{status:"CANCELED",reviewedAt:new Date(),rejectionReason:null}});
    await tx.auditLog.create({data:{hotelId,actorUserId,action:"NUITEE_HOTEL_CLAIM_REQUEST_CANCELED",entityType:"NuiteeHotelClaimRequest",entityId:current.id,before:{providerHotelId:current.providerHotelId,status:"PENDING"},after:{status:"CANCELED"}}});
  });
  return{canceled:true};
}

export async function listPendingNuiteeHotelClaimRequests(actorUserId:string){
  await requirePlatformAdmin(actorUserId);
  const db=database();
  const requests=await db.nuiteeHotelClaimRequest.findMany({where:{status:"PENDING"},orderBy:{submittedAt:"asc"},take:200});
  return Promise.all(requests.map(async(request)=>{
    const [hotel,provider,submitter,documents]=await Promise.all([
      db.hotel.findUnique({where:{id:request.hotelId},select:{id:true,name:true,slug:true,city:true,countryCode:true,status:true,verified:true,starRating:true}}),
      db.nuiteeContentHotel.findUnique({where:{providerHotelId:request.providerHotelId},select:{providerHotelId:true,name:true,city:true,countryCode:true,area:true,address:true,starRating:true,raw:true}}),
      db.user.findUnique({where:{id:request.submittedByUserId},select:{id:true,displayName:true,email:true}}),
      claimDocumentStatus(request.hotelId),
    ]);
    return{
      id:request.id,
      hotelId:request.hotelId,
      providerHotelId:request.providerHotelId,
      submittedAt:request.submittedAt,
      hotel,
      provider:provider?{...provider,coverPhoto:providerCoverPhoto(provider.raw),raw:undefined}:null,
      submitter,
      documents,
    };
  }));
}

export async function reviewNuiteeHotelClaimRequest(actorUserId:string,requestId:string,input:{decision:"APPROVE"|"REJECT";reason?:string}){
  await requirePlatformAdmin(actorUserId);
  const db=database();
  const request=await db.nuiteeHotelClaimRequest.findUnique({where:{id:requestId}});
  if(!request)notFound("Ownership claim request");
  if(request.status!=="PENDING")badRequest("CLAIM_REQUEST_ALREADY_REVIEWED","This ownership request has already been resolved");

  if(input.decision==="REJECT"){
    const reason=input.reason?.trim()??"";
    if(reason.length<10)badRequest("CLAIM_REJECTION_REASON_REQUIRED","Provide a rejection reason of at least 10 characters");
    await db.$transaction(async(tx)=>{
      const updated=await tx.nuiteeHotelClaimRequest.updateMany({where:{id:request.id,status:"PENDING"},data:{status:"REJECTED",reviewedByUserId:actorUserId,reviewedAt:new Date(),rejectionReason:reason}});
      if(updated.count!==1)badRequest("CLAIM_REQUEST_ALREADY_REVIEWED","This ownership request has already been resolved");
      await tx.auditLog.create({data:{hotelId:request.hotelId,actorUserId,action:"NUITEE_HOTEL_CLAIM_REJECTED",entityType:"NuiteeHotelClaimRequest",entityId:request.id,after:{providerHotelId:request.providerHotelId,reason}}});
    });
    return{requestId:request.id,hotelId:request.hotelId,status:"REJECTED" as const};
  }

  const documents=await claimDocumentStatus(request.hotelId);
  const missing=documents.filter((item)=>item.required&&!item.uploaded);
  if(missing.length)badRequest("CLAIM_DOCUMENTS_MISSING","Required ownership documents are no longer complete");
  const requiredDocumentIds=documents.filter((item)=>item.required&&item.documentId).map((item)=>item.documentId!);

  return db.$transaction(async(tx)=>{
    const provider=await tx.nuiteeContentHotel.findUnique({where:{providerHotelId:request.providerHotelId},select:{providerHotelId:true,name:true,claimedByHotelId:true}});
    if(!provider)badRequest("NUITEE_HOTEL_NOT_FOUND","Supplier hotel no longer exists in the local catalog");
    if(provider.claimedByHotelId&&provider.claimedByHotelId!==request.hotelId)badRequest("NUITEE_HOTEL_ALREADY_CLAIMED","This supplier hotel was linked to another property while the request was pending");
    const other=await tx.nuiteeContentHotel.findFirst({where:{claimedByHotelId:request.hotelId,providerHotelId:{not:request.providerHotelId}},select:{providerHotelId:true}});
    if(other)badRequest("PARTNER_HOTEL_ALREADY_LINKED","This partner property is already linked to another supplier hotel");

    if(requiredDocumentIds.length){
      await tx.hotelDocument.updateMany({where:{id:{in:requiredDocumentIds},status:"PENDING"},data:{status:"APPROVED",reviewedByUserId:actorUserId,reviewedAt:new Date(),rejectionReason:null}});
    }
    const claimedAt=new Date();
    await tx.nuiteeContentHotel.update({where:{providerHotelId:request.providerHotelId},data:{claimedByHotelId:request.hotelId,claimedAt}});
    const resolved=await tx.nuiteeHotelClaimRequest.updateMany({where:{id:request.id,status:"PENDING"},data:{status:"APPROVED",reviewedByUserId:actorUserId,reviewedAt:claimedAt,rejectionReason:null}});
    if(resolved.count!==1)badRequest("CLAIM_REQUEST_ALREADY_REVIEWED","This ownership request has already been resolved");
    await tx.auditLog.create({data:{hotelId:request.hotelId,actorUserId,action:"NUITEE_HOTEL_CLAIM_APPROVED",entityType:"NuiteeHotelClaimRequest",entityId:request.id,after:{providerHotelId:request.providerHotelId,providerHotelName:provider.name,claimedAt:claimedAt.toISOString(),approvedDocuments:requiredDocumentIds}}});
    return{requestId:request.id,hotelId:request.hotelId,providerHotelId:request.providerHotelId,status:"APPROVED" as const,claimedAt};
  });
}

export async function filterClaimedNuiteeResults<T extends {providerHotelCode:string}>(rows:readonly T[]):Promise<T[]>{
  if(!rows.length)return[];
  const providerHotelIds=[...new Set(rows.map((row)=>normalizeProviderHotelId(row.providerHotelCode)).filter(Boolean))];
  if(!providerHotelIds.length)return[...rows];
  const claimed=await database().nuiteeContentHotel.findMany({where:{providerHotelId:{in:providerHotelIds},claimedByHotelId:{not:null}},select:{providerHotelId:true}});
  if(!claimed.length)return[...rows];
  const claimedIds=new Set(claimed.map((row)=>row.providerHotelId));
  return rows.filter((row)=>!claimedIds.has(normalizeProviderHotelId(row.providerHotelCode)));
}

/** Final-link helper retained for administrative/internal use. Public partner flows submit a claim request instead. */
export async function claimNuiteeHotel(actorUserId:string,hotelId:string,rawProviderHotelId:string):Promise<NuiteeHotelClaim>{
  await requirePlatformAdmin(actorUserId);
  const providerHotelId=normalizeProviderHotelId(rawProviderHotelId);
  if(!providerHotelId)badRequest("INVALID_NUITEE_HOTEL_ID","Enter a valid Nuitee hotel ID");
  return finalizeClaim(actorUserId,hotelId,providerHotelId);
}

export async function releaseNuiteeHotelClaim(actorUserId:string,hotelId:string):Promise<{released:boolean}>{
  await requireHotelPermission(actorUserId,hotelId,"hotel:edit");
  return database().$transaction(async(tx)=>{
    const current=await tx.nuiteeContentHotel.findFirst({where:{claimedByHotelId:hotelId},select:{providerHotelId:true,name:true}});
    if(!current)return{released:false};
    await tx.nuiteeContentHotel.update({where:{providerHotelId:current.providerHotelId},data:{claimedByHotelId:null,claimedAt:null}});
    await tx.auditLog.create({data:{hotelId,actorUserId,action:"NUITEE_HOTEL_CLAIM_RELEASED",entityType:"NuiteeContentHotel",entityId:current.providerHotelId,before:{providerHotelId:current.providerHotelId,providerHotelName:current.name}}});
    return{released:true};
  });
}

export async function resolveClaimedNuiteeHotel(rawProviderHotelId:string):Promise<{hotelId:string;slug:string}|null>{
  const providerHotelId=normalizeProviderHotelId(rawProviderHotelId);
  if(!providerHotelId)return null;
  const row=await database().nuiteeContentHotel.findUnique({where:{providerHotelId},select:{claimedByHotelId:true}});
  if(!row?.claimedByHotelId)return null;
  const hotel=await database().hotel.findUnique({where:{id:row.claimedByHotelId},select:{id:true,slug:true}});
  return hotel?{hotelId:hotel.id,slug:hotel.slug}:null;
}

async function getClaim(hotelId:string):Promise<NuiteeHotelClaim|null>{
  const row=await database().nuiteeContentHotel.findFirst({where:{claimedByHotelId:hotelId},select:{providerHotelId:true,name:true,claimedAt:true}});
  return row?{providerHotelId:row.providerHotelId,providerHotelName:row.name,claimedAt:row.claimedAt}:null;
}

async function finalizeClaim(actorUserId:string,hotelId:string,providerHotelId:string):Promise<NuiteeHotelClaim>{
  return database().$transaction(async(tx)=>{
    const hotel=await tx.hotel.findUnique({where:{id:hotelId},select:{id:true,name:true}});
    if(!hotel)notFound("Hotel");
    const provider=await tx.nuiteeContentHotel.findUnique({where:{providerHotelId},select:{providerHotelId:true,name:true,claimedByHotelId:true,claimedAt:true}});
    if(!provider)badRequest("NUITEE_HOTEL_NOT_FOUND","This Nuitee hotel ID is not stored in HandMeKey yet");
    if(provider.claimedByHotelId&&provider.claimedByHotelId!==hotelId)badRequest("NUITEE_HOTEL_ALREADY_CLAIMED","This Nuitee hotel is already linked to another partner property");
    const existing=await tx.nuiteeContentHotel.findFirst({where:{claimedByHotelId:hotelId,providerHotelId:{not:providerHotelId}},select:{providerHotelId:true}});
    if(existing)badRequest("PARTNER_HOTEL_ALREADY_LINKED","This partner property is already linked to a different Nuitee hotel ID");
    const claimedAt=provider.claimedByHotelId===hotelId&&provider.claimedAt?provider.claimedAt:new Date();
    const updated=await tx.nuiteeContentHotel.update({where:{providerHotelId},data:{claimedByHotelId:hotelId,claimedAt},select:{providerHotelId:true,name:true,claimedAt:true}});
    await tx.auditLog.create({data:{hotelId,actorUserId,action:"NUITEE_HOTEL_CLAIMED",entityType:"NuiteeContentHotel",entityId:providerHotelId,after:{providerHotelId,providerHotelName:updated.name,partnerHotelName:hotel.name}}});
    return{providerHotelId:updated.providerHotelId,providerHotelName:updated.name,claimedAt:updated.claimedAt};
  });
}

async function claimDocumentStatus(hotelId:string){
  const docs=await database().hotelDocument.findMany({
    where:{hotelId,mediaObject:{state:"READY"}},
    orderBy:{submittedAt:"desc"},
    include:{mediaObject:{select:{id:true,originalFileName:true,contentType:true,expectedSizeBytes:true,uploadedAt:true}}},
  });
  return REQUIRED_NUITEE_CLAIM_DOCUMENT_TYPES.map((type)=>{
    const document=docs.find((item)=>item.type===type&&item.status!=="REJECTED")??docs.find((item)=>item.type===type)??null;
    return{
      type,
      required:true,
      uploaded:Boolean(document&&document.mediaObject.uploadedAt),
      status:document?.status??null,
      documentId:document?.id??null,
      fileName:document?.mediaObject.originalFileName??null,
      contentType:document?.mediaObject.contentType??null,
      sizeBytes:document?.mediaObject.expectedSizeBytes??null,
      rejectionReason:document?.rejectionReason??null,
    };
  });
}

function providerCoverPhoto(rawValue:unknown):string|null{
  const raw=record(rawValue);
  const main=text(raw.main_photo)??text(raw.mainPhoto);
  if(main)return main;
  const images=Array.isArray(raw.hotelImages)?raw.hotelImages:[];
  for(const image of images){const item=record(image);const url=text(item.urlHd)??text(item.url);if(url)return url;}
  return null;
}

function record(value:unknown):RawRecord{return value&&typeof value==="object"&&!Array.isArray(value)?value as RawRecord:{}}
function text(value:unknown):string|null{return typeof value==="string"&&value.trim()?value.trim():null}
function normalizeProviderHotelId(value:string):string{return value.trim().replace(/^nuitee:/i,"").replace(/^nuitee-/i,"").slice(0,128)}
