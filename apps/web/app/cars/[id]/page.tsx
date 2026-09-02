import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarDays, Check, CircleDollarSign, Fuel, Gauge, Info, MapPin, ShieldCheck, Snowflake, Star, Users } from "lucide-react";
import { ensureBookableDemoCar, getPublicCarVehicle, listPublicCarVehiclePhotos } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { demoCars } from "@/lib/demo-cars";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { defaultStayDates } from "@/lib/stay-dates";
import { CarGallery } from "./car-gallery";
import styles from "./car-detail.module.css";
import extraStyles from "./car-detail-extras.module.css";

export const dynamic = "force-dynamic";
export const metadata = {title:"Car details · HandMeKey Cars",description:"Review real vehicle photos, rental dates, pickup location, deposit and final rental price before booking with HandMeKey Cars.",robots:{index:false,follow:false}};

type SearchParams = Promise<{pickup?:string;dropoff?:string;pickupDate?:string;pickupTime?:string;returnDate?:string;returnTime?:string;driverAge?:string;extras?:string|string[]}>;
type ExtraKey = "child-seat"|"infant-seat"|"booster-seat"|"gps"|"additional-driver";
const EXTRA_KEYS:ExtraKey[]=["child-seat","infant-seat","booster-seat","gps","additional-driver"];

export default async function CarDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:SearchParams}) {
  const [{id},query,market]=await Promise.all([params,searchParams,requestGuestMarket()]);
  const demoCar=demoCars.find((item)=>item.id===id)??null;
  let liveCar=await getPublicCarVehicle(id).catch(()=>null);

  if(!liveCar&&demoCar){
    await ensureBookableDemoCar(demoCar).catch(()=>null);
    liveCar=await getPublicCarVehicle(id).catch(()=>null);
  }
  if(!liveCar&&!demoCar)notFound();

  const ar=market.locale==="ar";
  const isDemo=Boolean(demoCar);
  const bookingEnabled=Boolean(liveCar);
  const isLive=bookingEnabled&&!isDemo;
  const car=liveCar?{
    id:liveCar.id,brand:liveCar.brand,model:liveCar.model,year:liveCar.year,category:liveCar.category,transmission:liveCar.transmission,fuel:liveCar.fuel,seats:liveCar.seats,bags:liveCar.bags,
    supplier:liveCar.supplier,supplierRating:demoCar?.supplierRating??null as number|null,dailyPrice:liveCar.dailyPrice,deposit:liveCar.deposit,freeCancellation:liveCar.freeCancellation,unlimitedMileage:liveCar.unlimitedMileage,airportPickup:liveCar.airportPickup,
    image:liveCar.imageUrl,imageAlt:liveCar.imageAlt??`${liveCar.brand} ${liveCar.model}`,currency:liveCar.currency,
  }:{
    id:demoCar!.id,brand:demoCar!.brand,model:demoCar!.model,year:demoCar!.year,category:demoCar!.category,transmission:demoCar!.transmission,fuel:demoCar!.fuel,seats:demoCar!.seats,bags:demoCar!.bags,
    supplier:demoCar!.supplier,supplierRating:demoCar!.supplierRating,dailyPrice:demoCar!.dailyPrice,deposit:demoCar!.deposit,freeCancellation:demoCar!.freeCancellation,unlimitedMileage:demoCar!.unlimitedMileage,airportPickup:demoCar!.airportPickup,
    image:demoCar!.image,imageAlt:demoCar!.imageAlt,currency:"JOD",
  };

  const storedPhotos=liveCar?await listPublicCarVehiclePhotos(liveCar.id).catch(()=>[]):[];
  const galleryPhotos=storedPhotos.flatMap((photo)=>photo.url?[{id:photo.id,url:photo.url,alt:photo.alt||`${car.brand} ${car.model}`,category:photo.category}]:[]);
  if(galleryPhotos.length===0&&car.image)galleryPhotos.push({id:"legacy-primary",url:car.image,alt:car.imageAlt,category:"OTHER"});

  const defaults=defaultStayDates();
  const pickupDate=query.pickupDate||defaults.arrival;
  const returnDate=ensureMinReturnDate(pickupDate,query.returnDate||defaults.departure);
  const pickupTime=query.pickupTime||"10:00";
  const returnTime=query.returnTime||"10:00";
  const days=rentalDayCount(pickupDate,returnDate,pickupTime,returnTime);
  const total=car.dailyPrice*days;
  const pickup=query.pickup?.trim()||(ar?"عمّان - مطار الملكة علياء":"Amman - Queen Alia Airport");
  const dropoff=query.dropoff==="same"||!query.dropoff?pickup:query.dropoff;
  const driverAge=query.driverAge||"30-65";
  const selectedExtras=normalizeExtras(query.extras);
  const backParams=new URLSearchParams({pickup,dropoff:query.dropoff||"same",pickupDate,pickupTime,returnDate,returnTime,driverAge});

  const copy=ar?{
    demo:"حجز تجريبي فعّال",live:"حجز حي",back:"العودة لنتائج السيارات",similar:"أو سيارة مشابهة",supplier:"شركة التأجير",pickup:"الاستلام",dropoff:"التسليم",period:"فترة الإيجار",driver:"عمر السائق",specs:"مواصفات السيارة",seats:"مقاعد",bags:"حقائب",automatic:"أوتوماتيك",manual:"عادي",ac:"تكييف",benefits:"يشمل هذا العرض",free:"إلغاء مجاني",mileage:"كيلومترات غير محدودة",airport:"استلام من المطار",insurance:"تفاصيل التأمين والوديعة واضحة قبل إتمام الحجز",deposit:"الوديعة",none:"بدون وديعة",daily:"السعر لليوم",total:"الإجمالي",days:"أيام",day:"يوم",cta:"احجز هذه السيارة",notice:"هذه سيارة اختبارية، لكن الحجز نفسه فعّال داخل HandMeKey: يُحفظ في حسابك، يحصل على رقم حجز، ويُمنع الحجز المتعارض لنفس السيارة والتواريخ.",unavailable:"تعذر تجهيز مخزون الاختبار للحجز الآن. حاول تحديث الصفحة.",liveNotice:"هذه السيارة منشورة من شركة تأجير موثقة على HandMeKey ويمكن حجزها فعليًا.",verified:"شركة موثقة",testSupplier:"ملف تأجير اختباري",fuelPetrol:"بنزين",fuelDiesel:"ديزل",fuelHybrid:"هايبرد",fuelElectric:"كهرباء",security:"الوديعة والتأمين",securityBody:"قيمة الوديعة ظاهرة قبل الحجز ولا نخفيها داخل خطوات لاحقة. تفاصيل طريقة حجزها أو تحصيلها تعتمد على شركة التأجير وتظهر ضمن شروط الحجز.",depositRequired:"وديعة مطلوبة عند الاستلام",transparent:"سعر واضح قبل الحجز",supplierTitle:"مورد السيارة",supplierBody:"الشركة المسؤولة عن تسليم السيارة وتشغيل الحجز.",verifiedBy:"موثقة من HandMeKey",bookingSummary:"ملخص السعر",noHidden:"السعر المعروض لهذا الاختيار قبل أي خدمات إضافية اختيارية.",rental:"الإيجار",trust:"حجز عبر HandMeKey",photoNote:"صور حقيقية من شركة التأجير عندما تكون متاحة",extrasTitle:"إضافات الحجز",extrasEyebrow:"اختياري",extrasNote:"اختر الإضافات التي تحتاجها. توفرها ورسومها النهائية يتم تأكيدها من شركة التأجير قبل الاستلام.",extrasBadge:"حسب التوفر",childSeat:"كرسي أطفال",infantSeat:"مقعد رضيع",boosterSeat:"Booster للأطفال",gps:"جهاز GPS",additionalDriver:"سائق إضافي",requested:"طلب إضافة",minimum:"الحد الأدنى للحجز 3 أيام"
  }:{
    demo:"Bookable test car",live:"Live booking",back:"Back to car results",similar:"or similar",supplier:"Rental company",pickup:"Pick-up",dropoff:"Drop-off",period:"Rental period",driver:"Driver age",specs:"Vehicle specifications",seats:"seats",bags:"bags",automatic:"Automatic",manual:"Manual",ac:"A/C",benefits:"This offer includes",free:"Free cancellation",mileage:"Unlimited mileage",airport:"Airport pickup",insurance:"Insurance and deposit details shown before booking",deposit:"Deposit",none:"No deposit",daily:"Daily price",total:"Total",days:"days",day:"day",cta:"Book this car",notice:"This is test inventory, but the HandMeKey reservation is real: it is saved to your account, receives a booking reference, and overlapping dates for the same car are blocked.",unavailable:"The test inventory could not be prepared for booking right now. Refresh the page and try again.",liveNotice:"This car is published by a verified rental company on HandMeKey and can be booked through the live Cars flow.",verified:"Verified company",testSupplier:"Test rental profile",fuelPetrol:"Petrol",fuelDiesel:"Diesel",fuelHybrid:"Hybrid",fuelElectric:"Electric",security:"Deposit & insurance",securityBody:"The security deposit is shown before booking instead of being hidden later. The supplier's exact hold, collection and release method is presented with the booking conditions.",depositRequired:"Security deposit at pickup",transparent:"Clear price before booking",supplierTitle:"Vehicle supplier",supplierBody:"The rental company responsible for vehicle handover and operating this reservation.",verifiedBy:"Verified by HandMeKey",bookingSummary:"Price summary",noHidden:"Price shown for this selection before any optional add-ons.",rental:"Rental",trust:"Booked with HandMeKey",photoNote:"Real supplier photos when available",extrasTitle:"Booking extras",extrasEyebrow:"Optional",extrasNote:"Choose what you need. Final availability and any applicable charge are confirmed by the rental company before pickup.",extrasBadge:"Subject to availability",childSeat:"Child seat",infantSeat:"Infant seat",boosterSeat:"Child booster",gps:"GPS device",additionalDriver:"Additional driver",requested:"Request extra",minimum:"Minimum rental period is 3 days"
  };
  const fuel=car.fuel==="Petrol"?copy.fuelPetrol:car.fuel==="Diesel"?copy.fuelDiesel:car.fuel==="Hybrid"?copy.fuelHybrid:copy.fuelElectric;
  const noticeText=isDemo?(bookingEnabled?copy.notice:copy.unavailable):copy.liveNotice;
  const badgeText=isDemo?copy.demo:copy.live;
  const vehicleName=`${car.brand} ${car.model}`;
  const extraOptions:Array<{key:ExtraKey;label:string}>=[
    {key:"child-seat",label:copy.childSeat},{key:"infant-seat",label:copy.infantSeat},{key:"booster-seat",label:copy.boosterSeat},{key:"gps",label:copy.gps},{key:"additional-driver",label:copy.additionalDriver},
  ];

  return <main className={styles.page} lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <div className="shell">
      <div className={styles.topline}><Link className={styles.back} href={`/cars?${backParams.toString()}`}><ArrowLeft size={16}/>{copy.back}</Link><span className={styles.photoPromise}><ShieldCheck size={14}/>{copy.photoNote}</span></div>
      <div className={isLive?styles.liveNotice:styles.demoNotice}><ShieldCheck size={18}/><div><strong>{badgeText}</strong><span>{noticeText}</span></div></div>

      <section className={styles.gallerySection}>
        <CarGallery photos={galleryPhotos} locale={market.baseLocale} verified={isLive} vehicleName={vehicleName}/>
      </section>

      <section className={styles.identityCard}>
        <div className={styles.identityMain}><span className={styles.kicker}>{car.brand} · {car.year} · {car.category}</span><div className={styles.titleRow}><div><h1>{car.model}</h1><p>{copy.similar}</p></div><span className={styles.availabilityBadge}><BadgeCheck size={14}/>{badgeText}</span></div>
          <div className={styles.specGrid}><span><Users size={18}/><b>{car.seats}</b>{copy.seats}</span><span><BriefcaseBusiness size={18}/><b>{car.bags}</b>{copy.bags}</span><span><Gauge size={18}/>{car.transmission==="Automatic"?copy.automatic:copy.manual}</span><span><Fuel size={18}/>{fuel}</span><span><Snowflake size={18}/>{copy.ac}</span></div>
        </div>
        <div className={styles.supplierSummary}><span>{copy.supplier}</span><strong>{car.supplier}</strong><small>{isDemo?copy.testSupplier:isLive?copy.verifiedBy:""}</small><div>{car.supplierRating?<><Star size={13}/><b>{car.supplierRating.toFixed(1)}</b></>:<><ShieldCheck size={14}/><b>{copy.verified}</b></>}</div></div>
      </section>

      <form className={extraStyles.bookingForm} action={`/cars/${car.id}/book`} method="get">
        <input type="hidden" name="pickup" value={pickup}/><input type="hidden" name="dropoff" value={query.dropoff||"same"}/><input type="hidden" name="pickupDate" value={pickupDate}/><input type="hidden" name="pickupTime" value={pickupTime}/><input type="hidden" name="returnDate" value={returnDate}/><input type="hidden" name="returnTime" value={returnTime}/><input type="hidden" name="driverAge" value={driverAge}/>
        <div className={styles.contentStack}>
          <section className={styles.panel}><div className={styles.sectionHead}><span><CalendarDays size={18}/></span><div><small>{copy.rental}</small><h2>{copy.period}</h2></div></div><div className={styles.tripGrid}><div><span>{copy.pickup}</span><strong><MapPin size={16}/>{pickup}</strong><small>{pickupDate} · {pickupTime}</small></div><div><span>{copy.dropoff}</span><strong><MapPin size={16}/>{dropoff}</strong><small>{returnDate} · {returnTime}</small></div><div><span>{copy.driver}</span><strong>{driverAge}</strong></div></div><div className={extraStyles.minimumNote}><CalendarDays size={14}/>{copy.minimum}</div></section>

          <section className={extraStyles.extrasPanel}><div className={extraStyles.extrasHead}><div><small>{copy.extrasEyebrow}</small><h2>{copy.extrasTitle}</h2></div><span className={extraStyles.extrasBadge}><ShieldCheck size={13}/>{copy.extrasBadge}</span></div><p className={extraStyles.extrasNote}><Info size={15}/><span>{copy.extrasNote}</span></p><div className={extraStyles.extraGrid}>{extraOptions.map((item)=><label className={extraStyles.extraChoice} key={item.key}><input type="checkbox" name="extras" value={item.key} defaultChecked={selectedExtras.includes(item.key)}/><span className={extraStyles.extraCheck}><Check size={14}/></span><span className={extraStyles.extraCopy}><strong>{item.label}</strong><span>{copy.requested}</span></span></label>)}</div></section>

          <section className={styles.panel}><div className={styles.sectionHead}><span><Check size={18}/></span><div><small>{copy.transparent}</small><h2>{copy.benefits}</h2></div></div><div className={styles.benefitGrid}>{car.freeCancellation&&<span><Check size={16}/>{copy.free}</span>}{car.unlimitedMileage&&<span><Check size={16}/>{copy.mileage}</span>}{car.airportPickup&&<span><Check size={16}/>{copy.airport}</span>}<span><Check size={16}/>{copy.insurance}</span></div></section>

          <section className={styles.panel}><div className={styles.sectionHead}><span><ShieldCheck size={18}/></span><div><small>{copy.transparent}</small><h2>{copy.security}</h2></div></div><div className={styles.securityGrid}><div><span>{copy.deposit}</span><strong>{car.deposit===0?copy.none:money(car.deposit,car.currency)}</strong><small>{car.deposit>0?copy.depositRequired:copy.none}</small></div><p><Info size={16}/><span>{copy.securityBody}</span></p></div></section>

          <section className={styles.supplierCard}><div className={styles.supplierIcon}><ShieldCheck size={23}/></div><div><span className={styles.kicker}>{copy.supplierTitle}</span><h2>{car.supplier}</h2><p>{copy.supplierBody}</p><div className={styles.supplierTrust}><BadgeCheck size={15}/><strong>{isLive?copy.verifiedBy:isDemo?copy.testSupplier:copy.supplier}</strong></div></div></section>
        </div>

        <aside className={styles.priceCard}>
          <span className={styles.priceEyebrow}>{copy.bookingSummary}</span><div className={styles.dailyPrice}><span>{copy.daily}</span><strong>{money(car.dailyPrice,car.currency)}</strong><small>{days} {days===1?copy.day:copy.days}</small></div>
          <div className={styles.priceLine}><span>{copy.total}</span><b>{money(total,car.currency)}</b></div>
          <div className={styles.depositLine}><CircleDollarSign size={16}/><span>{copy.deposit}</span><b>{car.deposit===0?copy.none:money(car.deposit,car.currency)}</b></div>
          <p className={styles.noHidden}>{copy.noHidden}</p>
          {bookingEnabled?<><button className={extraStyles.bookingSubmit} type="submit">{copy.cta}<ArrowUpRight size={17}/></button><small className={styles.liveNote}><ShieldCheck size={12}/>{copy.trust}</small></>:<><button type="button" disabled>{copy.cta}</button><small className={styles.disabledNote}>{copy.unavailable}</small></>}
        </aside>
      </form>
    </div>
  </main>;
}

function normalizeExtras(value:string|string[]|undefined):ExtraKey[]{const values=Array.isArray(value)?value:value?[value]:[];return values.filter((item):item is ExtraKey=>EXTRA_KEYS.includes(item as ExtraKey));}
function ensureMinReturnDate(pickupDate:string,requestedReturnDate:string){const minimum=addDays(pickupDate,3);return requestedReturnDate>=minimum?requestedReturnDate:minimum;}
function addDays(value:string,days:number){const [year,month,day]=value.split("-").map(Number);const date=new Date(Date.UTC(year||1970,(month||1)-1,(day||1)+days));return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;}
function rentalDayCount(start:string,end:string,startTime:string,endTime:string){const a=Date.parse(`${start}T${startTime}:00Z`);const b=Date.parse(`${end}T${endTime}:00Z`);const days=Math.ceil((b-a)/86400000);return Number.isFinite(days)&&days>=3?days:3;}
function money(value:number,currency:string){return `${currency} ${value.toFixed(2)}`;}
