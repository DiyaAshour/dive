"use client";

import {useState} from "react";
import {CalendarClock, Power, Save} from "lucide-react";
import type {SiteLaunchConfig} from "@/lib/site-launch";

type Props = Readonly<{locale: "en" | "ar"; initialConfig: SiteLaunchConfig}>;

export default function SiteLaunchControl({locale, initialConfig}: Props) {
  const ar = locale === "ar";
  const [enabled, setEnabled] = useState(initialConfig.enabled);
  const [launchAt, setLaunchAt] = useState(() => toLocalDateTime(initialConfig.launchAt));
  const [title, setTitle] = useState(initialConfig.title);
  const [message, setMessage] = useState(initialConfig.message);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setStatus(null); setError(null);
    if (enabled && !launchAt) {
      setError(ar ? "حدد تاريخ ووقت الإطلاق قبل تشغيل وضع ما قبل الإطلاق." : "Choose a launch date and time before enabling pre-launch mode.");
      return;
    }
    const date = launchAt ? new Date(launchAt) : null;
    if (enabled && (!date || Number.isNaN(date.getTime()) || date.getTime() <= Date.now())) {
      setError(ar ? "وقت الإطلاق يجب أن يكون في المستقبل." : "The launch time must be in the future.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/v1/admin/site-launch", {
        method: "PUT",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({enabled, launchAt: date?.toISOString() ?? null, title, message}),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to save launch settings");
      setStatus(ar ? "تم حفظ إعدادات ما قبل الإطلاق." : "Pre-launch settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ar ? "تعذر حفظ الإعدادات." : "Unable to save settings."));
    } finally {
      setSaving(false);
    }
  }

  return <section className="launchAdminPanel">
    <div className="launchAdminForm">
      <div className="launchModeRow">
        <div><strong>{ar ? "وضع ما قبل الإطلاق" : "Pre-launch mode"}</strong><span>{ar ? "عند تشغيله، الزوار يشاهدون العد التنازلي بدل الموقع العام. صفحات الإدارة والشركاء تبقى متاحة." : "When enabled, public visitors see the countdown instead of the marketplace. Admin and partner pages remain available."}</span></div>
        <button type="button" className={`launchModeToggle ${enabled ? "on" : ""}`} onClick={() => setEnabled((value) => !value)}><Power size={15}/> {enabled ? (ar ? "مفعّل" : "Enabled") : (ar ? "متوقف" : "Disabled")}</button>
      </div>
      <label><span>{ar ? "تاريخ ووقت الإطلاق" : "Launch date & time"}</span><input type="datetime-local" value={launchAt} onChange={(event) => setLaunchAt(event.target.value)}/></label>
      <label><span>{ar ? "عنوان صفحة العد التنازلي" : "Countdown page title"}</span><input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder={ar ? "HandMeKey على وشك الانطلاق" : "HandMeKey is almost ready"}/></label>
      <label><span>{ar ? "رسالة للزوار" : "Visitor message"}</span><textarea value={message} maxLength={320} onChange={(event) => setMessage(event.target.value)} placeholder={ar ? "نجهّز التفاصيل الأخيرة قبل الإطلاق." : "We are preparing the final details before launch."}/></label>
      {error && <p className="launchAdminError" role="alert">{error}</p>}
      <div className="launchAdminActions"><button type="button" disabled={saving} onClick={() => void save()}><Save size={16}/> {saving ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ إعدادات الإطلاق" : "Save launch settings")}</button>{status && <span className="launchAdminStatus" role="status">{status}</span>}</div>
    </div>
    <aside className="launchAdminPreview">
      <span className="eyebrow">{ar ? "معاينة" : "PREVIEW"}</span>
      <h3>{title || (ar ? "HandMeKey على وشك الانطلاق" : "HandMeKey is almost ready")}</h3>
      <p>{message || (ar ? "نجهّز التفاصيل الأخيرة قبل الإطلاق." : "We are preparing the final details before launch.")}</p>
      <span className={`launchAdminState ${enabled ? "on" : ""}`}>{enabled ? (ar ? "العداد ظاهر للزوار" : "Countdown visible") : (ar ? "الموقع العام ظاهر" : "Marketplace visible")}</span>
      {launchAt && <time><CalendarClock size={15}/> {formatLaunch(launchAt, locale)}</time>}
      <small>{ar ? "يمكنك إلغاء الوضع في أي لحظة من هذه الصفحة." : "You can turn pre-launch mode off here at any time."}</small>
    </aside>
  </section>;
}

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatLaunch(value: string, locale: "en" | "ar") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {dateStyle: "medium", timeStyle: "short"}).format(date);
}
