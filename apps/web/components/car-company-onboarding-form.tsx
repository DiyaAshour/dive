"use client";

import { useState } from "react";
import { ArrowRight, CarFront } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./car-company-onboarding.module.css";

type Props=Readonly<{locale:"ar"|"en"}>;

export function CarCompanyOnboardingForm({locale}:Props){
  const ar=locale==="ar";
  const router=useRouter();
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const copy=ar?{
    title:"بيانات شركة التأجير",body:"أنشئ مساحة العمل الخاصة بشركتك. يمكنك إضافة السيارات والفروع والأسعار والحجوزات بعدها مباشرة.",
    name:"اسم شركة التأجير",city:"المدينة",address:"العنوان",country:"الدولة",currency:"العملة",email:"بريد الدعم",phone:"هاتف الدعم",
    submit:"إنشاء لوحة التحكم",note:"سيتم إنشاء فرع استلام افتراضي في نفس المدينة ويمكنك تعديل الفروع لاحقًا.",failed:"تعذر إنشاء شركة التأجير. تحقق من البيانات وحاول مرة أخرى."
  }:{
    title:"Rental company details",body:"Create your company workspace. You can add vehicles, locations, pricing and reservations immediately after.",
    name:"Rental company name",city:"City",address:"Address",country:"Country",currency:"Currency",email:"Support email",phone:"Support phone",
    submit:"Create control panel",note:"A default pick-up location will be created in the same city and can be edited later.",failed:"Could not create the rental company. Check the details and try again."
  };

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");setLoading(true);
    const form=new FormData(event.currentTarget);
    const payload={
      name:String(form.get("name")||""),city:String(form.get("city")||""),address:String(form.get("address")||""),
      countryCode:String(form.get("countryCode")||"JO"),currency:String(form.get("currency")||"JOD"),
      supportEmail:String(form.get("supportEmail")||"")||undefined,supportPhone:String(form.get("supportPhone")||"")||undefined,
      timezone:"Asia/Amman",
    };
    try{
      const response=await fetch("/api/v1/cars/partner/company",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error?.message||copy.failed);
      router.push("/car-dashboard");router.refresh();
    }catch(value){setError(value instanceof Error?value.message:copy.failed);}finally{setLoading(false);}
  }

  return <div className={styles.card}>
    <div className={styles.cardHead}><h2>{copy.title}</h2><p>{copy.body}</p></div>
    <form className={styles.form} onSubmit={submit}>
      <div className={`${styles.field} ${styles.full}`}><label htmlFor="car-company-name">{copy.name}</label><input id="car-company-name" name="name" required minLength={2} autoComplete="organization" placeholder={ar?"مثال: Jordan Drive Rentals":"e.g. Jordan Drive Rentals"}/></div>
      <div className={styles.field}><label htmlFor="car-company-city">{copy.city}</label><input id="car-company-city" name="city" required defaultValue={ar?"عمّان":"Amman"}/></div>
      <div className={styles.field}><label htmlFor="car-company-country">{copy.country}</label><select id="car-company-country" name="countryCode" defaultValue="JO"><option value="JO">Jordan · JO</option></select></div>
      <div className={`${styles.field} ${styles.full}`}><label htmlFor="car-company-address">{copy.address}</label><input id="car-company-address" name="address" required minLength={4} placeholder={ar?"العنوان الكامل أو موقع الفرع الرئيسي":"Main branch full address"}/></div>
      <div className={styles.field}><label htmlFor="car-company-currency">{copy.currency}</label><select id="car-company-currency" name="currency" defaultValue="JOD"><option value="JOD">JOD</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
      <div className={styles.field}><label htmlFor="car-company-phone">{copy.phone}</label><input id="car-company-phone" name="supportPhone" inputMode="tel" autoComplete="tel" placeholder="+962"/></div>
      <div className={`${styles.field} ${styles.full}`}><label htmlFor="car-company-email">{copy.email}</label><input id="car-company-email" name="supportEmail" type="email" autoComplete="email"/></div>
      {error&&<div className={styles.error}>{error}</div>}
      <button className={styles.submit} type="submit" disabled={loading}><CarFront size={18}/>{loading?(ar?"جارٍ الإنشاء...":"Creating..."):copy.submit}<ArrowRight size={17}/></button>
      <p className={styles.note}>{copy.note}</p>
    </form>
  </div>;
}
