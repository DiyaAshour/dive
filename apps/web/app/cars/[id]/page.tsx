import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarDays, Check, CircleDollarSign, Fuel, Gauge, Info, MapPin, ShieldCheck, Snowflake, Star, Users } from "lucide-react";
import { ensureBookableDemoCar, getPublicCarVehicle, listPublicCarVehiclePhotos } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { demoCars } from "@/lib/demo-cars";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { CarGallery } from "./car-gallery";
import styles from "./car-detail.module.css";

export const dynamic = "force-dynamic";
export const metadata = {title:"Car details · HandMeKey Cars",description:"Review real vehicle photos, rental dates, pickup location, deposit and final rental price before booking with HandMeKey Cars.",robots:{index:false,follow:false}};

type SearchParams = Promise<{pickup?:string;dropoff?:string;pickupDate?:string;pickupTime?:string;returnDate?:string;returnTime?:string;driverAge?:string}>;

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

  const days=rentalDayCount(query.pickupDate,query.returnDate,query.pickupTime,query.returnTime);
  const total=car.dailyPrice*days;
  const pickup=query.pickup?.trim()||(ar?"عمّان - مطار الملكة علياء":"Amman - Queen Alia Airport");
  const dropoff=query.dropoff==="same"||!query.dropoff?pickup:query.dropoff;
  const backParams=new URLSearchParams();
  Object.entries(query).forEach(([key,value])=>{if(value)backParams.set(key,value);});
  const copy=ar?{
    demo:"حجز تجريبي فعّال",live:"حجز حي",back:"العودة لنتائج السيارات",similar:"أو سيارة مشابهة",supplier:"شركة التأجير",pickup:"الاستلام",dropoff:"التسليم",period:"فترة الإيجار",driver:"عمر السائق",specs:"مواصفات السيارة",seats:"مقاعد",bags:"حقائب",automatic:"أوتوماتيك",manual:"عادي",ac:"تكييف",benefits:"يشمل هذا العرض",free:"إلغاء مجاني",mileage:"كيلومترات غير محدودة",airport:"استلام من المطار",insurance:"تفاصيل التأمين والوديعة واضحة قبل إتمام الحجز",deposit:"الوديعة",none:"بدون وديعة",daily:"السعر لليوم",total:"الإجمالي",days:"أيام",day:"يوم",cta:"احجز هذه السيارة",notice:"هذه سيارة اختبارية، لكن الحجز نفسه فعّال داخل HandMeKey: يُحفظ في حسابك، يحصل على رقم حجز، ويُمنع الحجز المتعارض لنفس السيارة والتواريخ.",unavailable:"تعذر تجهيز مخزون الاختبار للحجز الآن. حاول تحديث الصفحة.",liveNotice:"هذه السيارة منشورة من شركة تأجير موثقة على HandMeKey ويمكن حجزها فعليًا.",verified:"شركة موثقة",testSupplier:"ملف تأجير اختباري",fuelPetrol:"بنزين",fuelDiesel:"ديزل",fuelHybrid:"هايبرد",fuelElectric:"كهرباء",security:"الوديعة والتأمين",securityBody:"قيمة الوديعة ظاهرة قبل الحجز ولا نخفيها داخل خطوات لاحقة. تفاصيل طريقة حجزها أو تحصيلها تعتمد على شركة التأجير وتظهر ضمن شروط الحجز.",depositRequired:"وديعة مطلوبة عند الاستلام",transparent:"سعر واضح قبل الحجز",supplierTitle:"مورد السيارة",supplierBody:"الشركة المسؤولة عن تسليم السيارة وتشغيل الحجز.",verifiedBy:"موثقة من HandMeKey",bookingSummary:"ملخص السعر",noHidden:"السعر المعروض لهذا الاختيار قبل أي خدمات إضافية اختيارية.",rental:"الإيجار",trust:"حجز عبر HandMeKey",photoNote:"صور حقيقية من شركة التأجير عندما تكون متاحة"
  }:{
    demo:"Bookable test car",live:"Live booking",back:"Back to car results",similar:"or similar",supplier:"Rental company",pickup:"Pick-up",dropoff:"Drop-off",period:"Rental period",driver:"Driver age",specs:"Vehicle specifications",seats:"seats",bags:"bags",automatic:"Automatic",manual:"Manual",ac:"A/C",benefits:"This offer includes",free:"Free cancellation",mileage:"Unlimited mileage",airport:"Airport pickup",insurance:"Insurance and deposit details shown before booking",deposit:"Deposit",none:"No deposit",daily:"Daily price",total:"Total",days:"days",day:"day",cta:"Book this car",notice:"This is test inventory, but the HandMeKey reservation is real: it is saved to your account, receives a booking reference, and overlapping dates for the same car are blocked.",unavailable:"The test inventory could not be prepared for booking right now. Refresh the page and try again.",liveNotice:"This car is published by a verified rental company on HandMeKey and can be booked through the live Cars flow.",verified:"Verified company",testSupplier:"Test rental profile",fuelPetrol:"Petrol",fuelDiesel:"Diesel",fuelHybrid:"Hybrid",fuelElectric:"Electric",security:"Deposit & insurance",securityBody:"The security deposit is shown before booking instead of being hidden later. The supplier's exact hold, collection and release method is presented with the booking conditions.",depositRequired:"Security deposit at pickup",transparent:"Clear price before booking",supplierTitle:"Vehicle supplier",supplierBody:"The rental company responsible for vehicle handover and operating this reservation.",verifiedBy:"Verified by HandMeKey",bookingSummary:"Price summary",noHidden:"Price shown for this selection before any optional add-ons.",rental:"Rental",trust:"Booked with HandMeKey",photoNote:"Real supplier photos when available"
  };
  const fuel=car.fuel==="Petrol"?copy.fuelPetrol:car.fuel==="Diesel"?copy.fuelDiesel:car.fuel==="Hybrid"?copy.fuelHybrid:copy.fuelElectric;
  const noticeText=isDemo?(bookingEnabled?copy.notice:copy.unavailable):copy.liveNotice;
  const badgeText=isDemo?copy.demo:copy.live;
  const vehicleName=`${car.brand} ${car.model}`;

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

      <div className={styles.layout}>
        <div className={styles.contentStack}>
          <section className={styles.panel}><div className={styles.sectionHead}><span><CalendarDays size={18}/></span><div><small>{copy.rental}</small><h2>{copy.period}</h2></div></div><div className={styles.tripGrid}><div><span>{copy.pickup}</span><strong><MapPin size={16}/>{pickup}</strong><small>{query.pickupDate||"—"} · {query.pickupTime||"10:00"}</small></div><div><span>{copy.dropoff}</span><strong><MapPin size={16}/>{dropoff}</strong><small>{query.returnDate||"—"} · {query.returnTime||"10:00"}</small></div><div><span>{copy.driver}</span><strong>{query.driverAge||"30-65"}</strong></div></div></section>

          <section className={styles.panel}><div className={styles.sectionHead}><span><Check size={18}/></span><div><small>{copy.transparent}</small><h2>{copy.benefits}</h2></div></div><div className={styles.benefitGrid}>{car.freeCancellation&&<span><Check size={16}/>{copy.free}</span>}{car.unlimitedMileage&&<span><Check size={16}/>{copy.mileage}</span>}{car.airportPickup&&<span><Check size={16}/>{copy.airport}</span>}<span><Check size={16}/>{copy.insurance}</span></div></section>

          <section className={styles.panel}><div className={styles.sectionHead}><span><ShieldCheck size={18}/></span><div><small>{copy.transparent}</small><h2>{copy.security}</h2></div></div><div className={styles.securityGrid}><div><span>{copy.deposit}</span><strong>{car.deposit===0?copy.none:money(car.deposit,car.currency)}</strong><small>{car.deposit>0?copy.depositRequired:copy.none}</small></div><p><Info size={16}/><span>{copy.securityBody}</span></p></div></section>

          <section className={styles.supplierCard}><div className={styles.supplierIcon}><ShieldCheck size={23}/></div><div><span className={styles.kicker}>{copy.supplierTitle}</span><h2>{car.supplier}</h2><p>{copy.supplierBody}</p><div className={styles.supplierTrust}><BadgeCheck size={15}/><strong>{isLive?copy.verifiedBy:isDemo?copy.testSupplier:copy.supplier}</strong></div></div></section>
        </div>

        <aside className={styles.priceCard}>
          <span className={styles.priceEyebrow}>{copy.bookingSummary}</span><div className={styles.dailyPrice}><span>{copy.daily}</span><strong>{money(car.dailyPrice,car.currency)}</strong><small>{days} {days===1?copy.day:copy.days}</small></div>
          <div className={styles.priceLine}><span>{copy.total}</span><b>{money(total,car.currency)}</b></div>
          <div className={styles.depositLine}><CircleDollarSign size={16}/><span>{copy.deposit}</span><b>{car.deposit===0?copy.none:money(car.deposit,car.currency)}</b></div>
          <p className={styles.noHidden}>{copy.noHidden}</p>
          {bookingEnabled?<><Link className={styles.liveCta} href={`/cars/${car.id}/book${backParams.size?`?${backParams.toString()}`:""}`}>{copy.cta}<ArrowUpRight size={17}/></Link><small className={styles.liveNote}><ShieldCheck size={12}/>{copy.trust}</small></>:<><button type="button" disabled>{copy.cta}</button><small className={styles.disabledNote}>{copy.unavailable}</small></>}
        </aside>
      </div>
    </div>
  </main>;
}

function rentalDayCount(start?:string,end?:string,startTime?:string,endTime?:string){if(!start||!end)return 1;const a=Date.parse(`${start}T${startTime||"10:00"}:00Z`);const b=Date.parse(`${end}T${endTime||"10:00"}:00Z`);const days=Math.ceil((b-a)/86400000);return Number.isFinite(days)&&days>0?days:1;}
function money(value:number,currency:string){return `${currency} ${value.toFixed(2)}`;}
