import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, BedDouble, CircleDollarSign, Gem, Sparkles } from "lucide-react";
import { getLoyaltyOverview } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { rewardsUiCopy } from "@/lib/rewards-ui-copy";
import { currentUser } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/rewards");
  const [rewards, market] = await Promise.all([getLoyaltyOverview(user.id), requestGuestMarket()]);
  const copy=rewardsUiCopy(market.locale);
  const tier = copy.tierName(rewards.tier);
  const nextTier = rewards.progress.nextTier ? copy.tierName(rewards.progress.nextTier) : null;
  const earningAvailable = rewards.program.enabled && rewards.program.earningEnabled && rewards.status === "ACTIVE";
  const redemptionAvailable = rewards.program.enabled && rewards.program.redemptionEnabled && rewards.status === "ACTIVE";

  return <AccountShell active="rewards" eyebrow="HandMeKey Rewards" title={copy.title} description={copy.description}>
    {!rewards.program.enabled && <div className="alertCard"><div><strong>{copy.pausedTitle}</strong><p>{copy.pausedBody}</p></div></div>}
    {rewards.status === "SUSPENDED" && <div className="alertCard"><div><strong>{copy.suspendedTitle}</strong><p>{copy.suspendedBody}</p></div></div>}
    {rewards.program.enabled && rewards.status === "ACTIVE" && !rewards.program.earningEnabled && <div className="alertCard"><div><strong>{copy.earningPausedTitle}</strong><p>{copy.earningPausedBody}</p></div></div>}

    <section className={`rewardsHero rewardsTier-${rewards.tier.toLowerCase()}`}>
      <div className="rewardsHeroCopy">
        <span className="rewardsProgram"><Gem size={17}/> HandMeKey Rewards</span>
        <div className="rewardsTierLine"><strong>{tier}</strong><span>{copy.currentTier}{rewards.tierOverride ? ` · ${copy.specialStatus}` : ""}</span></div>
        <p>{rewards.tier === "BLACK" ? copy.highestTier : copy.nightsToNext(rewards.progress.nightsToNextTier,nextTier ?? tier)}</p>
      </div>
      <div className="rewardsBalance">
        <span>{copy.pointsBalance}</span>
        <strong>{rewards.pointsBalance.toLocaleString(market.intlLocale)}</strong>
        <small>{copy.lifetime(rewards.lifetimePointsEarned.toLocaleString(market.intlLocale))}</small>
      </div>
    </section>

    <section className="rewardsProgressCard">
      <div className="rewardsProgressTop">
        <div><span className="accountCardLabel">{copy.tierProgress}</span><h2>{copy.qualifyingNights(rewards.qualifyingNights)}</h2></div>
        <div className="rewardsProgressStats"><span>{copy.stays}<strong>{rewards.qualifyingStays}</strong></span><span>{copy.earnRate}<strong>{rewards.pointsPerJod}×</strong></span></div>
      </div>
      <div className="rewardsProgressTrack" aria-label={copy.tierProgress}><span style={{width:`${rewards.progress.percent}%`}}/></div>
      <div className="rewardsProgressLabels"><span>{tier}</span><span>{nextTier ?? tier}</span></div>
    </section>

    <div className="rewardsBenefits">
      <article><span><CircleDollarSign size={20}/></span><div><h3>{copy.earnTitle}</h3><p>{earningAvailable ? copy.earnBody(tier,rewards.pointsPerJod,rewards.program.eligibleCurrency) : copy.earnUnavailable}</p></div></article>
      <article><span><BedDouble size={20}/></span><div><h3>{copy.completedTitle}</h3><p>{copy.completedBody}</p></div></article>
      <article><span><Award size={20}/></span><div><h3>{copy.tiersTitle}</h3><p>{copy.tiersBody(rewards.program.memberPointsPerJod,rewards.program.goldPointsPerJod,rewards.program.goldMinimumNights,rewards.program.blackPointsPerJod,rewards.program.blackMinimumNights)}</p></div></article>
    </div>

    <section className="rewardsActivityCard">
      <div className="rewardsSectionHead"><div><span className="accountCardLabel">{copy.pointsLedger}</span><h2>{copy.recentActivity}</h2></div>{redemptionAvailable && <Link className="rewardsComing" href="/account/wallet"><Sparkles size={15}/>{copy.convertWallet}</Link>}</div>
      {rewards.recentActivity.length ? <div className="rewardsActivityList">
        {rewards.recentActivity.map((entry) => <div className="rewardsActivityRow" key={entry.id}>
          <div className="rewardsActivityIcon"><Gem size={17}/></div>
          <div className="rewardsActivityCopy">
            <strong>{entry.hotelName ?? entry.description ?? copy.pointsActivity}</strong>
            <span>{entry.bookingReference ? `${copy.booking} ${entry.bookingReference}` : entry.type}</span>
            <small>{entry.createdAt.toLocaleDateString(market.intlLocale, {year:"numeric",month:"short",day:"numeric"})}{entry.eligibleAmount !== null && entry.currency ? ` · ${entry.eligibleAmount.toFixed(2)} ${entry.currency}` : ""}</small>
          </div>
          <strong className={entry.points >= 0 ? "rewardsPointsPositive" : "rewardsPointsNegative"}>{entry.points >= 0 ? "+" : ""}{entry.points.toLocaleString(market.intlLocale)}</strong>
        </div>)}
      </div> : <div className="rewardsEmpty"><Gem size={25}/><h3>{copy.emptyTitle}</h3><p>{copy.emptyBody}</p></div>}
    </section>

    <p className="rewardsFinePrint">{copy.finePrint(rewards.program.eligibleCurrency)}</p>
  </AccountShell>;
}
