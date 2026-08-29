import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {Gem, ShieldCheck} from "lucide-react";
import {getAdminNavigationCounts, getAdminRewardsControlCenter} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import RewardsControlCenter from "./rewards-control-center";

export const metadata: Metadata = {title: "Rewards Control Center"};
export const dynamic = "force-dynamic";

export default async function RewardsAdminPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Frewards");
  const locale = await requestLocale();
  const [counts, dashboard] = await Promise.all([
    getAdminNavigationCounts(principal.user.id),
    getAdminRewardsControlCenter(principal.user.id),
  ]);
  const ar = locale === "ar";
  const serialized = {
    ...dashboard,
    program: {...dashboard.program, updatedAt: dashboard.program.updatedAt.toISOString()},
    members: dashboard.members.map((member) => ({...member, createdAt: member.createdAt.toISOString()})),
    selectedMember: dashboard.selectedMember ? serializeMember(dashboard.selectedMember) : null,
  };

  return <AdminShell locale={locale} principal={principal} active="rewards" counts={counts}>
    <header className="adminTopbar">
      <div><span className="eyebrow">HandMeKey Rewards</span><h1>{ar ? "مركز تحكم Rewards" : "Rewards Control Center"}</h1><p>{ar ? "تحكم بقواعد البرنامج، العضويات، المستويات، أرصدة النقاط والتحويل إلى المحفظة من مكان واحد." : "Control program rules, memberships, tiers, point balances and Wallet conversion from one place."}</p></div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{ar ? "تحكم إداري مدقّق" : "Audited administrator control"}</strong><small>{ar ? "كل تعديل على العضوية أو النقاط يسجل مع السبب" : "Every membership and points change is logged with its reason"}</small></span></div>
    </header>

    <section className="adminSection adminRewardsPage">
      <div className="adminSectionTitle"><div><span className="eyebrow"><Gem size={14}/> {ar ? "البرنامج والعضويات" : "PROGRAM & MEMBERSHIPS"}</span><h2>{ar ? "كل أدوات Rewards في لوحة واحدة" : "Every Rewards control in one workspace"}</h2><p>{ar ? "يمكنك إيقاف الكسب أو الاستبدال، تغيير معدلات النقاط والمستويات، ثم إدارة كل مستخدم بشكل منفصل." : "Pause earning or redemption, change point rates and tier thresholds, then manage each member individually."}</p></div></div>
      <RewardsControlCenter locale={locale} initialDashboard={serialized}/>
    </section>
  </AdminShell>;
}

function serializeMember(member: Awaited<ReturnType<typeof getAdminRewardsControlCenter>>["selectedMember"] & {}) {
  if (!member) return null;
  return {
    ...member,
    createdAt: member.createdAt.toISOString(),
    ledger: member.ledger.map((entry) => ({...entry, createdAt: entry.createdAt.toISOString()})),
  };
}
