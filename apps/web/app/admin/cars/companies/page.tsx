import Link from "next/link";
import {redirect} from "next/navigation";
import {BadgeCheck, Building2, CalendarRange, CarFront, MapPin, Search} from "lucide-react";
import {getAdminNavigationCounts, listAdminCarCompanies} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import styles from "../cars-admin.module.css";

export const dynamic = "force-dynamic";
export const metadata = {title: "Rental Companies · HandMeKey Admin"};

export default async function AdminCarCompaniesPage({searchParams}: {searchParams: Promise<{q?: string; status?: string}>}) {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fcars%2Fcompanies");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const query = await searchParams;
  const filters: {query?: string; status?: string} = {};
  if (query.q) filters.query = query.q;
  if (query.status) filters.status = query.status;
  const [companies, counts] = await Promise.all([
    listAdminCarCompanies(principal.user.id, filters),
    getAdminNavigationCounts(principal.user.id),
  ]);

  return <AdminShell locale={locale} principal={principal} active="cars" counts={counts}>
    <header className="adminTopbar"><div><span className="eyebrow">HandMeKey Cars · Partner Network</span><h1>{ar ? "شركات تأجير السيارات" : "Rental companies"}</h1><p>{ar ? "كل شركة مسجلة على المنصة مع حجم الأسطول والحجوزات والقيمة المحجوزة وحالة التوثيق." : "Every rental partner with fleet size, bookings, booked value and verification state."}</p></div><div className="adminSessionBadge"><Building2 size={18}/><span><strong>{companies.length} {ar ? "شركة" : "companies"}</strong><small>{query.status || (ar ? "كل الحالات" : "all statuses")}</small></span></div></header>

    <nav className={styles.tabs}><Link href="/admin/cars"><CarFront size={15}/>{ar ? "نظرة عامة" : "Overview"}</Link><Link className={styles.active} href="/admin/cars/companies"><Building2 size={15}/>{ar ? "الشركات" : "Companies"}</Link><Link href="/admin/cars/reservations"><CalendarRange size={15}/>{ar ? "كل الحجوزات" : "All reservations"}</Link></nav>

    <section className="adminPanel adminSection">
      <form className="adminFilterBar" method="get">
        <label><Search size={16}/><input name="q" defaultValue={query.q ?? ""} placeholder={ar ? "ابحث باسم الشركة، المدينة، البريد أو الرابط..." : "Search company, city, email or slug..."}/></label>
        <select name="status" defaultValue={query.status ?? ""} aria-label={ar ? "الحالة" : "Status"}><option value="">{ar ? "كل الحالات" : "All statuses"}</option><option value="ACTIVE">ACTIVE</option><option value="DRAFT">DRAFT</option><option value="PENDING_REVIEW">PENDING REVIEW</option><option value="SUSPENDED">SUSPENDED</option></select>
        <button className="primaryButton" type="submit">{ar ? "بحث" : "Search"}</button>
        {(query.q || query.status) && <Link className="secondaryButton" href="/admin/cars/companies">{ar ? "مسح" : "Clear"}</Link>}
      </form>

      {companies.length ? <div className={styles.companyList}>{companies.map((company) => {
        const companyHref = `/admin/cars/companies/${company.id}`;
        const reservationsHref = `/admin/cars/reservations?companyId=${encodeURIComponent(company.id)}`;
        return <article className={styles.companyCard} key={company.id}>
          <div className={styles.identity}><div className={styles.heroActions}><Status value={company.status}/>{company.verified && <span className={styles.verified}><BadgeCheck size={14}/>{ar ? "موثقة" : "Verified"}</span>}</div><h2><a className={styles.companyNameLink} href={companyHref}>{company.name}</a></h2><p>{company.slug}</p><small><MapPin size={11}/> {company.city}, {company.countryCode}</small></div>
          <div className={styles.stats}><span><strong>{company.counts.vehicles}</strong>{ar ? "سيارات" : "Vehicles"}</span><span><strong>{company.counts.reservations}</strong>{ar ? "كل الحجوزات" : "Bookings"}</span><span><strong>{company.upcomingReservations}</strong>{ar ? "قادمة" : "Upcoming"}</span><span><strong>{company.counts.locations}</strong>{ar ? "فروع" : "Locations"}</span></div>
          <div className={styles.meta}><strong>{formatMoney(company.bookedValue, company.currency, locale)}</strong><span>{ar ? "قيمة حجوزات مؤكدة" : "Confirmed booked value"}</span><small>{ar ? "عمولة المنصة" : "Commission"}: {(company.commissionRate * 100).toFixed(1)}%</small></div>
          <div className={`${styles.heroActions} ${styles.companyActions}`}><a className="secondaryButton" href={reservationsHref}>{ar ? "الحجوزات" : "Bookings"}</a><a className="primaryButton" href={companyHref}>{ar ? "إدارة" : "Manage"}</a></div>
        </article>;
      })}</div> : <div className={styles.empty}>{ar ? "لا توجد شركات تطابق البحث." : "No companies match these filters."}</div>}
    </section>
  </AdminShell>;
}

function Status({value}: {value: string}) {return <span className={`${styles.status} ${styles[value.toLowerCase()] ?? ""}`}>{value.replaceAll("_", " ")}</span>}
function formatMoney(value: number, currency: string, locale: "en" | "ar") {return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {style: "currency", currency, maximumFractionDigits: 2}).format(value)}
