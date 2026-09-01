"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./car-reservation-actions.module.css";

type ManagedStatus = "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "COMPLETED";

type Props = Readonly<{
  reservationId: string;
  status: string;
  pickupAt: string;
  returnAt: string;
  locale: "ar" | "en";
}>;

const finalStatuses = new Set(["CANCELLED", "NO_SHOW", "COMPLETED", "EXPIRED"]);

export function CarReservationActions({reservationId, status, pickupAt, returnAt, locale}: Props) {
  const ar = locale === "ar";
  const router = useRouter();
  const options = useMemo(() => availableStatuses(status, pickupAt, returnAt), [status, pickupAt, returnAt]);
  const [nextStatus, setNextStatus] = useState<ManagedStatus | "">(options[0]?.value ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedStatus = options.some((option) => option.value === nextStatus) ? nextStatus : options[0]?.value ?? "";

  if (finalStatuses.has(status) || options.length === 0) {
    return <span className={styles.final}>{ar ? "حالة نهائية" : "Final state"}</span>;
  }

  async function updateStatus() {
    if (!selectedStatus || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/cars/partner/reservations/${reservationId}`, {
        method: "PATCH",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({status: selectedStatus, ...(selectedStatus === "CANCELLED" && note.trim() ? {note: note.trim()} : {})}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || (ar ? "تعذر تحديث الحجز" : "Could not update reservation"));
      setNote("");
      router.refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : (ar ? "تعذر تحديث الحجز" : "Could not update reservation"));
    } finally {
      setLoading(false);
    }
  }

  return <div className={styles.box}>
    <div className={styles.row}>
      <select value={selectedStatus} onChange={(event) => setNextStatus(event.target.value as ManagedStatus)} aria-label={ar ? "تغيير حالة الحجز" : "Change reservation status"}>
        {options.map((option) => <option key={option.value} value={option.value}>{ar ? option.ar : option.en}</option>)}
      </select>
      <button type="button" onClick={updateStatus} disabled={loading || !selectedStatus}>
        {loading ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "تحديث" : "Update")}
      </button>
    </div>
    {selectedStatus === "CANCELLED" && <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder={ar ? "سبب الإلغاء (اختياري)" : "Cancellation reason (optional)"}/>} 
    {error && <small className={styles.error}>{error}</small>}
  </div>;
}

function availableStatuses(status: string, pickupAt: string, returnAt: string) {
  if (status === "HOLD") return [
    {value: "CONFIRMED" as const, ar: "تأكيد الحجز", en: "Confirm"},
    {value: "CANCELLED" as const, ar: "إلغاء الحجز", en: "Cancel"},
  ];

  if (status === "CONFIRMED" || status === "MODIFIED") {
    const now = Date.now();
    const pickup = Date.parse(pickupAt);
    const dropoff = Date.parse(returnAt);
    const options: Array<{value: ManagedStatus; ar: string; en: string}> = [];
    if (Number.isFinite(dropoff) && now >= dropoff) options.push({value: "COMPLETED", ar: "مكتمل", en: "Complete"});
    if (Number.isFinite(pickup) && now >= pickup) options.push({value: "NO_SHOW", ar: "لم يحضر", en: "No-show"});
    options.push({value: "CANCELLED", ar: "إلغاء الحجز", en: "Cancel"});
    return options;
  }

  return [];
}
