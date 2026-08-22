import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account-shell";
import { dictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { currentUser } from "@/lib/server-session";
import { SecurityManager } from "./security-manager";

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/security");
  const locale = await requestLocale();
  const copy = dictionary(locale);
  return <AccountShell active="security" eyebrow={copy.security.eyebrow} title={copy.security.title} description={copy.security.body}>
    <SecurityManager locale={locale}/>
  </AccountShell>;
}
