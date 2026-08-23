"use client";

import { Globe2 } from "lucide-react";
import { useState } from "react";
import { dictionary, type Locale } from "@/lib/i18n";

type Props = Readonly<{locale: Locale; compact?: boolean}>;

export function LanguageSwitcher({locale, compact = false}: Props) {
  const [value, setValue] = useState<Locale>(locale);
  const [saving, setSaving] = useState(false);
  const copy = dictionary(locale);

  async function change(next: Locale) {
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

  return <label className={compact ? "languageSwitcher compact" : "languageSwitcher"} title={copy.language.label}>
    <Globe2 size={16}/>
    <select aria-label={copy.language.label} value={value} disabled={saving} onChange={(event)=>void change(event.target.value as Locale)}>
      <option value="en">{copy.language.english}</option>
      <option value="ar">{copy.language.arabic}</option>
    </select>
  </label>;
}
