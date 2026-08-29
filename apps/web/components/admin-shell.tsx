import Link from "next/link";
import {Activity, BookOpenText, Building2, FileCheck2, Gem, Globe2, LayoutDashboard, Mail, MessageSquareWarning, Rocket, Users, WalletCards} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import {direction} from "@/lib/i18n";
import {portalDictionary} from "@/lib/portal-i18n";
import {AdminSignOutButton} from "./admin-sign-out-button";
import {Brand} from "./brand";
import {LanguageSwitcher} from "./language-switcher";

type Active = "overview" | "verification" | "properties" | "reviews" | "blog" | "email" | "distribution" | "finance" | "rewards" | "launch" | "access" | "audit";
type Principal = Readonly<{
  user: {displayName: string; email: string};
}>;

type Props = Readonly<{
  locale: Locale;
  principal: Principal;
  active: Active;
  counts?: {verification: number; hiddenReviews: number; emailOps?: number};
  children: React.ReactNode;
}>;

export function AdminShell({locale, principal, active, counts = {verification: 0, hiddenReviews: 0, emailOps: 0}, children}: Props) {
  const copy = portalDictionary(locale);
  const admin = copy.admin;
  const dashboardHref = (section: Active) => section === "overview" ? "/admin" : `/admin#${section}`;
  const blogLabel = locale === "ar" ? "المحتوى والمدونة" : "Content & blog";
  const communicationsLabel = locale === "ar" ? "الاتصالات" : "Communications";
  const emailLabel = locale === "ar" ? "البريد الإلكتروني" : "Email";
  const distributionLabel = locale === "ar" ? "التوزيع والقنوات" : "Distribution";
  const googleHotelsLabel = locale === "ar" ? "فنادق Google" : "Google Hotels";
  const financeLabel = locale === "ar" ? "الدفعات والتسويات" : "Payouts & settlement";
  const rewardsLabel = locale === "ar" ? "المكافآت والعضويات" : "Rewards & memberships";
  const launchLabel = locale === "ar" ? "ما قبل الإطلاق" : "Pre-launch";
  const accessLabel = locale === "ar" ? "المستخدمون والصلاحيات" : "Users & access";
  return <main className="adminApp" dir={direction(locale)}>
    <aside className="adminSidebar">
      <div className="adminBrand"><Brand href="/admin" inverse/><span>{admin.name}</span></div>
      <nav className="adminNav" aria-label={admin.name}>
        <span>{admin.operate}</span>
        <Link className={active === "overview" ? "active" : ""} href={dashboardHref("overview")}><LayoutDashboard size={17}/>{admin.overview}</Link>
        <Link className={active === "verification" ? "active" : ""} href={dashboardHref("verification")}><FileCheck2 size={17}/>{admin.verification}{counts.verification > 0 && <b>{counts.verification}</b>}</Link>
        <Link className={active === "properties" ? "active" : ""} href="/admin/properties"><Building2 size={17}/>{admin.properties}</Link>
        <Link className={active === "reviews" ? "active" : ""} href="/admin/reviews"><MessageSquareWarning size={17}/>{admin.reviews}{counts.hiddenReviews > 0 && <b>{counts.hiddenReviews}</b>}</Link>
        <Link className={active === "blog" ? "active" : ""} href="/admin/blog"><BookOpenText size={17}/>{blogLabel}</Link>
        <span>{communicationsLabel}</span>
        <Link className={active === "email" ? "active" : ""} href="/admin/communications/email"><Mail size={17}/>{emailLabel}{(counts.emailOps ?? 0) > 0 && <b>{counts.emailOps}</b>}</Link>
        <span>{distributionLabel}</span>
        <Link className={active === "distribution" ? "active" : ""} href="/admin/distribution/google-hotels"><Globe2 size={17}/>{googleHotelsLabel}</Link>
        <span>{locale === "ar" ? "المالية" : "Finance"}</span>
        <Link className={active === "finance" ? "active" : ""} href="/admin/finance/payouts"><WalletCards size={17}/>{financeLabel}</Link>
        <span>{admin.control}</span>
        <Link className={active === "rewards" ? "active" : ""} href="/admin/rewards"><Gem size={17}/>{rewardsLabel}</Link>
        <Link className={active === "launch" ? "active" : ""} href="/admin/site"><Rocket size={17}/>{launchLabel}</Link>
        <Link className={active === "access" ? "active" : ""} href="/admin/access"><Users size={17}/>{accessLabel}</Link>
        <Link className={active === "audit" ? "active" : ""} href={dashboardHref("audit")}><Activity size={17}/>{admin.audit}</Link>
      </nav>
      <div className="adminSidebarFoot">
        <LanguageSwitcher locale={locale} compact/>
        <div><span>{copy.common.signedInAs}</span><strong>{principal.user.displayName}</strong><small>{principal.user.email}</small></div>
        <AdminSignOutButton locale={locale}/>
      </div>
    </aside>
    <section className="adminMain">{children}</section>
  </main>;
}