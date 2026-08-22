import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account-shell";
import { currentUser } from "@/lib/server-session";
import { SecurityManager } from "./security-manager";

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/security");
  return <AccountShell active="security" eyebrow="Account security" title="Password & sessions" description="Protect access to every reservation linked to your account.">
    <SecurityManager/>
  </AccountShell>;
}
