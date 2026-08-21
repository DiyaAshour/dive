import Link from "next/link";
import { hotels } from "@/lib/mock-data";
import { priceBreakdown } from "@/lib/pricing";

export default function HomePage() {
  return <main>
    <header className="shell topbar"><Link href="/" className="brand">B</Link><nav><Link href="/search">Search</Link><Link href="/hotel-dashboard">Hotel dashboard</Link><Link href="/admin">Admin</Link></nav></header>
    <section className="hero"><div className="shell heroInner"><span className="eyebrow">Stay smarter</span><h1>Book hotels with the final price visible from the start.</h1><p>Compare rooms, rate plans and cancellation terms in one place. No surprise taxes at checkout.</p><div className="searchBox"><div className="field"><span>Destination</span><strong>Amman, Jordan</strong></div><div className="field"><span>Dates</span><strong>25 Aug — 27 Aug</strong></div><div className="field"><span>Guests</span><strong>2 adults · 1 room</strong></div><Link href="/search" className="primary">Search</Link></div><div className="trust"><span>✓ Verified hotels</span><span>✓ Final price before payment</span><span>✓ Clear cancellation terms</span><span>✓ Booking support</span></div></div></section>
    <section className="shell section"><div className="sectionHead"><div><span className="eyebrow">Popular now</span><h2>Recommended stays</h2></div><Link href="/search">View all →</Link></div><div className="grid3">{hotels.map(h=>{const p=priceBreakdown(h.baseRate);return <Link className="card" href={`/hotel/${h.id}`} key={h.id}><img src={h.image} alt={h.name}/><div className="cardBody"><div className="meta">{h.stars}★ · {h.area} · {h.rating}/10</div><h3>{h.name}</h3><div className="muted">Verified property · {h.payment}</div><div className="price"><span className="muted">Final nightly price</span><b>{p.total.toFixed(2)} JOD</b></div></div></Link>})}</div></section>
  </main>;
}
