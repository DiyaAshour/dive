import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Inbox, Mail, MailPlus, MessageCircle, RefreshCcw, ServerCog } from "lucide-react";
import { ADMIN_EMAIL_KINDS, ADMIN_EMAIL_STATUSES, getAdminEmailConversationInbox, getAdminEmailOperations, getAdminNavigationCounts } from "@platform/server";
import { AdminShell } from "@/components/admin-shell";
import { currentAdminPrincipal } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { EmailRetryButton } from "./email-retry-button";

export const metadata: Metadata = {title: "Email Center"};
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
  const [operations, inbox, navCounts] = await Promise.all([
    getAdminEmailOperations(principal.user.id, {query, status, kind, page}),
    getAdminEmailConversationInbox(principal.user.id, {page: 1}),
    getAdminNavigationCounts(principal.user.id),
  ]);
  const ar = locale === "ar";
  const attention = operations.counts.failed + operations.counts.dead;
  const sidebarAttention = attention + inbox.unread;

  return <AdminShell locale={locale} principal={principal} active="email" counts={{...navCounts, emailOps: sidebarAttention}}>
    <header className="adminTopbar emailOpsTopbar">
      <div>
        <span className="eyebrow">{ar ? "مركز الاتصالات" : "Communications center"}</span>
        <h1>{ar ? "مركز البريد الإلكتروني" : "Email center"}</h1>
        <p>{ar ? "أرسل رسائل جديدة، استخدم القوالب، تابع المحادثات، وراقب التسليم من مكان واحد." : "Compose new mail, use ready templates, continue conversations and monitor delivery from one workspace."}</p>
      </div>
      <div className="emailOpsHeaderActions">
        <Link className="secondaryButton" href="/admin/communications/email/conversations"><MessageCircle size={17}/>{ar ? "المحادثات" : "Conversations"}{inbox.unread > 0 && <b className="emailUnreadPill">{inbox.unread}</b>}</Link>
        <Link className="primaryButton emailNewButton" href="/admin/communications/email/compose"><MailPlus size={17}/>{ar ? "رسالة جديدة" : "New message"}</Link>
      </div>
    </header>

    <section className="emailDeskGrid">
      <article className="adminPanel emailDeskCard">
        <div className="emailDeskCardHead"><span><Inbox size={20}/></span><div><strong>{ar ? "صندوق المحادثات" : "Conversation inbox"}</strong><small>{inbox.unread > 0 ? (ar ? `${inbox.unread} غير مقروءة` : `${inbox.unread} unread`) : (ar ? "لا رسائل جديدة" : "No unread messages")}</small></div></div>
        <div className="emailDeskThreads">{inbox.items.slice(0,5).map((thread)=><Link href={`/admin/communications/email/conversations/${thread.id}`} key={thread.id}><span className="emailAvatar compact">{(thread.participantName?.[0] ?? thread.participantEmail[0] ?? "?").toUpperCase()}</span><span><strong>{thread.participantName || thread.participantEmail}</strong><small>{thread.subject}</small></span>{thread.unreadCount>0&&<b>{thread.unreadCount}</b>}</Link>)}{inbox.items.length===0&&<p>{ar ? "ابدأ أول رسالة من زر رسالة جديدة." : "Start your first thread with New message."}</p>}</div>
        <Link className="emailDeskOpenLink" href="/admin/communications/email/conversations">{ar ? "فتح كل المحادثات" : "Open all conversations"} →</Link>
      </article>
      <article className="adminPanel emailDeskCard">
        <div className="emailDeskCardHead"><span><ServerCog size={20}/></span><div><strong>{ar ? "جاهزية البريد" : "Mail readiness"}</strong><small>{operations.capability.provider ?? "EMAIL_PROVIDER=none"}</small></div></div>
        <div className="emailReadinessRows"><span><b>{ar ? "الإرسال" : "Outbound"}</b><em className={operations.capability.configured?"ready":"offline"}>{operations.capability.configured?(ar?"جاهز":"Ready"):(ar?"غير مفعّل":"Not configured")}</em></span><span><b>{ar ? "الردود الواردة" : "Inbound replies"}</b><em className={inbox.capability.inbound.configured?"ready":"offline"}>{inbox.capability.inbound.configured?(ar?"جاهزة":"Ready"):(ar?"غير مفعلة":"Not configured")}</em></span></div>
        <small className="emailDeskHint">{ar ? "عند تفعيل البريد الوارد، رد العميل على الرسالة يظهر تلقائياً داخل نفس المحادثة." : "When inbound mail is configured, recipient replies land automatically in the same conversation."}</small>
      </article>
    </section>

    <section className="emailOpsKpis" aria-label={ar ? "حالة البريد" : "Email delivery status"}>
      <EmailKpi icon={<Clock3 size={18}/>} label={ar ? "بانتظار الإرسال" : "Pending"} value={operations.counts.pending} hint={ar ? "في قائمة الإرسال" : "Queued for delivery"}/>
      <EmailKpi icon={<RefreshCcw size={18}/>} label={ar ? "قيد المعالجة" : "Processing"} value={operations.counts.processing} hint={ar ? "يعمل عليها الـWorker" : "Worker currently owns them"}/>
      <EmailKpi icon={<CheckCircle2 size={18}/>} label={ar ? "تم الإرسال" : "Sent"} value={operations.counts.sent} hint={ar ? "قبلها مزود البريد" : "Accepted by provider"}/>
      <EmailKpi icon={<AlertTriangle size={18}/>} label={ar ? "فشلت" : "Failed"} value={operations.counts.failed} hint={ar ? "ستعاد المحاولة" : "Automatic retry"}/>
      <EmailKpi icon={<Mail size={18}/>} label={ar ? "تحتاج تدخلاً" : "Dead letter"} value={operations.counts.dead} hint={ar ? "انتهت المحاولات" : "Retries exhausted"}/>
    </section>

    <section className="adminPanel emailOpsPanel">
      <div className="adminSectionTitle emailOpsTitle"><div><span className="eyebrow">{ar ? "صندوق الإرسال" : "Delivery outbox"}</span><h2>{ar ? "سجل التسليم" : "Delivery log"}</h2><p>{ar ? `${operations.counts.total} رسالة مسجلة.` : `${operations.counts.total} messages recorded.`}</p></div><span className={attention?"adminAttention":"adminClear"}>{attention?`${attention} ${ar?"تحتاج مراجعة":"need attention"}`:(ar?"لا أخطاء حرجة":"No critical issues")}</span></div>
      <form className="emailOpsFilters" method="get"><label><span>{ar?"بحث":"Search"}</span><input name="q" defaultValue={operations.filters.query} placeholder={ar?"المستلم، العنوان، الحجز…":"Recipient, subject, booking…"}/></label><label><span>{ar?"الحالة":"Status"}</span><select name="status" defaultValue={operations.filters.status??""}><option value="">{ar?"كل الحالات":"All statuses"}</option>{ADMIN_EMAIL_STATUSES.map((value)=><option key={value} value={value}>{statusLabel(value,ar)}</option>)}</select></label><label><span>{ar?"النوع":"Template"}</span><select name="kind" defaultValue={operations.filters.kind??""}><option value="">{ar?"كل الأنواع":"All templates"}</option>{ADMIN_EMAIL_KINDS.map((value)=><option key={value} value={value}>{kindLabel(value,ar)}</option>)}</select></label><button className="primaryButton" type="submit">{ar?"تطبيق":"Apply"}</button>{(query||status||kind)&&<Link className="secondaryButton" href="/admin/communications/email">{ar?"مسح":"Clear"}</Link>}</form>
      <div className="emailOpsList">{operations.items.length===0?<div className="emailOpsEmpty"><Mail size={28}/><strong>{ar?"لا توجد رسائل":"No messages"}</strong></div>:operations.items.map((email)=><article className="emailOpsRow" key={email.id}><div className="emailOpsMain"><div className="emailOpsSubject"><span className={`emailStatus emailStatus-${email.status.toLowerCase()}`}>{statusLabel(email.status,ar)}</span><strong>{email.subject}</strong></div><div className="emailOpsMeta"><span><b>{ar?"إلى:":"To:"}</b> {email.toName?`${email.toName} · `:""}{email.toEmail}</span><span><b>{ar?"النوع:":"Template:"}</b> {kindLabel(email.kind,ar)}</span><span><b>{ar?"المحاولات:":"Attempts:"}</b> {email.attempts}/8</span><span><b>{ar?"أُنشئت:":"Created:"}</b> {formatDateTime(email.createdAt,locale)}</span></div>{email.conversationId&&<Link className="emailConversationJump" href={`/admin/communications/email/conversations/${email.conversationId}`}><MessageCircle size={14}/>{ar?"فتح المحادثة":"Open conversation"}</Link>}{email.lastError&&<div className="emailOpsError"><AlertTriangle size={16}/><span><strong>{ar?"آخر خطأ":"Last error"}</strong>{email.lastError}</span></div>}<details className="emailOpsDetails"><summary>{ar?"تفاصيل التسليم":"Delivery details"}</summary><div className="emailOpsDetailGrid"><span><b>ID</b>{email.id}</span><span><b>{ar?"المزود":"Provider"}</b>{email.provider??"—"}</span><span><b>Provider message ID</b>{email.providerMessageId??"—"}</span><span><b>{ar?"الإرسال":"Sent at"}</b>{email.sentAt?formatDateTime(email.sentAt,locale):"—"}</span></div><p className="emailOpsPrivacyNote">{ar?"الرسائل النظامية الحساسة لا نعرض محتواها في سجل التشغيل.":"Sensitive system-email bodies remain hidden from the operations log."}</p></details></div><div className="emailOpsActions">{(email.status==="FAILED"||email.status==="DEAD")&&<EmailRetryButton emailId={email.id} locale={locale}/>}</div></article>)}</div>
      {operations.pagination.pages>1&&<nav className="emailOpsPagination"><Link className={operations.pagination.page<=1?"disabled":""} href={pageHref(operations.pagination.page-1,query,status,kind)}>{ar?"السابق":"Previous"}</Link><span>{ar?"صفحة":"Page"} {operations.pagination.page} / {operations.pagination.pages}</span><Link className={operations.pagination.page>=operations.pagination.pages?"disabled":""} href={pageHref(operations.pagination.page+1,query,status,kind)}>{ar?"التالي":"Next"}</Link></nav>}
    </section>
  </AdminShell>;
}
function EmailKpi({icon,label,value,hint}:Readonly<{icon:React.ReactNode;label:string;value:number;hint:string}>){return <article><span>{icon}{label}</span><strong>{value}</strong><small>{hint}</small></article>;}
function scalar(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
function formatDateTime(value:Date,locale:"en"|"ar"){return new Intl.DateTimeFormat(locale==="ar"?"ar-JO":"en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(value);}
function statusLabel(value:string,ar:boolean){if(!ar)return humanize(value);return ({PENDING:"بانتظار الإرسال",PROCESSING:"قيد المعالجة",SENT:"تم الإرسال",FAILED:"فشلت",DEAD:"تحتاج تدخلاً"} as Record<string,string>)[value]??value;}
function kindLabel(value:string,ar:boolean){if(!ar)return humanize(value);return ({BOOKING_CONFIRMED:"تأكيد حجز",BOOKING_MODIFIED:"تعديل حجز",BOOKING_CANCELLED:"إلغاء حجز",PARTNER_BOOKING_NOTICE:"إشعار الفندق",PRICE_WATCH:"تنبيه سعر",PASSWORD_RESET:"استعادة كلمة المرور",EMAIL_VERIFICATION:"تأكيد البريد",SECURITY_ALERT:"تنبيه أمني",PARTNER_STATEMENT:"كشف حساب الفندق",MANUAL_EMAIL:"رسالة يدوية"} as Record<string,string>)[value]??value;}
function humanize(value:string){return value.toLowerCase().split("_").map((part)=>part.charAt(0).toUpperCase()+part.slice(1)).join(" ");}
function pageHref(page:number,query:string,status:string,kind:string){const params=new URLSearchParams();if(query)params.set("q",query);if(status)params.set("status",status);if(kind)params.set("kind",kind);params.set("page",String(Math.max(1,page)));return `/admin/communications/email?${params.toString()}`;}
