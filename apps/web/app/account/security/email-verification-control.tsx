"use client";
import { useEffect, useState } from "react";
import type { GuestLocale } from "@/lib/guest-market";
import { securityUiCopy } from "@/lib/security-ui-copy";

export function EmailVerificationControl({locale}:{locale:GuestLocale}){
  const [email,setEmail]=useState("");
  const [verified,setVerified]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const copy=securityUiCopy(locale);
  useEffect(()=>{void fetch("/api/v1/auth/email-verification",{cache:"no-store"}).then(async response=>{if(!response.ok)return;const body=await response.json() as {data?:{email?:string;verified?:boolean}};setEmail(body.data?.email??"");setVerified(Boolean(body.data?.verified));});},[]);
  async function send(){setBusy(true);setNotice("");try{const response=await fetch("/api/v1/auth/email-verification",{method:"POST"});const body=await response.json().catch(()=>null) as {data?:{verified?:boolean};error?:{message?:string}}|null;if(!response.ok)throw new Error(body?.error?.message??copy.requestFailed);if(body?.data?.verified){setVerified(true);setNotice(copy.alreadyVerified);}else setNotice(copy.verificationSent);}catch(error){setNotice(error instanceof Error?error.message:copy.requestFailed);}finally{setBusy(false)}}
  return <section className="accountCard emailVerificationCard"><div><span className="eyebrow">{copy.emailEyebrow}</span><h2>{copy.emailTitle}</h2><p>{email||"…"}</p></div><div className={`emailVerificationStatus ${verified?"verified":"pending"}`}><strong>{verified?copy.verified:copy.needsVerification}</strong>{!verified&&<button type="button" onClick={send} disabled={busy}>{busy?copy.sending:copy.sendLink}</button>}</div>{notice&&<p className="opsNotice compact">{notice}</p>}</section>}
