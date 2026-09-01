import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft, BadgeCheck, Building2, CalendarRange, CarFront, MapPin, ShieldCheck, Users} from "lucide-react";
import {getAdminCarCompany, getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {updateCarCompanyDecision} from "../../actions";
import styles from "../../cars-admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminCarCompanyPage({params}: {params: Promise<{companyId: string}>}) {
  const {companyId} = await params;
  const principal = await currentAdminPrincipal();
  if (!principal) redirect(`/admin/login?next=${encodeURIComponent(`/admin/cars/companies/${companyId}`)}`);
  const locale = await requestLocale();
  const ar = locale === "ar";
  const [company, counts] = await Promise.all([
    getAdminCarCompany(principal.user.id, companyId),
    getAdminNavigationCounts(principal.user.id),
  ]);

  return <AdminShell locale={locale} principal={principal} active="cars" counts={counts}>
    <div className="adminBreadcrumb"><Link href="/admin/cars/companies"><ArrowLeft size={15}/>{ar ? "شركات السيارات" : "Rental companies"}</Link><span>/</span><strong>{company.name}</strong></div>

    <div className={styles.detailHeader}><div><span className="eyebrow">HandMeKey Cars · Company Operations</span><h1>{company.name}</h1><p>{company.slug} · {company.city}, {company.countryCode}</p></div><div className={styles.governance}><Status value={company.status}/>{company.verified ? <span className={styles.verified}><BadgeCheck size={15}/>{ar ? "شركة موثقة" : "Verified company"}</span> : <span className={styles.status}>{ar ? "غير موثقة" : "Not verified"}</span>}</div></div>

    <section className={styles.kpiGrid}>
      <Kpi label={ar ? "السيارات" : "Vehicles"} value={company.counts.vehicles}/>
      <Kpi label={ar ? "كل الحجوزات" : "All reservations"} value={company.counts.reservations}/>
      <Kpi label={ar ? "حجوزات قادمة" : "Upcoming"} value={company.upcomingReservations}/>
      <Kpi label={ar ? "القيمة المحجوزة" : "Booked value"} value={formatMoney(company.bookedValue, company.currency, locale)}/>
      <Kpi label={ar ? "أعضاء الفريق" : "Team members"} value={company.counts.memberships}/>
    </section>

    <div className={styles.detailGrid}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "بيانات الشركة" : "Company profile"}</span><h2>{ar ? "هوية الشريك" : "Partner identity"}</h2><p>{ar ? "البيانات التي تعتمد عليها المنصة للتشغيل والدعم." : "The core operating and support details for this partner."}</p></div></div>
        <div className={styles.infoList}>
          <Info label={ar ? "المدينة" : "City"} value={`${company.city}, ${company.countryCode}`}/>
          <Info label={ar ? "العنوان" : "Address"} value={company.address}/>
          <Info label={ar ? "بريد الدعم" : "Support email"} value={company.supportEmail || "—"}/>
          <Info label={ar ? "هاتف الدعم" : "Support phone"} value={company.supportPhone || "—"}/>
          <Info label={ar ? "العملة" : "Currency"} value={company.currency}/>
          <Info label={ar ? "المنطقة الزمنية" : "Timezone"} value={company.timezone}/>
          <Info label={ar ? "عمولة HandMeKey" : "HandMeKey commission"} value={`${(company.commissionRate * 100).toFixed(1)}%`}/>
          <Info label={ar ? "تاريخ التسجيل" : "Joined"} value={formatDate(company.createdAt, locale)}/>
        </div>
      </section>

      <aside className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "تحكم المنصة" : "Platform governance"}</span><h2>{ar ? "الحالة والتوثيق" : "Status & verification"}</h2><p>{ar ? "التفعيل يتطلب توثيق الشركة. هذا التحكم لا يظهر للشريك." : "Activation requires verification. This control is platform-only."}</p></div></div>
        <form action={updateCarCompanyDecision} className={styles.actionForm}>
          <input type="hidden" name="companyId" value={company.id}/>
          <label>{ar ? "حالة الشركة" : "Company status"}<select name="status" defaultValue={company.status}><option value="DRAFT">DRAFT</option><option value="PENDING_REVIEW">PENDING REVIEW</option><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select></label>
          <label className={styles.check}><input type="checkbox" name="verified" defaultChecked={company.verified}/><span>{ar ? "تم توثيق الشركة من HandMeKey" : "Company verified by HandMeKey"}</span></label>
          <button type="submit"><ShieldCheck size={15}/> {ar ? "حفظ قرار المنصة" : "Save platform decision"}</button>
        </form>
      </aside>
    </div>

    <div className={styles.sectionStack}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "الحجوزات" : "Reservations"}</span><h2>{ar ? "أحدث حجوزات الشركة" : "Latest company reservations"}</h2><p>{ar ? "آخر 25 حجزًا لهذه الشركة." : "The latest 25 reservations for this rental partner."}</p></div><Link href={`/admin/cars/reservations?companyId=${company.id}`}>{ar ? "عرض كل حجوزات الشركة" : "View all company bookings"}</Link></div>
        {company.reservations.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar ? "الحجز" : "Booking"}</th><th>{ar ? "الضيف" : "Guest"}</th><th>{ar ? "السيارة" : "Vehicle"}</th><th>{ar ? "الاستلام" : "Pickup"}</th><th>{ar ? "الحالة" : "Status"}</th><th>{ar ? "الإجمالي" : "Total"}</th></tr></thead><tbody>{company.reservations.map((reservation) => <tr key={reservation.id}><td><Link href={`/admin/cars/reservations/${reservation.id}`}>{reservation.reference}</Link><small>{formatDate(reservation.createdAt, locale)}</small></td><td><strong>{reservation.guestName}</strong><small>{reservation.guestEmail}</small></td><td><strong>{reservation.vehicle}</strong><small>{reservation.vehicleCategory}</small></td><td><strong>{formatDateTime(reservation.pickupAt, locale)}</strong><small>{reservation.pickupLocation}</small></td><td><Status value={reservation.status}/></td><td className={styles.money}><strong>{formatMoney(reservation.total, reservation.currency, locale)}</strong><small>{ar ? "عمولة" : "Commission"}: {formatMoney(reservation.platformCommission, reservation.currency, locale)}</small></td></tr>)}</tbody></table></div> : <div className={styles.empty}>{ar ? "لا توجد حجوزات لهذه الشركة." : "This company has no reservations yet."}</div>}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "الأسطول" : "Fleet"}</span><h2>{ar ? "سيارات الشركة" : "Company fleet"}</h2><p>{ar ? "أول 40 سيارة مرتبة حسب الحالة." : "Up to 40 vehicles ordered by status."}</p></div><CarFront size={20}/></div>
        {company.vehicles.length ? <div className={styles.miniGrid}>{company.vehicles.map((vehicle) => <article className={styles.miniCard} key={vehicle.id}><Status value={vehicle.status}/><strong>{vehicle.make} {vehicle.model} · {vehicle.year}</strong><span>{vehicle.category} · {vehicle.transmission} · {vehicle.fuel}</span><small>{formatMoney(vehicle.dailyPrice, company.currency, locale)} / {ar ? "يوم" : "day"} · {ar ? "وديعة" : "deposit"} {formatMoney(vehicle.deposit, company.currency, locale)} · {vehicle.homeLocation?.name || (ar ? "بدون فرع" : "No home location")}</small></article>)}</div> : <div className={styles.empty}>{ar ? "لم تضف الشركة سيارات بعد." : "No vehicles added yet."}</div>}
      </section>

      <div className={styles.split}>
        <section className={styles.panel}><div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "الفروع" : "Locations"}</span><h2>{ar ? "مواقع الاستلام والتسليم" : "Pickup & return locations"}</h2></div><MapPin size={20}/></div>{company.locations.length ? <div className={styles.companyList}>{company.locations.map((location) => <article className={styles.miniCard} key={location.id}><strong>{location.name}{location.airportCode ? ` · ${location.airportCode}` : ""}</strong><span>{location.city}</span><small>{location.address} · {location.active ? (ar ? "فعال" : "Active") : (ar ? "غير فعال" : "Inactive")}</small></article>)}</div> : <div className={styles.empty}>{ar ? "لا توجد فروع." : "No locations."}</div>}</section>
        <section className={styles.panel}><div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "الفريق" : "Team"}</span><h2>{ar ? "حسابات الشركة" : "Company accounts"}</h2></div><Users size={20}/></div>{company.members.length ? <div className={styles.companyList}>{company.members.map((member) => <article className={styles.miniCard} key={member.id}><strong>{member.user?.displayName || member.userId}</strong><span>{member.user?.email || member.userId}</span><small>{member.role} · {member.status} · {formatDate(member.createdAt, locale)}</small></article>)}</div> : <div className={styles.empty}>{ar ? "لا توجد حسابات مرتبطة." : "No linked accounts."}</div>}</section>
      </div>
    </div>
  </AdminShell>;
}

function Kpi({label, value}: {label: string; value: string | number}) {return <article className={styles.kpi}><span>{label}</span><strong>{value}</strong></article>}
function Info({label, value}: {label: string; value: string}) {return <div className={styles.infoItem}><span>{label}</span><strong>{value}</strong></div>}
function Status({value}: {value: string}) {return <span className={`${styles.status} ${styles[value.toLowerCase()] ?? ""}`}>{value.replaceAll("_", " ")}</span>}
function formatDate(value: string, locale: "en" | "ar") {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", year: "numeric"}).format(new Date(value))}
function formatDateTime(value: string, locale: "en" | "ar") {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"}).format(new Date(value))}
function formatMoney(value: number, currency: string, locale: "en" | "ar") {return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {style: "currency", currency, maximumFractionDigits: 2}).format(value)}
