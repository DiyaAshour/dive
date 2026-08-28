import Link from "next/link";
import { Bell, BookOpenText, Building2, Sparkles, UserRound } from "lucide-react";
import { guestDictionary } from "@/lib/guest-i18n";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { Brand } from "./brand";
import { MarketSwitcher } from "./market-switcher";
import { SignOutButton } from "./sign-out-button";

type CustomerHeaderProps = Readonly<{minimal?: boolean}>;

export async function CustomerHeader({minimal = false}: CustomerHeaderProps) {
  const [user, market] = await Promise.all([currentUser(), requestGuestMarket()]);
  const copy = guestDictionary(market.locale);
  const accountLabel = user?.displayName.trim().split(/\s+/)[0] || copy.nav.account;
  const rewardsLabel = market.locale === "ar" ? "المكافآت" : market.locale === "zh" ? "奖励" : "Rewards";
  const guideLabel = market.locale === "ar" ? "دليل السفر" : market.locale === "zh" ? "旅行指南" : "Travel guide";

  return <header className="siteHeader">
    <div className="shell siteHeaderInner">
      <Brand />
      {!minimal && <nav className="siteNav" aria-label={copy.nav.account}>
        <Link href="/search">{copy.nav.stays}</Link>
        <Link href={`/rewards/${market.baseLocale}`}><Sparkles size={15}/>{rewardsLabel}</Link>
        <Link href={`/blog/${market.baseLocale}`}><BookOpenText size={15}/>{guideLabel}</Link>
        <Link href="/trips">{copy.nav.trips}</Link>
        <Link href="/account/alerts"><Bell size={16}/>{copy.nav.alerts}</Link>
      </nav>}
      <div className="siteActions">
        <MarketSwitcher locale={market.locale} currency={market.currency} countryCode={market.countryCode}/>
        {!minimal && <Link className="partnerEntry" href="/partner"><Building2 size={16}/>{copy.nav.partner}</Link>}
        {user ? <>
          <Link className="accountButton" href="/account" title={`${copy.nav.account} · ${user.email}`}><UserRound size={16}/><span>{accountLabel}</span></Link>
          {!minimal && <SignOutButton locale={market.baseLocale}/>} 
        </> : <Link className="accountButton" href="/login"><UserRound size={16}/><span>{copy.nav.signIn}</span></Link>}
      </div>
    </div>
  </header>;
}
