import Link from "next/link";
import { discoverySearchSchema } from "@platform/contracts";
import { searchHotels } from "@platform/server";
import { defaultStayDates } from "@/lib/stay-dates";

type SearchParams = Record<string, string | string[] | undefined>;
const commonAmenities = [
  ["WIFI", "Wi-Fi"],
  ["PARKING", "Parking"],
  ["POOL", "Pool"],
  ["GYM", "Gym"],
  ["BREAKFAST", "Breakfast"],
] as const;

export default async function SearchPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const params = await searchParams;
  const defaults = defaultStayDates();
  const raw = {
    destination: first(params.destination) ?? "Amman",
    arrival: first(params.arrival) ?? defaults.arrival,
    departure: first(params.departure) ?? defaults.departure,
    adults: first(params.adults) ?? "2",
    children: first(params.children) ?? "0",
    minPrice: optional(first(params.minPrice)),
    maxPrice: optional(first(params.maxPrice)),
    stars: values(params.stars),
    amenities: values(params.amenities),
    freeCancellation: first(params.freeCancellation) === "true",
    paymentMode: optional(first(params.paymentMode)),
    sort: first(params.sort) ?? "RECOMMENDED",
  };
  const parsed = discoverySearchSchema.safeParse(raw);
  const data = parsed.success ? await searchHotels(parsed.data) : null;
  const selectedAmenities = new Set(raw.amenities.map((value) => value.toUpperCase()));

  return <main className="soft"><header className="shell topbar"><Link href="/" className="brand">B</Link><nav><Link href="/hotel-dashboard">Hotel dashboard</Link><Link href="/admin">Admin</Link></nav></header><section className="shell section">
    <form className="searchBox" style={{marginTop:0,marginBottom:24}} method="get" action="/search">
      <label className="field"><span>Destination</span><input name="destination" defaultValue={raw.destination} required/></label>
      <label className="field"><span>Arrival</span><input name="arrival" type="date" defaultValue={raw.arrival} required/></label>
      <label className="field"><span>Departure</span><input name="departure" type="date" defaultValue={raw.departure} required/></label>
      <label className="field"><span>Adults</span><input name="adults" type="number" min="1" max="20" defaultValue={raw.adults} required/></label>
      <label className="field"><span>Children</span><input name="children" type="number" min="0" max="20" defaultValue={raw.children} required/></label>
      <button className="primary" type="submit">Update search</button>
    </form>
    {!parsed.success && <div className="panel" style={{marginBottom:20}}><strong>Search details need attention</strong><p className="danger">{parsed.error.issues[0]?.message ?? "Invalid search"}</p></div>}
    <div className="results"><aside className="panel filters"><span className="eyebrow">Filters</span>
      <form method="get" action="/search" className="stackForm">
        <input type="hidden" name="destination" value={raw.destination}/><input type="hidden" name="arrival" value={raw.arrival}/><input type="hidden" name="departure" value={raw.departure}/><input type="hidden" name="adults" value={raw.adults}/><input type="hidden" name="children" value={raw.children}/>
        <label>Minimum nightly total<input name="minPrice" type="number" min="0" step="0.01" defaultValue={raw.minPrice}/></label>
        <label>Maximum nightly total<input name="maxPrice" type="number" min="0" step="0.01" defaultValue={raw.maxPrice}/></label>
        <label>Star rating<select name="stars" defaultValue={first(params.stars) ?? ""}><option value="">Any stars</option><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label>
        <label>Payment<select name="paymentMode" defaultValue={raw.paymentMode ?? ""}><option value="">Any payment mode</option><option value="PAY_AT_HOTEL">Pay at hotel</option><option value="PAY_NOW">Pay now</option></select></label>
        <label>Sort<select name="sort" defaultValue={raw.sort}><option value="RECOMMENDED">Recommended</option><option value="PRICE_ASC">Lowest price</option><option value="PRICE_DESC">Highest price</option><option value="STARS_DESC">Highest stars</option></select></label>
        <label className="inlineCheck"><input type="checkbox" name="freeCancellation" value="true" defaultChecked={raw.freeCancellation}/> Free cancellation now</label>
        <div><strong>Amenities</strong>{commonAmenities.map(([code,label])=><label className="inlineCheck" key={code}><input type="checkbox" name="amenities" value={code} defaultChecked={selectedAmenities.has(code)}/> {label}</label>)}</div>
        <button className="secondaryButton" type="submit">Apply filters</button>
      </form>
    </aside><div><div className="sectionHead"><div><span className="eyebrow">Live search results</span><h2>{raw.destination} · {data?.count ?? 0} properties</h2></div></div>
      {data && data.results.length === 0 && <div className="panel"><h3>No live offers match this stay</h3><p className="muted">Try different dates, guest counts, or remove one of the filters. Hotels without complete rates and inventory for every night are intentionally excluded.</p></div>}
      {data?.results.map((hotel)=><article className="resultCard" key={hotel.id}>
        {hotel.coverPhoto ? <img src={hotel.coverPhoto.url} alt={hotel.coverPhoto.alt ?? hotel.name}/> : <div style={{width:260,minHeight:220,display:"grid",placeItems:"center",background:"#eef1f4"}} className="muted">No property photo</div>}
        <div className="resultBody"><div><div className="meta">{hotel.starRating ? `${hotel.starRating}★ · ` : ""}{hotel.area ? `${hotel.area} · ` : ""}{hotel.city}</div><h2>{hotel.name}</h2><p className="muted">Verified hotel · live inventory for the full stay</p><div className="tags">{hotel.amenities.slice(0,4).map((amenity)=><span className="tag" key={amenity.code}>{amenity.name}</span>)}<span className="tag">{hotel.from.cancellationPolicy.name}</span>{hotel.from.paymentModes.map((mode)=><span className="tag" key={mode}>{mode === "PAY_AT_HOTEL" ? "Pay at hotel" : "Pay now"}</span>)}</div>{hotel.from.availableToSell <= 3 && <div className="danger">Only {hotel.from.availableToSell} room{hotel.from.availableToSell === 1 ? "" : "s"} left for these dates</div>}</div><div className="rightPrice"><span className="muted">Average nightly total · taxes & service included</span><strong>{hotel.from.averageNightlyTotal.toFixed(2)} {hotel.currency}</strong><small className="muted">Stay total {hotel.from.total.toFixed(2)} {hotel.currency}</small><Link href={hotelHref(hotel.id, parsed.success ? parsed.data : null)} className="primary">View live rooms</Link></div></div>
      </article>)}
    </div></div>
  </section></main>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function values(value: string | string[] | undefined): string[] {
  const items = value ? (Array.isArray(value) ? value : [value]) : [];
  return items.map((item) => item.trim()).filter(Boolean);
}

function optional(value: string | undefined): string | undefined {
  return value && value.trim() ? value : undefined;
}

function hotelHref(hotelId: string, input: {arrival: string; departure: string; adults: number; children: number} | null) {
  if (!input) return `/hotel/${hotelId}`;
  const query = new URLSearchParams({arrival: input.arrival, departure: input.departure, adults: String(input.adults), children: String(input.children)});
  return `/hotel/${hotelId}?${query.toString()}`;
}
