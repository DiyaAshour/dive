import Link from "next/link";
import {Activity, Building2, FileCheck2, LayoutDashboard, MessageSquareWarning, Users} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import {direction} from "@/lib/i18n";
import {portalDictionary} from "@/lib/portal-i18n";
import {AdminSignOutButton} from "./admin-sign-out-button";
import {Brand} from "./brand";
import {LanguageSwitcher} from "./language-switcher";

type Active = "overview" | "verification" | "properties" | "reviews" | "access" | "audit";
type Principal = Readonly<{
  user: {displayName: string; email: string};
}>;

type Props = Readonly<{
  locale: Locale;
  principal: Principal;
  active: Active;
  counts?: {verification: number; hiddenReviews: number};
  children: React.ReactNode;
}>;

export function AdminShell({locale, principal, active, counts = {verification: 0, hiddenReviews: 0}, children}: Props) {
  const copy = portalDictionary(locale);
  const admin = copy.admin;
  const dashboardHref = (section: Active) => section === "overview" ? "/admin" : `/admin#${section}`;
  return <main className="adminApp" dir={direction(locale)}>
    <aside className="adminSidebar">
      <div className="adminBrand"><Brand href="/admin" inverse/><span>{admin.name}</span></div>
      <nav className="adminNav" aria-label={admin.name}>
        <span>{admin.operate}</span>
        <Link className={active === "overview" ? "active" : ""} href={dashboardHref("overview")}><LayoutDashboard size={17}/>{admin.overview}</Link>
        <Link className={active === "verification" ? "active" : ""} href={dashboardHref("verification")}><FileCheck2 size={17}/>{admin.verification}{counts.verification > 0 && <b>{counts.verification}</b>}</Link>
        <Link className={active === "properties" ? "active" : ""} href="/admin/properties"><Building2 size={17}/>{admin.properties}</Link>
        <Link className={active === "reviews" ? "active" : ""} href="/admin/reviews"><MessageSquareWarning size={17}/>{admin.reviews}{counts.hiddenReviews > 0 && <b>{counts.hiddenReviews}</b>}</Link>
        <span>{admin.control}</span>
        <Link className={active === "access" ? "active" : ""} href={dashboardHref("access")}><Users size={17}/>{admin.access}</Link>
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
