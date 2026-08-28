"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function VerifyEmailClient({locale,token}:{locale:"en"|"ar";token:string}) {
  const [state,setState]=useState<"working"|"done"|"error">("working");const [message,setMessage]=useState("");
  useEffect(()=>{let active=true;(async()=>{try{const response=await fetch("/api/v1/auth/email-verification/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});const body=await response.json().catch(()=>null) as {error?:{message?:string}}|null;if(!response.ok)throw new Error(body?.error?.message??"Verification failed");if(active)setState("done");}catch(error){if(active){setState("error");setMessage(error instanceof Error?error.message:"Verification failed");}}})();return()=>{active=false};},[token]);
  if(state==="working")return <div className="opsNotice"><strong>{locale==="ar"?"جارٍ تأكيد البريد…":"Verifying your email…"}</strong></div>;
  if(state==="error")return <div className="opsNotice danger"><strong>{locale==="ar"?"تعذر تأكيد البريد":"Email verification failed"}</strong><p>{message}</p><Link className="opsPrimaryLink" href="/account/security">{locale==="ar"?"فتح أمان الحساب":"Open account security"}</Link></div>;
  return <div className="opsNotice success"><strong>{locale==="ar"?"تم تأكيد البريد":"Email verified"}</strong><p>{locale==="ar"?"تم ربط هذا البريد بحسابك لأغراض الأمان ورسائل الحجوزات.":"This address is now verified for account security and booking communications."}</p><Link className="opsPrimaryLink" href="/account">{locale==="ar"?"العودة إلى الحساب":"Back to account"}</Link></div>;
}
