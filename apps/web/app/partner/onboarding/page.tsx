import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { currentUser } from "@/lib/server-session";
import OnboardingForm from "./onboarding-form";

export default async function PartnerOnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/partner/login");
  return <main className="partnerOnboardingPage">
    <header className="partnerOnboardingHeader"><div className="shell"><Brand inverse/><div><span>Partner onboarding</span><Link href="/hotel-dashboard">Open Partner Hub</Link></div></div></header>
    <section className="shell partnerOnboardingShell">
      <div className="partnerOnboardingIntro"><span className="partnerEyebrow">Step 1 of your property setup</span><h1>Start with the property. Build the listing around it.</h1><p>Create the hotel workspace first. HandMeKey will keep it private as a draft while you add the content and commercial setup required for review.</p><div className="onboardingPromise"><div><CheckCircle2 size={19}/><span><strong>Draft by default</strong><small>Creating the property never publishes it.</small></span></div><div><CheckCircle2 size={19}/><span><strong>One source of truth</strong><small>Rooms, rates, policies and inventory attach to this property workspace.</small></span></div><div><CheckCircle2 size={19}/><span><strong>Review before go-live</strong><small>The exact submitted revision must pass platform verification.</small></span></div></div><div className="partnerSetupRail"><span className="active"><b>01</b>Property</span><span><b>02</b>Content & media</span><span><b>03</b>Rooms & rates</span><span><b>04</b>Availability</span><span><b>05</b>Verification</span></div></div>
      <OnboardingForm />
    </section>
  </main>;
}
