import { redirect } from "next/navigation";
import { getAccountProfile } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { currentUser } from "@/lib/server-session";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/profile");
  const profile = await getAccountProfile(user.id);
  return <AccountShell active="profile" eyebrow="Personal details" title="Your traveler profile" description="Keep the identity HandMeKey uses around your booking journey clear and consistent.">
    <ProfileForm displayName={profile.displayName} email={profile.email}/>
  </AccountShell>;
}
