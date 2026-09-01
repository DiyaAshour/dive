import Link from "next/link";
import {redirect} from "next/navigation";
import {Building2, CalendarRange, CarFront, Search} from "lucide-react";
import {getAdminNavigationCounts, listAdminCarCompanies, listAdminCarReservations} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import styles from "../cars-admin.module.css";

export const dynamic = "force-dynamic";
export const metadata = {title: "Car Reservations · HandMeKey Admin"};

export default async function AdminCarReservationsPage({searchParams}: {searchParams: Promise<{q?: string; status?: string; companyId?: string}>}) {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fcars%2Freservations");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const query = await searchParams;
  const filters: {query?: string; status?: string; companyId?: string} = {};
  if (query.q) filters.query = query.q;
  if (query.status) filters.status = query.status;
  if (query.companyId) filters.companyId = query.companyId;
  const [reservations, companies, counts] = await Promise.all([
    listAdminCarReservations(principal.user.id, filters),
    listAdminCarCompanies(principal.user.id),
    getAdminNavigationCounts(principal.user.id),
  ]);
  const confirmed = reservations.filter((item) => item.status === "CONFIRMED" || item.status === "MODIFIED").length;
  const cancelled = reservations.filter((item) => item.status === "CANCELLED").length;
  const noShow = reservations.filter((item) => item.status === "NO_SHOW").length;

  return <AdminShell locale={locale} principal={principal} active="cars" counts={counts}>
    <header className="adminTopbar"><div><span className="eyebrow">HandMeKey Cars · Reservation Operations</span><h1>{ar ? "كل حجوزات السيارات" : "All car reservations"}</h1><p>{ar ? "سجل موحد لكل الحجوزات من جميع شركات التأجير، مع الوصول المباشر للشركة والحجز." : "One operational ledger for reservations across every rental company, with direct access to each booking and partner."}</p></div><div className="adminSessionBadge"><CalendarRange size={18}/><span><strong>{reservations.length} {ar ? "حجز" : "reservations"}</strong><small>{ar ? "حسب الفلاتر الحالية" : "current filters"}</small></span></div></header>

    <nav className={styles.tabs}><Link href="/admin/cars"><CarFront size={15}/>{ar ? "نظرة عامة" : "Overview"}</Link><Link href="/admin/cars/companies"><Building2 size={15}/>{ar ? "الشركات" : "Companies"}</Link><Link className={styles.active} href="/admin/cars/reservations"><CalendarRange size={15}/>{ar ? "كل الحجوزات" : "All reservations"}</Link></nav>

    <section className={styles.reservationSummary}>
      <Summary label={ar ? "النتائج" : "Results"} value={reservations.length}/>
      <Summary label={ar ? "مؤكدة / معدلة" : "Confirmed / modified"} value={confirmed}/>
      <Summary label={ar ? "ملغاة" : "Cancelled"} value={cancelled}/>
      <Summary label={ar ? "عدم حضور" : "No-show"} value={noShow}/>
    </section>

    <section className="adminPanel adminSection">
      <form className="adminFilterBar" method="get">
        <label><Search size={16}/><input name="q" defaultValue={query.q ?? ""} placeholder={ar ? "رقم الحجز، الضيف، البريد، الشركة أو السيارة..." : "Booking, guest, email, company or vehicle..."}/></label>
        <select name="status" defaultValue={query.status ?? ""} aria-label={ar ? "الحالة" : "Status"}><option value="">{ar ? "كل الحالات" : "All statuses"}</option><option value="HOLD">HOLD</option><option value="CONFIRMED">CONFIRMED</option><option value="MODIFIED">MODIFIED</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option><option value="NO_SHOW">NO SHOW</option><option value="EXPIRED">EXPIRED</option></select>
        <select name="companyId" defaultValue={query.companyId ?? ""} aria-label={ar ? "الشركة" : "Company"}><option value="">{ar ? "كل الشركات" : "All companies"}</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
        <button className="primaryButton" type="submit">{ar ? "تطبيق" : "Apply"}</button>
        {(query.q || query.status || query.companyId) && <Link className="secondaryButton" href="/admin/cars/reservations">{ar ? "مسح" : "Clear"}</Link>}
      </form>

      {reservations.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar ? "الحجز" : "Booking"}</th><th>{ar ? "الشركة" : "Company"}</th><th>{ar ? "الضيف" : "Guest"}</th><th>{ar ? "السيارة" : "Vehicle"}</th><th>{ar ? "الاستلام / الإرجاع" : "Pickup / return"}</th><th>{ar ? "الحالة" : "Status"}</th><th>{ar ? "الدفع" : "Payment"}</th><th>{ar ? "الإجمالي / العمولة" : "Total / commission"}</th></tr></thead><tbody>
        {reservations.map((reservation) => <tr key={reservation.id}>
          <td><Link href={`/admin/cars/reservations/${reservation.id}`}>{reservation.reference}</Link><small>{formatDate(reservation.createdAt, locale)}</small></td>
          <td><Link href={`/admin/cars/companies/${reservation.companyId}`}>{reservation.companyName}</Link><small>{reservation.companyVerified ? (ar ? "موثقة" : "Verified") : (ar ? "غير موثقة" : "Not verified")}</small></td>
          <td><strong>{reservation.guestName}</strong><small>{reservation.guestEmail}</small></td>
          <td><strong>{reservation.vehicle}</strong><small>{reservation.vehicleYear} · {reservation.vehicleCategory}</small></td>
          <td><strong>{formatDateTime(reservation.pickupAt, locale)}</strong><small>{reservation.pickupLocation} → {formatDateTime(reservation.returnAt, locale)} · {reservation.returnLocation}</small></td>
          <td><Status value={reservation.status}/></td>
          <td><strong>{reservation.paymentMode.replaceAll("_", " ")}</strong><small>{ar ? "طريقة الدفع فقط" : "Payment instruction"}</small></td>
          <td className={styles.money}><strong>{formatMoney(reservation.total, reservation.currency, locale)}</strong><small>{ar ? "HandMeKey" : "HandMeKey"}: {formatMoney(reservation.platformCommission, reservation.currency, locale)}</small></td>
        </tr>)}
      </tbody></table></div> : <div className={styles.empty}>{ar ? "لا توجد حجوزات تطابق هذه الفلاتر." : "No reservations match these filters."}</div>}
    </section>
  </AdminShell>;
}

function Summary({label, value}: {label: string; value: string | number}) {return <article className={styles.summaryCard}><span>{label}</span><strong>{value}</strong></article>}
function Status({value}: {value: string}) {return <span className={`${styles.status} ${styles[value.toLowerCase()] ?? ""}`}>{value.replaceAll("_", " ")}</span>}
function formatDate(value: string, locale: "en" | "ar") {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", year: "numeric"}).format(new Date(value))}
function formatDateTime(value: string, locale: "en" | "ar") {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"}).format(new Date(value))}
function formatMoney(value: number, currency: string, locale: "en" | "ar") {return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {style: "currency", currency, maximumFractionDigits: 2}).format(value)}
