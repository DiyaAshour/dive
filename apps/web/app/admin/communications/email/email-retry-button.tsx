"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function EmailRetryButton({emailId, locale}: Readonly<{emailId: string; locale: Locale}>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ar = locale === "ar";

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/communications/email/${encodeURIComponent(emailId)}/retry`, {method: "POST"});
      const body = await response.json().catch(() => null) as {error?: {message?: string}} | null;
      if (!response.ok) throw new Error(body?.error?.message ?? (ar ? "تعذر إعادة جدولة الرسالة" : "Unable to re-queue email"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ar ? "تعذر إعادة جدولة الرسالة" : "Unable to re-queue email"));
    } finally {
      setBusy(false);
    }
  }

  return <div className="emailRetryAction">
    <button className="primaryButton" type="button" onClick={retry} disabled={busy}><RefreshCcw size={15}/>{busy ? (ar ? "جارٍ الجدولة…" : "Queuing…") : (ar ? "إعادة المحاولة" : "Queue retry")}</button>
    {error && <small className="formError">{error}</small>}
  </div>;
}
