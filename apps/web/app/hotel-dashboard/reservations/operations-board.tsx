"use client";

import {useMemo, useState} from "react";
import type {FormEvent} from "react";
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import styles from "./reservation-center.module.css";

type Scope = "ARRIVALS" | "DEPARTURES" | "IN_HOUSE" | "CANCELLED" | "NO_SHOW" | "ALL";
type GuestRequest = {id: string; category: string; message: string; status: string; createdAt: string; updatedAt?: string};
type FrontDeskNote = {id: string; body: string; createdAt: string; author: {displayName: string; email?: string}};
type ReservationSummary = {
  id: string;
  reference: string;
  guestName: string;
  guestEmail: string;
  adults: number;
  children: number;
  arrival: string;
  departure: string;
  expectedArrivalTime: string | null;
  arrivalStatus: string;
  status: string;
  paymentMode: string;
  paymentState: string;
  currency: string;
  totalAmount: number;
  roomType: {id: string; name: string};
  ratePlan: {id: string; name: string};
  openRequestCount: number;
  noteCount: number;
  operationalState: string;
};
type ReservationStats = {
  arrivals: number;
  departures: number;
  inHouse: number;
  cancelled: number;
  noShow: number;
  openRequests: number;
};
type RoomOption = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  ratePlans: Array<{id: string; name: string; code: string; active: boolean}>;
};
type CancellationPreview = {
  policy: {name: string};
  penaltyAmount: number;
  refundableAmount: number;
  daysBeforeArrival?: number;
  rule?: string;
  alreadyCancelled?: boolean;
};
type ReservationDetail = {
  id: string;
  reference: string;
  guestName: string;
  guestEmail: string;
  roomType: {id: string; name: string};
  ratePlan: {id: string; name: string};
  occupancy: {adults: number; children: number};
  arrival: string;
  departure: string;
  expectedArrivalTime: string | null;
  arrivalStatus: string;
  status: string;
  revision: number;
  paymentMode: string;
  paymentState: string;
  currency: string;
  amounts: {base: number; service: number; tax: number; total: number};
  promotion: {name: string; discountPercent: number} | null;
  cancellation: {
    policy: {name: string};
    penaltyAmount: number;
    refundableAmount: number | null;
  };
  canModify: boolean;
  canCancel: boolean;
  canMarkNoShow: boolean;
  today: string;
  timezone: string;
  nights: Array<{date: string; base: number; service: number; tax: number; total: number}>;
  events: Array<{type: string; data: unknown; createdAt: string}>;
  refunds: Array<{id: string; amount: number; currency: string; reason: string; status: string; createdAt: string; completedAt: string | null}>;
  paymentAttempts: Array<{id: string; provider: string; status: string; amount: number; currency: string; failureCode: string | null; createdAt: string; completedAt: string | null}>;
  guestRequests: GuestRequest[];
  frontDeskNotes: FrontDeskNote[];
};

type Props = {
  hotelId: string;
  initialDate: string;
  initialScope: Scope;
  initialQ: string;
  initialReservations: ReservationSummary[];
  initialStats: ReservationStats;
  rooms: RoomOption[];
  currency: string;
  timezone: string;
  locale: Locale;
};

const SCOPES: Scope[] = ["ALL", "ARRIVALS", "DEPARTURES", "IN_HOUSE", "CANCELLED", "NO_SHOW"];

export default function OperationsBoard({
  hotelId,
  initialDate,
  initialScope,
  initialQ,
  initialReservations,
  initialStats,
  rooms,
  currency,
  timezone,
  locale,
}: Props) {
  const ar = locale === "ar";
  const [reservations, setReservations] = useState(initialReservations);
  const [selectedId, setSelectedId] = useState<string | null>(initialReservations[0]?.id ?? null);
  const [detail, setDetail] = useState<ReservationDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancellationPreview, setCancellationPreview] = useState<CancellationPreview | null>(null);
  const [editRoomId, setEditRoomId] = useState("");
  const [editRatePlanId, setEditRatePlanId] = useState("");

  const selectedSummary = reservations.find((item) => item.id === selectedId) ?? null;
  const editRoom = rooms.find((room) => room.id === editRoomId) ?? null;
  const editablePlans = editRoom?.ratePlans.filter((plan) => plan.active || plan.id === editRatePlanId) ?? [];

  const scopeHref = (scope: Scope) => {
    const params = new URLSearchParams({hotelId, date: initialDate, scope});
    if (initialQ) params.set("q", initialQ);
    return `/hotel-dashboard/reservations?${params.toString()}`;
  };

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({date: initialDate, scope: initialScope});
    if (initialQ) params.set("q", initialQ);
    return `/api/v1/hotels/${encodeURIComponent(hotelId)}/reservations/export?${params.toString()}`;
  }, [hotelId, initialDate, initialScope, initialQ]);

  async function openDetail(id: string) {
    setSelectedId(id);
    setDetailBusy(true);
    setMessage(null);
    setError(null);
    setCancellationPreview(null);
    try {
      const data = await api<ReservationDetail>(`/api/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(id)}`);
      setDetail(data);
      setEditRoomId(data.roomType.id);
      setEditRatePlanId(data.ratePlan.id);
    } catch (cause) {
      setError(errorText(cause, ar));
    } finally {
      setDetailBusy(false);
    }
  }

  async function saveArrival(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setActionBusy("arrival");
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(detail.id)}/arrival`, {
        method: "PATCH",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          expectedArrivalTime: String(form.get("arrival") || "") || null,
          arrivalStatus: String(form.get("status")),
        }),
      });
      const refreshed = await loadDetail(detail.id);
      setMessage(ar ? "تم تحديث حالة الوصول." : "Arrival status updated.");
      mergeSummary(refreshed);
    } catch (cause) {
      setError(errorText(cause, ar));
    } finally {
      setActionBusy(null);
    }
  }

  async function saveModification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setActionBusy("modify");
    setMessage(null);
    setError(null);
    setCancellationPreview(null);
    const form = new FormData(event.currentTarget);
    try {
      const updated = await api<ReservationDetail>(`/api/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(detail.id)}`, {
        method: "PATCH",
        headers: {"content-type": "application/json", "idempotency-key": operationKey("hotel-modify")},
        body: JSON.stringify({
          roomTypeId: editRoomId,
          ratePlanId: editRatePlanId,
          arrival: String(form.get("arrival")),
          departure: String(form.get("departure")),
          adults: Number(form.get("adults")),
          children: Number(form.get("children")),
        }),
      });
      setDetail(updated);
      setEditRoomId(updated.roomType.id);
      setEditRatePlanId(updated.ratePlan.id);
      mergeSummary(updated);
      setMessage(ar ? "تم تعديل الحجز وإعادة تسعيره وفحص المخزون." : "Reservation modified, repriced and inventory-checked.");
    } catch (cause) {
      setError(errorText(cause, ar));
    } finally {
      setActionBusy(null);
    }
  }

  async function previewCancel() {
    if (!detail) return;
    setActionBusy("preview-cancel");
    setMessage(null);
    setError(null);
    try {
      const preview = await api<CancellationPreview>(`/api/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(detail.id)}/cancellation`);
      setCancellationPreview(preview);
    } catch (cause) {
      setError(errorText(cause, ar));
    } finally {
      setActionBusy(null);
    }
  }

  async function confirmCancel() {
    if (!detail) return;
    setActionBusy("cancel");
    setMessage(null);
    setError(null);
    try {
      const updated = await api<ReservationDetail>(`/api/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(detail.id)}/cancel`, {
        method: "POST",
        headers: {"idempotency-key": operationKey("hotel-cancel")},
      });
      setDetail(updated);
      setCancellationPreview(null);
      mergeSummary(updated);
      setMessage(ar ? "تم إلغاء الحجز وتطبيق سياسة الإلغاء." : "Reservation cancelled and policy applied.");
    } catch (cause) {
      setError(errorText(cause, ar));
    } finally {
      setActionBusy(null);
    }
  }

  async function markNoShow() {
    if (!detail) return;
    if (!window.confirm(ar ? "تأكيد تسجيل الضيف كعدم حضور؟ سيتم تطبيق غرامة عدم الحضور وإعادة المخزون المستحق." : "Mark this guest as no-show? The no-show policy will be applied and eligible inventory released.")) return;
    setActionBusy("no-show");
    setMessage(null);
    setError(null);
    try {
      const updated = await api<ReservationDetail>(`/api/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(detail.id)}/no-show`, {
        method: "POST",
        headers: {"idempotency-key": operationKey("hotel-no-show")},
      });
      setDetail(updated);
      setCancellationPreview(null);
      mergeSummary(updated);
      setMessage(ar ? "تم تسجيل عدم الحضور وتطبيق السياسة المالية." : "No-show recorded and financial policy applied.");
    } catch (cause) {
      setError(errorText(cause, ar));
    } finally {
      setActionBusy(null);
    }
  }

  async function changeRequestStatus(requestId: string, status: string) {
    if (!detail) return;
    setActionBusy(requestId);
    setError(null);
    try {
      await api(`/api/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(detail.id)}/requests/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({status}),
      });
      const refreshed = await loadDetail(detail.id);
      mergeSummary(refreshed);
    } catch (cause) {
      setError(errorText(cause, ar));
    } finally {
      setActionBusy(null);
    }
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setActionBusy("note");
    setError(null);
    try {
      await api(`/api/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(detail.id)}/notes`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({body: String(form.get("body"))}),
      });
      formElement.reset();
      const refreshed = await loadDetail(detail.id);
      mergeSummary(refreshed);
      setMessage(ar ? "تمت إضافة ملاحظة داخلية." : "Private front desk note added.");
    } catch (cause) {
      setError(errorText(cause, ar));
    } finally {
      setActionBusy(null);
    }
  }

  async function loadDetail(id: string) {
    const refreshed = await api<ReservationDetail>(`/api/v1/hotels/${encodeURIComponent(hotelId)}/reservations/${encodeURIComponent(id)}`);
    setDetail(refreshed);
    setEditRoomId(refreshed.roomType.id);
    setEditRatePlanId(refreshed.ratePlan.id);
    return refreshed;
  }

  function mergeSummary(updated: ReservationDetail) {
    setReservations((items) => items.map((item) => item.id === updated.id ? {
      ...item,
      guestName: updated.guestName,
      guestEmail: updated.guestEmail,
      adults: updated.occupancy.adults,
      children: updated.occupancy.children,
      arrival: updated.arrival,
      departure: updated.departure,
      expectedArrivalTime: updated.expectedArrivalTime,
      arrivalStatus: updated.arrivalStatus,
      status: updated.status,
      paymentMode: updated.paymentMode,
      paymentState: updated.paymentState,
      currency: updated.currency,
      totalAmount: updated.amounts.total,
      roomType: updated.roomType,
      ratePlan: updated.ratePlan,
      openRequestCount: updated.guestRequests.filter((request) => request.status !== "RESOLVED").length,
      noteCount: updated.frontDeskNotes.length,
    } : item));
  }

  function chooseEditRoom(roomId: string) {
    setEditRoomId(roomId);
    const nextRoom = rooms.find((room) => room.id === roomId);
    const nextPlan = nextRoom?.ratePlans.find((plan) => plan.active) ?? nextRoom?.ratePlans[0];
    setEditRatePlanId(nextPlan?.id ?? "");
  }

  return (
    <div className={styles.center}>
      <section className={styles.toolbar}>
        <div className={styles.scopeTabs}>
          {SCOPES.map((scope) => (
            <a key={scope} href={scopeHref(scope)} className={scope === initialScope ? styles.scopeActive : styles.scopeTab}>
              {scopeLabel(scope, ar)}
            </a>
          ))}
        </div>
        <form method="get" className={styles.filters}>
          <input type="hidden" name="hotelId" value={hotelId}/>
          <input type="hidden" name="scope" value={initialScope}/>
          <label>
            <CalendarDays size={16}/>
            <span>{ar ? "تاريخ التشغيل" : "Operational date"}</span>
            <input name="date" type="date" defaultValue={initialDate}/>
          </label>
          <label className={styles.searchField}>
            <Search size={16}/>
            <span>{ar ? "بحث" : "Search"}</span>
            <input name="q" defaultValue={initialQ} placeholder={ar ? "رقم الحجز، اسم الضيف أو البريد" : "Reference, guest or email"}/>
          </label>
          <button className="primaryButton" type="submit">{ar ? "تحديث العرض" : "Refresh view"}</button>
          <a className="secondaryButton" href={exportHref}><FileText size={16}/>{ar ? "CSV" : "Export CSV"}</a>
        </form>
      </section>

      <section className={styles.kpis}>
        <Kpi label={ar ? "وصول" : "Arrivals"} value={initialStats.arrivals}/>
        <Kpi label={ar ? "مغادرة" : "Departures"} value={initialStats.departures}/>
        <Kpi label={ar ? "داخل الفندق" : "In-house"} value={initialStats.inHouse}/>
        <Kpi label={ar ? "ملغاة" : "Cancelled"} value={initialStats.cancelled}/>
        <Kpi label={ar ? "عدم حضور" : "No-show"} value={initialStats.noShow}/>
        <Kpi label={ar ? "طلبات مفتوحة" : "Open requests"} value={initialStats.openRequests}/>
      </section>

      {(message || error) && (
        <div className={error ? styles.errorBanner : styles.successBanner}>
          {error ? <AlertTriangle size={18}/> : <CheckCircle2 size={18}/>}<span>{error ?? message}</span>
        </div>
      )}

      <div className={styles.workspace}>
        <section className={styles.listPanel}>
          <div className={styles.listHead}>
            <div><span>{scopeLabel(initialScope, ar)}</span><strong>{reservations.length}</strong></div>
            <small>{initialDate} · {timezone}</small>
          </div>
          {reservations.length === 0 ? (
            <div className={styles.empty}>
              <CalendarDays size={28}/><strong>{ar ? "لا توجد حجوزات مطابقة" : "No matching reservations"}</strong>
              <span>{ar ? "غيّر التاريخ أو العرض أو عبارة البحث." : "Change the date, view or search query."}</span>
            </div>
          ) : (
            <div className={styles.reservationList}>
              {reservations.map((booking) => (
                <button type="button" key={booking.id} className={`${styles.reservationCard} ${selectedId === booking.id ? styles.reservationCardActive : ""}`} onClick={() => void openDetail(booking.id)}>
                  <div className={styles.cardTop}>
                    <div><span className={styles.reference}>{booking.reference}</span><strong>{booking.guestName}</strong></div>
                    <StatusPill status={booking.status} ar={ar}/>
                  </div>
                  <div className={styles.cardMeta}>
                    <span><BedDouble size={15}/>{booking.roomType.name}</span>
                    <span><CalendarDays size={15}/>{booking.arrival} → {booking.departure}</span>
                    <span><UserRound size={15}/>{booking.adults + booking.children}</span>
                  </div>
                  <div className={styles.cardBottom}>
                    <span>{booking.expectedArrivalTime ? `${ar ? "الوصول" : "ETA"} ${booking.expectedArrivalTime}` : arrivalLabel(booking.arrivalStatus, ar)}</span>
                    <strong>{money(booking.totalAmount, booking.currency, locale)}</strong>
                  </div>
                  {(booking.openRequestCount > 0 || booking.noteCount > 0) && <div className={styles.cardFlags}>
                    {booking.openRequestCount > 0 && <span>{booking.openRequestCount} {ar ? "طلب مفتوح" : "open requests"}</span>}
                    {booking.noteCount > 0 && <span>{booking.noteCount} {ar ? "ملاحظة" : "notes"}</span>}
                  </div>}
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className={styles.detailPanel}>
          {detailBusy ? (
            <div className={styles.detailLoading}><Loader2 className={styles.spin}/>{ar ? "جارٍ تحميل الحجز…" : "Loading reservation…"}</div>
          ) : !detail ? (
            <div className={styles.detailPlaceholder}>
              <FileText size={34}/><strong>{selectedSummary ? (ar ? "افتح الحجز لعرض التفاصيل" : "Open the reservation for details") : (ar ? "اختر حجزاً" : "Select a reservation")}</strong>
              <span>{ar ? "التفاصيل التجارية، الوصول، الطلبات والإجراءات الحساسة تظهر هنا." : "Commercial details, arrival, requests and sensitive actions appear here."}</span>
              {selectedSummary && <button className="primaryButton" onClick={() => void openDetail(selectedSummary.id)}>{ar ? "فتح الحجز" : "Open reservation"}</button>}
            </div>
          ) : (
            <div className={styles.detailContent}>
              <header className={styles.detailHeader}>
                <div><span>{detail.reference} · {ar ? `نسخة ${detail.revision}` : `revision ${detail.revision}`}</span><h2>{detail.guestName}</h2><p><Mail size={15}/>{detail.guestEmail}</p></div>
                <StatusPill status={detail.status} ar={ar}/>
              </header>

              <div className={styles.detailFacts}>
                <Fact label={ar ? "الوصول" : "Arrival"} value={detail.arrival}/><Fact label={ar ? "المغادرة" : "Departure"} value={detail.departure}/>
                <Fact label={ar ? "الضيوف" : "Guests"} value={`${detail.occupancy.adults} ${ar ? "بالغ" : "adults"} · ${detail.occupancy.children} ${ar ? "طفل" : "children"}`}/>
                <Fact label={ar ? "الغرفة" : "Room"} value={detail.roomType.name}/><Fact label={ar ? "خطة السعر" : "Rate plan"} value={detail.ratePlan.name}/>
                <Fact label={ar ? "الدفع" : "Payment"} value={`${paymentLabel(detail.paymentMode, ar)} · ${paymentStateLabel(detail.paymentState, ar)}`}/>
              </div>

              <section className={styles.commercialCard}>
                <div className={styles.sectionTitle}><CreditCard size={18}/><div><strong>{ar ? "القيمة التجارية" : "Commercial value"}</strong><span>{ar ? "لقطة الحجز الحالية" : "Current reservation snapshot"}</span></div></div>
                <div className={styles.moneyRows}>
                  <MoneyRow label={ar ? "سعر الغرفة" : "Room base"} value={detail.amounts.base} currency={detail.currency} locale={locale}/>
                  <MoneyRow label={ar ? "الخدمة" : "Service"} value={detail.amounts.service} currency={detail.currency} locale={locale}/>
                  <MoneyRow label={ar ? "الضرائب" : "Tax"} value={detail.amounts.tax} currency={detail.currency} locale={locale}/>
                  <MoneyRow label={ar ? "الإجمالي" : "Total"} value={detail.amounts.total} currency={detail.currency} locale={locale} total/>
                </div>
                {detail.promotion && <span className={styles.promo}>{detail.promotion.name} · {detail.promotion.discountPercent}%</span>}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitle}><Clock3 size={18}/><div><strong>{ar ? "الوصول والتشييك إن" : "Arrival & check-in"}</strong><span>{ar ? "الحالة التشغيلية مستقلة عن حالة الحجز التجارية" : "Operational arrival state stays separate from commercial booking status"}</span></div></div>
                <form className={styles.compactForm} onSubmit={saveArrival}>
                  <label>{ar ? "الوقت المتوقع" : "Expected time"}<input name="arrival" type="time" defaultValue={detail.expectedArrivalTime ?? ""}/></label>
                  <label>{ar ? "حالة الوصول" : "Arrival status"}<select name="status" defaultValue={detail.arrivalStatus}><option value="NOT_PROVIDED">{ar ? "غير محدد" : "Not provided"}</option><option value="EXPECTED">{ar ? "متوقع" : "Expected"}</option><option value="ARRIVED">{ar ? "وصل / تم التشييك إن" : "Arrived / checked in"}</option></select></label>
                  <button className="secondaryButton" disabled={actionBusy === "arrival"}>{actionBusy === "arrival" ? <Loader2 className={styles.spin} size={16}/> : null}{ar ? "حفظ الوصول" : "Save arrival"}</button>
                </form>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitle}><BedDouble size={18}/><div><strong>{ar ? "تعديل الحجز" : "Modify reservation"}</strong><span>{ar ? "يعاد التسعير وفحص المخزون قبل الحفظ" : "Repriced and inventory-checked before save"}</span></div></div>
                {detail.canModify ? (
                  <form key={`${detail.id}-${detail.revision}`} className={styles.modifyForm} onSubmit={saveModification}>
                    <label>{ar ? "الغرفة" : "Room type"}<select value={editRoomId} onChange={(event) => chooseEditRoom(event.target.value)}>{rooms.filter((room) => room.active || room.id === detail.roomType.id).map((room) => <option key={room.id} value={room.id}>{room.name} · {room.code}</option>)}</select></label>
                    <label>{ar ? "خطة السعر" : "Rate plan"}<select value={editRatePlanId} onChange={(event) => setEditRatePlanId(event.target.value)} required>{editablePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.code}</option>)}</select></label>
                    <label>{ar ? "الوصول" : "Arrival"}<input name="arrival" type="date" defaultValue={detail.arrival} required/></label><label>{ar ? "المغادرة" : "Departure"}<input name="departure" type="date" defaultValue={detail.departure} required/></label>
                    <label>{ar ? "البالغون" : "Adults"}<input name="adults" type="number" min="1" max="20" defaultValue={detail.occupancy.adults} required/></label><label>{ar ? "الأطفال" : "Children"}<input name="children" type="number" min="0" max="20" defaultValue={detail.occupancy.children} required/></label>
                    <button className="primaryButton" disabled={actionBusy === "modify" || !editRatePlanId}>{actionBusy === "modify" ? <Loader2 className={styles.spin} size={16}/> : null}{ar ? "إعادة التسعير وحفظ التعديل" : "Reprice & save modification"}</button>
                  </form>
                ) : <div className={styles.lockedNote}><AlertTriangle size={17}/><span>{detail.arrivalStatus === "ARRIVED" ? (ar ? "لا يمكن تعديل إقامة بعد تسجيل الوصول من هذا المركز." : "Checked-in stays cannot be commercially modified here.") : detail.paymentState === "CAPTURED" ? (ar ? "الحجز المدفوع يحتاج مسار تعديل مالي قبل تغيير السعر." : "Captured payments need payment-adjustment support before price-changing edits.") : (ar ? "حالة الحجز الحالية أو تاريخ الوصول لا يسمح بالتعديل." : "This booking state or arrival date is not modifiable.")}</span></div>}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitle}><FileText size={18}/><div><strong>{ar ? "ليالي الحجز" : "Nightly pricing"}</strong><span>{detail.nights.length} {ar ? "ليالٍ" : "nights"}</span></div></div>
                <div className={styles.nights}>{detail.nights.map((night) => <div key={night.date}><span>{night.date}</span><strong>{money(night.total, detail.currency, locale)}</strong></div>)}</div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitle}><UserRound size={18}/><div><strong>{ar ? "طلبات الضيف" : "Guest requests"}</strong><span>{detail.guestRequests.filter((request) => request.status !== "RESOLVED").length} {ar ? "مفتوحة" : "open"}</span></div></div>
                {detail.guestRequests.length === 0 ? <p className={styles.muted}>{ar ? "لا توجد طلبات." : "No guest requests."}</p> : detail.guestRequests.map((request) => <div className={styles.requestRow} key={request.id}><div><strong>{request.category}</strong><p>{request.message}</p></div><select value={request.status} disabled={actionBusy === request.id} onChange={(event) => void changeRequestStatus(request.id, event.target.value)}><option value="OPEN">{ar ? "مفتوح" : "Open"}</option><option value="ACKNOWLEDGED">{ar ? "تم الاستلام" : "Acknowledged"}</option><option value="RESOLVED">{ar ? "محلول" : "Resolved"}</option></select></div>)}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitle}><FileText size={18}/><div><strong>{ar ? "ملاحظات الاستقبال الخاصة" : "Private front desk notes"}</strong><span>{ar ? "لا تظهر للضيف" : "Never shown to guests"}</span></div></div>
                <form className={styles.noteForm} onSubmit={addNote}><textarea name="body" rows={2} maxLength={4000} required placeholder={ar ? "أضف ملاحظة تشغيلية خاصة…" : "Add a private operational note…"}/><button className="secondaryButton" disabled={actionBusy === "note"}>{ar ? "إضافة" : "Add note"}</button></form>
                <div className={styles.notes}>{detail.frontDeskNotes.slice(0, 8).map((note) => <div key={note.id}><strong>{note.author.displayName}</strong><p>{note.body}</p><small>{dateTime(note.createdAt, locale)}</small></div>)}</div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionTitle}><Clock3 size={18}/><div><strong>{ar ? "سجل الحجز" : "Reservation timeline"}</strong><span>{detail.events.length} {ar ? "أحداث" : "events"}</span></div></div>
                <div className={styles.timeline}>{[...detail.events].reverse().slice(0, 12).map((event, index) => <div key={`${event.type}-${event.createdAt}-${index}`}><span className={styles.timelineDot}/><div><strong>{eventLabel(event.type, ar)}</strong><small>{dateTime(event.createdAt, locale)}</small></div></div>)}</div>
              </section>

              <section className={styles.dangerZone}>
                <div className={styles.sectionTitle}><AlertTriangle size={18}/><div><strong>{ar ? "إجراءات حساسة" : "Sensitive actions"}</strong><span>{ar ? "تُطبق السياسة المالية وتُسجل في التدقيق" : "Policy-aware and fully audited"}</span></div></div>
                {detail.canCancel && <div className={styles.cancelBox}>{!cancellationPreview ? <button className={styles.dangerSecondary} onClick={() => void previewCancel()} disabled={actionBusy === "preview-cancel"}>{actionBusy === "preview-cancel" ? <Loader2 className={styles.spin} size={16}/> : <XCircle size={16}/>} {ar ? "معاينة الإلغاء" : "Preview cancellation"}</button> : <><div className={styles.cancellationPreview}><span>{cancellationPreview.policy.name}</span><div><small>{ar ? "الغرامة" : "Penalty"}</small><strong>{money(cancellationPreview.penaltyAmount, detail.currency, locale)}</strong></div><div><small>{ar ? "المبلغ القابل للاسترداد" : "Refundable"}</small><strong>{money(cancellationPreview.refundableAmount, detail.currency, locale)}</strong></div></div><div className={styles.cancelActions}><button className={styles.dangerButton} onClick={() => void confirmCancel()} disabled={actionBusy === "cancel"}>{actionBusy === "cancel" ? <Loader2 className={styles.spin} size={16}/> : <XCircle size={16}/>} {ar ? "تأكيد إلغاء الحجز" : "Confirm cancellation"}</button><button className="secondaryButton" onClick={() => setCancellationPreview(null)}>{ar ? "رجوع" : "Back"}</button></div></>}</div>}
                {detail.canMarkNoShow && <button className={styles.noShowButton} onClick={() => void markNoShow()} disabled={actionBusy === "no-show"}>{actionBusy === "no-show" ? <Loader2 className={styles.spin} size={16}/> : <AlertTriangle size={16}/>} {ar ? "تسجيل عدم حضور" : "Mark no-show"}</button>}
                {!detail.canCancel && !detail.canMarkNoShow && <p className={styles.muted}>{ar ? "لا توجد إجراءات حساسة متاحة لهذه الحالة." : "No sensitive actions are available for this reservation state."}</p>}
              </section>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Kpi({label, value}: {label: string; value: number}) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Fact({label, value}: {label: string; value: string}) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function MoneyRow({label, value, currency, locale, total = false}: {label: string; value: number; currency: string; locale: Locale; total?: boolean}) { return <div className={total ? styles.moneyTotal : undefined}><span>{label}</span><strong>{money(value, currency, locale)}</strong></div>; }
function StatusPill({status, ar}: {status: string; ar: boolean}) { const className = status === "CANCELLED" ? styles.statusCancelled : status === "NO_SHOW" ? styles.statusNoShow : status === "MODIFIED" ? styles.statusModified : styles.statusActive; return <span className={`${styles.statusPill} ${className}`}>{statusLabel(status, ar)}</span>; }
function scopeLabel(scope: Scope, ar: boolean) { const labels: Record<Scope, [string, string]> = {ALL: ["Daily board", "عمليات اليوم"], ARRIVALS: ["Arrivals", "الوصول"], DEPARTURES: ["Departures", "المغادرة"], IN_HOUSE: ["In-house", "داخل الفندق"], CANCELLED: ["Cancelled", "ملغاة"], NO_SHOW: ["No-show", "عدم حضور"]}; return ar ? labels[scope][1] : labels[scope][0]; }
function statusLabel(status: string, ar: boolean) { const map: Record<string, [string, string]> = {CONFIRMED: ["Confirmed", "مؤكد"], MODIFIED: ["Modified", "معدّل"], CANCELLED: ["Cancelled", "ملغى"], NO_SHOW: ["No-show", "عدم حضور"], HOLD: ["Hold", "معلّق"], EXPIRED: ["Expired", "منتهي"]}; return ar ? (map[status]?.[1] ?? status) : (map[status]?.[0] ?? status); }
function arrivalLabel(status: string, ar: boolean) { if (status === "ARRIVED") return ar ? "تم الوصول" : "Arrived"; if (status === "EXPECTED") return ar ? "وصول متوقع" : "Expected"; return ar ? "وقت الوصول غير محدد" : "Arrival time not provided"; }
function paymentLabel(mode: string, ar: boolean) { if (mode === "PAY_NOW") return ar ? "دفع مسبق" : "Pay now"; return ar ? "دفع في الفندق" : "Pay at hotel"; }
function paymentStateLabel(state: string, ar: boolean) { const map: Record<string, [string, string]> = {NOT_REQUIRED: ["Not required", "غير مطلوب"], PENDING: ["Pending", "معلّق"], CAPTURED: ["Captured", "مدفوع"], FAILED: ["Failed", "فشل"], PARTIALLY_REFUNDED: ["Partially refunded", "مسترد جزئياً"], REFUNDED: ["Refunded", "مسترد"]}; return ar ? (map[state]?.[1] ?? state) : (map[state]?.[0] ?? state); }
function eventLabel(type: string, ar: boolean) { const map: Record<string, [string, string]> = {HOLD_CREATED: ["Hold created", "إنشاء حجز مؤقت"], CONFIRMED: ["Booking confirmed", "تأكيد الحجز"], MODIFIED: ["Reservation modified", "تعديل الحجز"], CANCELLED: ["Reservation cancelled / no-show settlement", "إلغاء الحجز / تسوية عدم الحضور"], EXPIRED: ["Hold expired", "انتهاء الحجز المؤقت"], PAYMENT_INITIATED: ["Payment initiated", "بدء الدفع"], PAYMENT_CAPTURED: ["Payment captured", "تأكيد الدفع"], PAYMENT_FAILED: ["Payment failed", "فشل الدفع"], REFUND_RECORDED: ["Refund recorded", "تسجيل استرداد"], ACCOUNT_LINKED: ["Account linked", "ربط الحساب"], ARRIVAL_UPDATED: ["Arrival updated", "تحديث الوصول"], REQUEST_CREATED: ["Guest request created", "إضافة طلب ضيف"], REQUEST_STATUS_UPDATED: ["Guest request updated", "تحديث طلب الضيف"], FRONT_DESK_NOTE_ADDED: ["Front desk note added", "إضافة ملاحظة استقبال"]}; return ar ? (map[type]?.[1] ?? type) : (map[type]?.[0] ?? type); }
function money(value: number, currency: string, locale: Locale) { return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {style: "currency", currency, maximumFractionDigits: 2}).format(value); }
function dateTime(value: string, locale: Locale) { return new Date(value).toLocaleString(locale === "ar" ? "ar-JO" : "en-GB", {dateStyle: "medium", timeStyle: "short"}); }
function operationKey(prefix: string) { const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; return `${prefix}:${uuid}`; }
function errorText(cause: unknown, ar: boolean) { if (cause instanceof Error) return cause.message; return ar ? "تعذر إكمال العملية." : "Unable to complete the operation."; }
async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, {...init, cache: "no-store"}); const body = await response.json().catch(() => null); if (response.status === 401) { window.location.assign(`/partner/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); throw new Error("Authentication required"); } if (!response.ok || body?.error) throw new Error(body?.error?.message ?? "Request failed"); return body.data as T; }
