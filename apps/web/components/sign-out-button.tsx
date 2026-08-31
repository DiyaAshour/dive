"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { guestDictionary } from "@/lib/guest-i18n";
import { localeFromLanguageTag, type GuestLocale } from "@/lib/guest-market";

type Props = Readonly<{locale: GuestLocale}>;

export function SignOutButton({locale}: Props) {
  const [effectiveLocale,setEffectiveLocale]=useState<GuestLocale>(locale);
  const [submitting, setSubmitting] = useState(false);
  const copy = guestDictionary(effectiveLocale);

  useEffect(()=>{
    setEffectiveLocale(localeFromLanguageTag(document.documentElement.lang)??locale);
  },[locale]);

  async function signOut() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/logout", {method: "POST"});
      if (!response.ok) throw new Error("Unable to sign out");
      window.location.assign("/");
    } catch {
      setSubmitting(false);
    }
  }

  return <button
    type="button"
    className="partnerEntry"
    onClick={signOut}
    disabled={submitting}
    title={copy.nav.signOut}
    style={{border: 0, background: "transparent"}}
  >
    <LogOut size={16}/>{submitting ? copy.nav.signingOut : copy.nav.signOut}
  </button>;
}
