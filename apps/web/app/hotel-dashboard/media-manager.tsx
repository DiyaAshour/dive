"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type {Locale} from "@/lib/i18n";

type MediaItem = {
  id: string;
  kind: string;
  state: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  publicUrl: string | null;
  uploadedAt: string | null;
  photo: {id: string; alt: string | null; sortOrder: number} | null;
  document: {id: string; type: string; status: string; rejectionReason: string | null; submittedAt: string; reviewedAt: string | null} | null;
};

type UploadGrant = {method: "PUT"; url: string; headers: Record<string, string>};

export default function MediaManager({hotelId, initialMedia, locale}: {hotelId: string; initialMedia: MediaItem[]; locale: Locale}) {
  const ar=locale==="ar";
  const [items, setItems] = useState(initialMedia);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function uploadImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) return setMessage(ar?"اختر صورة أولًا":"Choose an image first");
    await runUpload(file, {
      kind: "HOTEL_IMAGE",
      alt: textOrNull(form.get("alt")),
      sortOrder: Number(form.get("sortOrder") || 0),
    });
    event.currentTarget.reset();
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("document");
    if (!(file instanceof File) || file.size === 0) return setMessage(ar?"اختر مستند تحقق أولًا":"Choose a verification document first");
    await runUpload(file, {kind: "VERIFICATION_DOCUMENT", documentType: String(form.get("documentType") || "")});
    event.currentTarget.reset();
  }

  async function runUpload(file: File, metadata: Record<string, unknown>) {
    setBusy(true);
    setMessage(ar?"جارٍ إنشاء رفع آمن…":"Creating secure upload…");
    try {
      const intent = await api(`/api/v1/hotels/${hotelId}/media/uploads`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({...metadata, fileName: file.name, contentType: file.type, sizeBytes: file.size}),
      });
      const upload = intent.upload as UploadGrant;
      setMessage(ar?"جارٍ الرفع مباشرة إلى التخزين…":"Uploading directly to object storage…");
      const stored = await fetch(upload.url, {method: upload.method, headers: upload.headers, body: file});
      if (!stored.ok) throw new Error(`Object storage rejected the upload (${stored.status})`);
      setMessage(ar?"جارٍ التحقق من الملف المرفوع…":"Verifying uploaded object…");
      await api(`/api/v1/hotels/${hotelId}/media/${intent.mediaId}/complete`, {method: "POST"});
      await refresh();
      setMessage(ar?"اكتمل الرفع والتحقق":"Upload completed and verified");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function savePhoto(mediaId: string, form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    try {
      await api(`/api/v1/hotels/${hotelId}/media/${mediaId}`, {
        method: "PATCH",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({alt: textOrNull(data.get("alt")), sortOrder: Number(data.get("sortOrder") || 0)}),
      });
      await refresh();
      setMessage(ar?"تم حفظ بيانات الصورة":"Photo metadata saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save photo");
    } finally {
      setBusy(false);
    }
  }

  async function remove(mediaId: string) {
    setBusy(true);
    try {
      await api(`/api/v1/hotels/${hotelId}/media/${mediaId}`, {method: "DELETE"});
      await refresh();
      setMessage(ar?"تم حذف الملف":"Media removed");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove media");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const response = await api(`/api/v1/hotels/${hotelId}/media`);
    setItems(response as MediaItem[]);
  }

  const images = items.filter((item) => item.kind === "HOTEL_IMAGE");
  const documents = items.filter((item) => item.kind === "VERIFICATION_DOCUMENT");

  return <section className="panel setupPanel wideSetup" style={{marginBottom:24}}>
    <span className="eyebrow">{ar?"وسائط آمنة":"Secure media"}</span><h2>{ar?"الصور ومستندات التحقق":"Photos & verification documents"}</h2>
    <p className="muted">{ar?"ترفع الملفات مباشرة إلى التخزين المهيأ. لا تصبح الصور عامة إلا بعد تحقق الخادم، وتبقى المستندات القانونية خاصة.":"Files upload directly to configured object storage. Hotel images become public only after server verification; legal documents remain private and require platform review."}</p>

    <div className="formGrid" style={{alignItems:"start"}}>
      <form className="stackForm" onSubmit={uploadImage}>
        <h3>{ar?"رفع صورة الفندق":"Upload hotel image"}</h3>
        <label>{ar?"الصورة":"Image"}<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required/></label>
        <label>{ar?"النص البديل":"Alt text"}<input name="alt" maxLength={180} placeholder={ar?"واجهة الفندق عند الغروب":"Hotel exterior at sunset"}/></label>
        <label>{ar?"ترتيب العرض":"Display order"}<input name="sortOrder" type="number" min="0" max="1000" defaultValue="0"/></label>
        <button className="primaryButton" disabled={busy}>{ar?"رفع الصورة":"Upload image"}</button>
      </form>
      <form className="stackForm" onSubmit={uploadDocument}>
        <h3>{ar?"رفع مستند تحقق":"Upload verification document"}</h3>
        <label>{ar?"نوع المستند":"Document type"}<select name="documentType" defaultValue="COMMERCIAL_REGISTRATION"><option value="COMMERCIAL_REGISTRATION">{ar?"السجل التجاري":"Commercial registration"}</option><option value="BUSINESS_LICENSE">{ar?"رخصة العمل":"Business license"}</option><option value="TAX_REGISTRATION">{ar?"التسجيل الضريبي":"Tax registration"}</option><option value="BANK_PROOF">{ar?"إثبات بنكي":"Bank proof"}</option><option value="OWNER_ID">{ar?"هوية المالك":"Owner ID"}</option><option value="OTHER">{ar?"أخرى":"Other"}</option></select></label>
        <label>{ar?"الملف":"File"}<input name="document" type="file" accept="application/pdf,image/jpeg,image/png" required/></label>
        <button className="secondaryButton" disabled={busy}>{ar?"رفع مستند خاص":"Upload private document"}</button>
      </form>
    </div>

    {message && <div className="setupMessage">{message}</div>}

    <div style={{marginTop:24}}><h3>{ar?"صور الفندق":"Hotel images"}</h3>{images.length === 0 && <p className="muted">{ar?"لم ترفع صور بعد.":"No images uploaded yet."}</p>}<div className="hotelGrid">{images.map((item) => <div className="hotelCard" key={item.id}>{item.publicUrl && item.state === "READY" ? <img src={item.publicUrl} alt={item.photo?.alt ?? "Hotel"} style={{width:"100%",height:160,objectFit:"cover"}}/> : <div className="softBg" style={{height:160,display:"grid",placeItems:"center"}}>{ar?"حالة الرفع":"Upload"} {item.state.toLowerCase()}</div>}<div className="hotelCardBody"><strong>{item.originalFileName}</strong><p className="muted">{item.state} · {(item.sizeBytes/1024/1024).toFixed(1)} MB</p>{item.photo && <form className="stackForm" onSubmit={(event)=>{event.preventDefault();void savePhoto(item.id,event.currentTarget)}}><label>{ar?"النص البديل":"Alt text"}<input name="alt" defaultValue={item.photo.alt ?? ""}/></label><label>{ar?"الترتيب":"Order"}<input name="sortOrder" type="number" min="0" max="1000" defaultValue={item.photo.sortOrder}/></label><button className="secondaryButton" disabled={busy}>{ar?"حفظ الصورة":"Save photo"}</button></form>}<button type="button" className="secondaryButton" disabled={busy} onClick={()=>void remove(item.id)}>{ar?"حذف":"Remove"}</button></div></div>)}</div></div>

    <div style={{marginTop:24}}><h3>{ar?"مستندات التحقق":"Verification documents"}</h3>{documents.length === 0 && <p className="muted">{ar?"لم ترفع مستندات بعد.":"No documents uploaded yet."}</p>}<div className="adminTable">{documents.map((item)=><div className="adminRow" key={item.id}><div><strong>{item.document?.type ?? (ar?"مستند":"Document")}</strong><div className="muted">{item.originalFileName}</div></div><span>{item.state}</span><span>{item.document?.status ?? "PENDING"}</span><span>{item.document?.rejectionReason ?? (ar?"خاص · يحتاج مراجعة المنصة":"Private · platform review required")}</span></div>)}</div></div>
  </section>;
}

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message ?? `Request failed (${response.status})`);
  return payload?.data;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}
