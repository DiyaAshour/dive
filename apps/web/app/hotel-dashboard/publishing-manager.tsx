"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleX, Send, ShieldCheck } from "lucide-react";

type Readiness = {
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";
  verified: boolean;
  publishRevision: number;
  publishedRevision: number | null;
  ready: boolean;
  sellableDays: number;
  reviewWindowDays: number;
  checks: Array<{code: string; label: string; passed: boolean; detail: string}>;
  latestReview: {id: string; status: "PENDING" | "APPROVED" | "REJECTED" | "STALE"; submittedRevision: number; decisionReason: string | null; submittedAt: Date | string; reviewedAt: Date | string | null} | null;
};

export default function PublishingManager({hotelId, readiness}: {hotelId: string; readiness: Readiness}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canSubmit = readiness.ready && readiness.status === "DRAFT";

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/hotels/${hotelId}/publishing`, {method: "POST"});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to submit property");
      setMessage("Property submitted for platform review.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit property");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel" style={{marginTop:24}}>
    <div className="sectionHeading"><div><span className="eyebrow">Publishing control</span><h2>Go-live readiness</h2></div><div className={readiness.ready ? "statusOk" : "statusReview"}>{readiness.ready ? "READY" : "INCOMPLETE"}</div></div>
    <p className="muted">Revision {readiness.publishRevision}{readiness.publishedRevision ? ` · published revision ${readiness.publishedRevision}` : " · not published yet"}. Changes made during review automatically invalidate the old submission.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10,marginTop:18}}>
      {readiness.checks.map((check)=><div className="alertCard" key={check.code}>{check.passed ? <CircleCheck size={19}/> : <CircleX size={19}/>}<div><strong>{check.label}</strong><p>{check.detail}</p></div></div>)}
    </div>
    <div className="alertCard" style={{marginTop:14}}><ShieldCheck size={19}/><div><strong>{readiness.sellableDays} sellable days verified</strong><p>The publishing gate checks the next {readiness.reviewWindowDays} days and requires complete rates, restrictions and inventory.</p></div></div>
    {readiness.latestReview && <div className="panel" style={{marginTop:14}}><strong>Latest review: {readiness.latestReview.status}</strong><p className="muted">Submitted revision {readiness.latestReview.submittedRevision}</p>{readiness.latestReview.decisionReason && <p>{readiness.latestReview.decisionReason}</p>}</div>}
    <div style={{display:"flex",gap:12,alignItems:"center",marginTop:18,flexWrap:"wrap"}}>
      <button className="primaryButton" type="button" onClick={submit} disabled={!canSubmit || busy}><Send size={17}/> {busy ? "Submitting..." : readiness.status === "PENDING_REVIEW" ? "Under review" : readiness.status === "ACTIVE" ? "Property live" : readiness.status === "SUSPENDED" ? "Property suspended" : "Submit for review"}</button>
      {!readiness.ready && readiness.status === "DRAFT" && <span className="muted">Complete every readiness item before submission.</span>}
      {message && <span>{message}</span>}
    </div>
  </section>;
}
