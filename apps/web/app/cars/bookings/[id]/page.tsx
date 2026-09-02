import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CarFront, CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import { getMyCarReservation } from "@platform/server";
import { CarBookingActions } from "@/components/car-booking-actions";
import { CustomerHeader } from "@/components/customer-header";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import styles from "../car-bookings.module.css";

export const dynamic="force-dynamic";
export const metadata={title:"Car Booking · HandMeKey Cars",description:"View your HandMeKey Cars reservation, rental dates, price and booking status.",robots:{index:false,follow:false}};

type SearchParams=Promise<{booked?:string}>;

export default async function CarBookingDetailPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:SearchParams}){
  const [{id},query,user,market]=await Promise.all([params,searchParams,currentUser(),requestGuestMarket()]);
  if(!user)redirect(`/login?next=${encodeURIComponent(`/cars/bookings/${id}`)}`);
  const reservation=await getMyCarReservation(user.id,id);
  if(!reservation)notFound();
  const ar=market.baseLocale==="ar";
  const copy=ar?{back:"العودة إلى حجوزات السيارات",eyebrow:"HANDMEKEY CARS BOOKING",title:"تفاصيل حجز السيارة",vehicle:"السيارة",company:"شركة التأجير",pickup:"الاستلام",return:"التسليم",driver:"عمر السائق",days:"مدة الإيجار",dayRate:"السعر اليومي",subtotal:"الإيجار",fees:"رسوم إضافية",deposit:"الوديعة",total:"الإجمالي",payment:"طريقة الدفع",counter:"الدفع عند مكتب التأجير",status:"حالة الحجز",reference:"رقم الحجز",verified:"شركة تأجير موثقة",cancelled:"تم إلغاء هذا الحجز. أصبحت السيارة متاحة من جديد لهذه التواريخ.",reason:"سبب الإلغاء",confirmedTitle:"تم تأكيد حجز سيارتك",confirmedBody:"حجزك محفوظ الآن في HandMeKey. احتفظ برقم الحجز وأظهره عند الحاجة، وكل تفاصيل الاستلام والتسليم موجودة هنا.",confirmedRef:"رقم الحجز",extras:"الإضافات المطلوبة",noExtras:"بدون إضافات"}:{back:"Back to car bookings",eyebrow:"HANDMEKEY CARS BOOKING",title:"Car booking details",vehicle:"Vehicle",company:"Rental company",pickup:"Pick-up",return:"Return",driver:"Driver age",days:"Rental length",dayRate:"Daily rate",subtotal:"Rental",fees:"Additional fees",deposit:"Deposit",total:"Total",payment:"Payment",counter:"Pay at rental counter",status:"Booking status",reference:"Booking reference",verified:"Verified rental company",cancelled:"This booking has been cancelled. The car is available again for these dates.",reason:"Cancellation reason",confirmedTitle:"Your car booking is confirmed",confirmedBody:"Your reservation is now saved in HandMeKey. Keep the booking reference handy; your pick-up and return details are all here.",confirmedRef:"Booking reference",extras:"Requested extras",noExtras:"No extras"};
  const canCancel=reservation.vehicle.freeCancellation&&["HOLD","CONFIRMED","MODIFIED"].includes(reservation.status)&&Date.now()<Date.parse(reservation.pickupAt);
  const status=statusLabel(reservation.status,ar);
  const justBooked=query.booked==="1"&&reservation.status==="CONFIRMED";
  const extras=reservation.requestedExtras?.length?reservation.requestedExtras.map((value:string)=>extraLabel(value,ar)).join(" · "):copy.noExtras;

  return <main className={styles.page} dir={market.direction} lang={market.intlLocale}>
    <CustomerHeader/>
    <div className="shell">
      <Link className={styles.back} href="/cars/bookings"><ArrowLeft size={15}/>{copy.back}</Link>
      {justBooked&&<section className={styles.confirmedBanner} role="status"><span className={styles.confirmedIcon}><CheckCircle2 size={25}/></span><div><small>HANDMEKEY CARS</small><h1>{copy.confirmedTitle}</h1><p>{copy.confirmedBody}</p><strong>{copy.confirmedRef}: {reservation.reference}</strong></div></section>}
      <header className={styles.hero}><span>{copy.eyebrow}</span><h1>{copy.title}</h1><p>{reservation.reference} · {status}</p></header>
      <div className={styles.detailGrid}>
        <div className={styles.panel}>
          <div className={styles.reference}><div><span>{copy.reference}</span><strong>{reservation.reference}</strong></div><div><span>{copy.status}</span><strong>{status}</strong></div></div>
          <h2>{copy.vehicle}</h2>
          <div className={styles.vehicle}><div className={styles.vehicleMedia}>{reservation.vehicle.imageUrl?<img src={reservation.vehicle.imageUrl} alt={reservation.vehicle.imageAlt??`${reservation.vehicle.make} ${reservation.vehicle.model}`}/>:<div className={styles.placeholder}><CarFront size={25}/></div>}</div><div><h3>{reservation.vehicle.make} {reservation.vehicle.model}</h3><p>{reservation.vehicle.year} · {reservation.vehicle.category}</p><p><ShieldCheck size={13}/> {reservation.company.name}{reservation.company.verified?` · ${copy.verified}`:""}</p></div></div>
          <div className={styles.facts}>
            <Fact label={copy.pickup} value={`${reservation.pickupLocation.name} · ${formatDate(reservation.pickupAt,ar)}`} icon={<MapPin size={13}/>}/>
            <Fact label={copy.return} value={`${reservation.returnLocation.name} · ${formatDate(reservation.returnAt,ar)}`} icon={<MapPin size={13}/>}/>
            <Fact label={copy.driver} value={reservation.driverAgeRange}/>
            <Fact label={copy.days} value={String(reservation.rentalDays)}/>
            <Fact label={copy.extras} value={extras}/>
            <Fact label={copy.payment} value={reservation.paymentMode==="PAY_AT_COUNTER"?copy.counter:reservation.paymentMode}/>
            <Fact label={copy.company} value={reservation.company.name}/>
          </div>
          {reservation.status==="CANCELLED"&&<div className={styles.cancelledNote}>{copy.cancelled}{reservation.cancellationNote?` ${copy.reason}: ${reservation.cancellationNote}`:""}</div>}
        </div>
        <aside className={styles.panel}><h2>{copy.total}</h2><div className={styles.priceRows}><Price label={copy.dayRate} value={`${reservation.dailyRate.toFixed(2)} ${reservation.currency}`}/><Price label={copy.subtotal} value={`${reservation.subtotal.toFixed(2)} ${reservation.currency}`}/><Price label={copy.fees} value={`${reservation.fees.toFixed(2)} ${reservation.currency}`}/><Price label={copy.deposit} value={`${reservation.deposit.toFixed(2)} ${reservation.currency}`}/><div className={`${styles.priceRow} ${styles.priceTotal}`}><span>{copy.total}</span><strong>{reservation.total.toFixed(2)} {reservation.currency}</strong></div></div>{canCancel&&<div className={styles.bookingActions}><CarBookingActions reservationId={reservation.id} locale={market.baseLocale}/></div>}</aside>
      </div>
    </div>
  </main>;
}
function Fact({label,value,icon}:{label:string;value:string;icon?:React.ReactNode}){return <div className={styles.fact}><span>{label}</span><strong>{icon}{value}</strong></div>}
function Price({label,value}:{label:string;value:string}){return <div className={styles.priceRow}><span>{label}</span><strong>{value}</strong></div>}
function formatDate(value:string,ar:boolean){return new Intl.DateTimeFormat(ar?"ar-JO":"en-GB",{dateStyle:"full",timeStyle:"short",timeZone:"UTC"}).format(new Date(value));}
function extraLabel(value:string,ar:boolean){const labels:Record<string,[string,string]>={"child-seat":["كرسي أطفال","Child seat"],"infant-seat":["مقعد رضيع","Infant seat"],"booster-seat":["Booster للأطفال","Child booster"],gps:["جهاز GPS","GPS device"],"additional-driver":["سائق إضافي","Additional driver"]};return labels[value]?.[ar?0:1]??value;}
function statusLabel(value:string,ar:boolean){if(!ar)return value==="NO_SHOW"?"No-show":value.charAt(0)+value.slice(1).toLowerCase().replaceAll("_"," ");return ({HOLD:"قيد الانتظار",CONFIRMED:"مؤكد",MODIFIED:"مؤكد · معدل",CANCELLED:"ملغي",NO_SHOW:"لم يحضر",COMPLETED:"مكتمل",EXPIRED:"منتهي"} as Record<string,string>)[value]??value;}
