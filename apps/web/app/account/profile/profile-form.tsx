"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type Props = Readonly<{displayName:string;email:string}>;

export function ProfileForm({displayName:initialName,email}: Props) {
  const router = useRouter();
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
      if(!response.ok) throw new Error(payload?.error?.message ?? "Unable to save profile");
      setMessage("Personal details saved.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save profile");
    } finally { setSaving(false); }
  }

  return <form className="accountFormCard" onSubmit={save}>
    <div className="accountFormSection">
      <label>Full name<input value={displayName} onChange={(event)=>setDisplayName(event.target.value)} minLength={2} maxLength={100} autoComplete="name" required/></label>
      <label>Sign-in email<input value={email} type="email" readOnly aria-readonly="true"/></label>
    </div>
    <div className="accountInfoNote"><strong>Email is protected.</strong><p>HandMeKey will only allow email changes after a verified-email delivery flow is connected. We do not silently replace the identity used to access bookings.</p></div>
    <div className="accountInfoNote"><strong>Smarter checkout.</strong><p>Your account name and sign-in email are now prefilled when you book while signed in, but you can still change the guest name on an individual reservation.</p></div>
    {message&&<p className="accountSuccess">{message}</p>}
    {error&&<p className="formError">{error}</p>}
    <div className="accountFormActions"><button className="primaryButton" disabled={saving}>{saving?"Saving…":"Save changes"}</button></div>
  </form>;
}
