import Link from "next/link";
import { CustomerHeader } from "@/components/customer-header";
import { requestLocale } from "@/lib/request-locale";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage(){const locale=await requestLocale();return <main className="opsPublicPage"><CustomerHeader/><section className="opsAuthCard"><span className="eyebrow">{locale==="ar"?"أمان الحساب":"Account security"}</span><h1>{locale==="ar"?"استعادة كلمة المرور":"Reset your password"}</h1><p>{locale==="ar"?"أدخل البريد المرتبط بحسابك. رابط الاستعادة مؤقت ولا يكشف وجود الحساب.":"Enter the email used for your account. Reset links are short-lived and the response never exposes whether an account exists."}</p><ForgotPasswordForm locale={locale}/><Link className="opsBackLink" href="/login">{locale==="ar"?"العودة لتسجيل الدخول":"Back to sign in"}</Link></section></main>}
