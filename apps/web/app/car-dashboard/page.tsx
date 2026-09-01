import Link from "next/link";
import {redirect} from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Clock3,
  Gauge,
  MapPin,
  Plus,
  ShieldCheck,
  WalletCards,
  Wrench,
} from "lucide-react";
import {getCarDashboardOverview} from "@platform/server";
import {CarPartnerShell} from "@/components/car-partner-shell";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {currentUser} from "@/lib/server-session";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata = {title: "Cars Partner Dashboard · HandMeKey"};

export default async function CarDashboardPage() {
  const [user, market] = await Promise.all([currentUser(), requestGuestMarket()]);
  if (!user) redirect("/login?next=/car-dashboard");

  const dashboard = await getCarDashboardOverview(user.id).catch(() => null);
  if (!dashboard) redirect("/cars/partner");

  const ar = market.baseLocale === "ar";
  const m = dashboard.metrics;
  const currency = dashboard.company.currency;
  const companyReady = dashboard.company.verified && dashboard.company.status === "ACTIVE";
  const locale = ar ? "ar-JO" : "en-GB";

  return <CarPartnerShell
    companyName={dashboard.company.name}
    status={dashboard.company.status}
    verified={dashboard.company.verified}
    locale={market.baseLocale}
  >
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Gauge size={14}/>{ar ? "نظرة عامة" : "Overview"}</span>
          <h1>{ar ? "إدارة اليوم من مكان واحد" : "Run today from one place"}</h1>
          <p>{ar
            ? "أهم أرقام التشغيل، الحجوزات القريبة، جاهزية الأسطول وما يحتاج انتباهك الآن — بدون ما تضيع بين الصفحات."
            : "See the operating numbers that matter, upcoming pickups, fleet readiness and what needs attention without jumping between pages."}</p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.secondaryAction} href="/car-dashboard/reservations"><CalendarClock size={16}/>{ar ? "الحجوزات" : "Reservations"}</Link>
          <Link className={styles.primaryAction} href="/car-dashboard/fleet"><Plus size={16}/>{ar ? "أضف سيارة" : "Add vehicle"}</Link>
        </div>
      </header>

      <section className={styles.statusBar}>
        <div className={styles.statusMain}>
          <span className={`${styles.statusIcon} ${companyReady ? "" : styles.warn}`}>
            {companyReady ? <CheckCircle2 size={19}/> : <AlertTriangle size={19}/>}
          </span>
          <div>
            <strong>{companyReady ? (ar ? "الشركة جاهزة لاستقبال الحجوزات" : "Company is ready for bookings") : (ar ? "أكمل جاهزية الشركة" : "Company setup needs attention")}</strong>
            <p>{companyReady
              ? (ar ? `${m.availableNow} سيارة متاحة الآن من أصل ${m.activeVehicles} سيارة فعالة.` : `${m.availableNow} of ${m.activeVehicles} active vehicles are available right now.`)
              : (ar ? "راجع التوثيق، الأسطول والفروع حتى تكون كل عملياتك جاهزة للعملاء." : "Review verification, fleet and locations so the operation is fully bookable.")}</p>
          </div>
        </div>
        <div className={styles.statusMeta}>
          <span className={`${styles.pill} ${dashboard.company.verified ? styles.good : styles.warn}`}><ShieldCheck size={13}/>{dashboard.company.verified ? (ar ? "موثقة" : "Verified") : (ar ? "بانتظار التوثيق" : "Verification pending")}</span>
          <span className={styles.pill}>{ar ? `عمولة ${percent(dashboard.company.commissionRate)}` : `${percent(dashboard.company.commissionRate)} commission`}</span>
          <span className={styles.pill}>{dashboard.company.city}</span>
        </div>
      </section>

      <section className={styles.primaryMetrics}>
        <Metric
          icon={<CarFront size={16}/>}
          label={ar ? "متاحة الآن" : "Available now"}
          value={String(m.availableNow)}
          sub={ar ? `${m.activeVehicles} سيارة فعالة · ${m.utilizationRate}% مستخدم` : `${m.activeVehicles} active · ${m.utilizationRate}% in use`}
          accent
        />
        <Metric
          icon={<Gauge size={16}/>}
          label={ar ? "مؤجرة الآن" : "On rent now"}
          value={String(m.activeRentals)}
          sub={ar ? "حجوزات ضمن فترة الاستلام والتسليم الحالية" : "Active rentals currently between pickup and return"}
        />
        <Metric
          icon={<CalendarClock size={16}/>}
          label={ar ? "حجوزات قادمة" : "Upcoming bookings"}
          value={String(m.upcomingReservations)}
          sub={m.pendingHolds > 0 ? (ar ? `${m.pendingHolds} بانتظار التأكيد` : `${m.pendingHolds} waiting for confirmation`) : (ar ? "لا حجوزات معلقة" : "No pending holds")}
        />
        <Metric
          icon={<WalletCards size={16}/>}
          label={ar ? "قيمة الحجوزات · 30 يوم" : "Booked value · 30 days"}
          value={money(m.bookedValue30d, currency, locale)}
          sub={ar ? "حجوزات مؤكدة ومعدلة ومكتملة" : "Confirmed, modified and completed bookings"}
          moneyCard
        />
      </section>

      <section className={styles.miniGrid}>
        <MiniMetric icon={<Clock3 size={14}/>} label={ar ? "استلام خلال 24 ساعة" : "Pickups in 24h"} value={m.next24hPickups}/>
        <MiniMetric icon={<CalendarClock size={14}/>} label={ar ? "تسليم خلال 24 ساعة" : "Returns in 24h"} value={m.next24hReturns}/>
        <MiniMetric icon={<Wrench size={14}/>} label={ar ? "في الصيانة" : "Maintenance"} value={m.maintenanceVehicles}/>
        <MiniMetric icon={<MapPin size={14}/>} label={ar ? "فروع فعالة" : "Active locations"} value={m.locationCount}/>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><h2>{ar ? "عمليات الاستلام القادمة" : "Next pickups"}</h2><p>{ar ? "أقرب الحجوزات المؤكدة التي يحتاج فريقك تجهيزها." : "The next confirmed reservations your team should prepare."}</p></div>
            <Link href="/car-dashboard/reservations">{ar ? "عرض الكل" : "View all"}</Link>
          </div>
          {dashboard.nextPickups.length ? <div className={styles.pickupList}>
            {dashboard.nextPickups.map((pickup) => {
              const when = new Date(pickup.pickupAt);
              return <article className={styles.pickupRow} key={pickup.id}>
                <div className={styles.pickupTime}>
                  <strong>{when.toLocaleTimeString(locale, {hour: "2-digit", minute: "2-digit"})}</strong>
                  <span>{when.toLocaleDateString(locale, {day: "2-digit", month: "short"})}</span>
                </div>
                <div className={styles.pickupInfo}>
                  <strong>{pickup.vehicle}</strong>
                  <span>{pickup.guestName} · {pickup.pickupLocation}</span>
                </div>
                <span className={styles.reference}>{pickup.reference}</span>
              </article>;
            })}
          </div> : <EmptyState ar={ar}/>} 
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHead}>
            <div><h2>{ar ? "يحتاج انتباهك" : "Needs attention"}</h2><p>{ar ? "الأشياء التي تستحق إجراء سريع الآن." : "Items worth acting on now."}</p></div>
          </div>
          <div className={styles.attention}>
            {!dashboard.company.verified && <AttentionItem
              icon={<ShieldCheck size={15}/>}
              tone="warn"
              title={ar ? "توثيق الشركة غير مكتمل" : "Company verification is incomplete"}
              body={ar ? "أكمل بيانات الشركة حتى تظهر السيارات للعامة." : "Complete company verification so vehicles can be publicly bookable."}
              href="/car-dashboard/settings"
              linkLabel={ar ? "فتح الإعدادات" : "Open settings"}
            />}
            {m.pendingHolds > 0 && <AttentionItem
              icon={<CalendarClock size={15}/>}
              tone="warn"
              title={ar ? `${m.pendingHolds} حجز بانتظار التأكيد` : `${m.pendingHolds} booking(s) waiting for confirmation`}
              body={ar ? "راجع الحجوزات المعلقة قبل اقتراب وقت الاستلام." : "Review pending holds before their pickup time approaches."}
              href="/car-dashboard/reservations"
              linkLabel={ar ? "مراجعة الحجوزات" : "Review reservations"}
            />}
            {m.maintenanceVehicles > 0 && <AttentionItem
              icon={<Wrench size={15}/>}
              tone="warn"
              title={ar ? `${m.maintenanceVehicles} سيارة في الصيانة` : `${m.maintenanceVehicles} vehicle(s) in maintenance`}
              body={ar ? "راجع حالة الأسطول وأعد السيارة للبيع عندما تصبح جاهزة." : "Review fleet status and return vehicles to sale when ready."}
              href="/car-dashboard/fleet"
              linkLabel={ar ? "فتح الأسطول" : "Open fleet"}
            />}
            {m.locationCount === 0 && <AttentionItem
              icon={<MapPin size={15}/>}
              tone="warn"
              title={ar ? "لا يوجد موقع استلام فعال" : "No active pickup location"}
              body={ar ? "أضف فرعًا أو نقطة استلام حتى يتمكن العملاء من الحجز." : "Add a branch or pickup point so customers can book."}
              href="/car-dashboard/locations"
              linkLabel={ar ? "إضافة موقع" : "Add location"}
            />}
            {companyReady && m.pendingHolds === 0 && m.maintenanceVehicles === 0 && <AttentionItem
              icon={<CheckCircle2 size={15}/>}
              tone="good"
              title={ar ? "لا توجد أمور عاجلة" : "Nothing urgent right now"}
              body={ar ? "الأسطول والحجوزات الأساسية بحالة جيدة." : "Your fleet and core booking operations look healthy."}
            />}
            {m.cancellations30d > 0 && <AttentionItem
              icon={<AlertTriangle size={15}/>}
              title={ar ? `${m.cancellations30d} إلغاء خلال آخر 30 يوم` : `${m.cancellations30d} cancellation(s) in the last 30 days`}
              body={ar ? "راقب السبب إذا بدأ معدل الإلغاء بالارتفاع." : "Keep an eye on the causes if the cancellation rate starts rising."}
              href="/car-dashboard/performance"
              linkLabel={ar ? "عرض الأداء" : "View performance"}
            />}
          </div>
        </aside>
      </div>

      <section className={styles.reservations}>
        <div className={styles.reservationHeader}><h2>{ar ? "آخر الحجوزات" : "Recent reservations"}</h2><Link href="/car-dashboard/reservations">{ar ? "كل الحجوزات" : "All reservations"}</Link></div>
        {dashboard.recentReservations.length ? <div className={styles.reservationTableWrap}><table className={styles.reservationTable}>
          <thead><tr>
            <th>{ar ? "الحجز" : "Booking"}</th>
            <th>{ar ? "الضيف" : "Guest"}</th>
            <th>{ar ? "السيارة" : "Vehicle"}</th>
            <th>{ar ? "الاستلام" : "Pickup"}</th>
            <th>{ar ? "طريقة الدفع" : "Payment"}</th>
            <th>{ar ? "الإجمالي" : "Total"}</th>
            <th>{ar ? "الحالة" : "Status"}</th>
          </tr></thead>
          <tbody>{dashboard.recentReservations.map((reservation) => <tr key={reservation.id}>
            <td><strong>{reservation.reference}</strong></td>
            <td className={styles.guestCell}><strong>{reservation.guestName}</strong><span>{reservation.pickupLocation}</span></td>
            <td>{reservation.vehicle}</td>
            <td>{new Date(reservation.pickupAt).toLocaleString(locale, {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"})}</td>
            <td>{reservation.paymentMode === "PAY_NOW" ? (ar ? "دفع الآن" : "Pay now") : (ar ? "عند الاستلام" : "At counter")}</td>
            <td><strong>{money(reservation.total, reservation.currency, locale)}</strong></td>
            <td><span className={`${styles.statusChip} ${statusTone(reservation.status) === "confirmed" ? styles.confirmed : statusTone(reservation.status) === "hold" ? styles.hold : statusTone(reservation.status) === "cancelled" ? styles.cancelled : ""}`}>{statusLabel(reservation.status, ar)}</span></td>
          </tr>)}</tbody>
        </table></div> : <EmptyState ar={ar}/>} 
      </section>
    </div>
  </CarPartnerShell>;
}

function Metric({icon, label, value, sub, accent = false, moneyCard = false}: {icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean; moneyCard?: boolean}) {
  return <article className={`${styles.metricCard} ${accent ? styles.accent : ""} ${moneyCard ? styles.money : ""}`}>
    <div className={styles.metricHead}><span>{label}</span><span className={styles.metricIcon}>{icon}</span></div>
    <strong className={styles.metricValue}>{value}</strong>
    <small className={styles.metricSub}>{sub}</small>
  </article>;
}

function MiniMetric({icon, label, value}: {icon: React.ReactNode; label: string; value: number}) {
  return <article className={styles.miniCard}><span>{icon}{label}</span><strong>{value}</strong></article>;
}

function AttentionItem({icon, title, body, href, linkLabel, tone}: {icon: React.ReactNode; title: string; body: string; href?: string; linkLabel?: string; tone?: "warn" | "good"}) {
  return <article className={styles.attentionItem}>
    <span className={`${styles.attentionIcon} ${tone === "warn" ? styles.warn : tone === "good" ? styles.good : ""}`}>{icon}</span>
    <div><strong>{title}</strong><p>{body}</p>{href && linkLabel ? <Link href={href}>{linkLabel}</Link> : null}</div>
  </article>;
}

function EmptyState({ar}: {ar: boolean}) {
  return <div className={styles.empty}><span className={styles.emptyIcon}><CalendarClock size={22}/></span><h3>{ar ? "لا توجد عمليات قادمة" : "No upcoming activity"}</h3><p>{ar ? "ستظهر الحجوزات والعمليات هنا تلقائيًا عندما تبدأ الحركة." : "Reservations and operational activity will appear here automatically."}</p></div>;
}

function money(value: number, currency: string, locale: string) {
  return `${new Intl.NumberFormat(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value)} ${currency}`;
}

function percent(value: number) {
  return `${new Intl.NumberFormat("en-US", {style: "percent", maximumFractionDigits: 1}).format(value)}`;
}

function statusTone(status: string) {
  if (status === "CONFIRMED" || status === "MODIFIED" || status === "COMPLETED") return "confirmed";
  if (status === "HOLD") return "hold";
  if (status === "CANCELLED" || status === "NO_SHOW" || status === "EXPIRED") return "cancelled";
  return "neutral";
}

function statusLabel(status: string, ar: boolean) {
  if (!ar) return status.replaceAll("_", " ");
  if (status === "CONFIRMED") return "مؤكد";
  if (status === "MODIFIED") return "معدل";
  if (status === "COMPLETED") return "مكتمل";
  if (status === "HOLD") return "معلق";
  if (status === "CANCELLED") return "ملغي";
  if (status === "NO_SHOW") return "عدم حضور";
  if (status === "EXPIRED") return "منتهي";
  return status;
}
