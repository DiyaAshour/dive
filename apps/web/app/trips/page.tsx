import Link from "next/link";
import { redirect } from "next/navigation";
import { listMyTrips } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { dictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { currentUser } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/trips");
  const [trips,locale] = await Promise.all([listMyTrips(user.id),requestLocale()]);
  const copy = dictionary(locale);
  const sections = [
    ["CURRENT", copy.trips.current],
    ["UPCOMING", copy.trips.upcoming],
    ["PAST", copy.trips.past],
    ["CANCELLED", copy.trips.cancelled],
  ] as const;
  const description = `${copy.trips.bodyPrefix} ${user.email}. ${copy.trips.bodySuffix}`;

  return <AccountShell active="trips" eyebrow={copy.trips.eyebrow} title={copy.trips.title} description={description}>
    {trips.length === 0 && <div className="accountFormCard"><h3>{copy.trips.noTrips}</h3><p className="muted">{copy.trips.noTripsBody}</p><Link className="primaryButton" href="/search">{copy.trips.find}</Link></div>}
    {sections.map(([state,title]) => {
      const items = trips.filter((trip)=>trip.tripState===state);
      if (!items.length) return null;
      return <section key={state} className="accountTripsSection"><div className="sectionHeading"><div><span className="eyebrow">{state}</span><h2>{title}</h2></div></div><div className="grid3">{items.map((trip)=><Link className="card" href={`/booking/${trip.id}`} key={trip.id}>
        {trip.hotel.coverPhoto ? <img src={trip.hotel.coverPhoto.url} alt={trip.hotel.coverPhoto.alt ?? trip.hotel.name}/> : <div style={{height:180,display:"grid",placeItems:"center",background:"#eef1f4"}} className="muted">{copy.trips.noPhoto}</div>}
        <div className="cardBody"><div className="meta">{trip.reference} · {trip.status}</div><h3>{trip.hotel.name}</h3><p className="muted">{trip.hotel.city} · {trip.arrival} — {trip.departure}</p><p>{trip.roomType.name} · {trip.ratePlan.name}</p>{trip.expectedArrivalTime && <p className="muted">{copy.trips.expected}: {trip.expectedArrivalTime}</p>}<div className="price"><span>{trip.openRequestCount ? `${trip.openRequestCount} ${trip.openRequestCount===1?copy.trips.openRequest:copy.trips.openRequests}` : copy.trips.noRequests}</span><b>{trip.totalAmount.toFixed(2)} {trip.currency}</b></div></div>
      </Link>)}</div></section>;
    })}
  </AccountShell>;
}
