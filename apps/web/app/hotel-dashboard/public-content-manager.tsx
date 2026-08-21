"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type Content = {
  area: string | null;
  description: string | null;
  starRating: number | null;
  latitude: number | null;
  longitude: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  photos: Array<{url: string; alt: string | null; sortOrder: number}>;
  amenities: Array<{code: string; name: string; category: string | null}>;
};

export default function PublicContentManager({hotelId, content}: {hotelId: string; content: Content}) {
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
          photos: parsePhotos(String(form.get("photos") ?? "")),
          amenities: parseAmenities(String(form.get("amenities") ?? "")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? "Unable to save public content");
      setMessage("Public hotel content saved");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to save public content");
    } finally {
      setSaving(false);
    }
  }

  return <section className="panel setupPanel wideSetup" style={{marginBottom:24}}>
    <span className="eyebrow">Customer-facing profile</span><h2>Public hotel content</h2><p className="muted">Only active, verified hotels are discoverable. These fields become the source of truth for Home, Search, hotel details, and future mobile clients.</p>
    <form className="stackForm" onSubmit={submit}>
      <div className="formGrid"><label>Area / neighborhood<input name="area" defaultValue={content.area ?? ""} placeholder="Abdali"/></label><label>Official star rating<input name="starRating" type="number" min="1" max="5" defaultValue={content.starRating ?? ""}/></label></div>
      <label>Description<textarea name="description" rows={5} defaultValue={content.description ?? ""} placeholder="Describe the property, location, and guest experience."/></label>
      <div className="formGrid"><label>Latitude<input name="latitude" type="number" min="-90" max="90" step="0.000001" defaultValue={content.latitude ?? ""}/></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="0.000001" defaultValue={content.longitude ?? ""}/></label></div>
      <div className="formGrid"><label>Check-in time<input name="checkInTime" type="time" defaultValue={content.checkInTime ?? ""}/></label><label>Check-out time<input name="checkOutTime" type="time" defaultValue={content.checkOutTime ?? ""}/></label></div>
      <label>Photos <small className="muted">one per line: URL | optional alt text</small><textarea name="photos" rows={5} defaultValue={content.photos.map((photo)=>`${photo.url}${photo.alt ? ` | ${photo.alt}` : ""}`).join("\n")} placeholder="https://cdn.example.com/hotel.jpg | Hotel exterior"/></label>
      <label>Amenities <small className="muted">one per line: CODE | Display name | optional category</small><textarea name="amenities" rows={6} defaultValue={content.amenities.map((amenity)=>`${amenity.code} | ${amenity.name}${amenity.category ? ` | ${amenity.category}` : ""}`).join("\n")} placeholder={'WIFI | Wi-Fi | Connectivity\nPOOL | Swimming pool | Wellness\nPARKING | Parking | Transport'}/></label>
      <button className="primaryButton" disabled={saving}>{saving ? "Saving…" : "Save public content"}</button>
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

function parsePhotos(value: string) {
  return lines(value).map((line, index) => {
    const [url, alt] = line.split("|").map((part) => part.trim());
    if (!url) throw new Error(`Photo line ${index + 1} is missing a URL`);
    return {url, alt: alt || null, sortOrder: index};
  });
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
