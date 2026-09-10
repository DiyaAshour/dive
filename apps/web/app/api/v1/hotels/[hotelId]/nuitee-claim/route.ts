import type {NextRequest} from "next/server";
import {cancelNuiteeHotelClaimRequest,getNuiteeHotelClaim,getNuiteeHotelClaimRequest,getNuiteeClaimDocumentStatus,releaseNuiteeHotelClaim,searchClaimableNuiteeHotels,submitNuiteeHotelClaimRequest} from "@platform/server";
import {handleApiError,ok} from "@/lib/api";
import {requestUser} from "@/lib/request-auth";

export async function GET(request:NextRequest,{params}:{params:Promise<{hotelId:string}>}){
  try{
    const {hotelId}=await params;
    const user=await requestUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const query=request.nextUrl.searchParams.get("q");
    if(query!==null)return ok(await searchClaimableNuiteeHotels(user.id,hotelId,query,8));
    const [claim,claimRequest,documents]=await Promise.all([
      getNuiteeHotelClaim(user.id,hotelId),
      getNuiteeHotelClaimRequest(user.id,hotelId),
      getNuiteeClaimDocumentStatus(user.id,hotelId),
    ]);
    return ok({claim,claimRequest,documents});
  }catch(error){return handleApiError(error);}
}

export async function PUT(request:NextRequest,{params}:{params:Promise<{hotelId:string}>}){
  try{
    const {hotelId}=await params;
    const user=await requestUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const body=await request.json().catch(()=>null) as {providerHotelId?:unknown}|null;
    const providerHotelId=typeof body?.providerHotelId==="string"?body.providerHotelId:"";
    return ok(await submitNuiteeHotelClaimRequest(user.id,hotelId,providerHotelId));
  }catch(error){return handleApiError(error);}
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{hotelId:string}>}){
  try{
    const {hotelId}=await params;
    const user=await requestUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const claim=await getNuiteeHotelClaim(user.id,hotelId);
    if(claim)return ok(await releaseNuiteeHotelClaim(user.id,hotelId));
    return ok(await cancelNuiteeHotelClaimRequest(user.id,hotelId));
  }catch(error){return handleApiError(error);}
}
