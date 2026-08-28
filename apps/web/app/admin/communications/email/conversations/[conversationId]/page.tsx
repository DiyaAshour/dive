import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock3, MailWarning, ServerCog} from "lucide-react";
import {getAdminEmailConversation, getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {EmailComposer} from "../../email-composer";

export const metadata:Metadata={title:"Email conversation"};
export const dynamic="force-dynamic";

export default async function AdminEmailConversationPage({params}:Readonly<{params:Promise<{conversationId:string}>}>) {
  const principal=await currentAdminPrincipal();
  if(!principal)redirect("/admin/login");
  const locale=await requestLocale(); const ar=locale==="ar"; const {conversationId}=await params;
  const [thread,counts]=await Promise.all([getAdminEmailConversation(principal.user.id,conversationId),getAdminNavigationCounts(principal.user.id)]);
  return <AdminShell locale={locale} principal={principal} active="email" counts={counts}>
    <header className="adminTopbar emailThreadTopbar"><div><Link className="emailBackLink" href="/admin/communications/email/conversations"><ArrowLeft size={16}/>{ar?"كل المحادثات":"All conversations"}</Link><span className="eyebrow">{ar?"محادثة بريد":"Email thread"}</span><h1>{thread.subject}</h1><p>{thread.participantName?`${thread.participantName} · ${thread.participantEmail}`:thread.participantEmail}</p></div><div className={thread.capability.inbound.configured?"emailProviderState ready":"emailProviderState offline"}><ServerCog size={18}/><span><strong>{thread.capability.inbound.configured?(ar?"الردود الواردة مفعلة":"Inbound replies enabled"):(ar?"الردود الواردة غير مفعلة":"Inbound replies not configured")}</strong><small>{thread.capability.inbound.domain??(ar?"فعّل EMAIL_INBOUND_DOMAIN":"Set EMAIL_INBOUND_DOMAIN")}</small></span></div></header>
    <section className="emailThreadLayout">
      <div className="adminPanel emailThreadPanel">
        <div className="emailThreadMessages">
          {thread.messages.map((message)=><article className={`emailThreadMessage ${message.direction==="INBOUND"?"incoming":"outgoing"}`} key={message.id}>
            <div className="emailThreadMessageHead"><span className="emailDirectionIcon">{message.direction==="INBOUND"?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>}</span><div><strong>{message.direction==="INBOUND"?(message.fromName||message.fromEmail):(ar?"فريق HandMeKey":"HandMeKey team")}</strong><small>{message.direction==="INBOUND"?message.fromEmail:message.toEmail}</small></div><time>{formatDateTime(message.createdAt,locale)}</time></div>
            <div className="emailThreadBody">{message.textBody.split("\n").map((line,index)=><p key={index}>{line||" "}</p>)}</div>
            <div className="emailThreadDelivery">{message.direction==="INBOUND"?<span><CheckCircle2 size={14}/>{ar?"مستلمة":"Received"}</span>:delivery(message.outbox?.status,ar)}{message.outbox?.lastError&&<span className="emailDeliveryError"><MailWarning size={14}/>{message.outbox.lastError}</span>}</div>
          </article>)}
        </div>
      </div>
      <aside className="adminPanel emailThreadReply"><span className="eyebrow">{ar?"رد":"Reply"}</span><h2>{ar?"تابع نفس المحادثة":"Continue this thread"}</h2><p>{ar?"سيذهب الرد لنفس البريد ويبقى مربوطاً بهذه المحادثة.":"Your reply goes to the same recipient and stays linked to this conversation."}</p><EmailComposer locale={locale} mode="reply" conversationId={thread.id} initialTo={thread.participantEmail} initialName={thread.participantName} initialSubject={thread.subject}/></aside>
    </section>
  </AdminShell>;
}
function delivery(status:string|undefined,ar:boolean){if(status==="SENT")return <span><CheckCircle2 size={14}/>{ar?"تم الإرسال":"Sent"}</span>;if(status==="FAILED"||status==="DEAD")return <span className="emailDeliveryError"><MailWarning size={14}/>{ar?"فشل الإرسال":"Delivery failed"}</span>;return <span><Clock3 size={14}/>{ar?"بانتظار الإرسال":"Queued"}</span>;}
function formatDateTime(value:Date,locale:"en"|"ar"){return new Intl.DateTimeFormat(locale==="ar"?"ar-JO":"en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(value);}
