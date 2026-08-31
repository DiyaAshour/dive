import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, BellRing, MessagesSquare } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { guestDictionary } from "@/lib/guest-i18n";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import AuthForm from "./auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect("/trips");
  const market = await requestGuestMarket();
  const copy = guestDictionary(market.locale);

  return <main className="authPage customerAuthPage" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader minimal/>
    <section className="shell authShell premiumAuthShell">
      <div className="authIntro">
        <span className="eyebrow">{copy.login.eyebrow}</span>
        <h1>{copy.login.title}</h1>
        <p>{copy.login.intro}</p>
        <div className="authBenefits">
          <div><BadgeCheck size={20}/><span><strong>{copy.login.verified}</strong><small>{copy.login.verifiedSub}</small></span></div>
          <div><BellRing size={20}/><span><strong>{copy.login.alerts}</strong><small>{copy.login.alertsSub}</small></span></div>
          <div><MessagesSquare size={20}/><span><strong>{copy.login.messages}</strong><small>{copy.login.messagesSub}</small></span></div>
        </div>
        <p className="partnerAuthPrompt">{copy.login.partner} <Link href="/partner/login">{copy.login.partnerCta} →</Link></p>
      </div>
      <AuthForm portal="guest" locale={market.locale}/>
    </section>
  </main>;
}
