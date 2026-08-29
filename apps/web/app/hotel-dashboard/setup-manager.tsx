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
    if(!response.ok) throw new Error(result?.error?.message??(ar?"تعذر الحفظ. راجع الحقول وحاول مرة أخرى.":"Unable to save. Check the fields and try again."));
    setMessage(ar?"تم الحفظ بنجاح. تم تحديث جاهزية النشر تلقائيًا.":"Saved successfully. Publishing readiness was updated automatically.");
    router.refresh();
  }

  async function createRatePlan(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const roomTypeId=String(form.get("roomTypeId")??"");
    const name=String(form.get("name")??"").trim();
    try{
      await post(`/api/v1/hotels/${hotelId}/rate-plans`,{
        roomTypeId,
        name,
        code:`PLAN_${stableCode(`${roomTypeId}:${name}`)}`,
        refundable:form.get("refundable")==="on",
        mealPlan:form.get("mealPlan"),
        allowPayNow:form.get("allowPayNow")==="on",
        allowPayAtHotel:form.get("allowPayAtHotel")==="on",
      });
      event.currentTarget.reset();
    }catch(cause){setMessage(cause instanceof Error?cause.message:(ar?"تعذر إضافة خيار السعر":"Unable to add rate plan"));}
  }

  async function updateCancellation(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const ratePlanId=String(form.get("ratePlanId")??"");
    const freeDays=Number(form.get("freeDays"));
    const latePenalty=String(form.get("latePenalty"));
    const noShowPenalty=String(form.get("noShowPenalty"));
    const rules=freeDays>0?[{minimumDaysBeforeArrival:freeDays,penaltyType:"NONE",penaltyValue:null},{minimumDaysBeforeArrival:0,penaltyType:latePenalty,penaltyValue:null}]:[{minimumDaysBeforeArrival:0,penaltyType:latePenalty,penaltyValue:null}];
    try{await post(`/api/v1/hotels/${hotelId}/rate-plans/${ratePlanId}/cancellation-policy`,{name:String(form.get("policyName")),rules,noShowPenaltyType:noShowPenalty,noShowPenaltyValue:null},"PUT");}catch(cause){setMessage(cause instanceof Error?cause.message:(ar?"تعذر حفظ سياسة الإلغاء":"Unable to save cancellation policy"));}
  }

  async function updateCalendar(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const ratePlanId=String(form.get("ratePlanId")??"");
    const plan=ratePlans.find((item)=>item.id===ratePlanId);
    if(!plan)return setMessage(ar?"اختر خيار سعر أولًا":"Select a rate option first");
    try{await post(`/api/v1/hotels/${hotelId}/calendar`,{entries:[{date:form.get("date"),roomTypeId:plan.roomTypeId,ratePlanId,baseRate:Number(form.get("baseRate")),available:Number(form.get("available")),overbookingLimit:overbookingEnabled?Number(form.get("overbookingLimit")??0):0,minStay:Number(form.get("minStay")),maxStay:null,closed:false,stopSell:form.get("stopSell")==="on"}]},"PUT");}catch(cause){setMessage(cause instanceof Error?cause.message:(ar?"تعذر حفظ السعر والمخزون":"Unable to save rate and inventory"));}
  }

  return <div className="setupGrid" aria-label={ar?"إعداد الغرف والأسعار":"Rooms and rates setup"}>
    <section className="panel setupPanel">
      <span className="eyebrow">{ar?"الخطوة 3 من 4 · الغرف":"Step 3 of 4 · Rooms"}</span>
      <h2>{ar?"أنواع الغرف":"Room types"}</h2>
      <p className="muted">{ar?"ابدأ بإنشاء الغرف التي يقدر الضيف يحجزها، مثل: غرفة كينغ، غرفة توأم، جناح. داخل كل غرفة تحدد السعة، الأسرّة، المساحة، المرافق والصور.":"Start by creating the rooms guests can book, such as King Room, Twin Room or Suite. Each room includes occupancy, beds, size, facilities and photos."}</p>
      <Link className="primaryButton" href={`/hotel-dashboard/rooms?hotelId=${hotelId}`}>{ar?"فتح إدارة الغرف":"Open room management"}</Link>
      <div className="setupList">{roomTypes.length===0?<div><strong>{ar?"لا توجد غرف بعد":"No rooms yet"}</strong><span>{ar?"اضغط «فتح إدارة الغرف» وأنشئ أول غرفة.":"Open room management and create the first room."}</span></div>:roomTypes.map((room)=><div key={room.id}><strong>{room.name}</strong><span>{room.ratePlans.length} {ar?"خيارات سعر مرتبطة":"rate options linked"}</span></div>)}</div>
    </section>

    <section className="panel setupPanel">
      <span className="eyebrow">{ar?"بعد إنشاء الغرف":"After rooms"}</span>
      <h2>{ar?"أضف خيار سعر للغرفة":"Add a bookable rate option"}</h2>
      <p className="muted">{ar?"خيار السعر هو ما يختاره الضيف عند الحجز، مثل «غرفة مع إفطار مرن» أو «سعر غير مسترد». النظام ينشئ الكود الداخلي تلقائيًا.":"A rate option is what guests choose when booking, such as “Flexible with breakfast” or “Non-refundable”. Internal codes are generated automatically."}</p>
      <form onSubmit={createRatePlan} className="stackForm">
        <label>{ar?"لأي غرفة؟":"Which room?"}<select name="roomTypeId" required defaultValue=""><option value="" disabled>{ar?"اختر الغرفة":"Choose room"}</option>{roomTypes.map((room)=><option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
        <label>{ar?"اسم خيار السعر":"Rate option name"}<span className="fieldHelp">{ar?"مثال: مرن مع الإفطار":"Example: Flexible with breakfast"}</span><input name="name" placeholder={ar?"مرن مع الإفطار":"Flexible with breakfast"} required/></label>
        <label>{ar?"الوجبات المشمولة":"Meals included"}<select name="mealPlan" defaultValue="BREAKFAST"><option value="ROOM_ONLY">{ar?"بدون وجبات":"Room only"}</option><option value="BREAKFAST">{ar?"إفطار مشمول":"Breakfast included"}</option><option value="HALF_BOARD">{ar?"إفطار + وجبة أخرى":"Half board"}</option><option value="FULL_BOARD">{ar?"ثلاث وجبات":"Full board"}</option></select></label>
        <label className="inlineCheck"><input type="checkbox" name="refundable" defaultChecked/> {ar?"يمكن للضيف الإلغاء حسب السياسة":"Refundable according to policy"}</label>
        <label className="inlineCheck"><input type="checkbox" name="allowPayAtHotel" defaultChecked/> {ar?"السماح بالدفع في الفندق":"Allow payment at hotel"}</label>
        <label className="inlineCheck"><input type="checkbox" name="allowPayNow" defaultChecked/> {ar?"السماح بالدفع أونلاين الآن":"Allow online payment now"}</label>
        <button className="primaryButton" disabled={roomTypes.length===0}>{ar?"إضافة خيار السعر":"Add rate option"}</button>
      </form>
      {roomTypes.length===0&&<p className="muted">{ar?"أنشئ غرفة أولًا حتى تقدر تضيف خيار سعر.":"Create a room first before adding a rate option."}</p>}
    </section>

    <section className="panel setupPanel">
      <span className="eyebrow">{ar?"قواعد الإلغاء":"Cancellation rules"}</span>
      <h2>{ar?"حدد ماذا يحدث إذا ألغى الضيف":"Choose what happens when a guest cancels"}</h2>
      <form onSubmit={updateCancellation} className="stackForm">
        <label>{ar?"خيار السعر":"Rate option"}<select name="ratePlanId" required defaultValue=""><option value="" disabled>{ar?"اختر خيار السعر":"Choose rate option"}</option>{ratePlans.map((plan)=><option key={plan.id} value={plan.id}>{plan.roomName} · {plan.name}</option>)}</select></label>
        <label>{ar?"اسم السياسة":"Policy name"}<span className="fieldHelp">{ar?"مثال: إلغاء مجاني حتى يوم قبل الوصول":"Example: Free cancellation until 1 day before arrival"}</span><input name="policyName" placeholder={ar?"مرنة - يوم واحد":"Flexible - 1 day"} required/></label>
        <label>{ar?"كم يوم قبل الوصول يكون الإلغاء مجانيًا؟":"How many days before arrival is cancellation free?"}<input name="freeDays" type="number" min="0" max="365" defaultValue="1" required/></label>
        <label>{ar?"إذا ألغى بعد فترة الإلغاء المجاني":"If cancelled after the free period"}<select name="latePenalty" defaultValue="FIRST_NIGHT"><option value="NONE">{ar?"بدون غرامة":"No penalty"}</option><option value="FIRST_NIGHT">{ar?"تحصيل قيمة الليلة الأولى":"Charge first night"}</option><option value="FULL_STAY">{ar?"تحصيل قيمة الإقامة كاملة":"Charge full stay"}</option></select></label>
        <label>{ar?"إذا لم يحضر الضيف نهائيًا":"If the guest does not show up"}<select name="noShowPenalty" defaultValue="FULL_STAY"><option value="FIRST_NIGHT">{ar?"تحصيل قيمة الليلة الأولى":"Charge first night"}</option><option value="FULL_STAY">{ar?"تحصيل قيمة الإقامة كاملة":"Charge full stay"}</option></select></label>
        <button className="primaryButton" disabled={ratePlans.length===0}>{ar?"حفظ سياسة الإلغاء":"Save cancellation policy"}</button>
      </form>
      <div className="setupList">{ratePlans.map((plan)=><div key={plan.id}><strong>{plan.roomName} · {plan.name}</strong><span>{plan.cancellationPolicy?.name??(ar?"⚠ سياسة الإلغاء ما زالت مطلوبة":"⚠ Cancellation policy still required")}</span></div>)}</div>
    </section>

    <section className="panel setupPanel wideSetup">
      <span className="eyebrow">{ar?"السعر والمخزون":"Rate & inventory"}</span>
      <h2>{ar?"حدد سعر الغرفة وعدد الغرف المتاحة":"Set the room price and how many rooms are available"}</h2>
      <p className="muted">{ar?"اختر يومًا، اختر خيار السعر، اكتب سعر الليلة وعدد الغرف التي تريد بيعها في هذا اليوم. بعد أول يوم يمكنك إدارة الفترات من صفحة الأسعار والمخزون.":"Choose a date and rate option, enter the nightly price and how many rooms you want to sell that day. After the first day you can manage date ranges from Rates & Inventory."}</p>
      <form onSubmit={updateCalendar} className="calendarForm">
        <label>{ar?"التاريخ":"Date"}<input name="date" type="date" required/></label>
        <label>{ar?"الغرفة وخيار السعر":"Room & rate option"}<select name="ratePlanId" required defaultValue=""><option value="" disabled>{ar?"اختر الخيار":"Choose option"}</option>{ratePlans.map((plan)=><option value={plan.id} key={plan.id}>{plan.roomName} · {plan.name}</option>)}</select></label>
        <label>{ar?"سعر الليلة":"Price per night"}<input name="baseRate" type="number" min="0" step="0.01" placeholder="100" required/></label>
        <label>{ar?"عدد الغرف المتاحة للبيع":"Rooms available to sell"}<input name="available" type="number" min="0" placeholder="5" required/></label>
        <label>{ar?"أقل عدد ليالٍ للحجز":"Minimum nights"}<input name="minStay" type="number" min="1" defaultValue="1" required/></label>
        {overbookingEnabled&&<label>{ar?"حجز زائد مسموح":"Overbooking allowed"}<span className="fieldHelp">{ar?"اتركه 0 إذا لا تريد بيع أكثر من المخزون الفعلي":"Leave 0 to never sell above physical inventory"}</span><input name="overbookingLimit" type="number" min="0" defaultValue="0" required/></label>}
        <label className="inlineCheck"><input name="stopSell" type="checkbox"/> {ar?"لا تبيع هذا الخيار في هذا اليوم":"Do not sell this option on this date"}</label>
        <button className="primaryButton" disabled={ratePlans.length===0}>{ar?"حفظ السعر والمخزون":"Save rate & inventory"}</button>
      </form>
      {ratePlans.length===0&&<p className="muted">{ar?"أضف خيار سعر أولًا حتى تقدر تفتح البيع.":"Add a rate option first before opening inventory."}</p>}
    </section>

    {message&&<div className="setupMessage">{message}</div>}
  </div>;
}

function stableCode(value:string){
  let hash=2166136261;
  for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(36).toUpperCase();
}
