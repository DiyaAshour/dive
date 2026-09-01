import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {Activity, BadgeCheck, ShieldCheck} from "lucide-react";
import {Brand} from "@/components/brand";
import {LanguageSwitcher} from "@/components/language-switcher";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {direction} from "@/lib/i18n";
import {portalDictionary} from "@/lib/portal-i18n";
import AdminLoginForm from "./admin-login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {title: "Administrator sign in"};
export const dynamic = "force-dynamic";

function safeNext(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  const isAdminPath = candidate === "/admin" || candidate?.startsWith("/admin/");
  return candidate && isAdminPath && !candidate.startsWith("/admin/login") ? candidate : "/admin";
}

export default async function AdminLoginPage({searchParams}: {searchParams: Promise<{next?: string | string[]}>}) {
  const nextPath = safeNext((await searchParams).next);
  if (await currentAdminPrincipal()) redirect(nextPath);
  const locale = await requestLocale();
  const copy = portalDictionary(locale).admin;
  return <main className={`${styles.page} adminLoginPage`} dir={direction(locale)}>
    <header className="adminLoginHeader"><div className="shell"><Brand inverse/><div className="adminLoginHeaderActions"><LanguageSwitcher locale={locale} compact/><Link href="/">{copy.returnMarketplace}</Link></div></div></header>
    <section className="shell adminLoginShell">
      <div className="adminLoginIntro">
        <span className="adminPortalLabel">HandMeKey {copy.name}</span>
        <h1>{copy.loginHero}</h1>
        <p>{copy.loginBody}</p>
        <div className="adminLoginAssurances">
          <div><ShieldCheck/><span><strong>{copy.separateScope}</strong><small>{copy.separateScopeBody}</small></span></div>
          <div><Activity/><span><strong>{copy.auditedActions}</strong><small>{copy.auditedActionsBody}</small></span></div>
          <div><BadgeCheck/><span><strong>{copy.noRegistration}</strong><small>{copy.noRegistrationBody}</small></span></div>
        </div>
      </div>
      <AdminLoginForm nextPath={nextPath} locale={locale}/>
    </section>
  </main>;
}
