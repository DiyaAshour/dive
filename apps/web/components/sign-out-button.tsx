"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { dictionary, type Locale } from "@/lib/i18n";

type Props = Readonly<{locale: Locale}>;

export function SignOutButton({locale}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const copy = dictionary(locale);

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
