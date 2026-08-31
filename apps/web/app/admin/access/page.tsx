import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {ShieldCheck, Users} from "lucide-react";
import {getAdminNavigationCounts, getIdentityDirectory} from "@platform/server";
import type {IdentityDirectoryRole, IdentityDirectorySort, IdentityDirectoryStatus} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import PlatformAccessDirectory from "./platform-access-directory";
import PlatformSessionControl from "./platform-session-control";

export const metadata: Metadata = {title: "Platform Administrators Control Panel"};
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminAccessPage({searchParams}: Readonly<{searchParams:SearchParams}>) {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Faccess");
  const locale = await requestLocale();
  const params = await searchParams;
  const role = enumParam(params.role, ["ALL","GUEST","HOTEL_USER","PLATFORM_ADMIN"] as const, "ALL");
  const status = enumParam(params.status, ["ALL","ACTIVE","LOCKED"] as const, "ALL");
  const sort = enumParam(params.sort, ["NEWEST","OLDEST","NAME"] as const, "NEWEST");
  const page = positiveInt(params.page, 1);
  const pageSize = [25,50,100].includes(positiveInt(params.pageSize,50)) ? positiveInt(params.pageSize,50) : 50;

  const [access, counts] = await Promise.all([
    getIdentityDirectory(principal.user.id, {
      query: scalar(params.q),
      role: role as IdentityDirectoryRole,
      status: status as IdentityDirectoryStatus,
      hotelId: scalar(params.hotel),
      sort: sort as IdentityDirectorySort,
      page,
      pageSize,
    }),
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
  return <AdminShell locale={locale} principal={principal} active="access" counts={counts}>
    <header className="adminTopbar adminAccessTopbar">
      <div>
        <span className="eyebrow">{ar ? "الهوية والصلاحيات" : "Identity & access"}</span>
        <h1>{ar ? "إدارة المستخدمين والصلاحيات" : "Users & permissions"}</h1>
        <p>{ar ? "دليل هوية قابل للتوسع مع بحث وفلاتر وتقسيم صفحات، وتفاصيل الحساب تظهر فقط عند فتح المستخدم." : "A scalable identity directory with server-side search, filters and pagination. Full controls open only when you select a user."}</p>
      </div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{data.actor.isOwner ? "Platform Owner" : "Platform Administrator"}</strong><small>{principal.user.email}</small></span></div>
    </header>

    <section className="adminSection adminAccessIntro">
      <div className="adminSectionTitle">
        <div><span className="eyebrow">{ar ? "سيطرة المنصة" : "Platform authority"}</span><h2><Users size={21}/> {ar ? "دليل الهوية" : "Identity directory"}</h2></div>
      </div>
      <PlatformAccessDirectory locale={locale} initialData={data}/>
      <PlatformSessionControl
        locale={locale}
        isOwner={data.actor.isOwner}
        users={data.users.map((user) => ({id:user.id,displayName:user.displayName,email:user.email,isOwner:user.isOwner}))}
      />
    </section>
  </AdminShell>;
}

function scalar(value:string|string[]|undefined):string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function positiveInt(value:string|string[]|undefined, fallback:number):number {
  const parsed = Number.parseInt(scalar(value),10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function enumParam<const T extends readonly string[]>(value:string|string[]|undefined, allowed:T, fallback:T[number]):T[number] {
  const resolved = scalar(value);
  return (allowed as readonly string[]).includes(resolved) ? resolved as T[number] : fallback;
}
