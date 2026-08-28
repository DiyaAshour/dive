import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft, Inbox, MailPlus, MessageCircle, Search} from "lucide-react";
import {getAdminEmailConversationInbox, getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";

export const metadata: Metadata = {title:"Email conversations"};
export const dynamic = "force-dynamic";
type SearchParams = Promise<Record<string,string|string[]|undefined>>;

export default async function AdminEmailConversationsPage({searchParams}:Readonly<{searchParams:SearchParams}>) {
  const principal=await currentAdminPrincipal();
  if(!principal)redirect("/admin/login?next=%2Fadmin%2Fcommunications%2Femail%2Fconversations");
  const locale=await requestLocale(); const ar=locale==="ar"; const params=await searchParams;
  const query=scalar(params.q)??""; const page=Math.max(1,Number.parseInt(scalar(params.page)??"1",10)||1);
  const [inbox,counts]=await Promise.all([getAdminEmailConversationInbox(principal.user.id,{query,page}),getAdminNavigationCounts(principal.user.id)]);
  return <AdminShell locale={locale} principal={principal} active="email" counts={{...counts,emailOps:inbox.unread}}>
    <header className="adminTopbar emailConversationTopbar">
      <div><Link className="emailBackLink" href="/admin/communications/email"><ArrowLeft size={16}/>{ar?"مركز البريد":"Email center"}</Link><span className="eyebrow">{ar?"البريد الوارد":"Inbox"}</span><h1>{ar?"محادثات البريد":"Email conversations"}</h1><p>{ar?"كل رسالة جديدة أو رد من الضيف أو الفندق يبقى داخل سلسلة واحدة، ويمكن لفريق الإدارة الرد من نفس المكان.":"New mail and replies from guests or properties stay grouped into one thread so the operations team can continue the conversation from here."}</p></div>
      <Link className="primaryButton emailNewButton" href="/admin/communications/email/compose"><MailPlus size={17}/>{ar?"رسالة جديدة":"New message"}</Link>
    </header>
    <section className="adminPanel emailInboxPanel">
      <div className="adminSectionTitle"><div><span className="eyebrow">{ar?"Inbox":"Inbox"}</span><h2>{ar?"المحادثات":"Conversations"}</h2><p>{inbox.unread>0?(ar?`${inbox.unread} رسائل غير مقروءة`:`${inbox.unread} unread messages`):(ar?"كل الرسائل مقروءة":"You are all caught up")}</p></div><span className={inbox.capability.inbound.configured?"adminClear":"adminAttention"}>{inbox.capability.inbound.configured?(ar?"البريد الوارد جاهز":"Inbound ready"):(ar?"البريد الوارد غير مفعّل":"Inbound not configured")}</span></div>
      <form className="emailConversationSearch" method="get"><Search size={17}/><input name="q" defaultValue={inbox.query} placeholder={ar?"ابحث بالاسم أو البريد أو الموضوع…":"Search name, email or subject…"}/><button type="submit">{ar?"بحث":"Search"}</button></form>
      <div className="emailConversationList">
        {inbox.items.length===0?<div className="emailOpsEmpty"><Inbox size={30}/><strong>{ar?"لا توجد محادثات بعد":"No conversations yet"}</strong><p>{ar?"ابدأ رسالة جديدة، أو ستظهر هنا الرسائل الواردة بعد تفعيل عنوان البريد الوارد.":"Start a new email, or incoming messages will appear here once inbound email is configured."}</p></div>:inbox.items.map((thread)=><Link key={thread.id} href={`/admin/communications/email/conversations/${thread.id}`} className={`emailConversationRow ${thread.unreadCount>0?"unread":""}`}>
          <span className="emailAvatar">{(thread.participantName?.trim()?.[0]??thread.participantEmail[0]??"?").toUpperCase()}</span>
          <span className="emailConversationWho"><strong>{thread.participantName||thread.participantEmail}</strong>{thread.participantName&&<small>{thread.participantEmail}</small>}</span>
          <span className="emailConversationPreview"><b>{thread.subject}</b><small>{thread.latestMessage?.textBody.slice(0,140)??(ar?"محادثة جديدة":"New conversation")}</small></span>
          <span className="emailConversationTime"><time>{formatDateTime(thread.lastMessageAt,locale)}</time>{thread.unreadCount>0&&<b>{thread.unreadCount}</b>}<MessageCircle size={16}/></span>
        </Link>)}
      </div>
      {inbox.pagination.pages>1&&<nav className="emailOpsPagination"><Link className={page<=1?"disabled":""} href={pageHref(page-1,query)}>{ar?"السابق":"Previous"}</Link><span>{ar?"صفحة":"Page"} {page} / {inbox.pagination.pages}</span><Link className={page>=inbox.pagination.pages?"disabled":""} href={pageHref(page+1,query)}>{ar?"التالي":"Next"}</Link></nav>}
    </section>
  </AdminShell>;
}
function scalar(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
function pageHref(page:number,query:string){const params=new URLSearchParams();if(query)params.set("q",query);params.set("page",String(Math.max(1,page)));return `/admin/communications/email/conversations?${params.toString()}`;}
function formatDateTime(value:Date,locale:"en"|"ar"){return new Intl.DateTimeFormat(locale==="ar"?"ar-JO":"en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(value);}
