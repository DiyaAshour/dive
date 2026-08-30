"use client";

import {useMemo, useState} from "react";
import {Globe2, ImageIcon, LockKeyhole, Save, Search, ShieldCheck} from "lucide-react";

type Locale = "en" | "ar";
type Config = {
  brandName: string;
  siteTitle: string;
  description: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  supportEmail: string;
  footerText: string;
  indexable: boolean;
  socialLinks: {instagram: string | null; facebook: string | null; x: string | null; linkedin: string | null};
};

type Props = Readonly<{
  locale: Locale;
  initialConfig: Config;
  isOwner: boolean;
  ownerName?: string | null;
  ownerEmail?: string | null;
}>;

export default function SiteIdentityControl({locale, initialConfig, isOwner, ownerName, ownerEmail}: Props) {
  const ar = locale === "ar";
  const [config, setConfig] = useState<Config>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logoPreview = useMemo(() => safePreviewUrl(config.logoUrl), [config.logoUrl]);
  const faviconPreview = useMemo(() => safePreviewUrl(config.faviconUrl), [config.faviconUrl]);
  const socialPreview = useMemo(() => safePreviewUrl(config.ogImageUrl), [config.ogImageUrl]);

  function field<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((current) => ({...current, [key]: value}));
  }

  function social(key: keyof Config["socialLinks"], value: string) {
    setConfig((current) => ({...current, socialLinks: {...current.socialLinks, [key]: value || null}}));
  }

  async function save() {
    if (!isOwner || saving) return;
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/v1/admin/site-identity", {
        method: "PATCH",
        headers: {"content-type": "application/json"},
        body: JSON.stringify(config),
      });
      const payload = await response.json().catch(() => null) as {data?: Config; error?: {message?: string}} | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message || (ar ? "تعذر حفظ هوية الموقع" : "Could not save site identity"));
      setConfig(payload.data);
      setMessage(ar ? "تم حفظ هوية الموقع. التغييرات أصبحت فعّالة." : "Site identity saved. Changes are now active.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ar ? "تعذر الحفظ" : "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  return <section className="adminSection adminPanel siteIdentityPanel">
    <div className="adminSectionTitle siteIdentityTitle">
      <div>
        <span className="eyebrow">{ar ? "هوية المنصة" : "Platform identity"}</span>
        <h2>{ar ? "هوية الموقع و SEO" : "Site identity & SEO"}</h2>
        <p>{ar ? "تحكم باسم البراند، عنوان الموقع، الوصف، الشعار، أيقونة التب والمشاركة الاجتماعية من مكان واحد." : "Control the brand name, site title, description, logo, tab icon and social sharing identity from one place."}</p>
      </div>
      <div className={isOwner ? "siteIdentityOwnerBadge" : "siteIdentityLockedBadge"}>
        {isOwner ? <ShieldCheck size={17}/> : <LockKeyhole size={17}/>} 
        <span><strong>{isOwner ? (ar ? "Platform Owner" : "Platform Owner") : (ar ? "Owner فقط" : "Owner only")}</strong><small>{ownerName || ownerEmail || (ar ? "صلاحية محمية" : "Protected access")}</small></span>
      </div>
    </div>

    {!isOwner && <div className="siteIdentityOwnerNotice"><LockKeyhole size={18}/><div><strong>{ar ? "هذه الإعدادات مقفلة" : "These settings are locked"}</strong><p>{ar ? "يمكن لـ Platform Owner فقط تغيير هوية الموقع و SEO. بقية المشرفين يستطيعون مشاهدة الإعدادات فقط." : "Only the Platform Owner can change site identity and SEO. Other administrators have read-only access."}</p></div></div>}

    <div className="siteIdentityWorkspace">
      <div className="siteIdentityForm">
        <div className="siteIdentityGroup">
          <div className="siteIdentityGroupHead"><Globe2 size={18}/><div><strong>{ar ? "البراند ونتائج البحث" : "Brand & search"}</strong><small>{ar ? "البيانات الأساسية التي يراها المستخدم وGoogle." : "Core identity shown to customers and search engines."}</small></div></div>
          <label><span>{ar ? "اسم البراند" : "Brand name"}</span><input disabled={!isOwner} value={config.brandName} maxLength={60} onChange={(event)=>field("brandName",event.target.value)}/><small>{config.brandName.length}/60</small></label>
          <label><span>{ar ? "عنوان الموقع الافتراضي" : "Default site title"}</span><input disabled={!isOwner} value={config.siteTitle} maxLength={120} onChange={(event)=>field("siteTitle",event.target.value)}/><small>{config.siteTitle.length}/120</small></label>
          <label><span>{ar ? "وصف الموقع / Meta description" : "Site / meta description"}</span><textarea disabled={!isOwner} value={config.description} maxLength={320} rows={4} onChange={(event)=>field("description",event.target.value)}/><small>{config.description.length}/320</small></label>
          <label className="siteIdentityToggle"><input disabled={!isOwner} type="checkbox" checked={config.indexable} onChange={(event)=>field("indexable",event.target.checked)}/><span><strong>{ar ? "السماح بفهرسة الموقع" : "Allow search indexing"}</strong><small>{ar ? "إيقافها يطلب من محركات البحث عدم فهرسة الموقع." : "Turning this off asks search engines not to index the site."}</small></span></label>
        </div>

        <div className="siteIdentityGroup">
          <div className="siteIdentityGroupHead"><ImageIcon size={18}/><div><strong>{ar ? "الشعارات والصور" : "Logos & images"}</strong><small>{ar ? "استخدم روابط HTTPS مباشرة للصور." : "Use direct HTTPS image URLs."}</small></div></div>
          <label><span>{ar ? "Logo الرئيسي" : "Main logo"}</span><input disabled={!isOwner} type="url" placeholder="https://.../logo.svg" value={config.logoUrl ?? ""} onChange={(event)=>field("logoUrl",event.target.value || null)}/></label>
          <label><span>{ar ? "أيقونة التب / Favicon" : "Tab icon / favicon"}</span><input disabled={!isOwner} type="url" placeholder="https://.../favicon.png" value={config.faviconUrl ?? ""} onChange={(event)=>field("faviconUrl",event.target.value || null)}/></label>
          <label><span>{ar ? "صورة المشاركة الاجتماعية / OG" : "Social sharing / OG image"}</span><input disabled={!isOwner} type="url" placeholder="https://.../og.jpg" value={config.ogImageUrl ?? ""} onChange={(event)=>field("ogImageUrl",event.target.value || null)}/></label>
        </div>

        <div className="siteIdentityGroup">
          <div className="siteIdentityGroupHead"><Search size={18}/><div><strong>{ar ? "التواصل والروابط" : "Contact & links"}</strong><small>{ar ? "معلومات رسمية للبراند والفوتر." : "Official brand contact and footer information."}</small></div></div>
          <label><span>{ar ? "إيميل الدعم" : "Support email"}</span><input disabled={!isOwner} type="email" placeholder="support@example.com" value={config.supportEmail} onChange={(event)=>field("supportEmail",event.target.value)}/></label>
          <label><span>{ar ? "نص الفوتر" : "Footer text"}</span><textarea disabled={!isOwner} rows={3} maxLength={240} value={config.footerText} onChange={(event)=>field("footerText",event.target.value)}/><small>{config.footerText.length}/240</small></label>
          <div className="siteIdentitySocialGrid">
            {(["instagram","facebook","x","linkedin"] as const).map((key)=><label key={key}><span>{key === "x" ? "X / Twitter" : key.charAt(0).toUpperCase()+key.slice(1)}</span><input disabled={!isOwner} type="url" placeholder="https://..." value={config.socialLinks[key] ?? ""} onChange={(event)=>social(key,event.target.value)}/></label>)}
          </div>
        </div>
      </div>

      <aside className="siteIdentityPreview">
        <span className="eyebrow">{ar ? "معاينة مباشرة" : "Live preview"}</span>
        <div className="siteIdentityBrandPreview">
          <div className="siteIdentityLogoPreview">{logoPreview ? <img src={logoPreview} alt=""/> : <strong>{config.brandName.slice(0,1).toUpperCase()}</strong>}</div>
          <div><strong>{config.brandName || "—"}</strong><small>{ar ? "الشعار الرئيسي" : "Primary brand"}</small></div>
        </div>
        <div className="siteIdentityBrowserPreview"><div className="siteIdentityBrowserTab">{faviconPreview ? <img src={faviconPreview} alt=""/> : <span/>}<b>{config.siteTitle || config.brandName}</b></div></div>
        <div className="siteIdentitySearchPreview"><span>handmekey.com</span><strong>{config.siteTitle || "Site title"}</strong><p>{config.description || "Site description"}</p></div>
        <div className="siteIdentityOgPreview">{socialPreview ? <img src={socialPreview} alt=""/> : <div className="siteIdentityOgPlaceholder"><ImageIcon size={26}/><span>{ar ? "صورة المشاركة" : "Social image"}</span></div>}<div><small>{config.brandName}</small><strong>{config.siteTitle}</strong><p>{config.description}</p></div></div>
        <div className={config.indexable ? "siteIdentityIndexOk" : "siteIdentityIndexOff"}>{config.indexable ? (ar ? "الفهرسة مفعّلة" : "Indexing enabled") : (ar ? "الفهرسة متوقفة" : "Indexing disabled")}</div>
      </aside>
    </div>

    <div className="siteIdentityActions">
      <div>{message && <p className="siteIdentitySuccess">{message}</p>}{error && <p className="siteIdentityError">{error}</p>}</div>
      <button type="button" className="primaryButton" disabled={!isOwner || saving} onClick={save}><Save size={16}/>{saving ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ هوية الموقع" : "Save site identity")}</button>
    </div>
  </section>;
}

function safePreviewUrl(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; }
}
