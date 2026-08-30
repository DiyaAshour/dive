import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {ShieldCheck, Users} from "lucide-react";
import {getAdminNavigationCounts, getPlatformAccessControl} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import PlatformAccessControl from "./platform-access-control";
import PlatformSessionControl from "./platform-session-control";

export const metadata: Metadata = {title: "Platform Administrators Control Panel"};
export const dynamic = "force-dynamic";

export default async function AdminAccessPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Faccess");
  const locale = await requestLocale();
  const [access, counts] = await Promise.all([
    getPlatformAccessControl(principal.user.id),
    getAdminNavigationCounts(principal.user.id),
  ]);

  const data = {
    ...access,
    owner: access.owner ? {...access.owner, createdAt: access.owner.createdAt.toISOString()} : null,
    users: access.users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastActivity: user.lastActivity?.toISOString() ?? null,
      hotelMemberships: user.hotelMemberships.map((membership) => ({
        ...membership,
        createdAt: membership.createdAt.toISOString(),
        updatedAt: membership.updatedAt.toISOString(),
      })),
    })),
  };

  const ar = locale === "ar";
  const ownerPinned = data.ownerMode === "CONFIGURED";
  return <AdminShell locale={locale} principal={principal} active="access" counts={counts}>
    <header className="adminTopbar adminAccessTopbar">
      <div>
        <span className="eyebrow">{ar ? "الهوية والصلاحيات" : "Identity & access"}</span>
        <h1>Platform administrators control panel</h1>
        <p>{ar ? "إدارة الحسابات، مسؤولي المنصة، عضويات الفنادق، كلمات المرور والجلسات من مكان واحد." : "Create accounts, control platform administrators, assign hotel memberships, reset passwords and revoke sessions from one place."}</p>
      </div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{data.actor.isOwner ? "Platform Owner" : "Platform Administrator"}</strong><small>{principal.user.email}</small></span></div>
    </header>

    <section className="adminSection adminAccessIntro">
      <div className="adminSectionTitle">
        <div><span className="eyebrow">{ar ? "سيطرة المنصة" : "Platform authority"}</span><h2><Users size={21}/> {ar ? "الحسابات والأدوار" : "Accounts & roles"}</h2></div>
      </div>
      <PlatformAccessControl locale={locale} initialData={data}/>
      <div className={`ownerRootStatus ${ownerPinned ? "pinned" : "legacy"}`}>
        <ShieldCheck size={19}/>
        <div>
          <strong>{ownerPinned ? (ar ? "هوية Platform Owner مثبتة" : "Platform Owner identity is pinned") : (ar ? "وضع المالك القديم ما زال فعالًا" : "Legacy owner fallback is still active")}</strong>
          <span>{ownerPinned ? (ar ? "صلاحية المالك مرتبطة بحساب واحد ثابت ولا تعتمد على ترتيب إنشاء مسؤولي المنصة." : "Root authority is bound to one configured account and no longer depends on administrator creation order.") : (ar ? "عرّف PLATFORM_OWNER_USER_ID أو PLATFORM_OWNER_EMAIL في بيئة الإنتاج لتثبيت حساب المالك نهائيًا." : "Set PLATFORM_OWNER_USER_ID or PLATFORM_OWNER_EMAIL in production to pin the owner account permanently.")}</span>
        </div>
      </div>
      <PlatformSessionControl
        locale={locale}
        isOwner={data.actor.isOwner}
        users={data.users.map((user) => ({id:user.id,displayName:user.displayName,email:user.email,isOwner:user.isOwner}))}
      />
    </section>
  </AdminShell>;
}
