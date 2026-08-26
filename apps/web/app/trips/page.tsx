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
import { dictionary, type Locale } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { currentUser } from "@/lib/server-session";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type TripsTab = "current" | "cancelled" | "completed";

export default async function TripsPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/trips");

  const [trips,locale,params] = await Promise.all([listMyTrips(user.id),requestLocale(),searchParams]);
  const copy = dictionary(locale);
  const requestedTab = first(params.tab);
  const activeTab: TripsTab = requestedTab === "cancelled" || requestedTab === "completed" ? requestedTab : "current";

  const currentTrips = trips.filter((trip)=>trip.tripState === "CURRENT" || trip.tripState === "UPCOMING");
  const cancelledTrips = trips.filter((trip)=>trip.tripState === "CANCELLED" || trip.status === "EXPIRED");
  const completedTrips = trips.filter((trip)=>trip.tripState === "PAST" && trip.status !== "CANCELLED" && trip.status !== "EXPIRED");

  const groups: Record<TripsTab, typeof trips> = {
    current: currentTrips,
    cancelled: cancelledTrips,
    completed: completedTrips,
  };
  const activeTrips = groups[activeTab];
  const ui = tripCopy(locale);

  return <AccountShell
    active="trips"
    eyebrow={copy.trips.eyebrow}
    title={copy.trips.title}
    description={ui.description}
  >
    <section className="tripsHub" aria-label={ui.title}>
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

      <div className="tripsTabHead">
        <div><span className="eyebrow">{ui.tabEyebrows[activeTab]}</span><h2>{ui.tabTitles[activeTab]}</h2><p>{ui.tabBodies[activeTab]}</p></div>
      </div>

      {activeTrips.length === 0 ? <TripEmptyState tab={activeTab} locale={locale}/> : <div className="tripsList">
        {activeTrips.map((trip)=><TripCard key={trip.id} trip={trip} locale={locale}/>) }
      </div>}
    </section>
  </AccountShell>;
}

function TripTab({href,active,icon,label,count}: {href:string;active:boolean;icon:React.ReactNode;label:string;count:number}) {
  return <Link href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
    <span className="tripsTabIcon">{icon}</span><span>{label}</span><b>{count}</b>
  </Link>;
}

function TripEmptyState({tab,locale}: {tab:TripsTab;locale:Locale}) {
  const ar = locale === "ar";
  const content = tab === "current"
    ? {
        title: ar ? "لا توجد لديك حجوزات حالية" : "No current bookings yet",
        body: ar ? "إقامتك القادمة تبدأ من هنا. استكشف الفنادق واختر المكان المناسب، وسنحتفظ بكل تفاصيل الحجز في هذه الصفحة." : "Your next stay starts here. Explore hotels, choose the right place, and we’ll keep every booking detail together on this page.",
        cta: ar ? "استكشف الإقامات" : "Explore stays",
        href: "/",
        icon: <Compass size={30}/>,
      }
    : tab === "cancelled"
      ? {
          title: ar ? "لا توجد حجوزات ملغية" : "No cancelled bookings",
          body: ar ? "أي حجز تقوم بإلغائه سيبقى محفوظًا هنا مع تفاصيله للرجوع إليه لاحقًا." : "Any booking you cancel will stay here with its details for easy reference later.",
          cta: ar ? "عرض الحجوزات الحالية" : "View current bookings",
          href: "/trips?tab=current",
          icon: <XCircle size={30}/>,
        }
      : {
          title: ar ? "لا توجد إقامات مكتملة بعد" : "No completed stays yet",
          body: ar ? "بعد انتهاء إقامتك ستنتقل تلقائيًا إلى هنا حتى يبقى سجل رحلاتك مرتبًا وواضحًا." : "Once a stay is finished, it will move here automatically so your travel history stays organized.",
          cta: ar ? "استكشف إقامتك القادمة" : "Explore your next stay",
          href: "/",
          icon: <CheckCircle2 size={30}/>,
        };

  return <div className={`tripsEmpty tripsEmpty-${tab}`}>
    <div className="tripsEmptyArtwork"><span>{content.icon}</span><i/><i/><i/></div>
    <div className="tripsEmptyCopy"><span className="eyebrow">{ar ? "HANDMEKEY TRIPS" : "HANDMEKEY TRIPS"}</span><h3>{content.title}</h3><p>{content.body}</p><Link href={content.href}>{content.cta}<ArrowUpRight size={17}/></Link></div>
  </div>;
}

function TripCard({trip,locale}: {trip: Awaited<ReturnType<typeof listMyTrips>>[number]; locale:Locale}) {
  const ar = locale === "ar";
  const nights = stayNights(trip.arrival,trip.departure);
  const status = bookingStatus(trip.status,locale,trip.tripState);
  const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});

  return <Link className="tripBookingCard" href={`/booking/${trip.id}`}>
    <div className="tripBookingMedia">
      {trip.hotel.coverPhoto
        ? <img src={trip.hotel.coverPhoto.url} alt={trip.hotel.coverPhoto.alt ?? trip.hotel.name} loading="lazy" decoding="async"/>
        : <div className="tripBookingPlaceholder"><ImageIcon size={28}/><span>{ar ? "صورة الفندق قيد الإضافة" : "Hotel photo pending"}</span></div>}
      <span className={`tripStatus tripStatus-${status.tone}`}>{status.icon}{status.label}</span>
    </div>

    <div className="tripBookingContent">
      <div className="tripBookingTopline"><span>{trip.reference}</span><small>{ar ? "رقم الحجز" : "Booking reference"}</small></div>
      <h3>{trip.hotel.name}</h3>
      <p className="tripBookingLocation"><MapPin size={15}/>{trip.hotel.city}</p>

      <div className="tripStayDates">
        <div><span>{ar ? "الوصول" : "Check-in"}</span><strong>{formatDate(trip.arrival,dateFormatter)}</strong></div>
        <i/>
        <div><span>{ar ? "المغادرة" : "Check-out"}</span><strong>{formatDate(trip.departure,dateFormatter)}</strong></div>
        <b>{nights} {nights === 1 ? (ar ? "ليلة" : "night") : (ar ? "ليالٍ" : "nights")}</b>
      </div>

      <div className="tripBookingDetails">
        <span><ReceiptText size={14}/>{trip.roomType.name}</span>
        <span>{trip.ratePlan.name}</span>
        {trip.expectedArrivalTime && <span><Clock3 size={14}/>{ar ? "الوصول المتوقع" : "Expected arrival"}: {trip.expectedArrivalTime}</span>}
      </div>
    </div>

    <div className="tripBookingAside">
      <div className="tripBookingAmount"><span>{ar ? "إجمالي الحجز" : "Booking total"}</span><strong>{trip.totalAmount.toFixed(2)} {trip.currency}</strong></div>
      <div className="tripBookingRequests"><MessageSquareText size={15}/><span>{trip.openRequestCount ? `${trip.openRequestCount} ${ar ? "طلبات مفتوحة" : trip.openRequestCount === 1 ? "open request" : "open requests"}` : (ar ? "لا توجد طلبات مفتوحة" : "No open requests")}</span></div>
      <span className="tripBookingAction">{ar ? "عرض تفاصيل الحجز" : "View booking details"}<ArrowUpRight size={16}/></span>
    </div>
  </Link>;
}

function bookingStatus(status:string,locale:Locale,tripState:string) {
  const ar = locale === "ar";
  if (tripState === "CANCELLED" || status === "CANCELLED" || status === "EXPIRED") return {label: ar ? "ملغي" : "Cancelled",tone:"cancelled",icon:<XCircle size={13}/>};
  if (tripState === "PAST") return {label: ar ? "مكتمل" : "Completed",tone:"completed",icon:<CheckCircle2 size={13}/>};
  if (tripState === "CURRENT") return {label: ar ? "إقامة جارية" : "In stay",tone:"current",icon:<Clock3 size={13}/>};
  if (status === "HOLD") return {label: ar ? "بانتظار التأكيد" : "Awaiting confirmation",tone:"pending",icon:<Clock3 size={13}/>};
  if (status === "MODIFIED") return {label: ar ? "مؤكد · معدل" : "Confirmed · Updated",tone:"confirmed",icon:<CheckCircle2 size={13}/>};
  return {label: ar ? "مؤكد" : "Confirmed",tone:"confirmed",icon:<CheckCircle2 size={13}/>};
}

function tripCopy(locale:Locale) {
  const ar = locale === "ar";
  return ar ? {
    title:"حجوزاتي",
    description:"كل إقاماتك في مكان واحد — تابع الحجز القادم، ارجع للحجوزات السابقة، واحتفظ بسجل واضح للحجوزات الملغية.",
    summary:"ملخص الحجوزات",
    manageTitle:"رحلاتك، مرتبة ببساطة",
    manageBody:"كل حجز ينتقل تلقائيًا للحالة المناسبة حسب تاريخ الإقامة وحالة الحجز.",
    current:"الحالية",
    cancelled:"الملغية",
    completed:"المكتملة",
    tabsLabel:"حالات الحجوزات",
    tabEyebrows:{current:"CURRENT BOOKINGS",cancelled:"CANCELLED",completed:"COMPLETED"} as Record<TripsTab,string>,
    tabTitles:{current:"الحجوزات الحالية",cancelled:"الحجوزات الملغية",completed:"الإقامات المكتملة"} as Record<TripsTab,string>,
    tabBodies:{current:"الحجوزات القادمة والإقامات الجارية تظهر هنا مع أهم التفاصيل التي تحتاجها قبل الوصول.",cancelled:"سجل الحجوزات التي تم إلغاؤها محفوظ هنا للرجوع إليه متى احتجت.",completed:"احتفظ بتاريخ إقاماتك السابقة وتفاصيل حجوزاتك المكتملة في مكان واحد."} as Record<TripsTab,string>,
  } : {
    title:"My bookings",
    description:"All your stays in one place — follow what’s next, revisit previous stays, and keep a clear record of cancelled bookings.",
    summary:"Bookings summary",
    manageTitle:"Your trips, simply organized",
    manageBody:"Each booking moves automatically to the right place based on its stay dates and booking status.",
    current:"Current",
    cancelled:"Cancelled",
    completed:"Completed",
    tabsLabel:"Booking states",
    tabEyebrows:{current:"CURRENT BOOKINGS",cancelled:"CANCELLED",completed:"COMPLETED"} as Record<TripsTab,string>,
    tabTitles:{current:"Current bookings",cancelled:"Cancelled bookings",completed:"Completed stays"} as Record<TripsTab,string>,
    tabBodies:{current:"Upcoming bookings and in-progress stays appear here with the details you need before arrival.",cancelled:"Bookings you’ve cancelled remain here whenever you need to refer back to them.",completed:"Keep your previous stays and completed booking details together in one organized history."} as Record<TripsTab,string>,
  };
}

function stayNights(arrival:string,departure:string) {
  const start = Date.parse(`${arrival}T00:00:00Z`);
  const end = Date.parse(`${departure}T00:00:00Z`);
  return Math.max(1,Math.round((end-start)/86_400_000));
}

function formatDate(value:string,formatter:Intl.DateTimeFormat) {
  return formatter.format(new Date(`${value}T00:00:00Z`));
}

function first(value:string|string[]|undefined):string|undefined{return Array.isArray(value)?value[0]:value;}
