"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { authUiCopy } from "@/lib/auth-ui-copy";
import { guestDictionary } from "@/lib/guest-i18n";
import type { GuestLocale } from "@/lib/guest-market";

type Props = Readonly<{displayName:string;email:string;locale:GuestLocale}>;

export function ProfileForm({displayName:initialName,email,locale}: Props) {
  const router = useRouter();
  const copy = guestDictionary(locale);
  const fallbackError = authUiCopy(locale).unable;
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
      if(!response.ok) throw new Error(payload?.error?.message ?? fallbackError);
      setMessage(copy.profile.saved);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallbackError);
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
