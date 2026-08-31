"use client";

import { useEffect, useState } from "react";
import { BedDouble, ChevronDown, Minus, Plus, Target } from "lucide-react";
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

  function updateTarget(nextValue:string){
    const compact=nextValue.replace(/[\s,]/g,"");
    if(compact===""||/^(?:\d+\.?\d{0,2}|\.\d{1,2})$/.test(compact))setTarget(compact);
  }

  function stepTarget(delta:number){
    if(!selectedRoom)return;
    const base=target.trim()===""?selectedTotal:Number(target);
    if(!Number.isFinite(base))return;
    const next=Math.max(0.01,Math.round((base+delta)*100)/100);
    setTarget(String(next));
    setMessage(null);setSuccess(false);
  }

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

  const controlsDisabled=loadingRooms||rooms.length===0;
  const targetPlaceholder=String(selectedRoom?selectedTotal:currentTotal);

  return <div className="panel priceWatchPanel priceWatchPanelModern" style={{marginTop:20}}>
    <style>{`
      .priceWatchPanelModern .priceWatchControls{display:grid;grid-template-columns:minmax(280px,1.25fr) minmax(250px,.85fr) auto;gap:14px;align-items:end;margin-top:18px}
      .priceWatchPanelModern .priceWatchField{display:grid;gap:7px;min-width:0}
      .priceWatchPanelModern .priceWatchFieldLabel{font-size:11px;font-weight:850;letter-spacing:.01em;color:#435a70;padding-inline:2px}
      .priceWatchPanelModern .priceWatchControl{position:relative;display:flex;align-items:center;height:52px;border:1px solid #cedbe7;border-radius:14px;background:linear-gradient(180deg,#fff 0%,#f9fbfd 100%);box-shadow:0 5px 15px rgba(18,48,73,.055),inset 0 1px 0 rgba(255,255,255,.9);transition:border-color .16s ease,box-shadow .16s ease,background .16s ease,transform .16s ease;overflow:hidden}
      .priceWatchPanelModern .priceWatchControl:hover:not(.isDisabled){border-color:#aebfd0;background:#fff;box-shadow:0 7px 18px rgba(18,48,73,.075)}
      .priceWatchPanelModern .priceWatchControl:focus-within{border-color:#1770cf;background:#fff;box-shadow:0 0 0 4px rgba(23,112,207,.11),0 8px 22px rgba(18,48,73,.08)}
      .priceWatchPanelModern .priceWatchControl.isDisabled{opacity:.56;background:#f3f6f8;box-shadow:none}
      .priceWatchPanelModern .priceWatchLeadIcon{position:absolute;inset-inline-start:15px;color:#52718d;pointer-events:none;z-index:2}
      .priceWatchPanelModern .priceWatchSelect{width:100%;height:100%;border:0!important;outline:0!important;background:transparent!important;box-shadow:none!important;appearance:none;-webkit-appearance:none;padding:0 44px!important;padding-inline-start:46px!important;padding-inline-end:42px!important;color:#15324b;font-size:13px;font-weight:760;cursor:pointer}
      .priceWatchPanelModern .priceWatchSelect:disabled{cursor:not-allowed;color:#718397}
      .priceWatchPanelModern .priceWatchChevron{position:absolute;inset-inline-end:14px;color:#607a91;pointer-events:none}
      .priceWatchPanelModern .priceWatchTargetInput{min-width:0;flex:1;height:100%;border:0!important;outline:0!important;background:transparent!important;box-shadow:none!important;padding:0 9px 0 46px!important;color:#102f49;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;direction:ltr;text-align:left}
      [dir="rtl"] .priceWatchPanelModern .priceWatchTargetInput{padding:0 46px 0 9px!important}
      .priceWatchPanelModern .priceWatchTargetInput::placeholder{color:#91a0ad;font-weight:650;opacity:1}
      .priceWatchPanelModern .priceWatchCurrency{display:inline-flex;align-items:center;height:28px;padding:0 8px;margin-inline:4px 5px;border-radius:8px;background:#edf4fa;color:#355873;font-size:9px;font-weight:900;letter-spacing:.04em;white-space:nowrap}
      .priceWatchPanelModern .priceWatchStepper{display:flex;align-self:stretch;border-inline-start:1px solid #d8e2eb;background:#f5f8fb}
      .priceWatchPanelModern .priceWatchStepButton{width:34px;border:0;background:transparent;color:#31536e;display:grid;place-items:center;cursor:pointer;transition:background .14s ease,color .14s ease}
      .priceWatchPanelModern .priceWatchStepButton+ .priceWatchStepButton{border-inline-start:1px solid #d8e2eb}
      .priceWatchPanelModern .priceWatchStepButton:hover:not(:disabled){background:#e8f2fb;color:#0e63ad}
      .priceWatchPanelModern .priceWatchStepButton:disabled{cursor:not-allowed;opacity:.45}
      .priceWatchPanelModern .priceWatchSubmit{height:52px!important;min-width:168px!important;border-radius:14px!important;padding:0 20px!important;white-space:nowrap;box-shadow:0 7px 18px rgba(13,53,86,.12)!important;transition:transform .16s ease,box-shadow .16s ease!important}
      .priceWatchPanelModern .priceWatchSubmit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 22px rgba(13,53,86,.17)!important}
      @media(max-width:900px){.priceWatchPanelModern .priceWatchControls{grid-template-columns:1fr 1fr}.priceWatchPanelModern .priceWatchSubmit{grid-column:1/-1;width:100%}}
      @media(max-width:620px){.priceWatchPanelModern .priceWatchControls{grid-template-columns:1fr;gap:11px}.priceWatchPanelModern .priceWatchSubmit{grid-column:auto}.priceWatchPanelModern .priceWatchControl{height:50px}}
    `}</style>
    <span className="eyebrow">{copy.eyebrow}</span>
    <h3>{copy.title}</h3>
    <p className="muted">{selectedRoom?copy.current(selectedRoom.roomName,selectedTotal.toFixed(2),currency):copy.intro}</p>
    <div className="priceWatchControls">
      <label className="priceWatchField">
        <span className="priceWatchFieldLabel">{copy.roomType}</span>
        <span className={`priceWatchControl ${controlsDisabled?"isDisabled":""}`}>
          <BedDouble className="priceWatchLeadIcon" size={18} strokeWidth={1.9}/>
          <select className="priceWatchSelect" value={selectedRoomTypeId} disabled={controlsDisabled} onChange={(event)=>{setSelectedRoomTypeId(event.target.value);setMessage(null);setSuccess(false);setTarget("");}}>
            <option value="">{loadingRooms?copy.loading:copy.chooseRoom}</option>
            {rooms.map((room)=><option key={room.roomTypeId} value={room.roomTypeId}>{room.roomName} · {room.currentTotal.toFixed(2)} {currency}</option>)}
          </select>
          <ChevronDown className="priceWatchChevron" size={17} strokeWidth={2}/>
        </span>
      </label>
      <label className="priceWatchField">
        <span className="priceWatchFieldLabel">{copy.optionalTarget}</span>
        <span className={`priceWatchControl ${!selectedRoom?"isDisabled":""}`}>
          <Target className="priceWatchLeadIcon" size={17} strokeWidth={1.9}/>
          <input className="priceWatchTargetInput" type="text" inputMode="decimal" autoComplete="off" value={target} disabled={!selectedRoom} onChange={(event)=>updateTarget(event.target.value)} onFocus={(event)=>event.currentTarget.select()} placeholder={targetPlaceholder} aria-label={copy.optionalTarget}/>
          <span className="priceWatchCurrency">{currency}</span>
          <span className="priceWatchStepper" aria-hidden={!selectedRoom}>
            <button type="button" className="priceWatchStepButton" disabled={!selectedRoom} onClick={()=>stepTarget(-1)} aria-label={`${copy.optionalTarget} -1`}><Minus size={14}/></button>
            <button type="button" className="priceWatchStepButton" disabled={!selectedRoom} onClick={()=>stepTarget(1)} aria-label={`${copy.optionalTarget} +1`}><Plus size={14}/></button>
          </span>
        </span>
      </label>
      <button type="button" className="secondaryButton priceWatchSubmit" disabled={busy||loadingRooms||!selectedRoom} onClick={watch}>{busy?copy.starting:copy.watchButton}</button>
    </div>
    {optionsError&&<p className="danger">{optionsError}</p>}
    {message&&<p className={success?"status":"danger"}>{message}</p>}
  </div>;
}
