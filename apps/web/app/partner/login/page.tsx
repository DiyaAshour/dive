import Link from "next/link";
import { BarChart3, Hotel, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import AuthForm from "../../login/auth-form";

export default function PartnerLoginPage() {
  return <main className="partnerAuthPage">
    <header className="partnerAuthHeader"><div className="shell"><Brand inverse/><Link href="/">Back to HandMeKey</Link></div></header>
    <section className="shell partnerAuthShell">
      <div className="partnerAuthIntro"><span className="partnerEyebrow">Partner access</span><h1>Your property business, behind one secure door.</h1><p>Sign in to manage listings, live rates, reservations, guest communication and performance.</p><div className="partnerAuthBenefits"><div><Hotel size={20}/><span><strong>Property control</strong><small>Manage only the hotels your account is authorized to access.</small></span></div><div><BarChart3 size={20}/><span><strong>Commercial visibility</strong><small>See conversion, demand dates and active booked value.</small></span></div><div><ShieldCheck size={20}/><span><strong>Review-gated publishing</strong><small>No property goes live until the submitted revision is approved.</small></span></div></div><p className="partnerAuthSwitch">Booking a stay instead? <Link href="/login">Use traveler sign in →</Link></p></div>
      <AuthForm portal="partner"/>
    </section>
  </main>;
}
