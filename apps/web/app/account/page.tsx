import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Gem, KeyRound, Languages, Luggage, UserRound, WalletCards } from "lucide-react";
import { getAccountOverview, getAccountProfile, getLoyaltyOverview, getWalletOverview } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { dictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { currentUser } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const [profile,overview,rewards,wallet,locale] = await Promise.all([getAccountProfile(user.id), getAccountOverview(user.id), getLoyaltyOverview(user.id), getWalletOverview(user.id), requestLocale()]);
  const copy = dictionary(locale);
  const firstName = profile.displayName.trim().split(/\s+/)[0] || copy.nav.account;
  const welcome = locale === "ar" ? `مرحبًا بعودتك، ${firstName}` : `Welcome back, ${firstName}`;
  const memberSince = profile.createdAt.toLocaleDateString(locale === "ar" ? "ar-JO" : "en", {year:"numeric",month:"long"});
  const rewardsLabel = locale === "ar" ? "نقاط HandMeKey" : "HandMeKey points";

  return <AccountShell active="overview" eyebrow={copy.account.overviewEyebrow} title={welcome} description={copy.account.overviewBody}>
    <div className="accountMetrics">
      <Metric value={wallet.balance.toFixed(2)} label={locale === "ar" ? `رصيد المحفظة · ${wallet.currency}` : `Wallet balance · ${wallet.currency}`} href="/account/wallet"/>
      <Metric value={rewards.pointsBalance} label={rewardsLabel} href="/account/rewards"/>
      <Metric value={overview.upcomingTrips} label={copy.account.upcoming} href="/trips"/>
      <Metric value={overview.activePriceWatches} label={copy.account.activeWatches} href="/account/alerts"/>
      <Metric value={overview.unreadNotifications} label={copy.account.unreadAlerts} href="/account/alerts"/>
      <Metric value={overview.totalTrips} label={copy.account.totalTrips} href="/trips"/>
    </div>

    <div className="accountGrid">
      <section className="accountCard walletAccountCard">
        <div className="accountCardIcon"><WalletCards size={20}/></div>
        <div>
          <span className="accountCardLabel">HandMeKey Wallet</span>
          <h2>{wallet.balance.toFixed(2)} {wallet.currency}</h2>
          <p>{locale === "ar" ? "حوّل نقاط Rewards إلى رصيد واستخدمه وحده أو مع وسيلة دفع ثانية على حجوزاتك." : "Convert Rewards points into credit and use it alone or together with another payment method on bookings."}</p>
          <small>{locale === "ar" ? `${wallet.convertiblePoints.toLocaleString()} نقطة متاحة للتحويل حاليًا` : `${wallet.convertiblePoints.toLocaleString()} points currently available to convert`}</small>
        </div>
        <Link href="/account/wallet">{locale === "ar" ? "افتح المحفظة" : "Open Wallet"} →</Link>
      </section>
      <section className="accountCard rewardsAccountCard">
        <div className="accountCardIcon"><Gem size={20}/></div>
        <div>
          <span className="accountCardLabel">HandMeKey Rewards</span>
          <h2>{tierName(rewards.tier, locale)}</h2>
          <p>{locale === "ar" ? `اكسب ${rewards.pointsPerJod} نقطة لكل دينار مؤهل من سعر الغرفة بعد إتمام الإقامة.` : `Earn ${rewards.pointsPerJod} points for every eligible JOD of room base after a completed stay.`}</p>
          <small>{locale === "ar" ? `${rewards.qualifyingNights} ليلة مؤهلة · ${rewards.qualifyingStays} إقامة مكتملة` : `${rewards.qualifyingNights} qualifying nights · ${rewards.qualifyingStays} completed stays`}</small>
        </div>
        <Link href="/account/rewards">{locale === "ar" ? "افتح المكافآت" : "Open rewards"} →</Link>
      </section>
      <section className="accountCard accountIdentityCard">
        <div className="accountCardIcon"><UserRound size={20}/></div>
        <div><span className="accountCardLabel">{copy.account.profileCard}</span><h2>{profile.displayName}</h2><p>{profile.email}</p><small>{locale === "ar" ? `عضو منذ ${memberSince}` : `Member since ${memberSince}`}</small></div>
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

function Metric({value,label,href}:{value:number|string;label:string;href:string}) {
  return <Link className="accountMetric" href={href}><strong>{typeof value === "number" ? value.toLocaleString() : value}</strong><span>{label}</span></Link>;
}

function tierName(tier: "MEMBER" | "GOLD" | "BLACK", locale: "en" | "ar"): string {
  if (tier === "GOLD") return locale === "ar" ? "Key Gold" : "Key Gold";
  if (tier === "BLACK") return locale === "ar" ? "Key Black" : "Key Black";
  return locale === "ar" ? "عضو Rewards" : "Rewards Member";
}
