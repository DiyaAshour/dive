import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, BellRing, MessagesSquare } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { currentUser } from "@/lib/server-session";
import AuthForm from "./auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect("/trips");

  return <main className="authPage customerAuthPage">
    <CustomerHeader minimal/>
    <section className="shell authShell premiumAuthShell">
      <div className="authIntro">
        <span className="eyebrow">Your stay, in one place</span>
        <h1>Book once. Keep every trip within reach.</h1>
        <p>Sign in to manage bookings, watch hotel prices and keep your conversation with the property attached to the stay.</p>
        <div className="authBenefits">
          <div><BadgeCheck size={20}/><span><strong>Verified bookings</strong><small>Access confirmed stays and cancellation terms.</small></span></div>
          <div><BellRing size={20}/><span><strong>Price alerts</strong><small>Track a stay and get notified when the live rate drops.</small></span></div>
          <div><MessagesSquare size={20}/><span><strong>Hotel messages</strong><small>Keep guest requests and property replies with the booking.</small></span></div>
        </div>
        <p className="partnerAuthPrompt">Managing a hotel? <Link href="/partner/login">Go to Partner Hub →</Link></p>
      </div>
      <AuthForm portal="guest"/>
    </section>
  </main>;
}
