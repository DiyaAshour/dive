import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account-shell";
import { guestDictionary } from "@/lib/guest-i18n";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { SecurityManager } from "./security-manager";
import { EmailVerificationControl } from "./email-verification-control";

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/security");
  const market = await requestGuestMarket();
  const copy = guestDictionary(market.locale);
  return <AccountShell active="security" eyebrow={copy.security.eyebrow} title={copy.security.title} description={copy.security.body}>
    <EmailVerificationControl locale={market.locale}/>
    <SecurityManager locale={market.locale}/>
  </AccountShell>;
}
