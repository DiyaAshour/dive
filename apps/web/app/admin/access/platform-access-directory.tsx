"use client";

import {useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ChevronLeft, ChevronRight, Crown, KeyRound, LockKeyhole, MoreHorizontal, RefreshCw, Search, ShieldCheck, UserPlus, Users, X} from "lucide-react";
import type {Locale} from "@/lib/i18n";

type PlatformRole = "GUEST" | "HOTEL_USER" | "PLATFORM_ADMIN";
type HotelRole = "OWNER" | "MANAGER" | "REVENUE" | "FRONT_DESK" | "FINANCE" | "VIEWER";
type MembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
type DirectoryStatus = "ALL" | "ACTIVE" | "LOCKED";
type DirectoryRole = "ALL" | PlatformRole;
type DirectorySort = "NEWEST" | "OLDEST" | "NAME";

type Hotel = Readonly<{id:string;name:string;slug:string;city:string;status:string}>;
type Membership = Readonly<{id:string;role:HotelRole;status:MembershipStatus;createdAt:string;updatedAt:string;hotel:Hotel}>;
type AccessUser = Readonly<{
  id:string;email:string;displayName:string;platformRole:PlatformRole;createdAt:string;isOwner:boolean;
  accessState:"ACTIVE"|"LOCKED";activeStandardSessions:number;activeAdminSessions:number;lastActivity:string|null;hotelMemberships:Membership[];
}>;
type DirectoryData = Readonly<{
  actor:{id:string;isOwner:boolean};
  owner:{id:string;email:string;displayName:string;createdAt:string}|null;
  counts:{total:number;administrators:number;hotelUsers:number;guests:number;locked:number};
  filteredTotal:number;
  pagination:{page:number;pageSize:number;pageCount:number};
  filters:{query:string;role:DirectoryRole;status:DirectoryStatus;hotelId:string;sort:DirectorySort};
  hotels:Hotel[];
  users:AccessUser[];
}>;

const platformRoles: PlatformRole[] = ["GUEST","HOTEL_USER","PLATFORM_ADMIN"];
const hotelRoles: HotelRole[] = ["OWNER","MANAGER","REVENUE","FRONT_DESK","FINANCE","VIEWER"];
const membershipStatuses: MembershipStatus[] = ["ACTIVE","INVITED","SUSPENDED"];

export default function PlatformAccessDirectory({locale, initialData}: Readonly<{locale:Locale;initialData:DirectoryData}>) {
  const router = useRouter();
  const ar = locale === "ar";
  const [query, setQuery] = useState(initialData.filters.query);
  const [selectedUserId, setSelectedUserId] = useState<string|null>(null);
  const [busy, setBusy] = useState<string|null>(null);
  const [notice, setNotice] = useState<{kind:"ok"|"error";text:string}|null>(null);
  const [draftNames, setDraftNames] = useState<Record<string,string>>({});
  const [draftRoles, setDraftRoles] = useState<Record<string,PlatformRole>>({});
  const selectedUser = useMemo(() => initialData.users.find((user) => user.id === selectedUserId) ?? null, [initialData.users, selectedUserId]);

  function navigate(patch:Partial<{q:string;role:DirectoryRole;status:DirectoryStatus;hotel:string;sort:DirectorySort;page:number;pageSize:number}>) {
    const params = new URLSearchParams();
    const next = {
      q: patch.q ?? initialData.filters.query,
      role: patch.role ?? initialData.filters.role,
      status: patch.status ?? initialData.filters.status,
      hotel: patch.hotel ?? initialData.filters.hotelId,
      sort: patch.sort ?? initialData.filters.sort,
      page: patch.page ?? (Object.keys(patch).some((key) => key !== "page" && key !== "pageSize") ? 1 : initialData.pagination.page),
      pageSize: patch.pageSize ?? initialData.pagination.pageSize,
    };
    if (next.q) params.set("q", next.q);
    if (next.role !== "ALL") params.set("role", next.role);
    if (next.status !== "ALL") params.set("status", next.status);
    if (next.hotel) params.set("hotel", next.hotel);
    if (next.sort !== "NEWEST") params.set("sort", next.sort);
    if (next.page > 1) params.set("page", String(next.page));
    if (next.pageSize !== 50) params.set("pageSize", String(next.pageSize));
    setSelectedUserId(null);
    router.push(`/admin/access${params.size ? `?${params.toString()}` : ""}`);
  }

  async function call(path:string, init:RequestInit, success:string) {
    setBusy(path); setNotice(null);
    try {
      const response = await fetch(path, {...init, headers:{"content-type":"application/json", ...(init.headers ?? {})}});
      const payload = await response.json().catch(() => null) as {error?:{message?:string}}|null;
      if (!response.ok) throw new Error(payload?.error?.message || `Request failed (${response.status})`);
      setNotice({kind:"ok",text:success});
      router.refresh();
      return true;
    } catch (error) {
      setNotice({kind:"error",text:error instanceof Error ? error.message : "Request failed"});
      return false;
    } finally { setBusy(null); }
  }

  async function createUser(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget; const fd = new FormData(form);
    const hotelId = String(fd.get("hotelId") ?? "").trim(); const hotelRole = String(fd.get("hotelRole") ?? "").trim();
    const ok = await call("/api/v1/admin/access/users", {method:"POST",body:JSON.stringify({displayName:String(fd.get("displayName") ?? ""),email:String(fd.get("email") ?? ""),password:String(fd.get("password") ?? ""),platformRole:String(fd.get("platformRole") ?? "GUEST"),hotelId:hotelId || null,hotelRole:hotelId && hotelRole ? hotelRole : null})}, ar ? "تم إنشاء الحساب." : "Account created.");
    if (ok) form.reset();
  }

  async function saveUser(user:AccessUser) {
    const displayName = draftNames[user.id] ?? user.displayName; const platformRole = draftRoles[user.id] ?? user.platformRole;
    const ok = await call(`/api/v1/admin/access/users/${user.id}`, {method:"PATCH",body:JSON.stringify({displayName,platformRole})}, ar ? "تم تحديث الحساب والصلاحية." : "Account access updated.");
    if (ok) { setDraftNames((value) => {const next={...value};delete next[user.id];return next;}); setDraftRoles((value) => {const next={...value};delete next[user.id];return next;}); }
  }

  async function revokeSessions(user:AccessUser) {
    if (!window.confirm(ar ? `إلغاء جميع جلسات ${user.email}؟` : `Revoke every active session for ${user.email}?`)) return;
    await call(`/api/v1/admin/access/users/${user.id}/sessions`, {method:"DELETE",body:"{}"}, ar ? "تم إلغاء جميع الجلسات." : "All sessions revoked.");
  }

  async function lockUser(user:AccessUser) {
    if (!window.confirm(ar ? `قفل حساب ${user.email} وإلغاء كل جلساته؟` : `Lock ${user.email} and revoke all sessions?`)) return;
    await call(`/api/v1/admin/access/users/${user.id}/lock`, {method:"POST",body:"{}"}, ar ? "تم قفل الحساب." : "Account locked.");
  }

  async function resetPassword(event:React.FormEvent<HTMLFormElement>, user:AccessUser) {
    event.preventDefault(); const form=event.currentTarget; const password=String(new FormData(form).get("password") ?? "");
    const ok=await call(`/api/v1/admin/access/users/${user.id}/password`, {method:"POST",body:JSON.stringify({password})}, ar ? "تم تعيين كلمة المرور وإلغاء الجلسات القديمة." : "Password set and old sessions revoked.");
    if (ok) form.reset();
  }

  async function saveMembership(event:React.FormEvent<HTMLFormElement>, user:AccessUser, hotelId?:string) {
    event.preventDefault(); const fd=new FormData(event.currentTarget); const resolvedHotel=hotelId ?? String(fd.get("hotelId") ?? "");
    await call(`/api/v1/admin/access/users/${user.id}/memberships`, {method:"POST",body:JSON.stringify({hotelId:resolvedHotel,role:String(fd.get("role") ?? "VIEWER"),status:String(fd.get("status") ?? "ACTIVE")})}, ar ? "تم حفظ عضوية الفندق." : "Hotel membership saved.");
  }

  async function removeMembership(user:AccessUser, membership:Membership) {
    if (!window.confirm(ar ? `إزالة عضوية ${membership.hotel.name}؟` : `Remove access to ${membership.hotel.name}?`)) return;
    await call(`/api/v1/admin/access/users/${user.id}/memberships/${membership.id}`, {method:"DELETE",body:"{}"}, ar ? "تم حذف عضوية الفندق." : "Hotel membership removed.");
  }

  const first = initialData.filteredTotal === 0 ? 0 : (initialData.pagination.page - 1) * initialData.pagination.pageSize + 1;
  const last = Math.min(initialData.pagination.page * initialData.pagination.pageSize, initialData.filteredTotal);

  return <div className="identityDirectory">
    {notice && <div className={`directoryNotice ${notice.kind}`}>{notice.kind === "ok" ? <ShieldCheck size={17}/> : <X size={17}/>}<span>{notice.text}</span></div>}

    <div className="directoryKpis">
      <button onClick={() => navigate({role:"ALL",status:"ALL"})}><span>{ar ? "كل الحسابات" : "All users"}</span><strong>{initialData.counts.total.toLocaleString()}</strong></button>
      <button onClick={() => navigate({role:"PLATFORM_ADMIN"})}><span>{ar ? "مسؤولو المنصة" : "Platform admins"}</span><strong>{initialData.counts.administrators.toLocaleString()}</strong></button>
      <button onClick={() => navigate({role:"HOTEL_USER"})}><span>{ar ? "موظفو الفنادق" : "Hotel staff"}</span><strong>{initialData.counts.hotelUsers.toLocaleString()}</strong></button>
      <button onClick={() => navigate({role:"GUEST"})}><span>{ar ? "الضيوف" : "Guests"}</span><strong>{initialData.counts.guests.toLocaleString()}</strong></button>
      <button onClick={() => navigate({status:"LOCKED"})}><span>{ar ? "المقفلة" : "Locked"}</span><strong>{initialData.counts.locked.toLocaleString()}</strong></button>
    </div>

    {initialData.actor.isOwner && <details className="createUserPanel">
      <summary><UserPlus size={17}/>{ar ? "إضافة مستخدم جديد" : "Add user"}</summary>
      <form className="createUserForm" onSubmit={createUser}>
        <label><span>{ar ? "الاسم" : "Full name"}</span><input name="displayName" required minLength={2} maxLength={120}/></label>
        <label><span>{ar ? "البريد" : "Email"}</span><input name="email" type="email" required/></label>
        <label><span>{ar ? "كلمة مرور مؤقتة" : "Temporary password"}</span><input name="password" type="password" required minLength={10}/></label>
        <label><span>{ar ? "دور المنصة" : "Platform role"}</span><select name="platformRole" defaultValue="GUEST">{platformRoles.map((role) => <option key={role} value={role}>{roleLabel(role,ar)}</option>)}</select></label>
        <label><span>{ar ? "فندق اختياري" : "Optional property"}</span><select name="hotelId" defaultValue=""><option value="">{ar ? "بدون فندق" : "No property"}</option>{initialData.hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name} · {hotel.city}</option>)}</select></label>
        <label><span>{ar ? "دور الفندق" : "Hotel role"}</span><select name="hotelRole" defaultValue="VIEWER">{hotelRoles.map((role) => <option key={role} value={role}>{hotelRoleLabel(role,ar)}</option>)}</select></label>
        <button className="primaryButton" disabled={Boolean(busy)}><UserPlus size={16}/>{ar ? "إنشاء" : "Create"}</button>
      </form>
    </details>}

    <section className="directoryPanel">
      <div className="directoryHeader">
        <div><span className="eyebrow">{ar ? "دليل الهوية" : "Identity directory"}</span><h2><Users size={20}/>{ar ? "المستخدمون والصلاحيات" : "Users & permissions"}</h2><p>{ar ? `${initialData.filteredTotal.toLocaleString()} نتيجة — يتم تحميل الصفحة المطلوبة فقط.` : `${initialData.filteredTotal.toLocaleString()} results — only the requested page is loaded.`}</p></div>
      </div>

      <div className="directoryToolbar">
        <form className="directorySearch" onSubmit={(event) => {event.preventDefault();navigate({q:query.trim()});}}><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ar ? "ابحث بالاسم أو البريد" : "Search name or email"}/><button>{ar ? "بحث" : "Search"}</button></form>
        <select value={initialData.filters.role} onChange={(event) => navigate({role:event.target.value as DirectoryRole})}><option value="ALL">{ar ? "كل الأنواع" : "All roles"}</option>{platformRoles.map((role) => <option key={role} value={role}>{roleLabel(role,ar)}</option>)}</select>
        <select value={initialData.filters.hotelId} onChange={(event) => navigate({hotel:event.target.value})}><option value="">{ar ? "كل الفنادق" : "All properties"}</option>{initialData.hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name} · {hotel.city}</option>)}</select>
        <select value={initialData.filters.status} onChange={(event) => navigate({status:event.target.value as DirectoryStatus})}><option value="ALL">{ar ? "كل الحالات" : "All statuses"}</option><option value="ACTIVE">{ar ? "نشط" : "Active"}</option><option value="LOCKED">{ar ? "مقفول" : "Locked"}</option></select>
        <select value={initialData.filters.sort} onChange={(event) => navigate({sort:event.target.value as DirectorySort})}><option value="NEWEST">{ar ? "الأحدث" : "Newest"}</option><option value="OLDEST">{ar ? "الأقدم" : "Oldest"}</option><option value="NAME">{ar ? "الاسم" : "Name"}</option></select>
      </div>

      <div className="directoryTableWrap">
        <table className="directoryTable"><thead><tr><th>{ar ? "المستخدم" : "User"}</th><th>{ar ? "الوصول" : "Access"}</th><th>{ar ? "الفندق" : "Property"}</th><th>{ar ? "الحالة" : "Status"}</th><th>{ar ? "الجلسات" : "Sessions"}</th><th>{ar ? "آخر نشاط" : "Last activity"}</th><th aria-label="Actions"/></tr></thead>
        <tbody>{initialData.users.length === 0 ? <tr><td colSpan={7} className="emptyCell">{ar ? "لا توجد نتائج مطابقة." : "No matching users."}</td></tr> : initialData.users.map((user) => <tr key={user.id} className={user.isOwner ? "ownerRow" : ""} onDoubleClick={() => setSelectedUserId(user.id)}>
          <td><button className="identityCell" onClick={() => setSelectedUserId(user.id)}><span className="avatar">{initials(user.displayName)}</span><span><strong>{user.displayName}</strong><small>{user.email}</small></span>{user.isOwner && <Crown size={14}/>}</button></td>
          <td><span className="rolePill">{roleLabel(user.platformRole,ar)}</span>{user.hotelMemberships[0] && <small className="subRole">{hotelRoleLabel(user.hotelMemberships[0].role,ar)}</small>}</td>
          <td>{user.hotelMemberships.length ? <span className="propertyCell"><strong>{user.hotelMemberships[0].hotel.name}</strong><small>{user.hotelMemberships.length > 1 ? `+${user.hotelMemberships.length - 1}` : user.hotelMemberships[0].hotel.city}</small></span> : <span className="muted">—</span>}</td>
          <td><span className={`statePill ${user.accessState.toLowerCase()}`}>{user.accessState === "ACTIVE" ? (ar ? "نشط" : "Active") : (ar ? "مقفول" : "Locked")}</span></td>
          <td><span className="sessionCell"><strong>{user.activeStandardSessions + user.activeAdminSessions}</strong><small>{user.activeAdminSessions ? `${user.activeAdminSessions} admin` : ar ? "عادية" : "standard"}</small></span></td>
          <td>{user.lastActivity ? formatDateTime(user.lastActivity,locale) : "—"}</td>
          <td><button className="rowAction" onClick={() => setSelectedUserId(user.id)} aria-label={ar ? "فتح المستخدم" : "Open user"}><MoreHorizontal size={18}/></button></td>
        </tr>)}</tbody></table>
      </div>

      <div className="directoryFooter"><span>{first.toLocaleString()}–{last.toLocaleString()} {ar ? "من" : "of"} {initialData.filteredTotal.toLocaleString()}</span><div className="pageControls"><select value={initialData.pagination.pageSize} onChange={(event) => navigate({pageSize:Number(event.target.value),page:1})}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select><button disabled={initialData.pagination.page <= 1} onClick={() => navigate({page:initialData.pagination.page - 1})}><ChevronLeft size={17}/></button><strong>{initialData.pagination.page} / {initialData.pagination.pageCount}</strong><button disabled={initialData.pagination.page >= initialData.pagination.pageCount} onClick={() => navigate({page:initialData.pagination.page + 1})}><ChevronRight size={17}/></button></div></div>
    </section>

    {selectedUser && <div className="drawerBackdrop" onMouseDown={(event) => {if (event.currentTarget === event.target) setSelectedUserId(null);}}>
      <aside className="userDrawer" aria-label={ar ? "تفاصيل المستخدم" : "User details"}>
        <div className="drawerHead"><div className="drawerIdentity"><span className="drawerAvatar">{initials(selectedUser.displayName)}</span><div><strong>{selectedUser.displayName}</strong><span>{selectedUser.email}</span></div></div><button className="drawerClose" onClick={() => setSelectedUserId(null)}><X size={20}/></button></div>
        <div className="drawerBadges">{selectedUser.isOwner && <span className="ownerPill"><Crown size={13}/>Platform Owner</span>}<span className="rolePill">{roleLabel(selectedUser.platformRole,ar)}</span><span className={`statePill ${selectedUser.accessState.toLowerCase()}`}>{selectedUser.accessState === "ACTIVE" ? (ar ? "نشط" : "Active") : (ar ? "مقفول" : "Locked")}</span></div>
        <div className="drawerStats"><div><span>{ar ? "جلسات المستخدم" : "User sessions"}</span><strong>{selectedUser.activeStandardSessions}</strong></div><div><span>{ar ? "جلسات Admin" : "Admin sessions"}</span><strong>{selectedUser.activeAdminSessions}</strong></div><div><span>{ar ? "عضويات الفنادق" : "Properties"}</span><strong>{selectedUser.hotelMemberships.length}</strong></div><div><span>{ar ? "آخر نشاط" : "Last activity"}</span><strong>{selectedUser.lastActivity ? formatDateTime(selectedUser.lastActivity,locale) : "—"}</strong></div></div>

        {initialData.actor.isOwner && <section className="drawerSection"><h3>{ar ? "الحساب والصلاحية" : "Account & role"}</h3><div className="drawerGrid"><label><span>{ar ? "الاسم" : "Name"}</span><input value={draftNames[selectedUser.id] ?? selectedUser.displayName} onChange={(event) => setDraftNames((value) => ({...value,[selectedUser.id]:event.target.value}))}/></label><label><span>{ar ? "دور المنصة" : "Platform role"}</span><select value={draftRoles[selectedUser.id] ?? selectedUser.platformRole} disabled={selectedUser.isOwner} onChange={(event) => setDraftRoles((value) => ({...value,[selectedUser.id]:event.target.value as PlatformRole}))}>{platformRoles.map((role) => <option key={role} value={role}>{roleLabel(role,ar)}</option>)}</select></label></div><div className="drawerActions"><button className="primaryButton" disabled={Boolean(busy)} onClick={() => saveUser(selectedUser)}>{ar ? "حفظ التغييرات" : "Save changes"}</button><button className="secondaryButton" disabled={Boolean(busy)} onClick={() => revokeSessions(selectedUser)}><RefreshCw size={15}/>{ar ? "إلغاء الجلسات" : "Revoke sessions"}</button>{!selectedUser.isOwner && <button className="dangerButton" disabled={Boolean(busy) || selectedUser.accessState === "LOCKED"} onClick={() => lockUser(selectedUser)}><LockKeyhole size={15}/>{ar ? "قفل الحساب" : "Lock account"}</button>}</div></section>}

        {initialData.actor.isOwner && <section className="drawerSection"><h3><KeyRound size={16}/>{selectedUser.accessState === "LOCKED" ? (ar ? "فتح الحساب وتعيين كلمة مرور" : "Unlock & set password") : (ar ? "إعادة تعيين كلمة المرور" : "Reset password")}</h3><form className="passwordForm" onSubmit={(event) => resetPassword(event,selectedUser)}><input name="password" type="password" minLength={10} required autoComplete="new-password" placeholder={ar ? "10 أحرف على الأقل" : "At least 10 characters"}/><button className="secondaryButton" disabled={Boolean(busy)}>{ar ? "تعيين" : "Set password"}</button></form></section>}

        <section className="drawerSection"><div className="sectionTitle"><h3>{ar ? "صلاحيات الفنادق" : "Property access"}</h3><span>{selectedUser.hotelMemberships.length}</span></div>{selectedUser.hotelMemberships.length === 0 ? <p className="muted">{ar ? "لا توجد صلاحيات فندقية." : "No property access."}</p> : selectedUser.hotelMemberships.map((membership) => initialData.actor.isOwner ? <form className="membershipRow" key={membership.id} onSubmit={(event) => saveMembership(event,selectedUser,membership.hotel.id)}><div><strong>{membership.hotel.name}</strong><small>{membership.hotel.city} · {membership.hotel.status}</small></div><select name="role" defaultValue={membership.role}>{hotelRoles.map((role) => <option key={role} value={role}>{hotelRoleLabel(role,ar)}</option>)}</select><select name="status" defaultValue={membership.status}>{membershipStatuses.map((status) => <option key={status} value={status}>{membershipStatusLabel(status,ar)}</option>)}</select><button className="secondaryButton" disabled={Boolean(busy)}>{ar ? "تحديث" : "Update"}</button><button type="button" className="removeMembership" disabled={Boolean(busy)} onClick={() => removeMembership(selectedUser,membership)}><X size={16}/></button></form> : <div className="membershipReadOnly" key={membership.id}><strong>{membership.hotel.name}</strong><span>{hotelRoleLabel(membership.role,ar)} · {membershipStatusLabel(membership.status,ar)}</span></div>)}
        {initialData.actor.isOwner && <form className="addMembership" onSubmit={(event) => saveMembership(event,selectedUser)}><select name="hotelId" required defaultValue=""><option value="" disabled>{ar ? "اختر الفندق" : "Choose property"}</option>{initialData.hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name} · {hotel.city}</option>)}</select><select name="role" defaultValue="VIEWER">{hotelRoles.map((role) => <option key={role} value={role}>{hotelRoleLabel(role,ar)}</option>)}</select><select name="status" defaultValue="ACTIVE">{membershipStatuses.map((status) => <option key={status} value={status}>{membershipStatusLabel(status,ar)}</option>)}</select><button className="secondaryButton" disabled={Boolean(busy)}>{ar ? "إضافة صلاحية" : "Add access"}</button></form>}
        </section>
        <div className="drawerFoot"><Link href="/admin/rewards">{ar ? "إدارة Rewards والعضوية" : "Manage Rewards membership"}</Link></div>
      </aside>
    </div>}

    <style jsx>{`
      .identityDirectory{display:grid;gap:18px}.directoryNotice{display:flex;gap:9px;align-items:center;padding:11px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface)}.directoryNotice.ok{border-color:#9bd8b5}.directoryNotice.error{border-color:#e7a5a5}.directoryKpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.directoryKpis button{display:grid;text-align:start;gap:5px;border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px;cursor:pointer}.directoryKpis span{font-size:12px;color:var(--muted)}.directoryKpis strong{font-size:22px}.createUserPanel,.directoryPanel{border:1px solid var(--line);border-radius:18px;background:var(--surface);overflow:hidden}.createUserPanel summary{display:flex;gap:8px;align-items:center;padding:14px 16px;cursor:pointer;font-weight:700}.createUserForm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:0 16px 16px}.createUserForm label,.drawerGrid label{display:grid;gap:6px}.createUserForm label span,.drawerGrid label span{font-size:12px;color:var(--muted)}.createUserForm input,.createUserForm select,.directoryToolbar select,.directorySearch,.directoryFooter select,.drawerGrid input,.drawerGrid select,.passwordForm input,.membershipRow select,.addMembership select{min-height:42px;border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:0 11px}.directoryHeader{padding:18px 18px 8px}.directoryHeader h2{display:flex;align-items:center;gap:8px;margin:4px 0}.directoryHeader p{margin:0;color:var(--muted);font-size:13px}.directoryToolbar{display:grid;grid-template-columns:minmax(260px,1.7fr) repeat(4,minmax(130px,.7fr));gap:8px;padding:10px 18px 16px}.directorySearch{display:flex;align-items:center;padding:0 8px}.directorySearch input{border:0;outline:0;background:transparent;flex:1;min-width:0;padding:0 8px}.directorySearch button{border:0;background:transparent;font-weight:700;cursor:pointer}.directoryTableWrap{overflow:auto;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.directoryTable{width:100%;border-collapse:collapse;min-width:980px}.directoryTable th{padding:11px 14px;text-align:start;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.05em;background:color-mix(in srgb,var(--surface) 88%,var(--line))}.directoryTable td{padding:12px 14px;border-top:1px solid var(--line);font-size:13px;vertical-align:middle}.directoryTable tbody tr:hover{background:color-mix(in srgb,var(--surface) 92%,var(--line))}.ownerRow{background:color-mix(in srgb,var(--surface) 94%,#d7b85d)}.identityCell{display:flex;align-items:center;gap:10px;border:0;background:transparent;text-align:start;cursor:pointer;padding:0}.identityCell>span:nth-child(2){display:grid;gap:2px}.identityCell strong{font-size:13px}.identityCell small,.propertyCell small,.sessionCell small,.subRole{display:block;color:var(--muted);font-size:11px}.avatar,.drawerAvatar{display:grid;place-items:center;border-radius:50%;background:color-mix(in srgb,var(--surface) 80%,var(--line));font-weight:800}.avatar{width:36px;height:36px}.drawerAvatar{width:48px;height:48px}.rolePill,.statePill,.ownerPill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:700;border:1px solid var(--line)}.statePill.active{border-color:#8fd0aa}.statePill.locked{border-color:#dda1a1}.subRole{margin-top:4px}.propertyCell,.sessionCell{display:grid;gap:2px}.rowAction,.drawerClose,.removeMembership{display:grid;place-items:center;border:1px solid var(--line);background:var(--surface);border-radius:9px;width:34px;height:34px;cursor:pointer}.emptyCell{text-align:center!important;padding:36px!important;color:var(--muted)}.directoryFooter{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;font-size:13px}.pageControls{display:flex;align-items:center;gap:7px}.pageControls button{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:9px;background:var(--surface);cursor:pointer}.pageControls button:disabled{opacity:.4;cursor:not-allowed}.directoryFooter select{min-height:34px}.drawerBackdrop{position:fixed;inset:0;background:rgba(8,12,20,.48);z-index:80;display:flex;justify-content:flex-end}.userDrawer{width:min(620px,96vw);height:100%;overflow:auto;background:var(--surface);box-shadow:-18px 0 50px rgba(0,0,0,.18);padding:20px;display:grid;align-content:start;gap:16px}.drawerHead{display:flex;justify-content:space-between;gap:12px;align-items:center}.drawerIdentity{display:flex;align-items:center;gap:12px}.drawerIdentity>div{display:grid;gap:3px}.drawerIdentity strong{font-size:18px}.drawerIdentity span{font-size:12px;color:var(--muted)}.drawerBadges{display:flex;gap:7px;flex-wrap:wrap}.drawerStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.drawerStats div{border:1px solid var(--line);border-radius:12px;padding:10px;display:grid;gap:5px}.drawerStats span{font-size:10px;color:var(--muted)}.drawerStats strong{font-size:14px}.drawerSection{border-top:1px solid var(--line);padding-top:16px;display:grid;gap:12px}.drawerSection h3{display:flex;align-items:center;gap:7px;margin:0;font-size:15px}.drawerGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.drawerActions{display:flex;gap:8px;flex-wrap:wrap}.passwordForm{display:flex;gap:8px}.passwordForm input{flex:1}.sectionTitle{display:flex;justify-content:space-between;align-items:center}.sectionTitle span{font-size:12px;border:1px solid var(--line);border-radius:999px;padding:3px 7px}.membershipRow{display:grid;grid-template-columns:minmax(150px,1.4fr) 1fr 1fr auto auto;gap:7px;align-items:center}.membershipRow>div{display:grid;gap:2px}.membershipRow small{color:var(--muted)}.addMembership{display:grid;grid-template-columns:1.5fr 1fr 1fr auto;gap:7px}.membershipReadOnly{display:flex;justify-content:space-between;gap:10px;border:1px solid var(--line);border-radius:10px;padding:10px}.drawerFoot{border-top:1px solid var(--line);padding-top:14px}.drawerFoot a{font-weight:700}.muted{color:var(--muted)}
      @media(max-width:1050px){.directoryKpis{grid-template-columns:repeat(2,1fr)}.directoryToolbar{grid-template-columns:1fr 1fr}.directorySearch{grid-column:1/-1}.createUserForm{grid-template-columns:1fr 1fr}}
      @media(max-width:680px){.directoryKpis,.createUserForm,.directoryToolbar,.drawerStats,.drawerGrid{grid-template-columns:1fr}.directoryFooter{align-items:flex-start;gap:12px;flex-direction:column}.membershipRow,.addMembership{grid-template-columns:1fr}.passwordForm{flex-direction:column}.userDrawer{width:100vw}.directorySearch{grid-column:auto}}
    `}</style>
  </div>;
}

function roleLabel(role:PlatformRole, ar:boolean) {return ar ? ({GUEST:"ضيف",HOTEL_USER:"مستخدم فندق",PLATFORM_ADMIN:"مسؤول منصة"} as const)[role] : ({GUEST:"Guest",HOTEL_USER:"Hotel user",PLATFORM_ADMIN:"Platform Admin"} as const)[role];}
function hotelRoleLabel(role:HotelRole, ar:boolean) {if (!ar) return role.split("_").map(capitalize).join(" ");return ({OWNER:"مالك",MANAGER:"مدير",REVENUE:"إيرادات",FRONT_DESK:"استقبال",FINANCE:"مالية",VIEWER:"مشاهدة"} as const)[role];}
function membershipStatusLabel(status:MembershipStatus, ar:boolean) {if (!ar) return capitalize(status.toLowerCase());return ({ACTIVE:"نشطة",INVITED:"دعوة",SUSPENDED:"موقوفة"} as const)[status];}
function capitalize(value:string){return value.charAt(0).toUpperCase()+value.slice(1).toLowerCase();}
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map((part)=>part.charAt(0).toUpperCase()).join("")||"U";}
function formatDateTime(value:string,locale:Locale){return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB",{timeZone:"Asia/Amman",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}
