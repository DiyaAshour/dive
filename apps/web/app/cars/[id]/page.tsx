import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, CarFront, Check, CircleDollarSign, Fuel, Gauge, MapPin, ShieldCheck, Snowflake, Star, Users } from "lucide-react";
import { getPublicCarVehicle } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { demoCars } from "@/lib/demo-cars";
import { requestGuestMarket } from "@/lib/request-guest-market";
import styles from "./car-detail.module.css";

export const dynamic = "force-dynamic";
export const metadata = {robots:{index:false,follow:false}};

type SearchParams = Promise<{pickup?:string;dropoff?:string;pickupDate?:string;pickupTime?:string;returnDate?:string;returnTime?:string;driverAge?:string}>;

export default async function CarDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:SearchParams}) {
  const [{id},query,market,liveCar]=await Promise.all([params,searchParams,requestGuestMarket(),params.then(({id})=>getPublicCarVehicle(id).catch(()=>null))]);
  const demoCar=liveCar?null:demoCars.find((item)=>item.id===id);
  if(!liveCar&&!demoCar)notFound();
  const ar=market.locale==="ar";
  const isLive=Boolean(liveCar);
  const car=liveCar?{
    id:liveCar.id,brand:liveCar.brand,model:liveCar.model,year:liveCar.year,category:liveCar.category,transmission:liveCar.transmission,fuel:liveCar.fuel,seats:liveCar.seats,bags:liveCar.bags,
    supplier:liveCar.supplier,supplierRating:null as number|null,dailyPrice:liveCar.dailyPrice,deposit:liveCar.deposit,freeCancellation:liveCar.freeCancellation,unlimitedMileage:liveCar.unlimitedMileage,airportPickup:liveCar.airportPickup,
    image:liveCar.imageUrl,imageAlt:liveCar.imageAlt??`${liveCar.brand} ${liveCar.model}`,currency:liveCar.currency,
  }:{
    id:demoCar!.id,brand:demoCar!.brand,model:demoCar!.model,year:demoCar!.year,category:demoCar!.category,transmission:demoCar!.transmission,fuel:demoCar!.fuel,seats:demoCar!.seats,bags:demoCar!.bags,
    supplier:demoCar!.supplier,supplierRating:demoCar!.supplierRating,dailyPrice:demoCar!.dailyPrice,deposit:demoCar!.deposit,freeCancellation:demoCar!.freeCancellation,unlimitedMileage:demoCar!.unlimitedMileage,airportPickup:demoCar!.airportPickup,
    image:demoCar!.image,imageAlt:demoCar!.imageAlt,currency:"JOD",
  };
  const days=rentalDayCount(query.pickupDate,query.returnDate,query.pickupTime,query.returnTime);
  const total=car.dailyPrice*days;
  const pickup=query.pickup?.trim()||(ar?"عمّان - مطار الملكة علياء":"Amman - Queen Alia Airport");
  const dropoff=query.dropoff==="same"||!query.dropoff?pickup:query.dropoff;
  const backParams=new URLSearchParams();
  Object.entries(query).forEach(([key,value])=>{if(value)backParams.set(key,value);});
  const copy=ar?{
    demo:"بيانات تجريبية",live:"حجز حي",back:"العودة لنتائج السيارات",similar:"أو سيارة مشابهة",supplier:"شركة التأجير",pickup:"الاستلام",dropoff:"التسليم",period:"فترة الإيجار",driver:"عمر السائق",specs:"مواصفات السيارة",seats:"مقاعد",bags:"حقائب",automatic:"أوتوماتيك",manual:"عادي",ac:"تكييف",benefits:"يشمل هذا العرض",free:"إلغاء مجاني",mileage:"كيلومترات غير محدودة",airport:"استلام من المطار",insurance:"تفاصيل تأمين واضحة قبل الحجز",deposit:"الوديعة",none:"بدون وديعة",daily:"السعر لليوم",total:"الإجمالي",days:"أيام",day:"يوم",cta:"احجز هذه السيارة",notice:"هذه صفحة Demo لاختبار تجربة HandMeKey Cars. السيارة والسعر والتوفر ليست حجزًا حيًا بعد.",liveNotice:"هذه السيارة منشورة من شركة تأجير موثقة على HandMeKey. يمكنك متابعة الحجز وتأكيده فعليًا.",verified:"شركة موثقة",fuelPetrol:"بنزين",fuelDiesel:"ديزل",fuelHybrid:"هايبرد",fuelElectric:"كهرباء"
  }:{
    demo:"Demo data",live:"Live booking",back:"Back to car results",similar:"or similar",supplier:"Rental company",pickup:"Pick-up",dropoff:"Drop-off",period:"Rental period",driver:"Driver age",specs:"Car specifications",seats:"seats",bags:"bags",automatic:"Automatic",manual:"Manual",ac:"A/C",benefits:"This offer includes",free:"Free cancellation",mileage:"Unlimited mileage",airport:"Airport pickup",insurance:"Clear insurance details before booking",deposit:"Deposit",none:"No deposit",daily:"Daily price",total:"Total",days:"days",day:"day",cta:"Book this car",notice:"This is a demo page for testing HandMeKey Cars. The car, price and availability are not live bookings yet.",liveNotice:"This car is published by a verified rental company on HandMeKey and can be booked through the live Cars flow.",verified:"Verified company",fuelPetrol:"Petrol",fuelDiesel:"Diesel",fuelHybrid:"Hybrid",fuelElectric:"Electric"
  };
  const fuel=car.fuel==="Petrol"?copy.fuelPetrol:car.fuel==="Diesel"?copy.fuelDiesel:car.fuel==="Hybrid"?copy.fuelHybrid:copy.fuelElectric;

  return <main className={styles.page} lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <div className="shell">
      <Link className={styles.back} href={`/cars?${backParams.toString()}`}><ArrowLeft size={16}/>{copy.back}</Link>
      <div className={isLive?styles.liveNotice:styles.demoNotice}><ShieldCheck size={18}/><div><strong>{isLive?copy.live:copy.demo}</strong><span>{isLive?copy.liveNotice:copy.notice}</span></div></div>
      <section className={styles.hero}>
        <div className={styles.media}>{car.image?<img src={car.image} alt={car.imageAlt}/>:<CarFront size={54}/>}<span className={isLive?styles.liveBadge:""}>{isLive?copy.live:copy.demo}</span></div>
        <div className={styles.info}>
          <small>{car.brand} · {car.year} · {car.category}</small><h1>{car.model}</h1><p>{copy.similar}</p>
          <div className={styles.supplier}><strong>{isLive?"✓":car.supplierRating!.toFixed(1)}</strong><span>{isLive?<ShieldCheck size={13}/>:<Star size={13}/>} {copy.supplier}<b>{car.supplier}{isLive?` · ${copy.verified}`:""}</b></span></div>
          <div className={styles.specGrid}><span><Users size={17}/><b>{car.seats}</b>{copy.seats}</span><span><BriefcaseBusiness size={17}/><b>{car.bags}</b>{copy.bags}</span><span><Gauge size={17}/>{car.transmission==="Automatic"?copy.automatic:copy.manual}</span><span><Fuel size={17}/>{fuel}</span><span><Snowflake size={17}/>{copy.ac}</span></div>
        </div>
      </section>

      <div className={styles.layout}>
        <div>
          <section className={styles.panel}><h2>{copy.period}</h2><div className={styles.tripGrid}><div><span>{copy.pickup}</span><strong><MapPin size={15}/>{pickup}</strong><small>{query.pickupDate||"—"} · {query.pickupTime||"10:00"}</small></div><div><span>{copy.dropoff}</span><strong><MapPin size={15}/>{dropoff}</strong><small>{query.returnDate||"—"} · {query.returnTime||"10:00"}</small></div><div><span>{copy.driver}</span><strong>{query.driverAge||"30-65"}</strong></div></div></section>
          <section className={styles.panel}><h2>{copy.benefits}</h2><div className={styles.benefitGrid}>{car.freeCancellation&&<span><Check size={16}/>{copy.free}</span>}{car.unlimitedMileage&&<span><Check size={16}/>{copy.mileage}</span>}{car.airportPickup&&<span><Check size={16}/>{copy.airport}</span>}<span><Check size={16}/>{copy.insurance}</span></div></section>
        </div>
        <aside className={styles.priceCard}><span>{copy.daily}</span><strong>{car.dailyPrice.toFixed(2)} {car.currency}</strong><small>{days} {days===1?copy.day:copy.days}</small><div><span>{copy.total}</span><b>{total.toFixed(2)} {car.currency}</b></div><p><CircleDollarSign size={15}/>{copy.deposit}: <b>{car.deposit===0?copy.none:`${car.deposit.toFixed(2)} ${car.currency}`}</b></p>{isLive?<><Link className={styles.liveCta} href={`/cars/${car.id}/book${backParams.size?`?${backParams.toString()}`:""}`}>{copy.cta}<ArrowUpRight size={16}/></Link><small className={styles.liveNote}>{copy.live}</small></>:<><button type="button" disabled>{copy.cta}</button><small className={styles.disabledNote}>{copy.demo}</small></>}</aside>
      </div>
    </div>
  </main>;
}

function rentalDayCount(start?:string,end?:string,startTime?:string,endTime?:string){if(!start||!end)return 1;const a=Date.parse(`${start}T${startTime||"10:00"}:00Z`);const b=Date.parse(`${end}T${endTime||"10:00"}:00Z`);const days=Math.ceil((b-a)/86400000);return Number.isFinite(days)&&days>0?days:1;}
