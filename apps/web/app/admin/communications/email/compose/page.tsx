import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft, MailPlus, ShieldCheck} from "lucide-react";
import {getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {EmailComposer} from "../email-composer";

export const metadata: Metadata = {title:"Compose email"};
export const dynamic = "force-dynamic";

export default async function AdminComposeEmailPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fcommunications%2Femail%2Fcompose");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const counts = await getAdminNavigationCounts(principal.user.id);
  return <AdminShell locale={locale} principal={principal} active="email" counts={counts}>
    <header className="adminTopbar emailComposeTopbar">
      <div>
        <Link className="emailBackLink" href="/admin/communications/email"><ArrowLeft size={16}/>{ar ? "العودة لمركز البريد" : "Back to email center"}</Link>
        <span className="eyebrow">{ar ? "مركز الاتصالات" : "Communications center"}</span>
        <h1>{ar ? "رسالة جديدة" : "New email"}</h1>
        <p>{ar ? "أرسل لأي بريد من HandMeKey، استخدم قالباً جاهزاً أو اكتب رسالة مخصصة، وبعدها تابع الردود كسلسلة محادثة واحدة." : "Send from HandMeKey to any email address, start from a ready template or write your own message, then continue replies as one conversation thread."}</p>
      </div>
      <div className="emailComposeTrust"><MailPlus size={22}/><span><strong>{ar ? "إرسال تشغيلي من HandMeKey" : "HandMeKey operator mail"}</strong><small><ShieldCheck size={14}/>{ar ? "لا ترسل كلمات مرور أو بيانات بطاقات" : "Never request passwords or card data"}</small></span></div>
    </header>
    <section className="adminPanel emailComposePanel"><EmailComposer locale={locale}/></section>
  </AdminShell>;
}
