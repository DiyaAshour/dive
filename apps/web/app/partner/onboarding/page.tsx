import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server-session";
import OnboardingForm from "./onboarding-form";

export default async function PartnerOnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <main className="softBg authPage"><header className="topbar shell"><Link href="/" className="brandMark">B</Link><nav><Link href="/hotel-dashboard">Hotel dashboard</Link></nav></header><section className="shell onboardingShell"><div><span className="eyebrow">Property onboarding</span><h1>Create the property as a draft first.</h1><p className="muted">Publishing is deliberately separate from creation. Verification, rooms, rate plans, policies, and inventory must be complete before a property can become ACTIVE.</p><div className="setupSteps"><span className="active">1 · Property</span><span>2 · Rooms</span><span>3 · Rate plans</span><span>4 · Calendar</span><span>5 · Review</span></div></div><OnboardingForm /></section></main>;
}
