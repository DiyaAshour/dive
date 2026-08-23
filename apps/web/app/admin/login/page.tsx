import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {Activity, BadgeCheck, ShieldCheck} from "lucide-react";
import {Brand} from "@/components/brand";
import {currentAdminPrincipal} from "@/lib/server-session";
import AdminLoginForm from "./admin-login-form";

export const metadata: Metadata = {title: "Administrator sign in"};
export const dynamic = "force-dynamic";

function safeNext(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  const isAdminPath = candidate === "/admin" || candidate?.startsWith("/admin/");
  return candidate && isAdminPath && !candidate.startsWith("/admin/login") ? candidate : "/admin";
}

export default async function AdminLoginPage({searchParams}: {searchParams: Promise<{next?: string | string[]}>}) {
  const nextPath = safeNext((await searchParams).next);
  if (await currentAdminPrincipal()) redirect(nextPath);
  return <main className="adminLoginPage" dir="ltr">
    <header className="adminLoginHeader"><div className="shell"><Brand inverse/><Link href="/">Return to marketplace</Link></div></header>
    <section className="shell adminLoginShell">
      <div className="adminLoginIntro">
        <span className="adminPortalLabel">HandMeKey Control Center</span>
        <h1>One secure door for platform decisions.</h1>
        <p>Property publishing, private verification documents and sensitive platform actions stay behind an administrator-scoped session.</p>
        <div className="adminLoginAssurances">
          <div><ShieldCheck/><span><strong>Separate session scope</strong><small>A traveler login cannot authorize an administrator endpoint.</small></span></div>
          <div><Activity/><span><strong>Audited actions</strong><small>Publishing and access decisions remain attributable.</small></span></div>
          <div><BadgeCheck/><span><strong>No public admin registration</strong><small>The first administrator is provisioned once by an operator.</small></span></div>
        </div>
      </div>
      <AdminLoginForm nextPath={nextPath}/>
    </section>
  </main>;
}
