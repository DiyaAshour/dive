import Link from "next/link";
import {redirect} from "next/navigation";
import {BadgeCheck, Building2, CalendarRange, CarFront, CircleDollarSign, Images, Rotate3D, ShieldCheck, TriangleAlert} from "lucide-react";
import {getAdminCarCatalogCoverage, getAdminCarCatalogOverview, getAdminNavigationCounts, getJordanRentalMarketSummary} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {CarCatalogCutoutUploader} from "@/components/car-catalog-cutout-uploader";
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
  const market = getJordanRentalMarketSummary();
  const [overview, coverage, counts] = await Promise.all([
    getAdminCarCatalogOverview(principal.user.id),
    getAdminCarCatalogCoverage(principal.user.id),
    getAdminNavigationCounts(principal.user.id),
  ]);
  const coveragePercent = coverage.fleetVehicles ? Math.round((coverage.linkedFleetVehicles / coverage.fleetVehicles) * 100) : 100;

  return <AdminShell locale={locale} principal={principal} active="cars" counts={counts}>
    <header className="adminTopbar">
      <div><span className="eyebrow">HandMeKey Cars · Jordan Fleet Library</span><h1>{ar ? "مكتبة سيارات التأجير والمجسمات في الأردن" : "Jordan rental vehicle & visual catalog"}</h1><p>{ar ? "مرجع مركزي لموديلات سيارات التأجير المرصودة في الأردن، مع ربط كل سيارة فعلية لاحقًا بالماركة والموديل والسنة والجيل والنسخة الدقيقة وصورة الـcutout أو 360° عند توفرها." : "A central reference of rental models observed in Jordan, with every real fleet car later linked to its exact make, model, year, generation and trim plus a cutout or 360° visual when available."}</p></div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{ar ? "الأردن أولًا" : "Jordan-first coverage"}</strong><small>{ar ? "لا نختار صورة قريبة لموديل مختلف" : "No close-but-wrong model artwork"}</small></span></div>
    </header>

    <nav className={styles.tabs} aria-label={ar ? "إدارة السيارات" : "Cars admin"}>
      <Link href="/admin/cars"><CarFront size={15}/>{ar ? "نظرة عامة" : "Overview"}</Link>
      <Link className={styles.active} href="/admin/cars/catalog"><Images size={15}/>{ar ? "مكتبة السيارات" : "Vehicle catalog"}</Link>
      <Link href="/admin/cars/companies"><Building2 size={15}/>{ar ? "الشركات" : "Companies"}</Link>
      <Link href="/admin/cars/reservations"><CalendarRange size={15}/>{ar ? "كل الحجوزات" : "All reservations"}</Link>
      <Link href="/admin/cars/finance"><CircleDollarSign size={15}/>{ar ? "المالية" : "Finance"}</Link>
    </nav>

    <section className={styles.metricGrid}>
      <Metric icon={<CarFront size={16}/>} label={ar ? "موديلات سوق التأجير الأردني" : "Jordan rental-market models"} value={market.models} sub={`${market.makes} ${ar ? "ماركة" : "makes"} · ${market.sourceCount} ${ar ? "مصادر أساطيل" : "fleet sources"}`}/>
      <Metric icon={<Images size={16}/>} label={ar ? "سيارات الكاتالوج الدقيقة" : "Exact catalog vehicles"} value={overview.activeVehicles} sub={`${overview.assetCount} ${ar ? "صورة/إطار مرئي" : "visual assets"}`}/>
      <Metric icon={<BadgeCheck size={16}/>} label={ar ? "تمت المراجعة" : "Reviewed exact models"} value={overview.reviewedVehicles} sub={ar ? "جاهزة للاستخدام" : "Ready for use"}/>
      <Metric icon={<Rotate3D size={16}/>} label={ar ? "عرض خارجي 360°" : "Exterior 360°"} value={overview.exterior360Cars} sub={ar ? "تدور بالسحب" : "Drag-to-spin ready"}/>
      <Metric icon={<Images size={16}/>} label={ar ? "مقصورة 360°" : "Interior 360°"} value={overview.interior360Cars} sub={ar ? "بانوراما داخلية" : "Interior panorama ready"}/>
      <Metric icon={<CarFront size={16}/>} label={ar ? "ربط الأسطول" : "Fleet visual coverage"} value={coveragePercent} sub={`% · ${coverage.linkedFleetVehicles}/${coverage.fleetVehicles}`}/>
    </section>

    <CarCatalogCutoutUploader locale={locale}/>

    <div className={styles.split}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "تغطية الأسطول" : "Fleet coverage"}</span><h2>{ar ? "السيارات التي ما زالت تحتاج صورة cutout أو مجسمًا مطابقًا" : "Fleet vehicles still missing an exact cutout or visual match"}</h2><p>{ar ? "قائمة سوق الأردن تساعد الشركة تختار الموديل الصحيح حتى لو الصورة الدقيقة غير جاهزة. بعدها نربط السنة والنسخة والصورة الموحدة مرة واحدة لتظهر لكل الشركات التي تستخدم نفس السيارة." : "The Jordan market list lets partners choose the correct model even before its exact visual is ready. The year, trim and standardized visual can then be linked once and reused across every partner using that car."}</p></div></div>
        {coverage.pendingFleet.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar ? "الماركة" : "Make"}</th><th>{ar ? "الموديل" : "Model"}</th><th>{ar ? "السنة" : "Year"}</th><th>{ar ? "الفئة" : "Category"}</th><th>{ar ? "الحالة" : "Fleet status"}</th></tr></thead><tbody>
          {coverage.pendingFleet.map((vehicle) => <tr key={vehicle.id}><td><strong>{vehicle.make}</strong></td><td><strong>{vehicle.model}</strong></td><td>{vehicle.year}</td><td>{vehicle.category}</td><td>{vehicle.status}</td></tr>)}
        </tbody></table></div> : <div className={styles.empty}>{ar ? "ممتاز — كل سيارات الأسطول الحالية مرتبطة بكتالوج مرئي دقيق." : "Great — every current fleet vehicle is linked to an exact visual catalog entry."}</div>}
      </section>

      <aside className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "مرجع السوق" : "Market reference"}</span><h2>{ar ? "تغطية سيارات التأجير في الأردن" : "Jordan rental fleet coverage"}</h2><p>{ar ? `تم تجميع المرجع من ${market.sourceCount} مصادر أساطيل عامة، وآخر تحديث ${market.observedAt}. وجود الموديل هنا لا يعني توفره في كل تاريخ أو شركة.` : `The reference is compiled from ${market.sourceCount} public fleet sources and was last reviewed ${market.observedAt}. A listed model is not a promise of availability for every company or date.`}</p></div></div>
        <div className={styles.infoList}>
          {market.categories.slice(0,6).map((item) => <div className={styles.infoItem} key={item.category}><span>{item.category}</span><strong>{item.models}</strong></div>)}
          <div className={styles.infoItem}><span>{ar ? "صور رئيسية جاهزة" : "Hero-ready exact vehicles"}</span><strong>{coverage.heroReadyVehicles}</strong></div>
          <div className={styles.infoItem}><span>{ar ? "غير مرتبطة من الأسطول" : "Unlinked fleet"}</span><strong>{coverage.unlinkedFleetVehicles}</strong></div>
        </div>
        <div style={{marginTop:14,display:"flex",gap:8,alignItems:"flex-start",fontSize:12,lineHeight:1.7,color:"#607083"}}><TriangleAlert size={18} style={{flex:"0 0 auto",marginTop:2}}/><span>{ar ? "الموديل المرجعي لا يختلق سنة أو نسخة غير مؤكدة. الشركة تختار الموديل ثم تحدد السنة والنسخة الفعلية، وبعدها نستخدم فقط cutout أو 360° مطابقًا لتلك الهوية." : "The market reference never invents an unverified year or trim. The partner chooses the model and then its real year/trim; only a matching cutout or 360° visual should be attached to that exact identity."}</span></div>
      </aside>
    </div>
  </AdminShell>;
}

function Metric({icon, label, value, sub}: {icon: React.ReactNode; label: string; value: number; sub: string}) {
  return <article className={styles.metric}><span>{icon}{label}</span><strong>{value}</strong><small>{sub}</small></article>;
}
