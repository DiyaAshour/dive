import Link from "next/link";
import { CheckoutFlow } from "./checkout-flow";

export default async function CheckoutPage({searchParams}:{searchParams:Promise<{hotelId?:string;roomTypeId?:string;ratePlanId?:string;arrival?:string;departure?:string}>}) {
  const query = await searchParams;
  const complete = query.hotelId && query.roomTypeId && query.ratePlanId && query.arrival && query.departure;
  return <main className="soft">
    <header className="shell topbar"><Link href="/" className="brand">B</Link><nav><Link href="/search">Back to search</Link></nav></header>
    <section className="shell section">
      <div className="sectionHead"><div><span className="eyebrow">Secure checkout</span><h2>Review the live rate before booking</h2></div></div>
      {complete ? <CheckoutFlow hotelId={query.hotelId!} roomTypeId={query.roomTypeId!} ratePlanId={query.ratePlanId!} arrival={query.arrival!} departure={query.departure!}/> : <div className="panel"><h3>A live rate selection is required</h3><p className="muted">Checkout now accepts database-backed hotel, room type and rate plan IDs plus arrival/departure dates. The legacy demo checkout has been removed rather than kept as a hidden fallback.</p><Link href="/search" className="primary" style={{display:"inline-block",marginTop:12}}>Return to search</Link></div>}
    </section>
  </main>;
}
