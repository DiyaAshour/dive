import {redirect} from "next/navigation";
import {Banknote, CheckCircle2, Clock3, ReceiptText, ShieldCheck, WalletCards} from "lucide-react";
import {getAdminNavigationCounts, listPlatformPayoutQueue} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {PayoutActions} from "./payout-actions";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Ffinance%2Fpayouts");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const [payouts, counts] = await Promise.all([
    listPlatformPayoutQueue(principal.user.id),
    getAdminNavigationCounts(principal.user.id),
  ]);
  const ready = payouts.filter((payout) => payout.status === "READY");
  const paid = payouts.filter((payout) => payout.status === "PAID");
  const voided = payouts.filter((payout) => payout.status === "VOID");
  const readyTotal = ready.reduce((sum, payout) => sum + payout.partnerNet, 0);
  const paidTotal = paid.reduce((sum, payout) => sum + payout.partnerNet, 0);

  return <AdminShell locale={locale} principal={principal} active="finance" counts={counts}>
    <header className="adminTopbar">
      <div><span className="eyebrow">{ar ? "المالية المركزية" : "Platform finance"}</span><h1>{ar ? "الدفعات والتسويات" : "Payouts & settlement"}</h1><p>{ar ? "لا تتحول أي دفعة إلى مدفوعة إلا بعد تسجيل مرجع التحويل الخارجي. كل تغيير محفوظ في سجل التدقيق." : "A payout becomes paid only after an external transfer reference is recorded. Every state change is retained in the audit log."}</p></div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{ar ? "بوابة مالية إدارية" : "Admin-only finance gate"}</strong><small>{ar ? "التأكيد هنا لا ينفذ تحويلاً بنكياً؛ يسجل نتيجة التحويل الفعلي." : "This screen records the outcome of an external transfer; it does not invent a bank payment."}</small></span></div>
    </header>

    <section className="adminSection">
      <div className="adminKpiGrid">
        <Metric icon={<Clock3 size={16}/>} label={ar ? "جاهزة للدفع" : "Ready payouts"} value={String(ready.length)} helper={money(readyTotal, ready[0]?.currency ?? "JOD")}/>
        <Metric icon={<CheckCircle2 size={16}/>} label={ar ? "دفعات مؤكدة" : "Paid payouts"} value={String(paid.length)} helper={money(paidTotal, paid[0]?.currency ?? "JOD")}/>
        <Metric icon={<ReceiptText size={16}/>} label={ar ? "ملغاة" : "Voided"} value={String(voided.length)} helper={ar ? "لا يمكن دفعها لاحقاً" : "cannot later be paid"}/>
        <Metric icon={<WalletCards size={16}/>} label={ar ? "إجمالي السجلات" : "Payout records"} value={String(payouts.length)} helper={ar ? "مرتبة حسب الحالة والتاريخ" : "ordered by state and creation"}/>
      </div>
    </section>

    <section className="adminSection adminPanel">
      <div className="adminSectionTitle"><div><span className="eyebrow">{ar ? "طابور التحويلات" : "Transfer queue"}</span><h2>{ar ? "دفعات الشركاء" : "Partner payouts"}</h2><p>{ar ? "READY تعني أن مطابقة التحصيل كانت نظيفة. راجع المبلغ والفندق ثم سجل مرجع التحويل عند الدفع الفعلي." : "READY means collection reconciliation was clean. Verify property and amount, then record the real transfer reference once money is sent."}</p></div></div>
      {payouts.length === 0 ? <div className="partnerEmpty">{ar ? "لا توجد دفعات شريك حتى الآن." : "No partner payouts have been created yet."}</div> : <div className="adminPropertyTable" role="table" aria-label={ar ? "دفعات الشركاء" : "Partner payouts"}>
        <div className="adminPropertyRow adminPropertyHead" role="row"><span>{ar ? "الفندق / الدفعة" : "Property / payout"}</span><span>{ar ? "الفترة" : "Period"}</span><span>{ar ? "الصافي" : "Partner net"}</span><span>{ar ? "الحالة" : "Status"}</span><span>{ar ? "المرجع" : "Transfer ref"}</span><span>{ar ? "إجراء" : "Action"}</span></div>
        {payouts.map((payout) => <div className="adminPropertyRow" role="row" key={payout.id}>
          <div><strong>{payout.hotel.name}</strong><small>{payout.hotel.city}{payout.hotel.countryCode ? `, ${payout.hotel.countryCode}` : ""} · {payout.payoutNumber}</small></div>
          <span>{date(payout.periodStart)} → {date(payout.periodEnd)}</span>
          <span><strong>{money(payout.partnerNet, payout.currency)}</strong><small>{ar ? `عمولة منصة ${money(payout.platformCommission, payout.currency)}` : `commission ${money(payout.platformCommission, payout.currency)}`}</small></span>
          <span className={payout.status === "PAID" ? "statusOk" : payout.status === "READY" ? "statusReview" : ""}>{payout.status}</span>
          <span>{payout.externalReference ?? "—"}</span>
          <PayoutActions payoutId={payout.id} status={payout.status} locale={locale}/>
        </div>)}
      </div>}
    </section>

    <section className="adminSection adminPanel">
      <div className="adminSectionTitle"><div><span className="eyebrow">{ar ? "قاعدة التحكم" : "Control rule"}</span><h2>{ar ? "لا يوجد دفع تلقائي وهمي" : "No synthetic payout confirmation"}</h2><p>{ar ? "HandMeKey يحتفظ بحالة READY إلى أن يصل تأكيد حقيقي من عملية التحويل الخارجية. المرجع مطلوب قبل تحويل الحالة إلى PAID." : "HandMeKey keeps the payout in READY until an actual external transfer is confirmed. A transfer reference is mandatory before PAID can be recorded."}</p></div><Banknote size={20}/></div>
    </section>
  </AdminShell>;
}

function Metric({icon, label, value, helper}: {icon: React.ReactNode; label: string; value: string; helper: string}) {return <article><span>{icon}{label}</span><strong>{value}</strong><small>{helper}</small></article>}
function money(value: number, currency: string) {return `${Number(value).toFixed(2)} ${currency}`}
function date(value: Date) {return value.toISOString().slice(0, 10)}
