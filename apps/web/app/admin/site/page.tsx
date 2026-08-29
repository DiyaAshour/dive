import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {Rocket, ShieldCheck} from "lucide-react";
import {getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {getSiteLaunchConfig} from "@/lib/site-launch";
import SiteLaunchControl from "./site-launch-control";

export const metadata: Metadata = {title: "Pre-launch Control"};
export const dynamic = "force-dynamic";

export default async function SiteLaunchAdminPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fsite");
  const locale = await requestLocale();
  const [counts, config] = await Promise.all([
    getAdminNavigationCounts(principal.user.id),
    getSiteLaunchConfig(),
  ]);
  const ar = locale === "ar";

  return <AdminShell locale={locale} principal={principal} active="launch" counts={counts}>
    <header className="adminTopbar">
      <div><span className="eyebrow">{ar ? "التحكم بالإطلاق" : "LAUNCH CONTROL"}</span><h1>{ar ? "وضع ما قبل الإطلاق" : "Pre-launch mode"}</h1><p>{ar ? "حدد لحظة الإطلاق وشغّل صفحة العد التنازلي العامة من مكان واحد." : "Set the launch moment and control the public countdown from one place."}</p></div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{ar ? "للمسؤول فقط" : "Administrator only"}</strong><small>{ar ? "التغييرات تسجل في سجل التدقيق" : "Changes are written to the audit log"}</small></span></div>
    </header>
    <section className="adminSection">
      <div className="adminSectionTitle"><div><span className="eyebrow"><Rocket size={14}/> {ar ? "الموقع العام" : "PUBLIC SITE"}</span><h2>{ar ? "تحكم بما يراه الزائر قبل الإطلاق" : "Control what visitors see before launch"}</h2></div></div>
      <SiteLaunchControl locale={locale} initialConfig={config}/>
    </section>
  </AdminShell>;
}
