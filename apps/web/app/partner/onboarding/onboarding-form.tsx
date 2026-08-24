"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type {Locale} from "@/lib/i18n";
import {portalDictionary} from "@/lib/portal-i18n";

export default function OnboardingForm({locale}:{locale:Locale}){
  const copy=portalDictionary(locale).partner;
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
    <div className="formCardHeading"><span>{copy.propertyBasics}</span><h2>{copy.createWorkspace}</h2><p>{copy.completeLater}</p></div>
    <label>{copy.propertyName}<input name="name" placeholder={locale==="ar"?"مثال: بيت عمّان":"e.g. The Amman House"} required minLength={2}/></label>
    <div className="formGrid"><label>{copy.city}<input name="city" defaultValue="Amman" required/></label><label>{copy.countryCode}<input name="countryCode" defaultValue="JO" minLength={2} maxLength={2} required/></label></div>
    <label>{copy.fullAddress}<input name="address" placeholder={locale==="ar"?"الشارع، الحي، المدينة":"Street, district, city"} required minLength={5}/></label>
    <div className="formGrid"><label>{copy.propertyTimezone}<input name="timezone" defaultValue="Asia/Amman" required/></label><label>{copy.primaryCurrency}<input name="currency" defaultValue="JOD" minLength={3} maxLength={3} required/></label></div>
    <div className="formInfoStrip"><strong>{copy.next}</strong><span>{copy.nextBody}</span></div>
    {error&&<p className="formError">{error}</p>}
    <button className="partnerFormSubmit" disabled={submitting}>{submitting?copy.creating:copy.create}</button>
  </form>;
}
