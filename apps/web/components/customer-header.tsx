import Link from "next/link";
import { Bell, BookOpenText, Building2, Menu, Sparkles, UserRound } from "lucide-react";
import { guestDictionary } from "@/lib/guest-i18n";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { Brand } from "./brand";
import { MarketSwitcher } from "./market-switcher";
import { MobileAppNav } from "./mobile-app-nav";
import { SignOutButton } from "./sign-out-button";

type CustomerHeaderProps = Readonly<{minimal?: boolean}>;

export async function CustomerHeader({minimal = false}: CustomerHeaderProps) {
  const [user, market] = await Promise.all([currentUser(), requestGuestMarket()]);
  const copy = guestDictionary(market.locale);
  const accountLabel = user?.displayName.trim().split(/\s+/)[0] || copy.nav.account;
  const rewardsLabel = market.locale === "ar" ? "المكافآت" : market.locale === "zh" ? "奖励" : "Rewards";
  const guideLabel = market.locale === "ar" ? "دليل السفر" : market.locale === "zh" ? "旅行指南" : "Travel guide";
  const menuLabel = market.locale === "ar" ? "القائمة" : market.locale === "zh" ? "菜单" : "Menu";
  const marketEdge = market.direction === "rtl" ? "right" : "left";
  const rewardsHref = `/rewards/${market.baseLocale}`;

  const navLinks = <>
    <Link href="/search">{copy.nav.stays}</Link>
    <Link href={rewardsHref}><Sparkles size={15}/>{rewardsLabel}</Link>
    <Link href={`/blog/${market.baseLocale}`}><BookOpenText size={15}/>{guideLabel}</Link>
    <Link href="/trips">{copy.nav.trips}</Link>
    <Link href="/account/alerts"><Bell size={16}/>{copy.nav.alerts}</Link>
  </>;

  return <header className="siteHeader">
    <div className="desktopMarketSwitcher"><MarketSwitcher locale={market.locale} currency={market.currency} countryCode={market.countryCode} edge={marketEdge}/></div>
    <div className="shell siteHeaderInner">
      <Brand />
      {!minimal && <nav className="siteNav" aria-label={copy.nav.account}>{navLinks}</nav>}
      <div className="siteActions">
        {!minimal && <Link className="partnerEntry" href="/partner"><Building2 size={16}/>{copy.nav.partner}</Link>}
        {user ? <>
          <Link className="accountButton" href="/account" title={`${copy.nav.account} · ${user.email}`}><UserRound size={16}/><span>{accountLabel}</span></Link>
          {!minimal && <SignOutButton locale={market.baseLocale}/>} 
        </> : <Link className="accountButton" href="/login"><UserRound size={16}/><span>{copy.nav.signIn}</span></Link>}
        {!minimal && <details className="mobileSiteNav">
          <summary aria-label={menuLabel}><Menu size={20}/><span>{menuLabel}</span></summary>
          <div className="mobileSiteNavPanel">
            <nav aria-label={menuLabel}>{navLinks}</nav>
            <Link className="mobilePartnerEntry" href="/partner"><Building2 size={17}/>{copy.nav.partner}</Link>
            <div className="mobileMarketSwitcher"><MarketSwitcher locale={market.locale} currency={market.currency} countryCode={market.countryCode}/></div>
            {user && <SignOutButton locale={market.baseLocale}/>} 
          </div>
        </details>}
      </div>
    </div>
    {!minimal && <MobileAppNav locale={market.locale} rewardsHref={rewardsHref}/>} 
  </header>;
}
