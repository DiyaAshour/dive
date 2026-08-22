"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, KeyRound, LogOut, ShieldCheck } from "lucide-react";

type SessionView = {id:string;current:boolean;createdAt:string;lastUsedAt:string;expiresAt:string};

export function SecurityManager() {
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
    } catch (cause) { setError(messageFrom(cause)); }
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
      setMessage("Password changed. Your previous sessions were closed and this session was securely rotated.");
      await loadSessions();
    } catch (cause) { setError(messageFrom(cause)); }
    finally { setPasswordBusy(false); }
  }

  async function revokeSession(id:string) {
    setBusySession(id); setMessage(null); setError(null);
    try {
      await requestJson(`/api/v1/me/sessions/${id}`,{method:"DELETE"});
      setSessions((items)=>items.filter((item)=>item.id!==id));
      setMessage("Session closed.");
    } catch (cause) { setError(messageFrom(cause)); }
    finally { setBusySession(null); }
  }

  async function revokeOthers() {
    setBusySession("others"); setMessage(null); setError(null);
    try {
      const result = await requestJson<{revoked:number}>("/api/v1/me/sessions/revoke-others",{method:"POST"});
      setSessions((items)=>items.filter((item)=>item.current));
      setMessage(result.revoked ? `${result.revoked} other session${result.revoked===1?"":"s"} closed.` : "No other sessions were active.");
    } catch (cause) { setError(messageFrom(cause)); }
    finally { setBusySession(null); }
  }

  return <div className="securityGrid">
    <section className="accountFormCard">
      <div className="securityHeading"><span><KeyRound size={19}/></span><div><h2>Change password</h2><p>A password change closes every existing session and issues a fresh session for this browser.</p></div></div>
      <form className="securityPasswordForm" onSubmit={changePassword}>
        <label>Current password<input name="currentPassword" type="password" minLength={10} maxLength={128} autoComplete="current-password" required/></label>
        <label>New password<input name="newPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/><small>Use at least 12 characters.</small></label>
        <button className="primaryButton" disabled={passwordBusy}>{passwordBusy?"Updating…":"Update password"}</button>
      </form>
    </section>

    <section className="accountFormCard">
      <div className="securityHeading"><span><ShieldCheck size={19}/></span><div><h2>Active sessions</h2><p>HandMeKey stores opaque server sessions. You can close sessions you no longer trust without exposing session tokens to the browser.</p></div></div>
      {loadingSessions?<p className="muted">Checking active sessions…</p>:<div className="sessionList">
        {sessions.map((session)=><article className="sessionRow" key={session.id}>
          <div><strong>{session.current?"This browser":"Another active session"}</strong><span>{session.current&&<em><CheckCircle2 size={13}/> Current</em>}</span><small>Last active {formatTime(session.lastUsedAt)} · Created {formatDate(session.createdAt)} · Expires {formatDate(session.expiresAt)}</small></div>
          {!session.current&&<button className="sessionRevoke" disabled={busySession===session.id} onClick={()=>void revokeSession(session.id)}><LogOut size={15}/>{busySession===session.id?"Closing…":"Close"}</button>}
        </article>)}
        {!sessions.length&&<p className="muted">No active sessions found.</p>}
      </div>}
      <button className="secondaryButton revokeOthers" disabled={busySession!==null || sessions.filter((item)=>!item.current).length===0} onClick={()=>void revokeOthers()}>Sign out other sessions</button>
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
function messageFrom(value:unknown){return value instanceof Error?value.message:"An unexpected error occurred";}
function formatDate(value:string){return new Date(value).toLocaleDateString("en",{year:"numeric",month:"short",day:"numeric"});}
function formatTime(value:string){return new Date(value).toLocaleString("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
