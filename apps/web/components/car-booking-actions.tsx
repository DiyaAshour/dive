"use client";

import { useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "@/app/cars/bookings/car-bookings.module.css";

type Props=Readonly<{reservationId:string;locale:"ar"|"en"}>;

export function CarBookingActions({reservationId,locale}:Props){
  const ar=locale==="ar";
  const router=useRouter();
  const [confirming,setConfirming]=useState(false);
  const [reason,setReason]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const copy=ar?{
    cancel:"إلغاء الحجز",title:"هل تريد إلغاء حجز السيارة؟",body:"سيتم تحرير السيارة لهذه التواريخ فورًا. لن يتم تحصيل أي مبلغ إلكتروني من HandMeKey لهذا الحجز.",reason:"سبب الإلغاء (اختياري)",keep:"الاحتفاظ بالحجز",confirm:"نعم، إلغاء الحجز",loading:"جارٍ الإلغاء...",failed:"تعذر إلغاء الحجز الآن."
  }:{
    cancel:"Cancel booking",title:"Cancel this car booking?",body:"The car will be released for these dates immediately. HandMeKey will not collect an online payment for this booking.",reason:"Cancellation reason (optional)",keep:"Keep booking",confirm:"Yes, cancel booking",loading:"Cancelling...",failed:"Could not cancel the booking right now."
  };

  async function cancel(){
    if(loading)return;
    setLoading(true);setError("");
    try{
      const response=await fetch(`/api/v1/cars/reservations/${reservationId}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"cancel",...(reason.trim()?{reason:reason.trim()}: {})})});
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error?.message||copy.failed);
      setConfirming(false);setReason("");
      router.refresh();
    }catch(value){setError(value instanceof Error?value.message:copy.failed);}finally{setLoading(false);}
  }

  if(!confirming)return <button className={styles.cancelButton} type="button" onClick={()=>setConfirming(true)}><XCircle size={16}/>{copy.cancel}</button>;

  return <div className={styles.cancelBox}>
    <div className={styles.cancelHead}><span><XCircle size={18}/></span><div><strong>{copy.title}</strong><p>{copy.body}</p></div><button type="button" className={styles.cancelClose} onClick={()=>setConfirming(false)} aria-label={copy.keep}><X size={16}/></button></div>
    <label className={styles.cancelReason}><span>{copy.reason}</span><input value={reason} onChange={(event)=>setReason(event.target.value)} maxLength={1000}/></label>
    {error&&<p className={styles.cancelError}>{error}</p>}
    <div className={styles.cancelActions}><button type="button" className={styles.keepButton} onClick={()=>setConfirming(false)} disabled={loading}><CheckCircle2 size={15}/>{copy.keep}</button><button type="button" className={styles.confirmCancelButton} onClick={cancel} disabled={loading}><XCircle size={15}/>{loading?copy.loading:copy.confirm}</button></div>
  </div>;
}
