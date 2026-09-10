"use client";

import {useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {Cable, Check, CircleAlert, Cloud, Copy, Database, KeyRound, Link2, Loader2, PlugZap, RotateCw, Send, ShieldCheck, Unplug, Webhook} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import styles from "./connectivity.module.css";

type Mapping = {localId: string; externalCode: string};
type Connection = {
  id?: string;
  provider: string;
  status: string;
  environment: string;
  gatewayUrl: string | null;
  enterpriseId: string | null;
  externalHotelCode: string | null;
  roomMappings: unknown[];
  ratePlanMappings: unknown[];
  lastHealthyAt: string | null;
  lastSyncAt?: string | null;
  lastError: string | null;
  credentialsConfigured: boolean;
  apiKeyPrefix?: string | null;
  webhookUrl?: string | null;
} | null;
type Room = {id: string; name: string; code: string; active: boolean; ratePlans: Array<{id: string; name: string; code: string; active: boolean}>};
type Provider = {id: string; name: string; mode: string; available: boolean};
type IssuedCredentials={apiKey:string;webhookSigningSecret?:string;shownOnce?:boolean};

export default function ConnectivityManager({hotelId, locale, initialConnection, rooms, providers}: {hotelId: string; locale: Locale; initialConnection: Connection; rooms: Room[]; providers: Provider[]}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{kind: "ok" | "error"; text: string} | null>(null);
  const [connection, setConnection] = useState(initialConnection);
  const [issued,setIssued]=useState<IssuedCredentials|null>(null);
  const [copied,setCopied]=useState<string|null>(null);
  const initialRoomMappings = asMappings(initialConnection?.roomMappings);
  const initialPlanMappings = asMappings(initialConnection?.ratePlanMappings);
  const [roomMappings, setRoomMappings] = useState<Record<string,string>>(()=>Object.fromEntries(initialRoomMappings.map((item)=>[item.localId,item.externalCode])));
  const [ratePlanMappings, setRatePlanMappings] = useState<Record<string,string>>(()=>Object.fromEntries(initialPlanMappings.map((item)=>[item.localId,item.externalCode])));
  const plans = useMemo(()=>rooms.flatMap((room)=>room.ratePlans.map((plan)=>({...plan, roomName: room.name}))),[rooms]);
  const native=connection?.provider==="HANDMEKEY_API";

  async function api(path: string, init: RequestInit) {
    const response = await fetch(path, {...init, headers: {"content-type": "application/json", ...(init.headers ?? {})}});
    const result = await response.json().catch(()=>null);
    if (!response.ok) throw new Error(result?.error?.message ?? (ar ? "تعذر تنفيذ العملية." : "The operation could not be completed."));
    return result;
  }

  async function createNative(form:FormData){
    setBusy("native");setMessage(null);setIssued(null);
    try{
      const result=await api(`/api/v1/hotels/${hotelId}/connectivity/handmekey`,{method:"PUT",body:JSON.stringify({environment:String(form.get("environment")??"PRODUCTION"),webhookUrl:String(form.get("webhookUrl")??"")})});
      setConnection(result.data?.connection??connection);
      setIssued(result.data?.credentials??null);
      setMessage({kind:"ok",text:ar?"تم تفعيل HandMeKey Connectivity API. انسخ مفتاح API وسر توقيع الـWebhook الآن؛ لن يظهر المفتاح الكامل مرة ثانية.":"HandMeKey Connectivity API is active. Copy the API key and webhook signing secret now; the full API key is only shown once."});
      router.refresh();
    }catch(error){setMessage({kind:"error",text:error instanceof Error?error.message:"API setup failed"});}
    finally{setBusy(null);}
  }

  async function saveWebhook(form:FormData){
    setBusy("webhook");setMessage(null);
    try{
      const value=String(form.get("webhookUrl")??"");
      await api(`/api/v1/hotels/${hotelId}/connectivity/handmekey`,{method:"PATCH",body:JSON.stringify({webhookUrl:value})});
      setConnection((current)=>current?{...current,webhookUrl:value.trim()||null}:current);
      setMessage({kind:"ok",text:ar?"تم حفظ Webhook. حجوزات HandMeKey الجديدة والتعديلات والإلغاءات ستصل إليه تلقائيًا.":"Webhook saved. New HandMeKey reservations, modifications and cancellations will be delivered automatically."});
      router.refresh();
    }catch(error){setMessage({kind:"error",text:error instanceof Error?error.message:"Webhook update failed"});}
    finally{setBusy(null);}
  }

  async function rotateNativeKey(){
    if(!window.confirm(ar?"تدوير المفتاح سيوقف المفتاح القديم فورًا. متابعة؟":"Rotating the key disables the old key immediately. Continue?"))return;
    setBusy("rotate");setMessage(null);setIssued(null);
    try{
      const result=await api(`/api/v1/hotels/${hotelId}/connectivity/handmekey`,{method:"POST",body:"{}"});
      setIssued({apiKey:String(result.data?.apiKey??"")});
      setConnection((current)=>current?{...current,apiKeyPrefix:String(result.data?.apiKeyPrefix??current.apiKeyPrefix??"")}:current);
      setMessage({kind:"ok",text:ar?"تم تدوير المفتاح. انسخ المفتاح الجديد الآن وحدّثه في نظام الفندق.":"API key rotated. Copy the new key now and update it in the property system."});
    }catch(error){setMessage({kind:"error",text:error instanceof Error?error.message:"Key rotation failed"});}
    finally{setBusy(null);}
  }

  async function copyValue(name:string,value:string){
    try{await navigator.clipboard.writeText(value);setCopied(name);window.setTimeout(()=>setCopied(null),1800);}catch{/* clipboard can be blocked; the value remains selectable */}
  }

  async function saveOracle(form: FormData) {
    setBusy("save"); setMessage(null);setIssued(null);
    try {
      const result = await api(`/api/v1/hotels/${hotelId}/connectivity/oracle`, {method:"PUT", body:JSON.stringify({
        environment: String(form.get("environment") ?? "PRODUCTION"), gatewayUrl: String(form.get("gatewayUrl") ?? ""), enterpriseId: String(form.get("enterpriseId") ?? ""), hotelCode: String(form.get("hotelCode") ?? ""), clientId: String(form.get("clientId") ?? ""), clientSecret: String(form.get("clientSecret") ?? ""), appKey: String(form.get("appKey") ?? ""), scope: String(form.get("scope") ?? ""),
      })});
      setConnection(result.data?.connection ?? result.connection ?? connection);
      setMessage({kind:"ok",text:ar?"تم حفظ اتصال Oracle بأمان. شغّل فحص الاتصال الآن.":"Oracle connection saved securely. Run the connection test now."});
      router.refresh();
    } catch (error) { setMessage({kind:"error",text:error instanceof Error?error.message:"Connection failed"}); }
    finally { setBusy(null); }
  }

  async function testConnection() {
    setBusy("test"); setMessage(null);
    try {
      await api(`/api/v1/hotels/${hotelId}/connectivity/test`, {method:"POST",body:"{}"});
      setMessage({kind:"ok",text:native?(ar?"اتصال HandMeKey API سليم وجاهز للمزامنة.":"HandMeKey API connection is healthy and ready to sync."):(ar?"الاتصال ناجح. Oracle OHIP أعاد OAuth token صالح.":"Connection successful. Oracle OHIP returned a valid OAuth token.")});
      router.refresh();
    } catch (error) { setMessage({kind:"error",text:error instanceof Error?error.message:"Connection test failed"}); }
    finally { setBusy(null); }
  }

  async function saveMappings() {
    setBusy("mapping"); setMessage(null);
    try {
      const compact=(values:Record<string,string>)=>Object.entries(values).filter(([,code])=>code.trim()).map(([localId,externalCode])=>({localId,externalCode:externalCode.trim()}));
      await api(`/api/v1/hotels/${hotelId}/connectivity/mappings`, {method:"PUT",body:JSON.stringify({roomMappings:compact(roomMappings),ratePlanMappings:compact(ratePlanMappings)})});
      setMessage({kind:"ok",text:ar?"تم حفظ Mapping الغرف وخطط الأسعار.":"Room and rate-plan mappings saved."});
      router.refresh();
    } catch (error) { setMessage({kind:"error",text:error instanceof Error?error.message:"Mapping failed"}); }
    finally { setBusy(null); }
  }

  async function disconnect() {
    setBusy("disconnect"); setMessage(null);setIssued(null);
    try {
      await api(`/api/v1/hotels/${hotelId}/connectivity`, {method:"DELETE"});
      setConnection((current)=>current?{...current,status:"DISCONNECTED"}:current);
      setMessage({kind:"ok",text:ar?"تم فصل الاتصال. بيانات الربط بقيت محفوظة لإعادة التفعيل لاحقًا.":"Connection disconnected. Configuration remains stored for later reactivation."});
      router.refresh();
    } catch (error) { setMessage({kind:"error",text:error instanceof Error?error.message:"Disconnect failed"}); }
    finally { setBusy(null); }
  }

  return <div className={styles.wrapper}>
    {message&&<div className={`${styles.message} ${message.kind==="error"?styles.error:styles.success}`}>{message.kind==="error"?<CircleAlert size={18}/>:<Check size={18}/>}<span>{message.text}</span></div>}

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>{ar?"1 · اختر النظام":"1 · Choose your system"}</span><h2>{ar?"اربط نظام الفندق":"Connect your property system"}</h2><p>{ar?"استخدم HandMeKey Connectivity API لأي PMS أو Channel Manager، أو اربط Oracle OPERA Cloud مباشرة عبر OHIP.":"Use the HandMeKey Connectivity API with any PMS or channel manager, or connect Oracle OPERA Cloud directly through OHIP."}</p></div><PlugZap size={28}/></div>
      <div className={styles.providerGrid}>{providers.map((provider)=>{const selected=provider.id===connection?.provider||(!connection&&provider.id==="HANDMEKEY_API");return <div className={`${styles.providerCard} ${selected?styles.selected:""}`} key={provider.id}>
        <div className={styles.providerIcon}>{provider.id==="ORACLE_OHIP"?<Database size={23}/>:provider.id==="HANDMEKEY_API"?<KeyRound size={23}/>:provider.id==="HANDMEKEY_NATIVE"?<ShieldCheck size={23}/>:<Cloud size={23}/>}</div>
        <div><strong>{provider.name}</strong><span>{provider.mode.replaceAll("_"," ")}</span></div>
        <b className={provider.available?styles.available:styles.coming}>{provider.available?(ar?"متاح":"Available"):(ar?"قريبًا":"Next")}</b>
      </div>})}</div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>{ar?"2 · HandMeKey Connectivity API":"2 · HandMeKey Connectivity API"}</span><h2>{ar?"ربط مباشر لأي نظام فندقي":"Direct connection for any property system"}</h2><p>{ar?"نظام الفندق يرسل الأسعار والمخزون إلى HandMeKey، ويستقبل الحجوزات والتعديلات والإلغاءات عبر API أو Webhook موقع HMAC.":"Your property system pushes rates and inventory to HandMeKey, then receives reservations, modifications and cancellations through the API or an HMAC-signed webhook."}</p></div><Cable size={28}/></div>
      {!native?<form className={styles.form} action={async(form)=>{await createNative(form);}}>
        <label>{ar?"البيئة":"Environment"}<select name="environment" defaultValue="PRODUCTION"><option value="PRODUCTION">Production</option><option value="UAT">Test / UAT</option></select></label>
        <label className={styles.wide}>{ar?"Webhook اختياري":"Optional webhook"}<input name="webhookUrl" type="url" placeholder="https://pms.example.com/webhooks/handmekey"/><small>{ar?"يمكن تركه فارغًا واستخدام GET /reservations للسحب.":"Leave blank if your PMS will poll GET /reservations."}</small></label>
        <div className={`${styles.actions} ${styles.wide}`}><button className="primaryButton" disabled={busy!==null}>{busy==="native"?<Loader2 className={styles.spin} size={17}/>:<KeyRound size={17}/>} {ar?"إنشاء مفتاح API وتفعيل الربط":"Generate API key & enable"}</button></div>
      </form>:<div style={{display:"grid",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
          <div style={{padding:14,border:"1px solid var(--border,#e2e5e9)",borderRadius:12}}><small style={{display:"block",opacity:.65,marginBottom:5}}>{ar?"الحالة":"Status"}</small><strong>{connection?.status}</strong></div>
          <div style={{padding:14,border:"1px solid var(--border,#e2e5e9)",borderRadius:12}}><small style={{display:"block",opacity:.65,marginBottom:5}}>{ar?"بادئة المفتاح":"API key prefix"}</small><strong style={{fontFamily:"monospace",fontSize:12}}>{connection?.apiKeyPrefix??"Configured"}…</strong></div>
          <div style={{padding:14,border:"1px solid var(--border,#e2e5e9)",borderRadius:12}}><small style={{display:"block",opacity:.65,marginBottom:5}}>{ar?"آخر مزامنة":"Last sync"}</small><strong>{connection?.lastSyncAt?new Date(connection.lastSyncAt).toLocaleString(ar?"ar-JO":"en-GB"):"—"}</strong></div>
        </div>
        <form className={styles.form} action={async(form)=>{await saveWebhook(form);}}>
          <label className={styles.wide}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><Webhook size={15}/>{ar?"Webhook للحجوزات":"Reservation webhook"}</span><input name="webhookUrl" type="url" defaultValue={connection?.webhookUrl??""} placeholder="https://pms.example.com/webhooks/handmekey"/></label>
          <div className={`${styles.actions} ${styles.wide}`}><button className="secondaryButton" disabled={busy!==null}>{busy==="webhook"?<Loader2 className={styles.spin} size={17}/>:<Send size={17}/>} {ar?"حفظ Webhook":"Save webhook"}</button><button type="button" className="secondaryButton" disabled={busy!==null} onClick={rotateNativeKey}>{busy==="rotate"?<Loader2 className={styles.spin} size={17}/>:<RotateCw size={17}/>} {ar?"تدوير مفتاح API":"Rotate API key"}</button><button type="button" className="secondaryButton" disabled={busy!==null} onClick={testConnection}><Cable size={17}/>{ar?"فحص الربط":"Health check"}</button></div>
        </form>
      </div>}

      {issued?.apiKey&&<div style={{marginTop:16,padding:16,border:"1px solid rgba(201,169,80,.45)",borderRadius:14,background:"rgba(201,169,80,.08)"}}>
        <strong style={{display:"block",marginBottom:5}}>{ar?"احفظ بيانات الربط الآن":"Save these credentials now"}</strong><p style={{fontSize:12,opacity:.72,margin:"0 0 12px"}}>{ar?"لأسباب أمنية لن يعرض HandMeKey مفتاح API الكامل مرة أخرى.":"For security, HandMeKey will not display the full API key again."}</p>
        <SecretRow label="API key" value={issued.apiKey} copied={copied==="api"} onCopy={()=>copyValue("api",issued.apiKey)}/>
        {issued.webhookSigningSecret&&<SecretRow label={ar?"Webhook signing secret":"Webhook signing secret"} value={issued.webhookSigningSecret} copied={copied==="webhook"} onCopy={()=>copyValue("webhook",issued.webhookSigningSecret!)}/>} 
      </div>}

      <div style={{marginTop:16,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10}}>
        <Endpoint method="GET" path="/api/v1/connectivity/health" text={ar?"فحص المصادقة والاتصال":"Authentication health check"}/>
        <Endpoint method="GET" path="/api/v1/connectivity/property" text={ar?"الغرف وخطط الأسعار والـmapping":"Rooms, rate plans and mapping"}/>
        <Endpoint method="POST" path="/api/v1/connectivity/ari" text={ar?"إرسال الأسعار والمخزون والقيود":"Push rates, inventory and restrictions"}/>
        <Endpoint method="GET" path="/api/v1/connectivity/reservations" text={ar?"سحب أحداث الحجوزات":"Pull reservation events"}/>
      </div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>{ar?"3 · Oracle OPERA Cloud":"3 · Oracle OPERA Cloud"}</span><h2>{ar?"اتصال OHIP المباشر":"Direct OHIP connection"}</h2><p>{ar?"للفنادق التي تستخدم OPERA Cloud: خزّن بيانات OHIP بشكل مشفر، افحص OAuth، ثم طابق أكواد الغرف وخطط الأسعار.":"For OPERA Cloud properties: store OHIP credentials encrypted, test OAuth, then map room and rate-plan codes."}</p></div><ShieldCheck size={28}/></div>
      <form className={styles.form} action={async(form)=>{await saveOracle(form);}}>
        <label>{ar?"البيئة":"Environment"}<select name="environment" defaultValue={!native?(connection?.environment??"PRODUCTION"):"PRODUCTION"}><option value="PRODUCTION">Production</option><option value="UAT">UAT / Test</option></select></label>
        <label className={styles.wide}>{ar?"OHIP Gateway URL":"OHIP Gateway URL"}<input name="gatewayUrl" type="url" required placeholder="https://...hospitality-api..." defaultValue={!native?(connection?.gatewayUrl??""):""}/></label>
        <label>{ar?"Enterprise ID":"Enterprise ID"}<input name="enterpriseId" required defaultValue={!native?(connection?.enterpriseId??""):""}/></label>
        <label>{ar?"Hotel ID / x-hotelid":"Hotel ID / x-hotelid"}<input name="hotelCode" required defaultValue={!native?(connection?.externalHotelCode??""):""}/></label>
        <label>{ar?"Client ID":"Client ID"}<input name="clientId" required autoComplete="off"/></label>
        <label>{ar?"Client Secret":"Client Secret"}<input name="clientSecret" type="password" required autoComplete="new-password"/></label>
        <label>{ar?"Application Key":"Application Key"}<input name="appKey" required autoComplete="off"/></label>
        <label>{ar?"OAuth Scope":"OAuth Scope"}<input name="scope" required autoComplete="off"/></label>
        <div className={`${styles.actions} ${styles.wide}`}><button className="primaryButton" disabled={busy!==null}>{busy==="save"?<Loader2 className={styles.spin} size={17}/>:<ShieldCheck size={17}/>} {ar?"حفظ اتصال Oracle المشفر":"Save encrypted Oracle connection"}</button>{connection&&!native&&<button type="button" className="secondaryButton" disabled={busy!==null} onClick={testConnection}>{busy==="test"?<Loader2 className={styles.spin} size={17}/>:<Cable size={17}/>} {ar?"فحص OAuth":"Test OAuth"}</button>}</div>
      </form>
      {connection?.lastError&&<div className={styles.healthError}><CircleAlert size={18}/><span>{connection.lastError}</span></div>}
    </section>

    {connection&&connection.status!=="DISCONNECTED"&&<section className={styles.section}>
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>{ar?"4 · Mapping":"4 · Mapping"}</span><h2>{ar?"طابق الغرف وخطط الأسعار":"Map rooms & rate plans"}</h2><p>{native?(ar?"اكتب كود الغرفة وكود Rate Plan كما يستخدمهما PMS أو Channel Manager. ويمكن ترك الحقول فارغة إذا كان النظام سيستخدم أكواد HandMeKey نفسها.":"Enter the room and rate-plan codes used by the PMS or channel manager. Leave them blank if the integration will use HandMeKey codes directly."):(ar?"اكتب كود الغرفة وكود Rate Plan كما يظهران في OPERA.":"Enter the room and rate-plan codes exactly as configured in OPERA.")}</p></div><Link2 size={28}/></div>
      <div className={styles.mappingGrid}>
        <div><h3>{ar?"الغرف":"Rooms"}</h3>{rooms.filter((room)=>room.active).map((room)=><label className={styles.mappingRow} key={room.id}><span><strong>{room.name}</strong><small>{room.code}</small></span><input value={roomMappings[room.id]??""} onChange={(event)=>setRoomMappings((current)=>({...current,[room.id]:event.target.value}))} placeholder={native?"PMS ROOM CODE":"OPERA ROOM CODE"}/></label>)}</div>
        <div><h3>{ar?"خطط الأسعار":"Rate plans"}</h3>{plans.filter((plan)=>plan.active).map((plan)=><label className={styles.mappingRow} key={plan.id}><span><strong>{plan.roomName} · {plan.name}</strong><small>{plan.code}</small></span><input value={ratePlanMappings[plan.id]??""} onChange={(event)=>setRatePlanMappings((current)=>({...current,[plan.id]:event.target.value}))} placeholder={native?"PMS RATE CODE":"OPERA RATE CODE"}/></label>)}</div>
      </div>
      <div className={styles.actions}><button className="primaryButton" onClick={saveMappings} disabled={busy!==null}>{busy==="mapping"?<Loader2 className={styles.spin} size={17}/>:<Check size={17}/>} {ar?"حفظ الـMapping":"Save mapping"}</button><button className="secondaryButton" onClick={disconnect} disabled={busy!==null}><Unplug size={17}/>{ar?"فصل الاتصال":"Disconnect"}</button></div>
    </section>}
  </div>;
}

function SecretRow({label,value,copied,onCopy}:{label:string;value:string;copied:boolean;onCopy:()=>void}){
  return <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:8,alignItems:"center",marginTop:8}}><div style={{minWidth:0}}><small style={{display:"block",marginBottom:4,opacity:.7}}>{label}</small><code style={{display:"block",padding:"9px 10px",borderRadius:9,background:"rgba(15,35,58,.07)",overflow:"auto",whiteSpace:"nowrap"}}>{value}</code></div><button type="button" className="secondaryButton" onClick={onCopy}><Copy size={15}/>{copied?"Copied":"Copy"}</button></div>;
}

function Endpoint({method,path,text}:{method:string;path:string;text:string}){
  return <div style={{padding:12,border:"1px solid var(--border,#e2e5e9)",borderRadius:12,minWidth:0}}><div style={{display:"flex",gap:7,alignItems:"center",marginBottom:6}}><b style={{fontSize:11}}>{method}</b><code style={{fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{path}</code></div><small style={{opacity:.68}}>{text}</small></div>;
}

function asMappings(value: unknown): Mapping[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item)=>{
    if (!item || typeof item!=="object") return [];
    const record=item as Record<string,unknown>;
    return typeof record.localId==="string"&&typeof record.externalCode==="string"?[{localId:record.localId,externalCode:record.externalCode}]:[];
  });
}
