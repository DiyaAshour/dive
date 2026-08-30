"use client";

import {useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {Cable, Check, CircleAlert, Cloud, Database, Link2, Loader2, PlugZap, ShieldCheck, Unplug} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import styles from "./connectivity.module.css";

type Mapping = {localId: string; externalCode: string};
type Connection = {
  provider: string;
  status: string;
  environment: string;
  gatewayUrl: string | null;
  enterpriseId: string | null;
  externalHotelCode: string | null;
  roomMappings: unknown[];
  ratePlanMappings: unknown[];
  lastHealthyAt: string | null;
  lastError: string | null;
  credentialsConfigured: boolean;
} | null;
type Room = {id: string; name: string; code: string; active: boolean; ratePlans: Array<{id: string; name: string; code: string; active: boolean}>};
type Provider = {id: string; name: string; mode: string; available: boolean};

export default function ConnectivityManager({hotelId, locale, initialConnection, rooms, providers}: {hotelId: string; locale: Locale; initialConnection: Connection; rooms: Room[]; providers: Provider[]}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{kind: "ok" | "error"; text: string} | null>(null);
  const [connection, setConnection] = useState(initialConnection);
  const initialRoomMappings = asMappings(initialConnection?.roomMappings);
  const initialPlanMappings = asMappings(initialConnection?.ratePlanMappings);
  const [roomMappings, setRoomMappings] = useState<Record<string,string>>(()=>Object.fromEntries(initialRoomMappings.map((item)=>[item.localId,item.externalCode])));
  const [ratePlanMappings, setRatePlanMappings] = useState<Record<string,string>>(()=>Object.fromEntries(initialPlanMappings.map((item)=>[item.localId,item.externalCode])));
  const plans = useMemo(()=>rooms.flatMap((room)=>room.ratePlans.map((plan)=>({...plan, roomName: room.name}))),[rooms]);

  async function api(path: string, init: RequestInit) {
    const response = await fetch(path, {...init, headers: {"content-type": "application/json", ...(init.headers ?? {})}});
    const result = await response.json().catch(()=>null);
    if (!response.ok) throw new Error(result?.error?.message ?? (ar ? "تعذر تنفيذ العملية." : "The operation could not be completed."));
    return result;
  }

  async function saveOracle(form: FormData) {
    setBusy("save"); setMessage(null);
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
      setMessage({kind:"ok",text:ar?"الاتصال ناجح. Oracle OHIP أعاد OAuth token صالح.":"Connection successful. Oracle OHIP returned a valid OAuth token."});
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
    setBusy("disconnect"); setMessage(null);
    try {
      await api(`/api/v1/hotels/${hotelId}/connectivity`, {method:"DELETE"});
      setMessage({kind:"ok",text:ar?"تم فصل الاتصال. بيانات الربط بقيت محفوظة لإعادة التفعيل لاحقًا.":"Connection disconnected. Configuration remains stored for later reactivation."});
      router.refresh();
    } catch (error) { setMessage({kind:"error",text:error instanceof Error?error.message:"Disconnect failed"}); }
    finally { setBusy(null); }
  }

  return <div className={styles.wrapper}>
    {message&&<div className={`${styles.message} ${message.kind==="error"?styles.error:styles.success}`}>{message.kind==="error"?<CircleAlert size={18}/>:<Check size={18}/>}<span>{message.text}</span></div>}

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>{ar?"1 · اختر النظام":"1 · Choose your system"}</span><h2>{ar?"اربط نظام الفندق":"Connect your property system"}</h2><p>{ar?"Oracle متاح الآن. باقي الموصلات ستستخدم نفس Connectivity Engine بدون تغيير إعداد الفندق داخل HandMeKey.":"Oracle is available now. Additional connectors use the same HandMeKey connectivity engine."}</p></div><PlugZap size={28}/></div>
      <div className={styles.providerGrid}>{providers.map((provider)=><div className={`${styles.providerCard} ${provider.id==="ORACLE_OHIP"?styles.selected:""}`} key={provider.id}>
        <div className={styles.providerIcon}>{provider.id==="ORACLE_OHIP"?<Database size={23}/>:provider.id==="HANDMEKEY_NATIVE"?<ShieldCheck size={23}/>:<Cloud size={23}/>}</div>
        <div><strong>{provider.name}</strong><span>{provider.mode.replaceAll("_"," ")}</span></div>
        <b className={provider.available?styles.available:styles.coming}>{provider.available?(ar?"متاح":"Available"):(ar?"قريبًا":"Next")}</b>
      </div>)}</div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>{ar?"2 · Oracle OPERA Cloud":"2 · Oracle OPERA Cloud"}</span><h2>{ar?"بيانات OHIP":"OHIP environment details"}</h2><p>{ar?"القيم موجودة داخل Oracle Hospitality Developer Portal → Environments / Applications. الـClient Secret لا يعود للواجهة بعد الحفظ.":"Copy these values from Oracle Hospitality Developer Portal → Environments / Applications. Client Secret is never returned to the browser after saving."}</p></div><ShieldCheck size={28}/></div>
      <form className={styles.form} action={async(form)=>{await saveOracle(form);}}>
        <label>{ar?"البيئة":"Environment"}<select name="environment" defaultValue={connection?.environment??"PRODUCTION"}><option value="PRODUCTION">Production</option><option value="UAT">UAT / Test</option></select></label>
        <label className={styles.wide}>{ar?"OHIP Gateway URL":"OHIP Gateway URL"}<input name="gatewayUrl" type="url" required placeholder="https://...hospitality-api..." defaultValue={connection?.gatewayUrl??""}/></label>
        <label>{ar?"Enterprise ID":"Enterprise ID"}<input name="enterpriseId" required defaultValue={connection?.enterpriseId??""}/></label>
        <label>{ar?"Hotel ID / x-hotelid":"Hotel ID / x-hotelid"}<input name="hotelCode" required defaultValue={connection?.externalHotelCode??""}/></label>
        <label>{ar?"Client ID":"Client ID"}<input name="clientId" required autoComplete="off"/></label>
        <label>{ar?"Client Secret":"Client Secret"}<input name="clientSecret" type="password" required autoComplete="new-password"/></label>
        <label>{ar?"Application Key":"Application Key"}<input name="appKey" required autoComplete="off"/></label>
        <label>{ar?"OAuth Scope":"OAuth Scope"}<input name="scope" required autoComplete="off"/></label>
        <div className={`${styles.actions} ${styles.wide}`}><button className="primaryButton" disabled={busy!==null}>{busy==="save"?<Loader2 className={styles.spin} size={17}/>:<ShieldCheck size={17}/>} {ar?"حفظ الاتصال المشفر":"Save encrypted connection"}</button>{connection&&<button type="button" className="secondaryButton" disabled={busy!==null} onClick={testConnection}>{busy==="test"?<Loader2 className={styles.spin} size={17}/>:<Cable size={17}/>} {ar?"فحص الاتصال":"Test connection"}</button>}</div>
      </form>
      {connection?.lastError&&<div className={styles.healthError}><CircleAlert size={18}/><span>{connection.lastError}</span></div>}
    </section>

    {connection&&<section className={styles.section}>
      <div className={styles.sectionHead}><div><span className={styles.eyebrow}>{ar?"3 · Mapping":"3 · Mapping"}</span><h2>{ar?"طابق الغرف وخطط الأسعار":"Map rooms & rate plans"}</h2><p>{ar?"اكتب كود الغرفة وكود Rate Plan كما يظهران في OPERA. لا يتم إرسال أي حجز قبل اكتمال الـmapping المطلوب.":"Enter the room and rate-plan codes exactly as configured in OPERA. Reservation delivery should only be enabled after required mappings are complete."}</p></div><Link2 size={28}/></div>
      <div className={styles.mappingGrid}>
        <div><h3>{ar?"الغرف":"Rooms"}</h3>{rooms.filter((room)=>room.active).map((room)=><label className={styles.mappingRow} key={room.id}><span><strong>{room.name}</strong><small>{room.code}</small></span><input value={roomMappings[room.id]??""} onChange={(event)=>setRoomMappings((current)=>({...current,[room.id]:event.target.value}))} placeholder="OPERA ROOM CODE"/></label>)}</div>
        <div><h3>{ar?"خطط الأسعار":"Rate plans"}</h3>{plans.filter((plan)=>plan.active).map((plan)=><label className={styles.mappingRow} key={plan.id}><span><strong>{plan.roomName} · {plan.name}</strong><small>{plan.code}</small></span><input value={ratePlanMappings[plan.id]??""} onChange={(event)=>setRatePlanMappings((current)=>({...current,[plan.id]:event.target.value}))} placeholder="OPERA RATE CODE"/></label>)}</div>
      </div>
      <div className={styles.actions}><button className="primaryButton" onClick={saveMappings} disabled={busy!==null}>{busy==="mapping"?<Loader2 className={styles.spin} size={17}/>:<Check size={17}/>} {ar?"حفظ الـMapping":"Save mapping"}</button><button className="secondaryButton" onClick={disconnect} disabled={busy!==null}><Unplug size={17}/>{ar?"فصل الاتصال":"Disconnect"}</button></div>
    </section>}
  </div>;
}

function asMappings(value: unknown): Mapping[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item)=>{
    if (!item || typeof item!=="object") return [];
    const record=item as Record<string,unknown>;
    return typeof record.localId==="string"&&typeof record.externalCode==="string"?[{localId:record.localId,externalCode:record.externalCode}]:[];
  });
}
