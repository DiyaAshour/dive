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
    demo:"بيانات تجريبية",back:"العودة لنتائج السيارات",similar:"أو سيارة مشابهة",supplier:"شركة التأجير",pickup:"الاستلام",dropoff:"التسليم",period:"فترة الإيجار",driver:"عمر السائق",seats:"مقاعد",bags:"حقائب",automatic:"أوتوماتيك",manual:"عادي",ac:"تكييف",benefits:"المزايا المشمولة",free:"إلغاء مجاني",mileage:"كيلومترات غير محدودة",airport:"استلام من المطار",insurance:"تفاصيل التأمين واضحة قبل الحجز",insuranceTitle:"التأمين",deposit:"الوديعة",none:"بدون وديعة",daily:"السعر لليوم",total:"الإجمالي",days:"أيام",day:"يوم",cta:"احجز الآن",notice:"هذه صفحة Demo لاختبار تجربة HandMeKey Cars. السيارة والسعر والتوفر ليست حجزًا حيًا بعد.",fuelPetrol:"بنزين",fuelDiesel:"ديزل",fuelHybrid:"هايبرد",fuelElectric:"كهرباء"
  }:{
    demo:"Demo data",back:"Back to car results",similar:"or similar",supplier:"Rental company",pickup:"Pick-up",dropoff:"Drop-off",period:"Rental period",driver:"Driver age",seats:"seats",bags:"bags",automatic:"Automatic",manual:"Manual",ac:"A/C",benefits:"Included benefits",free:"Free cancellation",mileage:"Unlimited mileage",airport:"Airport pickup",insurance:"Insurance details shown clearly before booking",insuranceTitle:"Insurance",deposit:"Deposit",none:"No deposit",daily:"Daily price",total:"Total",days:"days",day:"day",cta:"Book now",notice:"This is a demo page for testing HandMeKey Cars. The car, price and availability are not live bookings yet.",fuelPetrol:"Petrol",fuelDiesel:"Diesel",fuelHybrid:"Hybrid",fuelElectric:"Electric"
  };
  const fuel=car.fuel==="Petrol"?copy.fuelPetrol:car.fuel==="Diesel"?copy.fuelDiesel:car.fuel==="Hybrid"?copy.fuelHybrid:copy.fuelElectric;
  const durationLabel=`${days} ${days===1?copy.day:copy.days}`;

  return <main className={styles.page} lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <div className="shell">
      <Link className={styles.back} href={`/cars?${backParams.toString()}`}><ArrowLeft size={16}/>{copy.back}</Link>
      <div className={styles.demoNotice}><ShieldCheck size={18}/><div><strong>{copy.demo}</strong><span>{copy.notice}</span></div></div>

      <section className={styles.hero}>
        <div className={styles.media}><img src={car.image} alt={car.imageAlt}/><span>{copy.demo}</span></div>
        <div className={styles.info}>
          <div className={styles.titleRow}>
            <div><small>{car.brand} · {car.year}</small><h1>{car.model}</h1><p>{copy.similar}</p></div>
            <div className={styles.supplier}><strong>{car.supplierRating.toFixed(1)}</strong><span><Star size={13}/>{copy.supplier}<b>{car.supplier}</b></span></div>
          </div>
          <div className={styles.specGrid} aria-label={ar?"مواصفات السيارة":"Car specifications"}>
            <span><Users size={17}/><b>{car.seats}</b>{copy.seats}</span>
            <span><BriefcaseBusiness size={17}/><b>{car.bags}</b>{copy.bags}</span>
            <span><Gauge size={17}/>{car.transmission==="Automatic"?copy.automatic:copy.manual}</span>
            <span><Fuel size={17}/>{fuel}</span>
            <span><Snowflake size={17}/>{copy.ac}</span>
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.contentColumn}>
          <section className={`${styles.panel} ${styles.rentalPanel}`}>
            <h2>{copy.period}</h2>
            <div className={styles.tripGrid}>
              <div className={styles.tripCard}><span>{copy.pickup}</span><strong><MapPin size={15}/>{pickup}</strong><small>{query.pickupDate||"—"} · {query.pickupTime||"10:00"}</small></div>
              <div className={styles.tripCard}><span>{copy.dropoff}</span><strong><MapPin size={15}/>{dropoff}</strong><small>{query.returnDate||"—"} · {query.returnTime||"10:00"}</small></div>
              <div className={styles.driverCard}><span>{copy.driver}</span><strong>{query.driverAge||"30-65"}</strong></div>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.benefitsPanel}`}>
            <h2>{copy.benefits}</h2>
            <div className={styles.benefitGrid}>
              {car.freeCancellation&&<span><Check size={16}/>{copy.free}</span>}
              {car.unlimitedMileage&&<span><Check size={16}/>{copy.mileage}</span>}
              {car.airportPickup&&<span><Check size={16}/>{copy.airport}</span>}
            </div>
          </section>

          <section className={styles.policyStrip} aria-label={ar?"التأمين والوديعة":"Insurance and deposit"}>
            <div><span className={styles.policyIcon}><ShieldCheck size={17}/></span><span><small>{copy.insuranceTitle}</small><strong>{copy.insurance}</strong></span></div>
            <div><span className={styles.policyIcon}><CircleDollarSign size={17}/></span><span><small>{copy.deposit}</small><strong>{car.deposit===0?copy.none:`${car.deposit} JOD`}</strong></span></div>
          </section>
        </div>

        <aside className={styles.priceCard}>
          <span>{copy.daily}</span><strong>{car.dailyPrice} JOD</strong><small>{durationLabel}</small>
          <div><span>{copy.total}</span><b>{total} JOD</b></div>
          <p><CircleDollarSign size={15}/>{copy.deposit}: <b>{car.deposit===0?copy.none:`${car.deposit} JOD`}</b></p>
          <button type="button" disabled>{copy.cta}</button><small className={styles.disabledNote}>{copy.demo}</small>
        </aside>
      </div>
    </div>

    <aside className={styles.mobileBookingBar} aria-label={copy.total}>
      <div><span>{copy.total}</span><strong>{total} JOD</strong><small>{durationLabel} · {car.dailyPrice} JOD/{ar?"يوم":"day"}</small></div>
      <button type="button" disabled>{copy.cta}</button>
    </aside>
  </main>;
}

function rentalDayCount(start?:string,end?:string){if(!start||!end)return 1;const a=new Date(`${start}T12:00:00`);const b=new Date(`${end}T12:00:00`);const days=Math.round((b.getTime()-a.getTime())/86400000);return Number.isFinite(days)&&days>0?days:1;}
