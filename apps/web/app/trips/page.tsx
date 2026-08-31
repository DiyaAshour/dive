import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  Image as ImageIcon,
  MapPin,
  MessageSquareText,
  ReceiptText,
  XCircle,
} from "lucide-react";
import { listMyTrips } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { guestDictionary } from "@/lib/guest-i18n";
import { guestIntlLocale, type GuestLocale } from "@/lib/guest-market";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { tripsUiCopy, type TripsTab } from "@/lib/trips-ui-copy";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TripsPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/trips");

  const [trips,market,params] = await Promise.all([listMyTrips(user.id),requestGuestMarket(),searchParams]);
  const copy = guestDictionary(market.locale);
  const ui = tripsUiCopy(market.locale);
  const requestedTab = first(params.tab);
  const activeTab: TripsTab = requestedTab === "cancelled" || requestedTab === "completed" ? requestedTab : "current";

  const currentTrips = trips.filter((trip)=>trip.tripState === "CURRENT" || trip.tripState === "UPCOMING");
  const cancelledTrips = trips.filter((trip)=>trip.tripState === "CANCELLED" || trip.status === "EXPIRED");
  const completedTrips = trips.filter((trip)=>trip.tripState === "PAST" && trip.status !== "CANCELLED" && trip.status !== "EXPIRED");
  const groups: Record<TripsTab, typeof trips> = {current:currentTrips,cancelled:cancelledTrips,completed:completedTrips};
  const activeTrips = groups[activeTab];

  return <AccountShell active="trips" eyebrow={copy.trips.eyebrow} title={copy.trips.title} description={ui.description}>
    <section className="tripsHub" aria-label={copy.trips.title}>
      <div className="tripsOverview" aria-label={ui.summary}>
        <div className="tripsOverviewLead">
          <span className="tripsOverviewIcon"><CalendarDays size={21}/></span>
          <div><strong>{ui.manageTitle}</strong><p>{ui.manageBody}</p></div>
        </div>
        <div className="tripsMetrics">
          <div><span>{ui.current}</span><strong>{currentTrips.length}</strong></div>
          <div><span>{ui.completed}</span><strong>{completedTrips.length}</strong></div>
          <div><span>{ui.cancelled}</span><strong>{cancelledTrips.length}</strong></div>
        </div>
      </div>

      <nav className="tripsTabs" aria-label={ui.tabsLabel}>
        <TripTab href="/trips?tab=current" active={activeTab === "current"} icon={<Clock3 size={17}/>} label={ui.current} count={currentTrips.length}/>
        <TripTab href="/trips?tab=cancelled" active={activeTab === "cancelled"} icon={<XCircle size={17}/>} label={ui.cancelled} count={cancelledTrips.length}/>
        <TripTab href="/trips?tab=completed" active={activeTab === "completed"} icon={<CheckCircle2 size={17}/>} label={ui.completed} count={completedTrips.length}/>
      </nav>

      <div className="tripsTabHead"><div><span className="eyebrow">{ui[activeTab]}</span><h2>{ui.tabTitles[activeTab]}</h2><p>{ui.tabBodies[activeTab]}</p></div></div>
      {activeTrips.length === 0 ? <TripEmptyState tab={activeTab} locale={market.locale}/> : <div className="tripsList">{activeTrips.map((trip)=><TripCard key={trip.id} trip={trip} locale={market.locale}/>)}</div>}
    </section>
  </AccountShell>;
}

function TripTab({href,active,icon,label,count}: {href:string;active:boolean;icon:React.ReactNode;label:string;count:number}) {
  return <Link href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
    <span className="tripsTabIcon">{icon}</span><span>{label}</span><b>{count}</b>
  </Link>;
}

function TripEmptyState({tab,locale}: {tab:TripsTab;locale:GuestLocale}) {
  const ui=tripsUiCopy(locale);
  const content = tab === "current"
    ? {title:ui.emptyCurrentTitle,body:ui.emptyCurrentBody,cta:ui.emptyCurrentCta,href:"/",icon:<Compass size={30}/>}
    : tab === "cancelled"
      ? {title:ui.emptyCancelledTitle,body:ui.emptyCancelledBody,cta:ui.emptyCancelledCta,href:"/trips?tab=current",icon:<XCircle size={30}/>}
      : {title:ui.emptyCompletedTitle,body:ui.emptyCompletedBody,cta:ui.emptyCompletedCta,href:"/",icon:<CheckCircle2 size={30}/>};

  return <div className={`tripsEmpty tripsEmpty-${tab}`}>
    <div className="tripsEmptyArtwork"><span>{content.icon}</span><i/><i/><i/></div>
    <div className="tripsEmptyCopy"><span className="eyebrow">HANDMEKEY TRIPS</span><h3>{content.title}</h3><p>{content.body}</p><Link href={content.href}>{content.cta}<ArrowUpRight size={17}/></Link></div>
  </div>;
}

function TripCard({trip,locale}: {trip: Awaited<ReturnType<typeof listMyTrips>>[number]; locale:GuestLocale}) {
  const ui=tripsUiCopy(locale);
  const nights = stayNights(trip.arrival,trip.departure);
  const status = bookingStatus(trip.status,locale,trip.tripState);
  const dateFormatter = new Intl.DateTimeFormat(guestIntlLocale(locale), {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});

  return <Link className="tripBookingCard" href={`/booking/${trip.id}`}>
    <div className="tripBookingMedia">
      {trip.hotel.coverPhoto ? <img src={trip.hotel.coverPhoto.url} alt={trip.hotel.coverPhoto.alt ?? trip.hotel.name} loading="lazy" decoding="async"/> : <div className="tripBookingPlaceholder"><ImageIcon size={28}/><span>{ui.photoPending}</span></div>}
      <span className={`tripStatus tripStatus-${status.tone}`}>{status.icon}{status.label}</span>
    </div>

    <div className="tripBookingContent">
      <div className="tripBookingTopline"><span>{trip.reference}</span><small>{ui.bookingReference}</small></div>
      <h3>{trip.hotel.name}</h3>
      <p className="tripBookingLocation"><MapPin size={15}/>{trip.hotel.city}</p>
      <div className="tripStayDates">
        <div><span>{ui.checkIn}</span><strong>{formatDate(trip.arrival,dateFormatter)}</strong></div><i/><div><span>{ui.checkOut}</span><strong>{formatDate(trip.departure,dateFormatter)}</strong></div><b>{nights} {ui.night(nights)}</b>
      </div>
      <div className="tripBookingDetails">
        <span><ReceiptText size={14}/>{trip.roomType.name}</span><span>{trip.ratePlan.name}</span>{trip.expectedArrivalTime && <span><Clock3 size={14}/>{ui.expectedArrival}: {trip.expectedArrivalTime}</span>}
      </div>
    </div>

    <div className="tripBookingAside">
      <div className="tripBookingAmount"><span>{ui.bookingTotal}</span><strong>{trip.totalAmount.toFixed(2)} {trip.currency}</strong></div>
      <div className="tripBookingRequests"><MessageSquareText size={15}/><span>{trip.openRequestCount ? ui.openRequests(trip.openRequestCount) : ui.noOpenRequests}</span></div>
      <span className="tripBookingAction">{ui.viewDetails}<ArrowUpRight size={16}/></span>
    </div>
  </Link>;
}

function bookingStatus(status:string,locale:GuestLocale,tripState:string) {
  const ui=tripsUiCopy(locale);
  if (tripState === "CANCELLED" || status === "CANCELLED" || status === "EXPIRED") return {label:ui.cancelledStatus,tone:"cancelled",icon:<XCircle size={13}/>};
  if (tripState === "PAST") return {label:ui.completedStatus,tone:"completed",icon:<CheckCircle2 size={13}/>};
  if (tripState === "CURRENT") return {label:ui.inStayStatus,tone:"current",icon:<Clock3 size={13}/>};
  if (status === "HOLD") return {label:ui.awaitingStatus,tone:"pending",icon:<Clock3 size={13}/>};
  if (status === "MODIFIED") return {label:ui.updatedStatus,tone:"confirmed",icon:<CheckCircle2 size={13}/>};
  return {label:ui.confirmedStatus,tone:"confirmed",icon:<CheckCircle2 size={13}/>};
}

function stayNights(arrival:string,departure:string) {
  const start = Date.parse(`${arrival}T00:00:00Z`);
  const end = Date.parse(`${departure}T00:00:00Z`);
  return Math.max(1,Math.round((end-start)/86_400_000));
}
function formatDate(value:string,formatter:Intl.DateTimeFormat) {return formatter.format(new Date(`${value}T00:00:00Z`));}
function first(value:string|string[]|undefined):string|undefined{return Array.isArray(value)?value[0]:value;}
