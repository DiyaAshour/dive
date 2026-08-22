import Link from "next/link";
import { redirect } from "next/navigation";
import { listMyTrips } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { currentUser } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/trips");
  const trips = await listMyTrips(user.id);
  const sections = [
    ["CURRENT", "Current stays"],
    ["UPCOMING", "Upcoming trips"],
    ["PAST", "Past trips"],
    ["CANCELLED", "Cancelled / expired"],
  ] as const;

  return <AccountShell active="trips" eyebrow="Guest account" title="My trips" description={`Reservations linked to ${user.email}. Booking access and hotel conversations stay attached to the reservation.`}>
    {trips.length === 0 && <div className="accountFormCard"><h3>No trips linked yet</h3><p className="muted">Book while signed in, or open an existing reservation in the browser that created it and link it to this account.</p><Link className="primaryButton" href="/search">Find a hotel</Link></div>}
    {sections.map(([state,title]) => {
      const items = trips.filter((trip)=>trip.tripState===state);
      if (!items.length) return null;
      return <section key={state} className="accountTripsSection"><div className="sectionHeading"><div><span className="eyebrow">{state}</span><h2>{title}</h2></div></div><div className="grid3">{items.map((trip)=><Link className="card" href={`/booking/${trip.id}`} key={trip.id}>
        {trip.hotel.coverPhoto ? <img src={trip.hotel.coverPhoto.url} alt={trip.hotel.coverPhoto.alt ?? trip.hotel.name}/> : <div style={{height:180,display:"grid",placeItems:"center",background:"#eef1f4"}} className="muted">Photo pending</div>}
        <div className="cardBody"><div className="meta">{trip.reference} · {trip.status}</div><h3>{trip.hotel.name}</h3><p className="muted">{trip.hotel.city} · {trip.arrival} — {trip.departure}</p><p>{trip.roomType.name} · {trip.ratePlan.name}</p>{trip.expectedArrivalTime && <p className="muted">Expected arrival: {trip.expectedArrivalTime}</p>}<div className="price"><span>{trip.openRequestCount ? `${trip.openRequestCount} open request${trip.openRequestCount===1?"":"s"}` : "No open requests"}</span><b>{trip.totalAmount.toFixed(2)} {trip.currency}</b></div></div>
      </Link>)}</div></section>;
    })}
  </AccountShell>;
}
