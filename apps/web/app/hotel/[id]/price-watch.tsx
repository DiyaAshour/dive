"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type RoomOption={roomTypeId:string;roomName:string;currentTotal:number};
type Props={locale:Locale;hotelId:string;arrival:string;departure:string;adults:number;children:number;currentTotal:number;currency:string};

export function PriceWatch({locale,hotelId,arrival,departure,adults,children,currentTotal,currency}:Props){
  const [rooms,setRooms]=useState<RoomOption[]>([]);
  const [selectedRoomTypeId,setSelectedRoomTypeId]=useState("");
  const [loadingRooms,setLoadingRooms]=useState(true);
  const [optionsError,setOptionsError]=useState<string|null>(null);
  const [target,setTarget]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [success,setSuccess]=useState(false);
  const ar=locale==="ar";
  const selectedRoom=rooms.find((room)=>room.roomTypeId===selectedRoomTypeId)??null;
  const selectedTotal=selectedRoom?.currentTotal??currentTotal;

  useEffect(()=>{
    let cancelled=false;
    async function loadRooms(){
      setLoadingRooms(true);setOptionsError(null);setSelectedRoomTypeId("");setMessage(null);setSuccess(false);
      try{
        const query=new URLSearchParams({hotelId,arrival,departure,adults:String(adults),children:String(children)});
        const response=await fetch(`/api/v1/price-watch-options?${query.toString()}`);
        const payload=await response.json().catch(()=>null);
        if(!response.ok||payload?.error)throw new Error(payload?.error?.message||(ar?"تعذر تحميل أنواع الغرف":"Unable to load room types"));
        const nextRooms=Array.isArray(payload?.data?.rooms)?payload.data.rooms as RoomOption[]:[];
        if(!cancelled){setRooms(nextRooms);if(nextRooms.length===0)setOptionsError(ar?"لا توجد غرف متاحة للمراقبة لهذه التواريخ.":"No room types are available to watch for these dates.");}
      }catch(error){if(!cancelled){setRooms([]);setOptionsError(error instanceof Error?error.message:(ar?"تعذر تحميل أنواع الغرف":"Unable to load room types"));}}
      finally{if(!cancelled)setLoadingRooms(false);}
    }
    void loadRooms();
    return ()=>{cancelled=true;};
  },[hotelId,arrival,departure,adults,children,ar]);

  async function watch(){
    if(!selectedRoom){setSuccess(false);setMessage(ar?"اختر نوع الغرفة التي تريد متابعة سعرها أولًا.":"Choose the room type you want to track first.");return;}
    setBusy(true);setMessage(null);setSuccess(false);
    try{
      const parsedTarget=target.trim()?Number(target):undefined;
      const response=await fetch("/api/v1/price-watches",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({hotelId,roomTypeId:selectedRoom.roomTypeId,arrival,departure,adults,children,...(parsedTarget!==undefined?{targetTotal:parsedTarget}:{})})});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||payload?.error)throw new Error(payload?.error?.message||(ar?"تعذر إنشاء مراقبة السعر":"Unable to create price watch"));
      setSuccess(true);setMessage(ar?`تم تفعيل مراقبة سعر ${selectedRoom.roomName}. سنراقب هذا النوع من الغرف فقط ولن ننتقل إلى نوع آخر.`:`Price watch active for ${selectedRoom.roomName}. We will track this room type only and will not switch to another type.`);
    }catch(error){setMessage(error instanceof Error?error.message:(ar?"تعذر إنشاء مراقبة السعر":"Unable to create price watch"));}finally{setBusy(false);}
  }

  return <div className="panel priceWatchPanel" style={{marginTop:20}}>
    <span className="eyebrow">{ar?"مراقبة السعر":"Price watch"}</span>
    <h3>{ar?"اختر الغرفة التي تريد متابعة سعرها":"Choose which room price to track"}</h3>
    <p className="muted">{selectedRoom
      ? (ar?`السعر المباشر الحالي لـ ${selectedRoom.roomName}: ${selectedTotal.toFixed(2)} ${currency}. سنقارن أي انخفاضات مستقبلية بنفس نوع الغرفة فقط.`:`Current live price for ${selectedRoom.roomName}: ${selectedTotal.toFixed(2)} ${currency}. Future drops will be compared only against this room type.`)
      : (ar?"اختر نوع الغرفة أولًا، وبعدها يمكنك وضع إجمالي مستهدف اختياري أو تركه فارغًا لمراقبة أي سعر أدنى جديد.":"Choose a room type first, then set an optional target total or leave it blank to watch for a new low.")}</p>
    <div style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}>
      <label style={{minWidth:260,flex:"1 1 260px"}}>{ar?"نوع الغرفة":"Room type"}
        <select value={selectedRoomTypeId} disabled={loadingRooms||rooms.length===0} onChange={(event)=>{setSelectedRoomTypeId(event.target.value);setMessage(null);setSuccess(false);setTarget("");}}>
          <option value="">{loadingRooms?(ar?"جارٍ تحميل الغرف…":"Loading rooms…"):(ar?"اختر نوع الغرفة":"Choose a room type")}</option>
          {rooms.map((room)=><option key={room.roomTypeId} value={room.roomTypeId}>{room.roomName} · {room.currentTotal.toFixed(2)} {currency}</option>)}
        </select>
      </label>
      <label style={{minWidth:220}}>{ar?"إجمالي مستهدف اختياري":"Optional target total"}<input type="number" min="0.01" step="0.01" value={target} disabled={!selectedRoom} onChange={(event)=>setTarget(event.target.value)} placeholder={selectedRoom?selectedTotal.toFixed(2):currentTotal.toFixed(2)}/></label>
      <button type="button" className="secondaryButton" disabled={busy||loadingRooms||!selectedRoom} onClick={watch}>{busy?(ar?"جارٍ بدء المراقبة…":"Starting watch…"):(ar?"راقب سعر هذه الغرفة":"Watch this room price")}</button>
    </div>
    {optionsError&&<p className="danger">{optionsError}</p>}
    {message&&<p className={success?"status":"danger"}>{message}</p>}
  </div>;
}
