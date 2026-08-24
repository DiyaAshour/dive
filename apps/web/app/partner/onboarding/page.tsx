import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { currentUser } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { direction } from "@/lib/i18n";
import { portalDictionary } from "@/lib/portal-i18n";
import OnboardingForm from "./onboarding-form";

export default async function PartnerOnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/partner/login");
  const locale=await requestLocale();const copy=portalDictionary(locale).partner;
  return <main className="partnerOnboardingPage" dir={direction(locale)}>
    <header className="partnerOnboardingHeader"><div className="shell"><Brand inverse/><div className="partnerHeaderTools"><LanguageSwitcher locale={locale} compact/><span>{copy.onboarding}</span><Link href="/hotel-dashboard">{copy.openHub}</Link></div></div></header>
    <section className="shell partnerOnboardingShell">
      <div className="partnerOnboardingIntro"><span className="partnerEyebrow">{copy.stepOne}</span><h1>{copy.onboardingHero}</h1><p>{copy.onboardingBody}</p><div className="onboardingPromise"><div><CheckCircle2 size={19}/><span><strong>{copy.draftDefault}</strong><small>{copy.draftDefaultBody}</small></span></div><div><CheckCircle2 size={19}/><span><strong>{copy.sourceTruth}</strong><small>{copy.sourceTruthBody}</small></span></div><div><CheckCircle2 size={19}/><span><strong>{copy.reviewBeforeLive}</strong><small>{copy.reviewBeforeLiveBody}</small></span></div></div><div className="partnerSetupRail"><span className="active"><b>01</b>{copy.property}</span><span><b>02</b>{locale==="ar"?"المحتوى والصور":"Content & media"}</span><span><b>03</b>{locale==="ar"?"الغرف والأسعار":"Rooms & rates"}</span><span><b>04</b>{locale==="ar"?"التوفر":"Availability"}</span><span><b>05</b>{locale==="ar"?"التحقق":"Verification"}</span></div></div>
      <OnboardingForm locale={locale}/>
    </section>
  </main>;
}
