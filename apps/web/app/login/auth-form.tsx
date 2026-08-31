"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { authUiCopy } from "@/lib/auth-ui-copy";
import type { GuestLocale } from "@/lib/guest-market";

type Mode = "login" | "register";
type Portal = "guest" | "partner";

type Props = Readonly<{portal?: Portal;locale?:GuestLocale}>;

export default function AuthForm({portal = "guest",locale="en"}: Props) {
  const [mode,setMode]=useState<Mode>("login");
  const [error,setError]=useState<string|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const partner=portal==="partner";
  const copy=authUiCopy(locale);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form=new FormData(event.currentTarget);
    const payload=mode==="register"
      ?{displayName:form.get("displayName"),email:form.get("email"),password:form.get("password")}
      :{email:form.get("email"),password:form.get("password")};
    try{
      const response=await fetch(`/api/v1/auth/${mode}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error?.message??copy.unable);
      if(partner) window.location.assign(mode==="register"?"/partner/onboarding":"/hotel-dashboard");
      else window.location.assign("/trips");
    }catch(cause){
      setError(cause instanceof Error?cause.message:copy.unable);
    }finally{setSubmitting(false);}
  }

  return <div className="authCard premiumAuthCard">
    <div className="authTabs">
      <button className={mode==="login"?"active":""} onClick={()=>setMode("login")} type="button">{copy.signIn}</button>
      <button className={mode==="register"?"active":""} onClick={()=>setMode("register")} type="button">{copy.createAccount}</button>
    </div>
    <div className="authCardHeading"><span>{partner?copy.partnerAccess:copy.account}</span><h2>{mode==="login"?copy.welcome:copy.createTitle}</h2><p>{partner?copy.partnerBody:copy.guestBody}</p></div>
    <form onSubmit={submit}>
      {mode==="register"&&<label>{copy.fullName}<input name="displayName" autoComplete="name" minLength={2} placeholder={copy.namePlaceholder} required/></label>}
      <label>{copy.email}<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required/></label>
      <label>{copy.password}<input name="password" type="password" minLength={10} autoComplete={mode==="login"?"current-password":"new-password"} placeholder={copy.passwordHint} required/></label>
      {mode==="login"&&<Link className="authForgotLink" href="/forgot-password">{copy.forgot}</Link>}
      {error&&<p className="formError">{error}</p>}
      <button className="primaryButton authSubmit" disabled={submitting}>{submitting?copy.wait:mode==="login"?copy.signIn:copy.createButton}</button>
    </form>
    <small>{partner?copy.partnerFoot:copy.guestFoot}</small>
  </div>;
}
