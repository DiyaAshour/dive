import type {NextRequest} from "next/server";
import {claimNuiteeHotel,getNuiteeHotelClaim,releaseNuiteeHotelClaim} from "@platform/server";
import {handleApiError,ok} from "@/lib/api";
import {requestUser} from "@/lib/request-auth";

export async function GET(request:NextRequest,{params}:{params:Promise<{hotelId:string}>}){
  try{
    const {hotelId}=await params;
    const user=await requestUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    return ok(await getNuiteeHotelClaim(user.id,hotelId));
  }catch(error){return handleApiError(error);}
}

export async function PUT(request:NextRequest,{params}:{params:Promise<{hotelId:string}>}){
  try{
    const {hotelId}=await params;
    const user=await requestUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const body=await request.json().catch(()=>null) as {providerHotelId?:unknown}|null;
    const providerHotelId=typeof body?.providerHotelId==="string"?body.providerHotelId:"";
    return ok(await claimNuiteeHotel(user.id,hotelId,providerHotelId));
  }catch(error){return handleApiError(error);}
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{hotelId:string}>}){
  try{
    const {hotelId}=await params;
    const user=await requestUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    return ok(await releaseNuiteeHotelClaim(user.id,hotelId));
  }catch(error){return handleApiError(error);}
}
