import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { dictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { currentUser } from "@/lib/server-session";
import { CheckoutFlow } from "./checkout-flow";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({searchParams}:{searchParams:Promise<{hotelId?:string;roomTypeId?:string;ratePlanId?:string;arrival?:string;departure?:string}>}) {
  const [query,user,locale]=await Promise.all([searchParams,currentUser(),requestLocale()]);
  const copy=dictionary(locale);
  const complete=query.hotelId&&query.roomTypeId&&query.ratePlanId&&query.arrival&&query.departure;
  return <main className="checkoutExperience">
    <CustomerHeader minimal/>
    <section className="checkoutBanner"><div className="shell"><div><span className="eyebrow">{copy.checkout.secure}</span><h1>{copy.checkout.title}</h1><p>{copy.checkout.intro}</p></div><div className="checkoutTrust"><span><LockKeyhole size={18}/>{copy.checkout.session}</span><span><ShieldCheck size={18}/>{copy.checkout.terms}</span></div></div></section>
    <section className="shell checkoutSection">
      {complete?<CheckoutFlow locale={locale} hotelId={query.hotelId!} roomTypeId={query.roomTypeId!} ratePlanId={query.ratePlanId!} arrival={query.arrival!} departure={query.departure!} initialGuestName={user?.displayName??""} initialGuestEmail={user?.email??""}/>:<div className="premiumEmpty"><h3>{copy.checkout.selectionTitle}</h3><p>{copy.checkout.selectionBody}</p><Link href="/search" className="resultCta">{copy.checkout.back}</Link></div>}
    </section>
  </main>;
}
