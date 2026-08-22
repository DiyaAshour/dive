import Link from "next/link";
import { listFeaturedHotels } from "@platform/server";
import { defaultStayDates } from "@/lib/stay-dates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const hotels = await listFeaturedHotels(6);
  const stay = defaultStayDates();
  return <main>
    <header className="shell topbar"><Link href="/" className="brand">B</Link><nav><Link href="/search">Search</Link><Link href="/trips">My trips</Link><Link href="/hotel-dashboard">Hotel dashboard</Link><Link href="/admin">Admin</Link></nav></header>
    <section className="hero"><div className="shell heroInner"><span className="eyebrow">Stay smarter</span><h1>Book hotels with the final price visible from the start.</h1><p>Search live hotel inventory, compare rate plans and see cancellation terms before creating a booking.</p>
      <form className="searchBox" action="/search" method="get">
        <label className="field"><span>Destination</span><input name="destination" defaultValue="Amman" required aria-label="Destination"/></label>
        <label className="field"><span>Arrival</span><input name="arrival" type="date" defaultValue={stay.arrival} required/></label>
        <label className="field"><span>Departure</span><input name="departure" type="date" defaultValue={stay.departure} required/></label>
        <label className="field"><span>Adults</span><input name="adults" type="number" min="1" max="20" defaultValue="2" required/></label>
        <input type="hidden" name="children" value="0"/>
        <button className="primary" type="submit">Search</button>
      </form>
      <div className="trust"><span>✓ Verified hotels only</span><span>✓ Live inventory</span><span>✓ Final price before payment</span><span>✓ Stored cancellation policies</span></div>
    </div></section>
    <section className="shell section"><div className="sectionHead"><div><span className="eyebrow">Published properties</span><h2>Verified stays</h2></div><Link href={`/search?destination=Amman&arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`}>Search live rates →</Link></div>
      {hotels.length === 0 ? <div className="panel"><h3>No verified properties are published yet</h3><p className="muted">Hotels appear here only after they are active and verified. Draft properties are never exposed to customers.</p></div> : <div className="grid3">{hotels.map((hotel)=><Link prefetch={false} className="card" href={`/hotel/${hotel.id}?arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`} key={hotel.id}>
        {hotel.coverPhoto ? <img src={hotel.coverPhoto.url} alt={hotel.coverPhoto.alt ?? hotel.name}/> : <div style={{height:200,display:"grid",placeItems:"center",background:"#eef1f4"}} className="muted">No property photo</div>}
        <div className="cardBody"><div className="meta">{hotel.starRating ? `${hotel.starRating}★ · ` : ""}{hotel.area ? `${hotel.area} · ` : ""}{hotel.city}</div><h3>{hotel.name}</h3><div className="muted">Verified property{hotel.amenities.length ? ` · ${hotel.amenities.slice(0,3).map((item)=>item.name).join(" · ")}` : ""}</div><div className="price"><span className="muted">Rates and availability</span><b>Check live stay</b></div></div>
      </Link>)}</div>}
    </section>
  </main>;
}