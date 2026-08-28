"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {Calculator, Loader2, WalletCards} from "lucide-react";
import styles from "./settlement.module.css";

export function FinanceSettlementActions({hotelId, locale, initialFrom, initialTo}: {hotelId: string; locale: "en" | "ar"; initialFrom: string; initialTo: string}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [busy, setBusy] = useState<"reconcile" | "payout" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(kind: "reconcile" | "payout") {
    setBusy(kind);
    setMessage(null);
    setError(null);
    try {
      const endpoint = kind === "reconcile" ? "reconciliation" : "payouts";
      const response = await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/finance/${endpoint}`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({from, to}),
      });
      const body = await response.json().catch(() => null) as {data?: {status?: string; issueCount?: number; payoutNumber?: string}; error?: {message?: string}} | null;
      if (!response.ok) throw new Error(body?.error?.message ?? (ar ? "تعذر تنفيذ العملية" : "The finance operation failed"));
      if (kind === "reconcile") {
        const clean = body?.data?.status === "CLEAN";
        setMessage(clean ? (ar ? "التسوية نظيفة ويمكن إنشاء دفعة." : "Reconciliation is clean and the period is payout-ready.") : (ar ? `التسوية تحتاج مراجعة (${body?.data?.issueCount ?? 0} مشكلة).` : `Reconciliation needs review (${body?.data?.issueCount ?? 0} issue(s)).`));
      } else {
        setMessage(ar ? `تم إنشاء الدفعة ${body?.data?.payoutNumber ?? ""} وإرسالها لطابور المنصة.` : `Payout ${body?.data?.payoutNumber ?? ""} is ready in the platform settlement queue.`);
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ar ? "تعذر تنفيذ العملية" : "The finance operation failed"));
    } finally {
      setBusy(null);
    }
  }

  return <section className={styles.actions}>
    <div className={styles.actionHead}>
      <div><span>{ar ? "فترة التسوية" : "Settlement period"}</span><strong>{ar ? "راجع ثم أنشئ الدفعة" : "Reconcile, then create payout"}</strong></div>
      <small>{ar ? "الاستحقاق مبني على تاريخ المغادرة. حجوزات الدفع في الفندق لا تدخل في مبلغ التحويل." : "Eligibility is departure-based. Pay-at-hotel reservations are never silently included in transfer value."}</small>
    </div>
    <div className={styles.range}>
      <label><span>{ar ? "من" : "From"}</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label>
      <label><span>{ar ? "إلى" : "To"}</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)}/></label>
    </div>
    <div className={styles.buttons}>
      <button type="button" className={styles.secondary} onClick={() => submit("reconcile")} disabled={busy !== null}>{busy === "reconcile" ? <Loader2 className={styles.spin} size={17}/> : <Calculator size={17}/>} {ar ? "تشغيل المطابقة" : "Run reconciliation"}</button>
      <button type="button" className={styles.primary} onClick={() => submit("payout")} disabled={busy !== null}>{busy === "payout" ? <Loader2 className={styles.spin} size={17}/> : <WalletCards size={17}/>} {ar ? "إنشاء دفعة للشريك" : "Create partner payout"}</button>
    </div>
    {message && <p className={styles.success}>{message}</p>}
    {error && <p className={styles.error}>{error}</p>}
  </section>;
}
