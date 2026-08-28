import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { guestDictionary } from "@/lib/guest-i18n";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { CheckoutFlow } from "./checkout-flow";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({searchParams}:{searchParams:Promise<{hotelId?:string;roomTypeId?:string;ratePlanId?:string;arrival?:string;departure?:string;adults?:string;children?:string}>}) {
  const [query,user,market]=await Promise.all([searchParams,currentUser(),requestGuestMarket()]);
  const copy=guestDictionary(market.locale);
  const complete=query.hotelId&&query.roomTypeId&&query.ratePlanId&&query.arrival&&query.departure;
  return <main className="checkoutExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader minimal/>
    <section className="checkoutBanner"><div className="shell"><div><span className="eyebrow">{copy.checkout.secure}</span><h1>{copy.checkout.title}</h1><p>{copy.checkout.intro}</p></div><div className="checkoutTrust"><span><LockKeyhole size={18}/>{copy.checkout.session}</span><span><ShieldCheck size={18}/>{copy.checkout.terms}</span></div></div></section>
    <section className="shell checkoutSection">
      {complete?<CheckoutFlow locale={market.locale} targetCurrency={market.currency} hotelId={query.hotelId!} roomTypeId={query.roomTypeId!} ratePlanId={query.ratePlanId!} arrival={query.arrival!} departure={query.departure!} adults={guestCount(query.adults,2,1)} children={guestCount(query.children,0,0)} initialGuestName={user?.displayName??""} initialGuestEmail={user?.email??""}/>:<div className="premiumEmpty"><h3>{copy.checkout.selectionTitle}</h3><p>{copy.checkout.selectionBody}</p><Link href="/search" className="resultCta">{copy.checkout.back}</Link></div>}
    </section>
  </main>;
}

function guestCount(value:string|undefined,fallback:number,min:number){const parsed=Number(value);return Number.isInteger(parsed)&&parsed>=min&&parsed<=20?parsed:fallback;}
