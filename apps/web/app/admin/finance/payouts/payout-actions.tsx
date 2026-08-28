"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {Ban, CheckCircle2, Loader2} from "lucide-react";

export function PayoutActions({payoutId, status, locale}: {payoutId: string; status: string; locale: "en" | "ar"}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState<"PAID" | "VOID" | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (status !== "READY") return null;

  async function update(action: "PAID" | "VOID") {
    if (action === "PAID" && reference.trim().length < 3) {setError(ar ? "أدخل مرجع التحويل البنكي/مزود الدفع." : "Enter the bank/provider transfer reference."); return;}
    setBusy(action); setError(null);
    try {
      const response = await fetch(`/api/v1/admin/finance/payouts/${encodeURIComponent(payoutId)}`, {
        method: "PATCH",
        headers: {"content-type": "application/json"},
        body: JSON.stringify(action === "PAID" ? {action, externalReference: reference.trim()} : {action, note: "Voided from finance control center"}),
      });
      const body = await response.json().catch(() => null) as {error?: {message?: string}} | null;
      if (!response.ok) throw new Error(body?.error?.message ?? "Payout update failed");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payout update failed");
    } finally {setBusy(null);}
  }

  return <div className="adminPayoutActions">
    <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder={ar ? "مرجع التحويل" : "Transfer reference"}/>
    <button type="button" className="primaryButton" disabled={busy !== null} onClick={() => update("PAID")}>{busy === "PAID" ? <Loader2 size={15}/> : <CheckCircle2 size={15}/>} {ar ? "تأكيد الدفع" : "Mark paid"}</button>
    <button type="button" className="secondaryButton" disabled={busy !== null} onClick={() => update("VOID")}>{busy === "VOID" ? <Loader2 size={15}/> : <Ban size={15}/>} {ar ? "إلغاء" : "Void"}</button>
    {error && <small className="opsError">{error}</small>}
  </div>;
}
