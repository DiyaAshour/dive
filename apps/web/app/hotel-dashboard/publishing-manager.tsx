"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleX, Send, ShieldCheck } from "lucide-react";
import type {Locale} from "@/lib/i18n";

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

export default function PublishingManager({hotelId, readiness, locale}: {hotelId: string; readiness: Readiness; locale: Locale}) {
  const ar=locale==="ar";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canSubmit = readiness.ready && readiness.status === "DRAFT";
  const pendingChecks = readiness.checks.filter((check) => !check.passed);
  const completedCount = readiness.checks.length - pendingChecks.length;
  const completionPercent = readiness.checks.length ? Math.round((completedCount / readiness.checks.length) * 100) : 100;

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/hotels/${hotelId}/publishing`, {method: "POST"});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to submit property");
      setMessage(ar?"تم إرسال المنشأة لمراجعة المنصة.":"Property submitted for platform review.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit property");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel publishingChecklist" style={{marginTop:24}}>
    <div className="sectionHeading"><div><span className="eyebrow">{ar?"التحكم بالنشر":"Publishing control"}</span><h2>{ar?"جاهزية النشر":"Go-live readiness"}</h2><p className="muted">{ar?"هذه القائمة تعرض الأشياء الناقصة فقط. بمجرد حفظ العنصر بنجاح يختفي من هنا تلقائيًا.":"This list shows only unfinished requirements. Once an item is saved successfully it disappears automatically."}</p></div><div className={readiness.ready ? "statusOk" : "statusReview"}>{readiness.ready ? (ar?"جاهزة":"READY") : `${completionPercent}%`}</div></div>
    <div className="publishingProgress" aria-label={ar?"تقدم جاهزية النشر":"Publishing readiness progress"}><span style={{width:`${completionPercent}%`}}/></div>
    <div className="publishingProgressMeta"><strong>{completedCount}/{readiness.checks.length} {ar?"مكتمل":"complete"}</strong><span>{pendingChecks.length ? `${pendingChecks.length} ${ar?"متبقٍ":"remaining"}` : (ar?"كل المتطلبات مكتملة":"All requirements complete")}</span></div>
    <p className="muted">{ar?"نسخة":"Revision"} {readiness.publishRevision}{readiness.publishedRevision ? ` · ${ar?"النسخة المنشورة":"published revision"} ${readiness.publishedRevision}` : (ar?" · لم تنشر بعد":" · not published yet")}. {ar?"أي تعديل أثناء المراجعة يلغي الطلب القديم تلقائيًا.":"Changes made during review automatically invalidate the old submission."}</p>
    {pendingChecks.length > 0 ? <div className="publishingPendingGrid">
      {pendingChecks.map((check)=>{const localized=localizeCheck(check,ar);return <div className="alertCard publishingPendingItem" key={check.code}><CircleX size={19}/><div><strong>{localized.label}</strong><p>{localized.detail}</p></div></div>})}
    </div> : <div className="publishingAllDone"><CircleCheck size={22}/><div><strong>{ar?"اكتملت متطلبات المنشأة":"Property requirements complete"}</strong><p>{ar?"لا يوجد أي عنصر ناقص في قائمة الجاهزية الآن.":"There are no unfinished readiness items right now."}</p></div></div>}
    <div className="alertCard" style={{marginTop:14}}><ShieldCheck size={19}/><div><strong>{readiness.sellableDays} {ar?"يوم قابل للبيع تم التحقق منه":"sellable days verified"}</strong><p>{ar?`تفحص بوابة النشر ${readiness.reviewWindowDays} يومًا قادمًا وتتطلب أسعارًا وقيودًا ومخزونًا مكتملًا.`:`The publishing gate checks the next ${readiness.reviewWindowDays} days and requires complete rates, restrictions and inventory.`}</p></div></div>
    {readiness.latestReview && <div className="panel" style={{marginTop:14}}><strong>{ar?"آخر مراجعة":"Latest review"}: {readiness.latestReview.status}</strong><p className="muted">{ar?"النسخة المقدمة":"Submitted revision"} {readiness.latestReview.submittedRevision}</p>{readiness.latestReview.decisionReason && <p>{readiness.latestReview.decisionReason}</p>}</div>}
    <div style={{display:"flex",gap:12,alignItems:"center",marginTop:18,flexWrap:"wrap"}}>
      <button className="primaryButton" type="button" onClick={submit} disabled={!canSubmit || busy}><Send size={17}/> {busy ? (ar?"جارٍ الإرسال…":"Submitting...") : readiness.status === "PENDING_REVIEW" ? (ar?"قيد المراجعة":"Under review") : readiness.status === "ACTIVE" ? (ar?"المنشأة منشورة":"Property live") : readiness.status === "SUSPENDED" ? (ar?"المنشأة موقوفة":"Property suspended") : (ar?"إرسال للمراجعة":"Submit for review")}</button>
      {!readiness.ready && readiness.status === "DRAFT" && <span className="muted">{ar?"أكمل العناصر الظاهرة أعلاه قبل الإرسال.":"Complete the remaining items above before submission."}</span>}
      {message && <span>{message}</span>}
    </div>
  </section>;
}

function localizeCheck(check: Readiness["checks"][number], ar: boolean) {
  if (!ar) return check;
  const labels: Record<string,string>={DESCRIPTION:"وصف المنشأة",STAR_RATING:"التصنيف الرسمي",CHECK_TIMES:"أوقات الدخول والمغادرة",PHOTOS:"صور منشأة موثقة",AMENITIES:"مرافق المنشأة",VERIFICATION_DOCUMENTS:"مستندات التحقق",ROOM_TYPES:"نوع غرفة نشط",ROOM_PRODUCTS:"بيانات الغرف المكتملة",RATE_PLANS:"خطة سعر قابلة للحجز",SELLABLE_CALENDAR:"أسعار ومخزون مباشر"};
  const details: Record<string,string>={DESCRIPTION:"وصف لا يقل عن 80 حرفًا",STAR_RATING:"حدد تصنيفًا من نجمة إلى خمس",CHECK_TIMES:"وقت الدخول والمغادرة مطلوبان",PHOTOS:"ثلاث صور مكتملة على الأقل",AMENITIES:"ثلاثة مرافق على الأقل",VERIFICATION_DOCUMENTS:"اعتماد السجل التجاري ورخصة العمل مطلوب",ROOM_TYPES:"نوع غرفة نشط واحد على الأقل",ROOM_PRODUCTS:"كل غرفة نشطة تحتاج سعة وأسرّة ومساحة ووصفًا وثلاثة مرافق وصورة مرتبطة",RATE_PLANS:"خطة نشطة مع الدفع وسياسة الإلغاء",SELLABLE_CALENDAR:"سبعة أيام قابلة للبيع على الأقل خلال 30 يومًا"};
  return {...check,label:labels[check.code]??check.label,detail:details[check.code]??check.detail};
}
