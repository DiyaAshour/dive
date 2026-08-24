"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {Locale} from "@/lib/i18n";

type RatePlan={id:string;name:string;code:string;allowPayNow:boolean;allowPayAtHotel:boolean;cancellationPolicy:{name:string}|null};
type RoomType={id:string;name:string;code:string;ratePlans:RatePlan[]};

export default function SetupManager({hotelId,roomTypes,overbookingEnabled,locale}:{hotelId:string;roomTypes:RoomType[];overbookingEnabled:boolean;locale:Locale}) {
  const ar=locale==="ar";
  const router=useRouter();
  const [message,setMessage]=useState<string|null>(null);
  const ratePlans=useMemo(()=>roomTypes.flatMap((room)=>room.ratePlans.map((plan)=>({...plan,roomTypeId:room.id,roomName:room.name}))),[roomTypes]);

  async function post(path:string,body:unknown,method="POST") {
    setMessage(null);
    const response=await fetch(path,{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const result=await response.json();
    if(!response.ok) throw new Error(result?.error?.message??(ar?"فشل الطلب":"Request failed"));
    setMessage(ar?"تم الحفظ بنجاح":"Saved successfully");
    router.refresh();
  }

  async function createRatePlan(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=new FormData(event.currentTarget);
    try{await post(`/api/v1/hotels/${hotelId}/rate-plans`,{roomTypeId:form.get("roomTypeId"),name:form.get("name"),code:form.get("code"),refundable:form.get("refundable")==="on",mealPlan:form.get("mealPlan"),allowPayNow:form.get("allowPayNow")==="on",allowPayAtHotel:form.get("allowPayAtHotel")==="on"});event.currentTarget.reset();}catch(cause){setMessage(cause instanceof Error?cause.message:"Request failed");}
  }

  async function updateCancellation(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=new FormData(event.currentTarget);const ratePlanId=String(form.get("ratePlanId")??"");
    const freeDays=Number(form.get("freeDays"));const latePenalty=String(form.get("latePenalty"));const noShowPenalty=String(form.get("noShowPenalty"));
    const rules=freeDays>0?[{minimumDaysBeforeArrival:freeDays,penaltyType:"NONE",penaltyValue:null},{minimumDaysBeforeArrival:0,penaltyType:latePenalty,penaltyValue:null}]:[{minimumDaysBeforeArrival:0,penaltyType:latePenalty,penaltyValue:null}];
    try{await post(`/api/v1/hotels/${hotelId}/rate-plans/${ratePlanId}/cancellation-policy`,{name:String(form.get("policyName")),rules,noShowPenaltyType:noShowPenalty,noShowPenaltyValue:null},"PUT");}catch(cause){setMessage(cause instanceof Error?cause.message:"Request failed");}
  }

  async function updateCalendar(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=new FormData(event.currentTarget);const ratePlanId=String(form.get("ratePlanId")??"");const plan=ratePlans.find((item)=>item.id===ratePlanId);if(!plan)return setMessage(ar?"اختر خطة سعر صالحة":"Select a valid rate plan");
    try{await post(`/api/v1/hotels/${hotelId}/calendar`,{entries:[{date:form.get("date"),roomTypeId:plan.roomTypeId,ratePlanId,baseRate:Number(form.get("baseRate")),available:Number(form.get("available")),overbookingLimit:Number(form.get("overbookingLimit")),minStay:Number(form.get("minStay")),maxStay:null,closed:false,stopSell:form.get("stopSell")==="on"}]},"PUT");}catch(cause){setMessage(cause instanceof Error?cause.message:"Request failed");}
  }

  return <div className="setupGrid" aria-label={ar?"إعداد الغرف والأسعار":"Rooms and rates setup"}>
    <section className="panel setupPanel"><span className="eyebrow">{ar?"الخطوة 2":"Step 2"}</span><h2>{ar?"استوديو منتج الغرفة":"Room Product Studio"}</h2><p className="muted">{ar?"أنشئ الغرفة أو عدّلها مع السعة، توزيع الأسرّة، المساحة، المرافق والصور. ما تحفظه هناك يظهر مباشرة في بطاقة الغرفة للضيف.":"Create or edit rooms with occupancy, bed layout, size, facilities and room photos. The saved product feeds the guest room card directly."}</p><Link className="primaryButton" href={`/hotel-dashboard/rooms?hotelId=${hotelId}`}>{ar?"إدارة الغرف":"Manage rooms"}</Link><div className="setupList">{roomTypes.map((room)=><div key={room.id}><strong>{room.name}</strong><span>{room.code} · {room.ratePlans.length} {ar?"خطط":"plans"}</span></div>)}</div></section>
    <section className="panel setupPanel"><span className="eyebrow">{ar?"الخطوة 3":"Step 3"}</span><h2>{ar?"خطط الأسعار":"Rate plans"}</h2><form onSubmit={createRatePlan} className="stackForm"><select name="roomTypeId" required defaultValue=""><option value="" disabled>{ar?"اختر نوع الغرفة":"Select room type"}</option>{roomTypes.map((room)=><option key={room.id} value={room.id}>{room.name}</option>)}</select><input name="name" placeholder={ar?"إفطار مرن":"Breakfast Flexible"} required/><input name="code" placeholder="BF-FLEX" required/><select name="mealPlan" defaultValue="BREAKFAST"><option value="ROOM_ONLY">{ar?"غرفة فقط":"Room only"}</option><option value="BREAKFAST">{ar?"إفطار":"Breakfast"}</option><option value="HALF_BOARD">{ar?"إقامة نصفية":"Half board"}</option><option value="FULL_BOARD">{ar?"إقامة كاملة":"Full board"}</option></select><label className="inlineCheck"><input type="checkbox" name="refundable" defaultChecked/> {ar?"قابل للاسترداد":"Refundable"}</label><label className="inlineCheck"><input type="checkbox" name="allowPayAtHotel" defaultChecked/> {ar?"السماح بالدفع في الفندق":"Allow pay at hotel"}</label><label className="inlineCheck"><input type="checkbox" name="allowPayNow" defaultChecked/> {ar?"السماح بالدفع الآن":"Allow pay now"}</label><button className="primaryButton" disabled={roomTypes.length===0}>{ar?"إضافة خطة سعر":"Add rate plan"}</button></form></section>
    <section className="panel setupPanel"><span className="eyebrow">{ar?"الخطوة 4":"Step 4"}</span><h2>{ar?"سياسة الإلغاء":"Cancellation policy"}</h2><form onSubmit={updateCancellation} className="stackForm"><select name="ratePlanId" required defaultValue=""><option value="" disabled>{ar?"اختر خطة السعر":"Select rate plan"}</option>{ratePlans.map((plan)=><option key={plan.id} value={plan.id}>{plan.roomName} · {plan.name}</option>)}</select><input name="policyName" placeholder={ar?"مرن ليوم واحد":"Flexible 1 day"} required/><label>{ar?"أيام الإلغاء المجاني قبل الوصول":"Free cancellation days before arrival"}<input name="freeDays" type="number" min="0" max="365" defaultValue="1" required/></label><select name="latePenalty" defaultValue="FIRST_NIGHT"><option value="NONE">{ar?"لا غرامة متأخرة":"No late penalty"}</option><option value="FIRST_NIGHT">{ar?"الليلة الأولى":"First night"}</option><option value="FULL_STAY">{ar?"الإقامة كاملة":"Full stay"}</option></select><select name="noShowPenalty" defaultValue="FULL_STAY"><option value="FIRST_NIGHT">{ar?"عدم الحضور: الليلة الأولى":"No-show: first night"}</option><option value="FULL_STAY">{ar?"عدم الحضور: الإقامة كاملة":"No-show: full stay"}</option></select><button className="primaryButton" disabled={ratePlans.length===0}>{ar?"حفظ سياسة الإلغاء":"Save cancellation policy"}</button></form><div className="setupList">{ratePlans.map((plan)=><div key={plan.id}><strong>{plan.name}</strong><span>{plan.cancellationPolicy?.name??(ar?"السياسة مطلوبة":"Policy required")} · {plan.allowPayAtHotel?(ar?"الدفع في الفندق":"Pay at hotel"):""}{plan.allowPayAtHotel&&plan.allowPayNow?" + ":""}{plan.allowPayNow?(ar?"الدفع الآن":"Pay now"):""}</span></div>)}</div></section>
    <section className="panel setupPanel wideSetup"><span className="eyebrow">{ar?"الخطوة 5":"Step 5"}</span><h2>{ar?"أول يوم سعر ومخزون":"First rate & inventory day"}</h2><form onSubmit={updateCalendar} className="calendarForm"><label>{ar?"التاريخ":"Date"}<input name="date" type="date" required/></label><label>{ar?"خطة السعر":"Rate plan"}<select name="ratePlanId" required defaultValue=""><option value="" disabled>{ar?"اختر خطة":"Select plan"}</option>{ratePlans.map((plan)=><option value={plan.id} key={plan.id}>{plan.roomName} · {plan.name}</option>)}</select></label><label>{ar?"السعر الأساسي":"Base rate"}<input name="baseRate" type="number" min="0" step="0.01" required/></label><label>{ar?"المتاح":"Available"}<input name="available" type="number" min="0" required/></label><label>{ar?"الحد الأدنى للإقامة":"Min stay"}<input name="minStay" type="number" min="1" defaultValue="1" required/></label><label>{ar?"حد الحجز الزائد":"Overbooking limit"}<input name="overbookingLimit" type="number" min="0" defaultValue="0" disabled={!overbookingEnabled} required/></label><label className="inlineCheck"><input name="stopSell" type="checkbox"/> {ar?"إيقاف البيع":"Stop sell"}</label><button className="primaryButton" disabled={ratePlans.length===0}>{ar?"حفظ يوم التقويم":"Save calendar day"}</button></form>{!overbookingEnabled&&<p className="muted">{ar?"الحجز الزائد معطل على مستوى الفندق، لذلك الحقل مقفل.":"Overbooking is disabled at hotel level, so this field is intentionally locked."}</p>}</section>
    {message&&<div className="setupMessage">{message}</div>}
  </div>;
}
