"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type {Locale} from "@/lib/i18n";

type Content = {
  area: string | null;
  description: string | null;
  starRating: number | null;
  latitude: number | null;
  longitude: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  amenities: Array<{code: string; name: string; category: string | null}>;
};

export default function PublicContentManager({hotelId, content, locale}: {hotelId: string; content: Content; locale: Locale}) {
  const ar=locale==="ar";
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/hotels/${hotelId}/content`, {
        method: "PUT",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          area: nullable(form.get("area")),
          description: nullable(form.get("description")),
          starRating: nullableNumber(form.get("starRating")),
          latitude: nullableNumber(form.get("latitude")),
          longitude: nullableNumber(form.get("longitude")),
          checkInTime: nullable(form.get("checkInTime")),
          checkOutTime: nullable(form.get("checkOutTime")),
          amenities: parseAmenities(String(form.get("amenities") ?? "")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? "Unable to save public content");
      setMessage(ar?"تم حفظ محتوى الفندق العام":"Public hotel content saved");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to save public content");
    } finally {
      setSaving(false);
    }
  }

  return <section className="panel setupPanel wideSetup" style={{marginBottom:24}}>
    <span className="eyebrow">{ar?"ملف يظهر للضيف":"Customer-facing profile"}</span><h2>{ar?"محتوى الفندق العام":"Public hotel content"}</h2><p className="muted">{ar?"تُدار بيانات الملف هنا، بينما تُرفع الصور بشكل منفصل إلى التخزين الآمن ولا تدخل كرابط خارجي.":"Profile fields are managed here. Photos are uploaded separately through secure object storage and are never entered as external URLs."}</p>
    <form className="stackForm" onSubmit={submit}>
      <div className="formGrid"><label>{ar?"المنطقة / الحي":"Area / neighborhood"}<input name="area" defaultValue={content.area ?? ""} placeholder="Abdali"/></label><label>{ar?"التصنيف الرسمي":"Official star rating"}<input name="starRating" type="number" min="1" max="5" defaultValue={content.starRating ?? ""}/></label></div>
      <label>{ar?"الوصف":"Description"}<textarea name="description" rows={5} defaultValue={content.description ?? ""} placeholder={ar?"صف المنشأة والموقع وتجربة الضيف.":"Describe the property, location, and guest experience."}/></label>
      <div className="formGrid"><label>{ar?"خط العرض":"Latitude"}<input name="latitude" type="number" min="-90" max="90" step="0.000001" defaultValue={content.latitude ?? ""}/></label><label>{ar?"خط الطول":"Longitude"}<input name="longitude" type="number" min="-180" max="180" step="0.000001" defaultValue={content.longitude ?? ""}/></label></div>
      <div className="formGrid"><label>{ar?"وقت الدخول":"Check-in time"}<input name="checkInTime" type="time" defaultValue={content.checkInTime ?? ""}/></label><label>{ar?"وقت المغادرة":"Check-out time"}<input name="checkOutTime" type="time" defaultValue={content.checkOutTime ?? ""}/></label></div>
      <label>{ar?"المرافق":"Amenities"} <small className="muted">{ar?"كل سطر: CODE | الاسم | التصنيف اختياري":"one per line: CODE | Display name | optional category"}</small><textarea name="amenities" rows={6} defaultValue={content.amenities.map((amenity)=>`${amenity.code} | ${amenity.name}${amenity.category ? ` | ${amenity.category}` : ""}`).join("\n")} placeholder={'WIFI | Wi-Fi | Connectivity\nPOOL | Swimming pool | Wellness\nPARKING | Parking | Transport'}/></label>
      <button className="primaryButton" disabled={saving}>{saving ? (ar?"جارٍ الحفظ…":"Saving…") : (ar?"حفظ المحتوى العام":"Save public content")}</button>
    </form>
    {message && <div className="setupMessage">{message}</div>}
  </section>;
}

function nullable(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function nullableNumber(value: FormDataEntryValue | null): number | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error("Location and star rating fields must be valid numbers");
  return number;
}

function parseAmenities(value: string) {
  return lines(value).map((line, index) => {
    const [code, name, category] = line.split("|").map((part) => part.trim());
    if (!code || !name) throw new Error(`Amenity line ${index + 1} must include CODE | Display name`);
    return {code, name, category: category || null};
  });
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
