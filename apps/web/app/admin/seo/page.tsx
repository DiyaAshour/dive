import {redirect} from "next/navigation";
import {Activity, ArrowUpRight, BookOpenText, CarFront, CircleCheck, Search, ShieldCheck, TriangleAlert} from "lucide-react";
import {database} from "@platform/database";
import {getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";

export const dynamic="force-dynamic";

type QueueIssue={number:number;title:string;created_at:string;pull_request?:unknown};

async function getQueue(){
  try{
    const res=await fetch("https://api.github.com/repos/DiyaAshour/dive/issues?state=open&per_page=100&sort=created&direction=asc",{headers:{Accept:"application/vnd.github+json","User-Agent":"HandMeKey-SEO-Dashboard"},cache:"no-store"});
    if(!res.ok)return {issues:[] as QueueIssue[],ok:false};
    const rows=(await res.json()) as QueueIssue[];
    return {issues:rows.filter(row=>!row.pull_request&&(row.title.startsWith("[HMK-SEO-PUBLISH]")||row.title.startsWith("[HMK-SEO-UPDATE]"))),ok:true};
  }catch{return {issues:[] as QueueIssue[],ok:false};}
}

function pct(n:number,d:number){return d?`${((n/d)*100).toFixed(1)}%`:"0.0%";}

export default async function SeoControlPage(){
  const principal=await currentAdminPrincipal(); if(!principal)redirect("/admin/login?next=%2Fadmin%2Fseo");
  const locale=await requestLocale(); const ar=locale==="ar"; const db=database();
  const since24=new Date(Date.now()-24*60*60*1000); const since30=new Date(Date.now()-30*24*60*60*1000);
  const [counts,queue,lastAutoPost,autoPosts30,views30,search30,cars30,recentEvents]=await Promise.all([
    getAdminNavigationCounts(principal.user.id),
    getQueue(),
    db.blogPost.findFirst({where:{authorName:"HandMeKey SEO Engine",status:"PUBLISHED"},orderBy:{publishedAt:"desc"},select:{slug:true,locale:true,title:true,publishedAt:true,updatedAt:true}}),
    db.blogPost.count({where:{authorName:"HandMeKey SEO Engine",status:"PUBLISHED",publishedAt:{gte:since30}}}),
    db.auditLog.count({where:{entityType:"SEO_CONVERSION",action:"BLOG_VIEW",createdAt:{gte:since30}}}),
    db.auditLog.count({where:{entityType:"SEO_CONVERSION",action:"BLOG_TO_SEARCH",createdAt:{gte:since30}}}),
    db.auditLog.count({where:{entityType:"SEO_CONVERSION",action:"BLOG_TO_CARS",createdAt:{gte:since30}}}),
    db.auditLog.findMany({where:{entityType:"SEO_CONVERSION",createdAt:{gte:since30}},orderBy:{createdAt:"desc"},take:20,select:{action:true,entityId:true,after:true,createdAt:true}}),
  ]);
  const lastMs=lastAutoPost?.publishedAt?.getTime()??0; const publisherRecent=lastMs>Date.now()-2*60*60*1000;
  const oldest=queue.issues[0]?Date.now()-new Date(queue.issues[0].created_at).getTime():0;
  const staleQueue=oldest>3*60*60*1000;
  const health=queue.ok&&!staleQueue&&(publisherRecent||queue.issues.length===0);
  const marketplaceActions=search30+cars30;
  const publishQueued=queue.issues.filter(i=>i.title.startsWith("[HMK-SEO-PUBLISH]")).length;
  const updateQueued=queue.issues.filter(i=>i.title.startsWith("[HMK-SEO-UPDATE]")).length;
  const c=ar?{
    eyebrow:"محرك SEO الذاتي",title:"SEO Control Center",sub:"صحة النظام، طابور النشر، أداء المحتوى، والتحويلات من المقالات إلى السوق.",healthy:"النظام سليم",attention:"يحتاج انتباه",publisher:"آخر نشر آلي",queue:"الطابور المفتوح",published:"منشور آليًا · 30 يوم",views:"مشاهدات المقالات · 30 يوم",search:"انتقالات للبحث",cars:"انتقالات للسيارات",rate:"معدل الانتقال للسوق",queueTitle:"حالة طابور SEO",events:"آخر إشارات التحويل",none:"لا توجد أحداث بعد",noQueue:"لا توجد عناصر معلقة",publish:"نشر جديد",update:"تحديث",note:"التحويل هنا يعني انتقالًا مؤكدًا من مقال إلى Search أو Cars. ربط الحجز النهائي سيُضاف فقط عند وجود attribution موثوق داخل checkout."}:{
    eyebrow:"Autonomous SEO engine",title:"SEO Control Center",sub:"System health, publishing queue, content output and article-to-marketplace conversions.",healthy:"System healthy",attention:"Needs attention",publisher:"Last automated publish",queue:"Open queue",published:"Auto-published · 30d",views:"Article views · 30d",search:"Clicks to search",cars:"Clicks to cars",rate:"Marketplace action rate",queueTitle:"SEO queue health",events:"Latest conversion signals",none:"No events yet",noQueue:"No pending queue items",publish:"Publish",update:"Update",note:"Conversion here means a confirmed article click into Search or Cars. Final-booking attribution will only be shown once checkout has a trustworthy attribution link."};

  return <AdminShell locale={locale} principal={principal} active="seo" counts={counts}>
    <header className="adminTopbar"><div><span className="eyebrow"><ShieldCheck size={15}/>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.sub}</p></div><div className={`blogStatus ${health?"published":"draft"}`}>{health?<CircleCheck size={16}/>:<TriangleAlert size={16}/>} {health?c.healthy:c.attention}</div></header>

    <section className="blogAdminMetrics">
      <article><span><Activity size={18}/></span><div><small>{c.publisher}</small><strong>{lastAutoPost?.publishedAt?lastAutoPost.publishedAt.toLocaleString(ar?"ar-JO":"en-US",{dateStyle:"medium",timeStyle:"short"}):"—"}</strong></div></article>
      <article><span><BookOpenText size={18}/></span><div><small>{c.published}</small><strong>{autoPosts30}</strong></div></article>
      <article><span><Activity size={18}/></span><div><small>{c.queue}</small><strong>{queue.issues.length}</strong></div></article>
      <article><span><BookOpenText size={18}/></span><div><small>{c.views}</small><strong>{views30}</strong></div></article>
      <article><span><ArrowUpRight size={18}/></span><div><small>{c.rate}</small><strong>{pct(marketplaceActions,views30)}</strong></div></article>
    </section>

    <section className="adminPanel adminSection">
      <div className="blogAdminSectionHead"><div><span className="eyebrow"><Activity size={15}/>{c.queueTitle}</span><h2>{publishQueued} {c.publish} · {updateQueued} {c.update}</h2></div></div>
      {queue.issues.length===0?<div className="adminEmptyState"><CircleCheck size={28}/><strong>{c.noQueue}</strong></div>:<div className="adminBlogTable">{queue.issues.slice(0,12).map(issue=><article key={issue.number}><div><strong>{issue.title}</strong><small>#{issue.number}</small></div><div><small>{new Date(issue.created_at).toLocaleString(ar?"ar-JO":"en-US")}</small></div></article>)}</div>}
    </section>

    <section className="blogAdminMetrics">
      <article><span><Search size={18}/></span><div><small>{c.search}</small><strong>{search30}</strong></div></article>
      <article><span><CarFront size={18}/></span><div><small>{c.cars}</small><strong>{cars30}</strong></div></article>
      <article><span><ArrowUpRight size={18}/></span><div><small>{c.rate}</small><strong>{pct(marketplaceActions,views30)}</strong></div></article>
    </section>

    <section className="adminPanel adminSection">
      <div className="blogAdminSectionHead"><div><span className="eyebrow"><ArrowUpRight size={15}/>{c.events}</span><h2>{marketplaceActions}</h2></div></div>
      <p>{c.note}</p>
      {recentEvents.length===0?<div className="adminEmptyState"><Activity size={28}/><strong>{c.none}</strong></div>:<div className="adminBlogTable">{recentEvents.map((event,index)=><article key={`${event.createdAt.toISOString()}-${index}`}><div><strong>{event.action}</strong><small>{event.entityId}</small></div><div><small>{event.createdAt.toLocaleString(ar?"ar-JO":"en-US")}</small></div></article>)}</div>}
    </section>
  </AdminShell>;
}
