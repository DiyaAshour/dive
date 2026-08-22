import Link from "next/link";
import { publicStaySchema } from "@platform/contracts";
import { getPublicHotelDetails, getPublicHotelReviews } from "@platform/server";
import { defaultStayDates } from "@/lib/stay-dates";
import { PriceWatch } from "./price-watch";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HotelPage({params, searchParams}: {params: Promise<{id:string}>; searchParams: Promise<SearchParams>}) {
  const {id} = await params;
  const query = await searchParams;
  const defaults = defaultStayDates();
  const parsed = publicStaySchema.safeParse({
    arrival: first(query.arrival) ?? defaults.arrival,
    departure: first(query.departure) ?? defaults.departure,
    adults: first(query.adults) ?? "2",
    children: first(query.children) ?? "0",
  });
  const stay = parsed.success ? parsed.data : {arrival: defaults.arrival, departure: defaults.departure, adults: 2, children: 0};
  const [hotel, reviewData] = await Promise.all([getPublicHotelDetails(id, stay), getPublicHotelReviews(id, 6)]);
  const cheapest = hotel.offers[0] ?? null;
  return <main><header className="shell topbar"><Link href="/" className="brand">B</Link><nav><Link href={`/search?destination=${encodeURIComponent(hotel.city)}&arrival=${stay.arrival}&departure=${stay.departure}&adults=${stay.adults}&children=${stay.children}`}>Back to search</Link><Link href="/trips">My trips</Link><Link href="/account/alerts">Alerts</Link><Link href="/hotel-dashboard">Hotel dashboard</Link></nav></header><section className="shell section">
    <div className="hotelHead"><div><span className="eyebrow">Verified property</span><h1>{hotel.name}</h1><div className="muted">{hotel.starRating ? `${hotel.starRating}★ · ` : ""}{hotel.area ? `${hotel.area}, ` : ""}{hotel.city} · {hotel.countryCode}</div><div className="muted">{hotel.address}</div>{hotel.reviewSummary.overall !== null && <div style={{marginTop:10}}><strong>{hotel.reviewSummary.overall.toFixed(1)}/10</strong> <span className="muted">from {hotel.reviewSummary.count} verified stay review{hotel.reviewSummary.count === 1 ? "" : "s"}</span></div>}</div><div>{hotel.checkInTime && <div><strong>Check-in</strong><div className="muted">{hotel.checkInTime}</div></div>}{hotel.checkOutTime && <div style={{marginTop:8}}><strong>Check-out</strong><div className="muted">{hotel.checkOutTime}</div></div>}</div></div>
    {hotel.photos.length ? <div className="gallery">{hotel.photos.slice(0,3).map((photo)=><img key={`${photo.url}-${photo.sortOrder}`} src={photo.url} alt={photo.alt ?? hotel.name}/>)}</div> : <div className="panel" style={{height:240,display:"grid",placeItems:"center"}}><span className="muted">This property has not published photos yet.</span></div>}
    <div className="trust"><span>✓ Hotel verified</span><span>✓ Live inventory</span><span>✓ Final price before booking</span><span>✓ Reviews require a verified stay</span></div>
    {hotel.description && <div className="panel" style={{marginTop:28}}><span className="eyebrow">About the property</span><p style={{whiteSpace:"pre-wrap"}}>{hotel.description}</p></div>}
    <div className="panel" style={{marginTop:20}}><span className="eyebrow">Facilities</span>{hotel.amenities.length ? <div className="tags" style={{marginTop:12}}>{hotel.amenities.map((amenity)=><span className="tag" key={amenity.code}>{amenity.name}</span>)}</div> : <p className="muted">No facilities have been published yet.</p>}{hotel.location && <p className="muted" style={{marginTop:14}}>Location coordinates: {hotel.location.latitude.toFixed(5)}, {hotel.location.longitude.toFixed(5)}</p>}</div>
    <form className="searchBox" style={{marginTop:28}} method="get">
      <label className="field"><span>Arrival</span><input name="arrival" type="date" defaultValue={stay.arrival} required/></label><label className="field"><span>Departure</span><input name="departure" type="date" defaultValue={stay.departure} required/></label><label className="field"><span>Adults</span><input name="adults" type="number" min="1" max="20" defaultValue={stay.adults}/></label><label className="field"><span>Children</span><input name="children" type="number" min="0" max="20" defaultValue={stay.children}/></label><button className="primary" type="submit">Check availability</button>
    </form>
    {!parsed.success && <div className="panel" style={{marginTop:16}}><p className="danger">The requested stay was invalid, so the page loaded the next default dates.</p></div>}
    {cheapest&&<PriceWatch hotelId={hotel.id} arrival={stay.arrival} departure={stay.departure} adults={stay.adults} children={stay.children} currentTotal={cheapest.total} currency={hotel.currency}/>}    
    <div className="sectionHead" style={{marginTop:34}}><div><span className="eyebrow">Live rooms</span><h2>{hotel.stay.nights} night{hotel.stay.nights === 1 ? "" : "s"} · {hotel.offers.length} bookable rate plan{hotel.offers.length === 1 ? "" : "s"}</h2></div></div>
    {hotel.offers.length === 0 ? <div className="panel"><h3>No rooms are currently sellable for this stay</h3><p className="muted">A rate plan appears only when every night has a configured rate, valid restrictions, and remaining inventory.</p></div> : <div className="roomTable"><div className="roomRow roomHead"><span>Room</span><span>Package</span><span>Cancellation</span><span>Final stay price</span><span></span></div>{hotel.offers.map((offer)=><div className="roomRow" key={`${offer.roomTypeId}-${offer.ratePlanId}`}><div><strong>{offer.roomName}</strong><small className="muted">Up to {offer.maxAdults} adults{offer.maxChildren ? ` + ${offer.maxChildren} children` : ""} · {offer.availableToSell} left</small></div><div><strong>{mealPlan(offer.mealPlan)}</strong>{offer.promotion && <small className="status">{offer.promotion.name} · {offer.promotion.discountPercent}% off</small>}<small className="muted">{offer.paymentModes.map((mode)=>mode === "PAY_AT_HOTEL" ? "Pay at hotel" : "Pay now").join(" · ")}</small></div><div><strong>{offer.cancellationPolicy.name}</strong><small className={offer.freeCancellationNow ? "status" : "muted"}>{offer.freeCancellationNow ? "Free cancellation now" : `Current penalty ${offer.cancellationNow.penaltyAmount.toFixed(2)} ${hotel.currency}`}</small></div><div><strong>{offer.total.toFixed(2)} {hotel.currency}</strong><small className="muted">Avg {offer.averageNightlyTotal.toFixed(2)} / night · Base {offer.amounts.base.toFixed(2)} + service {offer.amounts.service.toFixed(2)} + tax {offer.amounts.tax.toFixed(2)}</small></div><Link href={checkoutHref(hotel.id, offer.roomTypeId, offer.ratePlanId, stay.arrival, stay.departure)} className="primary">Select</Link></div>)}</div>}
    <div className="sectionHead" style={{marginTop:40}}><div><span className="eyebrow">Verified stays</span><h2>Guest reviews</h2></div></div>
    {reviewData.summary.count === 0 ? <div className="panel"><h3>No verified reviews yet</h3><p className="muted">Only guests with completed bookings can publish a review.</p></div> : <><div className="kpiGrid"><div className="kpi"><span>Overall</span><strong>{reviewData.summary.overall?.toFixed(1)}/10</strong></div><div className="kpi"><span>Cleanliness</span><strong>{reviewData.summary.cleanliness?.toFixed(1)}</strong></div><div className="kpi"><span>Staff</span><strong>{reviewData.summary.staff?.toFixed(1)}</strong></div><div className="kpi"><span>Location</span><strong>{reviewData.summary.location?.toFixed(1)}</strong></div><div className="kpi"><span>Comfort</span><strong>{reviewData.summary.comfort?.toFixed(1)}</strong></div><div className="kpi"><span>Value</span><strong>{reviewData.summary.value?.toFixed(1)}</strong></div></div><div className="grid2" style={{marginTop:20}}>{reviewData.reviews.map((review)=><article className="panel" key={review.id}><div><strong>{review.overall}/10 · {review.guestName}</strong><p className="muted">Verified stay completed {review.stayCompleted}</p></div>{review.title && <h3>{review.title}</h3>}<p>{review.comment}</p>{review.hotelReply && <div className="alertCard"><div><strong>Hotel response</strong><p>{review.hotelReply}</p></div></div>}</article>)}</div></>}
  </section></main>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function checkoutHref(hotelId: string, roomTypeId: string, ratePlanId: string, arrival: string, departure: string) {
  const query = new URLSearchParams({hotelId, roomTypeId, ratePlanId, arrival, departure});
  return `/checkout?${query.toString()}`;
}

function mealPlan(value: string) {
  if (value === "BREAKFAST") return "Breakfast";
  if (value === "HALF_BOARD") return "Half board";
  if (value === "FULL_BOARD") return "Full board";
  return "Room only";
}
