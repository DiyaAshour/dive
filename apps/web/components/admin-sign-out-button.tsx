"use client";

import {useState} from "react";
import {LogOut} from "lucide-react";

export function AdminSignOutButton() {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/v1/auth/admin-logout", {method: "POST"});
    } finally {
      window.location.assign("/admin/login");
    }
  }
  return <button className="adminSignOut" type="button" disabled={busy} onClick={signOut}><LogOut size={15}/>{busy ? "Signing out…" : "Sign out"}</button>;
}
