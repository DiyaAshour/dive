"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

export function SignOutButton() {
  const [submitting, setSubmitting] = useState(false);

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
    title="Sign out"
    style={{border: 0, background: "transparent"}}
  >
    <LogOut size={16}/>{submitting ? "Signing out…" : "Sign out"}
  </button>;
}
