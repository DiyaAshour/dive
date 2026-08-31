"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { guestDictionary } from "@/lib/guest-i18n";
import { guestIntlLocale, type GuestLocale } from "@/lib/guest-market";
import { securityUiCopy } from "@/lib/security-ui-copy";

type SessionView = {id:string;scope:"STANDARD"|"ADMIN";current:boolean;createdAt:string;lastUsedAt:string;expiresAt:string};
type Props = Readonly<{locale: GuestLocale}>;

export function SecurityManager({locale}: Props) {
  const copy = guestDictionary(locale);
  const ui = securityUiCopy(locale);
  const [sessions,setSessions] = useState<SessionView[]>([]);
  const [loadingSessions,setLoadingSessions] = useState(true);
  const [busySession,setBusySession] = useState<string|null>(null);
  const [passwordBusy,setPasswordBusy] = useState(false);
  const [message,setMessage] = useState<string|null>(null);
  const [error,setError] = useState<string|null>(null);

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const data = await requestJson<SessionView[]>("/api/v1/me/sessions");
      setSessions(data);
    } catch (cause) { setError(messageFrom(cause,locale)); }
    finally { setLoadingSessions(false); }
  }

  useEffect(()=>{void loadSessions();},[]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPasswordBusy(true); setMessage(null); setError(null);
    try {
      await requestJson("/api/v1/me/security/password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currentPassword:form.get("currentPassword"),newPassword:form.get("newPassword")})});
      event.currentTarget.reset();
      setMessage(copy.security.changed);
      await loadSessions();
    } catch (cause) { setError(messageFrom(cause,locale)); }
    finally { setPasswordBusy(false); }
  }

  async function revokeSession(id:string) {
    setBusySession(id); setMessage(null); setError(null);
    try {
      await requestJson(`/api/v1/me/sessions/${id}`,{method:"DELETE"});
      setSessions((items)=>items.filter((item)=>item.id!==id));
      setMessage(copy.security.closed);
    } catch (cause) { setError(messageFrom(cause,locale)); }
    finally { setBusySession(null); }
  }

  async function revokeOthers() {
    setBusySession("others"); setMessage(null); setError(null);
    try {
      const result = await requestJson<{revoked:number}>("/api/v1/me/sessions/revoke-others",{method:"POST"});
      setSessions((items)=>items.filter((item)=>item.current));
      setMessage(result.revoked ? ui.closedSessions(result.revoked) : copy.security.noOthers);
    } catch (cause) { setError(messageFrom(cause,locale)); }
    finally { setBusySession(null); }
  }

  return <div className="securityGrid">
    <section className="accountFormCard">
      <div className="securityHeading"><span><KeyRound size={19}/></span><div><h2>{copy.security.change}</h2><p>{copy.security.changeBody}</p></div></div>
      <form className="securityPasswordForm" onSubmit={changePassword}>
        <label>{copy.security.currentPassword}<input name="currentPassword" type="password" minLength={10} maxLength={128} autoComplete="current-password" required/></label>
        <label>{copy.security.newPassword}<input name="newPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/><small>{copy.security.hint}</small></label>
        <button className="primaryButton" disabled={passwordBusy}>{passwordBusy?copy.security.updating:copy.security.update}</button>
      </form>
    </section>

    <section className="accountFormCard">
      <div className="securityHeading"><span><ShieldCheck size={19}/></span><div><h2>{copy.security.sessions}</h2><p>{copy.security.sessionsBody}</p></div></div>
      {loadingSessions?<p className="muted">{copy.security.checking}</p>:<div className="sessionList">
        {sessions.map((session)=><article className="sessionRow" key={session.id}>
          <div><strong>{session.current?copy.security.thisBrowser:session.scope==="ADMIN"?ui.adminSession:copy.security.other}</strong><span>{session.current&&<em><CheckCircle2 size={13}/> {copy.security.current}</em>}</span><small>{copy.security.lastActive} {formatTime(session.lastUsedAt,locale)} · {copy.security.created} {formatDate(session.createdAt,locale)} · {copy.security.expires} {formatDate(session.expiresAt,locale)}</small></div>
          {!session.current&&<button className="sessionRevoke" disabled={busySession===session.id} onClick={()=>void revokeSession(session.id)}><LogOut size={15}/>{busySession===session.id?copy.security.closing:copy.security.close}</button>}
        </article>)}
        {!sessions.length&&<p className="muted">{copy.security.none}</p>}
      </div>}
      <button className="secondaryButton revokeOthers" disabled={busySession!==null || sessions.filter((item)=>!item.current).length===0} onClick={()=>void revokeOthers()}>{copy.security.signOutOthers}</button>
    </section>

    {(message||error)&&<div className={error?"securityNotice error":"securityNotice"}>{error??message}</div>}
  </div>;
}

async function requestJson<T=unknown>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,init);
  const payload=await response.json().catch(()=>null) as {data?:T;error?:{message?:string}}|null;
  if(!response.ok||!payload||payload.error)throw new Error(payload?.error?.message||`Request failed (${response.status})`);
  return payload.data as T;
}
function messageFrom(value:unknown,locale:GuestLocale){return value instanceof Error?value.message:securityUiCopy(locale).unexpected;}
function formatDate(value:string,locale:GuestLocale){return new Date(value).toLocaleDateString(guestIntlLocale(locale),{year:"numeric",month:"short",day:"numeric"});}
function formatTime(value:string,locale:GuestLocale){return new Date(value).toLocaleString(guestIntlLocale(locale),{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
