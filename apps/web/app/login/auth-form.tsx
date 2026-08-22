"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type Mode = "login" | "register";
type Portal = "guest" | "partner";

export default function AuthForm({portal = "guest"}: Readonly<{portal?: Portal}>) {
  const [mode,setMode]=useState<Mode>("login");
  const [error,setError]=useState<string|null>(null);
  const [submitting,setSubmitting]=useState(false);

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
      if(!response.ok)throw new Error(result?.error?.message??"Unable to continue");
      if(portal==="partner") window.location.assign(mode==="register"?"/partner/onboarding":"/hotel-dashboard");
      else window.location.assign("/trips");
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Unable to continue");
    }finally{setSubmitting(false);}
  }

  const partner=portal==="partner";
  return <div className="authCard premiumAuthCard">
    <div className="authTabs">
      <button className={mode==="login"?"active":""} onClick={()=>setMode("login")} type="button">Sign in</button>
      <button className={mode==="register"?"active":""} onClick={()=>setMode("register")} type="button">Create account</button>
    </div>
    <div className="authCardHeading"><span>{partner?"Partner access":"HandMeKey account"}</span><h2>{mode==="login"?"Welcome back":"Create your account"}</h2><p>{partner?"Manage properties, reservations, rates and performance from Partner Hub.":"Keep your trips, price alerts and booking messages in one place."}</p></div>
    <form onSubmit={submit}>
      {mode==="register"&&<label>Full name<input name="displayName" autoComplete="name" minLength={2} placeholder="Your full name" required/></label>}
      <label>Email address<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required/></label>
      <label>Password<input name="password" type="password" minLength={10} autoComplete={mode==="login"?"current-password":"new-password"} placeholder="At least 10 characters" required/></label>
      {error&&<p className="formError">{error}</p>}
      <button className="primaryButton authSubmit" disabled={submitting}>{submitting?"Please wait…":mode==="login"?"Sign in":"Create account"}</button>
    </form>
    <small>{partner?"Property access is permission-based. Your account only sees hotels you are authorized to manage.":"Your booking access stays tied to your account and verified booking credentials."}</small>
  </div>;
}
