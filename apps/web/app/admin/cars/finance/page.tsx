import Link from "next/link";
import {redirect} from "next/navigation";
import {AlertTriangle, Banknote, Building2, CalendarRange, CarFront, CheckCircle2, CircleDollarSign, Landmark, LockKeyhole, ReceiptText, ShieldCheck, WalletCards} from "lucide-react";
import {getAdminCarFinancePeriods, getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {createCarSettlementAction, markCarSettlementPaidAction} from "./actions";
import carsStyles from "../cars-admin.module.css";
import styles from "./finance.module.css";

export const dynamic = "force-dynamic";
export const metadata = {title: "Cars Finance & Settlements · HandMeKey Admin"};

type FinanceSearchParams = {
  companyId?: string;
  month?: string;
  from?: string;
  to?: string;
  financeError?: string;
  closed?: string;
  paid?: string;
};

export default async function AdminCarFinancePage({searchParams}: {searchParams: Promise<FinanceSearchParams>}) {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fcars%2Ffinance");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const query = await searchParams;
  const filters: {companyId?: string; from?: string; to?: string} = {};
  if (query.companyId) filters.companyId = query.companyId;
  const selectedMonth = validMonth(query.month) ? query.month : null;
  if (selectedMonth) {
    const bounds = monthBounds(selectedMonth);
    filters.from = bounds.from;
    filters.to = bounds.to;
  } else {
    if (query.from) filters.from = query.from;
    if (query.to) filters.to = query.to;
  }

  const [finance, counts] = await Promise.all([
    getAdminCarFinancePeriods(principal.user.id, filters),
    getAdminNavigationCounts(principal.user.id),
  ]);

  const company = finance.selectedCompany;
  const m = finance.metrics;
  const currency = company?.currency ?? "JOD";
  const monthValue = finance.period.from.slice(0, 7);
  const currentMonth = new Date().toISOString().slice(0, 7);

  return <AdminShell locale={locale} principal={principal} active="cars" counts={counts}>
    <header className="adminTopbar">
      <div><span className="eyebrow">HandMeKey Cars · Finance</span><h1>{ar ? "المالية والتسويات" : "Finance & settlements"}</h1><p>{ar ? "كل شهر مالي مستقل: اقفل الشهر بعد انتهائه، وارجع لأي شهر سابق من السجل بدون خلط الحجوزات الجديدة بالقديمة." : "Each finance month is separate: close it after month-end and reopen any archived month without mixing old bookings with new ones."}</p></div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{ar ? "دفتر مالي شهري قابل للتدقيق" : "Auditable monthly ledger"}</strong><small>{ar ? "كل تسوية وحركة مرتبطة بالحجز" : "Every settlement traces back to bookings"}</small></span></div>
    </header>

    <nav className={carsStyles.tabs} aria-label={ar ? "إدارة السيارات" : "Cars admin"}>
      <Link href="/admin/cars"><CarFront size={15}/>{ar ? "نظرة عامة" : "Overview"}</Link>
      <Link href="/admin/cars/companies"><Building2 size={15}/>{ar ? "الشركات" : "Companies"}</Link>
      <Link href="/admin/cars/reservations"><CalendarRange size={15}/>{ar ? "كل الحجوزات" : "All reservations"}</Link>
      <Link className={carsStyles.active} href="/admin/cars/finance"><CircleDollarSign size={15}/>{ar ? "المالية" : "Finance"}</Link>
    </nav>

    {query.financeError ? <div className={styles.errorBanner}><AlertTriangle size={18}/><div><strong>{ar ? "تعذر إغلاق الفترة" : "Finance action could not complete"}</strong><span>{query.financeError}</span></div></div> : null}
    {query.closed ? <div className={styles.successBanner}><CheckCircle2 size={18}/><div><strong>{ar ? "تم إغلاق الشهر المالي" : "Finance month closed"}</strong><span>{ar ? `تم حفظ الفترة في الأرشيف: ${query.closed}` : `Archived as ${query.closed}`}</span></div></div> : null}
    {query.paid ? <div className={styles.successBanner}><CheckCircle2 size={18}/><div><strong>{ar ? "تم تسجيل التسوية كمدفوعة" : "Settlement marked paid"}</strong><span>{query.paid}</span></div></div> : null}

    <section className={styles.filterCard}>
      <form method="get" className={styles.monthFilters}>
        <label><span>{ar ? "شركة التأجير" : "Rental company"}</span><select name="companyId" defaultValue={company?.id ?? ""}>{finance.companies.map((item) => <option key={item.id} value={item.id}>{item.name} · {(item.commissionRate * 100).toFixed(1)}%</option>)}</select></label>
        <label><span>{ar ? "الشهر المالي" : "Finance month"}</span><input type="month" name="month" defaultValue={monthValue}/></label>
        <button className="primaryButton" type="submit">{ar ? "عرض الشهر" : "View month"}</button>
      </form>
      {company && <div className={styles.companyStrip}><div><Building2 size={16}/><span><strong>{company.name}</strong><small>{company.status} · {company.verified ? (ar ? "موثقة" : "Verified") : (ar ? "غير موثقة" : "Not verified")}</small></span></div><div><ReceiptText size={16}/><span><strong>{(company.commissionRate * 100).toFixed(2)}%</strong><small>{ar ? "نسبة العمولة الحالية" : "Current commission rate"}</small></span></div></div>}
    </section>

    {company ? <section className={styles.periodNavigator}>
      <div className={styles.periodStatus}>
        <CalendarRange size={18}/><span><small>{ar ? "الفترة المعروضة" : "Viewing period"}</small><strong>{formatMonth(finance.period.from, locale)}</strong></span>
        {finance.periodClosed ? <span className={styles.closedBadge}><LockKeyhole size={13}/>{ar ? "مغلق" : "Closed"}</span> : <span className={styles.openBadge}>{ar ? "مفتوح" : "Open"}</span>}
      </div>
      <div className={styles.periodLinks}>
        <Link className={monthValue === currentMonth ? styles.activeMonth : ""} href={`/admin/cars/finance?companyId=${company.id}&month=${currentMonth}`}>{ar ? "الشهر الحالي" : "Current month"}</Link>
        {finance.closedPeriods.slice(0, 12).map((period) => {
          const periodMonth = period.periodStart.slice(0, 7);
          return <Link className={periodMonth === monthValue ? styles.activeMonth : ""} key={period.id} href={`/admin/cars/finance?companyId=${company.id}&month=${periodMonth}`}><LockKeyhole size={12}/>{formatMonth(period.periodStart, locale)}</Link>;
        })}
      </div>
    </section> : null}

    {!company ? <section className={carsStyles.panel}><div className={carsStyles.empty}>{ar ? "لا توجد شركات سيارات بعد." : "No car rental companies exist yet."}</div></section> : <>
      <section className={styles.balanceHero}>
        <div><span className="eyebrow">{ar ? "الرصيد الحالي" : "Current account balance"}</span><h2>{balanceLabel(m.accountBalance, company.name, ar)}</h2><strong className={m.accountBalance < 0 ? styles.receivable : styles.payable}>{formatMoney(Math.abs(m.accountBalance), currency, locale)}</strong><p>{ar ? "الحجوزات المعروضة محسوبة لهذا الشهر فقط، بينما رصيد الدفتر يتتبع الحساب المفتوح بين الطرفين." : "Booking figures are isolated to this month while the ledger balance tracks the open account between both parties."}</p></div>
        <div className={styles.balanceBreakdown}><span><small>{ar ? "غير مسوّى لهذا الشهر" : "This month unsettled"}</small><strong>{formatSignedMoney(m.unsettledNet, currency, locale)}</strong></span><span><small>{ar ? "دفتر التسويات" : "Settlement ledger"}</small><strong>{formatSignedMoney(m.ledgerBalance, currency, locale)}</strong></span></div>
      </section>

      <section className={styles.metricGrid}>
        <Metric icon={<CalendarRange size={16}/>} label={ar ? "حجوزات مالية" : "Financial bookings"} value={String(m.bookingCount)} sub={`${m.unsettledBookingCount} ${ar ? "غير مسوّاة" : "unsettled"}`}/>
        <Metric icon={<Banknote size={16}/>} label={ar ? "قيمة الحجوزات" : "Gross booking value"} value={formatMoney(m.grossBookingValue, currency, locale)} sub={ar ? "لهذا الشهر فقط" : "This month only"}/>
        <Metric icon={<WalletCards size={16}/>} label={ar ? "حصّلها HandMeKey" : "Collected by HandMeKey"} value={formatMoney(m.platformCollected, currency, locale)} sub={ar ? "يُدفع للشركة صافي حصتها" : "Partner share becomes payable"}/>
        <Metric icon={<Landmark size={16}/>} label={ar ? "حصّلتها الشركة" : "Collected by company"} value={formatMoney(m.companyCollected, currency, locale)} sub={ar ? "تصبح العمولة مستحقة لنا" : "Commission becomes receivable"}/>
        <Metric icon={<CircleDollarSign size={16}/>} label={ar ? "عمولة HandMeKey" : "HandMeKey commission"} value={formatMoney(m.platformCommission, currency, locale)} sub={ar ? "لهذا الشهر" : "For this month"}/>
        <Metric icon={<Banknote size={16}/>} label={ar ? "مستحق للشركة" : "Company payable"} value={formatMoney(m.companyPayable, currency, locale)} sub={ar ? "بعد خصم العمولة" : "After withholding commission"}/>
        <Metric icon={<ReceiptText size={16}/>} label={ar ? "عمولة على الشركة" : "Commission receivable"} value={formatMoney(m.commissionReceivable, currency, locale)} sub={ar ? "من مبالغ حصّلتها الشركة" : "From company-collected bookings"}/>
      </section>

      <div className={styles.twoColumn}>
        <section className={carsStyles.panel}>
          <div className={carsStyles.panelHeader}><div><span className="eyebrow">{ar ? "إغلاق الشهر" : "Month close"}</span><h2>{ar ? `إغلاق ${formatMonth(finance.period.from, locale)}` : `Close ${formatMonth(finance.period.from, locale)}`}</h2><p>{ar ? "بعد الإغلاق تصبح حجوزات هذا الشهر محفوظة في الأرشيف، ويبدأ الشهر التالي لوحده." : "After closing, this month's bookings remain archived and the next month starts on its own."}</p></div></div>
          {finance.periodClosed && finance.periodSettlement ? <div className={styles.closedPeriodCard}><LockKeyhole size={21}/><div><strong>{ar ? "هذا الشهر مغلق" : "This month is closed"}</strong><span>{finance.periodSettlement.settlementNumber} · {finance.periodSettlement.bookingCount} {ar ? "حجز" : "bookings"} · {finance.periodSettlement.status}</span><small>{ar ? "يمكنك الرجوع إليه في أي وقت من الأشهر المغلقة أعلاه." : "You can return to it at any time from Closed periods above."}</small></div></div> : finance.canClosePeriod ? <form action={createCarSettlementAction} className={styles.settlementForm}>
            <input type="hidden" name="companyId" value={company.id}/>
            <input type="hidden" name="periodStart" value={finance.period.from}/>
            <input type="hidden" name="periodEnd" value={finance.period.to}/>
            <div className={styles.periodDates}><span><small>{ar ? "من" : "From"}</small><strong>{finance.period.from}</strong></span><span><small>{ar ? "إلى" : "To"}</small><strong>{finance.period.to}</strong></span></div>
            <label className={styles.full}><span>{ar ? "ملاحظات داخلية" : "Internal notes"}</span><textarea name="notes" rows={3} placeholder={ar ? "مثال: إغلاق شهري..." : "Example: monthly close..."}/></label>
            <button className="primaryButton" type="submit"><LockKeyhole size={14}/>{ar ? "إغلاق الشهر وحفظه" : "Close & archive month"}</button>
          </form> : <div className={styles.closeBlocked}><CalendarRange size={20}/><div><strong>{ar ? "الشهر ما زال مفتوحًا" : "Month remains open"}</strong><span>{ar ? "لا يتم إغلاق الشهر قبل انتهائه حتى لا تضيع أي حجوزات جديدة منه." : finance.closePeriodReason}</span>{monthValue === currentMonth ? <Link href={`/admin/cars/finance?companyId=${company.id}&month=${previousMonth(currentMonth)}`}>{ar ? "افتح الشهر السابق لإغلاقه" : "Open previous month to close it"}</Link> : null}</div></div>}
        </section>

        <section className={carsStyles.panel}>
          <div className={carsStyles.panelHeader}><div><span className="eyebrow">{ar ? "كيف تُحسب" : "Settlement logic"}</span><h2>{ar ? "قاعدة صافي واحدة" : "One net balance"}</h2></div></div>
          <div className={styles.logicList}>
            <div><WalletCards size={17}/><span><strong>{ar ? "HandMeKey حصّل الدفع" : "HandMeKey collected"}</strong><small>{ar ? "المبلغ للشركة = إجمالي الحجز − العمولة." : "Company payable = booking total − commission."}</small></span></div>
            <div><Landmark size={17}/><span><strong>{ar ? "الشركة حصّلت الدفع" : "Company collected"}</strong><small>{ar ? "لا ندفع لها شيئًا؛ عمولة HandMeKey تصبح مستحقة على الشركة بعد COMPLETED." : "No payout is created; HandMeKey commission becomes receivable after COMPLETED."}</small></span></div>
            <div><CircleDollarSign size={17}/><span><strong>{ar ? "التسوية النهائية" : "Net settlement"}</strong><small>{ar ? "مستحقات الشركة ناقص العمولة المستحقة علينا = مبلغ واحد فقط للتحويل." : "Company payable minus commission receivable = one final amount to move."}</small></span></div>
          </div>
        </section>
      </div>

      <section className={carsStyles.panel}>
        <div className={carsStyles.panelHeader}><div><span className="eyebrow">{ar ? "تفصيل الحجوزات" : "Booking breakdown"}</span><h2>{ar ? `حجوزات ${formatMonth(finance.period.from, locale)}` : `${formatMonth(finance.period.from, locale)} bookings`}</h2><p>{ar ? "كل حجز يظهر في شهر مالي واحد فقط؛ الدفع الإلكتروني حسب تاريخ التحصيل، والدفع عند الكاونتر حسب تاريخ اكتمال الإيجار." : "Each booking belongs to one finance month only: online collection uses booking/payment timing, while counter collection is recognized when the rental completes."}</p></div></div>
        {finance.reservations.length ? <div className={carsStyles.tableWrap}><table className={`${carsStyles.table} ${styles.financeTable}`}><thead><tr><th>{ar ? "الحجز" : "Booking"}</th><th>{ar ? "الحالة" : "Status"}</th><th>{ar ? "التحصيل" : "Collected by"}</th><th>{ar ? "الإجمالي" : "Gross"}</th><th>{ar ? "العمولة" : "Commission"}</th><th>{ar ? "مستحق للشركة" : "Payable"}</th><th>{ar ? "مستحق لنا" : "Receivable"}</th><th>{ar ? "التسوية" : "Settlement"}</th></tr></thead><tbody>{finance.reservations.map((row) => <tr key={row.id}>
          <td><Link href={`/admin/cars/reservations/${row.id}`}>{row.reference}</Link><small>{row.vehicle} · {row.guestName}</small></td>
          <td><span className={`${carsStyles.status} ${carsStyles[row.status.toLowerCase()] ?? ""}`}>{row.status.replaceAll("_", " ")}</span>{!row.financeEligible && <small>{ar ? "غير مستحق ماليًا بعد" : "Not financially eligible yet"}</small>}</td>
          <td><strong>{row.collectedBy === "HANDMEKEY" ? "HandMeKey" : (ar ? "الشركة" : "Company")}</strong><small>{row.paymentMode}</small></td>
          <td className={carsStyles.money}>{formatMoney(row.total, row.currency, locale)}</td>
          <td className={carsStyles.money}><strong>{formatMoney(row.platformCommission, row.currency, locale)}</strong><small>{(row.commissionRate * 100).toFixed(2)}%</small></td>
          <td className={carsStyles.money}>{formatMoney(row.companyPayable, row.currency, locale)}</td>
          <td className={carsStyles.money}>{formatMoney(row.commissionReceivable, row.currency, locale)}</td>
          <td>{row.settlementId ? <span className={styles.settled}>{ar ? "ضمن تسوية" : "Settled"}</span> : row.financeEligible ? <span className={styles.open}>{ar ? "مفتوح" : "Open"}</span> : <span className={styles.pending}>{ar ? "بانتظار التحصيل" : "Pending"}</span>}</td>
        </tr>)}</tbody></table></div> : <div className={carsStyles.empty}>{finance.periodClosed ? (ar ? "تم إغلاق هذا الشهر بدون حجوزات مالية." : "This month was closed with no financial bookings.") : (ar ? "لا توجد حجوزات مالية في هذا الشهر حتى الآن." : "No financial bookings in this month yet.")}</div>}
      </section>

      <section className={carsStyles.panel}>
        <div className={carsStyles.panelHeader}><div><span className="eyebrow">{ar ? "الأشهر المغلقة" : "Closed periods"}</span><h2>{ar ? "أرشيف التسويات الشهرية" : "Monthly settlement archive"}</h2><p>{ar ? "اضغط على رقم أي تسوية للعودة مباشرة إلى حجوزات ذلك الشهر." : "Open any settlement number to return directly to that month's bookings."}</p></div></div>
        {finance.settlements.length ? <div className={styles.settlementList}>{finance.settlements.map((settlement) => <article className={styles.settlementCard} key={settlement.id}>
          <div className={styles.settlementHead}><div><span className={`${carsStyles.status} ${settlement.status === "PAID" ? carsStyles.completed : carsStyles.modified}`}>{settlement.status}</span><h3><Link href={`/admin/cars/finance?companyId=${company.id}&month=${settlement.periodStart.slice(0, 7)}`}>{settlement.settlementNumber}</Link></h3><small>{settlement.periodStart} → {settlement.periodEnd} · {settlement.bookingCount} {ar ? "حجز" : "bookings"}</small></div><div className={styles.settlementAmount}><small>{directionLabel(settlement.direction, ar)}</small><strong>{formatMoney(settlement.netAmount, settlement.currency, locale)}</strong></div></div>
          <div className={styles.settlementStats}><span><small>{ar ? "إجمالي" : "Gross"}</small><strong>{formatMoney(settlement.grossBookingValue, settlement.currency, locale)}</strong></span><span><small>{ar ? "حصّلها HandMeKey" : "Platform collected"}</small><strong>{formatMoney(settlement.platformCollectedGross, settlement.currency, locale)}</strong></span><span><small>{ar ? "حصّلتها الشركة" : "Company collected"}</small><strong>{formatMoney(settlement.companyCollectedGross, settlement.currency, locale)}</strong></span><span><small>{ar ? "العمولة" : "Commission"}</small><strong>{formatMoney(settlement.platformCommission, settlement.currency, locale)}</strong></span></div>
          {settlement.status === "READY" ? <form action={markCarSettlementPaidAction} className={styles.payForm}><input type="hidden" name="settlementId" value={settlement.id}/><input name="externalReference" placeholder={settlement.direction === "BALANCED" ? (ar ? "مرجع اختياري" : "Optional reference") : (ar ? "رقم التحويل / مرجع البنك" : "Bank / transfer reference")} required={settlement.direction !== "BALANCED"}/><input name="notes" placeholder={ar ? "ملاحظة اختيارية" : "Optional note"}/><button className="primaryButton" type="submit">{ar ? "تعليم كمدفوعة" : "Mark as paid"}</button></form> : <div className={styles.paidMeta}><span>{ar ? "دُفعت" : "Paid"}: {settlement.paidAt ? formatDateTime(settlement.paidAt, locale) : "—"}</span><span>{ar ? "المرجع" : "Reference"}: {settlement.externalReference ?? "—"}</span></div>}
        </article>)}</div> : <div className={carsStyles.empty}>{ar ? "لا توجد أشهر مغلقة لهذه الشركة بعد." : "No closed finance months exist for this company yet."}</div>}
      </section>

      <section className={carsStyles.panel}>
        <div className={carsStyles.panelHeader}><div><span className="eyebrow">Ledger</span><h2>{ar ? "آخر الحركات المالية" : "Latest finance transactions"}</h2></div></div>
        {finance.transactions.length ? <div className={carsStyles.tableWrap}><table className={carsStyles.table}><thead><tr><th>{ar ? "النوع" : "Type"}</th><th>{ar ? "المبلغ" : "Amount"}</th><th>{ar ? "تأثير رصيد الشركة" : "Company balance delta"}</th><th>{ar ? "الحجز" : "Booking"}</th><th>{ar ? "التسوية" : "Settlement"}</th><th>{ar ? "الوقت" : "Time"}</th></tr></thead><tbody>{finance.transactions.map((tx) => <tr key={tx.id}><td><strong>{tx.type.replaceAll("_", " ")}</strong></td><td className={carsStyles.money}>{formatMoney(tx.amount, tx.currency, locale)}</td><td className={`${carsStyles.money} ${tx.companyBalanceDelta < 0 ? styles.receivableText : styles.payableText}`}>{formatSignedMoney(tx.companyBalanceDelta, tx.currency, locale)}</td><td>{tx.reservationId ? <Link href={`/admin/cars/reservations/${tx.reservationId}`}>{ar ? "فتح الحجز" : "Open booking"}</Link> : "—"}</td><td>{tx.settlementId ? tx.settlementId.slice(-8) : "—"}</td><td>{formatDateTime(tx.createdAt, locale)}</td></tr>)}</tbody></table></div> : <div className={carsStyles.empty}>{ar ? "لا توجد حركات مالية بعد." : "No finance transactions yet."}</div>}
      </section>
    </>}
  </AdminShell>;
}

function Metric({icon, label, value, sub}: {icon: React.ReactNode; label: string; value: string; sub: string}) {return <article className={styles.metric}><span>{icon}{label}</span><strong>{value}</strong><small>{sub}</small></article>}
function formatMoney(value: number, currency: string, locale: "en" | "ar") {return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {style: "currency", currency, maximumFractionDigits: 2}).format(value)}
function formatSignedMoney(value: number, currency: string, locale: "en" | "ar") {return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatMoney(Math.abs(value), currency, locale)}`}
function formatDateTime(value: string, locale: "en" | "ar") {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}).format(new Date(value))}
function formatMonth(value: string, locale: "en" | "ar") {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {month: "long", year: "numeric", timeZone: "UTC"}).format(new Date(`${value.slice(0, 7)}-01T00:00:00.000Z`))}
function balanceLabel(value: number, companyName: string, ar: boolean) {if (value > 0) return ar ? `HandMeKey مدين لـ ${companyName}` : `HandMeKey owes ${companyName}`; if (value < 0) return ar ? `${companyName} مدينة لـ HandMeKey` : `${companyName} owes HandMeKey`; return ar ? "الحساب متوازن" : "Account is balanced"}
function directionLabel(value: string, ar: boolean) {if (value === "PLATFORM_OWES_COMPANY") return ar ? "HandMeKey يدفع للشركة" : "HandMeKey pays company"; if (value === "COMPANY_OWES_PLATFORM") return ar ? "الشركة تدفع لـ HandMeKey" : "Company pays HandMeKey"; return ar ? "لا يوجد تحويل" : "No transfer required"}
function validMonth(value?: string): value is string {return Boolean(value && /^\d{4}-\d{2}$/.test(value))}
function monthBounds(month: string) {const [year, monthNumber] = month.split("-").map(Number); const last = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate(); return {from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}`}}
function previousMonth(month: string) {const [year, monthNumber] = month.split("-").map(Number); const date = new Date(Date.UTC(year!, monthNumber! - 2, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`}
