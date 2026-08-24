import Link from "next/link";
import { BarChart3, Hotel, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { requestLocale } from "@/lib/request-locale";
import { direction } from "@/lib/i18n";
import { portalDictionary } from "@/lib/portal-i18n";
import AuthForm from "../../login/auth-form";

export default async function PartnerLoginPage() {
  const locale=await requestLocale();const copy=portalDictionary(locale).partner;
  return <main className="partnerAuthPage" dir={direction(locale)}>
    <header className="partnerAuthHeader"><div className="shell"><Brand inverse/><div className="partnerHeaderTools"><LanguageSwitcher locale={locale} compact/><Link href="/">{copy.backMarketplace}</Link></div></div></header>
    <section className="shell partnerAuthShell">
      <div className="partnerAuthIntro"><span className="partnerEyebrow">{copy.partnerAccess}</span><h1>{copy.authHero}</h1><p>{copy.authBody}</p><div className="partnerAuthBenefits"><div><Hotel size={20}/><span><strong>{copy.propertyControl}</strong><small>{copy.propertyControlBody}</small></span></div><div><BarChart3 size={20}/><span><strong>{copy.commercialVisibility}</strong><small>{copy.commercialVisibilityBody}</small></span></div><div><ShieldCheck size={20}/><span><strong>{copy.reviewPublishing}</strong><small>{copy.reviewPublishingBody}</small></span></div></div><p className="partnerAuthSwitch">{copy.travelerInstead} <Link href="/login">{copy.travelerSignIn} →</Link></p></div>
      <AuthForm portal="partner" locale={locale}/>
    </section>
  </main>;
}
