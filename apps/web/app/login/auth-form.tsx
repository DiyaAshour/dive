"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@/lib/i18n";

type Mode = "login" | "register";
type Portal = "guest" | "partner";

type Props = Readonly<{portal?: Portal;locale?:Locale}>;

export default function AuthForm({portal = "guest",locale="en"}: Props) {
  const [mode,setMode]=useState<Mode>("login");
  const [error,setError]=useState<string|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const partner=portal==="partner";
  const ar=locale==="ar";

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
      if(!response.ok)throw new Error(result?.error?.message??(ar?"تعذر المتابعة":"Unable to continue"));
      if(partner) window.location.assign(mode==="register"?"/partner/onboarding":"/hotel-dashboard");
      else window.location.assign("/trips");
    }catch(cause){
      setError(cause instanceof Error?cause.message:(ar?"تعذر المتابعة":"Unable to continue"));
    }finally{setSubmitting(false);}
  }

  return <div className="authCard premiumAuthCard">
    <div className="authTabs">
      <button className={mode==="login"?"active":""} onClick={()=>setMode("login")} type="button">{ar?"تسجيل الدخول":"Sign in"}</button>
      <button className={mode==="register"?"active":""} onClick={()=>setMode("register")} type="button">{ar?"إنشاء حساب":"Create account"}</button>
    </div>
    <div className="authCardHeading"><span>{partner?(ar?"دخول الشريك":"Partner access"):ar?"حساب HandMeKey":"HandMeKey account"}</span><h2>{mode==="login"?(ar?"مرحبًا بعودتك":"Welcome back"):(ar?"أنشئ حسابك":"Create your account")}</h2><p>{partner?(ar?"أدر منشآتك وحجوزاتك وأسعارك وأداءك من بوابة الشركاء.":"Manage properties, reservations, rates and performance from Partner Hub."):ar?"احتفظ بحجوزاتك وتنبيهات الأسعار ورسائل الحجز في مكان واحد.":"Keep your trips, price alerts and booking messages in one place."}</p></div>
    <form onSubmit={submit}>
      {mode==="register"&&<label>{ar?"الاسم الكامل":"Full name"}<input name="displayName" autoComplete="name" minLength={2} placeholder={ar?"اسمك الكامل":"Your full name"} required/></label>}
      <label>{ar?"البريد الإلكتروني":"Email address"}<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required/></label>
      <label>{ar?"كلمة المرور":"Password"}<input name="password" type="password" minLength={10} autoComplete={mode==="login"?"current-password":"new-password"} placeholder={ar?"10 أحرف على الأقل":"At least 10 characters"} required/></label>
      {error&&<p className="formError">{error}</p>}
      <button className="primaryButton authSubmit" disabled={submitting}>{submitting?(ar?"يرجى الانتظار…":"Please wait…"):mode==="login"?(ar?"تسجيل الدخول":"Sign in"):(ar?"إنشاء الحساب":"Create account")}</button>
    </form>
    <small>{partner?(ar?"صلاحيات المنشأة محددة؛ لا يرى حسابك إلا الفنادق المصرح له بإدارتها.":"Property access is permission-based. Your account only sees hotels you are authorized to manage."):ar?"يبقى الوصول إلى حجوزاتك مرتبطًا بحسابك وبيانات الحجز الموثقة.":"Your booking access stays tied to your account and verified booking credentials."}</small>
  </div>;
}
