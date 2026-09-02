import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CarFront, Check, Clock3, MapPin, ReceiptText, ShieldCheck, UserRound } from "lucide-react";
import { ensureBookableDemoCar, getPublicCarVehicle } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { CarReservationForm } from "@/components/car-reservation-form";
import { demoCars } from "@/lib/demo-cars";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import { defaultStayDates } from "@/lib/stay-dates";
import styles from "./car-booking-checkout.module.css";

export const dynamic="force-dynamic";
export const metadata={title:"Book a Car · HandMeKey Cars",robots:{index:false,follow:false}};

type ExtraKey="child-seat"|"infant-seat"|"booster-seat"|"gps"|"additional-driver";
const EXTRA_KEYS:ExtraKey[]=["child-seat","infant-seat","booster-seat","gps","additional-driver"];
type SearchParams=Promise<{pickup?:string;dropoff?:string;pickupDate?:string;pickupTime?:string;returnDate?:string;returnTime?:string;driverAge?:string;extras?:string|string[]}>;

export default async function CarBookingCheckoutPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:SearchParams}){
  const [{id},query,market,user]=await Promise.all([params,searchParams,requestGuestMarket(),currentUser()]);
  const defaults=defaultStayDates();
  const pickupDate=query.pickupDate||defaults.arrival;
  const returnDate=ensureMinReturnDate(pickupDate,query.returnDate||defaults.departure);
  const pickupTime=query.pickupTime||"10:00";
  const returnTime=query.returnTime||"10:00";
  const driverAge=query.driverAge||"30-65";
  const extras=normalizeExtras(query.extras);
  const backQuery=new URLSearchParams();
  if(query.pickup)backQuery.set("pickup",query.pickup);
  if(query.dropoff)backQuery.set("dropoff",query.dropoff);
  backQuery.set("pickupDate",pickupDate);backQuery.set("pickupTime",pickupTime);backQuery.set("returnDate",returnDate);backQuery.set("returnTime",returnTime);backQuery.set("driverAge",driverAge);
  extras.forEach((extra)=>backQuery.append("extras",extra));
  const currentPath=`/cars/${id}/book?${backQuery.toString()}`;
  if(!user)redirect(`/login?next=${encodeURIComponent(currentPath)}`);

  const demoCar=demoCars.find((item)=>item.id===id)??null;
  let car=await getPublicCarVehicle(id).catch(()=>null);
  if(!car&&demoCar){
    await ensureBookableDemoCar(demoCar);
    car=await getPublicCarVehicle(id);
  }
  if(!car)notFound();

  const days=rentalDayCount(pickupDate,returnDate,pickupTime,returnTime);
  const subtotal=car.dailyPrice*days;
  const ar=market.baseLocale==="ar";
  const isDemo=Boolean(demoCar);
  const copy=ar?{
    back:"العودة إلى السيارة",eyebrow:"HANDMEKEY CARS · SECURE BOOKING",title:"تأكيد حجز السيارة",body:"راجع تفاصيل الإيجار ثم أكّد الحجز. السعر والوديعة وشروط الاستلام ظاهرة قبل التأكيد.",driver:"بيانات السائق الرئيسي",pickup:"الاستلام",return:"التسليم",pickupLocation:"موقع الاستلام",returnLocation:"موقع التسليم",duration:"مدة الإيجار",perDay:"السعر اليومي",subtotal:"إجمالي الإيجار",fees:"رسوم إلزامية إضافية",deposit:"الوديعة",total:"الإجمالي",summary:"ملخص السعر",days:"أيام",day:"يوم",pay:"الدفع عند مكتب التأجير",verified:"شركة تأجير موثقة",test:"حجز اختباري فعّال",free:"إلغاء مجاني حسب شروط العرض",mileage:"كيلومترات غير محدودة",clear:"السعر النهائي ظاهر قبل التأكيد",noLocation:"لا يوجد موقع استلام فعال لهذه الشركة حاليًا.",priceNote:"المبلغ المعروض قبل أي رسوم لإضافات اختيارية قد تؤكدها شركة التأجير.",demoNotice:"هذا مخزون اختباري، لكن عند التأكيد سيتم إنشاء حجز فعلي داخل حسابك برقم حجز وحالة مؤكدة. لن يتم تحصيل دفعة إلكترونية أو إرسال الطلب لشركة تأجير خارجية.",extrasTitle:"الإضافات المطلوبة",extrasPending:"تخضع للتوفر والتأكيد من شركة التأجير",minimum:"الحد الأدنى للحجز 3 أيام",childSeat:"كرسي أطفال",infantSeat:"مقعد رضيع",boosterSeat:"Booster للأطفال",gps:"جهاز GPS",additionalDriver:"سائق إضافي"
  }:{
    back:"Back to vehicle",eyebrow:"HANDMEKEY CARS · SECURE BOOKING",title:"Confirm your car booking",body:"Review the rental details and confirm. Pricing, deposit and pickup terms are visible before confirmation.",driver:"Main driver details",pickup:"Pick-up",return:"Return",pickupLocation:"Pick-up location",returnLocation:"Return location",duration:"Rental duration",perDay:"Daily rate",subtotal:"Rental subtotal",fees:"Mandatory additional fees",deposit:"Deposit",total:"Total",summary:"Price summary",days:"days",day:"day",pay:"Pay at rental counter",verified:"Verified rental company",test:"Bookable test inventory",free:"Free cancellation subject to offer terms",mileage:"Unlimited mileage",clear:"Final price shown before confirmation",noLocation:"This rental company currently has no active pickup location.",priceNote:"Price shown before any optional-extra charges confirmed by the rental company.",demoNotice:"This is test inventory, but confirming it creates a real HandMeKey reservation in your account with a booking reference and confirmed status. No online charge is taken and no external rental company is contacted.",extrasTitle:"Requested extras",extrasPending:"Subject to availability and rental-company confirmation",minimum:"Minimum rental period is 3 days",childSeat:"Child seat",infantSeat:"Infant seat",boosterSeat:"Child booster",gps:"GPS device",additionalDriver:"Additional driver"
  };
  const location=car.homeLocation??car.locations[0]??null;
  const locationText=location?`${location.name} · ${location.city}${location.airportCode?` (${location.airportCode})`:""}`:"—";
  const durationLabel=`${days} ${days===1?copy.day:copy.days}`;
  const totalValue=`${subtotal.toFixed(2)} ${car.currency}`;

  return <main className={styles.page} dir={market.direction} lang={market.intlLocale}>
    <CustomerHeader/>
    <div className="shell">
      <Link className={styles.back} href={`/cars/${id}?${backQuery.toString()}`}><ArrowLeft size={15}/>{copy.back}</Link>
      <header className={styles.head}><span>{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.body}</p></header>
      {isDemo&&<div className={styles.notice}><ShieldCheck size={17}/><span>{copy.demoNotice}</span></div>}

      <div className={styles.layout}>
        <section className={styles.card}>
          <div className={styles.vehicle}>
            <div className={styles.vehicleMedia}>{car.imageUrl?<img src={car.imageUrl} alt={car.imageAlt??`${car.brand} ${car.model}`}/>:<CarFront size={34}/>}</div>
            <div className={styles.vehicleCopy}><h3>{car.brand} {car.model}</h3><p>{car.category} · {car.transmission} · {car.year}</p><span className={styles.verified}><ShieldCheck size={13}/>{car.supplier}</span><span className={styles.inventoryBadge}><Check size={12}/>{isDemo?copy.test:copy.verified}</span></div>
          </div>

          <div className={styles.period}>
            <div className={styles.periodItem}><CalendarDays size={18}/><span><small>{copy.pickup}</small><strong>{pickupDate} · {pickupTime}</strong><em>{locationText}</em></span></div>
            <div className={styles.periodItem}><CalendarDays size={18}/><span><small>{copy.return}</small><strong>{returnDate} · {returnTime}</strong><em>{locationText}</em></span></div>
          </div>

          <div className={styles.quickFacts}>
            <div><MapPin size={16}/><span><small>{copy.pickupLocation}</small><strong>{locationText}</strong></span></div>
            <div><UserRound size={16}/><span><small>{copy.driver}</small><strong>{driverAge}</strong></span></div>
            <div><Clock3 size={16}/><span><small>{copy.duration}</small><strong>{durationLabel}</strong></span></div>
          </div>

          <div className={styles.notice}><CalendarDays size={15}/><span>{copy.minimum}</span></div>
          {extras.length>0&&<div className={styles.notice}><Check size={15}/><span><strong>{copy.extrasTitle}: </strong>{extras.map((extra)=>extraLabel(extra,copy)).join(" · ")}<br/>{copy.extrasPending}</span></div>}

          <div className={styles.driverHead}><UserRound size={19}/><h2>{copy.driver}</h2></div>
          {car.locations.length>0?<CarReservationForm locale={market.baseLocale} vehicleId={car.id} pickupDate={pickupDate} pickupTime={pickupTime} returnDate={returnDate} returnTime={returnTime} driverAgeRange={driverAge} extras={extras} defaultName={user.displayName} defaultEmail={user.email} locations={car.locations} totalLabel={copy.total} totalValue={totalValue} durationLabel={durationLabel} {...(car.homeLocation?.id?{defaultLocationId:car.homeLocation.id}:{})}/>:<div className={styles.notice}>{copy.noLocation}</div>}
        </section>

        <aside className={styles.aside}>
          <div className={styles.price}>
            <div className={styles.priceHeading}><ReceiptText size={18}/><strong>{copy.summary}</strong></div>
            <div className={styles.priceTop}><span>{copy.perDay}</span><strong>{car.dailyPrice.toFixed(2)} {car.currency}</strong><small>{durationLabel}</small></div>
            <div className={styles.rows}><Row label={copy.subtotal} value={`${subtotal.toFixed(2)} ${car.currency}`}/><Row label={copy.fees} value={`0.00 ${car.currency}`}/><Row label={copy.deposit} value={`${car.deposit.toFixed(2)} ${car.currency}`}/><div className={`${styles.row} ${styles.total}`}><span>{copy.total}</span><strong>{totalValue}</strong></div></div>
            <p className={styles.priceNote}>{copy.priceNote}</p>
            <div className={styles.terms}><span><Check size={13}/>{copy.pay}</span>{car.freeCancellation&&<span><Check size={13}/>{copy.free}</span>}{car.unlimitedMileage&&<span><Check size={13}/>{copy.mileage}</span>}<span><Check size={13}/>{copy.clear}</span></div>
          </div>
        </aside>
      </div>
    </div>
  </main>;
}

function Row({label,value}:{label:string;value:string}){return <div className={styles.row}><span>{label}</span><strong>{value}</strong></div>}
function normalizeExtras(value:string|string[]|undefined):ExtraKey[]{const values=Array.isArray(value)?value:value?[value]:[];return values.filter((item):item is ExtraKey=>EXTRA_KEYS.includes(item as ExtraKey));}
function extraLabel(extra:ExtraKey,copy:any){if(extra==="child-seat")return copy.childSeat;if(extra==="infant-seat")return copy.infantSeat;if(extra==="booster-seat")return copy.boosterSeat;if(extra==="gps")return copy.gps;return copy.additionalDriver;}
function ensureMinReturnDate(pickupDate:string,requestedReturnDate:string){const minimum=addDays(pickupDate,3);return requestedReturnDate>=minimum?requestedReturnDate:minimum;}
function addDays(value:string,days:number){const [year,month,day]=value.split("-").map(Number);const date=new Date(Date.UTC(year||1970,(month||1)-1,(day||1)+days));return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;}
function rentalDayCount(startDate:string,endDate:string,startTime:string,endTime:string){const start=Date.parse(`${startDate}T${startTime}:00Z`);const end=Date.parse(`${endDate}T${endTime}:00Z`);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 3;return Math.max(3,Math.ceil((end-start)/86_400_000));}
