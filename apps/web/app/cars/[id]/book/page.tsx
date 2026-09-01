import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CarFront, Check, ShieldCheck } from "lucide-react";
import { getPublicCarVehicle } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { CarReservationForm } from "@/components/car-reservation-form";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { defaultStayDates } from "@/lib/stay-dates";
import styles from "./car-booking-checkout.module.css";

export const dynamic="force-dynamic";
export const metadata={title:"Book a Car · HandMeKey Cars",robots:{index:false,follow:false}};

type SearchParams=Promise<{pickup?:string;dropoff?:string;pickupDate?:string;pickupTime?:string;returnDate?:string;returnTime?:string;driverAge?:string}>;

export default async function CarBookingCheckoutPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:SearchParams}){
  const [{id},query,market,user]=await Promise.all([params,searchParams,requestGuestMarket(),currentUser()]);
  const backQuery=new URLSearchParams();Object.entries(query).forEach(([key,value])=>{if(value)backQuery.set(key,value);});
  const currentPath=`/cars/${id}/book${backQuery.size?`?${backQuery.toString()}`:""}`;
  if(!user)redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  const car=await getPublicCarVehicle(id);
  if(!car)notFound();
  const defaults=defaultStayDates();
  const pickupDate=query.pickupDate||defaults.arrival;
  const returnDate=query.returnDate||defaults.departure;
  const pickupTime=query.pickupTime||"10:00";
  const returnTime=query.returnTime||"10:00";
  const driverAge=query.driverAge||"30-65";
  const days=rentalDayCount(pickupDate,returnDate,pickupTime,returnTime);
  const subtotal=car.dailyPrice*days;
  const ar=market.baseLocale==="ar";
  const copy=ar?{
    back:"العودة إلى السيارة",eyebrow:"HANDMEKEY CARS · SECURE BOOKING",title:"أكّد حجز السيارة",body:"راجع تفاصيل الإيجار ثم أكّد الحجز. السعر والوديعة وشروط الاستلام ظاهرة قبل التأكيد.",driver:"بيانات السائق الرئيسي",pickup:"الاستلام",return:"التسليم",perDay:"السعر اليومي",subtotal:"إجمالي الإيجار",fees:"رسوم إلزامية إضافية",deposit:"الوديعة",total:"الإجمالي",days:"أيام",day:"يوم",pay:"الدفع عند مكتب التأجير",verified:"شركة تأجير موثقة",free:"إلغاء مجاني حسب شروط العرض",mileage:"كيلومترات غير محدودة",clear:"السعر النهائي ظاهر قبل التأكيد",noLocation:"لا يوجد موقع استلام فعال لهذه الشركة حاليًا."
  }:{
    back:"Back to vehicle",eyebrow:"HANDMEKEY CARS · SECURE BOOKING",title:"Confirm your car booking",body:"Review the rental details and confirm. Pricing, deposit and pickup terms are visible before confirmation.",driver:"Main driver details",pickup:"Pick-up",return:"Return",perDay:"Daily rate",subtotal:"Rental subtotal",fees:"Mandatory additional fees",deposit:"Deposit",total:"Total",days:"days",day:"day",pay:"Pay at rental counter",verified:"Verified rental company",free:"Free cancellation subject to offer terms",mileage:"Unlimited mileage",clear:"Final price shown before confirmation",noLocation:"This rental company currently has no active pickup location."
  };

  return <main className={styles.page} dir={market.direction} lang={market.intlLocale}>
    <CustomerHeader/>
    <div className="shell">
      <Link className={styles.back} href={`/cars/${id}${backQuery.size?`?${backQuery.toString()}`:""}`}><ArrowLeft size={15}/>{copy.back}</Link>
      <header className={styles.head}><span>{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.body}</p></header>
      <div className={styles.layout}>
        <section className={styles.card}>
          <div className={styles.vehicle}><div className={styles.vehicleMedia}>{car.imageUrl?<img src={car.imageUrl} alt={car.imageAlt??`${car.brand} ${car.model}`}/>:<CarFront size={28}/>}</div><div><h3>{car.brand} {car.model}</h3><p>{car.year} · {car.category} · {car.transmission}</p><span className={styles.verified}><ShieldCheck size={13}/>{car.supplier} · {copy.verified}</span></div></div>
          <div className={styles.period}><div><span>{copy.pickup}</span><strong>{pickupDate} · {pickupTime}</strong></div><div><span>{copy.return}</span><strong>{returnDate} · {returnTime}</strong></div></div>
          <h2>{copy.driver}</h2>
          {car.locations.length>0?<CarReservationForm locale={market.baseLocale} vehicleId={car.id} pickupDate={pickupDate} pickupTime={pickupTime} returnDate={returnDate} returnTime={returnTime} driverAgeRange={driverAge} defaultName={user.displayName} defaultEmail={user.email} locations={car.locations} {...(car.homeLocation?.id?{defaultLocationId:car.homeLocation.id}:{})}/>:<div className={styles.notice}>{copy.noLocation}</div>}
        </section>
        <aside className={styles.aside}><div className={styles.price}><div className={styles.priceTop}><span>{copy.perDay}</span><strong>{car.dailyPrice.toFixed(2)} {car.currency}</strong><small>{days} {days===1?copy.day:copy.days}</small></div><div className={styles.rows}><Row label={copy.subtotal} value={`${subtotal.toFixed(2)} ${car.currency}`}/><Row label={copy.fees} value={`0.00 ${car.currency}`}/><Row label={copy.deposit} value={`${car.deposit.toFixed(2)} ${car.currency}`}/><div className={`${styles.row} ${styles.total}`}><span>{copy.total}</span><strong>{subtotal.toFixed(2)} {car.currency}</strong></div></div><div className={styles.terms}><span><Check size={12}/>{copy.pay}</span>{car.freeCancellation&&<span><Check size={12}/>{copy.free}</span>}{car.unlimitedMileage&&<span><Check size={12}/>{copy.mileage}</span>}<span><Check size={12}/>{copy.clear}</span></div></div></aside>
      </div>
    </div>
  </main>;
}
function Row({label,value}:{label:string;value:string}){return <div className={styles.row}><span>{label}</span><strong>{value}</strong></div>}
function rentalDayCount(startDate:string,endDate:string,startTime:string,endTime:string){const start=Date.parse(`${startDate}T${startTime}:00Z`);const end=Date.parse(`${endDate}T${endTime}:00Z`);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 1;return Math.max(1,Math.ceil((end-start)/86_400_000));}
