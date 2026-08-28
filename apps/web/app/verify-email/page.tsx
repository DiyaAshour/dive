import { CustomerHeader } from "@/components/customer-header";
import { requestLocale } from "@/lib/request-locale";
import { VerifyEmailClient } from "./verify-email-client";

export default async function VerifyEmailPage({searchParams}:{searchParams:Promise<{token?:string}>}){const [locale,query]=await Promise.all([requestLocale(),searchParams]);const token=query.token?.trim()??"";return <main className="opsPublicPage"><CustomerHeader/><section className="opsAuthCard"><span className="eyebrow">{locale==="ar"?"أمان الحساب":"Account security"}</span><h1>{locale==="ar"?"تأكيد البريد الإلكتروني":"Verify email address"}</h1>{token?<VerifyEmailClient locale={locale} token={token}/>:<div className="opsNotice danger"><strong>{locale==="ar"?"الرابط غير صالح":"Invalid verification link"}</strong></div>}</section></main>}
