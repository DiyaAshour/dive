import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Mail, RefreshCcw, ServerCog } from "lucide-react";
import { ADMIN_EMAIL_KINDS, ADMIN_EMAIL_STATUSES, getAdminEmailOperations, getAdminNavigationCounts } from "@platform/server";
import { AdminShell } from "@/components/admin-shell";
import { currentAdminPrincipal } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { EmailRetryButton } from "./email-retry-button";

export const metadata: Metadata = {title: "Email Operations"};
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminEmailOperationsPage({searchParams}: Readonly<{searchParams: SearchParams}>) {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fcommunications%2Femail");
  const locale = await requestLocale();
  const params = await searchParams;
  const query = scalar(params.q) ?? "";
  const status = scalar(params.status) ?? "";
  const kind = scalar(params.kind) ?? "";
  const page = Number.parseInt(scalar(params.page) ?? "1", 10) || 1;
  const [operations, navCounts] = await Promise.all([
    getAdminEmailOperations(principal.user.id, {query, status, kind, page}),
    getAdminNavigationCounts(principal.user.id),
  ]);
  const ar = locale === "ar";
  const attention = operations.counts.failed + operations.counts.dead;

  return <AdminShell locale={locale} principal={principal} active="email" counts={{...navCounts, emailOps: attention}}>
    <header className="adminTopbar emailOpsTopbar">
      <div>
        <span className="eyebrow">{ar ? "مركز الاتصالات" : "Communications center"}</span>
        <h1>{ar ? "تشغيل البريد الإلكتروني" : "Email operations"}</h1>
        <p>{ar ? "راقب كل رسالة يرسلها HandMeKey، اعرف ما وصل وما فشل، وأعد جدولة الرسائل التي تحتاج تدخلاً." : "Monitor every HandMeKey email, see what was delivered or failed, and safely re-queue messages that need operator attention."}</p>
      </div>
      <div className={operations.capability.configured ? "emailProviderState ready" : "emailProviderState offline"}>
        <ServerCog size={19}/>
        <span><strong>{operations.capability.configured ? (ar ? "مزود البريد جاهز" : "Email provider ready") : (ar ? "مزود البريد غير مفعّل" : "Email provider not configured")}</strong><small>{operations.capability.provider ?? "EMAIL_PROVIDER=none"}</small></span>
      </div>
    </header>

    <section className="emailOpsKpis" aria-label={ar ? "حالة البريد" : "Email delivery status"}>
      <EmailKpi icon={<Clock3 size={18}/>} label={ar ? "بانتظار الإرسال" : "Pending"} value={operations.counts.pending} hint={ar ? "موجودة في قائمة الإرسال" : "Queued for delivery"}/>
      <EmailKpi icon={<RefreshCcw size={18}/>} label={ar ? "قيد المعالجة" : "Processing"} value={operations.counts.processing} hint={ar ? "يعمل عليها الـWorker الآن" : "Worker currently owns them"}/>
      <EmailKpi icon={<CheckCircle2 size={18}/>} label={ar ? "تم الإرسال" : "Sent"} value={operations.counts.sent} hint={ar ? "أكد المزود استلامها" : "Accepted by the provider"}/>
      <EmailKpi icon={<AlertTriangle size={18}/>} label={ar ? "فشلت" : "Failed"} value={operations.counts.failed} hint={ar ? "ستتم إعادة المحاولة" : "Eligible for automatic retry"}/>
      <EmailKpi icon={<Mail size={18}/>} label={ar ? "تحتاج تدخلاً" : "Dead letter"} value={operations.counts.dead} hint={ar ? "استنفدت المحاولات" : "Automatic retries exhausted"}/>
    </section>

    <section className="adminPanel emailOpsPanel">
      <div className="adminSectionTitle emailOpsTitle">
        <div><span className="eyebrow">{ar ? "صندوق الإرسال" : "Delivery outbox"}</span><h2>{ar ? "كل رسائل HandMeKey" : "All HandMeKey email"}</h2><p>{ar ? `${operations.counts.total} رسالة مسجلة في نظام الإرسال.` : `${operations.counts.total} messages recorded in the delivery system.`}</p></div>
        <span className={attention ? "adminAttention" : "adminClear"}>{attention ? `${attention} ${ar ? "تحتاج مراجعة" : "need attention"}` : (ar ? "لا توجد أخطاء حرجة" : "No critical delivery issues")}</span>
      </div>

      <form className="emailOpsFilters" method="get">
        <label><span>{ar ? "بحث" : "Search"}</span><input name="q" defaultValue={operations.filters.query} placeholder={ar ? "المستلم، العنوان، رقم الحجز…" : "Recipient, subject, booking…"}/></label>
        <label><span>{ar ? "الحالة" : "Status"}</span><select name="status" defaultValue={operations.filters.status ?? ""}><option value="">{ar ? "كل الحالات" : "All statuses"}</option>{ADMIN_EMAIL_STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value, ar)}</option>)}</select></label>
        <label><span>{ar ? "نوع الرسالة" : "Template"}</span><select name="kind" defaultValue={operations.filters.kind ?? ""}><option value="">{ar ? "كل الأنواع" : "All templates"}</option>{ADMIN_EMAIL_KINDS.map((value) => <option key={value} value={value}>{kindLabel(value, ar)}</option>)}</select></label>
        <button className="primaryButton" type="submit">{ar ? "تطبيق" : "Apply filters"}</button>
        {(query || status || kind) && <Link className="secondaryButton" href="/admin/communications/email">{ar ? "مسح" : "Clear"}</Link>}
      </form>

      <div className="emailOpsList">
        {operations.items.length === 0 ? <div className="emailOpsEmpty"><Mail size={28}/><strong>{ar ? "لا توجد رسائل تطابق الفلاتر" : "No email matches these filters"}</strong><p>{ar ? "غيّر الفلاتر أو انتظر حتى يُنشئ النظام رسالة جديدة." : "Change the filters or wait for the platform to queue a new message."}</p></div> : operations.items.map((email) => <article className="emailOpsRow" key={email.id}>
          <div className="emailOpsMain">
            <div className="emailOpsSubject"><span className={`emailStatus emailStatus-${email.status.toLowerCase()}`}>{statusLabel(email.status, ar)}</span><strong>{email.subject}</strong></div>
            <div className="emailOpsMeta">
              <span><b>{ar ? "إلى:" : "To:"}</b> {email.toName ? `${email.toName} · ` : ""}{email.toEmail}</span>
              <span><b>{ar ? "النوع:" : "Template:"}</b> {kindLabel(email.kind, ar)}</span>
              <span><b>{ar ? "المحاولات:" : "Attempts:"}</b> {email.attempts}/8</span>
              <span><b>{ar ? "أُنشئت:" : "Created:"}</b> {formatDateTime(email.createdAt, locale)}</span>
            </div>
            {(email.bookingReference || email.hotelName) && <div className="emailOpsContext">{email.bookingReference && <span>{ar ? "الحجز" : "Booking"} <strong>{email.bookingReference}</strong></span>}{email.hotelName && <span>{ar ? "الفندق" : "Property"} <strong>{email.hotelName}</strong></span>}</div>}
            {email.lastError && <div className="emailOpsError"><AlertTriangle size={16}/><span><strong>{ar ? "آخر خطأ" : "Last error"}</strong>{email.lastError}</span></div>}
            <details className="emailOpsDetails">
              <summary>{ar ? "عرض تفاصيل التسليم" : "View delivery details"}</summary>
              <div className="emailOpsDetailGrid">
                <span><b>ID</b>{email.id}</span><span><b>{ar ? "المزود" : "Provider"}</b>{email.provider ?? "—"}</span><span><b>Provider message ID</b>{email.providerMessageId ?? "—"}</span><span><b>{ar ? "الإرسال" : "Sent at"}</b>{email.sentAt ? formatDateTime(email.sentAt, locale) : "—"}</span><span><b>{ar ? "المحاولة التالية" : "Next attempt"}</b>{email.status === "SENT" || email.status === "DEAD" ? "—" : formatDateTime(email.nextAttemptAt, locale)}</span><span><b>{ar ? "آخر تحديث" : "Updated"}</b>{formatDateTime(email.updatedAt, locale)}</span>
              </div>
              <p className="emailOpsPrivacyNote">{ar ? "محتوى الرسالة وروابط الاستعادة الحساسة لا تظهر في لوحة التشغيل لحماية رموز الدخول." : "Message bodies and sensitive recovery links are intentionally hidden from the operations console to protect authentication tokens."}</p>
            </details>
          </div>
          <div className="emailOpsActions">
            {(email.status === "FAILED" || email.status === "DEAD") && <EmailRetryButton emailId={email.id} locale={locale}/>} 
          </div>
        </article>)}
      </div>

      {operations.pagination.pages > 1 && <nav className="emailOpsPagination" aria-label={ar ? "صفحات البريد" : "Email pages"}>
        <Link className={operations.pagination.page <= 1 ? "disabled" : ""} href={pageHref(operations.pagination.page - 1, query, status, kind)} aria-disabled={operations.pagination.page <= 1}>{ar ? "السابق" : "Previous"}</Link>
        <span>{ar ? "صفحة" : "Page"} {operations.pagination.page} / {operations.pagination.pages}</span>
        <Link className={operations.pagination.page >= operations.pagination.pages ? "disabled" : ""} href={pageHref(operations.pagination.page + 1, query, status, kind)} aria-disabled={operations.pagination.page >= operations.pagination.pages}>{ar ? "التالي" : "Next"}</Link>
      </nav>}
    </section>
  </AdminShell>;
}

function EmailKpi({icon, label, value, hint}: Readonly<{icon: React.ReactNode; label: string; value: number; hint: string}>) {
  return <article><span>{icon}{label}</span><strong>{value}</strong><small>{hint}</small></article>;
}

function scalar(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function formatDateTime(value: Date, locale: "en" | "ar") { return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}).format(value); }
function statusLabel(value: string, ar: boolean) { if (!ar) return humanize(value); return ({PENDING: "بانتظار الإرسال", PROCESSING: "قيد المعالجة", SENT: "تم الإرسال", FAILED: "فشلت", DEAD: "تحتاج تدخلاً"} as Record<string, string>)[value] ?? value; }
function kindLabel(value: string, ar: boolean) { if (!ar) return humanize(value); return ({BOOKING_CONFIRMED: "تأكيد حجز", BOOKING_MODIFIED: "تعديل حجز", BOOKING_CANCELLED: "إلغاء حجز", PARTNER_BOOKING_NOTICE: "إشعار الفندق", PRICE_WATCH: "تنبيه سعر", PASSWORD_RESET: "استعادة كلمة المرور", EMAIL_VERIFICATION: "تأكيد البريد", SECURITY_ALERT: "تنبيه أمني", PARTNER_STATEMENT: "كشف حساب الفندق"} as Record<string, string>)[value] ?? value; }
function humanize(value: string) { return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function pageHref(page: number, query: string, status: string, kind: string) { const params = new URLSearchParams(); if (query) params.set("q", query); if (status) params.set("status", status); if (kind) params.set("kind", kind); params.set("page", String(Math.max(1, page))); return `/admin/communications/email?${params.toString()}`; }
