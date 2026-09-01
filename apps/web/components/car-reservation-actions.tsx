"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./car-reservation-actions.module.css";

type ManagedStatus = "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "COMPLETED";

type Props = Readonly<{
  reservationId: string;
  status: string;
  locale: "ar" | "en";
}>;

const finalStatuses = new Set(["CANCELLED", "NO_SHOW", "COMPLETED", "EXPIRED"]);

export function CarReservationActions({reservationId, status, locale}: Props) {
  const ar = locale === "ar";
  const router = useRouter();
  const options = useMemo(() => availableStatuses(status), [status]);
  const [nextStatus, setNextStatus] = useState<ManagedStatus | "">(options[0]?.value ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (finalStatuses.has(status) || options.length === 0) {
    return <span className={styles.final}>{ar ? "حالة نهائية" : "Final state"}</span>;
  }

  async function updateStatus() {
    if (!nextStatus || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/cars/partner/reservations/${reservationId}`, {
        method: "PATCH",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({status: nextStatus, ...(nextStatus === "CANCELLED" && note.trim() ? {note: note.trim()} : {})}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || (ar ? "تعذر تحديث الحجز" : "Could not update reservation"));
      router.refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : (ar ? "تعذر تحديث الحجز" : "Could not update reservation"));
    } finally {
      setLoading(false);
    }
  }

  return <div className={styles.box}>
    <div className={styles.row}>
      <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ManagedStatus)} aria-label={ar ? "تغيير حالة الحجز" : "Change reservation status"}>
        {options.map((option) => <option key={option.value} value={option.value}>{ar ? option.ar : option.en}</option>)}
      </select>
      <button type="button" onClick={updateStatus} disabled={loading || !nextStatus}>
        {loading ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "تحديث" : "Update")}
      </button>
    </div>
    {nextStatus === "CANCELLED" && <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder={ar ? "سبب الإلغاء (اختياري)" : "Cancellation reason (optional)"}/>} 
    {error && <small className={styles.error}>{error}</small>}
  </div>;
}

function availableStatuses(status: string) {
  if (status === "HOLD") return [
    {value: "CONFIRMED" as const, ar: "تأكيد الحجز", en: "Confirm"},
    {value: "CANCELLED" as const, ar: "إلغاء الحجز", en: "Cancel"},
  ];
  if (status === "CONFIRMED" || status === "MODIFIED") return [
    {value: "COMPLETED" as const, ar: "مكتمل", en: "Complete"},
    {value: "NO_SHOW" as const, ar: "لم يحضر", en: "No-show"},
    {value: "CANCELLED" as const, ar: "إلغاء الحجز", en: "Cancel"},
  ];
  return [];
}
