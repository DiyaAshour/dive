import Link from "next/link";
import { Menu, UserRound } from "lucide-react";
import { guestDictionary } from "@/lib/guest-i18n";
import { guestUiCopy } from "@/lib/guest-ui-copy";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { CustomerContextNav, CustomerContextPartnerLink } from "./customer-context-nav";
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

  const contextualNav = <CustomerContextNav
    locale={market.locale}
    staysSearchLabel={copy.home.search}
    rewardsLabel={ui.header.rewards}
    guideLabel={ui.header.guide}
    tripsLabel={copy.nav.trips}
    alertsLabel={copy.nav.alerts}
    rewardsHref={rewardsHref}
  />;

  return <>
    <header className="siteHeader">
      <div className="desktopMarketSwitcher"><MarketSwitcher locale={market.locale} currency={market.currency} countryCode={market.countryCode} edge={marketEdge}/></div>
      <div className="shell siteHeaderInner">
        <SiteBrand />
        {!minimal && <nav className="siteNav" aria-label={copy.nav.account}>{contextualNav}</nav>}
        <div className="siteActions">
          {!minimal && <CustomerContextPartnerLink locale={market.locale} staysLabel={copy.nav.partner}/>} 
          <div className="compactMarketSwitcher"><MarketSwitcher locale={market.locale} currency={market.currency} countryCode={market.countryCode}/></div>
          {user ? <>
            <Link className="accountButton" href="/account" title={`${copy.nav.account} · ${user.email}`}><UserRound size={16}/><span>{accountLabel}</span></Link>
            {!minimal && <SignOutButton locale={market.baseLocale}/>} 
          </> : <Link className="accountButton" href="/login"><UserRound size={16}/><span>{copy.nav.signIn}</span></Link>}
          {!minimal && <details className="mobileSiteNav">
            <summary aria-label={ui.header.menu}><Menu size={20}/><span>{ui.header.menu}</span></summary>
            <div className="mobileSiteNavPanel">
              <nav aria-label={ui.header.menu}>{contextualNav}</nav>
              <CustomerContextPartnerLink locale={market.locale} staysLabel={copy.nav.partner} mobile/>
              {user && <SignOutButton locale={market.baseLocale}/>} 
            </div>
          </details>}
        </div>
      </div>
    </header>
    {!minimal && <MobileAppNav locale={market.locale} rewardsHref={rewardsHref}/>} 
  </>;
}
