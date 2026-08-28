"use client";

import { Globe2 } from "lucide-react";
import { useState } from "react";
import { GUEST_LOCALE_OPTIONS, type GuestLocale } from "@/lib/guest-market";
import { guestMarketCopy } from "@/lib/guest-i18n";

type Props = Readonly<{locale: GuestLocale; compact?: boolean}>;

const LANGUAGE_FLAGS: Readonly<Record<GuestLocale, string>> = {
  en: "🇬🇧",
  ar: "🇯🇴",
  zh: "🇨🇳",
  fr: "🇫🇷",
  de: "🇩🇪",
  es: "🇪🇸",
  it: "🇮🇹",
  tr: "🇹🇷",
  ru: "🇷🇺",
  ja: "🇯🇵",
  ko: "🇰🇷",
  hi: "🇮🇳",
  pt: "🇧🇷",
  id: "🇮🇩",
  th: "🇹🇭",
};

export function LanguageSwitcher({locale, compact = false}: Props) {
  const [value, setValue] = useState<GuestLocale>(locale);
  const [saving, setSaving] = useState(false);
  const label = guestMarketCopy(locale).auto;

  async function change(next: GuestLocale) {
    if (next === locale || saving) return;
    setValue(next);
    setSaving(true);
    try {
      const response = await fetch("/api/v1/preferences/locale", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({locale: next}),
      });
      if (!response.ok) throw new Error("Unable to save language");
      window.location.reload();
    } catch {
      setValue(locale);
      setSaving(false);
    }
  }

  return <label className={compact ? "languageSwitcher compact" : "languageSwitcher"} title={label}>
    <Globe2 size={16}/>
    <select aria-label="Language" value={value} disabled={saving} onChange={(event)=>void change(event.target.value as GuestLocale)}>
      {GUEST_LOCALE_OPTIONS.map((option)=><option value={option.code} key={option.code}>{LANGUAGE_FLAGS[option.code]} {option.label}</option>)}
    </select>
  </label>;
}
