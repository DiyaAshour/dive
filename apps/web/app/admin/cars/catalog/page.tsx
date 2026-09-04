import Link from "next/link";
import {redirect} from "next/navigation";
import {BadgeCheck, Building2, CalendarRange, CarFront, CircleDollarSign, Images, Rotate3D, ShieldCheck, TriangleAlert} from "lucide-react";
import {getAdminCarCatalogCoverage, getAdminCarCatalogOverview, getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import styles from "../cars-admin.module.css";

export const dynamic = "force-dynamic";
export const metadata = {title: "Vehicle Visual Catalog · HandMeKey"};

export default async function AdminCarsCatalogPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fcars%2Fcatalog");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const [overview, coverage, counts] = await Promise.all([
    getAdminCarCatalogOverview(principal.user.id),
    getAdminCarCatalogCoverage(principal.user.id),
    getAdminNavigationCounts(principal.user.id),
  ]);
  const coveragePercent = coverage.fleetVehicles ? Math.round((coverage.linkedFleetVehicles / coverage.fleetVehicles) * 100) : 100;

  return <AdminShell locale={locale} principal={principal} active="cars" counts={counts}>
    <header className="adminTopbar">
      <div><span className="eyebrow">HandMeKey Cars · Visual Library</span><h1>{ar ? "مكتبة مجسمات وصور السيارات" : "Vehicle visual catalog"}</h1><p>{ar ? "مكتبة مركزية تربط كل سيارة بالماركة والموديل والسنة والجيل والنسخة الدقيقة، وتخزن صور الاستوديو والزوايا والداخل و360° مرة واحدة لجميع شركات التأجير." : "A central library that links every fleet car to its exact make, model, year, generation and trim, then reuses studio, angle, interior and 360° visuals across every rental partner."}</p></div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{ar ? "تغطية مرخصة فقط" : "Licensed visuals only"}</strong><small>{ar ? "لا نستخدم صورًا عشوائية لنسخة مختلفة" : "No mismatched or scraped vehicle imagery"}</small></span></div>
    </header>

    <nav className={styles.tabs} aria-label={ar ? "إدارة السيارات" : "Cars admin"}>
      <Link href="/admin/cars"><CarFront size={15}/>{ar ? "نظرة عامة" : "Overview"}</Link>
      <Link className={styles.active} href="/admin/cars/catalog"><Images size={15}/>{ar ? "مكتبة المجسمات" : "Visual catalog"}</Link>
      <Link href="/admin/cars/companies"><Building2 size={15}/>{ar ? "الشركات" : "Companies"}</Link>
      <Link href="/admin/cars/reservations"><CalendarRange size={15}/>{ar ? "كل الحجوزات" : "All reservations"}</Link>
      <Link href="/admin/cars/finance"><CircleDollarSign size={15}/>{ar ? "المالية" : "Finance"}</Link>
    </nav>

    <section className={styles.metricGrid}>
      <Metric icon={<Images size={16}/>} label={ar ? "سيارات الكاتالوج" : "Catalog vehicles"} value={overview.activeVehicles} sub={`${overview.assetCount} ${ar ? "صورة/إطار مرئي" : "visual assets"}`}/>
      <Metric icon={<BadgeCheck size={16}/>} label={ar ? "تمت المراجعة" : "Reviewed exact models"} value={overview.reviewedVehicles} sub={ar ? "جاهزة للاستخدام" : "Ready for use"}/>
      <Metric icon={<Rotate3D size={16}/>} label={ar ? "مجسم خارجي 360°" : "Exterior 360°"} value={overview.exterior360Cars} sub={ar ? "تدور بالسحب" : "Drag-to-spin ready"}/>
      <Metric icon={<Images size={16}/>} label={ar ? "مقصورة 360°" : "Interior 360°"} value={overview.interior360Cars} sub={ar ? "بانوراما داخلية" : "Interior panorama ready"}/>
      <Metric icon={<CarFront size={16}/>} label={ar ? "ربط الأسطول" : "Fleet visual coverage"} value={coveragePercent} sub={`% · ${coverage.linkedFleetVehicles}/${coverage.fleetVehicles}`}/>
    </section>

    <div className={styles.split}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "تغطية الأسطول" : "Fleet coverage"}</span><h2>{ar ? "السيارات التي ما زالت تحتاج مجسمًا مطابقًا" : "Fleet vehicles still missing an exact visual match"}</h2><p>{ar ? "هذه القائمة تمنعنا من استخدام صورة سيارة قريبة أو نسخة مختلفة. عند وصول الأصل المرخص للنسخة الصحيحة، يتم ربطه مرة واحدة ويظهر لكل الشركات التي تستخدمها." : "This queue prevents using a close-but-wrong model image. Once licensed assets for the exact variant arrive, the match is stored once and reused everywhere."}</p></div></div>
        {coverage.pendingFleet.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar ? "الماركة" : "Make"}</th><th>{ar ? "الموديل" : "Model"}</th><th>{ar ? "السنة" : "Year"}</th><th>{ar ? "الفئة" : "Category"}</th><th>{ar ? "الحالة" : "Fleet status"}</th></tr></thead><tbody>
          {coverage.pendingFleet.map((vehicle) => <tr key={vehicle.id}><td><strong>{vehicle.make}</strong></td><td><strong>{vehicle.model}</strong></td><td>{vehicle.year}</td><td>{vehicle.category}</td><td>{vehicle.status}</td></tr>)}
        </tbody></table></div> : <div className={styles.empty}>{ar ? "ممتاز — كل سيارات الأسطول الحالية مرتبطة بكتالوج مرئي دقيق." : "Great — every current fleet vehicle is linked to an exact visual catalog entry."}</div>}
      </section>

      <aside className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "مصادر الصور" : "Visual sources"}</span><h2>{ar ? "مزودو الكاتالوج" : "Catalog providers"}</h2><p>{ar ? "يمكن خلط مزودين للسيارة نفسها: مجسم خارجي من مزود، وصور داخلية من مزود آخر، مع الاحتفاظ بالمصدر لكل أصل." : "A vehicle can combine providers: exterior spin from one source and interior assets from another, with provenance stored per asset."}</p></div></div>
        <div className={styles.infoList}>
          {overview.providers.length ? overview.providers.map((provider) => <div className={styles.infoItem} key={provider.provider}><span>{provider.provider}</span><strong>{provider.vehicles}</strong></div>) : <div className={styles.infoItem}><span>{ar ? "لا توجد دفعات مزود حتى الآن" : "No provider batches yet"}</span><strong>0</strong></div>}
          <div className={styles.infoItem}><span>{ar ? "صور رئيسية جاهزة" : "Hero-ready vehicles"}</span><strong>{coverage.heroReadyVehicles}</strong></div>
          <div className={styles.infoItem}><span>{ar ? "غير مرتبطة من الأسطول" : "Unlinked fleet"}</span><strong>{coverage.unlinkedFleetVehicles}</strong></div>
        </div>
        <div style={{marginTop:14,display:"flex",gap:8,alignItems:"flex-start",fontSize:12,lineHeight:1.7,color:"#607083"}}><TriangleAlert size={18} style={{flex:"0 0 auto",marginTop:2}}/><span>{ar ? "إضافة جميع موديلات العالم بالصور الحقيقية تعتمد على تغذية مرخصة من مزودي بيانات السيارات. البنية هنا جاهزة لاستيرادها على دفعات حتى 100 نسخة دقيقة في كل طلب بدون تغيير نظام الأسطول." : "Worldwide exact-model coverage depends on licensed vehicle-data feeds. This catalog is ready to ingest them in batches of up to 100 exact variants per request without changing the fleet model again."}</span></div>
      </aside>
    </div>
  </AdminShell>;
}

function Metric({icon, label, value, sub}: {icon: React.ReactNode; label: string; value: number; sub: string}) {
  return <article className={styles.metric}><span>{icon}{label}</span><strong>{value}</strong><small>{sub}</small></article>;
}
