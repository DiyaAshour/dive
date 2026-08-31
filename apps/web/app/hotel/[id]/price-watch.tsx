"use client";

import { useEffect, useState } from "react";
import { localeFromLanguageTag, type GuestLocale } from "@/lib/guest-market";
import { priceWatchUiCopy } from "@/lib/price-watch-ui-copy";

type RoomOption={roomTypeId:string;roomName:string;currentTotal:number};
type Props={locale:GuestLocale;hotelId:string;arrival:string;departure:string;adults:number;children:number;currentTotal:number;currency:string};

export function PriceWatch({locale,hotelId,arrival,departure,adults,children,currentTotal,currency}:Props){
  const [effectiveLocale,setEffectiveLocale]=useState<GuestLocale>(locale);
  const [rooms,setRooms]=useState<RoomOption[]>([]);
  const [selectedRoomTypeId,setSelectedRoomTypeId]=useState("");
  const [loadingRooms,setLoadingRooms]=useState(true);
  const [optionsError,setOptionsError]=useState<string|null>(null);
  const [target,setTarget]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [success,setSuccess]=useState(false);
  const copy=priceWatchUiCopy(effectiveLocale);
  const selectedRoom=rooms.find((room)=>room.roomTypeId===selectedRoomTypeId)??null;
  const selectedTotal=selectedRoom?.currentTotal??currentTotal;

  useEffect(()=>{
    const pageLocale=localeFromLanguageTag(document.querySelector<HTMLElement>(".hotelExperience")?.getAttribute("lang")||document.documentElement.lang);
    setEffectiveLocale(pageLocale??locale);
  },[locale]);

  useEffect(()=>{
    let cancelled=false;
    async function loadRooms(){
      setLoadingRooms(true);setOptionsError(null);setSelectedRoomTypeId("");setMessage(null);setSuccess(false);
      try{
        const query=new URLSearchParams({hotelId,arrival,departure,adults:String(adults),children:String(children)});
        const response=await fetch(`/api/v1/price-watch-options?${query.toString()}`);
        const payload=await response.json().catch(()=>null);
        if(!response.ok||payload?.error)throw new Error(payload?.error?.message||copy.loadFail);
        const nextRooms=Array.isArray(payload?.data?.rooms)?payload.data.rooms as RoomOption[]:[];
        if(!cancelled){setRooms(nextRooms);if(nextRooms.length===0)setOptionsError(copy.noRooms);}
      }catch(error){if(!cancelled){setRooms([]);setOptionsError(error instanceof Error?error.message:copy.loadFail);}}
      finally{if(!cancelled)setLoadingRooms(false);}
    }
    void loadRooms();
    return ()=>{cancelled=true;};
  },[hotelId,arrival,departure,adults,children,copy]);

  async function watch(){
    if(!selectedRoom){setSuccess(false);setMessage(copy.chooseFirst);return;}
    setBusy(true);setMessage(null);setSuccess(false);
    try{
      const parsedTarget=target.trim()?Number(target):undefined;
      const response=await fetch("/api/v1/price-watches",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({hotelId,roomTypeId:selectedRoom.roomTypeId,arrival,departure,adults,children,...(parsedTarget!==undefined?{targetTotal:parsedTarget}:{})})});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||payload?.error)throw new Error(payload?.error?.message||copy.createFail);
      setSuccess(true);setMessage(copy.success(selectedRoom.roomName));
    }catch(error){setMessage(error instanceof Error?error.message:copy.createFail);}finally{setBusy(false);}
  }

  return <div className="panel priceWatchPanel" style={{marginTop:20}}>
    <span className="eyebrow">{copy.eyebrow}</span>
    <h3>{copy.title}</h3>
    <p className="muted">{selectedRoom?copy.current(selectedRoom.roomName,selectedTotal.toFixed(2),currency):copy.intro}</p>
    <div style={{display:"flex",gap:10,alignItems:"end",flexWrap:"wrap"}}>
      <label style={{minWidth:260,flex:"1 1 260px"}}>{copy.roomType}
        <select value={selectedRoomTypeId} disabled={loadingRooms||rooms.length===0} onChange={(event)=>{setSelectedRoomTypeId(event.target.value);setMessage(null);setSuccess(false);setTarget("");}}>
          <option value="">{loadingRooms?copy.loading:copy.chooseRoom}</option>
          {rooms.map((room)=><option key={room.roomTypeId} value={room.roomTypeId}>{room.roomName} · {room.currentTotal.toFixed(2)} {currency}</option>)}
        </select>
      </label>
      <label style={{minWidth:220}}>{copy.optionalTarget}<input type="number" min="0.01" step="0.01" value={target} disabled={!selectedRoom} onChange={(event)=>setTarget(event.target.value)} placeholder={selectedRoom?selectedTotal.toFixed(2):currentTotal.toFixed(2)}/></label>
      <button type="button" className="secondaryButton" disabled={busy||loadingRooms||!selectedRoom} onClick={watch}>{busy?copy.starting:copy.watchButton}</button>
    </div>
    {optionsError&&<p className="danger">{optionsError}</p>}
    {message&&<p className={success?"status":"danger"}>{message}</p>}
  </div>;
}
