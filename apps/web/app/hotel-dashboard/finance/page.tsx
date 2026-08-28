import {redirect} from "next/navigation";
import {AlertTriangle, Banknote, CalendarRange, CheckCircle2, CreditCard, ReceiptText, RotateCcw, WalletCards} from "lucide-react";
import {getHotelFinanceOverview, getHotelSettlementOverview, listUserHotels} from "@platform/server";
import {PartnerSidebar} from "@/components/partner-sidebar";
import {PartnerLanguageBar} from "@/components/partner-language-bar";
import {currentUser} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {direction} from "@/lib/i18n";
import {FinanceStatementForm} from "./finance-statement-form";
import {FinanceSettlementActions} from "./finance-settlement-actions";
import styles from "./settlement.module.css";

export const dynamic = "force-dynamic";

export default async function FinancePage({searchParams}: {searchParams: Promise<{hotelId?: string; days?: string}>}) {
  const user = await currentUser();
  if (!user) redirect("/partner/login");
  const [locale, query] = await Promise.all([requestLocale(), searchParams]);
  const ar = locale === "ar";
  const hotels = await listUserHotels(user.id);
  if (!hotels.length) redirect("/partner/onboarding");
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/hotel-dashboard");
  const days = Math.max(1, Math.min(Number(query.days ?? 30) || 30, 366));
  const [data, settlement] = await Promise.all([
    getHotelFinanceOverview(user.id, selected.id, days),
    getHotelSettlementOverview(user.id, selected.id, days),
  ]);
  const clean = settlement.current.issues.length === 0;

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={selected.id} hotelName={data.hotel.name} active="finance" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar">
        <div>
          <span className="partnerPageEyebrow">{ar ? "المالية والتسويات" : "Finance & settlement"}</span>
          <h1>{ar ? "المالية والدفعات" : "Finance & payouts"}</h1>
          <p>{ar ? "طابق التحصيل الفعلي مع الحجوزات، افصل عمولات الدفع في الفندق، وأنشئ دفعات موثقة للشريك دون خلطها مع الإيراد النظري." : "Reconcile actual collection against bookings, separate pay-at-hotel commission, and create auditable partner payouts without mixing them with theoretical revenue."}</p>
        </div>
        <FinanceStatementForm hotelId={selected.id} locale={locale}/>
      </div>

      <div className="partnerKpiGrid financeKpis">
        <Metric icon={<Banknote size={17}/>} label={ar ? "إجمالي الحجوزات" : "Booking gross"} value={money(data.totals.bookingGross, data.hotel.currency)}/>
        <Metric icon={<ReceiptText size={17}/>} label={ar ? "عمولة المنصة" : "Platform commission"} value={money(data.totals.platformCommission, data.hotel.currency)}/>
        <Metric icon={<WalletCards size={17}/>} label={ar ? "صافي دفعة الشريك" : "Partner payout net"} value={money(settlement.current.partnerNet, data.hotel.currency)}/>
        <Metric icon={<CreditCard size={17}/>} label={ar ? "عمولة الدفع في الفندق" : "Pay-at-hotel commission"} value={money(settlement.current.payAtHotelCommission, data.hotel.currency)}/>
      </div>

      <div className={styles.settlementGrid}>
        <section className={`partnerDataCard ${styles.summary}`}>
          <div className={styles.summaryHead}>
            <div><span className="partnerPageEyebrow">{ar ? "مطابقة التحصيل" : "Collection reconciliation"}</span><h2>{ar ? "هل الأموال جاهزة للدفع؟" : "Is the money payout-ready?"}</h2></div>
            <span className={`${styles.badge} ${clean ? styles.clean : styles.review}`}>{clean ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>} {clean ? (ar ? "مطابقة نظيفة" : "Clean") : (ar ? "تحتاج مراجعة" : "Review required")}</span>
          </div>
          <div className={styles.cards}>
            <SettlementCard label={ar ? "المتوقع تحصيله" : "Expected retained"} value={money(settlement.current.expectedCollected, data.hotel.currency)} helper={ar ? "بعد الإلغاءات والاستردادات المستحقة" : "after cancellation/refund entitlement"}/>
            <SettlementCard label={ar ? "المحتفظ به فعلياً" : "Actually retained"} value={money(settlement.current.actualCollected, data.hotel.currency)} helper={ar ? "بطاقة + محفظة - استردادات مكتملة" : "card + wallet - completed refunds"}/>
            <SettlementCard label={ar ? "فرق المطابقة" : "Collection variance"} value={money(settlement.current.collectionVariance, data.hotel.currency)} helper={ar ? "يجب أن يساوي صفر قبل الدفعة" : "must be zero before payout"}/>
            <SettlementCard label={ar ? "استردادات مكتملة" : "Completed refunds"} value={money(settlement.current.completedRefunds, data.hotel.currency)} helper={ar ? "مزود الدفع + المحفظة" : "provider + wallet"}/>
            <SettlementCard label={ar ? "حجوزات مؤهلة" : "Payout bookings"} value={String(settlement.current.eligibleBookingCount)} helper="PAY_NOW"/>
            <SettlementCard label={ar ? "دفع في الفندق" : "Pay at hotel"} value={String(settlement.current.payAtHotelBookingCount)} helper={ar ? "عمولتها منفصلة" : "commission kept separate"}/>
          </div>
          {!clean && <div className={styles.issueBox}><strong>{ar ? `${settlement.current.issues.length} مشكلة تمنع إنشاء الدفعة` : `${settlement.current.issues.length} issue(s) block payout creation`}</strong><div className={styles.issues}>{settlement.current.issues.slice(0, 12).map((issue, index) => <article key={`${issue.bookingId}-${issue.code}-${index}`}><b>{issue.reference} · {issue.code}</b><span>{issue.message}</span></article>)}</div></div>}
        </section>

        <FinanceSettlementActions hotelId={selected.id} locale={locale} initialFrom={settlement.current.period.from} initialTo={settlement.current.period.to}/>
      </div>

      <div className="financeGrid">
        <section className="partnerDataCard">
          <span className="partnerPageEyebrow">{ar ? "دفعات الشريك" : "Partner payouts"}</span>
          <h2>{ar ? "دفعات قابلة للتدقيق" : "Auditable payout queue"}</h2>
          <p>{ar ? "إنشاء الدفعة لا يعني أنها دُفعت. تبقى READY حتى يؤكد مسؤول المنصة التحويل الخارجي." : "Creating a payout never marks it paid. It remains READY until a platform administrator confirms the external transfer."}</p>
          {settlement.payouts.length === 0 ? <div className="partnerEmpty">{ar ? "لا توجد دفعات بعد." : "No payouts yet."}</div> : <div className={styles.history}>{settlement.payouts.map((payout) => <article key={payout.id}><div><strong>{payout.payoutNumber}</strong><small>{date(payout.periodStart)} → {date(payout.periodEnd)} · {ar ? "صافي" : "net"} {money(payout.partnerNet, payout.currency)}</small></div><span className={`${styles.status} ${payout.status === "PAID" ? styles.statusPaid : payout.status === "READY" ? styles.statusReady : styles.statusVoid}`}>{payout.status}</span></article>)}</div>}
        </section>

        <section className="partnerDataCard">
          <span className="partnerPageEyebrow">{ar ? "سجل المطابقة" : "Reconciliation history"}</span>
          <h2>{ar ? "كل تشغيل محفوظ" : "Every run is retained"}</h2>
          {settlement.reconciliations.length === 0 ? <div className="partnerEmpty">{ar ? "لم يتم تشغيل مطابقة بعد." : "No reconciliation run yet."}</div> : <div className={styles.reconList}>{settlement.reconciliations.slice(0, 10).map((run) => <article key={run.id}><div><strong>{run.reconciliationNumber}</strong><small>{date(run.periodStart)} → {date(run.periodEnd)} · {money(run.partnerNet, run.currency)}</small></div><span>{run.status === "CLEAN" ? (ar ? "نظيف" : "CLEAN") : `${run.issueCount} ${ar ? "مشكلة" : "issues"}`}</span></article>)}</div>}
        </section>
      </div>

      <div className="financeGrid">
        <section className="partnerDataCard">
          <span className="partnerPageEyebrow">{ar ? "تفصيل السجل" : "Ledger breakdown"}</span>
          <h2>{ar ? "ماذا حدث مالياً؟" : "What moved financially?"}</h2>
          <div className="financeRows">
            <Row label={ar ? "أساس الغرفة" : "Room base"} value={money(data.totals.roomBase, data.hotel.currency)}/>
            <Row label={ar ? "رسوم الخدمة" : "Service charge"} value={money(data.totals.serviceAmount, data.hotel.currency)}/>
            <Row label={ar ? "الضريبة والرسوم" : "Tax / charges"} value={money(data.totals.taxAmount, data.hotel.currency)}/>
            <Row label={ar ? "تعديلات الإلغاء" : "Cancellation adjustments"} value={money(data.totals.cancellationAdjustments, data.hotel.currency)}/>
            <Row label={ar ? "المبالغ المستردة المسجلة" : "Refund ledger"} value={money(data.totals.refunds, data.hotel.currency)}/>
            <Row label={ar ? "عدد الأحداث المالية" : "Financial events"} value={String(data.totals.eventCount)}/>
          </div>
        </section>
        <section className="partnerDataCard">
          <span className="partnerPageEyebrow">{ar ? "الكشوف" : "Statements"}</span>
          <h2>{ar ? "كشوف مالية مؤرشفة" : "Issued finance statements"}</h2>
          {data.statements.length === 0 ? <div className="partnerEmpty">{ar ? "لم يتم إصدار كشف بعد." : "No statement has been issued yet."}</div> : <div className="statementList">{data.statements.map((statement) => <article key={statement.id}><div><strong>{statement.statementNumber}</strong><small>{date(statement.periodStart)} → {date(statement.periodEnd)}</small></div><div><b>{money(statement.bookingGross, statement.currency)}</b><span>{statement.status}</span></div></article>)}</div>}
        </section>
      </div>

      <section className="partnerDataCard">
        <span className="partnerPageEyebrow">{ar ? "الحجوزات" : "Reservations"}</span>
        <h2>{ar ? "أحدث الحركة التجارية" : "Recent commercial activity"}</h2>
        <div className="financeBookingList">{data.recentBookings.map((booking) => <article key={booking.id}><div><strong>{booking.reference}</strong><span>{booking.guestName}</span></div><span>{booking.status}</span><span>{booking.paymentMode} · {booking.paymentState}</span><b>{money(booking.totalAmount, booking.currency)}</b><small>{ar ? "عمولة" : "Commission"} {money(booking.commissionAmount, booking.currency)}</small></article>)}</div>
      </section>

      <div className="partnerPageIntro"><strong>{ar ? "قاعدة التسوية" : "Settlement rule"}</strong><span>{ar ? "الدفعات تعتمد تاريخ المغادرة والتحصيل الفعلي. عمولة PAY_AT_HOTEL تظهر كذمة على الفندق ولا تُخصم خفية من تحويلات PAY_NOW." : "Payouts use departure date and actual retained collection. PAY_AT_HOTEL commission is exposed as a separate receivable and is never silently netted from PAY_NOW transfers."}</span><CalendarRange size={18}/></div>
    </section>
  </main>;
}

function Metric({icon, label, value}: {icon: React.ReactNode; label: string; value: string}) {return <div><span className="financeMetricLabel">{icon}{label}</span><strong>{value}</strong></div>}
function Row({label, value}: {label: string; value: string}) {return <div><span>{label}</span><strong>{value}</strong></div>}
function SettlementCard({label, value, helper}: {label: string; value: string; helper: string}) {return <div className={styles.card}><span>{label}</span><strong>{value}</strong><small>{helper}</small></div>}
function money(value: number, currency: string) {return `${Number(value).toFixed(2)} ${currency}`}
function date(value: Date) {return value.toISOString().slice(0, 10)}
