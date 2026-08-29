"use client";

import {useState} from "react";
import type {FormEvent} from "react";
import {KeyRound, LockKeyhole} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import {portalDictionary} from "@/lib/portal-i18n";

export default function AdminLoginForm({nextPath, locale}: Readonly<{nextPath: string; locale: Locale}>) {
  const copy = portalDictionary(locale).admin;
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
      if (!response.ok) {
        const code = payload?.error?.code;
        const message = locale === "ar" && code === "INVALID_ADMIN_CREDENTIALS"
          ? "بيانات دخول المدير غير صحيحة"
          : locale === "ar" && code === "ADMIN_DATABASE_NOT_READY"
            ? "قاعدة بيانات لوحة التحكم المحلية غير جاهزة. شغّل ملف repair-local-admin.ps1 ثم حاول مرة أخرى."
            : payload?.error?.message ?? copy.invalidCredentials;
        throw new Error(message);
      }
      window.location.assign(nextPath);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.invalidCredentials);
    } finally {
      setBusy(false);
    }
  }

  return <form className="adminLoginCard" onSubmit={submit}>
    <div className="adminLoginIcon"><LockKeyhole size={22}/></div>
    <span className="eyebrow">{copy.restricted}</span>
    <h2>{copy.signIn}</h2>
    <p>{copy.loginIntro}</p>
    <label>{copy.email}<input name="email" type="email" autoComplete="username" required/></label>
    <label>{copy.password}<input name="password" type="password" minLength={10} maxLength={128} autoComplete="current-password" required/></label>
    {error && <div className="formError" role="alert">{error}</div>}
    <button className="adminLoginSubmit" disabled={busy}><KeyRound size={17}/>{busy ? copy.verifying : copy.enter}</button>
    <small>{copy.sessionNote}</small>
  </form>;
}
