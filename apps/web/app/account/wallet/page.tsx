import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CreditCard, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { getLoyaltyOverview, getWalletOverview } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { walletUiCopy } from "@/lib/wallet-ui-copy";
import { WalletConverter } from "./wallet-converter";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/wallet");
  const [wallet,rewards,market] = await Promise.all([getWalletOverview(user.id),getLoyaltyOverview(user.id),requestGuestMarket()]);
  const copy=walletUiCopy(market.locale);
  const redemptionAvailable = wallet.rewardsEnabled && wallet.redemptionEnabled && wallet.membershipStatus === "ACTIVE";
  const unavailableReason = !wallet.rewardsEnabled
    ? copy.rewardsPaused
    : wallet.membershipStatus === "SUSPENDED"
      ? copy.membershipSuspended
      : !wallet.redemptionEnabled
        ? copy.conversionPaused
        : null;

  return <AccountShell active="wallet" eyebrow="HandMeKey Wallet" title={copy.title} description={copy.description}>
    <section className="walletHero">
      <div className="walletHeroBrand"><span><WalletCards size={24}/></span><div><small>HANDMEKEY</small><strong>WALLET</strong></div></div>
      <div className="walletHeroBalance"><span>{copy.availableBalance}</span><strong>{wallet.balance.toLocaleString(market.intlLocale,{minimumFractionDigits:2,maximumFractionDigits:2})} <em>{wallet.currency}</em></strong><small>{copy.bookingCredit}</small></div>
      <div className="walletHeroFoot"><span><ShieldCheck size={15}/>{copy.accountLinked}</span><span>{copy.nonCash}</span></div>
    </section>

    <div className="walletUseCases">
      <article><span><WalletCards size={20}/></span><div><h3>{copy.payWalletTitle}</h3><p>{copy.payWalletBody}</p></div></article>
      <article><span><CreditCard size={20}/></span><div><h3>{copy.walletCardTitle}</h3><p>{copy.walletCardBody}</p></div></article>
      <article><span><Landmark size={20}/></span><div><h3>{copy.walletHotelTitle}</h3><p>{copy.walletHotelBody}</p></div></article>
    </div>

    <WalletConverter locale={market.locale} initialWalletBalance={wallet.balance} initialPointsBalance={rewards.pointsBalance} currency={wallet.currency} pointsPerJod={wallet.pointsPerJod} minimumRedemptionPoints={wallet.minimumRedemptionPoints} redemptionStepPoints={wallet.redemptionStepPoints} redemptionAvailable={redemptionAvailable} unavailableReason={unavailableReason}/>

    <section className="walletActivityCard">
      <div className="walletSectionHead"><div><span className="accountCardLabel">{copy.ledger}</span><h2>{copy.recentActivity}</h2></div><Link href="/account/rewards">{copy.viewRewards}<ArrowUpRight size={15}/></Link></div>
      {wallet.recentActivity.length?<div className="walletActivityList">{wallet.recentActivity.map((entry)=><div className="walletActivityRow" key={entry.id}>
        <span className={`walletActivityMark ${entry.amount>=0?"credit":"debit"}`}><WalletCards size={16}/></span>
        <div><strong>{copy.activity(entry.type)}</strong><span>{entry.description}</span><small>{entry.createdAt.toLocaleDateString(market.intlLocale,{year:"numeric",month:"short",day:"numeric"})}{entry.sourcePoints?` · ${entry.sourcePoints.toLocaleString(market.intlLocale)} ${copy.points}`:""}</small></div>
        <strong className={entry.amount>=0?"walletCredit":"walletDebit"}>{entry.amount>=0?"+":""}{entry.amount.toLocaleString(market.intlLocale,{minimumFractionDigits:2,maximumFractionDigits:2})} {entry.currency}</strong>
      </div>)}</div>:<div className="walletEmpty"><WalletCards size={26}/><h3>{copy.emptyTitle}</h3><p>{copy.emptyBody}</p></div>}
    </section>
  </AccountShell>;
}
