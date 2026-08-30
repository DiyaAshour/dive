import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {Rocket, ShieldCheck} from "lucide-react";
import {getAdminNavigationCounts, getPlatformAccessControl, getSiteIdentityConfig} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {getSiteLaunchConfig} from "@/lib/site-launch";
import SiteIdentityControl from "./site-identity-control";
import SiteLaunchControl from "./site-launch-control";

export const metadata: Metadata = {title: "Brand & Site Control"};
export const dynamic = "force-dynamic";

export default async function SiteLaunchAdminPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fsite");
  const locale = await requestLocale();
  const [counts, launchConfig, identity, access] = await Promise.all([
    getAdminNavigationCounts(principal.user.id),
    getSiteLaunchConfig(),
    getSiteIdentityConfig(),
    getPlatformAccessControl(principal.user.id),
  ]);
  const ar = locale === "ar";

  return <AdminShell locale={locale} principal={principal} active="launch" counts={counts}>
    <header className="adminTopbar">
      <div><span className="eyebrow">{ar ? "تحكم المنصة" : "PLATFORM CONTROL"}</span><h1>{ar ? "هوية البراند والإطلاق" : "Brand identity & launch"}</h1><p>{ar ? "تحكم بملفات هوية HandMeKey العامة ووضع الإطلاق من مكان واحد. عناوين ووصف SEO تبقى ضمن قوالب الصفحات." : "Control public brand assets and launch state from one place. SEO titles and descriptions remain owned by page templates."}</p></div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{access.actor.isOwner ? "Platform Owner" : (ar ? "جلسة مسؤول" : "Administrator session")}</strong><small>{ar ? "التغييرات الحساسة تسجل في سجل التدقيق" : "Sensitive changes are written to the audit log"}</small></span></div>
    </header>

    <SiteIdentityControl
      locale={locale}
      initialConfig={identity}
      isOwner={access.actor.isOwner}
      ownerName={access.owner?.displayName ?? null}
      ownerEmail={access.owner?.email ?? null}
    />

    <section className="adminSection">
      <div className="adminSectionTitle"><div><span className="eyebrow"><Rocket size={14}/> {ar ? "الموقع العام" : "PUBLIC SITE"}</span><h2>{ar ? "تحكم بما يراه الزائر قبل الإطلاق" : "Control what visitors see before launch"}</h2></div></div>
      <SiteLaunchControl locale={locale} initialConfig={launchConfig}/>
    </section>
  </AdminShell>;
}
