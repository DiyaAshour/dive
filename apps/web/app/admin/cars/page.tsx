import Link from "next/link";
import {redirect} from "next/navigation";
import {BadgeCheck, Building2, CalendarRange, CarFront, CircleAlert, MapPin, ShieldCheck} from "lucide-react";
import {getAdminCarOverview, getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import styles from "./cars-admin.module.css";

export const dynamic = "force-dynamic";
export const metadata = {title: "Cars Control Center · HandMeKey"};

export default async function AdminCarsPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fcars");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const [overview, counts] = await Promise.all([
    getAdminCarOverview(principal.user.id),
    getAdminNavigationCounts(principal.user.id),
  ]);
  const m = overview.metrics;

  return <AdminShell locale={locale} principal={principal} active="cars" counts={counts}>
    <header className="adminTopbar">
      <div><span className="eyebrow">HandMeKey Cars · Platform Operations</span><h1>{ar ? "مركز إدارة سوق السيارات" : "Cars marketplace control center"}</h1><p>{ar ? "راقب شركات التأجير والأسطول والحجوزات من مستوى المنصة، بعيدًا عن لوحة كل شريك." : "Operate rental companies, fleet and reservations from the platform level, separate from each partner dashboard."}</p></div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{ar ? "صلاحيات المنصة" : "Platform authority"}</strong><small>{ar ? "عرض وإدارة جميع شركات السيارات" : "All rental companies visible"}</small></span></div>
    </header>

    <nav className={styles.tabs} aria-label={ar ? "إدارة السيارات" : "Cars admin"}>
      <Link className={styles.active} href="/admin/cars"><CarFront size={15}/>{ar ? "نظرة عامة" : "Overview"}</Link>
      <Link href="/admin/cars/companies"><Building2 size={15}/>{ar ? "الشركات" : "Companies"}</Link>
      <Link href="/admin/cars/reservations"><CalendarRange size={15}/>{ar ? "كل الحجوزات" : "All reservations"}</Link>
    </nav>

    <section className={styles.metricGrid}>
      <Metric icon={<Building2 size={16}/>} label={ar ? "شركات التأجير" : "Rental companies"} value={m.companyCount} sub={`${m.activeCompanies} ${ar ? "نشطة" : "active"}`}/>
      <Metric icon={<BadgeCheck size={16}/>} label={ar ? "بانتظار المراجعة" : "Pending review"} value={m.pendingCompanies} sub={ar ? "تحتاج قرار إداري" : "Need admin decision"}/>
      <Metric icon={<CarFront size={16}/>} label={ar ? "إجمالي الأسطول" : "Marketplace fleet"} value={m.vehicleCount} sub={`${m.activeVehicles} ${ar ? "متاحة" : "active"}`}/>
      <Metric icon={<CalendarRange size={16}/>} label={ar ? "كل الحجوزات" : "All reservations"} value={m.reservationCount} sub={`${m.upcomingReservations} ${ar ? "قادمة" : "upcoming"}`}/>
      <Metric icon={<CircleAlert size={16}/>} label={ar ? "شركات موقوفة" : "Suspended companies"} value={m.suspendedCompanies} sub={ar ? "غير ظاهرة للعملاء" : "Hidden from customers"}/>
    </section>

    <div className={styles.split}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "تشغيل مباشر" : "Live operations"}</span><h2>{ar ? "أحدث حجوزات السيارات" : "Latest car reservations"}</h2><p>{ar ? "من جميع شركات التأجير على المنصة." : "Across every rental company on the platform."}</p></div><Link href="/admin/cars/reservations">{ar ? "عرض كل الحجوزات" : "View all reservations"}</Link></div>
        {overview.recentReservations.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar ? "الحجز" : "Booking"}</th><th>{ar ? "الشركة" : "Company"}</th><th>{ar ? "الضيف" : "Guest"}</th><th>{ar ? "السيارة" : "Vehicle"}</th><th>{ar ? "الاستلام" : "Pickup"}</th><th>{ar ? "الإجمالي" : "Total"}</th></tr></thead><tbody>
          {overview.recentReservations.map((reservation) => <tr key={reservation.id}>
            <td><Link href={`/admin/cars/reservations/${reservation.id}`}>{reservation.reference}</Link><small><Status value={reservation.status}/></small></td>
            <td><Link href={`/admin/cars/companies/${reservation.companyId}`}>{reservation.companyName}</Link></td>
            <td><strong>{reservation.guestName}</strong><small>{reservation.guestEmail}</small></td>
            <td><strong>{reservation.vehicle}</strong><small>{reservation.vehicleCategory}</small></td>
            <td><strong>{formatDateTime(reservation.pickupAt, locale)}</strong><small>{reservation.pickupLocation}</small></td>
            <td className={styles.money}><strong>{formatMoney(reservation.total, reservation.currency, locale)}</strong><small>{ar ? "عمولة" : "Commission"}: {formatMoney(reservation.platformCommission, reservation.currency, locale)}</small></td>
          </tr>)}
        </tbody></table></div> : <div className={styles.empty}>{ar ? "لا توجد حجوزات سيارات بعد." : "No car reservations yet."}</div>}
      </section>

      <aside className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "انتباه إداري" : "Admin attention"}</span><h2>{ar ? "حالة الشبكة" : "Network status"}</h2><p>{ar ? "أهم الحالات التي تحتاج متابعة." : "The states that need platform attention."}</p></div></div>
        <div className={styles.infoList}>
          <div className={styles.infoItem}><span>{ar ? "قيد المراجعة" : "Pending review"}</span><strong>{m.pendingCompanies}</strong></div>
          <div className={styles.infoItem}><span>{ar ? "موقوفة" : "Suspended"}</span><strong>{m.suspendedCompanies}</strong></div>
          <div className={styles.infoItem}><span>{ar ? "حجوزات قادمة" : "Upcoming bookings"}</span><strong>{m.upcomingReservations}</strong></div>
          <div className={styles.infoItem}><span>{ar ? "سيارات فعالة" : "Active vehicles"}</span><strong>{m.activeVehicles}</strong></div>
        </div>
        <div className={styles.heroActions} style={{marginTop: 14}}><Link className="primaryButton" href="/admin/cars/companies?status=PENDING_REVIEW"><BadgeCheck size={15}/>{ar ? "راجع الشركات" : "Review companies"}</Link></div>
      </aside>
    </div>

    <section className={styles.panel}>
      <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "شبكة الشركاء" : "Partner network"}</span><h2>{ar ? "أحدث شركات التأجير" : "Newest rental companies"}</h2><p>{ar ? "افتح أي شركة لرؤية فريقها وفروعها وأسعارها وحجوزاتها." : "Open a company to inspect its team, locations, fleet and reservations."}</p></div><Link href="/admin/cars/companies">{ar ? "إدارة الشركات" : "Manage companies"}</Link></div>
      {overview.recentCompanies.length ? <div className={styles.companyList}>{overview.recentCompanies.map((company) => <article className={styles.companyCard} key={company.id}>
        <div className={styles.identity}><Status value={company.status}/><h2>{company.name}</h2><p>{company.slug}</p><small><MapPin size={11}/> {company.city}, {company.countryCode}</small></div>
        <div className={styles.stats}><span><strong>{company.counts.vehicles}</strong>{ar ? "سيارات" : "Vehicles"}</span><span><strong>{company.counts.reservations}</strong>{ar ? "حجوزات" : "Bookings"}</span><span><strong>{company.counts.locations}</strong>{ar ? "فروع" : "Locations"}</span><span><strong>{company.counts.memberships}</strong>{ar ? "فريق" : "Team"}</span></div>
        <div className={styles.meta}>{company.verified ? <span className={styles.verified}><BadgeCheck size={14}/>{ar ? "موثقة" : "Verified"}</span> : <span>{ar ? "غير موثقة" : "Not verified"}</span>}<small>{formatDate(company.createdAt, locale)}</small></div>
        <Link className="primaryButton" href={`/admin/cars/companies/${company.id}`}>{ar ? "افتح الشركة" : "Open company"}</Link>
      </article>)}</div> : <div className={styles.empty}>{ar ? "لا توجد شركات سيارات مسجلة." : "No rental companies registered."}</div>}
    </section>
  </AdminShell>;
}

function Metric({icon, label, value, sub}: {icon: React.ReactNode; label: string; value: number; sub: string}) {
  return <article className={styles.metric}><span>{icon}{label}</span><strong>{value}</strong><small>{sub}</small></article>;
}

function Status({value}: {value: string}) {
  return <span className={`${styles.status} ${styles[value.toLowerCase()] ?? ""}`}>{value.replaceAll("_", " ")}</span>;
}

function formatDate(value: string, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", year: "numeric"}).format(new Date(value));
}

function formatDateTime(value: string, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"}).format(new Date(value));
}

function formatMoney(value: number, currency: string, locale: "en" | "ar") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {style: "currency", currency, maximumFractionDigits: 2}).format(value);
}
