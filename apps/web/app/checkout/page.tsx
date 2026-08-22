import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { CheckoutFlow } from "./checkout-flow";

export default async function CheckoutPage({searchParams}:{searchParams:Promise<{hotelId?:string;roomTypeId?:string;ratePlanId?:string;arrival?:string;departure?:string}>}) {
  const query=await searchParams;
  const complete=query.hotelId&&query.roomTypeId&&query.ratePlanId&&query.arrival&&query.departure;
  return <main className="checkoutExperience">
    <CustomerHeader minimal/>
    <section className="checkoutBanner"><div className="shell"><div><span className="eyebrow">Secure booking</span><h1>Review the live rate before you confirm.</h1><p>The total, payment mode and cancellation policy come from the same booking engine that creates your reservation.</p></div><div className="checkoutTrust"><span><LockKeyhole size={18}/>Secure account session</span><span><ShieldCheck size={18}/>Stored booking terms</span></div></div></section>
    <section className="shell checkoutSection">
      {complete?<CheckoutFlow hotelId={query.hotelId!} roomTypeId={query.roomTypeId!} ratePlanId={query.ratePlanId!} arrival={query.arrival!} departure={query.departure!}/>:<div className="premiumEmpty"><h3>A live room selection is required</h3><p>Choose a hotel, room and rate plan before opening checkout. HandMeKey does not keep a hidden demo checkout fallback.</p><Link href="/search" className="resultCta">Return to search</Link></div>}
    </section>
  </main>;
}
