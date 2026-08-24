"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {Eye, EyeOff, MessageSquareText, ShieldCheck} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import {portalDictionary} from "@/lib/portal-i18n";

type Review = {id: string; overall: number; title: string | null; comment: string; status: "PUBLISHED" | "HIDDEN"; moderationReason: string | null; moderatedAt: string | null; hotelReply: string | null; repliedAt: string | null; createdAt: string; hotel: {id: string; name: string; city: string}; booking: {reference: string; guestName: string; departure: string}; moderatedBy: {displayName: string; email: string} | null};

export default function ReviewModerationManager({initialReviews, locale}: Readonly<{initialReviews: Review[]; locale: Locale}>) {
  const [reviews, setReviews] = useState(initialReviews);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const copy = portalDictionary(locale).admin;

  async function moderate(review: Review) {
    const status = review.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED";
    const reason = (reasons[review.id] ?? "").trim();
    if (reason.length < 10) return setMessage(locale === "ar" ? "اكتب سببًا واضحًا من 10 أحرف على الأقل." : "Enter a clear reason of at least 10 characters.");
    if (!window.confirm(status === "HIDDEN" ? copy.hideConfirm : copy.restoreConfirm)) return;
    setBusy(review.id); setMessage(null);
    try {
      const response = await fetch(`/api/v1/admin/reviews/${review.id}/moderate`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({status, reason})});
      const payload = await response.json().catch(() => null);
      if (response.status === 401) {window.location.assign("/admin/login?next=/admin/reviews"); return;}
      if (!response.ok) throw new Error(payload?.error?.message ?? (locale === "ar" ? "تعذر حفظ الإجراء" : "Unable to save moderation"));
      setReviews((items) => items.map((item) => item.id === review.id ? {...item, status, moderationReason: reason, moderatedAt: new Date().toISOString()} : item));
      setReasons((current) => ({...current, [review.id]: ""}));
      setMessage(copy.moderated); router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : (locale === "ar" ? "تعذر حفظ الإجراء" : "Unable to save moderation")); }
    finally {setBusy(null);}
  }

  if (reviews.length === 0) return <div className="adminEmptyState"><MessageSquareText size={27}/><strong>{portalDictionary(locale).common.noResults}</strong></div>;
  return <div className="adminModerationList">
    {message && <div className="setupMessage" role="status">{message}</div>}
    {reviews.map((review) => <article key={review.id} className={review.status === "HIDDEN" ? "hiddenReview" : ""}>
      <div className="adminReviewHeader"><div><span className={review.status === "PUBLISHED" ? "statusOk" : "statusReview"}>{review.status === "PUBLISHED" ? <Eye size={14}/> : <EyeOff size={14}/>} {review.status === "PUBLISHED" ? copy.published : copy.hidden}</span><h2>{review.overall}/10 · {review.booking.guestName}</h2><p>{review.hotel.name} · {review.booking.reference} · {copy.verifiedStay}</p></div><time>{new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {dateStyle: "medium"}).format(new Date(review.createdAt))}</time></div>
      {review.title && <h3>{review.title}</h3>}<blockquote>{review.comment}</blockquote>
      <div className="adminReviewResponse"><MessageSquareText size={17}/><div><strong>{copy.hotelResponse}</strong><p>{review.hotelReply ?? copy.noResponse}</p></div></div>
      {review.moderationReason && <div className="adminModerationHistory"><ShieldCheck size={16}/><div><strong>{copy.moderationReason}</strong><p>{review.moderationReason}</p>{review.moderatedBy && <small>{copy.moderatedBy} {review.moderatedBy.displayName} · {review.moderatedBy.email}</small>}</div></div>}
      <div className="adminModerationAction"><textarea value={reasons[review.id] ?? ""} onChange={(event) => setReasons((current) => ({...current, [review.id]: event.target.value}))} minLength={10} maxLength={2000} placeholder={copy.reasonPlaceholder}/><button className={review.status === "PUBLISHED" ? "secondaryButton dangerAction" : "primaryButton"} type="button" disabled={busy === review.id || (reasons[review.id] ?? "").trim().length < 10} onClick={() => void moderate(review)}>{review.status === "PUBLISHED" ? <EyeOff size={16}/> : <Eye size={16}/>} {busy === review.id ? portalDictionary(locale).common.saving : review.status === "PUBLISHED" ? copy.hide : copy.restore}</button></div>
    </article>)}
  </div>;
}
