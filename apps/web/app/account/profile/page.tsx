import { redirect } from "next/navigation";
import { getAccountProfile } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { dictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { currentUser } from "@/lib/server-session";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/profile");
  const [profile,locale] = await Promise.all([getAccountProfile(user.id), requestLocale()]);
  const copy = dictionary(locale);
  return <AccountShell active="profile" eyebrow={copy.profile.eyebrow} title={copy.profile.title} description={copy.profile.body}>
    <ProfileForm displayName={profile.displayName} email={profile.email} locale={locale}/>
  </AccountShell>;
}
