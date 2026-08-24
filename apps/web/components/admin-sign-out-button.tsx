"use client";

import {useState} from "react";
import {LogOut} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import {portalDictionary} from "@/lib/portal-i18n";

export function AdminSignOutButton({locale}: Readonly<{locale: Locale}>) {
  const [busy, setBusy] = useState(false);
  const copy = portalDictionary(locale).common;
  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/v1/auth/admin-logout", {method: "POST"});
    } finally {
      window.location.assign("/admin/login");
    }
  }
  return <button className="adminSignOut" type="button" disabled={busy} onClick={signOut}><LogOut size={15}/>{busy ? copy.signingOut : copy.signOut}</button>;
}
