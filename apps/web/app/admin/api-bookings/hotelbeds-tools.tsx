"use client";

import {useState} from "react";

type Locale = "ar" | string;

type SyncResponse = {data?: {mode?: string; completed?: boolean; differentialComplete?: boolean; inserted?: number; processed?: number; upserted?: number; requests?: number; nextFrom?: number}; error?: {message?: string}};
type CancelResponse = {data?: unknown; error?: {message?: string}};

export function HotelbedsContentSyncButton({locale}: {locale: Locale}) {
  const ar = locale === "ar";
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState<string | null>(null);
  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/admin/hotelbeds-content-sync",{method:"POST"});
      const payload = await response.json().catch(()=>null) as SyncResponse | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? `Sync failed (${response.status})`);
      const data = payload.data;
      const hotels = data.processed ?? data.upserted ?? data.inserted ?? 0;
      if (data.mode === "bootstrap" && !data.completed) {
        setMessage(ar
          ? `تم تحميل ${hotels} فندق من الكتالوج العالمي في هذه الدفعة · ${data.requests ?? 0} طلب API · سيتم الاستكمال تلقائيًا من ${data.nextFrom ?? "—"}`
          : `Loaded ${hotels} worldwide hotels in this batch · ${data.requests ?? 0} API requests · next run resumes from ${data.nextFrom ?? "—"}`);
      } else if (data.mode === "bootstrap") {
        setMessage(ar
          ? `اكتمل كتالوج Hotelbeds العالمي · ${hotels} فندق في هذه الدفعة · ${data.requests ?? 0} طلب API`
          : `Worldwide Hotelbeds catalogue completed · ${hotels} hotels in this batch · ${data.requests ?? 0} API requests`);
      } else {
        setMessage(ar
          ? `تم تحديث الكتالوج العالمي: ${hotels} فندق · ${data.requests ?? 0} طلب API`
          : `Worldwide catalogue refreshed: ${hotels} hotels · ${data.requests ?? 0} API requests`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (ar ? "فشلت المزامنة" : "Sync failed"));
    } finally {
      setBusy(false);
    }
  }
  return <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
    <button type="button" className="primary" onClick={sync} disabled={busy}>{busy ? (ar ? "جارٍ مزامنة فنادق العالم…" : "Syncing worldwide hotels…") : (ar ? "مزامنة فنادق Hotelbeds حول العالم" : "Sync worldwide Hotelbeds catalogue")}</button>
    {message&&<small className="muted">{message}</small>}
  </div>;
}

export function HotelbedsCancellationButton({id,locale}: {id:string;locale:Locale}) {
  const ar = locale === "ar";
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState<string | null>(null);
  const [simulated,setSimulated] = useState(false);

  async function run(confirm:boolean) {
    if (confirm && !window.confirm(ar ? "تأكيد الإلغاء الحقيقي لدى Hotelbeds؟ سيتم تنفيذ الإلغاء الآن." : "Confirm real Hotelbeds cancellation? This will cancel the booking now.")) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/admin/api-bookings/${encodeURIComponent(id)}/cancel`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({confirm})});
      const payload = await response.json().catch(()=>null) as CancelResponse | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? `Request failed (${response.status})`);
      if (confirm) {
        setMessage(ar ? "تم إلغاء الحجز لدى Hotelbeds." : "Hotelbeds cancellation confirmed.");
        window.location.reload();
      } else {
        setSimulated(true);
        const simulation = (payload.data as {simulation?: {amount?:number|null;currency?:string|null}}).simulation;
        const charge = simulation?.amount == null ? (ar ? "الرسوم غير متوفرة" : "charge unavailable") : `${simulation.amount.toFixed(2)} ${simulation.currency ?? ""}`;
        setMessage(ar ? `محاكاة الإلغاء: ${charge}` : `Cancellation simulation: ${charge}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (ar ? "تعذر تنفيذ الطلب" : "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  return <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
    <button type="button" onClick={()=>run(false)} disabled={busy}>{ar ? "محاكاة الإلغاء" : "Simulate cancellation"}</button>
    {simulated&&<button type="button" className="danger" onClick={()=>run(true)} disabled={busy}>{ar ? "إلغاء فعلي" : "Cancel booking"}</button>}
    {message&&<small className="muted">{message}</small>}
  </div>;
}
