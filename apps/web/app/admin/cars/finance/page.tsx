import Link from "next/link";
import {redirect} from "next/navigation";
import {Banknote, Building2, CalendarRange, CarFront, CircleDollarSign, Landmark, ReceiptText, ShieldCheck, WalletCards} from "lucide-react";
import {getAdminCarFinance, getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {createCarSettlementAction, markCarSettlementPaidAction} from "./actions";
import carsStyles from "../cars-admin.module.css";
import styles from "./finance.module.css";

export const dynamic = "force-dynamic";
export const metadata = {title: "Cars Finance & Settlements · HandMeKey Admin"};

export default async function AdminCarFinancePage({searchParams}: {searchParams: Promise<{companyId?: string; from?: string; to?: string}>}) {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fcars%2Ffinance");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const query = await searchParams;
  const filters: {companyId?: string; from?: string; to?: string} = {};
  if (query.companyId) filters.companyId = query.companyId;
  if (query.from) filters.from = query.from;
  if (query.to) filters.to = query.to;
  const [finance, counts] = await Promise.all([
    getAdminCarFinance(principal.user.id, filters),
    getAdminNavigationCounts(principal.user.id),
  ]);

  const company = finance.selectedCompany;
  const m = finance.metrics;
  const currency = company?.currency ?? "JOD";

  return <AdminShell locale={locale} principal={principal} active="cars" counts={counts}>
    <header className="adminTopbar">
      <div><span className="eyebrow">HandMeKey Cars · Finance</span><h1>{ar ? "المالية والتسويات" : "Finance & settlements"}</h1><p>{ar ? "اعرف من استلم أموال كل حجز، عمولة HandMeKey، مستحقات الشركة، وصافي الرصيد بين الطرفين." : "See who collected every booking, HandMeKey commission, partner payables and the net balance between both sides."}</p></div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{ar ? "دفتر مالي قابل للتدقيق" : "Auditable finance ledger"}</strong><small>{ar ? "كل تسوية وحركة مرتبطة بالحجز" : "Every settlement traces back to bookings"}</small></span></div>
    </header>

    <nav className={carsStyles.tabs} aria-label={ar ? "إدارة السيارات" : "Cars admin"}>
      <Link href="/admin/cars"><CarFront size={15}/>{ar ? "نظرة عامة" : "Overview"}</Link>
      <Link href="/admin/cars/companies"><Building2 size={15}/>{ar ? "الشركات" : "Companies"}</Link>
      <Link href="/admin/cars/reservations"><CalendarRange size={15}/>{ar ? "كل الحجوزات" : "All reservations"}</Link>
      <Link className={carsStyles.active} href="/admin/cars/finance"><CircleDollarSign size={15}/>{ar ? "المالية" : "Finance"}</Link>
    </nav>

    <section className={styles.filterCard}>
      <form method="get" className={styles.filters}>
        <label><span>{ar ? "شركة التأجير" : "Rental company"}</span><select name="companyId" defaultValue={company?.id ?? ""}>{finance.companies.map((item) => <option key={item.id} value={item.id}>{item.name} · {(item.commissionRate * 100).toFixed(1)}%</option>)}</select></label>
        <label><span>{ar ? "من" : "From"}</span><input type="date" name="from" defaultValue={finance.period.from}/></label>
        <label><span>{ar ? "إلى" : "To"}</span><input type="date" name="to" defaultValue={finance.period.to}/></label>
        <button className="primaryButton" type="submit">{ar ? "عرض المالية" : "View finance"}</button>
      </form>
      {company && <div className={styles.companyStrip}><div><Building2 size={16}/><span><strong>{company.name}</strong><small>{company.status} · {company.verified ? (ar ? "موثقة" : "Verified") : (ar ? "غير موثقة" : "Not verified")}</small></span></div><div><ReceiptText size={16}/><span><strong>{(company.commissionRate * 100).toFixed(2)}%</strong><small>{ar ? "نسبة العمولة الحالية" : "Current commission rate"}</small></span></div></div>}
    </section>

    {!company ? <section className={carsStyles.panel}><div className={carsStyles.empty}>{ar ? "لا توجد شركات سيارات بعد." : "No car rental companies exist yet."}</div></section> : <>
      <section className={styles.balanceHero}>
        <div><span className="eyebrow">{ar ? "الرصيد الحالي" : "Current account balance"}</span><h2>{balanceLabel(m.accountBalance, company.name, ar)}</h2><strong className={m.accountBalance < 0 ? styles.receivable : styles.payable}>{formatMoney(Math.abs(m.accountBalance), currency, locale)}</strong><p>{ar ? "يشمل الحجوزات المؤهلة غير المسوّاة + الرصيد المفتوح في دفتر التسويات." : "Includes eligible unsettled bookings plus open settlement ledger balance."}</p></div>
        <div className={styles.balanceBreakdown}><span><small>{ar ? "غير مسوّى" : "Unsettled"}</small><strong>{formatSignedMoney(m.unsettledNet, currency, locale)}</strong></span><span><small>{ar ? "دفتر التسويات" : "Settlement ledger"}</small><strong>{formatSignedMoney(m.ledgerBalance, currency, locale)}</strong></span></div>
      </section>

      <section className={styles.metricGrid}>
        <Metric icon={<CalendarRange size={16}/>} label={ar ? "حجوزات مالية" : "Financial bookings"} value={String(m.bookingCount)} sub={`${m.unsettledBookingCount} ${ar ? "غير مسوّاة" : "unsettled"}`}/>
        <Metric icon={<Banknote size={16}/>} label={ar ? "قيمة الحجوزات" : "Gross booking value"} value={formatMoney(m.grossBookingValue, currency, locale)} sub={ar ? "الحجوزات المؤهلة ماليًا" : "Financially eligible bookings"}/>
        <Metric icon={<WalletCards size={16}/>} label={ar ? "حصّلها HandMeKey" : "Collected by HandMeKey"} value={formatMoney(m.platformCollected, currency, locale)} sub={ar ? "يُدفع للشركة صافي حصتها" : "Partner share becomes payable"}/>
        <Metric icon={<Landmark size={16}/>} label={ar ? "حصّلتها الشركة" : "Collected by company"} value={formatMoney(m.companyCollected, currency, locale)} sub={ar ? "تصبح العمولة مستحقة لنا" : "Commission becomes receivable"}/>
        <Metric icon={<CircleDollarSign size={16}/>} label={ar ? "عمولة HandMeKey" : "HandMeKey commission"} value={formatMoney(m.platformCommission, currency, locale)} sub={ar ? "من الحجوزات المؤهلة" : "Across eligible bookings"}/>
        <Metric icon={<Banknote size={16}/>} label={ar ? "مستحق للشركة" : "Company payable"} value={formatMoney(m.companyPayable, currency, locale)} sub={ar ? "بعد خصم العمولة" : "After withholding commission"}/>
        <Metric icon={<ReceiptText size={16}/>} label={ar ? "عمولة على الشركة" : "Commission receivable"} value={formatMoney(m.commissionReceivable, currency, locale)} sub={ar ? "من مبالغ حصّلتها الشركة" : "From company-collected bookings"}/>
      </section>

      <div className={styles.twoColumn}>
        <section className={carsStyles.panel}>
          <div className={carsStyles.panelHeader}><div><span className="eyebrow">{ar ? "إنشاء تسوية" : "Create settlement"}</span><h2>{ar ? "اقفل الفترة المالية" : "Close a finance period"}</h2><p>{ar ? "يتم إدخال الحجوزات المؤهلة وغير المسوّاة فقط، بدون تكرار أي حجز." : "Only eligible, not-yet-settled bookings are included; a booking can never be settled twice."}</p></div></div>
          <form action={createCarSettlementAction} className={styles.settlementForm}>
            <input type="hidden" name="companyId" value={company.id}/>
            <label><span>{ar ? "بداية الفترة" : "Period start"}</span><input type="date" name="periodStart" defaultValue={finance.period.from} required/></label>
            <label><span>{ar ? "نهاية الفترة" : "Period end"}</span><input type="date" name="periodEnd" defaultValue={finance.period.to} required/></label>
            <label className={styles.full}><span>{ar ? "ملاحظات داخلية" : "Internal notes"}</span><textarea name="notes" rows={3} placeholder={ar ? "مثال: تسوية شهر سبتمبر..." : "Example: September monthly settlement..."}/></label>
            <button className="primaryButton" type="submit">{ar ? "إنشاء التسوية" : "Create settlement"}</button>
          </form>
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
        <div className={carsStyles.panelHeader}><div><span className="eyebrow">{ar ? "تفصيل الحجوزات" : "Booking breakdown"}</span><h2>{ar ? "من استلم المال؟ ومن يدين لمن؟" : "Who collected, and who owes whom?"}</h2><p>{ar ? "PAY_AT_COUNTER لا يدخل عمولة مستحقة إلا بعد اكتمال الحجز." : "PAY_AT_COUNTER becomes commission-receivable only after the reservation is completed."}</p></div></div>
        {finance.reservations.length ? <div className={carsStyles.tableWrap}><table className={`${carsStyles.table} ${styles.financeTable}`}><thead><tr><th>{ar ? "الحجز" : "Booking"}</th><th>{ar ? "الحالة" : "Status"}</th><th>{ar ? "التحصيل" : "Collected by"}</th><th>{ar ? "الإجمالي" : "Gross"}</th><th>{ar ? "العمولة" : "Commission"}</th><th>{ar ? "مستحق للشركة" : "Payable"}</th><th>{ar ? "مستحق لنا" : "Receivable"}</th><th>{ar ? "التسوية" : "Settlement"}</th></tr></thead><tbody>{finance.reservations.map((row) => <tr key={row.id}>
          <td><Link href={`/admin/cars/reservations/${row.id}`}>{row.reference}</Link><small>{row.vehicle} · {row.guestName}</small></td>
          <td><span className={`${carsStyles.status} ${carsStyles[row.status.toLowerCase()] ?? ""}`}>{row.status.replaceAll("_", " ")}</span>{!row.financeEligible && <small>{ar ? "غير مستحق ماليًا بعد" : "Not financially eligible yet"}</small>}</td>
          <td><strong>{row.collectedBy === "HANDMEKEY" ? "HandMeKey" : (ar ? "الشركة" : "Company")}</strong><small>{row.paymentMode}</small></td>
          <td className={carsStyles.money}>{formatMoney(row.total, row.currency, locale)}</td>
          <td className={carsStyles.money}><strong>{formatMoney(row.platformCommission, row.currency, locale)}</strong><small>{(row.commissionRate * 100).toFixed(2)}%</small></td>
          <td className={carsStyles.money}>{formatMoney(row.companyPayable, row.currency, locale)}</td>
          <td className={carsStyles.money}>{formatMoney(row.commissionReceivable, row.currency, locale)}</td>
          <td>{row.settlementId ? <span className={styles.settled}>{ar ? "ضمن تسوية" : "Settled"}</span> : row.financeEligible ? <span className={styles.open}>{ar ? "مفتوح" : "Open"}</span> : <span className={styles.pending}>{ar ? "بانتظار التحصيل" : "Pending"}</span>}</td>
        </tr>)}</tbody></table></div> : <div className={carsStyles.empty}>{ar ? "لا توجد حجوزات في الفترة المحددة." : "No bookings in the selected period."}</div>}
      </section>

      <section className={carsStyles.panel}>
        <div className={carsStyles.panelHeader}><div><span className="eyebrow">{ar ? "سجل التسويات" : "Settlement history"}</span><h2>{ar ? "التسويات مع الشركة" : "Company settlements"}</h2><p>{ar ? "عند تعليم التسوية كمدفوعة يتم تسجيل حركة المقاصة في الـLedger والـAudit Log." : "Marking a settlement paid records the clearing transaction in both the ledger and audit log."}</p></div></div>
        {finance.settlements.length ? <div className={styles.settlementList}>{finance.settlements.map((settlement) => <article className={styles.settlementCard} key={settlement.id}>
          <div className={styles.settlementHead}><div><span className={`${carsStyles.status} ${settlement.status === "PAID" ? carsStyles.completed : carsStyles.modified}`}>{settlement.status}</span><h3>{settlement.settlementNumber}</h3><small>{settlement.periodStart} → {settlement.periodEnd} · {settlement.bookingCount} {ar ? "حجز" : "bookings"}</small></div><div className={styles.settlementAmount}><small>{directionLabel(settlement.direction, ar)}</small><strong>{formatMoney(settlement.netAmount, settlement.currency, locale)}</strong></div></div>
          <div className={styles.settlementStats}><span><small>{ar ? "إجمالي" : "Gross"}</small><strong>{formatMoney(settlement.grossBookingValue, settlement.currency, locale)}</strong></span><span><small>{ar ? "حصّلها HandMeKey" : "Platform collected"}</small><strong>{formatMoney(settlement.platformCollectedGross, settlement.currency, locale)}</strong></span><span><small>{ar ? "حصّلتها الشركة" : "Company collected"}</small><strong>{formatMoney(settlement.companyCollectedGross, settlement.currency, locale)}</strong></span><span><small>{ar ? "العمولة" : "Commission"}</small><strong>{formatMoney(settlement.platformCommission, settlement.currency, locale)}</strong></span></div>
          {settlement.status === "READY" ? <form action={markCarSettlementPaidAction} className={styles.payForm}><input type="hidden" name="settlementId" value={settlement.id}/><input name="externalReference" placeholder={settlement.direction === "BALANCED" ? (ar ? "مرجع اختياري" : "Optional reference") : (ar ? "رقم التحويل / مرجع البنك" : "Bank / transfer reference")} required={settlement.direction !== "BALANCED"}/><input name="notes" placeholder={ar ? "ملاحظة اختيارية" : "Optional note"}/><button className="primaryButton" type="submit">{ar ? "تعليم كمدفوعة" : "Mark as paid"}</button></form> : <div className={styles.paidMeta}><span>{ar ? "دُفعت" : "Paid"}: {settlement.paidAt ? formatDateTime(settlement.paidAt, locale) : "—"}</span><span>{ar ? "المرجع" : "Reference"}: {settlement.externalReference ?? "—"}</span></div>}
        </article>)}</div> : <div className={carsStyles.empty}>{ar ? "لم يتم إنشاء تسويات لهذه الشركة بعد." : "No settlements have been created for this company yet."}</div>}
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
function balanceLabel(value: number, companyName: string, ar: boolean) {if (value > 0) return ar ? `HandMeKey مدين لـ ${companyName}` : `HandMeKey owes ${companyName}`; if (value < 0) return ar ? `${companyName} مدينة لـ HandMeKey` : `${companyName} owes HandMeKey`; return ar ? "الحساب متوازن" : "Account is balanced"}
function directionLabel(value: string, ar: boolean) {if (value === "PLATFORM_OWES_COMPANY") return ar ? "HandMeKey يدفع للشركة" : "HandMeKey pays company"; if (value === "COMPANY_OWES_PLATFORM") return ar ? "الشركة تدفع لـ HandMeKey" : "Company pays HandMeKey"; return ar ? "لا يوجد تحويل" : "No transfer required"}
