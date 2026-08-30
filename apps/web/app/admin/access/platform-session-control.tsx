"use client";

import {useEffect, useMemo, useState} from "react";
import {Laptop, RefreshCw, ShieldCheck, Smartphone, Tablet, Trash2, Wifi} from "lucide-react";
import type {Locale} from "@/lib/i18n";

type UserOption = Readonly<{id:string;displayName:string;email:string;isOwner:boolean}>;
type Session = Readonly<{
  id:string;
  scope:"STANDARD"|"ADMIN";
  userAgent:string|null;
  ipAddress:string|null;
  createdAt:string;
  lastUsedAt:string;
  expiresAt:string;
}>;
type SessionPayload = Readonly<{
  user:{id:string;displayName:string;email:string};
  sessions:Session[];
}>;

export default function PlatformSessionControl({locale, users, isOwner}: Readonly<{locale:Locale;users:UserOption[];isOwner:boolean}>) {
  const ar = locale === "ar";
  const [selectedId, setSelectedId] = useState(users[0]?.id ?? "");
  const [payload, setPayload] = useState<SessionPayload|null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string|null>(null);
  const selected = useMemo(() => users.find((user) => user.id === selectedId) ?? null, [selectedId, users]);

  useEffect(() => {
    if (!isOwner || !selectedId) return;
    void load(selectedId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, selectedId]);

  async function load(userId = selectedId) {
    if (!userId) return;
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/admin/access/users/${userId}/sessions`, {cache:"no-store"});
      const body = await response.json().catch(() => null) as {data?:SessionPayload;error?:{message?:string}}|null;
      if (!response.ok || !body?.data) throw new Error(body?.error?.message || `Request failed (${response.status})`);
      setPayload(body.data);
    } catch (error) {
      setPayload(null);
      setNotice(error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(session: Session) {
    if (!selected) return;
    const label = session.scope === "ADMIN" ? "Admin" : (ar ? "مستخدم" : "User");
    if (!window.confirm(ar ? `إلغاء جلسة ${label} هذه؟` : `Revoke this ${label} session?`)) return;
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/admin/access/users/${selected.id}/sessions/${session.id}`, {method:"DELETE"});
      const body = await response.json().catch(() => null) as {error?:{message?:string}}|null;
      if (!response.ok) throw new Error(body?.error?.message || `Request failed (${response.status})`);
      setNotice(ar ? "تم إلغاء الجلسة فورًا." : "Session revoked immediately.");
      await load(selected.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Request failed");
      setLoading(false);
    }
  }

  async function revokeAll() {
    if (!selected) return;
    if (!window.confirm(ar ? `إلغاء جميع جلسات ${selected.email}؟` : `Revoke every active session for ${selected.email}?`)) return;
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/admin/access/users/${selected.id}/sessions`, {method:"DELETE"});
      const body = await response.json().catch(() => null) as {error?:{message?:string}}|null;
      if (!response.ok) throw new Error(body?.error?.message || `Request failed (${response.status})`);
      setNotice(ar ? "تم إلغاء جميع الجلسات." : "All sessions revoked.");
      await load(selected.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Request failed");
      setLoading(false);
    }
  }

  if (!isOwner) return <section className="adminPanel ownerSessionConsole"><div className="adminAccessReadOnly"><ShieldCheck size={18}/><span>{ar ? "تفاصيل الأجهزة والجلسات محصورة بحساب Platform Owner." : "Device and session controls are restricted to the Platform Owner."}</span></div></section>;

  return <section className="adminPanel ownerSessionConsole">
    <div className="adminSectionTitle ownerSessionHeader">
      <div><span className="eyebrow">{ar ? "أمن الحسابات" : "Account security"}</span><h2><Wifi size={20}/> {ar ? "الجلسات والأجهزة النشطة" : "Active sessions & devices"}</h2><p>{ar ? "شاهد من أين الحسابات مسجلة دخول، وألغِ أي جلسة فورًا من لوحة المالك." : "See where accounts are signed in and revoke any session instantly from the owner console."}</p></div>
      <div className="ownerSessionActions">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} aria-label={ar ? "اختر مستخدمًا" : "Select user"}>{users.map((user) => <option key={user.id} value={user.id}>{user.isOwner ? "★ " : ""}{user.displayName} · {user.email}</option>)}</select>
        <button type="button" className="secondaryButton" disabled={loading || !selectedId} onClick={() => void load()}><RefreshCw size={15}/>{ar ? "تحديث" : "Refresh"}</button>
        <button type="button" className="dangerButton" disabled={loading || !payload?.sessions.length} onClick={() => void revokeAll()}><Trash2 size={15}/>{ar ? "إلغاء الكل" : "Revoke all"}</button>
      </div>
    </div>

    {notice && <div className="ownerSessionNotice">{notice}</div>}
    {loading && !payload ? <div className="ownerSessionEmpty">{ar ? "جارِ تحميل الجلسات…" : "Loading sessions…"}</div> : null}
    {payload && <div className="ownerSessionList">
      {payload.sessions.length === 0 ? <div className="ownerSessionEmpty"><ShieldCheck size={20}/>{ar ? "لا توجد جلسات نشطة لهذا الحساب." : "No active sessions for this account."}</div> : payload.sessions.map((session) => {
        const device = deviceInfo(session.userAgent);
        const DeviceIcon = device.kind === "phone" ? Smartphone : device.kind === "tablet" ? Tablet : Laptop;
        return <article className={`ownerSessionCard ${session.scope === "ADMIN" ? "admin" : ""}`} key={session.id}>
          <div className="ownerSessionDevice"><DeviceIcon size={19}/></div>
          <div className="ownerSessionIdentity"><strong>{device.label}</strong><span>{session.ipAddress || (ar ? "IP غير متوفر" : "IP unavailable")}</span><small>{session.scope === "ADMIN" ? "Admin session" : (ar ? "جلسة مستخدم" : "User session")}</small></div>
          <div className="ownerSessionTimes"><span>{ar ? "آخر استخدام" : "Last used"}<strong>{formatDateTime(session.lastUsedAt, locale)}</strong></span><span>{ar ? "بدأت" : "Created"}<strong>{formatDateTime(session.createdAt, locale)}</strong></span><span>{ar ? "تنتهي" : "Expires"}<strong>{formatDateTime(session.expiresAt, locale)}</strong></span></div>
          <button className="iconDangerButton" type="button" title={ar ? "إلغاء الجلسة" : "Revoke session"} disabled={loading} onClick={() => void revoke(session)}><Trash2 size={16}/></button>
        </article>;
      })}
    </div>}
  </section>;
}

function deviceInfo(userAgent:string|null) {
  if (!userAgent) return {kind:"desktop" as const,label:"Unknown device"};
  const source = userAgent.toLowerCase();
  const kind = source.includes("ipad") || source.includes("tablet") ? "tablet" as const : source.includes("mobile") || source.includes("iphone") || source.includes("android") ? "phone" as const : "desktop" as const;
  const browser = source.includes("edg/") ? "Edge" : source.includes("firefox/") ? "Firefox" : source.includes("chrome/") ? "Chrome" : source.includes("safari/") ? "Safari" : "Browser";
  const os = source.includes("windows") ? "Windows" : source.includes("mac os") || source.includes("macintosh") ? "macOS" : source.includes("iphone") || source.includes("ipad") ? "iOS" : source.includes("android") ? "Android" : source.includes("linux") ? "Linux" : "Device";
  return {kind,label:`${browser} · ${os}`};
}

function formatDateTime(value:string, locale:Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-US", {dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
}
