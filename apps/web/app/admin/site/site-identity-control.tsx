"use client";

import {useMemo, useState, type ChangeEvent} from "react";
import {FileImage, FileText, Globe2, ImageIcon, LockKeyhole, Save, ShieldCheck, Trash2, UploadCloud} from "lucide-react";

type Locale = "en" | "ar";
type Config = {
  brandName: string;
  siteTitle: string;
  description: string;
  logoUrl: string | null;
  wordmarkUrl: string | null;
  lightLogoUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  supportEmail: string;
  footerText: string;
  indexable: boolean;
  socialLinks: {instagram: string | null; facebook: string | null; x: string | null; linkedin: string | null};
};

type AssetKind = "LOGO_MARK" | "WORDMARK" | "LOGO_LIGHT" | "FAVICON" | "OG_IMAGE";
type AssetField = "logoUrl" | "wordmarkUrl" | "lightLogoUrl" | "faviconUrl" | "ogImageUrl";

type Props = Readonly<{
  locale: Locale;
  initialConfig: Config;
  isOwner: boolean;
  ownerName?: string | null;
  ownerEmail?: string | null;
}>;

type UploadGrant = {
  assetKey: string;
  publicUrl: string;
  recommended: string;
  upload: {method: "PUT"; url: string; headers: Record<string,string>};
};

type CompletedAsset = {publicUrl: string; width: number; height: number};

const ASSETS: ReadonlyArray<Readonly<{
  kind: AssetKind;
  field: AssetField;
  labelEn: string;
  labelAr: string;
  helpEn: string;
  helpAr: string;
  recommendedEn: string;
  recommendedAr: string;
  accept: string;
}>> = [
  {kind:"LOGO_MARK",field:"logoUrl",labelEn:"Logo mark",labelAr:"رمز الشعار",helpEn:"Square symbol used beside the brand name.",helpAr:"الرمز المربع الذي يظهر بجانب اسم البراند.",recommendedEn:"512×512 PNG/WebP · transparent",recommendedAr:"512×512 PNG/WebP · خلفية شفافة",accept:"image/png,image/webp"},
  {kind:"WORDMARK",field:"wordmarkUrl",labelEn:"Primary wordmark",labelAr:"الشعار الأفقي الرئيسي",helpEn:"Horizontal logo used on light backgrounds.",helpAr:"الشعار الأفقي المستخدم على الخلفيات الفاتحة.",recommendedEn:"1200×300 PNG/WebP · transparent",recommendedAr:"1200×300 PNG/WebP · خلفية شفافة",accept:"image/png,image/webp"},
  {kind:"LOGO_LIGHT",field:"lightLogoUrl",labelEn:"Light wordmark",labelAr:"الشعار الفاتح",helpEn:"White/light version for dark surfaces and footer areas.",helpAr:"نسخة فاتحة أو بيضاء للخلفيات الداكنة والفوتر.",recommendedEn:"1200×300 PNG/WebP · transparent",recommendedAr:"1200×300 PNG/WebP · خلفية شفافة",accept:"image/png,image/webp"},
  {kind:"FAVICON",field:"faviconUrl",labelEn:"Favicon / tab icon",labelAr:"أيقونة المتصفح / Favicon",helpEn:"Small browser tab and bookmark icon.",helpAr:"الأيقونة الصغيرة في تب المتصفح والمفضلة.",recommendedEn:"512×512 PNG or ICO",recommendedAr:"512×512 PNG أو ICO",accept:"image/png,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico"},
  {kind:"OG_IMAGE",field:"ogImageUrl",labelEn:"Social share image",labelAr:"صورة المشاركة الاجتماعية",helpEn:"Preview image used by social platforms when a page has no dedicated share image.",helpAr:"الصورة الافتراضية للمشاركة عندما لا تحدد الصفحة صورة خاصة بها.",recommendedEn:"1200×630 PNG/JPEG/WebP",recommendedAr:"1200×630 PNG/JPEG/WebP",accept:"image/png,image/jpeg,image/webp"},
];

export default function SiteIdentityControl({locale, initialConfig, isOwner, ownerName, ownerEmail}: Props) {
  const ar = locale === "ar";
  const [config, setConfig] = useState<Config>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<AssetKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logoPreview = useMemo(() => safePreviewUrl(config.logoUrl), [config.logoUrl]);
  const wordmarkPreview = useMemo(() => safePreviewUrl(config.wordmarkUrl), [config.wordmarkUrl]);
  const lightLogoPreview = useMemo(() => safePreviewUrl(config.lightLogoUrl), [config.lightLogoUrl]);
  const faviconPreview = useMemo(() => safePreviewUrl(config.faviconUrl), [config.faviconUrl]);
  const socialPreview = useMemo(() => safePreviewUrl(config.ogImageUrl), [config.ogImageUrl]);

  function field<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig((current) => ({...current, [key]: value}));
  }

  function social(key: keyof Config["socialLinks"], value: string) {
    setConfig((current) => ({...current, socialLinks: {...current.socialLinks, [key]: value || null}}));
  }

  async function uploadAsset(kind: AssetKind, targetField: AssetField, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !isOwner || uploading) return;
    setUploading(kind); setMessage(null); setError(null);
    try {
      const startResponse = await fetch("/api/v1/admin/site-assets", {
        method: "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({kind, fileName:file.name, contentType:file.type, sizeBytes:file.size}),
      });
      const startPayload = await startResponse.json().catch(() => null) as {data?: UploadGrant; error?: {message?: string}} | null;
      if (!startResponse.ok || !startPayload?.data) throw new Error(startPayload?.error?.message || (ar ? "تعذر تجهيز رفع الصورة" : "Could not prepare the image upload"));

      const putResponse = await fetch(startPayload.data.upload.url, {
        method: startPayload.data.upload.method,
        headers: startPayload.data.upload.headers,
        body: file,
      });
      if (!putResponse.ok) throw new Error(ar ? "فشل إرسال الصورة إلى التخزين" : "The image could not be uploaded to storage");

      const completeResponse = await fetch("/api/v1/admin/site-assets/complete", {
        method: "POST",
        headers: {"content-type":"application/json"},
        body: JSON.stringify({assetKey:startPayload.data.assetKey}),
      });
      const completePayload = await completeResponse.json().catch(() => null) as {data?: CompletedAsset; error?: {message?: string}} | null;
      if (!completeResponse.ok || !completePayload?.data) throw new Error(completePayload?.error?.message || (ar ? "تعذر التحقق من الصورة" : "Could not verify the uploaded image"));

      field(targetField, completePayload.data.publicUrl);
      setMessage(ar
        ? `تم رفع الصورة والتحقق منها (${completePayload.data.width}×${completePayload.data.height}). اضغط حفظ لنشرها.`
        : `Image uploaded and verified (${completePayload.data.width}×${completePayload.data.height}). Save to publish it.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ar ? "تعذر رفع الصورة" : "Image upload failed"));
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (!isOwner || saving || uploading) return;
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
      setMessage(ar ? "تم حفظ هوية الموقع. الصور أصبحت فعّالة على الموقع." : "Site identity saved. The brand assets are now active.");
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
        <h2>{ar ? "هوية البراند والأصول البصرية" : "Brand identity & visual assets"}</h2>
        <p>{ar ? "ارفع الشعارات، أيقونة المتصفح وصورة المشاركة من نفس الصفحة مع معاينة مباشرة وفحص حقيقي للملف." : "Upload logos, the browser icon and social share image from one place with live preview and server-side file verification."}</p>
      </div>
      <div className={isOwner ? "siteIdentityOwnerBadge" : "siteIdentityLockedBadge"}>
        {isOwner ? <ShieldCheck size={17}/> : <LockKeyhole size={17}/>} 
        <span><strong>{isOwner ? "Platform Owner" : (ar ? "Owner فقط" : "Owner only")}</strong><small>{ownerName || ownerEmail || (ar ? "صلاحية محمية" : "Protected access")}</small></span>
      </div>
    </div>

    {!isOwner && <div className="siteIdentityOwnerNotice"><LockKeyhole size={18}/><div><strong>{ar ? "هذه الإعدادات مقفلة" : "These settings are locked"}</strong><p>{ar ? "يمكن لـ Platform Owner فقط تغيير ملفات هوية الموقع. بقية المشرفين يستطيعون المعاينة فقط." : "Only the Platform Owner can change public brand assets. Other administrators have read-only access."}</p></div></div>}

    <div className="siteIdentityTemplateNotice"><FileText size={18}/><div><strong>{ar ? "Title وMeta Description خارج هذه الصفحة" : "Title and meta description live in SEO templates"}</strong><p>{ar ? "تم فصلهم عن هوية البراند حتى لا تتكرر مسؤولية الـSEO. قوالب الصفحات هي التي تحدد العناوين والأوصاف." : "They are intentionally not edited here so SEO responsibility is not duplicated. Page templates own titles and descriptions."}</p></div></div>

    <div className="siteIdentityWorkspace">
      <div className="siteIdentityForm">
        <div className="siteIdentityGroup siteIdentityBrandBasics">
          <div className="siteIdentityGroupHead"><Globe2 size={18}/><div><strong>{ar ? "هوية البراند" : "Brand basics"}</strong><small>{ar ? "اسم البراند وإعداد الفهرسة العام." : "Public brand name and site-wide indexing state."}</small></div></div>
          <label><span>{ar ? "اسم البراند" : "Brand name"}</span><input disabled={!isOwner} value={config.brandName} maxLength={60} onChange={(event)=>field("brandName",event.target.value)}/><small>{config.brandName.length}/60</small></label>
          <label className="siteIdentityToggle"><input disabled={!isOwner} type="checkbox" checked={config.indexable} onChange={(event)=>field("indexable",event.target.checked)}/><span><strong>{ar ? "السماح بفهرسة الموقع" : "Allow search indexing"}</strong><small>{ar ? "تحكم عام فقط. محتوى SEO نفسه يأتي من القوالب." : "Global switch only. SEO content itself comes from templates."}</small></span></label>
        </div>

        <div className="siteIdentityGroup siteIdentityAssetsGroup">
          <div className="siteIdentityGroupHead"><ImageIcon size={18}/><div><strong>{ar ? "ملفات الهوية" : "Brand assets"}</strong><small>{ar ? "كل ملف يرفع مباشرة للتخزين، ثم يتم التحقق منه من جهة السيرفر قبل اعتماده." : "Every file goes directly to object storage, then the server verifies it before it can be used."}</small></div></div>
          <div className="siteIdentityAssetGrid">
            {ASSETS.map((asset) => {
              const url = safePreviewUrl(config[asset.field]);
              const busy = uploading === asset.kind;
              return <article className={`siteIdentityAssetCard ${asset.kind === "OG_IMAGE" ? "wide" : ""}`} key={asset.kind}>
                <div className={`siteIdentityAssetPreview ${asset.kind === "OG_IMAGE" ? "social" : asset.kind === "WORDMARK" || asset.kind === "LOGO_LIGHT" ? "horizontal" : "square"} ${asset.kind === "LOGO_LIGHT" ? "darkSurface" : ""}`}>
                  {url ? <img src={url} alt=""/> : <div><FileImage size={24}/><span>{ar ? "لا يوجد ملف" : "No asset"}</span></div>}
                </div>
                <div className="siteIdentityAssetCopy"><strong>{ar ? asset.labelAr : asset.labelEn}</strong><p>{ar ? asset.helpAr : asset.helpEn}</p><small>{ar ? asset.recommendedAr : asset.recommendedEn}</small></div>
                <div className="siteIdentityAssetActions">
                  <label className={isOwner && !uploading ? "siteAssetUploadButton" : "siteAssetUploadButton disabled"}>
                    <UploadCloud size={16}/><span>{busy ? (ar ? "جاري الرفع..." : "Uploading...") : url ? (ar ? "استبدال" : "Replace") : (ar ? "رفع صورة" : "Upload image")}</span>
                    <input disabled={!isOwner || Boolean(uploading)} type="file" accept={asset.accept} onChange={(event)=>uploadAsset(asset.kind, asset.field, event)}/>
                  </label>
                  {url && <button type="button" className="siteAssetRemoveButton" disabled={!isOwner || Boolean(uploading)} onClick={()=>field(asset.field,null)}><Trash2 size={15}/>{ar ? "إزالة" : "Remove"}</button>}
                </div>
              </article>;
            })}
          </div>
        </div>

        <div className="siteIdentityGroup">
          <div className="siteIdentityGroupHead"><ShieldCheck size={18}/><div><strong>{ar ? "معلومات البراند العامة" : "Public brand details"}</strong><small>{ar ? "معلومات تشغيلية للفوتر والتواصل، وليست قوالب SEO." : "Operational footer and contact information, separate from SEO templates."}</small></div></div>
          <label><span>{ar ? "إيميل الدعم" : "Support email"}</span><input disabled={!isOwner} type="email" placeholder="support@example.com" value={config.supportEmail} onChange={(event)=>field("supportEmail",event.target.value)}/></label>
          <label><span>{ar ? "نص الفوتر" : "Footer text"}</span><textarea disabled={!isOwner} rows={3} maxLength={240} value={config.footerText} onChange={(event)=>field("footerText",event.target.value)}/><small>{config.footerText.length}/240</small></label>
          <div className="siteIdentitySocialGrid">
            {(["instagram","facebook","x","linkedin"] as const).map((key)=><label key={key}><span>{key === "x" ? "X / Twitter" : key.charAt(0).toUpperCase()+key.slice(1)}</span><input disabled={!isOwner} type="url" placeholder="https://..." value={config.socialLinks[key] ?? ""} onChange={(event)=>social(key,event.target.value)}/></label>)}
          </div>
        </div>
      </div>

      <aside className="siteIdentityPreview">
        <span className="eyebrow">{ar ? "معاينة الهوية" : "Brand preview"}</span>
        <div className="siteIdentityLiveHeader">
          <small>{ar ? "هيدر فاتح" : "Light header"}</small>
          <div>{wordmarkPreview ? <img src={wordmarkPreview} alt=""/> : <>{logoPreview ? <img className="mark" src={logoPreview} alt=""/> : <span className="siteIdentityFallbackMark">{config.brandName.slice(0,1).toUpperCase()}</span>}<strong>{config.brandName || "—"}</strong></>}</div>
        </div>
        <div className="siteIdentityLiveDark">
          <small>{ar ? "خلفية داكنة" : "Dark surface"}</small>
          <div>{lightLogoPreview ? <img src={lightLogoPreview} alt=""/> : <strong>{config.brandName || "—"}</strong>}</div>
        </div>
        <div className="siteIdentityBrowserPreview"><div className="siteIdentityBrowserTab">{faviconPreview ? <img src={faviconPreview} alt=""/> : <span/>}<b>{config.brandName || "Brand"}</b></div></div>
        <div className="siteIdentityOgPreview">{socialPreview ? <img src={socialPreview} alt=""/> : <div className="siteIdentityOgPlaceholder"><ImageIcon size={26}/><span>{ar ? "صورة المشاركة" : "Social image"}</span></div>}<div><small>{config.brandName}</small><strong>{ar ? "العنوان يأتي من قالب الصفحة" : "Page title comes from the SEO template"}</strong><p>{ar ? "الوصف كذلك يتم إنشاؤه من قالب SEO الخاص بالصفحة." : "The page-specific meta description is also supplied by its SEO template."}</p></div></div>
        <div className={config.indexable ? "siteIdentityIndexOk" : "siteIdentityIndexOff"}>{config.indexable ? (ar ? "الفهرسة العامة مفعّلة" : "Global indexing enabled") : (ar ? "الفهرسة العامة متوقفة" : "Global indexing disabled")}</div>
      </aside>
    </div>

    <div className="siteIdentityActions">
      <div>{message && <p className="siteIdentitySuccess">{message}</p>}{error && <p className="siteIdentityError">{error}</p>}</div>
      <button type="button" className="primaryButton" disabled={!isOwner || saving || Boolean(uploading)} onClick={save}><Save size={16}/>{saving ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ هوية الموقع" : "Save brand identity")}</button>
    </div>
  </section>;
}

function safePreviewUrl(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; }
}
