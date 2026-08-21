"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

type Review = {
  id: string;
  submittedRevision: number;
  submittedAt: string;
  stale: boolean;
  submittedBy: {displayName: string; email: string};
  hotel: {id: string; name: string; city: string; countryCode: string; status: string; publishRevision: number; starRating: number | null; photos: Array<{url: string}>};
};

export default function ReviewQueue({reviews}: {reviews: Review[]}) {
  const router = useRouter();
  const [reasons, setReasons] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(reviewId: string, decision: "APPROVE" | "REJECT") {
    setBusy(`${reviewId}:${decision}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/admin/property-reviews/${reviewId}/decision`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({decision, reason: reasons[reviewId]?.trim() || undefined}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to resolve review");
      setMessage(decision === "APPROVE" ? "Property approved and published." : "Property returned to draft with review feedback.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to resolve review");
    } finally {
      setBusy(null);
    }
  }

  return <section className="panel" style={{marginBottom:24}}><div className="sectionHeading"><div><span className="eyebrow">Verification queue</span><h2>Pending property reviews</h2></div><strong>{reviews.length}</strong></div>
    {reviews.length === 0 ? <p className="muted">No properties are waiting for review.</p> : <div style={{display:"grid",gap:14}}>{reviews.map((review)=><article className="alertCard" key={review.id} style={{alignItems:"flex-start"}}>
      {review.hotel.photos[0] ? <img src={review.hotel.photos[0].url} alt={review.hotel.name} style={{width:92,height:72,objectFit:"cover",borderRadius:10}}/> : null}
      <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><strong>{review.hotel.name}</strong><p className="muted">{review.hotel.city}, {review.hotel.countryCode} · submitted revision {review.submittedRevision} by {review.submittedBy.displayName}</p></div><span className={review.stale ? "statusReview" : "statusOk"}>{review.stale ? "STALE" : "CURRENT"}</span></div>
      <textarea placeholder="Review note. Required when rejecting." value={reasons[review.id] ?? ""} onChange={(event)=>setReasons((current)=>({...current,[review.id]:event.target.value}))} style={{width:"100%",minHeight:72,marginTop:10}}/>
      <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}><button className="primaryButton" type="button" disabled={review.stale || busy !== null} onClick={()=>decide(review.id,"APPROVE")}><CheckCircle2 size={17}/> {busy===`${review.id}:APPROVE`?"Approving...":"Approve & publish"}</button><button className="secondaryButton" type="button" disabled={busy !== null} onClick={()=>decide(review.id,"REJECT")}><XCircle size={17}/> {busy===`${review.id}:REJECT`?"Rejecting...":"Reject"}</button></div></div>
    </article>)}</div>}
    {message && <p style={{marginTop:14}}>{message}</p>}
  </section>;
}
