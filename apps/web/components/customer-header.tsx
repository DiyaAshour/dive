import Link from "next/link";
import { Bell, BookOpenText, Building2, Sparkles, UserRound } from "lucide-react";
import { dictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { currentUser } from "@/lib/server-session";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import { SignOutButton } from "./sign-out-button";

type CustomerHeaderProps = Readonly<{minimal?: boolean}>;

export async function CustomerHeader({minimal = false}: CustomerHeaderProps) {
  const [user, locale] = await Promise.all([currentUser(), requestLocale()]);
  const copy = dictionary(locale);
  const accountLabel = user?.displayName.trim().split(/\s+/)[0] || copy.nav.account;
  const rewardsLabel = locale === "ar" ? "المكافآت" : "Rewards";
  const guideLabel = locale === "ar" ? "دليل السفر" : "Travel guide";

  return <header className="siteHeader">
    <div className="shell siteHeaderInner">
      <Brand />
      {!minimal && <nav className="siteNav" aria-label={copy.nav.account}>
        <Link href="/search">{copy.nav.stays}</Link>
        <Link href={`/rewards/${locale}`}><Sparkles size={15}/>{rewardsLabel}</Link>
        <Link href={`/blog/${locale}`}><BookOpenText size={15}/>{guideLabel}</Link>
        <Link href="/trips">{copy.nav.trips}</Link>
        <Link href="/account/alerts"><Bell size={16}/>{copy.nav.alerts}</Link>
      </nav>}
      <div className="siteActions">
        <LanguageSwitcher locale={locale} compact/>
        {!minimal && <Link className="partnerEntry" href="/partner"><Building2 size={16}/>{copy.nav.partner}</Link>}
        {user ? <>
          <Link className="accountButton" href="/account" title={`${copy.nav.account} · ${user.email}`}><UserRound size={16}/><span>{accountLabel}</span></Link>
          {!minimal && <SignOutButton locale={locale}/>} 
        </> : <Link className="accountButton" href="/login"><UserRound size={16}/><span>{copy.nav.signIn}</span></Link>}
      </div>
    </div>
  </header>;
}
