import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarRange, CarFront, CheckCircle2, MapPin, XCircle } from "lucide-react";
import { listMyCarReservations } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import styles from "./car-bookings.module.css";

export const dynamic="force-dynamic";
export const metadata={title:"My Car Bookings · HandMeKey Cars",robots:{index:false,follow:false}};

type Tab="current"|"completed"|"cancelled";

export default async function CarsBookingsPage({searchParams}:{searchParams:Promise<{tab?:string}>}){
  const [user,market,params]=await Promise.all([currentUser(),requestGuestMarket(),searchParams]);
  if(!user)redirect("/login?next=/cars/bookings");
  const reservations=await listMyCarReservations(user.id);
  const ar=market.baseLocale==="ar";
  const requested=params.tab;
  const tab:Tab=requested==="completed"||requested==="cancelled"?requested:"current";
  const now=Date.now();
  const groups={
    current:reservations.filter((r)=>!["CANCELLED","EXPIRED","COMPLETED"].includes(r.status)&&new Date(r.returnAt).getTime()>=now),
    completed:reservations.filter((r)=>r.status==="COMPLETED"||(!["CANCELLED","EXPIRED"].includes(r.status)&&new Date(r.returnAt).getTime()<now)),
    cancelled:reservations.filter((r)=>r.status==="CANCELLED"||r.status==="EXPIRED"),
  } satisfies Record<Tab,typeof reservations>;
  const active=groups[tab];
  const copy=ar?{
    eyebrow:"HANDMEKEY CARS",title:"حجوزات سياراتي",body:"استلام، تسليم، شركة التأجير، السيارة والسعر النهائي — كل حجوزات السيارات في مكان مستقل عن الإقامات.",
    current:"الحالية",completed:"المكتملة",cancelled:"الملغية",empty:"لا توجد حجوزات سيارات هنا بعد",emptyBody:"اختر سيارة من HandMeKey Cars وعند تأكيد الحجز ستظهر كل التفاصيل هنا.",explore:"استكشف السيارات",pickup:"الاستلام",return:"التسليم",total:"إجمالي الحجز",days:"أيام",day:"يوم",details:"عرض تفاصيل الحجز"
  }:{
    eyebrow:"HANDMEKEY CARS",title:"My car bookings",body:"Pick-up, return, rental company, vehicle and final price — all car reservations live separately from stays.",
    current:"Current",completed:"Completed",cancelled:"Cancelled",empty:"No car bookings here yet",emptyBody:"Choose a vehicle in HandMeKey Cars and confirmed reservations will appear here.",explore:"Explore cars",pickup:"Pick-up",return:"Return",total:"Booking total",days:"days",day:"day",details:"View booking details"
  };

  return <main className={styles.page} dir={market.direction} lang={market.intlLocale}>
    <CustomerHeader/>
    <div className="shell">
      <header className={styles.hero}><span>{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.body}</p></header>
      <nav className={styles.tabs} aria-label={copy.title}>
        <TabLink href="/cars/bookings?tab=current" active={tab==="current"} icon={<CalendarRange size={15}/>} label={copy.current} count={groups.current.length}/>
        <TabLink href="/cars/bookings?tab=completed" active={tab==="completed"} icon={<CheckCircle2 size={15}/>} label={copy.completed} count={groups.completed.length}/>
        <TabLink href="/cars/bookings?tab=cancelled" active={tab==="cancelled"} icon={<XCircle size={15}/>} label={copy.cancelled} count={groups.cancelled.length}/>
      </nav>
      {active.length===0?<div className={styles.empty}><span className={styles.emptyIcon}><CarFront size={27}/></span><h2>{copy.empty}</h2><p>{copy.emptyBody}</p><Link href="/?service=cars">{copy.explore}</Link></div>:<div className={styles.list}>{active.map((reservation)=><Link className={styles.card} key={reservation.id} href={`/cars/bookings/${reservation.id}`}>
        <div className={styles.media}>{reservation.vehicle.imageUrl?<img src={reservation.vehicle.imageUrl} alt={reservation.vehicle.imageAlt??`${reservation.vehicle.make} ${reservation.vehicle.model}`}/>:<div className={styles.placeholder}><CarFront size={28}/></div>}<span className={styles.status}>{reservation.status}</span></div>
        <div className={styles.body}><div className={styles.topline}><span>{reservation.reference}</span><span>{reservation.company.verified?"✓ VERIFIED":""}</span></div><h2>{reservation.vehicle.make} {reservation.vehicle.model}</h2><div className={styles.supplier}>{reservation.company.name}</div><div className={styles.route}><div><span>{copy.pickup}</span><strong><MapPin size={12}/>{reservation.pickupLocation.name}</strong><small>{formatDate(reservation.pickupAt,ar)}</small></div><i/><div><span>{copy.return}</span><strong><MapPin size={12}/>{reservation.returnLocation.name}</strong><small>{formatDate(reservation.returnAt,ar)}</small></div></div></div>
        <aside className={styles.aside}><div className={styles.amount}><span>{copy.total}</span><strong>{reservation.total.toFixed(2)} {reservation.currency}</strong></div><small>{reservation.rentalDays} {reservation.rentalDays===1?copy.day:copy.days}</small><span className={styles.action}>{copy.details}<ArrowUpRight size={15}/></span></aside>
      </Link>)}</div>}
    </div>
  </main>;
}

function TabLink({href,active,icon,label,count}:{href:string;active:boolean;icon:React.ReactNode;label:string;count:number}){return <Link href={href} className={active?styles.active:""}>{icon}{label}<b>{count}</b></Link>}
function formatDate(value:string,ar:boolean){return new Intl.DateTimeFormat(ar?"ar-JO":"en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}).format(new Date(value));}
