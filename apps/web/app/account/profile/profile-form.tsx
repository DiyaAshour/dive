"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { dictionary, type Locale } from "@/lib/i18n";

type Props = Readonly<{displayName:string;email:string;locale:Locale}>;

export function ProfileForm({displayName:initialName,email,locale}: Props) {
  const router = useRouter();
  const copy = dictionary(locale);
  const [displayName,setDisplayName] = useState(initialName);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState<string|null>(null);
  const [error,setError] = useState<string|null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/v1/me/profile",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({displayName})});
      const payload = await response.json().catch(()=>null);
      if(!response.ok) throw new Error(payload?.error?.message ?? (locale === "ar" ? "تعذر حفظ الملف الشخصي" : "Unable to save profile"));
      setMessage(copy.profile.saved);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (locale === "ar" ? "تعذر حفظ الملف الشخصي" : "Unable to save profile"));
    } finally { setSaving(false); }
  }

  return <form className="accountFormCard" onSubmit={save}>
    <div className="accountFormSection">
      <label>{copy.profile.fullName}<input value={displayName} onChange={(event)=>setDisplayName(event.target.value)} minLength={2} maxLength={100} autoComplete="name" required/></label>
      <label>{copy.profile.email}<input value={email} type="email" readOnly aria-readonly="true"/></label>
    </div>
    <div className="accountInfoNote"><strong>{copy.profile.protected}</strong><p>{copy.profile.protectedBody}</p></div>
    <div className="accountInfoNote"><strong>{copy.profile.smart}</strong><p>{copy.profile.smartBody}</p></div>
    {message&&<p className="accountSuccess">{message}</p>}
    {error&&<p className="formError">{error}</p>}
    <div className="accountFormActions"><button className="primaryButton" disabled={saving}>{saving?copy.profile.saving:copy.profile.save}</button></div>
  </form>;
}
