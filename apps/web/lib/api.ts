import { NextResponse } from "next/server";
import { ApplicationError } from "@platform/server";
import type { ZodError } from "zod";

export function ok<T>(data:T,init?:ResponseInit):NextResponse{return NextResponse.json({data,error:null},init)}
export function validationError(error:ZodError):NextResponse{return NextResponse.json({data:null,error:{code:"VALIDATION_ERROR",message:"Request validation failed",issues:error.issues}},{status:400})}
export function handleApiError(error:unknown):NextResponse{if(error instanceof ApplicationError)return NextResponse.json({data:null,error:{code:error.code,message:error.message}},{status:error.status});console.error(error);return NextResponse.json({data:null,error:{code:"INTERNAL_ERROR",message:"An unexpected server error occurred"}},{status:500})}
