"use client";

import {useState} from "react";
import type {FormEvent} from "react";
import {KeyRound, LockKeyhole} from "lucide-react";

export default function AdminLoginForm({nextPath}: Readonly<{nextPath: string}>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/auth/admin-login", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({email: form.get("email"), password: form.get("password")}),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "Administrator sign-in failed");
      window.location.assign(nextPath);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Administrator sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return <form className="adminLoginCard" onSubmit={submit}>
    <div className="adminLoginIcon"><LockKeyhole size={22}/></div>
    <span className="eyebrow">Restricted access</span>
    <h2>Administrator sign in</h2>
    <p>Use a provisioned HandMeKey platform-administrator account. Public registration is disabled.</p>
    <label>Email address<input name="email" type="email" autoComplete="username" required/></label>
    <label>Password<input name="password" type="password" minLength={10} maxLength={128} autoComplete="current-password" required/></label>
    {error && <div className="formError" role="alert">{error}</div>}
    <button className="adminLoginSubmit" disabled={busy}><KeyRound size={17}/>{busy ? "Verifying access…" : "Enter Control Center"}</button>
    <small>Admin sessions expire independently and never reuse the traveler session cookie.</small>
  </form>;
}
