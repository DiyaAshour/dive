import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export function sessionCookieName():string{return process.env.SESSION_COOKIE_NAME??"hp_session"}
export function readSessionToken(request:NextRequest):string|null{const authorization=request.headers.get("authorization");if(authorization?.startsWith("Bearer "))return authorization.slice(7).trim()||null;return request.cookies.get(sessionCookieName())?.value??null}
export function attachSessionCookie(response:NextResponse,token:string,expiresAt:Date):void{response.cookies.set(sessionCookieName(),token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt})}
export function clearSessionCookie(response:NextResponse):void{response.cookies.set(sessionCookieName(),"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:new Date(0)})}
