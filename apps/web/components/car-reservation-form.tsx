"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "@/app/cars/[id]/book/car-booking-checkout.module.css";

type Location={id:string;name:string;city:string;address:string;airportCode:string|null};
type ExtraKey="child-seat"|"infant-seat"|"booster-seat"|"gps"|"additional-driver";
type Props=Readonly<{
  locale:"ar"|"en";
  vehicleId:string;
  pickupDate:string;
  pickupTime:string;
  returnDate:string;
  returnTime:string;
  driverAgeRange:string;
  extras:ExtraKey[];
  defaultName:string;
  defaultEmail:string;
  locations:Location[];
  defaultLocationId?:string;
  totalLabel:string;
  totalValue:string;
  durationLabel:string;
}>;

export function CarReservationForm(props:Props){
  const ar=props.locale==="ar";
  const router=useRouter();
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const copy=ar?{
    name:"الاسم الكامل",email:"البريد الإلكتروني",phone:"رقم الهاتف",pickup:"موقع الاستلام",return:"موقع التسليم",confirm:"تأكيد الحجز",loading:"جارٍ التأكيد...",failed:"تعذر تأكيد حجز السيارة.",secure:"سيتم حفظ الحجز باسم حسابك ويمكنك متابعته من حجوزاتي.",age:"الفئة العمرية للسائق"
  }:{
    name:"Full name",email:"Email address",phone:"Phone number",pickup:"Pick-up location",return:"Return location",confirm:"Confirm booking",loading:"Confirming...",failed:"Could not confirm the car booking.",secure:"The reservation will be saved to your account and available under My bookings.",age:"Driver age range"
  };
  const defaultLocation=props.defaultLocationId??props.locations[0]?.id??"";

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setLoading(true);setError("");const form=new FormData(event.currentTarget);
    const payload={
      vehicleId:props.vehicleId,pickupDate:props.pickupDate,pickupTime:props.pickupTime,returnDate:props.returnDate,returnTime:props.returnTime,driverAgeRange:props.driverAgeRange,extras:props.extras,
      guestName:String(form.get("guestName")||""),guestEmail:String(form.get("guestEmail")||""),guestPhone:String(form.get("guestPhone")||"")||undefined,
      pickupLocationId:String(form.get("pickupLocationId")||"")||undefined,returnLocationId:String(form.get("returnLocationId")||"")||undefined,
    };
    try{
      const response=await fetch("/api/v1/cars/reservations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error?.message||copy.failed);
      router.push(`/cars/bookings/${result.data.id}?booked=1`);router.refresh();
    }catch(value){setError(value instanceof Error?value.message:copy.failed);}finally{setLoading(false);}
  }

  return <form className={styles.form} onSubmit={submit}>
    <label className={`${styles.field} ${styles.full}`}><span>{copy.name}</span><input name="guestName" required minLength={2} defaultValue={props.defaultName} autoComplete="name"/></label>
    <label className={styles.field}><span>{copy.email}</span><input name="guestEmail" required type="email" defaultValue={props.defaultEmail} autoComplete="email"/></label>
    <label className={styles.field}><span>{copy.phone}</span><input name="guestPhone" inputMode="tel" autoComplete="tel" placeholder="+962"/></label>
    <label className={`${styles.field} ${styles.locationField}`}><span>{copy.pickup}</span><select name="pickupLocationId" defaultValue={defaultLocation} required>{props.locations.map((location)=><option key={location.id} value={location.id}>{location.name} · {location.city}{location.airportCode?` (${location.airportCode})`:""}</option>)}</select></label>
    <label className={`${styles.field} ${styles.locationField}`}><span>{copy.return}</span><select name="returnLocationId" defaultValue={defaultLocation} required>{props.locations.map((location)=><option key={location.id} value={location.id}>{location.name} · {location.city}{location.airportCode?` (${location.airportCode})`:""}</option>)}</select></label>
    <label className={`${styles.field} ${styles.full}`}><span>{copy.age}</span><input value={props.driverAgeRange} readOnly/></label>
    {error&&<div className={styles.error}>{error}</div>}
    <div className={`${styles.full} ${styles.notice} ${styles.secureNotice}`}><Check size={13}/><span>{copy.secure}</span></div>
    <div className={styles.submitBar}>
      <div className={styles.submitTotal}><span>{props.totalLabel}</span><strong>{props.totalValue}</strong><small>{props.durationLabel}</small></div>
      <button className={styles.submit} type="submit" disabled={loading}><ShieldCheck size={18}/>{loading?copy.loading:copy.confirm}</button>
    </div>
  </form>;
}
