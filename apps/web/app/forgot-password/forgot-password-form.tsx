"use client";
import { useState } from "react";

export function ForgotPasswordForm({locale}:{locale:"en"|"ar"}) {
  const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [done,setDone]=useState(false);const [error,setError]=useState("");
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError("");try{const response=await fetch("/api/v1/auth/password/forgot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email})});if(!response.ok)throw new Error(locale==="ar"?"تعذر إرسال الطلب. تأكد من البريد وحاول مرة أخرى.":"Could not submit the request. Check the email and try again.");setDone(true);}catch(error){setError(error instanceof Error?error.message:"Request failed");}finally{setBusy(false);}}
  if(done)return <div className="opsNotice success"><strong>{locale==="ar"?"تحقق من بريدك":"Check your email"}</strong><p>{locale==="ar"?"إذا كان هناك حساب بهذا البريد، أرسلنا رابطاً صالحاً لمدة 30 دقيقة. لا نكشف ما إذا كان البريد مسجلاً أم لا.":"If an account exists for that email, a 30-minute reset link has been sent. HandMeKey does not reveal whether an address is registered."}</p></div>;
  return <form className="opsForm" onSubmit={submit}><label><span>{locale==="ar"?"البريد الإلكتروني":"Email address"}</span><input type="email" required autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)}/></label>{error&&<p className="opsError">{error}</p>}<button type="submit" disabled={busy}>{busy?(locale==="ar"?"جارٍ الإرسال…":"Sending…"):(locale==="ar"?"أرسل رابط الاستعادة":"Send reset link")}</button></form>;
}
