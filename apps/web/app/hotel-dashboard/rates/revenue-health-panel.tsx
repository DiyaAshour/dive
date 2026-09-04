"use client";

import {useEffect, useMemo, useState} from "react";
import {AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import styles from "./revenue-health-panel.module.css";

type RatePlan = {id: string; name: string; code: string; active: boolean};
type Room = {id: string; name: string; code: string; quantity: number; active: boolean; ratePlans: RatePlan[]};
type RateRow = {ratePlanId: string; date: string; closed: boolean; stopSell: boolean};
type InventoryRow = {roomTypeId: string; date: string; available: number};
type CalendarData = {rates: RateRow[]; inventory: InventoryRow[]};
type RiskDay = {date: string; missingRates: number; missingInventory: number; zeroInventory: number; lowInventory: number; stopSell: number};

const HORIZON_DAYS = 90;

export default function RevenueHealthPanel({hotelId, rooms, locale}: Readonly<{hotelId: string; rooms: Room[]; locale: Locale}>) {
  const ar = locale === "ar";
  const [data, setData] = useState<CalendarData>({rates: [], inventory: []});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const range = useMemo(() => {
    const from = utcToday();
    return {from: dateKey(from), to: dateKey(addDays(from, HORIZON_DAYS - 1)), days: dateRange(from, addDays(from, HORIZON_DAYS - 1))};
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/calendar?from=${range.from}&to=${range.to}`, {signal: controller.signal})
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (response.status === 401) {
          window.location.assign(`/partner/login?next=${encodeURIComponent(`/hotel-dashboard/rates?hotelId=${hotelId}`)}`);
          return null;
        }
        if (!response.ok) throw new Error(payload?.error?.message ?? (ar ? "تعذر تحميل صحة الإيرادات." : "Unable to load revenue health."));
        return (payload?.data ?? payload) as CalendarData;
      })
      .then((payload) => { if (payload) setData(payload); })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : (ar ? "تعذر تحميل صحة الإيرادات." : "Unable to load revenue health."));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [hotelId, range.from, range.to, reloadKey, ar]);

  const health = useMemo(() => {
    const activeRooms = rooms.filter((room) => room.active);
    const activePlans = activeRooms.flatMap((room) => room.ratePlans.filter((plan) => plan.active));
    const rateKeys = new Map(data.rates.map((row) => [`${row.ratePlanId}:${dateKey(row.date)}`, row]));
    const inventoryKeys = new Map(data.inventory.map((row) => [`${row.roomTypeId}:${dateKey(row.date)}`, row]));
    const riskDays: RiskDay[] = [];
    let configuredRates = 0;
    let configuredInventory = 0;
    let zeroInventory = 0;
    let lowInventory = 0;
    let stopSell = 0;

    for (const date of range.days) {
      const key = dateKey(date);
      const risk: RiskDay = {date: key, missingRates: 0, missingInventory: 0, zeroInventory: 0, lowInventory: 0, stopSell: 0};
      for (const plan of activePlans) {
        const rate = rateKeys.get(`${plan.id}:${key}`);
        if (rate) configuredRates += 1;
        else risk.missingRates += 1;
        if (rate?.closed || rate?.stopSell) { risk.stopSell += 1; stopSell += 1; }
      }
      for (const room of activeRooms) {
        const inventory = inventoryKeys.get(`${room.id}:${key}`);
        if (inventory) configuredInventory += 1;
        else risk.missingInventory += 1;
        if (inventory?.available === 0) { risk.zeroInventory += 1; zeroInventory += 1; }
        else if (inventory && inventory.available <= 2) { risk.lowInventory += 1; lowInventory += 1; }
      }
      if (risk.missingRates || risk.missingInventory || risk.zeroInventory || risk.lowInventory || risk.stopSell) riskDays.push(risk);
    }

    const expectedRates = activePlans.length * range.days.length;
    const expectedInventory = activeRooms.length * range.days.length;
    const expected = expectedRates + expectedInventory;
    const configured = configuredRates + configuredInventory;
    const readiness = expected === 0 ? 0 : Math.round((configured / expected) * 100);

    return {
      activeRooms: activeRooms.length,
      activePlans: activePlans.length,
      expectedRates,
      expectedInventory,
      missingRates: Math.max(0, expectedRates - configuredRates),
      missingInventory: Math.max(0, expectedInventory - configuredInventory),
      zeroInventory,
      lowInventory,
      stopSell,
      riskDays,
      readiness,
    };
  }, [data, range.days, rooms]);

  const clean = health.readiness === 100 && health.missingRates === 0 && health.missingInventory === 0 && health.zeroInventory === 0;

  return <section className={styles.shell}>
    <div className={styles.head}>
      <div className={styles.titleBlock}>
        <span>{ar ? "90-day revenue health" : "90-day revenue health"}</span>
        <h2>{ar ? "اكتشف فجوات البيع قبل أن تتحول إلى حجوزات ضائعة" : "Catch sellability gaps before they become lost bookings"}</h2>
        <p>{ar ? "يفحص كل الغرف وخطط الأسعار النشطة خلال 90 يوماً: السعر، المخزون، النفاد، المخزون المنخفض ووقف البيع." : "Checks every active room and rate plan for the next 90 days: rates, inventory, sell-outs, low stock and stop-sell exposure."}</p>
      </div>
      <div className={styles.headActions}>
        <span className={`${styles.status} ${clean ? styles.statusClean : styles.statusReview}`}>{clean ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>} {clean ? (ar ? "جاهز للبيع" : "Sell-ready") : (ar ? "تحتاج مراجعة" : "Review needed")}</span>
        <button type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}>{loading ? <Loader2 className={styles.spin} size={16}/> : <RefreshCw size={16}/>} {ar ? "تحديث" : "Refresh"}</button>
      </div>
    </div>

    {error && <div className={styles.error}><AlertTriangle size={17}/><span>{error}</span></div>}

    <div className={styles.metrics} aria-busy={loading}>
      <Metric label={ar ? "اكتمال المصدر" : "Source completeness"} value={`${health.readiness}%`} helper={`${health.activeRooms} ${ar ? "غرف" : "rooms"} · ${health.activePlans} ${ar ? "خطط" : "plans"}`} tone={health.readiness === 100 ? "good" : "warn"}/>
      <Metric label={ar ? "خانات سعر مفقودة" : "Missing rate slots"} value={health.missingRates} helper={`${health.expectedRates} ${ar ? "متوقعة" : "expected"}`} tone={health.missingRates ? "warn" : "good"}/>
      <Metric label={ar ? "خانات مخزون مفقودة" : "Missing inventory slots"} value={health.missingInventory} helper={`${health.expectedInventory} ${ar ? "متوقعة" : "expected"}`} tone={health.missingInventory ? "warn" : "good"}/>
      <Metric label={ar ? "نفاد مخزون" : "Sold-out slots"} value={health.zeroInventory} helper={ar ? "متاح = 0" : "available = 0"} tone={health.zeroInventory ? "warn" : "neutral"}/>
      <Metric label={ar ? "مخزون منخفض" : "Low inventory"} value={health.lowInventory} helper={ar ? "1–2 غرفة" : "1–2 rooms"} tone={health.lowInventory ? "warn" : "neutral"}/>
      <Metric label={ar ? "وقف/إغلاق بيع" : "Stop-sell / closed"} value={health.stopSell} helper={ar ? "على خطط الأسعار" : "rate-plan slots"} tone={health.stopSell ? "neutral" : "good"}/>
    </div>

    <div className={styles.attention}>
      <div className={styles.attentionHead}><div><ShieldCheck size={18}/><div><strong>{ar ? "أيام تحتاج انتباه" : "Dates needing attention"}</strong><span>{ar ? `${health.riskDays.length} يوم من أصل ${HORIZON_DAYS}` : `${health.riskDays.length} of ${HORIZON_DAYS} days`}</span></div></div><small>{formatDate(range.from, locale)} → {formatDate(range.to, locale)}</small></div>
      {loading ? <div className={styles.loading}><Loader2 className={styles.spin} size={18}/>{ar ? "جارٍ فحص كل الغرف والخطط…" : "Checking all rooms and plans…"}</div> : health.riskDays.length === 0 ? <div className={styles.empty}><CheckCircle2 size={20}/><span>{ar ? "لا توجد فجوات تشغيلية ظاهرة في نطاق الـ90 يوم." : "No operational sellability gaps detected in the 90-day window."}</span></div> : <div className={styles.riskList}>{health.riskDays.slice(0, 12).map((risk) => <article key={risk.date}>
        <strong>{formatDate(risk.date, locale)}</strong>
        <div>{risk.missingRates > 0 && <span>{ar ? `${risk.missingRates} سعر مفقود` : `${risk.missingRates} missing rate`}</span>}{risk.missingInventory > 0 && <span>{ar ? `${risk.missingInventory} مخزون مفقود` : `${risk.missingInventory} missing inventory`}</span>}{risk.zeroInventory > 0 && <span>{ar ? `${risk.zeroInventory} نفاد` : `${risk.zeroInventory} sold out`}</span>}{risk.lowInventory > 0 && <span>{ar ? `${risk.lowInventory} منخفض` : `${risk.lowInventory} low stock`}</span>}{risk.stopSell > 0 && <span>{ar ? `${risk.stopSell} موقوف` : `${risk.stopSell} stop-sell`}</span>}</div>
      </article>)}</div>}
      {health.riskDays.length > 12 && <p className={styles.more}>{ar ? `+ ${health.riskDays.length - 12} يوم إضافي يحتاج مراجعة. استخدم التقويم بالأسفل للتعديل.` : `+ ${health.riskDays.length - 12} more dates need review. Use the calendar below to edit them.`}</p>}
    </div>
  </section>;
}

function Metric({label, value, helper, tone}: {label: string; value: string | number; helper: string; tone: "good" | "warn" | "neutral"}) {
  return <div className={`${styles.metric} ${tone === "good" ? styles.good : tone === "warn" ? styles.warn : ""}`}><span>{label}</span><strong>{value}</strong><small>{helper}</small></div>;
}

function utcToday() { const now = new Date(); return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())); }
function addDays(value: Date, days: number) { return new Date(value.getTime() + days * 86_400_000); }
function dateRange(from: Date, to: Date) { const values: Date[] = []; for (let cursor = new Date(from); cursor <= to; cursor = addDays(cursor, 1)) values.push(cursor); return values; }
function dateKey(value: Date | string) { return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10); }
function formatDate(value: string, locale: Locale) { return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}).format(new Date(`${value}T00:00:00.000Z`)); }
