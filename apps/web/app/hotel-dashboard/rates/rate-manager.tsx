"use client";

import Link from "next/link";
import {useEffect, useMemo, useState} from "react";
import {AlertTriangle, ArrowLeft, ArrowRight, CalendarRange, Check, ChevronLeft, ChevronRight, Loader2, Pencil, RefreshCw, Save, SlidersHorizontal, X} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import styles from "./rates.module.css";

type RatePlanOption = {id: string; name: string; code: string; active: boolean; refundable: boolean; mealPlan: string};
type RoomOption = {id: string; name: string; code: string; quantity: number; active: boolean; ratePlans: RatePlanOption[]};
type RateRow = {id: string; ratePlanId: string; date: string; baseRate: string | number; minStay: number; maxStay: number | null; closed: boolean; stopSell: boolean};
type InventoryRow = {id: string; roomTypeId: string; date: string; available: number; overbookingLimit: number};
type CalendarData = {rates: RateRow[]; inventory: InventoryRow[]};
type DayDraft = {date: string; rate: string; available: string; overbookingLimit: string; minStay: string; maxStay: string; closed: boolean; stopSell: boolean};
type RateMode = "SET" | "ADD" | "PERCENT";
type SaleMode = "KEEP" | "OPEN" | "STOP";
type ClosedMode = "KEEP" | "OPEN" | "CLOSED";
type BulkDraft = {
  from: string;
  to: string;
  weekdays: number[];
  rateEnabled: boolean;
  rateMode: RateMode;
  rateValue: string;
  inventoryEnabled: boolean;
  available: string;
  overbookingEnabled: boolean;
  overbookingLimit: string;
  minStayEnabled: boolean;
  minStay: string;
  maxStayEnabled: boolean;
  maxStay: string;
  stopSell: SaleMode;
  closed: ClosedMode;
};

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export default function RateManager({hotelId, currency, overbookingEnabled, rooms, locale}: Readonly<{hotelId: string; currency: string; overbookingEnabled: boolean; rooms: RoomOption[]; locale: Locale}>) {
  const ar = locale === "ar";
  const firstRoom = rooms.find((room) => room.active && room.ratePlans.some((plan) => plan.active)) ?? rooms[0];
  const [roomTypeId, setRoomTypeId] = useState(firstRoom?.id ?? "");
  const [ratePlanId, setRatePlanId] = useState(firstRoom?.ratePlans.find((plan) => plan.active)?.id ?? firstRoom?.ratePlans[0]?.id ?? "");
  const [cursor, setCursor] = useState(() => monthStart(new Date()));
  const [calendar, setCalendar] = useState<CalendarData>({rates: [], inventory: []});
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dayDraft, setDayDraft] = useState<DayDraft | null>(null);
  const [dayBusy, setDayBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const initialFrom = dateKey(cursor);
  const initialTo = dateKey(monthEnd(cursor));
  const [bulk, setBulk] = useState<BulkDraft>(() => ({
    from: initialFrom,
    to: initialTo,
    weekdays: [...ALL_WEEKDAYS],
    rateEnabled: true,
    rateMode: "SET",
    rateValue: "",
    inventoryEnabled: true,
    available: firstRoom ? String(firstRoom.quantity) : "",
    overbookingEnabled: false,
    overbookingLimit: "0",
    minStayEnabled: false,
    minStay: "1",
    maxStayEnabled: false,
    maxStay: "",
    stopSell: "KEEP",
    closed: "KEEP",
  }));

  const room = rooms.find((item) => item.id === roomTypeId) ?? null;
  const plan = room?.ratePlans.find((item) => item.id === ratePlanId) ?? null;
  const from = dateKey(cursor);
  const to = dateKey(monthEnd(cursor));
  const days = useMemo(() => dateRange(cursor, monthEnd(cursor)), [cursor]);

  useEffect(() => {
    if (!roomTypeId || !ratePlanId) {setCalendar({rates: [], inventory: []}); return;}
    const controller = new AbortController();
    setLoading(true); setError(null);
    fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/calendar?from=${from}&to=${to}`, {signal: controller.signal})
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (response.status === 401) {window.location.assign(`/partner/login?next=${encodeURIComponent(`/hotel-dashboard/rates?hotelId=${hotelId}`)}`); return null;}
        if (!response.ok) throw new Error(apiIssue(payload, ar));
        return (payload?.data ?? payload) as CalendarData;
      })
      .then((data) => {if (data) setCalendar(data);})
      .catch((cause) => {if (cause instanceof DOMException && cause.name === "AbortError") return; setError(cause instanceof Error ? cause.message : (ar ? "تعذر تحميل التقويم" : "Unable to load calendar"));})
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [hotelId, roomTypeId, ratePlanId, from, to, reloadKey, ar]);

  const rateByDate = useMemo(() => new Map(calendar.rates.filter((item) => item.ratePlanId === ratePlanId).map((item) => [dateKey(item.date), item])), [calendar.rates, ratePlanId]);
  const inventoryByDate = useMemo(() => new Map(calendar.inventory.filter((item) => item.roomTypeId === roomTypeId).map((item) => [dateKey(item.date), item])), [calendar.inventory, roomTypeId]);
  const configuredDays = days.filter((date) => rateByDate.has(dateKey(date)) && inventoryByDate.has(dateKey(date))).length;
  const missingRateDays = days.filter((date) => !rateByDate.has(dateKey(date))).length;
  const stopSellDays = days.filter((date) => {const rate = rateByDate.get(dateKey(date)); return Boolean(rate?.stopSell || rate?.closed);}).length;
  const lowInventoryDays = days.filter((date) => {const inventory = inventoryByDate.get(dateKey(date)); return inventory !== undefined && inventory.available <= 2;}).length;

  function chooseRoom(id: string) {
    const nextRoom = rooms.find((item) => item.id === id);
    setRoomTypeId(id);
    setRatePlanId(nextRoom?.ratePlans.find((item) => item.active)?.id ?? nextRoom?.ratePlans[0]?.id ?? "");
    setBulk((current) => ({...current, available: nextRoom ? String(nextRoom.quantity) : ""}));
    setMessage(null); setError(null); setDayDraft(null);
  }

  function moveMonth(offset: number) {setCursor((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1))); setDayDraft(null);}
  function goToday() {setCursor(monthStart(new Date())); setDayDraft(null);}

  function openDay(date: string) {
    const rate = rateByDate.get(date);
    const inventory = inventoryByDate.get(date);
    setDayDraft({
      date,
      rate: rate ? String(Number(rate.baseRate)) : "",
      available: String(inventory?.available ?? room?.quantity ?? 0),
      overbookingLimit: String(inventory?.overbookingLimit ?? 0),
      minStay: String(rate?.minStay ?? 1),
      maxStay: rate?.maxStay === null || rate?.maxStay === undefined ? "" : String(rate.maxStay),
      closed: rate?.closed ?? false,
      stopSell: rate?.stopSell ?? false,
    });
    setError(null); setMessage(null);
  }

  async function saveDay() {
    if (!dayDraft || !room || !plan) return;
    if (dayDraft.rate.trim() === "") {setError(ar ? "أدخل سعر اليوم قبل الحفظ." : "Enter the daily rate before saving."); return;}
    setDayBusy(true); setError(null); setMessage(null);
    try {
      const body = {
        roomTypeId: room.id,
        ratePlanId: plan.id,
        from: dayDraft.date,
        to: dayDraft.date,
        rate: {mode: "SET", value: Number(dayDraft.rate)},
        available: Number(dayDraft.available),
        overbookingLimit: Number(dayDraft.overbookingLimit),
        minStay: Number(dayDraft.minStay),
        maxStay: dayDraft.maxStay.trim() === "" ? null : Number(dayDraft.maxStay),
        closed: dayDraft.closed,
        stopSell: dayDraft.stopSell,
      };
      await mutateCalendar(body);
      setDayDraft(null);
      setReloadKey((value) => value + 1);
      setMessage(ar ? `تم حفظ ${formatShortDate(body.from, locale)}.` : `${formatShortDate(body.from, locale)} saved.`);
    } catch (cause) {setError(cause instanceof Error ? cause.message : (ar ? "تعذر حفظ اليوم" : "Unable to save day"));}
    finally {setDayBusy(false);}
  }

  function toggleWeekday(day: number) {
    setBulk((current) => ({...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((value) => value !== day) : [...current.weekdays, day].sort()}));
  }

  function setRange(preset: "month" | "30" | "365") {
    const today = utcToday();
    if (preset === "month") setBulk((current) => ({...current, from: dateKey(cursor), to: dateKey(monthEnd(cursor))}));
    if (preset === "30") setBulk((current) => ({...current, from: dateKey(today), to: dateKey(addDays(today, 29))}));
    if (preset === "365") setBulk((current) => ({...current, from: dateKey(today), to: dateKey(addDays(today, 364))}));
  }

  async function applyBulk() {
    if (!room || !plan) return;
    if (!bulk.weekdays.length) {setError(ar ? "اختر يوماً واحداً على الأقل من أيام الأسبوع." : "Select at least one weekday."); return;}
    const body: Record<string, unknown> = {roomTypeId: room.id, ratePlanId: plan.id, from: bulk.from, to: bulk.to, weekdays: bulk.weekdays};
    if (bulk.rateEnabled) {
      if (bulk.rateValue.trim() === "") {setError(ar ? "أدخل قيمة تعديل السعر أو ألغِ خيار السعر." : "Enter a rate value or disable rate editing."); return;}
      body.rate = {mode: bulk.rateMode, value: Number(bulk.rateValue)};
    }
    if (bulk.inventoryEnabled) body.available = Number(bulk.available);
    if (bulk.overbookingEnabled) body.overbookingLimit = Number(bulk.overbookingLimit);
    if (bulk.minStayEnabled) body.minStay = Number(bulk.minStay);
    if (bulk.maxStayEnabled) body.maxStay = bulk.maxStay.trim() === "" ? null : Number(bulk.maxStay);
    if (bulk.stopSell !== "KEEP") body.stopSell = bulk.stopSell === "STOP";
    if (bulk.closed !== "KEEP") body.closed = bulk.closed === "CLOSED";
    if (Object.keys(body).length <= 5) {setError(ar ? "فعّل حقلاً واحداً على الأقل للتعديل." : "Enable at least one field to update."); return;}

    setBulkBusy(true); setError(null); setMessage(null);
    try {
      const result = await mutateCalendar(body) as {updatedDays?: number};
      setReloadKey((value) => value + 1);
      setMessage(ar ? `تم تطبيق التعديل على ${result?.updatedDays ?? ""} يوم بنجاح.` : `Bulk update applied to ${result?.updatedDays ?? ""} days.`);
    } catch (cause) {setError(cause instanceof Error ? cause.message : (ar ? "تعذر تطبيق التعديل الجماعي" : "Unable to apply bulk update"));}
    finally {setBulkBusy(false);}
  }

  async function mutateCalendar(body: unknown) {
    const response = await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/calendar`, {method: "PATCH", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
    const payload = await response.json().catch(() => null);
    if (response.status === 401) {window.location.assign(`/partner/login?next=${encodeURIComponent(`/hotel-dashboard/rates?hotelId=${hotelId}`)}`); throw new Error(ar ? "انتهت الجلسة" : "Session expired");}
    if (!response.ok) throw new Error(apiIssue(payload, ar));
    return payload?.data ?? payload;
  }

  if (!rooms.length) return <section className={styles.empty}><CalendarRange size={34}/><h2>{ar ? "أنشئ غرفة أولاً" : "Create a room first"}</h2><p>{ar ? "الأسعار والمخزون يرتبطان بنوع غرفة وخطة سعر." : "Rates and inventory need a room type and rate plan."}</p><Link className="primaryButton" href={`/hotel-dashboard/rooms?hotelId=${hotelId}&create=1`}>{ar ? "إنشاء غرفة" : "Create room"}</Link></section>;

  return <div className={styles.manager}>
    {(message || error) && <div className={`${styles.notice} ${error ? styles.noticeError : styles.noticeSuccess}`}>{error ? <AlertTriangle size={18}/> : <Check size={18}/>}<span>{error ?? message}</span><button type="button" onClick={() => {setError(null); setMessage(null);}} aria-label={ar ? "إغلاق" : "Close"}><X size={16}/></button></div>}

    <section className={styles.toolbar}>
      <div className={styles.productSelectors}>
        <label><span>{ar ? "نوع الغرفة" : "Room type"}</span><select value={roomTypeId} onChange={(event) => chooseRoom(event.target.value)}>{rooms.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.code}{item.active ? "" : ar ? " · غير نشطة" : " · inactive"}</option>)}</select></label>
        <label><span>{ar ? "خطة السعر" : "Rate plan"}</span><select value={ratePlanId} onChange={(event) => {setRatePlanId(event.target.value); setDayDraft(null);}}>{room?.ratePlans.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.code}{item.active ? "" : ar ? " · غير نشطة" : " · inactive"}</option>)}</select></label>
      </div>
      <div className={styles.monthNav}>
        <button type="button" onClick={() => moveMonth(ar ? 1 : -1)} aria-label={ar ? "الشهر السابق" : "Previous month"}>{ar ? <ChevronRight size={19}/> : <ChevronLeft size={19}/>}</button>
        <button type="button" className={styles.monthLabel} onClick={goToday}><CalendarRange size={17}/><strong>{formatMonth(cursor, locale)}</strong><small>{ar ? "العودة لليوم" : "Back to today"}</small></button>
        <button type="button" onClick={() => moveMonth(ar ? -1 : 1)} aria-label={ar ? "الشهر التالي" : "Next month"}>{ar ? <ChevronLeft size={19}/> : <ChevronRight size={19}/>}</button>
        <button type="button" className={styles.refresh} onClick={() => setReloadKey((value) => value + 1)} disabled={loading}><RefreshCw size={17}/>{ar ? "تحديث" : "Refresh"}</button>
      </div>
    </section>

    {!plan && <section className={styles.empty}><AlertTriangle size={30}/><h2>{ar ? "هذه الغرفة بلا خطة سعر" : "This room has no rate plan"}</h2><p>{ar ? "أنشئ خطة سعر للغرفة ثم ارجع إلى التقويم." : "Create a rate plan for this room, then return to the calendar."}</p><Link className="primaryButton" href={`/hotel-dashboard/rooms?hotelId=${hotelId}`}>{ar ? "فتح الغرف" : "Open rooms"}</Link></section>}

    {plan && <div className={styles.workspace}>
      <div className={styles.calendarColumn}>
        <section className={styles.healthStrip}>
          <Health label={ar ? "أيام مكتملة" : "Configured days"} value={`${configuredDays}/${days.length}`} tone="good"/>
          <Health label={ar ? "سعر مفقود" : "Missing rates"} value={missingRateDays} tone={missingRateDays ? "warn" : "good"}/>
          <Health label={ar ? "وقف/إغلاق بيع" : "Closed / stop sell"} value={stopSellDays} tone={stopSellDays ? "warn" : "neutral"}/>
          <Health label={ar ? "مخزون منخفض ≤2" : "Low inventory ≤2"} value={lowInventoryDays} tone={lowInventoryDays ? "warn" : "neutral"}/>
        </section>

        <section className={styles.calendarPanel} aria-busy={loading}>
          <div className={styles.calendarHead}><div><span>{room?.name}</span><h2>{plan.name}</h2><p>{plan.code} · {mealLabel(plan.mealPlan, ar)} · {plan.refundable ? (ar ? "قابل للإلغاء" : "Refundable") : (ar ? "غير مسترد" : "Non-refundable")}</p></div><div className={styles.legend}><span><i className={styles.dotReady}/>{ar ? "جاهز" : "Ready"}</span><span><i className={styles.dotMissing}/>{ar ? "ناقص" : "Missing"}</span><span><i className={styles.dotClosed}/>{ar ? "موقوف" : "Closed"}</span></div></div>
          {loading && <div className={styles.loadingBar}><Loader2 size={17} className={styles.spin}/>{ar ? "تحميل الأسعار والمخزون…" : "Loading rates and inventory…"}</div>}
          <div className={styles.dayGrid}>{days.map((date) => {
            const key = dateKey(date);
            const rate = rateByDate.get(key);
            const inventory = inventoryByDate.get(key);
            const closed = Boolean(rate?.closed || rate?.stopSell);
            const missing = !rate || !inventory;
            const today = key === dateKey(utcToday());
            return <button type="button" onClick={() => openDay(key)} className={`${styles.dayCard} ${missing ? styles.dayMissing : ""} ${closed ? styles.dayClosed : ""} ${today ? styles.dayToday : ""}`} key={key}>
              <div className={styles.dayTop}><span>{formatWeekday(date, locale)}</span><strong>{date.getUTCDate()}</strong>{today && <small>{ar ? "اليوم" : "Today"}</small>}</div>
              <div className={styles.rateValue}>{rate ? <><strong>{formatMoney(rate.baseRate)}</strong><span>{currency}</span></> : <span className={styles.missingText}>{ar ? "ضع سعراً" : "Set rate"}</span>}</div>
              <div className={styles.inventoryLine}><span>{ar ? "المتاح" : "Available"}</span><strong className={inventory && inventory.available <= 2 ? styles.low : ""}>{inventory ? inventory.available : "—"}<small>/{room?.quantity ?? 0}</small></strong></div>
              <div className={styles.tags}>{rate?.minStay && rate.minStay > 1 && <span>{ar ? `حد ${rate.minStay} ليالٍ` : `Min ${rate.minStay}n`}</span>}{rate?.maxStay && <span>{ar ? `أقصى ${rate.maxStay}` : `Max ${rate.maxStay}n`}</span>}{rate?.stopSell && <span className={styles.stopTag}>{ar ? "وقف بيع" : "Stop sell"}</span>}{rate?.closed && <span className={styles.stopTag}>{ar ? "مغلق" : "Closed"}</span>}</div>
              <Pencil size={14} className={styles.editIcon}/>
            </button>;
          })}</div>
        </section>
      </div>

      <aside className={styles.bulkPanel}>
        <div className={styles.bulkHead}><SlidersHorizontal size={20}/><div><span>{ar ? "تعديل جماعي" : "Bulk editor"}</span><h2>{ar ? "عدّل موسماً كاملاً" : "Update a full season"}</h2></div></div>
        <p className={styles.bulkIntro}>{ar ? "اختر الفترة والأيام التي تريدها فقط. الحقول غير المفعّلة تبقى كما هي." : "Choose the range and weekdays. Disabled fields are left untouched."}</p>
        <div className={styles.presets}><button type="button" onClick={() => setRange("month")}>{ar ? "هذا الشهر" : "This month"}</button><button type="button" onClick={() => setRange("30")}>{ar ? "30 يوم" : "30 days"}</button><button type="button" onClick={() => setRange("365")}>{ar ? "365 يوم" : "365 days"}</button></div>
        <div className={styles.rangeGrid}><label>{ar ? "من" : "From"}<input type="date" value={bulk.from} onChange={(event) => setBulk((current) => ({...current, from: event.target.value}))}/></label><label>{ar ? "إلى" : "To"}<input type="date" value={bulk.to} onChange={(event) => setBulk((current) => ({...current, to: event.target.value}))}/></label></div>
        <div className={styles.fieldGroup}><span className={styles.groupLabel}>{ar ? "أيام الأسبوع" : "Weekdays"}</span><div className={styles.weekdays}>{ALL_WEEKDAYS.map((day) => <button type="button" className={bulk.weekdays.includes(day) ? styles.weekdayActive : ""} onClick={() => toggleWeekday(day)} key={day}>{weekdayLabel(day, locale)}</button>)}</div></div>

        <ToggleField checked={bulk.rateEnabled} onChange={(checked) => setBulk((current) => ({...current, rateEnabled: checked}))} label={ar ? "تعديل السعر" : "Update rate"}>
          <div className={styles.inlineFields}><select value={bulk.rateMode} onChange={(event) => setBulk((current) => ({...current, rateMode: event.target.value as RateMode}))}><option value="SET">{ar ? "تعيين سعر" : "Set rate"}</option><option value="ADD">{ar ? "زيادة/خفض مبلغ" : "Add/subtract"}</option><option value="PERCENT">{ar ? "زيادة/خفض %" : "Adjust %"}</option></select><input type="number" step="0.01" value={bulk.rateValue} onChange={(event) => setBulk((current) => ({...current, rateValue: event.target.value}))} placeholder={bulk.rateMode === "PERCENT" ? "10" : `95 ${currency}`}/></div>
        </ToggleField>
        <ToggleField checked={bulk.inventoryEnabled} onChange={(checked) => setBulk((current) => ({...current, inventoryEnabled: checked}))} label={ar ? "تعديل المخزون" : "Update inventory"}><input type="number" min="0" max={room?.quantity ?? 10000} value={bulk.available} onChange={(event) => setBulk((current) => ({...current, available: event.target.value}))}/><small>{ar ? `الحد الفعلي لهذه الغرفة: ${room?.quantity ?? 0}` : `Physical room quantity: ${room?.quantity ?? 0}`}</small></ToggleField>
        <ToggleField checked={bulk.minStayEnabled} onChange={(checked) => setBulk((current) => ({...current, minStayEnabled: checked}))} label={ar ? "الحد الأدنى للإقامة" : "Minimum stay"}><input type="number" min="1" max="365" value={bulk.minStay} onChange={(event) => setBulk((current) => ({...current, minStay: event.target.value}))}/></ToggleField>
        <ToggleField checked={bulk.maxStayEnabled} onChange={(checked) => setBulk((current) => ({...current, maxStayEnabled: checked}))} label={ar ? "الحد الأقصى للإقامة" : "Maximum stay"}><input type="number" min="1" max="365" value={bulk.maxStay} onChange={(event) => setBulk((current) => ({...current, maxStay: event.target.value}))} placeholder={ar ? "فارغ = بدون حد" : "Blank = no limit"}/></ToggleField>
        {overbookingEnabled && <ToggleField checked={bulk.overbookingEnabled} onChange={(checked) => setBulk((current) => ({...current, overbookingEnabled: checked}))} label={ar ? "حد تجاوز الحجز" : "Overbooking limit"}><input type="number" min="0" max="1000" value={bulk.overbookingLimit} onChange={(event) => setBulk((current) => ({...current, overbookingLimit: event.target.value}))}/></ToggleField>}
        <div className={styles.statusGrid}><label>{ar ? "وقف البيع" : "Stop sell"}<select value={bulk.stopSell} onChange={(event) => setBulk((current) => ({...current, stopSell: event.target.value as SaleMode}))}><option value="KEEP">{ar ? "بدون تغيير" : "No change"}</option><option value="OPEN">{ar ? "فتح البيع" : "Open sales"}</option><option value="STOP">{ar ? "وقف البيع" : "Stop sell"}</option></select></label><label>{ar ? "حالة الخطة" : "Rate status"}<select value={bulk.closed} onChange={(event) => setBulk((current) => ({...current, closed: event.target.value as ClosedMode}))}><option value="KEEP">{ar ? "بدون تغيير" : "No change"}</option><option value="OPEN">{ar ? "مفتوحة" : "Open"}</option><option value="CLOSED">{ar ? "مغلقة" : "Closed"}</option></select></label></div>
        <button className={styles.applyButton} type="button" onClick={applyBulk} disabled={bulkBusy}>{bulkBusy ? <Loader2 className={styles.spin} size={18}/> : <Save size={18}/>} {bulkBusy ? (ar ? "جارٍ التطبيق…" : "Applying…") : (ar ? "تطبيق على الفترة" : "Apply to range")}</button>
        <div className={styles.auditNote}><Check size={16}/><span>{ar ? "كل عملية جماعية تُسجل باسم المستخدم والفترة والحقول التي تغيرت." : "Every bulk operation records the actor, date range and changed fields."}</span></div>
      </aside>
    </div>}

    {dayDraft && <div className={styles.drawerBackdrop} role="presentation" onMouseDown={() => !dayBusy && setDayDraft(null)}><aside className={styles.dayDrawer} role="dialog" aria-modal="true" aria-label={ar ? "تعديل يوم" : "Edit day"} onMouseDown={(event) => event.stopPropagation()}>
      <div className={styles.drawerHead}><div><span>{ar ? "تعديل يوم واحد" : "Single-day edit"}</span><h2>{formatLongDate(dayDraft.date, locale)}</h2><p>{room?.name} · {plan?.name}</p></div><button type="button" onClick={() => setDayDraft(null)} disabled={dayBusy}><X size={19}/></button></div>
      <div className={styles.drawerGrid}><label>{ar ? `السعر (${currency})` : `Rate (${currency})`}<input type="number" min="0" max="1000000" step="0.01" value={dayDraft.rate} onChange={(event) => setDayDraft((current) => current ? {...current, rate: event.target.value} : current)}/></label><label>{ar ? "المخزون المتاح" : "Available inventory"}<input type="number" min="0" max={room?.quantity ?? 10000} value={dayDraft.available} onChange={(event) => setDayDraft((current) => current ? {...current, available: event.target.value} : current)}/><small>{ar ? `من أصل ${room?.quantity ?? 0} وحدة` : `of ${room?.quantity ?? 0} units`}</small></label><label>{ar ? "أقل عدد ليالٍ" : "Minimum stay"}<input type="number" min="1" max="365" value={dayDraft.minStay} onChange={(event) => setDayDraft((current) => current ? {...current, minStay: event.target.value} : current)}/></label><label>{ar ? "أقصى عدد ليالٍ" : "Maximum stay"}<input type="number" min="1" max="365" value={dayDraft.maxStay} onChange={(event) => setDayDraft((current) => current ? {...current, maxStay: event.target.value} : current)} placeholder={ar ? "بدون حد" : "No limit"}/></label>{overbookingEnabled && <label>{ar ? "حد تجاوز الحجز" : "Overbooking limit"}<input type="number" min="0" max="1000" value={dayDraft.overbookingLimit} onChange={(event) => setDayDraft((current) => current ? {...current, overbookingLimit: event.target.value} : current)}/></label>}</div>
      <div className={styles.daySwitches}><label><input type="checkbox" checked={dayDraft.stopSell} onChange={(event) => setDayDraft((current) => current ? {...current, stopSell: event.target.checked} : current)}/><span><strong>{ar ? "وقف البيع" : "Stop sell"}</strong><small>{ar ? "يبقي السعر محفوظاً لكنه يمنع حجوزات جديدة." : "Keeps the rate but blocks new sales."}</small></span></label><label><input type="checkbox" checked={dayDraft.closed} onChange={(event) => setDayDraft((current) => current ? {...current, closed: event.target.checked} : current)}/><span><strong>{ar ? "إغلاق خطة السعر" : "Close rate plan"}</strong><small>{ar ? "يغلق هذه الخطة لهذا اليوم." : "Closes this rate plan for the day."}</small></span></label></div>
      <div className={styles.drawerActions}><button type="button" className="secondaryButton" onClick={() => setDayDraft(null)} disabled={dayBusy}>{ar ? "إلغاء" : "Cancel"}</button><button type="button" className="primaryButton" onClick={saveDay} disabled={dayBusy}>{dayBusy ? <Loader2 className={styles.spin} size={17}/> : <Save size={17}/>} {dayBusy ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ اليوم" : "Save day")}</button></div>
    </aside></div>}
  </div>;
}

function ToggleField({checked, onChange, label, children}: {checked: boolean; onChange: (checked: boolean) => void; label: string; children: React.ReactNode}) {
  return <div className={`${styles.toggleField} ${checked ? styles.toggleFieldActive : ""}`}><label className={styles.toggleHead}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)}/><strong>{label}</strong></label>{checked && <div className={styles.toggleBody}>{children}</div>}</div>;
}

function Health({label, value, tone}: {label: string; value: string | number; tone: "good" | "warn" | "neutral"}) {
  return <div className={`${styles.health} ${tone === "good" ? styles.healthGood : tone === "warn" ? styles.healthWarn : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}

function monthStart(value: Date) {return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));}
function monthEnd(value: Date) {return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));}
function utcToday() {const now = new Date(); return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));}
function addDays(value: Date, days: number) {return new Date(value.getTime() + days * 86_400_000);}
function dateRange(from: Date, to: Date) {const result: Date[] = []; for (let cursor = new Date(from); cursor <= to; cursor = addDays(cursor, 1)) result.push(cursor); return result;}
function dateKey(value: Date | string) {return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);}
function formatMonth(value: Date, locale: Locale) {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {month: "long", year: "numeric", timeZone: "UTC"}).format(value);}
function formatWeekday(value: Date, locale: Locale) {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {weekday: "short", timeZone: "UTC"}).format(value);}
function formatShortDate(value: string, locale: Locale) {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "numeric", month: "short", timeZone: "UTC"}).format(new Date(`${value}T00:00:00.000Z`));}
function formatLongDate(value: string, locale: Locale) {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"}).format(new Date(`${value}T00:00:00.000Z`));}
function formatMoney(value: string | number) {return new Intl.NumberFormat("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 2}).format(Number(value));}
function weekdayLabel(day: number, locale: Locale) {const start = new Date(Date.UTC(2026, 7, 30 + day)); return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {weekday: "narrow", timeZone: "UTC"}).format(start);}
function mealLabel(value: string, ar: boolean) {const labels: Record<string, [string, string]> = {ROOM_ONLY: ["Room only", "بدون وجبات"], BREAKFAST: ["Breakfast", "إفطار"], HALF_BOARD: ["Half board", "نصف إقامة"], FULL_BOARD: ["Full board", "إقامة كاملة"]}; return labels[value]?.[ar ? 1 : 0] ?? value;}
function apiIssue(payload: unknown, ar: boolean) {const value = payload as {error?: {message?: string; code?: string}; message?: string} | null; return value?.error?.message ?? value?.message ?? (ar ? "تعذر تنفيذ العملية" : "The operation could not be completed");}
