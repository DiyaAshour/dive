import {redirect} from "next/navigation";
import {AlertTriangle, Banknote, Building2, CalendarRange, CheckCircle2, CreditCard, Landmark, ReceiptText, ShieldCheck, WalletCards} from "lucide-react";
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

  const current = settlement.current;
  const clean = current.issues.length === 0;
  const issueBookingIds = new Set(current.issues.map((issue) => issue.bookingId));
  const recentById = new Map(data.recentBookings.map((booking) => [booking.id, booking]));
  const hotelCollectedGross = moneySum(current.lines.filter((line) => line.paymentMode === "PAY_AT_HOTEL").map((line) => line.expectedRetained));
  const payNowGross = moneySum(current.lines.filter((line) => line.paymentMode === "PAY_NOW").map((line) => line.totalAmount));
  const platformOwesHotel = roundMoney(current.partnerNet);
  const hotelOwesPlatform = roundMoney(current.payAtHotelCommission);
  const relationshipBalance = roundMoney(platformOwesHotel - hotelOwesPlatform);

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={selected.id} hotelName={data.hotel.name} active="finance" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>

      <div className="partnerTopbar">
        <div>
          <span className="partnerPageEyebrow">HandMeKey Hotels · Finance</span>
          <h1>{ar ? "المالية والتسويات" : "Finance & settlements"}</h1>
          <p>{ar ? "اعرف فوراً من استلم أموال كل حجز، عمولة HandMeKey، مستحقات الفندق، والمبالغ المستحقة على الفندق بدون قراءة أرقام مبهمة." : "See who collected each booking, HandMeKey commission, hotel payables and hotel receivables without decoding accounting jargon."}</p>
        </div>
        <FinanceStatementForm hotelId={selected.id} locale={locale}/>
      </div>

      <section className={styles.filterCard}>
        <form method="get" className={styles.filters}>
          <label>
            <span>{ar ? "الفندق" : "Property"}</span>
            <select name="hotelId" defaultValue={selected.id}>{hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}</select>
          </label>
          <label>
            <span>{ar ? "الفترة" : "Period"}</span>
            <select name="days" defaultValue={String(days)}>
              <option value="7">{ar ? "آخر 7 أيام" : "Last 7 days"}</option>
              <option value="30">{ar ? "آخر 30 يوم" : "Last 30 days"}</option>
              <option value="60">{ar ? "آخر 60 يوم" : "Last 60 days"}</option>
              <option value="90">{ar ? "آخر 90 يوم" : "Last 90 days"}</option>
              <option value="180">{ar ? "آخر 180 يوم" : "Last 180 days"}</option>
              <option value="365">{ar ? "آخر سنة" : "Last year"}</option>
            </select>
          </label>
          <button type="submit" className={styles.viewButton}>{ar ? "عرض المالية" : "View finance"}</button>
        </form>
        <div className={styles.propertyStrip}>
          <div><Building2 size={16}/><span><strong>{data.hotel.name}</strong><small>{current.period.from} → {current.period.to}</small></span></div>
          <div><ShieldCheck size={16}/><span><strong>{clean ? (ar ? "مطابقة نظيفة" : "Clean reconciliation") : (ar ? "تحتاج مراجعة" : "Review required")}</strong><small>{clean ? (ar ? "لا توجد مشاكل تمنع الدفعة" : "No payout-blocking issues") : `${current.issues.length} ${ar ? "مشكلة" : "issue(s)"}`}</small></span></div>
        </div>
      </section>

      <section className={styles.balanceHero}>
        <div className={styles.balanceMain}>
          <span className="partnerPageEyebrow">{ar ? "رصيد العلاقة المالي" : "Financial relationship balance"}</span>
          <h2>{balanceLabel(relationshipBalance, data.hotel.name, ar)}</h2>
          <strong className={relationshipBalance < 0 ? styles.receivable : styles.payable}>{money(Math.abs(relationshipBalance), data.hotel.currency, locale)}</strong>
          <p>{ar ? "هذا الصافي للوضوح فقط. عمولة PAY_AT_HOTEL تبقى ذمة منفصلة ولا تُخصم تلقائياً من تحويلات PAY_NOW." : "This net position is informational only. PAY_AT_HOTEL commission stays a separate receivable and is never silently deducted from PAY_NOW transfers."}</p>
        </div>
        <div className={styles.balanceBreakdown}>
          <article><WalletCards size={17}/><span><small>{ar ? "HandMeKey يدين للفندق" : "HandMeKey owes hotel"}</small><strong>{money(platformOwesHotel, data.hotel.currency, locale)}</strong><em>{ar ? "صافي حجوزات PAY_NOW" : "PAY_NOW partner net"}</em></span></article>
          <article><Landmark size={17}/><span><small>{ar ? "الفندق يدين لـHandMeKey" : "Hotel owes HandMeKey"}</small><strong>{money(hotelOwesPlatform, data.hotel.currency, locale)}</strong><em>{ar ? "عمولة PAY_AT_HOTEL" : "PAY_AT_HOTEL commission"}</em></span></article>
        </div>
      </section>

      <section className={styles.metricGrid}>
        <Metric icon={<Banknote size={16}/>} label={ar ? "قيمة الحجوزات" : "Booking gross"} value={money(data.totals.bookingGross, data.hotel.currency, locale)} sub={ar ? "إجمالي النشاط المالي للفترة" : "Gross financial activity in period"}/>
        <Metric icon={<WalletCards size={16}/>} label={ar ? "حجوزات PAY_NOW" : "PAY_NOW gross"} value={money(payNowGross, data.hotel.currency, locale)} sub={`${current.eligibleBookingCount} ${ar ? "حجز" : "booking(s)"}`}/>
        <Metric icon={<CreditCard size={16}/>} label={ar ? "احتفظ بها HandMeKey فعلياً" : "Actually retained by HandMeKey"} value={money(current.actualCollected, data.hotel.currency, locale)} sub={ar ? "بطاقة + محفظة - الاستردادات" : "card + wallet - completed refunds"}/>
        <Metric icon={<Landmark size={16}/>} label={ar ? "حصّلها الفندق" : "Collected by hotel"} value={money(hotelCollectedGross, data.hotel.currency, locale)} sub={`${current.payAtHotelBookingCount} PAY_AT_HOTEL`}/>
        <Metric icon={<ReceiptText size={16}/>} label={ar ? "عمولة HandMeKey" : "HandMeKey commission"} value={money(current.platformCommission + current.payAtHotelCommission, data.hotel.currency, locale)} sub={ar ? "عمولة PAY_NOW + PAY_AT_HOTEL" : "PAY_NOW + PAY_AT_HOTEL commission"}/>
        <Metric icon={<Banknote size={16}/>} label={ar ? "صافي مستحق للفندق" : "Hotel payable"} value={money(platformOwesHotel, data.hotel.currency, locale)} sub={ar ? "مبلغ التحويل قبل تأكيد الدفع" : "Partner payout before transfer confirmation"}/>
      </section>

      <div className={styles.settlementGrid}>
        <section className={`partnerDataCard ${styles.summary}`}>
          <div className={styles.summaryHead}>
            <div><span className="partnerPageEyebrow">{ar ? "مطابقة التحصيل" : "Collection reconciliation"}</span><h2>{ar ? "هل أموال PAY_NOW جاهزة للتحويل؟" : "Is PAY_NOW money payout-ready?"}</h2></div>
            <span className={`${styles.badge} ${clean ? styles.clean : styles.review}`}>{clean ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>} {clean ? (ar ? "مطابقة نظيفة" : "Clean") : (ar ? "تحتاج مراجعة" : "Review required")}</span>
          </div>
          <div className={styles.cards}>
            <SettlementCard label={ar ? "المتوقع الاحتفاظ به" : "Expected retained"} value={money(current.expectedCollected, data.hotel.currency, locale)} helper={ar ? "بعد الإلغاءات والاستردادات المستحقة" : "after cancellation/refund entitlement"}/>
            <SettlementCard label={ar ? "المحتفظ به فعلياً" : "Actually retained"} value={money(current.actualCollected, data.hotel.currency, locale)} helper={ar ? "بطاقة + محفظة - الاستردادات" : "card + wallet - refunds"}/>
            <SettlementCard label={ar ? "فرق المطابقة" : "Collection variance"} value={money(current.collectionVariance, data.hotel.currency, locale)} helper={ar ? "يجب أن يساوي صفر قبل الدفعة" : "must be zero before payout"}/>
            <SettlementCard label={ar ? "الاستردادات المكتملة" : "Completed refunds"} value={money(current.completedRefunds, data.hotel.currency, locale)} helper={ar ? "مزود الدفع + المحفظة" : "provider + wallet"}/>
            <SettlementCard label={ar ? "عمولة PAY_NOW" : "PAY_NOW commission"} value={money(current.platformCommission, data.hotel.currency, locale)} helper={ar ? "تُحجز من تحويل الفندق" : "withheld from hotel payout"}/>
            <SettlementCard label={ar ? "عمولة PAY_AT_HOTEL" : "PAY_AT_HOTEL commission"} value={money(current.payAtHotelCommission, data.hotel.currency, locale)} helper={ar ? "ذمة منفصلة على الفندق" : "separate hotel receivable"}/>
          </div>
          {!clean && <div className={styles.issueBox}><strong>{ar ? `${current.issues.length} مشكلة تمنع إنشاء الدفعة` : `${current.issues.length} issue(s) block payout creation`}</strong><div className={styles.issues}>{current.issues.slice(0, 12).map((issue, index) => <article key={`${issue.bookingId}-${issue.code}-${index}`}><b>{issue.reference} · {issue.code}</b><span>{issue.message}</span></article>)}</div></div>}
        </section>

        <FinanceSettlementActions hotelId={selected.id} locale={locale} initialFrom={current.period.from} initialTo={current.period.to}/>
      </div>

      <section className={`partnerDataCard ${styles.bookingPanel}`}>
        <div className={styles.bookingHead}>
          <div><span className="partnerPageEyebrow">{ar ? "تفصيل الحجوزات" : "Booking breakdown"}</span><h2>{ar ? "من استلم المال؟ ومن يدين لمن؟" : "Who collected, and who owes whom?"}</h2><p>{ar ? "كل صف يشرح الحجز مالياً: التحصيل، العمولة، المبلغ المستحق للفندق أو المستحق لـHandMeKey." : "Every row explains the booking financially: collector, commission, hotel payable and HandMeKey receivable."}</p></div>
        </div>
        {current.lines.length ? <div className={styles.tableWrap}><table className={styles.financeTable}>
          <thead><tr><th>{ar ? "الحجز" : "Booking"}</th><th>{ar ? "الحالة" : "Status"}</th><th>{ar ? "التحصيل" : "Collected by"}</th><th>{ar ? "الإجمالي" : "Gross"}</th><th>{ar ? "العمولة" : "Commission"}</th><th>{ar ? "مستحق للفندق" : "Hotel payable"}</th><th>{ar ? "مستحق لـHandMeKey" : "HMK receivable"}</th><th>{ar ? "الوضع" : "Position"}</th></tr></thead>
          <tbody>{current.lines.map((line) => {
            const recent = recentById.get(line.bookingId);
            const payNow = line.paymentMode === "PAY_NOW";
            const hasIssue = issueBookingIds.has(line.bookingId);
            return <tr key={line.bookingId}>
              <td><strong>{line.reference}</strong><small>{recent?.guestName ?? dateValue(line.departure)} · {ar ? "مغادرة" : "departure"} {dateValue(line.departure)}</small></td>
              <td><span className={styles.bookingStatus}>{line.status.replaceAll("_", " ")}</span><small>{line.paymentState.replaceAll("_", " ")}</small></td>
              <td><strong>{payNow ? "HandMeKey" : data.hotel.name}</strong><small>{line.paymentMode}</small></td>
              <td className={styles.moneyCell}><strong>{money(line.totalAmount, data.hotel.currency, locale)}</strong>{payNow && <small>{ar ? "محتفظ فعلياً" : "retained"} {money(line.actualRetained, data.hotel.currency, locale)}</small>}</td>
              <td className={styles.moneyCell}><strong>{money(line.commissionDue, data.hotel.currency, locale)}</strong></td>
              <td className={styles.moneyCell}>{money(payNow ? line.partnerNet : 0, data.hotel.currency, locale)}</td>
              <td className={styles.moneyCell}>{money(payNow ? 0 : line.commissionDue, data.hotel.currency, locale)}</td>
              <td>{hasIssue ? <span className={`${styles.positionBadge} ${styles.positionReview}`}>{ar ? "مراجعة" : "Review"}</span> : payNow ? <span className={`${styles.positionBadge} ${styles.positionPayable}`}>{ar ? "يدفع للفندق" : "Hotel payable"}</span> : <span className={`${styles.positionBadge} ${styles.positionReceivable}`}>{ar ? "عمولة مستحقة" : "Commission due"}</span>}</td>
            </tr>;
          })}</tbody>
        </table></div> : <div className="partnerEmpty">{ar ? "لا توجد حجوزات مالية في هذه الفترة." : "No financial bookings in this period."}</div>}
      </section>

      <div className="financeGrid">
        <section className="partnerDataCard">
          <span className="partnerPageEyebrow">{ar ? "دفعات الفندق" : "Hotel payouts"}</span>
          <h2>{ar ? "تحويلات PAY_NOW" : "PAY_NOW payout queue"}</h2>
          <p>{ar ? "إنشاء الدفعة لا يعني أنها دُفعت. تبقى READY حتى يؤكد مسؤول المنصة التحويل الخارجي." : "Creating a payout does not mean it was paid. It stays READY until a platform administrator confirms the external transfer."}</p>
          {settlement.payouts.length === 0 ? <div className="partnerEmpty">{ar ? "لا توجد دفعات بعد." : "No payouts yet."}</div> : <div className={styles.history}>{settlement.payouts.map((payout) => <article key={payout.id}><div><strong>{payout.payoutNumber}</strong><small>{dateValue(payout.periodStart)} → {dateValue(payout.periodEnd)} · {ar ? "صافي" : "net"} {money(payout.partnerNet, payout.currency, locale)}</small></div><span className={`${styles.status} ${payout.status === "PAID" ? styles.statusPaid : payout.status === "READY" ? styles.statusReady : styles.statusVoid}`}>{payout.status}</span></article>)}</div>}
        </section>

        <section className="partnerDataCard">
          <span className="partnerPageEyebrow">{ar ? "سجل المطابقة" : "Reconciliation history"}</span>
          <h2>{ar ? "كل تشغيل محفوظ" : "Every run is retained"}</h2>
          {settlement.reconciliations.length === 0 ? <div className="partnerEmpty">{ar ? "لم يتم تشغيل مطابقة بعد." : "No reconciliation run yet."}</div> : <div className={styles.reconList}>{settlement.reconciliations.slice(0, 10).map((run) => <article key={run.id}><div><strong>{run.reconciliationNumber}</strong><small>{dateValue(run.periodStart)} → {dateValue(run.periodEnd)} · {money(run.partnerNet, run.currency, locale)}</small></div><span>{run.status === "CLEAN" ? (ar ? "نظيف" : "CLEAN") : `${run.issueCount} ${ar ? "مشكلة" : "issues"}`}</span></article>)}</div>}
        </section>
      </div>

      <div className="financeGrid">
        <section className="partnerDataCard">
          <span className="partnerPageEyebrow">{ar ? "تفصيل السجل" : "Ledger breakdown"}</span>
          <h2>{ar ? "ماذا حدث مالياً؟" : "What moved financially?"}</h2>
          <div className="financeRows">
            <Row label={ar ? "أساس الغرفة" : "Room base"} value={money(data.totals.roomBase, data.hotel.currency, locale)}/>
            <Row label={ar ? "رسوم الخدمة" : "Service charge"} value={money(data.totals.serviceAmount, data.hotel.currency, locale)}/>
            <Row label={ar ? "الضريبة والرسوم" : "Tax / charges"} value={money(data.totals.taxAmount, data.hotel.currency, locale)}/>
            <Row label={ar ? "تعديلات الإلغاء" : "Cancellation adjustments"} value={money(data.totals.cancellationAdjustments, data.hotel.currency, locale)}/>
            <Row label={ar ? "المبالغ المستردة المسجلة" : "Refund ledger"} value={money(data.totals.refunds, data.hotel.currency, locale)}/>
            <Row label={ar ? "عدد الأحداث المالية" : "Financial events"} value={String(data.totals.eventCount)}/>
          </div>
        </section>
        <section className="partnerDataCard">
          <span className="partnerPageEyebrow">{ar ? "الكشوف" : "Statements"}</span>
          <h2>{ar ? "كشوف مالية مؤرشفة" : "Issued finance statements"}</h2>
          {data.statements.length === 0 ? <div className="partnerEmpty">{ar ? "لم يتم إصدار كشف بعد." : "No statement has been issued yet."}</div> : <div className="statementList">{data.statements.map((statement) => <article key={statement.id}><div><strong>{statement.statementNumber}</strong><small>{dateValue(statement.periodStart)} → {dateValue(statement.periodEnd)}</small></div><div><b>{money(statement.bookingGross, statement.currency, locale)}</b><span>{statement.status}</span></div></article>)}</div>}
        </section>
      </div>

      <div className="partnerPageIntro"><strong>{ar ? "قاعدة التسوية" : "Settlement rule"}</strong><span>{ar ? "PAY_NOW: HandMeKey يحصّل ثم يدفع صافي حصة الفندق بعد العمولة. PAY_AT_HOTEL: الفندق يحصّل وعمولة HandMeKey تظهر كذمة منفصلة على الفندق." : "PAY_NOW: HandMeKey collects and pays the hotel net after commission. PAY_AT_HOTEL: the hotel collects and HandMeKey commission appears as a separate hotel receivable."}</span><CalendarRange size={18}/></div>
    </section>
  </main>;
}

function Metric({icon, label, value, sub}: {icon: React.ReactNode; label: string; value: string; sub: string}) {return <article className={styles.metricCard}><span>{icon}{label}</span><strong>{value}</strong><small>{sub}</small></article>}
function Row({label, value}: {label: string; value: string}) {return <div><span>{label}</span><strong>{value}</strong></div>}
function SettlementCard({label, value, helper}: {label: string; value: string; helper: string}) {return <div className={styles.card}><span>{label}</span><strong>{value}</strong><small>{helper}</small></div>}
function money(value: number, currency: string, locale: "en" | "ar") {return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {style: "currency", currency, maximumFractionDigits: 2}).format(Number(value))}
function moneySum(values: readonly number[]) {return roundMoney(values.reduce((sum, value) => sum + Number(value), 0))}
function roundMoney(value: number) {return Math.round((Number(value) + Number.EPSILON) * 100) / 100}
function dateValue(value: Date | string) {return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10)}
function balanceLabel(balance: number, hotelName: string, ar: boolean) {
  if (balance > 0.009) return ar ? `HandMeKey يدين لـ ${hotelName}` : `HandMeKey owes ${hotelName}`;
  if (balance < -0.009) return ar ? `${hotelName} يدين لـ HandMeKey` : `${hotelName} owes HandMeKey`;
  return ar ? "الحساب متوازن" : "Account is balanced";
}
