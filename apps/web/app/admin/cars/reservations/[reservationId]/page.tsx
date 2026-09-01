import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft, Building2, CalendarRange, CarFront, CircleDollarSign, CreditCard, Landmark, MapPin, UserRound, WalletCards} from "lucide-react";
import {getAdminCarReservation, getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import styles from "../../cars-admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminCarReservationPage({params}: {params: Promise<{reservationId: string}>}) {
  const {reservationId} = await params;
  const principal = await currentAdminPrincipal();
  if (!principal) redirect(`/admin/login?next=${encodeURIComponent(`/admin/cars/reservations/${reservationId}`)}`);
  const locale = await requestLocale();
  const ar = locale === "ar";
  const [reservation, counts] = await Promise.all([
    getAdminCarReservation(principal.user.id, reservationId),
    getAdminNavigationCounts(principal.user.id),
  ]);
  const companyOwesPlatform = reservation.commissionReceivable > 0;
  const platformOwesCompany = reservation.companyPayable > 0;

  return <AdminShell locale={locale} principal={principal} active="cars" counts={counts}>
    <div className="adminBreadcrumb"><Link href="/admin/cars/reservations"><ArrowLeft size={15}/>{ar ? "كل حجوزات السيارات" : "All car reservations"}</Link><span>/</span><strong>{reservation.reference}</strong></div>

    <div className={styles.detailHeader}><div><span className="eyebrow">HandMeKey Cars · Booking Detail</span><h1>{reservation.reference}</h1><p>{ar ? "عرض تشغيلي ومالي كامل للحجز من منظور المنصة." : "Complete operational and financial booking view from the platform side."}</p></div><div className={styles.governance}><Status value={reservation.status}/><span className={styles.status}>{reservation.paymentMode.replaceAll("_", " ")}</span><span className={styles.status}>{reservation.collectedBy === "HANDMEKEY" ? "HANDMEKEY COLLECTED" : "COMPANY COLLECTED"}</span></div></div>

    <section className={styles.reservationSummary}>
      <Summary label={ar ? "الإجمالي" : "Booking total"} value={formatMoney(reservation.total, reservation.currency, locale)} small={`${reservation.rentalDays} ${ar ? "يوم" : "days"}`}/>
      <Summary label={ar ? "عمولة HandMeKey" : "HandMeKey commission"} value={formatMoney(reservation.platformCommission, reservation.currency, locale)} small={`${(reservation.commissionRate * 100).toFixed(2)}% · ${ar ? "مثبتة وقت الحجز" : "snapshotted at booking"}`}/>
      <Summary label={ar ? "مستحق للشركة" : "Company payable"} value={formatMoney(reservation.companyPayable, reservation.currency, locale)} small={platformOwesCompany ? (ar ? "HandMeKey يدفع للشركة" : "HandMeKey owes company") : (ar ? "لا يوجد مستحق حالي" : "No current payable")}/>
      <Summary label={ar ? "مستحق لـ HandMeKey" : "Commission receivable"} value={formatMoney(reservation.commissionReceivable, reservation.currency, locale)} small={companyOwesPlatform ? (ar ? "الشركة تدفع العمولة" : "Company owes commission") : (ar ? "لا يوجد مستحق حالي" : "No current receivable")}/>
    </section>

    <section className={styles.panel}>
      <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "المالية" : "Finance"}</span><h2>{ar ? "الوضع المالي لهذا الحجز" : "Financial position for this booking"}</h2><p>{financialExplanation(reservation, ar)}</p></div><CircleDollarSign size={20}/></div>
      <div className={styles.infoList}>
        <Info icon={reservation.collectedBy === "HANDMEKEY" ? <WalletCards size={14}/> : <Landmark size={14}/>} label={ar ? "الجهة التي استلمت المبلغ" : "Payment collector"} value={reservation.collectedBy === "HANDMEKEY" ? "HandMeKey" : (ar ? "شركة التأجير" : "Rental company")}/>
        <Info label={ar ? "طريقة الدفع" : "Payment mode"} value={reservation.paymentMode.replaceAll("_", " ")}/>
        <Info label={ar ? "الأهلية المالية" : "Finance eligibility"} value={reservation.financeEligible ? (ar ? "مستحق ماليًا" : "Financially eligible") : (ar ? "بانتظار اكتمال شرط التحصيل" : "Pending collection condition")}/>
        <Info label={ar ? "عمولة HandMeKey" : "HandMeKey commission"} value={formatMoney(reservation.platformCommission, reservation.currency, locale)}/>
        <Info label={ar ? "صافي حصة الشركة" : "Partner net share"} value={formatMoney(reservation.estimatedPartnerNet, reservation.currency, locale)}/>
        <Info label={ar ? "مستحق للشركة" : "Company payable"} value={formatMoney(reservation.companyPayable, reservation.currency, locale)}/>
        <Info label={ar ? "عمولة مستحقة لنا" : "Commission receivable"} value={formatMoney(reservation.commissionReceivable, reservation.currency, locale)}/>
      </div>
      <div className={styles.heroActions} style={{marginTop: 14}}><Link className="primaryButton" href={`/admin/cars/finance?companyId=${encodeURIComponent(reservation.companyId)}`}><CircleDollarSign size={15}/>{ar ? "فتح مالية الشركة" : "Open company finance"}</Link></div>
    </section>

    <div className={styles.detailGrid}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "الضيف والرحلة" : "Guest & rental"}</span><h2>{ar ? "تفاصيل الحجز" : "Reservation details"}</h2></div><CalendarRange size={20}/></div>
        <div className={styles.infoList}>
          <Info icon={<UserRound size={14}/>} label={ar ? "اسم الضيف" : "Guest"} value={reservation.guestName}/>
          <Info label={ar ? "البريد" : "Email"} value={reservation.guestEmail}/>
          <Info label={ar ? "الهاتف" : "Phone"} value={reservation.guestPhone || "—"}/>
          <Info label={ar ? "عمر السائق" : "Driver age"} value={reservation.driverAgeRange}/>
          <Info icon={<CarFront size={14}/>} label={ar ? "السيارة" : "Vehicle"} value={`${reservation.vehicle} · ${reservation.vehicleYear}`}/>
          <Info label={ar ? "الفئة" : "Category"} value={reservation.vehicleCategory}/>
          <Info icon={<MapPin size={14}/>} label={ar ? "الاستلام" : "Pickup"} value={`${formatDateTime(reservation.pickupAt, locale)} · ${reservation.pickupLocation}`}/>
          <Info icon={<MapPin size={14}/>} label={ar ? "الإرجاع" : "Return"} value={`${formatDateTime(reservation.returnAt, locale)} · ${reservation.returnLocation}`}/>
        </div>
      </section>

      <aside className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "المورد" : "Supplier"}</span><h2>{ar ? "شركة التأجير" : "Rental company"}</h2></div><Building2 size={20}/></div>
        <div className={styles.infoList}>
          <Info label={ar ? "الشركة" : "Company"} value={reservation.companyName}/>
          <Info label={ar ? "الحالة" : "Status"} value={reservation.companyStatus.replaceAll("_", " ")}/>
          <Info label={ar ? "التوثيق" : "Verification"} value={reservation.companyVerified ? (ar ? "موثقة" : "Verified") : (ar ? "غير موثقة" : "Not verified")}/>
          <Info label={ar ? "رقم الشركة" : "Company ID"} value={reservation.companyId}/>
        </div>
        <div className={styles.heroActions} style={{marginTop: 14}}><Link className="primaryButton" href={`/admin/cars/companies/${reservation.companyId}`}>{ar ? "افتح الشركة" : "Open company"}</Link></div>
      </aside>
    </div>

    <div className={styles.split}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "التسعير" : "Pricing"}</span><h2>{ar ? "تفصيل القيمة" : "Booking value breakdown"}</h2></div><CreditCard size={20}/></div>
        <div className={styles.infoList}>
          <Info label={ar ? "سعر اليوم" : "Daily rate"} value={formatMoney(reservation.dailyRate, reservation.currency, locale)}/>
          <Info label={ar ? "عدد الأيام" : "Rental days"} value={String(reservation.rentalDays)}/>
          <Info label={ar ? "المجموع الفرعي" : "Subtotal"} value={formatMoney(reservation.subtotal, reservation.currency, locale)}/>
          <Info label={ar ? "الرسوم" : "Fees"} value={formatMoney(reservation.fees, reservation.currency, locale)}/>
          <Info label={ar ? "الإجمالي" : "Total"} value={formatMoney(reservation.total, reservation.currency, locale)}/>
          <Info label={ar ? "عمولة المنصة" : "Platform commission"} value={formatMoney(reservation.platformCommission, reservation.currency, locale)}/>
          <Info label={ar ? "صافي الشريك" : "Partner net"} value={formatMoney(reservation.estimatedPartnerNet, reservation.currency, locale)}/>
        </div>
        <p className={styles.muted} style={{fontSize: 10, marginTop: 12}}>{ar ? "طريقة الدفع تحدد متى يدفع العميل، أما Payment Collector فيحدد أين وصلت الأموال. لذلك يمكن أن يكون الحجز PAY_NOW والمبلغ يذهب مباشرة إلى شركة التأجير عبر بوابة دفع الشركة، أو يذهب إلى HandMeKey." : "Payment mode defines when the customer pays; Payment Collector defines where the funds went. A PAY_NOW booking can therefore be collected directly by the rental company's gateway or by HandMeKey."}</p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "السجل" : "Timeline"}</span><h2>{ar ? "دورة حياة الحجز" : "Booking lifecycle"}</h2></div></div>
        <div className={styles.timeline}>
          <Timeline label={ar ? "تم إنشاء الحجز" : "Reservation created"} value={reservation.createdAt} locale={locale}/>
          {reservation.confirmedAt && <Timeline label={ar ? "تم التأكيد" : "Confirmed"} value={reservation.confirmedAt} locale={locale}/>}
          {reservation.cancelledAt && <Timeline label={ar ? "تم الإلغاء" : "Cancelled"} value={reservation.cancelledAt} locale={locale}/>}
          <Timeline label={ar ? "آخر تحديث" : "Last updated"} value={reservation.updatedAt} locale={locale}/>
        </div>
        {reservation.cancellationNote && <div className={styles.infoItem} style={{marginTop: 12}}><span>{ar ? "ملاحظة الإلغاء" : "Cancellation note"}</span><strong>{reservation.cancellationNote}</strong></div>}
      </section>
    </div>
  </AdminShell>;
}

function Summary({label, value, small}: {label: string; value: string; small: string}) {return <article className={styles.summaryCard}><span>{label}</span><strong>{value}</strong><small>{small}</small></article>}
function Info({icon, label, value}: {icon?: React.ReactNode; label: string; value: string}) {return <div className={styles.infoItem}><span>{icon}{label}</span><strong>{value}</strong></div>}
function Status({value}: {value: string}) {return <span className={`${styles.status} ${styles[value.toLowerCase()] ?? ""}`}>{value.replaceAll("_", " ")}</span>}
function Timeline({label, value, locale}: {label: string; value: string; locale: "en" | "ar"}) {return <div><i/><strong>{label}</strong><time>{formatDateTime(value, locale)}</time></div>}
function formatDateTime(value: string, locale: "en" | "ar") {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}).format(new Date(value))}
function formatMoney(value: number, currency: string, locale: "en" | "ar") {return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {style: "currency", currency, maximumFractionDigits: 2}).format(value)}
function financialExplanation(reservation: {collectedBy: string; companyName: string; financeEligible: boolean}, ar: boolean) {
  if (!reservation.financeEligible) return ar ? "لا يوجد رصيد مستحق لهذا الحجز حتى الآن؛ سيصبح مستحقًا عندما يتحقق شرط التحصيل." : "No balance is due for this booking yet; it becomes due when the collection condition is met.";
  if (reservation.collectedBy === "HANDMEKEY") return ar ? `HandMeKey استلم المبلغ؛ تُحجز العمولة ويصبح صافي حصة ${reservation.companyName} مستحقًا لها.` : `HandMeKey collected the payment; commission is withheld and the net share is payable to ${reservation.companyName}.`;
  return ar ? `${reservation.companyName} استلمت المبلغ؛ عمولة HandMeKey أصبحت مستحقة على الشركة.` : `${reservation.companyName} collected the payment; HandMeKey commission is now receivable from the company.`;
}
