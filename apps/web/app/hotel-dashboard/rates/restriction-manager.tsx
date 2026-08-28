"use client";

import {useEffect, useMemo, useState} from "react";
import {AlertTriangle, CalendarCheck2, Check, Loader2, LockKeyhole, RefreshCw, Save, ShieldAlert} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import styles from "./restrictions.module.css";

type RatePlanOption = {id: string; name: string; code: string; active: boolean};
type RoomOption = {id: string; name: string; code: string; active: boolean; ratePlans: RatePlanOption[]};
type RateRow = {
  id: string;
  ratePlanId: string;
  date: string;
  minStay: number;
  maxStay: number | null;
  minAdvanceBookingDays: number;
  maxAdvanceBookingDays: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
};
type CalendarData = {rates: RateRow[]};
type TriState = "KEEP" | "OPEN" | "CLOSED";

type Draft = {
  from: string;
  to: string;
  weekdays: number[];
  minStayEnabled: boolean;
  minStay: string;
  maxStayEnabled: boolean;
  maxStay: string;
  minAdvanceEnabled: boolean;
  minAdvanceBookingDays: string;
  maxAdvanceEnabled: boolean;
  maxAdvanceBookingDays: string;
  closedToArrival: TriState;
  closedToDeparture: TriState;
};

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export default function RestrictionManager({hotelId, rooms, locale}: Readonly<{hotelId: string; rooms: RoomOption[]; locale: Locale}>) {
  const ar = locale === "ar";
  const firstRoom = rooms.find((room) => room.active && room.ratePlans.some((plan) => plan.active)) ?? rooms[0];
  const [roomTypeId, setRoomTypeId] = useState(firstRoom?.id ?? "");
  const [ratePlanId, setRatePlanId] = useState(firstRoom?.ratePlans.find((plan) => plan.active)?.id ?? firstRoom?.ratePlans[0]?.id ?? "");
  const today = useMemo(() => utcToday(), []);
  const [draft, setDraft] = useState<Draft>(() => ({
    from: dateKey(today),
    to: dateKey(addDays(today, 29)),
    weekdays: [...ALL_WEEKDAYS],
    minStayEnabled: false,
    minStay: "1",
    maxStayEnabled: false,
    maxStay: "",
    minAdvanceEnabled: false,
    minAdvanceBookingDays: "0",
    maxAdvanceEnabled: false,
    maxAdvanceBookingDays: "",
    closedToArrival: "KEEP",
    closedToDeparture: "KEEP",
  }));
  const [calendar, setCalendar] = useState<CalendarData>({rates: []});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const room = rooms.find((item) => item.id === roomTypeId) ?? null;
  const plan = room?.ratePlans.find((item) => item.id === ratePlanId) ?? null;

  useEffect(() => {
    if (!hotelId || !ratePlanId || !draft.from || !draft.to) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/calendar?from=${draft.from}&to=${draft.to}`, {signal: controller.signal})
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (response.status === 401) {window.location.assign(`/partner/login?next=${encodeURIComponent(`/hotel-dashboard/rates?hotelId=${hotelId}`)}`); return null;}
        if (!response.ok) throw new Error(apiIssue(payload, ar));
        return (payload?.data ?? payload) as CalendarData;
      })
      .then((data) => {if (data) setCalendar(data);})
      .catch((cause) => {if (cause instanceof DOMException && cause.name === "AbortError") return; setError(cause instanceof Error ? cause.message : (ar ? "تعذر تحميل القيود" : "Unable to load restrictions"));})
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [hotelId, ratePlanId, draft.from, draft.to, reloadKey, ar]);

  const scopedRates = useMemo(() => calendar.rates.filter((rate) => rate.ratePlanId === ratePlanId), [calendar.rates, ratePlanId]);
  const stats = useMemo(() => ({
    cta: scopedRates.filter((rate) => rate.closedToArrival).length,
    ctd: scopedRates.filter((rate) => rate.closedToDeparture).length,
    advance: scopedRates.filter((rate) => rate.minAdvanceBookingDays > 0 || rate.maxAdvanceBookingDays !== null).length,
    stay: scopedRates.filter((rate) => rate.minStay > 1 || rate.maxStay !== null).length,
  }), [scopedRates]);

  function chooseRoom(id: string) {
    const nextRoom = rooms.find((item) => item.id === id);
    setRoomTypeId(id);
    setRatePlanId(nextRoom?.ratePlans.find((item) => item.active)?.id ?? nextRoom?.ratePlans[0]?.id ?? "");
    setMessage(null);
    setError(null);
  }

  function toggleWeekday(day: number) {
    setDraft((current) => ({...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((value) => value !== day) : [...current.weekdays, day].sort()}));
  }

  function preset(kind: "30" | "90" | "365") {
    const count = kind === "30" ? 29 : kind === "90" ? 89 : 364;
    const now = utcToday();
    setDraft((current) => ({...current, from: dateKey(now), to: dateKey(addDays(now, count))}));
  }

  async function saveRestrictions() {
    if (!room || !plan) return;
    if (!draft.weekdays.length) {setError(ar ? "اختر يوماً واحداً على الأقل من أيام الأسبوع." : "Select at least one weekday."); return;}
    const body: Record<string, unknown> = {roomTypeId: room.id, ratePlanId: plan.id, from: draft.from, to: draft.to, weekdays: draft.weekdays};
    if (draft.minStayEnabled) body.minStay = Number(draft.minStay);
    if (draft.maxStayEnabled) body.maxStay = draft.maxStay.trim() ? Number(draft.maxStay) : null;
    if (draft.minAdvanceEnabled) body.minAdvanceBookingDays = Number(draft.minAdvanceBookingDays);
    if (draft.maxAdvanceEnabled) body.maxAdvanceBookingDays = draft.maxAdvanceBookingDays.trim() ? Number(draft.maxAdvanceBookingDays) : null;
    if (draft.closedToArrival !== "KEEP") body.closedToArrival = draft.closedToArrival === "CLOSED";
    if (draft.closedToDeparture !== "KEEP") body.closedToDeparture = draft.closedToDeparture === "CLOSED";
    if (Object.keys(body).length <= 5) {setError(ar ? "فعّل قيداً واحداً على الأقل قبل الحفظ." : "Enable at least one restriction before saving."); return;}

    const minStay = draft.minStayEnabled ? Number(draft.minStay) : null;
    const maxStay = draft.maxStayEnabled && draft.maxStay.trim() ? Number(draft.maxStay) : null;
    if (minStay !== null && maxStay !== null && maxStay < minStay) {setError(ar ? "الحد الأقصى للإقامة لا يمكن أن يكون أقل من الحد الأدنى." : "Maximum stay cannot be lower than minimum stay."); return;}
    const minAdvance = draft.minAdvanceEnabled ? Number(draft.minAdvanceBookingDays) : null;
    const maxAdvance = draft.maxAdvanceEnabled && draft.maxAdvanceBookingDays.trim() ? Number(draft.maxAdvanceBookingDays) : null;
    if (minAdvance !== null && maxAdvance !== null && maxAdvance < minAdvance) {setError(ar ? "أقصى مهلة للحجز لا يمكن أن تكون أقل من أقل مهلة." : "Maximum booking window cannot be lower than the minimum lead time."); return;}

    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/calendar`, {method: "PATCH", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
      const payload = await response.json().catch(() => null);
      if (response.status === 401) {window.location.assign(`/partner/login?next=${encodeURIComponent(`/hotel-dashboard/rates?hotelId=${hotelId}`)}`); return;}
      if (!response.ok) throw new Error(apiIssue(payload, ar));
      const result = payload?.data ?? payload;
      setReloadKey((value) => value + 1);
      setMessage(ar ? `تم تطبيق القيود على ${result?.updatedDays ?? ""} يوم.` : `Restrictions applied to ${result?.updatedDays ?? ""} days.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ar ? "تعذر حفظ القيود" : "Unable to save restrictions"));
    } finally {setSaving(false);}
  }

  if (!rooms.length || !plan) return null;

  return <section className={styles.shell}>
    <div className={styles.heading}>
      <div className={styles.headingIcon}><LockKeyhole size={22}/></div>
      <div><span>{ar ? "قيود إقامة متقدمة" : "Advanced stay restrictions"}</span><h2>{ar ? "تحكم بالوصول والمغادرة ونافذة الحجز" : "Control arrivals, departures and booking windows"}</h2><p>{ar ? "CTA وCTD لا يغلقان الليلة نفسها؛ كل قيد يطبق فقط على الوصول أو المغادرة المحددة." : "CTA and CTD do not close the stay-through night; each restriction only controls its matching arrival or departure."}</p></div>
      <button type="button" className={styles.refresh} onClick={() => setReloadKey((value) => value + 1)} disabled={loading}>{loading ? <Loader2 className={styles.spin} size={16}/> : <RefreshCw size={16}/>} {ar ? "تحديث" : "Refresh"}</button>
    </div>

    {(message || error) && <div className={`${styles.notice} ${error ? styles.noticeError : styles.noticeSuccess}`}>{error ? <AlertTriangle size={17}/> : <Check size={17}/>}<span>{error ?? message}</span></div>}

    <div className={styles.stats}>
      <Stat icon={<ShieldAlert size={16}/>} label="CTA" value={stats.cta} helper={ar ? "أيام تمنع الوصول" : "arrival-closed days"}/>
      <Stat icon={<ShieldAlert size={16}/>} label="CTD" value={stats.ctd} helper={ar ? "أيام تمنع المغادرة" : "departure-closed days"}/>
      <Stat icon={<CalendarCheck2 size={16}/>} label={ar ? "نافذة حجز" : "Booking window"} value={stats.advance} helper={ar ? "أيام بقيود مهلة" : "days with lead rules"}/>
      <Stat icon={<CalendarCheck2 size={16}/>} label={ar ? "مدة إقامة" : "Stay length"} value={stats.stay} helper={ar ? "أيام بقيود ليالٍ" : "days with stay rules"}/>
    </div>

    <div className={styles.grid}>
      <div className={styles.controls}>
        <div className={styles.selectors}>
          <label><span>{ar ? "نوع الغرفة" : "Room type"}</span><select value={roomTypeId} onChange={(event) => chooseRoom(event.target.value)}>{rooms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select></label>
          <label><span>{ar ? "خطة السعر" : "Rate plan"}</span><select value={ratePlanId} onChange={(event) => setRatePlanId(event.target.value)}>{room?.ratePlans.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select></label>
        </div>

        <div className={styles.presets}><button type="button" onClick={() => preset("30")}>30 {ar ? "يوم" : "days"}</button><button type="button" onClick={() => preset("90")}>90 {ar ? "يوم" : "days"}</button><button type="button" onClick={() => preset("365")}>365 {ar ? "يوم" : "days"}</button></div>
        <div className={styles.range}><label>{ar ? "من" : "From"}<input type="date" value={draft.from} onChange={(event) => setDraft((current) => ({...current, from: event.target.value}))}/></label><label>{ar ? "إلى" : "To"}<input type="date" value={draft.to} onChange={(event) => setDraft((current) => ({...current, to: event.target.value}))}/></label></div>
        <div className={styles.weekBlock}><span>{ar ? "أيام الأسبوع" : "Weekdays"}</span><div className={styles.weekdays}>{ALL_WEEKDAYS.map((day) => <button type="button" key={day} className={draft.weekdays.includes(day) ? styles.weekdayActive : ""} onClick={() => toggleWeekday(day)}>{weekdayLabel(day, locale)}</button>)}</div></div>
      </div>

      <div className={styles.rules}>
        <RuleToggle checked={draft.minStayEnabled} onChange={(value) => setDraft((current) => ({...current, minStayEnabled: value}))} title={ar ? "الحد الأدنى للإقامة" : "Minimum length of stay"} helper={ar ? "يُفحص على تاريخ الوصول فقط." : "Evaluated on the arrival date only."}><input type="number" min="1" max="365" value={draft.minStay} onChange={(event) => setDraft((current) => ({...current, minStay: event.target.value}))}/></RuleToggle>
        <RuleToggle checked={draft.maxStayEnabled} onChange={(value) => setDraft((current) => ({...current, maxStayEnabled: value}))} title={ar ? "الحد الأقصى للإقامة" : "Maximum length of stay"} helper={ar ? "اتركه فارغاً لإزالة الحد." : "Leave blank to remove the limit."}><input type="number" min="1" max="365" value={draft.maxStay} onChange={(event) => setDraft((current) => ({...current, maxStay: event.target.value}))} placeholder={ar ? "بدون حد" : "No limit"}/></RuleToggle>
        <RuleToggle checked={draft.minAdvanceEnabled} onChange={(value) => setDraft((current) => ({...current, minAdvanceEnabled: value}))} title={ar ? "أقل مهلة للحجز" : "Minimum booking lead time"} helper={ar ? "0 = يمكن الحجز في نفس يوم الوصول." : "0 = same-day arrival can be booked."}><div className={styles.withSuffix}><input type="number" min="0" max="730" value={draft.minAdvanceBookingDays} onChange={(event) => setDraft((current) => ({...current, minAdvanceBookingDays: event.target.value}))}/><span>{ar ? "يوم" : "days"}</span></div></RuleToggle>
        <RuleToggle checked={draft.maxAdvanceEnabled} onChange={(value) => setDraft((current) => ({...current, maxAdvanceEnabled: value}))} title={ar ? "أقصى نافذة حجز" : "Maximum advance booking"} helper={ar ? "فارغ = يمكن الحجز لأي تاريخ مستقبلي ضمن التقويم." : "Blank = no maximum booking window."}><div className={styles.withSuffix}><input type="number" min="0" max="730" value={draft.maxAdvanceBookingDays} onChange={(event) => setDraft((current) => ({...current, maxAdvanceBookingDays: event.target.value}))} placeholder={ar ? "بدون حد" : "No limit"}/><span>{ar ? "يوم" : "days"}</span></div></RuleToggle>

        <div className={styles.boundaryGrid}>
          <label><strong>{ar ? "إغلاق الوصول (CTA)" : "Closed to arrival (CTA)"}</strong><small>{ar ? "يمنع بدء إقامة جديدة في هذا اليوم." : "Blocks starting a new stay on that date."}</small><select value={draft.closedToArrival} onChange={(event) => setDraft((current) => ({...current, closedToArrival: event.target.value as TriState}))}><option value="KEEP">{ar ? "بدون تغيير" : "No change"}</option><option value="OPEN">{ar ? "فتح الوصول" : "Open arrivals"}</option><option value="CLOSED">{ar ? "منع الوصول" : "Close arrivals"}</option></select></label>
          <label><strong>{ar ? "إغلاق المغادرة (CTD)" : "Closed to departure (CTD)"}</strong><small>{ar ? "يمنع إنهاء الإقامة في هذا اليوم." : "Blocks ending a stay on that date."}</small><select value={draft.closedToDeparture} onChange={(event) => setDraft((current) => ({...current, closedToDeparture: event.target.value as TriState}))}><option value="KEEP">{ar ? "بدون تغيير" : "No change"}</option><option value="OPEN">{ar ? "فتح المغادرة" : "Open departures"}</option><option value="CLOSED">{ar ? "منع المغادرة" : "Close departures"}</option></select></label>
        </div>

        <button type="button" className={styles.save} onClick={saveRestrictions} disabled={saving}>{saving ? <Loader2 className={styles.spin} size={18}/> : <Save size={18}/>} {saving ? (ar ? "جارٍ التطبيق…" : "Applying…") : (ar ? "تطبيق القيود على الفترة" : "Apply restrictions to range")}</button>
      </div>
    </div>
  </section>;
}

function RuleToggle({checked, onChange, title, helper, children}: {checked: boolean; onChange: (value: boolean) => void; title: string; helper: string; children: React.ReactNode}) {
  return <div className={`${styles.rule} ${checked ? styles.ruleActive : ""}`}><label className={styles.ruleHead}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)}/><span><strong>{title}</strong><small>{helper}</small></span></label>{checked && <div className={styles.ruleBody}>{children}</div>}</div>;
}

function Stat({icon, label, value, helper}: {icon: React.ReactNode; label: string; value: number; helper: string}) {
  return <div className={styles.stat}><div>{icon}<span>{label}</span></div><strong>{value}</strong><small>{helper}</small></div>;
}

function utcToday() {const now = new Date(); return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));}
function addDays(value: Date, days: number) {return new Date(value.getTime() + days * 86_400_000);}
function dateKey(value: Date) {return value.toISOString().slice(0, 10);}
function weekdayLabel(day: number, locale: Locale) {const start = new Date(Date.UTC(2026, 7, 30 + day)); return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {weekday: "narrow", timeZone: "UTC"}).format(start);}
function apiIssue(payload: unknown, ar: boolean) {const value = payload as {error?: {message?: string}; message?: string} | null; return value?.error?.message ?? value?.message ?? (ar ? "تعذر تنفيذ العملية" : "The operation could not be completed");}
