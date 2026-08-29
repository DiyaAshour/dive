"use client";

import {useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {Crown, KeyRound, LockKeyhole, RefreshCw, Search, ShieldCheck, UserPlus, Users, X} from "lucide-react";
import type {Locale} from "@/lib/i18n";

type PlatformRole = "GUEST" | "HOTEL_USER" | "PLATFORM_ADMIN";
type HotelRole = "OWNER" | "MANAGER" | "REVENUE" | "FRONT_DESK" | "FINANCE" | "VIEWER";
type MembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

type Hotel = Readonly<{id:string;name:string;slug:string;city:string;status:string}>;
type Membership = Readonly<{
  id:string;
  role:HotelRole;
  status:MembershipStatus;
  createdAt:string;
  updatedAt:string;
  hotel:Hotel;
}>;
type AccessUser = Readonly<{
  id:string;
  email:string;
  displayName:string;
  platformRole:PlatformRole;
  createdAt:string;
  isOwner:boolean;
  accessState:"ACTIVE"|"LOCKED";
  activeStandardSessions:number;
  activeAdminSessions:number;
  lastActivity:string|null;
  hotelMemberships:Membership[];
}>;
type AccessData = Readonly<{
  actor:{id:string;isOwner:boolean};
  owner:{id:string;email:string;displayName:string;createdAt:string}|null;
  counts:{total:number;administrators:number;hotelUsers:number;guests:number;locked:number};
  hotels:Hotel[];
  users:AccessUser[];
}>;

const platformRoles: PlatformRole[] = ["GUEST", "HOTEL_USER", "PLATFORM_ADMIN"];
const hotelRoles: HotelRole[] = ["OWNER", "MANAGER", "REVENUE", "FRONT_DESK", "FINANCE", "VIEWER"];
const membershipStatuses: MembershipStatus[] = ["ACTIVE", "INVITED", "SUSPENDED"];

export default function PlatformAccessControl({locale, initialData}: Readonly<{locale:Locale;initialData:AccessData}>) {
  const router = useRouter();
  const ar = locale === "ar";
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string|null>(null);
  const [notice, setNotice] = useState<{kind:"ok"|"error";text:string}|null>(null);
  const [draftNames, setDraftNames] = useState<Record<string,string>>({});
  const [draftRoles, setDraftRoles] = useState<Record<string,PlatformRole>>({});

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialData.users;
    return initialData.users.filter((user) => `${user.displayName} ${user.email} ${user.platformRole}`.toLowerCase().includes(q));
  }, [initialData.users, query]);

  async function call(path:string, init:RequestInit, success:string) {
    setBusy(path);
    setNotice(null);
    try {
      const response = await fetch(path, {...init, headers:{"content-type":"application/json", ...(init.headers ?? {})}});
      const payload = await response.json().catch(() => null) as {error?:{message?:string}}|null;
      if (!response.ok) throw new Error(payload?.error?.message || `Request failed (${response.status})`);
      setNotice({kind:"ok", text:success});
      router.refresh();
      return true;
    } catch (error) {
      setNotice({kind:"error", text:error instanceof Error ? error.message : "Request failed"});
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function createUser(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const hotelId = String(fd.get("hotelId") ?? "").trim();
    const hotelRole = String(fd.get("hotelRole") ?? "").trim();
    const ok = await call("/api/v1/admin/access/users", {
      method:"POST",
      body:JSON.stringify({
        displayName:String(fd.get("displayName") ?? ""),
        email:String(fd.get("email") ?? ""),
        password:String(fd.get("password") ?? ""),
        platformRole:String(fd.get("platformRole") ?? "GUEST"),
        hotelId:hotelId || null,
        hotelRole:hotelId && hotelRole ? hotelRole : null,
      }),
    }, ar ? "تم إنشاء الحساب." : "Account created.");
    if (ok) form.reset();
  }

  async function saveUser(user:AccessUser) {
    const displayName = draftNames[user.id] ?? user.displayName;
    const platformRole = draftRoles[user.id] ?? user.platformRole;
    const ok = await call(`/api/v1/admin/access/users/${user.id}`, {method:"PATCH", body:JSON.stringify({displayName, platformRole})}, ar ? "تم تحديث الحساب والصلاحية." : "Account access updated.");
    if (ok) {
      setDraftNames((value) => {const next={...value};delete next[user.id];return next;});
      setDraftRoles((value) => {const next={...value};delete next[user.id];return next;});
    }
  }

  async function lockUser(user:AccessUser) {
    if (!window.confirm(ar ? `قفل حساب ${user.email} وإلغاء كل جلساته؟` : `Lock ${user.email} and revoke all sessions?`)) return;
    await call(`/api/v1/admin/access/users/${user.id}/lock`, {method:"POST", body:"{}"}, ar ? "تم قفل الحساب." : "Account locked.");
  }

  async function resetPassword(event:React.FormEvent<HTMLFormElement>, user:AccessUser) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    const ok = await call(`/api/v1/admin/access/users/${user.id}/password`, {method:"POST", body:JSON.stringify({password})}, ar ? "تم تعيين كلمة المرور وإلغاء الجلسات القديمة." : "Password set and old sessions revoked.");
    if (ok) form.reset();
  }

  async function revokeSessions(user:AccessUser) {
    if (!window.confirm(ar ? `إلغاء جميع جلسات ${user.email}؟` : `Revoke every active session for ${user.email}?`)) return;
    await call(`/api/v1/admin/access/users/${user.id}/sessions`, {method:"DELETE", body:"{}"}, ar ? "تم إلغاء جميع الجلسات." : "All sessions revoked.");
  }

  async function saveMembership(event:React.FormEvent<HTMLFormElement>, user:AccessUser, hotelId?:string) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const resolvedHotel = hotelId ?? String(fd.get("hotelId") ?? "");
    await call(`/api/v1/admin/access/users/${user.id}/memberships`, {
      method:"POST",
      body:JSON.stringify({hotelId:resolvedHotel, role:String(fd.get("role") ?? "VIEWER"), status:String(fd.get("status") ?? "ACTIVE")}),
    }, ar ? "تم حفظ عضوية الفندق." : "Hotel membership saved.");
  }

  async function removeMembership(user:AccessUser, membership:Membership) {
    if (!window.confirm(ar ? `إزالة عضوية ${membership.hotel.name}؟` : `Remove access to ${membership.hotel.name}?`)) return;
    await call(`/api/v1/admin/access/users/${user.id}/memberships/${membership.id}`, {method:"DELETE", body:"{}"}, ar ? "تم حذف عضوية الفندق." : "Hotel membership removed.");
  }

  return <div className="platformAccessControl">
    {notice && <div className={`adminAccessNotice ${notice.kind}`}>{notice.kind === "ok" ? <ShieldCheck size={17}/> : <X size={17}/>}<span>{notice.text}</span></div>}

    <div className="ownerAuthorityCard">
      <div className="ownerAuthorityIcon"><Crown size={24}/></div>
      <div>
        <span className="eyebrow">Platform Owner</span>
        <h3>{initialData.owner?.displayName ?? (ar ? "لم يتم تحديد مالك" : "No owner resolved")}</h3>
        <p>{initialData.owner ? `${initialData.owner.email} · ${ar ? "أول مسؤول منصة، وهو الوحيد الذي يملك إدارة الصلاحيات." : "First platform administrator and the only account allowed to control access."}` : (ar ? "يجب أن يوجد مسؤول منصة أول." : "A first platform administrator is required.")}</p>
      </div>
      <span className={initialData.actor.isOwner ? "ownerBadge active" : "ownerBadge"}>{initialData.actor.isOwner ? (ar ? "أنت المالك" : "You are the owner") : (ar ? "عرض فقط" : "Read only")}</span>
    </div>

    <div className="adminAccessKpis">
      <article><span>{ar ? "كل الحسابات" : "All accounts"}</span><strong>{initialData.counts.total}</strong></article>
      <article><span>{ar ? "مسؤولو المنصة" : "Platform admins"}</span><strong>{initialData.counts.administrators}</strong></article>
      <article><span>{ar ? "مستخدمو الفنادق" : "Hotel users"}</span><strong>{initialData.counts.hotelUsers}</strong></article>
      <article><span>{ar ? "المسافرون" : "Travelers"}</span><strong>{initialData.counts.guests}</strong></article>
      <article><span>{ar ? "حسابات مقفلة" : "Locked"}</span><strong>{initialData.counts.locked}</strong></article>
    </div>

    {initialData.actor.isOwner ? <section className="adminAccessCreate adminPanel">
      <div className="adminSectionTitle"><div><span className="eyebrow">{ar ? "إنشاء من الصفر" : "Create from scratch"}</span><h2><UserPlus size={20}/> {ar ? "إنشاء حساب جديد" : "Create account"}</h2><p>{ar ? "أنشئ مستخدمًا أو موظف فندق أو Platform Admin وحدد صلاحياته مباشرة." : "Create a traveler, hotel user or Platform Admin and assign access immediately."}</p></div></div>
      <form className="adminAccessCreateForm" onSubmit={createUser}>
        <label><span>{ar ? "الاسم الكامل" : "Full name"}</span><input name="displayName" required minLength={2} maxLength={120}/></label>
        <label><span>{ar ? "البريد الإلكتروني" : "Email"}</span><input name="email" type="email" required/></label>
        <label><span>{ar ? "كلمة مرور مؤقتة" : "Temporary password"}</span><input name="password" type="password" required minLength={10} autoComplete="new-password"/></label>
        <label><span>{ar ? "دور المنصة" : "Platform role"}</span><select name="platformRole" defaultValue="GUEST">{platformRoles.map((role) => <option key={role} value={role}>{roleLabel(role, ar)}</option>)}</select></label>
        <label><span>{ar ? "فندق اختياري" : "Optional property"}</span><select name="hotelId" defaultValue=""><option value="">{ar ? "بدون فندق" : "No property"}</option>{initialData.hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name} · {hotel.city}</option>)}</select></label>
        <label><span>{ar ? "دور الفندق" : "Hotel role"}</span><select name="hotelRole" defaultValue="VIEWER">{hotelRoles.map((role) => <option key={role} value={role}>{hotelRoleLabel(role, ar)}</option>)}</select></label>
        <button className="primaryButton" disabled={Boolean(busy)} type="submit"><UserPlus size={16}/>{ar ? "إنشاء الحساب" : "Create account"}</button>
      </form>
    </section> : <div className="adminAccessReadOnly"><LockKeyhole size={18}/><span>{ar ? "إدارة الصلاحيات محصورة بحساب Platform Owner. يمكنك مشاهدة الحسابات فقط." : "Access management is restricted to the Platform Owner. You can view accounts but cannot change them."}</span></div>}

    <section className="adminAccessUsers adminPanel">
      <div className="adminSectionTitle">
        <div><span className="eyebrow">{ar ? "دليل الهوية" : "Identity directory"}</span><h2><Users size={20}/> {ar ? "المستخدمون والصلاحيات" : "Users & permissions"}</h2></div>
        <label className="adminAccessSearch"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ar ? "ابحث بالاسم أو الإيميل" : "Search name or email"}/></label>
      </div>

      <div className="adminAccessUserList">
        {users.map((user) => <article className={`adminAccessUserCard ${user.isOwner ? "owner" : ""}`} key={user.id}>
          <div className="adminAccessUserHead">
            <div className="adminAccessAvatar">{initials(user.displayName)}</div>
            <div className="adminAccessIdentity"><strong>{user.displayName}</strong><span>{user.email}</span><small>{ar ? "منذ" : "Since"} {formatDate(user.createdAt, locale)}</small></div>
            <div className="adminAccessBadges">{user.isOwner && <span className="ownerBadge active"><Crown size={13}/>Owner</span>}<span className="roleBadge">{roleLabel(user.platformRole, ar)}</span><span className={user.accessState === "ACTIVE" ? "accessState active" : "accessState locked"}>{user.accessState === "ACTIVE" ? (ar ? "نشط" : "Active") : (ar ? "مقفول" : "Locked")}</span></div>
          </div>

          <div className="adminAccessSessionSummary"><span>{ar ? "جلسات المستخدم" : "User sessions"}<strong>{user.activeStandardSessions}</strong></span><span>{ar ? "جلسات Admin" : "Admin sessions"}<strong>{user.activeAdminSessions}</strong></span><span>{ar ? "عضويات الفنادق" : "Hotel memberships"}<strong>{user.hotelMemberships.length}</strong></span><span>{ar ? "آخر نشاط" : "Last activity"}<strong>{user.lastActivity ? formatDateTime(user.lastActivity, locale) : "—"}</strong></span></div>

          {initialData.actor.isOwner && <div className="adminAccessUserControls">
            <label><span>{ar ? "الاسم" : "Name"}</span><input value={draftNames[user.id] ?? user.displayName} onChange={(event) => setDraftNames((value) => ({...value,[user.id]:event.target.value}))}/></label>
            <label><span>{ar ? "دور المنصة" : "Platform role"}</span><select value={draftRoles[user.id] ?? user.platformRole} disabled={user.isOwner} onChange={(event) => setDraftRoles((value) => ({...value,[user.id]:event.target.value as PlatformRole}))}>{platformRoles.map((role) => <option key={role} value={role}>{roleLabel(role, ar)}</option>)}</select></label>
            <button type="button" className="secondaryButton" disabled={Boolean(busy)} onClick={() => saveUser(user)}>{ar ? "حفظ" : "Save"}</button>
            <button type="button" className="secondaryButton" disabled={Boolean(busy)} onClick={() => revokeSessions(user)}><RefreshCw size={15}/>{ar ? "إلغاء الجلسات" : "Revoke sessions"}</button>
            {!user.isOwner && <button type="button" className="dangerButton" disabled={Boolean(busy) || user.accessState === "LOCKED"} onClick={() => lockUser(user)}><LockKeyhole size={15}/>{ar ? "قفل الحساب" : "Lock account"}</button>}
          </div>}

          {initialData.actor.isOwner && <details className="adminAccessPassword">
            <summary><KeyRound size={15}/>{user.accessState === "LOCKED" ? (ar ? "فتح الحساب وتعيين كلمة مرور" : "Unlock & set password") : (ar ? "إعادة تعيين كلمة المرور" : "Reset password")}</summary>
            <form onSubmit={(event) => resetPassword(event,user)}><input name="password" type="password" minLength={10} required autoComplete="new-password" placeholder={ar ? "10 أحرف على الأقل" : "At least 10 characters"}/><button className="secondaryButton" disabled={Boolean(busy)}>{ar ? "تعيين" : "Set password"}</button></form>
          </details>}

          <div className="adminAccessMemberships">
            <div className="adminAccessMembershipTitle"><strong>{ar ? "صلاحيات الفنادق" : "Hotel access"}</strong>{initialData.actor.isOwner && <small>{ar ? "إضافة نفس الفندق مرة أخرى تعدّل الدور والحالة." : "Selecting an existing property updates its role and status."}</small>}</div>
            {user.hotelMemberships.length === 0 ? <p className="muted">{ar ? "لا توجد عضويات فندقية." : "No hotel memberships."}</p> : user.hotelMemberships.map((membership) => initialData.actor.isOwner ? <form className="adminAccessMembershipRow editable" key={membership.id} onSubmit={(event) => saveMembership(event,user,membership.hotel.id)}>
              <div><strong>{membership.hotel.name}</strong><small>{membership.hotel.city} · {membership.hotel.status}</small></div>
              <select name="role" defaultValue={membership.role}>{hotelRoles.map((role) => <option key={role} value={role}>{hotelRoleLabel(role, ar)}</option>)}</select>
              <select name="status" defaultValue={membership.status}>{membershipStatuses.map((status) => <option key={status} value={status}>{membershipStatusLabel(status, ar)}</option>)}</select>
              <button className="secondaryButton" disabled={Boolean(busy)}>{ar ? "تحديث" : "Update"}</button>
              <button type="button" className="iconDangerButton" disabled={Boolean(busy)} onClick={() => removeMembership(user,membership)} aria-label={ar ? "حذف العضوية" : "Remove membership"}><X size={16}/></button>
            </form> : <div className="adminAccessMembershipRow" key={membership.id}><div><strong>{membership.hotel.name}</strong><small>{membership.hotel.city}</small></div><span>{hotelRoleLabel(membership.role,ar)}</span><span>{membershipStatusLabel(membership.status,ar)}</span></div>)}

            {initialData.actor.isOwner && <form className="adminAccessMembershipAdd" onSubmit={(event) => saveMembership(event,user)}>
              <select name="hotelId" required defaultValue=""><option value="" disabled>{ar ? "اختر الفندق" : "Choose property"}</option>{initialData.hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name} · {hotel.city}</option>)}</select>
              <select name="role" defaultValue="VIEWER">{hotelRoles.map((role) => <option key={role} value={role}>{hotelRoleLabel(role,ar)}</option>)}</select>
              <select name="status" defaultValue="ACTIVE">{membershipStatuses.map((status) => <option key={status} value={status}>{membershipStatusLabel(status,ar)}</option>)}</select>
              <button className="secondaryButton" disabled={Boolean(busy)}>{ar ? "تعيين العضوية" : "Assign membership"}</button>
            </form>}
          </div>

          <div className="adminAccessUserFoot"><Link href="/admin/rewards">{ar ? "إدارة Rewards والعضوية" : "Manage Rewards membership"}</Link></div>
        </article>)}
      </div>
    </section>
  </div>;
}

function roleLabel(role:PlatformRole, ar:boolean) {
  if (!ar) return ({GUEST:"Guest",HOTEL_USER:"Hotel user",PLATFORM_ADMIN:"Platform Admin"} as const)[role];
  return ({GUEST:"مستخدم",HOTEL_USER:"مستخدم فندق",PLATFORM_ADMIN:"مسؤول منصة"} as const)[role];
}
function hotelRoleLabel(role:HotelRole, ar:boolean) {
  if (!ar) return role.split("_").map(capitalize).join(" ");
  return ({OWNER:"مالك الفندق",MANAGER:"مدير",REVENUE:"إيرادات",FRONT_DESK:"استقبال",FINANCE:"مالية",VIEWER:"مشاهدة فقط"} as const)[role];
}
function membershipStatusLabel(status:MembershipStatus, ar:boolean) {
  if (!ar) return capitalize(status.toLowerCase());
  return ({ACTIVE:"نشطة",INVITED:"دعوة",SUSPENDED:"موقوفة"} as const)[status];
}
function capitalize(value:string) {return value.charAt(0).toUpperCase()+value.slice(1).toLowerCase();}
function initials(name:string) {return name.trim().split(/\s+/).slice(0,2).map((part) => part.charAt(0).toUpperCase()).join("") || "U";}
function formatDate(value:string, locale:Locale) {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day:"2-digit",month:"short",year:"numeric"}).format(new Date(value));}
function formatDateTime(value:string, locale:Locale) {return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}
