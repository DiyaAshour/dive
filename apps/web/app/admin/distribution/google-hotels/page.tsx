import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {AlertTriangle, CheckCircle2, CircleOff, ExternalLink, Globe2, Hotel, MapPin, RadioTower, Search, Send, Waypoints} from "lucide-react";
import {getAdminNavigationCounts, getGoogleHotelsDistributionOverview} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {requestLocale} from "@/lib/request-locale";
import {currentAdminPrincipal} from "@/lib/server-session";
import {siteUrl} from "@/lib/site-url";
import styles from "./google-hotels.module.css";

export const metadata: Metadata = {title: "Google Hotels Distribution"};
export const dynamic = "force-dynamic";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GoogleHotelsDistributionPage({searchParams}: Readonly<{searchParams: SearchParams}>) {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fdistribution%2Fgoogle-hotels");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const params = await searchParams;
  const query = scalar(params.q) ?? "";
  const page = Number.parseInt(scalar(params.page) ?? "1", 10) || 1;
  const [overview, navCounts] = await Promise.all([
    getGoogleHotelsDistributionOverview(principal.user.id, siteUrl(), {query, page}),
    getAdminNavigationCounts(principal.user.id),
  ]);
  const capability = overview.capability;

  return <AdminShell locale={locale} principal={principal} active="distribution" counts={navCounts}>
    <header className={`adminTopbar ${styles.topbar}`}>
      <div>
        <span className="eyebrow">Google Hotel Center</span>
        <h1>{ar ? "توزيع الفنادق على Google" : "Google Hotels distribution"}</h1>
        <p>{ar ? "قناة مركزية تجعل الفنادق المؤهلة تدخل Hotel List تلقائياً، وتجهز روابط الحجز العميقة ومرحلة ARI للأسعار والمخزون." : "One distribution channel that automatically exposes eligible properties to the Hotel List feed, deep booking links and the future ARI rate/inventory connection."}</p>
      </div>
      <div className={styles.heroStatus} data-ready={capability.enabled ? "yes" : "no"}>
        <RadioTower size={18}/><span><b>{capability.enabled ? (ar ? "وضع Google مفعّل" : "Google mode enabled") : (ar ? "جاهز للربط" : "Ready for onboarding")}</b><small>{capability.hotelCenterConfigured ? (ar ? "بيانات Hotel Center موجودة" : "Hotel Center identifiers configured") : (ar ? "بانتظار حساب Hotel Center" : "Awaiting Hotel Center account")}</small></span>
      </div>
    </header>

    <section className={styles.flow} aria-label={ar ? "مسار Google" : "Google distribution flow"}>
      <FlowStep icon={<Hotel size={20}/>} title={ar ? "الفندق" : "Hotel"} text={ar ? "ACTIVE + verified" : "ACTIVE + verified"}/>
      <span>→</span><FlowStep icon={<Send size={20}/>} title="Hotel List" text={ar ? "تلقائي" : "Automatic"}/>
      <span>→</span><FlowStep icon={<MapPin size={20}/>} title={ar ? "مطابقة Google" : "Google matching"} text={ar ? "اسم + عنوان + موقع" : "Name + address + geo"}/>
      <span>→</span><FlowStep icon={<Waypoints size={20}/>} title="ARI" text={ar ? "سعر + مخزون" : "Rates + inventory"}/>
      <span>→</span><FlowStep icon={<Globe2 size={20}/>} title={ar ? "رابط حجز مجاني" : "Free booking link"} text="HandMeKey"/>
    </section>

    <section className={styles.kpis}>
      <Kpi label={ar ? "كل الفنادق" : "All properties"} value={overview.counts.total}/>
      <Kpi label={ar ? "جاهزة للـFeed" : "Feed ready"} value={overview.counts.ready} tone="good"/>
      <Kpi label={ar ? "تحتاج بيانات" : "Need data"} value={overview.counts.needsData} tone={overview.counts.needsData ? "warn" : "good"}/>
      <Kpi label={ar ? "مستبعدة" : "Excluded"} value={overview.counts.excluded}/>
      <Kpi label={ar ? "جودة مطابقة قوية" : "Strong match data"} value={overview.counts.strongMatch} tone="good"/>
    </section>

    <section className={styles.connectionGrid}>
      <article className={`adminPanel ${styles.connectionCard}`}><CardHead icon={<Send size={19}/>} title="Hotel List feed" status={overview.counts.ready > 0 ? "ready" : "wait"} ar={ar}/><p>{ar ? "يتولد مباشرة من قاعدة HandMeKey. أي فندق يصبح ACTIVE وموثق وبياناته مكتملة يدخل تلقائياً." : "Generated directly from HandMeKey. Every ACTIVE, verified property with complete core data enters automatically."}</p><code>{capability.hotelListFeedUrl}</code><Link href={capability.hotelListFeedUrl} target="_blank">{ar ? "فتح الـFeed" : "Open feed"}<ExternalLink size={14}/></Link></article>
      <article className={`adminPanel ${styles.connectionCard}`}><CardHead icon={<Waypoints size={19}/>} title="Landing pages" status="ready" ar={ar}/><p>{ar ? "Google يمرر رقم الفندق والتواريخ والإشغال إلى بوابة HandMeKey ثم نحوله للـslug الصحيح مع UTM." : "Google passes hotel ID, dates and occupancy to HandMeKey, then the gateway redirects to the canonical slug with attribution."}</p><code>{capability.landingPagesFeedUrl}</code><Link href={capability.landingPagesFeedUrl} target="_blank">{ar ? "فتح إعداد الصفحات" : "Open landing config"}<ExternalLink size={14}/></Link></article>
      <article className={`adminPanel ${styles.connectionCard}`}><CardHead icon={<RadioTower size={19}/>} title="ARI rates & inventory" status={capability.ariConfigured ? "ready" : "wait"} ar={ar}/><p>{capability.ariConfigured ? (ar ? "بيانات اتصال ARI موجودة. المرحلة التالية هي تفعيل رسائل الأسعار والمخزون بعد اعتماد Google." : "ARI credentials are present. Rate and inventory messages can be activated after Google certification.") : (ar ? "البنية جاهزة، لكن الإرسال الحقيقي يبقى مقفلاً إلى أن يعطينا Google endpoint وبيانات الشريك أثناء onboarding." : "The platform is prepared, but real ARI delivery stays locked until Google supplies the partner endpoint and credentials during onboarding.")}</p><small>{ar ? "لا يتم ادعاء إرسال سعر إلى Google قبل وجود اعتماد فعلي." : "HandMeKey never claims a Google rate sync before an actual certified connection exists."}</small></article>
    </section>

    <section className={`adminPanel ${styles.tablePanel}`}>
      <div className={styles.sectionHead}><div><span className="eyebrow">Property readiness</span><h2>{ar ? "الفنادق التي ستدخل Google تلقائياً" : "Properties entering Google automatically"}</h2><p>{ar ? "READY هنا تعني جاهز للإرسال في الـfeed، وليس أن Google طابق الفندق أو نشره بعد." : "READY means feed-ready. It does not pretend Google has matched or published the property yet."}</p></div></div>
      <form className={styles.searchForm} method="get"><label><Search size={16}/><input name="q" defaultValue={overview.filters.query} placeholder={ar ? "اسم الفندق، المدينة، العنوان…" : "Hotel, city, address…"}/></label><button className="primaryButton" type="submit">{ar ? "بحث" : "Search"}</button>{query && <Link className="secondaryButton" href="/admin/distribution/google-hotels">{ar ? "مسح" : "Clear"}</Link>}</form>
      <div className={styles.tableWrap}><table><thead><tr><th>{ar ? "الفندق" : "Property"}</th><th>{ar ? "حالة HandMeKey" : "HandMeKey"}</th><th>{ar ? "بيانات المطابقة" : "Match data"}</th><th>{ar ? "Google readiness" : "Google readiness"}</th><th>{ar ? "الرابط" : "Landing"}</th></tr></thead><tbody>{overview.items.map((hotel) => <tr key={hotel.id}><td><strong>{hotel.name}</strong><small>{[hotel.area, hotel.city, hotel.countryCode].filter(Boolean).join(" · ")}</small></td><td><span>{hotel.status}</span><small>{hotel.verified ? (ar ? "موثق" : "Verified") : (ar ? "غير موثق" : "Not verified")}</small></td><td><span className={hotel.hasCoordinates ? styles.dataGood : styles.dataWarn}>{hotel.hasCoordinates ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>} {hotel.hasCoordinates ? (ar ? "إحداثيات موجودة" : "Coordinates ready") : (ar ? "بدون إحداثيات" : "Coordinates missing")}</span>{hotel.missing.length > 0 && <small>{ar ? "ناقص: " : "Missing: "}{hotel.missing.join(", ")}</small>}</td><td><Readiness value={hotel.readiness} ar={ar}/></td><td><Link href={hotel.canonicalUrl} target="_blank">{hotel.slug}<ExternalLink size={13}/></Link><small>ID: {hotel.id}</small></td></tr>)}</tbody></table>{overview.items.length === 0 && <div className={styles.empty}>{ar ? "لا توجد نتائج." : "No properties found."}</div>}</div>
      {overview.pagination.pages > 1 && <nav className={styles.pagination}><Link className={overview.pagination.page <= 1 ? styles.disabled : ""} href={pageHref(overview.pagination.page - 1, query)}>{ar ? "السابق" : "Previous"}</Link><span>{overview.pagination.page} / {overview.pagination.pages}</span><Link className={overview.pagination.page >= overview.pagination.pages ? styles.disabled : ""} href={pageHref(overview.pagination.page + 1, query)}>{ar ? "التالي" : "Next"}</Link></nav>}
    </section>

    <section className={`adminPanel ${styles.onboarding}`}>
      <div><Globe2 size={22}/><span><strong>{ar ? "ما الذي يبقى حتى يظهر HandMeKey بجانب Agoda وBooking.com؟" : "What remains before HandMeKey can appear beside Agoda and Booking.com?"}</strong><small>{ar ? "هذه خطوات حساب Google، وليست ربطاً يدوياً لكل فندق." : "These are one-time partner-account steps, not per-hotel manual work."}</small></span></div>
      <ol><li>{ar ? "فتح/اعتماد Google Hotel Center كشريك Connectivity." : "Onboard/approve HandMeKey as a Google Hotel Center connectivity partner."}</li><li>{ar ? "تسليم Hotel List URL وLanding Pages URL الظاهرين فوق." : "Give Google the Hotel List and Landing Pages URLs shown above."}</li><li>{ar ? "متابعة نسبة المطابقة وتصحيح الاستثناءات فقط." : "Monitor match rate and fix only exceptional unmatched properties."}</li><li>{ar ? "إكمال اعتماد ARI ثم تشغيل مزامنة السعر والمخزون." : "Complete ARI certification, then enable rate/inventory delivery."}</li><li>{ar ? "تشغيل Free Booking Links ثم Hotel Ads إذا أردنا." : "Activate Free Booking Links, then Hotel Ads if desired."}</li></ol>
    </section>
  </AdminShell>;
}

function FlowStep({icon,title,text}:Readonly<{icon:React.ReactNode;title:string;text:string}>){return <div>{icon}<span><strong>{title}</strong><small>{text}</small></span></div>;}
function Kpi({label,value,tone}:Readonly<{label:string;value:number;tone?:"good"|"warn"}>){return <article data-tone={tone ?? "neutral"}><span>{label}</span><strong>{value.toLocaleString()}</strong></article>;}
function CardHead({icon,title,status,ar}:Readonly<{icon:React.ReactNode;title:string;status:"ready"|"wait";ar:boolean}>){return <div className={styles.cardHead}><span>{icon}</span><strong>{title}</strong><em data-status={status}>{status === "ready" ? (ar ? "جاهز" : "Ready") : (ar ? "بانتظار الربط" : "Awaiting connection")}</em></div>;}
function Readiness({value,ar}:Readonly<{value:string;ar:boolean}>){if(value==="READY")return <span className={`${styles.readiness} ${styles.ready}`}><CheckCircle2 size={14}/>{ar?"جاهز للـFeed":"Feed ready"}</span>;if(value==="NEEDS_DATA")return <span className={`${styles.readiness} ${styles.warning}`}><AlertTriangle size={14}/>{ar?"يحتاج بيانات":"Needs data"}</span>;return <span className={`${styles.readiness} ${styles.excluded}`}><CircleOff size={14}/>{ar?"مستبعد":"Excluded"}</span>;}
function scalar(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
function pageHref(page:number,query:string){const params=new URLSearchParams();if(query)params.set("q",query);params.set("page",String(Math.max(1,page)));return `/admin/distribution/google-hotels?${params.toString()}`;}
