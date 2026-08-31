import Link from "next/link";
import { Bell, BookOpenText, Building2, Menu, Sparkles, UserRound } from "lucide-react";
import { guestDictionary } from "@/lib/guest-i18n";
import { guestUiCopy } from "@/lib/guest-ui-copy";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { MarketSwitcher } from "./market-switcher";
import { MobileAppNav } from "./mobile-app-nav";
import { SignOutButton } from "./sign-out-button";
import { SiteBrand } from "./site-brand";

type CustomerHeaderProps = Readonly<{minimal?: boolean}>;

export async function CustomerHeader({minimal = false}: CustomerHeaderProps) {
  const [user, market] = await Promise.all([currentUser(), requestGuestMarket()]);
  const copy = guestDictionary(market.locale);
  const ui = guestUiCopy(market.locale);
  const accountLabel = user?.displayName.trim().split(/\s+/)[0] || copy.nav.account;
  const marketEdge = market.direction === "rtl" ? "right" : "left";
  const rewardsHref = `/rewards/${market.baseLocale}`;

  const navLinks = <>
    <Link href="/search">{copy.nav.stays}</Link>
    <Link href={rewardsHref}><Sparkles size={15}/>{ui.header.rewards}</Link>
    <Link href={`/blog/${market.baseLocale}`}><BookOpenText size={15}/>{ui.header.guide}</Link>
    <Link href="/trips">{copy.nav.trips}</Link>
    <Link href="/account/alerts"><Bell size={16}/>{copy.nav.alerts}</Link>
  </>;

  return <>
    <header className="siteHeader">
      <div className="desktopMarketSwitcher"><MarketSwitcher locale={market.locale} currency={market.currency} countryCode={market.countryCode} edge={marketEdge}/></div>
      <div className="shell siteHeaderInner">
        <SiteBrand />
        {!minimal && <nav className="siteNav" aria-label={copy.nav.account}>{navLinks}</nav>}
        <div className="siteActions">
          {!minimal && <Link className="partnerEntry" href="/partner"><Building2 size={16}/>{copy.nav.partner}</Link>}
          <div className="compactMarketSwitcher"><MarketSwitcher locale={market.locale} currency={market.currency} countryCode={market.countryCode}/></div>
          {user ? <>
            <Link className="accountButton" href="/account" title={`${copy.nav.account} · ${user.email}`}><UserRound size={16}/><span>{accountLabel}</span></Link>
            {!minimal && <SignOutButton locale={market.baseLocale}/>} 
          </> : <Link className="accountButton" href="/login"><UserRound size={16}/><span>{copy.nav.signIn}</span></Link>}
          {!minimal && <details className="mobileSiteNav">
            <summary aria-label={ui.header.menu}><Menu size={20}/><span>{ui.header.menu}</span></summary>
            <div className="mobileSiteNavPanel">
              <nav aria-label={ui.header.menu}>{navLinks}</nav>
              <Link className="mobilePartnerEntry" href="/partner"><Building2 size={17}/>{copy.nav.partner}</Link>
              {user && <SignOutButton locale={market.baseLocale}/>} 
            </div>
          </details>}
        </div>
      </div>
    </header>
    {!minimal && <MobileAppNav locale={market.locale} rewardsHref={rewardsHref}/>} 
  </>;
}
