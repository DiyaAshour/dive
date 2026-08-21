"use client";

import { useState } from "react";

type DocumentItem = {
  id: string;
  type: string;
  submittedAt: string;
  hotel: {id: string; name: string; city: string; countryCode: string};
  mediaObject: {id: string; originalFileName: string; contentType: string; expectedSizeBytes: number; uploadedAt: string | null};
};

export default function DocumentReviewQueue({documents}: {documents: DocumentItem[]}) {
  const [items, setItems] = useState(documents);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(documentId: string, decision: "APPROVE" | "REJECT") {
    setBusyId(documentId);
    setMessage(null);
    try {
      const body = decision === "APPROVE" ? {decision} : {decision, reason: reasons[documentId] ?? ""};
      const response = await fetch(`/api/v1/admin/hotel-documents/${documentId}/decision`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to review document");
      setItems((current) => current.filter((item) => item.id !== documentId));
      setMessage(decision === "APPROVE" ? "Document approved" : "Document rejected");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to review document");
    } finally {
      setBusyId(null);
    }
  }

  return <section className="panel" style={{marginBottom:24}}>
    <div className="sectionHeading"><div><span className="eyebrow">Private verification</span><h2>Document review queue</h2><p className="muted">Downloads are short-lived private links. Approval is required for commercial registration and business license before property publishing.</p></div><strong>{items.length} pending</strong></div>
    {items.length === 0 ? <p className="muted">No verification documents are waiting for review.</p> : <div className="adminTable">{items.map((document)=><div className="adminRow" key={document.id}><div><strong>{document.hotel.name}</strong><div className="muted">{document.hotel.city}, {document.hotel.countryCode}</div></div><div><strong>{label(document.type)}</strong><div className="muted">{document.mediaObject.originalFileName} · {(document.mediaObject.expectedSizeBytes/1024/1024).toFixed(1)} MB</div></div><a className="secondaryButton" href={`/api/v1/admin/hotel-documents/${document.id}/download`} target="_blank" rel="noreferrer">Download privately</a><div><input value={reasons[document.id] ?? ""} onChange={(event)=>setReasons((current)=>({...current,[document.id]:event.target.value}))} placeholder="Reason if rejecting" minLength={10}/></div><div style={{display:"flex",gap:8}}><button className="primaryButton" disabled={busyId===document.id} onClick={()=>void decide(document.id,"APPROVE")}>Approve</button><button className="secondaryButton" disabled={busyId===document.id} onClick={()=>void decide(document.id,"REJECT")}>Reject</button></div></div>)}</div>}
    {message && <div className="setupMessage">{message}</div>}
  </section>;
}

function label(type: string): string {
  return type.toLowerCase().split("_").map((part)=>part.charAt(0).toUpperCase()+part.slice(1)).join(" ");
}
