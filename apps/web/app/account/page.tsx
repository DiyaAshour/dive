import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, KeyRound, Luggage, UserRound } from "lucide-react";
import { getAccountOverview, getAccountProfile } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { currentUser } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const [profile,overview] = await Promise.all([getAccountProfile(user.id), getAccountOverview(user.id)]);
  const firstName = profile.displayName.trim().split(/\s+/)[0] || "Traveler";

  return <AccountShell active="overview" eyebrow="Traveler account" title={`Welcome back, ${firstName}`} description="Your stays, price intelligence and account security in one place.">
    <div className="accountMetrics">
      <Metric value={overview.upcomingTrips} label="Upcoming trips" href="/trips"/>
      <Metric value={overview.activePriceWatches} label="Active price watches" href="/account/alerts"/>
      <Metric value={overview.unreadNotifications} label="Unread alerts" href="/account/alerts"/>
      <Metric value={overview.totalTrips} label="Trips on account" href="/trips"/>
    </div>

    <div className="accountGrid">
      <section className="accountCard accountIdentityCard">
        <div className="accountCardIcon"><UserRound size={20}/></div>
        <div><span className="accountCardLabel">Personal details</span><h2>{profile.displayName}</h2><p>{profile.email}</p><small>Member since {profile.createdAt.toLocaleDateString("en",{year:"numeric",month:"long"})}</small></div>
        <Link href="/account/profile">Edit profile →</Link>
      </section>
      <section className="accountCard">
        <div className="accountCardIcon"><KeyRound size={20}/></div>
        <div><span className="accountCardLabel">Security</span><h2>Password & sessions</h2><p>Change your password or close sessions you no longer use.</p></div>
        <Link href="/account/security">Review security →</Link>
      </section>
      <section className="accountCard">
        <div className="accountCardIcon"><Luggage size={20}/></div>
        <div><span className="accountCardLabel">Trips</span><h2>Manage every stay</h2><p>Open reservations, requests, hotel messages and cancellation terms.</p></div>
        <Link href="/trips">Open my trips →</Link>
      </section>
      <section className="accountCard">
        <div className="accountCardIcon"><Bell size={20}/></div>
        <div><span className="accountCardLabel">Price intelligence</span><h2>Watches & saved searches</h2><p>Track the same live prices and availability used by checkout.</p></div>
        <Link href="/account/alerts">Open alerts →</Link>
      </section>
    </div>
  </AccountShell>;
}

function Metric({value,label,href}:{value:number;label:string;href:string}) {
  return <Link className="accountMetric" href={href}><strong>{value}</strong><span>{label}</span></Link>;
}
