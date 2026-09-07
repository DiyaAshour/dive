import Link from "next/link";
import {redirect} from "next/navigation";
import {AlertTriangle, BedDouble, Bell, CalendarCheck2, CalendarPlus, CheckCircle2, ClipboardList, DollarSign, Landmark, MessageSquare, Settings2} from "lucide-react";
import {hotelRoleCan, type HotelRole} from "@platform/core";
import {getHotelWorkspace, getPartnerTodayDashboard, listUserHotels} from "@platform/server";
import {PartnerSidebar} from "@/components/partner-sidebar";
import {PartnerLanguageBar} from "@/components/partner-language-bar";
import {currentUser} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {direction} from "@/lib/i18n";
import styles from "./today-dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function HotelDashboard({searchParams}: {searchParams: Promise<{hotelId?: string}>}) {
  const user = await currentUser();
  if (!user) redirect("/partner/login");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const hotels = await listUserHotels(user.id);
  if (!hotels.length) redirect("/partner/onboarding");
  const query = await searchParams;
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/partner/onboarding");

  if (selected.status !== "ACTIVE") {
    redirect(`/hotel-dashboard/property?hotelId=${encodeURIComponent(selected.id)}`);
  }

  const [workspace, dashboard] = await Promise.all([
    getHotelWorkspace(user.id, selected.id),
    getPartnerTodayDashboard(user.id, selected.id),
  ]);
  const role = selected.role as HotelRole;
  const canRates = hotelRoleCan(role, "rates:manage") || hotelRoleCan(role, "inventory:manage");
  const formattedDate = new Intl.DateTimeFormat(ar ? "ar-JO" : "en-GB", {
    dateStyle: "full",
    timeZone: dashboard.timezone,
  }).format(new Date(`${dashboard.date}T12:00:00.000Z`));
  const reservationsHref = `/hotel-dashboard/reservations?hotelId=${encodeURIComponent(workspace.id)}&date=${dashboard.date}`;
  const ratesHref = `/hotel-dashboard/rates?hotelId=${encodeURIComponent(workspace.id)}`;
  const messagesHref = `/hotel-dashboard/messages?hotelId=${encodeURIComponent(workspace.id)}`;

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={workspace.id} hotelName={workspace.name} city={workspace.city} status={workspace.status} active="overview" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar">
        <div><span className="partnerPageEyebrow">{ar ? "تشغيل الفندق" : "Hotel operations"}</span><h1>{ar ? `اليوم في ${workspace.name}` : `Today at ${workspace.name}`}</h1><p>{workspace.city} · {workspace.timezone}</p></div>
        <div className="partnerTopbarActions">
          <span className="propertyStatus active">{ar ? "مباشر" : "LIVE"}</span>
          {hotelRoleCan(role, "hotel:edit") && <Link className="partnerSecondaryAction" href={`/hotel-dashboard/property?hotelId=${encodeURIComponent(workspace.id)}`}><Settings2 size={16}/>{ar ? "إعدادات الفندق" : "Property settings"}</Link>}
        </div>
      </div>

      <section className={styles.todayHero}>
        <div><span className="eyebrow">{ar ? "صورة تشغيلية سريعة" : "Operational snapshot"}</span><h2>{dashboard.attentionCount > 0 ? (ar ? `${dashboard.attentionCount} نقطة تحتاج انتباهك` : `${dashboard.attentionCount} item(s) need attention`) : (ar ? "كل شيء واضح لليوم" : "Everything looks clear for today")}</h2><p>{ar ? "الوصول والمغادرة والإقامة الحالية والرسائل وطلبات الضيوف والمخزون المنخفض في شاشة واحدة. افتح التفاصيل فقط عندما تحتاجها." : "Arrivals, departures, in-house stays, guest messages, open requests and low inventory in one place. Open details only when you need them."}</p></div>
        <div className={styles.heroDate}><strong>{formattedDate}</strong><span>{dashboard.timezone}</span></div>
      </section>

      <section className={styles.metrics} aria-label={ar ? "ملخص اليوم" : "Today summary"}>
        <Metric icon={<CalendarCheck2 size={16}/>} label={ar ? "وصول اليوم" : "Arrivals"} value={dashboard.stats.arrivals} helper={ar ? "حجوزات تصل اليوم" : "due today"}/>
        <Metric icon={<ClipboardList size={16}/>} label={ar ? "مغادرة اليوم" : "Departures"} value={dashboard.stats.departures} helper={ar ? "حجوزات تغادر اليوم" : "leaving today"}/>
        <Metric icon={<BedDouble size={16}/>} label={ar ? "داخل الفندق" : "In house"} value={dashboard.stats.inHouse} helper={ar ? "نزلاء مقيمون" : "currently staying"}/>
        <Metric icon={<CalendarPlus size={16}/>} label={ar ? "حجوزات جديدة" : "New bookings"} value={dashboard.stats.newBookings} helper={ar ? "آخر 24 ساعة" : "last 24 hours"}/>
        <Metric icon={<Bell size={16}/>} label={ar ? "رسائل غير مقروءة" : "Unread messages"} value={dashboard.stats.unreadMessages} helper={ar ? "من الضيوف" : "from guests"}/>
        <Metric icon={<AlertTriangle size={16}/>} label={ar ? "طلبات مفتوحة" : "Open requests"} value={dashboard.stats.openRequests} helper={ar ? "تحتاج متابعة" : "need follow-up"}/>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className="partnerPageEyebrow">{ar ? "تحتاج إجراء" : "Needs attention"}</span><h3>{ar ? "اشتغل على الاستثناءات فقط" : "Work the exceptions, not the whole system"}</h3><p>{ar ? "نظهر لك الأشياء التي تحتاج قرار أو متابعة ونخفي الباقي." : "Only items that need a decision or follow-up appear here."}</p></div><span className={styles.countBadge}>{dashboard.attentionCount}</span></div>
          {dashboard.attentionCount === 0 ? <div className={styles.clearState}><CheckCircle2 size={19}/><span>{ar ? "لا توجد مهام عاجلة الآن." : "No urgent operational tasks right now."}</span></div> : <div className={styles.attentionList}>
            {dashboard.stats.unreadMessages > 0 && <Link className={styles.attentionItem} href={messagesHref}><span className={styles.attentionCopy}><MessageSquare size={17}/><span><strong>{ar ? "رسائل ضيوف جديدة" : "New guest messages"}</strong><span>{ar ? "افتح المحادثات ورد على الضيوف." : "Open the inbox and reply to guests."}</span></span></span><span className={styles.attentionValue}>{dashboard.stats.unreadMessages}</span></Link>}
            {dashboard.stats.openRequests > 0 && <Link className={styles.attentionItem} href={reservationsHref}><span className={styles.attentionCopy}><ClipboardList size={17}/><span><strong>{ar ? "طلبات ضيوف مفتوحة" : "Open guest requests"}</strong><span>{ar ? "راجع الطلبات المرتبطة بحجوزات اليوم." : "Review requests attached to today's stays."}</span></span></span><span className={styles.attentionValue}>{dashboard.stats.openRequests}</span></Link>}
            {dashboard.inventoryAlerts.map((alert) => <Link className={styles.attentionItem} href={ratesHref} key={`${alert.roomTypeId}-${alert.date}-${alert.kind}`}><span className={styles.attentionCopy}><DollarSign size={17}/><span><strong>{alert.roomName}</strong><span>{inventoryAlertCopy(alert, ar)}</span></span></span><span className={styles.attentionValue}>{alert.available === null ? "—" : alert.available}</span></Link>)}
          </div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><span className="partnerPageEyebrow">{ar ? "اختصارات العمل" : "Quick actions"}</span><h3>{ar ? "أكثر الأشياء استخداماً" : "The actions your team uses most"}</h3></div></div>
          <div className={styles.actions}>
            {hotelRoleCan(role, "bookings:view") && <Link className={styles.action} href={reservationsHref}><CalendarCheck2 size={18}/>{ar ? "فتح مركز الحجوزات" : "Open reservation center"}</Link>}
            {canRates && <Link className={styles.action} href={ratesHref}><DollarSign size={18}/>{ar ? "تحديث الأسعار والمخزون" : "Update rates & inventory"}</Link>}
            {hotelRoleCan(role, "rooms:manage") && <Link className={styles.action} href={`/hotel-dashboard/rooms?hotelId=${encodeURIComponent(workspace.id)}`}><BedDouble size={18}/>{ar ? "إدارة الغرف" : "Manage rooms"}</Link>}
            {hotelRoleCan(role, "bookings:view") && <Link className={styles.action} href={messagesHref}><MessageSquare size={18}/>{ar ? "رسائل الضيوف" : "Guest messages"}</Link>}
            {hotelRoleCan(role, "finance:view") && <Link className={styles.action} href={`/hotel-dashboard/finance?hotelId=${encodeURIComponent(workspace.id)}`}><Landmark size={18}/>{ar ? "المالية والتسويات" : "Finance & settlements"}</Link>}
            {hotelRoleCan(role, "hotel:edit") && <Link className={styles.action} href={`/hotel-dashboard/property?hotelId=${encodeURIComponent(workspace.id)}`}><Settings2 size={18}/>{ar ? "محتوى وإعدادات الفندق" : "Property content & settings"}</Link>}
          </div>
        </section>
      </div>

      <section className={`${styles.panel} ${styles.movement}`}>
        <div className={styles.panelHead}><div><span className="partnerPageEyebrow">{ar ? "حركة اليوم" : "Today's movement"}</span><h3>{ar ? "الحجوزات المرتبطة بهذا اليوم" : "Reservations touching this date"}</h3><p>{ar ? "اضغط على أي حجز لفتحه في مركز الحجوزات." : "Open any stay in the reservation center for full details and actions."}</p></div><Link className="partnerSecondaryAction" href={reservationsHref}>{ar ? "عرض الكل" : "View all"}</Link></div>
        {dashboard.reservations.length ? <div className={styles.movementList}>{dashboard.reservations.map((reservation) => <Link className={styles.reservationRow} href={`${reservationsHref}&q=${encodeURIComponent(reservation.reference)}`} key={reservation.id}>
          <div className={styles.reservationGuest}><strong>{reservation.guestName}</strong><small>{reservation.reference} · {reservation.adults} {ar ? "بالغ" : "adult(s)"}{reservation.children ? ` · ${reservation.children} ${ar ? "طفل" : "child(ren)"}` : ""}</small></div>
          <div className={styles.reservationRoom}><strong>{reservation.roomType?.name ?? (ar ? "الغرفة غير محددة" : "Room pending")}</strong><small>{reservation.ratePlan?.name ?? ""}</small></div>
          <div className={styles.reservationStay}><strong>{reservation.arrival} → {reservation.departure}</strong><small>{reservation.paymentMode.replaceAll("_", " ")} · {reservation.paymentState.replaceAll("_", " ")}</small></div>
          <span className={styles.state}>{stateLabel(reservation.operationalState, ar)}</span>
        </Link>)}</div> : <div className={styles.emptyMovement}>{ar ? "لا توجد حركة حجوزات مسجلة لهذا اليوم." : "No reservation movement is recorded for this date."}</div>}
      </section>
    </section>
  </main>;
}

function Metric({icon, label, value, helper}: {icon: React.ReactNode; label: string; value: number; helper: string}) {
  return <article className={styles.metric}><span className={styles.metricTop}>{icon}{label}</span><strong>{value}</strong><small>{helper}</small></article>;
}

function inventoryAlertCopy(alert: {date: string; available: number | null; quantity: number; kind: "LOW" | "SOLD_OUT" | "MISSING"}, ar: boolean) {
  if (alert.kind === "MISSING") return ar ? `المخزون غير مهيأ ليوم ${alert.date}` : `Inventory is not configured for ${alert.date}`;
  if (alert.kind === "SOLD_OUT") return ar ? `نفد المخزون ليوم ${alert.date}` : `Sold out for ${alert.date}`;
  return ar ? `باقي ${alert.available} من ${alert.quantity} ليوم ${alert.date}` : `${alert.available} of ${alert.quantity} left for ${alert.date}`;
}

function stateLabel(state: string, ar: boolean) {
  if (!ar) return state.replaceAll("_", " ");
  const labels: Record<string, string> = {ARRIVAL: "وصول", DEPARTURE: "مغادرة", IN_HOUSE: "داخل الفندق", CANCELLED: "ملغي", NO_SHOW: "عدم حضور", OTHER: "حجز"};
  return labels[state] ?? state.replaceAll("_", " ");
}
