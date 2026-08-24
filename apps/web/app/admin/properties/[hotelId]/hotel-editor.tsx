"use client";

import {useState} from "react";
import type {FormEvent} from "react";
import {useRouter} from "next/navigation";
import {Building2, CircleDollarSign, MapPinned, Save, Settings2, Sparkles} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import {portalDictionary} from "@/lib/portal-i18n";

type Hotel = {
  id: string; name: string; slug: string; city: string; countryCode: string; address: string; area: string | null; description: string | null; starRating: number | null; latitude: number | null; longitude: number | null; checkInTime: string | null; checkOutTime: string | null; timezone: string; currency: string; status: string; verified: boolean; commissionRate: number; serviceRate: number; taxRate: number; overbookingEnabled: boolean; amenities: Array<{code: string; name: string; category: string | null}>; createdAt: string; updatedAt: string; lastPublishedAt: string | null;
};

export default function HotelEditor({hotel, locale}: Readonly<{hotel: Hotel; locale: Locale}>) {
  const copy = portalDictionary(locale);
  const admin = copy.admin;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setMessage(null); setError(null);
    try {
      const response = await fetch(`/api/v1/admin/hotels/${hotel.id}`, {
        method: "PATCH",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          name: String(form.get("name") ?? ""), city: String(form.get("city") ?? ""), countryCode: String(form.get("countryCode") ?? ""), address: String(form.get("address") ?? ""),
          area: nullable(form.get("area")), description: nullable(form.get("description")), starRating: nullableNumber(form.get("starRating")), latitude: nullableNumber(form.get("latitude")), longitude: nullableNumber(form.get("longitude")),
          checkInTime: nullable(form.get("checkInTime")), checkOutTime: nullable(form.get("checkOutTime")), timezone: String(form.get("timezone") ?? ""), currency: String(form.get("currency") ?? ""),
          commissionRate: percent(form.get("commissionRate")), serviceRate: percent(form.get("serviceRate")), taxRate: percent(form.get("taxRate")), overbookingEnabled: form.get("overbookingEnabled") === "on",
          amenities: parseAmenities(String(form.get("amenities") ?? ""), locale),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 401) { window.location.assign(`/admin/login?next=${encodeURIComponent(`/admin/properties/${hotel.id}`)}`); return; }
      if (!response.ok) throw new Error(issueMessage(payload, locale));
      setMessage(admin.saved); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (locale === "ar" ? "تعذر حفظ المنشأة" : "Unable to save property"));
    } finally { setBusy(false); }
  }

  return <form className="adminHotelEditor" onSubmit={submit}>
    <section className="adminPanel adminEditorSection">
      <div className="adminEditorHeading"><MapPinned size={20}/><div><span className="eyebrow">01</span><h2>{admin.identity}</h2></div></div>
      <div className="adminFormGrid"><label>{admin.nameLabel}<input name="name" minLength={2} maxLength={160} defaultValue={hotel.name} required/></label><label>{admin.slug}<input value={hotel.slug} disabled/><small>{locale === "ar" ? "محمي لتجنب كسر الروابط الحالية" : "Protected to avoid breaking existing links"}</small></label><label>{admin.city}<input name="city" defaultValue={hotel.city} required/></label><label>{admin.country}<input name="countryCode" minLength={2} maxLength={2} defaultValue={hotel.countryCode} required/></label><label className="adminFieldWide">{admin.address}<input name="address" defaultValue={hotel.address} required/></label><label className="adminFieldWide">{admin.area}<input name="area" defaultValue={hotel.area ?? ""}/></label></div>
    </section>

    <section className="adminPanel adminEditorSection">
      <div className="adminEditorHeading"><Building2 size={20}/><div><span className="eyebrow">02</span><h2>{admin.publicContent}</h2></div></div>
      <div className="adminFormGrid"><label className="adminFieldWide">{admin.description}<textarea name="description" rows={7} maxLength={5000} defaultValue={hotel.description ?? ""}/></label><label>{admin.stars}<input name="starRating" type="number" min="1" max="5" defaultValue={hotel.starRating ?? ""}/></label><label>{admin.latitude}<input name="latitude" type="number" min="-90" max="90" step="0.000001" defaultValue={hotel.latitude ?? ""}/></label><label>{admin.longitude}<input name="longitude" type="number" min="-180" max="180" step="0.000001" defaultValue={hotel.longitude ?? ""}/></label><label className="adminFieldWide">{admin.amenities}<small>{admin.amenityHelp}</small><textarea name="amenities" rows={7} defaultValue={hotel.amenities.map((amenity) => `${amenity.code} | ${amenity.name}${amenity.category ? ` | ${amenity.category}` : ""}`).join("\n")}/></label></div>
    </section>

    <section className="adminEditorColumns">
      <div className="adminPanel adminEditorSection"><div className="adminEditorHeading"><Settings2 size={20}/><div><span className="eyebrow">03</span><h2>{admin.operations}</h2></div></div><div className="adminFormGrid"><label>{admin.checkIn}<input name="checkInTime" type="time" defaultValue={hotel.checkInTime ?? ""}/></label><label>{admin.checkOut}<input name="checkOutTime" type="time" defaultValue={hotel.checkOutTime ?? ""}/></label><label>{admin.timezone}<input name="timezone" defaultValue={hotel.timezone} required/></label><label>{admin.currency}<input name="currency" minLength={3} maxLength={3} defaultValue={hotel.currency} required/></label><label className="adminInlineCheck adminFieldWide"><input name="overbookingEnabled" type="checkbox" defaultChecked={hotel.overbookingEnabled}/><span><strong>{admin.overbooking}</strong><small>{locale === "ar" ? "يطبق حد الغرف الزائد المحدد في المخزون" : "Respects inventory-level overbooking limits"}</small></span></label></div></div>
      <div className="adminPanel adminEditorSection"><div className="adminEditorHeading"><CircleDollarSign size={20}/><div><span className="eyebrow">04</span><h2>{admin.commercial}</h2></div></div><div className="adminFormGrid adminCommercialGrid"><label>{admin.commission}<input name="commissionRate" type="number" min="0" max="50" step="0.01" defaultValue={(hotel.commissionRate * 100).toFixed(2)} required/></label><label>{admin.service}<input name="serviceRate" type="number" min="0" max="50" step="0.01" defaultValue={(hotel.serviceRate * 100).toFixed(2)} required/></label><label>{admin.tax}<input name="taxRate" type="number" min="0" max="50" step="0.01" defaultValue={(hotel.taxRate * 100).toFixed(2)} required/></label></div><div className="adminCommercialNote"><Sparkles size={17}/><p>{locale === "ar" ? "هذه القيم تدخل مباشرة في محرك التسعير. لذلك تُحفظ كنسب عشرية وتُسجل قبل وبعد التغيير." : "These values feed the pricing engine directly, so they are stored as decimals and audited before and after every change."}</p></div></div>
    </section>

    <div className="adminSaveBar"><div>{message && <span className="adminSuccessMessage" role="status">{message}</span>}{error && <span className="formError" role="alert">{error}</span>}</div><button className="primaryButton" type="submit" disabled={busy}><Save size={17}/>{busy ? copy.common.saving : copy.common.save}</button></div>
  </form>;
}

function nullable(value: FormDataEntryValue | null): string | null { const text = typeof value === "string" ? value.trim() : ""; return text || null; }
function nullableNumber(value: FormDataEntryValue | null): number | null { const text = typeof value === "string" ? value.trim() : ""; if (!text) return null; const number = Number(text); if (!Number.isFinite(number)) throw new Error("Invalid numeric value"); return number; }
function percent(value: FormDataEntryValue | null): number { const number = Number(value); if (!Number.isFinite(number)) throw new Error("Invalid percentage"); return number / 100; }
function parseAmenities(value: string, locale: Locale) { return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => { const [code, name, category] = line.split("|").map((part) => part.trim()); if (!code || !name) throw new Error(locale === "ar" ? `السطر ${index + 1} يجب أن يحتوي CODE | الاسم` : `Amenity line ${index + 1} must include CODE | Display name`); return {code, name, category: category || null}; }); }
function issueMessage(payload: unknown, locale: Locale) {
  const fallback = locale === "ar" ? "تعذر حفظ المنشأة" : "Unable to save property";
  if (typeof payload !== "object" || payload === null || !("error" in payload)) return fallback;
  const error = (payload as {error?: unknown}).error;
  if (typeof error !== "object" || error === null) return fallback;
  const typed = error as {message?: unknown; issues?: unknown};
  if (Array.isArray(typed.issues)) {
    const first = typed.issues[0];
    if (typeof first === "object" && first !== null && "message" in first && typeof first.message === "string") return first.message;
  }
  return typeof typed.message === "string" ? typed.message : fallback;
}
