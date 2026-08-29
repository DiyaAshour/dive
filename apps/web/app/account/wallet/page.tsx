import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CreditCard, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { getLoyaltyOverview, getWalletOverview } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { requestLocale } from "@/lib/request-locale";
import { currentUser } from "@/lib/server-session";
import { WalletConverter } from "./wallet-converter";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/wallet");
  const [wallet,rewards,locale] = await Promise.all([getWalletOverview(user.id),getLoyaltyOverview(user.id),requestLocale()]);
  const ar = locale === "ar";
  const redemptionAvailable = wallet.rewardsEnabled && wallet.redemptionEnabled && wallet.membershipStatus === "ACTIVE";
  const unavailableReason = !wallet.rewardsEnabled
    ? (ar?"برنامج Rewards متوقف مؤقتًا. رصيد النقاط والمحفظة محفوظان.":"Rewards is temporarily paused. Your points and Wallet balance are preserved.")
    : wallet.membershipStatus === "SUSPENDED"
      ? (ar?"عضوية Rewards موقوفة حاليًا، لذلك تحويل النقاط إلى Wallet غير متاح.":"Your Rewards membership is suspended, so points cannot currently be converted to Wallet.")
      : !wallet.redemptionEnabled
        ? (ar?"تحويل Rewards إلى Wallet متوقف مؤقتًا من إدارة البرنامج.":"Rewards-to-Wallet conversion is temporarily paused by program administration.")
        : null;

  return <AccountShell
    active="wallet"
    eyebrow="HandMeKey Wallet"
    title={ar?"رصيدك للحجوزات، في مكان واحد.":"Your booking credit, in one place."}
    description={ar?"حوّل نقاط HandMeKey Rewards إلى رصيد، واستخدم المحفظة وحدها أو مع البطاقة أو الدفع في الفندق عندما لا يغطي الرصيد كامل الحجز.":"Convert HandMeKey Rewards points into credit, then use Wallet alone or split the remainder with card or pay-at-hotel when the balance does not cover the full booking."}
  >
    <section className="walletHero">
      <div className="walletHeroBrand"><span><WalletCards size={24}/></span><div><small>HANDMEKEY</small><strong>WALLET</strong></div></div>
      <div className="walletHeroBalance"><span>{ar?"الرصيد المتاح":"Available balance"}</span><strong>{wallet.balance.toFixed(2)} <em>{wallet.currency}</em></strong><small>{ar?"رصيد حجز داخل HandMeKey":"HandMeKey booking credit"}</small></div>
      <div className="walletHeroFoot"><span><ShieldCheck size={15}/>{ar?"رصيد مرتبط بحسابك":"Account-linked credit"}</span><span>{ar?"غير قابل للسحب النقدي":"Not cash-withdrawable"}</span></div>
    </section>

    <div className="walletUseCases">
      <article><span><WalletCards size={20}/></span><div><h3>{ar?"ادفع بالمحفظة":"Pay with Wallet"}</h3><p>{ar?"إذا كان الرصيد يغطي كامل الحجز، يتم تأكيده بدون وسيلة دفع ثانية.":"If Wallet covers the full total, the booking can be confirmed without a second payment method."}</p></div></article>
      <article><span><CreditCard size={20}/></span><div><h3>{ar?"المحفظة + بطاقة":"Wallet + card"}</h3><p>{ar?"نخصم رصيد المحفظة أولًا، والبوابة الإلكترونية تحصّل المبلغ المتبقي فقط.":"Wallet is applied first and the online gateway charges only the remaining amount."}</p></div></article>
      <article><span><Landmark size={20}/></span><div><h3>{ar?"المحفظة + الفندق":"Wallet + hotel"}</h3><p>{ar?"إذا كانت خطة السعر تسمح بالدفع في الفندق، استخدم رصيدك الآن وادفع الباقي عند الوصول.":"When the rate plan allows pay-at-hotel, use Wallet now and settle the remainder at the property."}</p></div></article>
    </div>

    <WalletConverter locale={locale} initialWalletBalance={wallet.balance} initialPointsBalance={rewards.pointsBalance} currency={wallet.currency} pointsPerJod={wallet.pointsPerJod} minimumRedemptionPoints={wallet.minimumRedemptionPoints} redemptionStepPoints={wallet.redemptionStepPoints} redemptionAvailable={redemptionAvailable} unavailableReason={unavailableReason}/>

    <section className="walletActivityCard">
      <div className="walletSectionHead"><div><span className="accountCardLabel">{ar?"دفتر المحفظة":"Wallet ledger"}</span><h2>{ar?"آخر الحركات":"Recent activity"}</h2></div><Link href="/account/rewards">{ar?"عرض نقاط Rewards":"View Rewards points"}<ArrowUpRight size={15}/></Link></div>
      {wallet.recentActivity.length?<div className="walletActivityList">{wallet.recentActivity.map((entry)=><div className="walletActivityRow" key={entry.id}>
        <span className={`walletActivityMark ${entry.amount>=0?"credit":"debit"}`}><WalletCards size={16}/></span>
        <div><strong>{activityLabel(entry.type,ar)}</strong><span>{entry.description}</span><small>{entry.createdAt.toLocaleDateString(ar?"ar-JO":"en-GB",{year:"numeric",month:"short",day:"numeric"})}{entry.sourcePoints?` · ${entry.sourcePoints.toLocaleString()} ${ar?"نقطة":"points"}`:""}</small></div>
        <strong className={entry.amount>=0?"walletCredit":"walletDebit"}>{entry.amount>=0?"+":""}{entry.amount.toFixed(2)} {entry.currency}</strong>
      </div>)}</div>:<div className="walletEmpty"><WalletCards size={26}/><h3>{ar?"محفظتك جاهزة":"Your Wallet is ready"}</h3><p>{ar?"حوّل أول مجموعة من نقاط Rewards وسيظهر الرصيد والنشاط هنا.":"Convert your first Rewards points and your credit activity will appear here."}</p></div>}
    </section>
  </AccountShell>;
}

function activityLabel(type:"REWARDS_CONVERSION"|"BOOKING_DEBIT"|"BOOKING_REFUND"|"ADJUSTMENT",ar:boolean) {
  if (type === "REWARDS_CONVERSION") return ar?"تحويل Rewards":"Rewards conversion";
  if (type === "BOOKING_DEBIT") return ar?"دفع حجز":"Booking payment";
  if (type === "BOOKING_REFUND") return ar?"إرجاع رصيد":"Wallet refund";
  return ar?"تعديل رصيد":"Balance adjustment";
}
