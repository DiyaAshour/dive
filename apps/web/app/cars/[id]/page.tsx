import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Check, CircleDollarSign, Fuel, Gauge, MapPin, ShieldCheck, Snowflake, Star, Users } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { demoCars } from "@/lib/demo-cars";
import { requestGuestMarket } from "@/lib/request-guest-market";
import styles from "./car-detail.module.css";

export const dynamic = "force-dynamic";
export const metadata = {robots:{index:false,follow:false}};

type SearchParams = Promise<{pickup?:string;dropoff?:string;pickupDate?:string;pickupTime?:string;returnDate?:string;returnTime?:string;driverAge?:string}>;

export default async function DemoCarDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:SearchParams}) {
  const [{id},query,market]=await Promise.all([params,searchParams,requestGuestMarket()]);
  const car=demoCars.find((item)=>item.id===id);
  if(!car)notFound();
  const ar=market.locale==="ar";
  const days=rentalDayCount(query.pickupDate,query.returnDate);
  const total=car.dailyPrice*days;
  const pickup=query.pickup?.trim()||(ar?"عمّان - مطار الملكة علياء":"Amman - Queen Alia Airport");
  const dropoff=query.dropoff==="same"||!query.dropoff?pickup:query.dropoff;
  const backParams=new URLSearchParams();
  Object.entries(query).forEach(([key,value])=>{if(value)backParams.set(key,value);});
  const copy=ar?{
    demo:"بيانات تجريبية",back:"العودة لنتائج السيارات",similar:"أو سيارة مشابهة",supplier:"شركة التأجير",pickup:"الاستلام",dropoff:"التسليم",period:"فترة الإيجار",driver:"عمر السائق",specs:"مواصفات السيارة",seats:"مقاعد",bags:"حقائب",automatic:"أوتوماتيك",manual:"عادي",ac:"تكييف",benefits:"يشمل هذا العرض التجريبي",free:"إلغاء مجاني",mileage:"كيلومترات غير محدودة",airport:"استلام من المطار",insurance:"تفاصيل تأمين واضحة قبل الحجز",deposit:"الوديعة",none:"بدون وديعة",daily:"السعر التجريبي لليوم",total:"الإجمالي التجريبي",days:"أيام",day:"يوم",cta:"اختيار هذه السيارة",notice:"هذه صفحة Demo لاختبار تجربة HandMeKey Cars. السيارة والسعر والتوفر ليست حجزًا حيًا بعد.",fuelPetrol:"بنزين",fuelDiesel:"ديزل",fuelHybrid:"هايبرد",fuelElectric:"كهرباء"
  }:{
    demo:"Demo data",back:"Back to car results",similar:"or similar",supplier:"Rental company",pickup:"Pick-up",dropoff:"Drop-off",period:"Rental period",driver:"Driver age",specs:"Car specifications",seats:"seats",bags:"bags",automatic:"Automatic",manual:"Manual",ac:"A/C",benefits:"This demo offer includes",free:"Free cancellation",mileage:"Unlimited mileage",airport:"Airport pickup",insurance:"Clear insurance details before booking",deposit:"Deposit",none:"No deposit",daily:"Demo daily price",total:"Demo total",days:"days",day:"day",cta:"Choose this car",notice:"This is a demo page for testing HandMeKey Cars. The car, price and availability are not live bookings yet.",fuelPetrol:"Petrol",fuelDiesel:"Diesel",fuelHybrid:"Hybrid",fuelElectric:"Electric"
  };
  const fuel=car.fuel==="Petrol"?copy.fuelPetrol:car.fuel==="Diesel"?copy.fuelDiesel:car.fuel==="Hybrid"?copy.fuelHybrid:copy.fuelElectric;

  return <main className={styles.page} lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <div className="shell">
      <Link className={styles.back} href={`/cars?${backParams.toString()}`}><ArrowLeft size={16}/>{copy.back}</Link>
      <div className={styles.demoNotice}><ShieldCheck size={18}/><div><strong>{copy.demo}</strong><span>{copy.notice}</span></div></div>
      <section className={styles.hero}>
        <div className={styles.media}><img src={car.image} alt={car.imageAlt}/><span>{copy.demo}</span></div>
        <div className={styles.info}>
          <small>{car.brand} · {car.year}</small><h1>{car.model}</h1><p>{copy.similar}</p>
          <div className={styles.supplier}><strong>{car.supplierRating.toFixed(1)}</strong><span><Star size={13}/>{copy.supplier}<b>{car.supplier}</b></span></div>
          <div className={styles.specGrid}><span><Users size={17}/><b>{car.seats}</b>{copy.seats}</span><span><BriefcaseBusiness size={17}/><b>{car.bags}</b>{copy.bags}</span><span><Gauge size={17}/>{car.transmission==="Automatic"?copy.automatic:copy.manual}</span><span><Fuel size={17}/>{fuel}</span><span><Snowflake size={17}/>{copy.ac}</span></div>
        </div>
      </section>

      <div className={styles.layout}>
        <div>
          <section className={styles.panel}><h2>{copy.period}</h2><div className={styles.tripGrid}><div><span>{copy.pickup}</span><strong><MapPin size={15}/>{pickup}</strong><small>{query.pickupDate||"—"} · {query.pickupTime||"10:00"}</small></div><div><span>{copy.dropoff}</span><strong><MapPin size={15}/>{dropoff}</strong><small>{query.returnDate||"—"} · {query.returnTime||"10:00"}</small></div><div><span>{copy.driver}</span><strong>{query.driverAge||"30-65"}</strong></div></div></section>
          <section className={styles.panel}><h2>{copy.benefits}</h2><div className={styles.benefitGrid}>{car.freeCancellation&&<span><Check size={16}/>{copy.free}</span>}{car.unlimitedMileage&&<span><Check size={16}/>{copy.mileage}</span>}{car.airportPickup&&<span><Check size={16}/>{copy.airport}</span>}<span><Check size={16}/>{copy.insurance}</span></div></section>
        </div>
        <aside className={styles.priceCard}><span>{copy.daily}</span><strong>{car.dailyPrice} JOD</strong><small>{days} {days===1?copy.day:copy.days}</small><div><span>{copy.total}</span><b>{total} JOD</b></div><p><CircleDollarSign size={15}/>{copy.deposit}: <b>{car.deposit===0?copy.none:`${car.deposit} JOD`}</b></p><button type="button" disabled>{copy.cta}</button><small className={styles.disabledNote}>{copy.demo}</small></aside>
      </div>
    </div>
  </main>;
}

function rentalDayCount(start?:string,end?:string){if(!start||!end)return 1;const a=new Date(`${start}T12:00:00`);const b=new Date(`${end}T12:00:00`);const days=Math.round((b.getTime()-a.getTime())/86400000);return Number.isFinite(days)&&days>0?days:1;}
