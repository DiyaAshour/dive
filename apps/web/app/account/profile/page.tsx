import { redirect } from "next/navigation";
import { getAccountProfile } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { guestDictionary } from "@/lib/guest-i18n";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/profile");
  const [profile,market] = await Promise.all([getAccountProfile(user.id), requestGuestMarket()]);
  const copy = guestDictionary(market.locale);
  return <AccountShell active="profile" eyebrow={copy.profile.eyebrow} title={copy.profile.title} description={copy.profile.body}>
    <ProfileForm displayName={profile.displayName} email={profile.email} locale={market.locale}/>
  </AccountShell>;
}
