import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Gem, KeyRound, Languages, Luggage, UserRound, WalletCards } from "lucide-react";
import { getAccountOverview, getAccountProfile, getLoyaltyOverview, getWalletOverview } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { accountOverviewUiCopy } from "@/lib/account-overview-ui-copy";
import { guestDictionary } from "@/lib/guest-i18n";
import { guestIntlLocale, type GuestLocale } from "@/lib/guest-market";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const [profile,overview,rewards,wallet,market] = await Promise.all([getAccountProfile(user.id), getAccountOverview(user.id), getLoyaltyOverview(user.id), getWalletOverview(user.id), requestGuestMarket()]);
  const locale=market.locale;
  const copy = guestDictionary(locale);
  const ui = accountOverviewUiCopy(locale);
  const firstName = profile.displayName.trim().split(/\s+/)[0] || copy.nav.account;
  const welcome = ui.welcome(firstName);
  const memberSince = profile.createdAt.toLocaleDateString(guestIntlLocale(locale), {year:"numeric",month:"long"});

  return <AccountShell active="overview" eyebrow={copy.account.overviewEyebrow} title={welcome} description={copy.account.overviewBody}>
    <div className="accountMetrics">
      <Metric value={wallet.balance.toFixed(2)} label={ui.walletBalance(wallet.currency)} href="/account/wallet" locale={locale}/>
      <Metric value={rewards.pointsBalance} label={ui.points} href="/account/rewards" locale={locale}/>
      <Metric value={overview.upcomingTrips} label={copy.account.upcoming} href="/trips" locale={locale}/>
      <Metric value={overview.activePriceWatches} label={copy.account.activeWatches} href="/account/alerts" locale={locale}/>
      <Metric value={overview.unreadNotifications} label={copy.account.unreadAlerts} href="/account/alerts" locale={locale}/>
      <Metric value={overview.totalTrips} label={copy.account.totalTrips} href="/trips" locale={locale}/>
    </div>

    <div className="accountGrid">
      <section className="accountCard walletAccountCard">
        <div className="accountCardIcon"><WalletCards size={20}/></div>
        <div>
          <span className="accountCardLabel">HandMeKey Wallet</span>
          <h2>{wallet.balance.toFixed(2)} {wallet.currency}</h2>
          <p>{ui.walletBody}</p>
          <small>{ui.convertible(wallet.convertiblePoints.toLocaleString(guestIntlLocale(locale)))}</small>
        </div>
        <Link href="/account/wallet">{ui.openWallet} →</Link>
      </section>
      <section className="accountCard rewardsAccountCard">
        <div className="accountCardIcon"><Gem size={20}/></div>
        <div>
          <span className="accountCardLabel">HandMeKey Rewards</span>
          <h2>{tierName(rewards.tier, locale)}</h2>
          <p>{ui.earn(rewards.pointsPerJod)}</p>
          <small>{ui.qualifying(rewards.qualifyingNights,rewards.qualifyingStays)}</small>
        </div>
        <Link href="/account/rewards">{ui.openRewards} →</Link>
      </section>
      <section className="accountCard accountIdentityCard">
        <div className="accountCardIcon"><UserRound size={20}/></div>
        <div><span className="accountCardLabel">{copy.account.profileCard}</span><h2>{profile.displayName}</h2><p>{profile.email}</p><small>{ui.memberSince(memberSince)}</small></div>
        <Link href="/account/profile">{copy.account.open} →</Link>
      </section>
      <section className="accountCard">
        <div className="accountCardIcon"><KeyRound size={20}/></div>
        <div><span className="accountCardLabel">{copy.account.securityCard}</span><h2>{copy.account.security}</h2><p>{copy.account.securityCardBody}</p></div>
        <Link href="/account/security">{copy.account.open} →</Link>
      </section>
      <section className="accountCard">
        <div className="accountCardIcon"><Luggage size={20}/></div>
        <div><span className="accountCardLabel">{copy.account.tripsCard}</span><h2>{copy.account.trips}</h2><p>{copy.account.tripsCardBody}</p></div>
        <Link href="/trips">{copy.account.open} →</Link>
      </section>
      <section className="accountCard">
        <div className="accountCardIcon"><Bell size={20}/></div>
        <div><span className="accountCardLabel">{copy.account.alertsCard}</span><h2>{copy.account.alerts}</h2><p>{copy.account.alertsCardBody}</p></div>
        <Link href="/account/alerts">{copy.account.open} →</Link>
      </section>
    </div>

    <section className="accountLanguageCard" style={{marginTop:24}}>
      <div><span className="accountCardLabel"><Languages size={16}/> {copy.account.preferences}</span><h3>{copy.account.prefTitle}</h3><p>{copy.account.prefBody}</p></div>
      <LanguageSwitcher locale={locale}/>
    </section>
  </AccountShell>;
}

function Metric({value,label,href,locale}:{value:number|string;label:string;href:string;locale:GuestLocale}) {
  return <Link className="accountMetric" href={href}><strong>{typeof value === "number" ? value.toLocaleString(guestIntlLocale(locale)) : value}</strong><span>{label}</span></Link>;
}

function tierName(tier: "MEMBER" | "GOLD" | "BLACK", locale: GuestLocale): string {
  if (tier === "GOLD") return "Key Gold";
  if (tier === "BLACK") return "Key Black";
  return accountOverviewUiCopy(locale).memberTier;
}
