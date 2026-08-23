"use client";

import { useState } from "react";
import type { FormEvent } from "react";

export default function OnboardingForm(){
  const[error,setError]=useState<string|null>(null);
  const[submitting,setSubmitting]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setSubmitting(true);setError(null);
    const form=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/v1/hotels",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:form.get("name"),city:form.get("city"),countryCode:form.get("countryCode"),address:form.get("address"),timezone:form.get("timezone"),currency:form.get("currency")})});
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error?.message??"Could not create the property");
      window.location.assign(`/hotel-dashboard?hotelId=${encodeURIComponent(result.data.hotel.id)}`);
    }catch(cause){setError(cause instanceof Error?cause.message:"Could not create the property");}
    finally{setSubmitting(false);}
  }
  return <form className="partnerOnboardingCard" onSubmit={submit}>
    <div className="formCardHeading"><span>Property basics</span><h2>Create your hotel workspace</h2><p>You can complete photos, rooms, rates and verification after this step.</p></div>
    <label>Property name<input name="name" placeholder="e.g. The Amman House" required minLength={2}/></label>
    <div className="formGrid"><label>City<input name="city" defaultValue="Amman" required/></label><label>Country code<input name="countryCode" defaultValue="JO" minLength={2} maxLength={2} required/></label></div>
    <label>Full property address<input name="address" placeholder="Street, district, city" required minLength={5}/></label>
    <div className="formGrid"><label>Property timezone<input name="timezone" defaultValue="Asia/Amman" required/></label><label>Primary currency<input name="currency" defaultValue="JOD" minLength={3} maxLength={3} required/></label></div>
    <div className="formInfoStrip"><strong>What happens next?</strong><span>The property is created as a private draft. Nothing appears to travelers until publishing readiness and platform review are complete.</span></div>
    {error&&<p className="formError">{error}</p>}
    <button className="partnerFormSubmit" disabled={submitting}>{submitting?"Creating property…":"Create property workspace"}</button>
  </form>;
}
