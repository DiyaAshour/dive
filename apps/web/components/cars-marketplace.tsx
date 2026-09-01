"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, Car, Check, ChevronDown, CircleDollarSign, Fuel, Gauge, MapPin, Search, ShieldCheck, SlidersHorizontal, Snowflake, Star, Users, X } from "lucide-react";
import { demoCars, type DemoCar } from "@/lib/demo-cars";
import styles from "./cars-marketplace.module.css";

type Locale = "ar" | "en";
export type CarSearchValues = Readonly<{
  pickup: string;
  dropoff: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  driverAge: string;
}>;

type Props = Readonly<{locale: Locale; initialSearch: CarSearchValues}>;

type SortValue = "recommended"|"priceAsc"|"priceDesc"|"rating"|"seats";

export function CarsMarketplace({locale, initialSearch}: Props) {
  const ar = locale === "ar";
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [supplier, setSupplier] = useState("");
  const [minSeats, setMinSeats] = useState(0);
  const [maxPrice, setMaxPrice] = useState(160);
  const [freeCancellation, setFreeCancellation] = useState(false);
  const [unlimitedMileage, setUnlimitedMileage] = useState(false);
  const [airportPickup, setAirportPickup] = useState(false);
  const [zeroDeposit, setZeroDeposit] = useState(false);
  const [sort, setSort] = useState<SortValue>("recommended");
  const [visible, setVisible] = useState(18);

  const copy = ar ? {
    demo: "بيانات تجريبية",
    demoBody: "السيارات والأسعار والموردون في هذه الصفحة Demo لاختبار تجربة HandMeKey Cars. الصور صور سيارات حقيقية وليست رسومات، لكن التوفر والأسعار ليست حجوزات حية بعد.",
    title: "اختر السيارة المناسبة لرحلتك",
    found: "سيارة متاحة في العرض التجريبي",
    searchCar: "ابحث باسم السيارة أو الماركة",
    filters: "الفلاتر",
    reset: "إعادة ضبط",
    category: "نوع السيارة",
    brand: "الماركة",
    transmission: "ناقل الحركة",
    fuel: "الوقود",
    supplier: "شركة التأجير",
    seats: "الحد الأدنى للمقاعد",
    maxPrice: "أقصى سعر لليوم",
    any: "الكل",
    automatic: "أوتوماتيك",
    manual: "عادي",
    petrol: "بنزين",
    diesel: "ديزل",
    hybrid: "هايبرد",
    electric: "كهرباء",
    freeCancellation: "إلغاء مجاني",
    unlimitedMileage: "كيلومترات غير محدودة",
    airportPickup: "استلام من المطار",
    zeroDeposit: "بدون وديعة",
    sort: "ترتيب حسب",
    recommended: "الموصى به",
    lowPrice: "السعر: الأقل أولاً",
    highPrice: "السعر: الأعلى أولاً",
    rating: "تقييم المورد",
    seatSort: "عدد المقاعد",
    perDay: "لليوم",
    total: "الإجمالي التجريبي",
    days: "أيام",
    day: "يوم",
    deposit: "الوديعة",
    noDeposit: "بدون وديعة",
    freeCancel: "إلغاء مجاني",
    unlimited: "غير محدود",
    airport: "المطار",
    seatsLabel: "مقاعد",
    bags: "حقائب",
    ac: "تكييف",
    details: "شاهد التفاصيل",
    orSimilar: "أو سيارة مشابهة",
    noResults: "لا توجد سيارات تطابق هذه الفلاتر.",
    noResultsBody: "جرّب رفع حد السعر أو إزالة بعض الفلاتر.",
    showMore: "عرض سيارات أكثر",
    searchSummary: "تفاصيل البحث",
    pickup: "الاستلام",
    dropoff: "التسليم",
    changeSearch: "تعديل البحث",
    driverAge: "عمر السائق",
  } : {
    demo: "Demo data",
    demoBody: "Cars, prices and suppliers on this page are demo data for testing HandMeKey Cars. Photos are real car photography, but availability and prices are not live bookings yet.",
    title: "Choose the right car for your trip",
    found: "cars available in the demo",
    searchCar: "Search car or brand",
    filters: "Filters",
    reset: "Reset",
    category: "Car type",
    brand: "Brand",
    transmission: "Transmission",
    fuel: "Fuel",
    supplier: "Rental company",
    seats: "Minimum seats",
    maxPrice: "Maximum daily price",
    any: "Any",
    automatic: "Automatic",
    manual: "Manual",
    petrol: "Petrol",
    diesel: "Diesel",
    hybrid: "Hybrid",
    electric: "Electric",
    freeCancellation: "Free cancellation",
    unlimitedMileage: "Unlimited mileage",
    airportPickup: "Airport pickup",
    zeroDeposit: "Zero deposit",
    sort: "Sort by",
    recommended: "Recommended",
    lowPrice: "Price: low to high",
    highPrice: "Price: high to low",
    rating: "Supplier rating",
    seatSort: "Seats",
    perDay: "per day",
    total: "Demo total",
    days: "days",
    day: "day",
    deposit: "Deposit",
    noDeposit: "No deposit",
    freeCancel: "Free cancellation",
    unlimited: "Unlimited",
    airport: "Airport",
    seatsLabel: "seats",
    bags: "bags",
    ac: "A/C",
    details: "View details",
    orSimilar: "or similar",
    noResults: "No cars match these filters.",
    noResultsBody: "Try increasing the maximum price or removing a filter.",
    showMore: "Show more cars",
    searchSummary: "Search details",
    pickup: "Pick-up",
    dropoff: "Drop-off",
    changeSearch: "Change search",
    driverAge: "Driver age",
  };

  const brands = useMemo(() => unique(demoCars.map((car) => car.brand)), []);
  const categories = useMemo(() => unique(demoCars.map((car) => car.category)), []);
  const fuels = useMemo(() => unique(demoCars.map((car) => car.fuel)), []);
  const suppliers = useMemo(() => unique(demoCars.map((car) => car.supplier)), []);
  const rentalDays = rentalDayCount(initialSearch.pickupDate, initialSearch.returnDate);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = demoCars.filter((car) => {
      const searchable = `${car.brand} ${car.model} ${car.category} ${car.supplier}`.toLowerCase();
      if (normalized && !searchable.includes(normalized)) return false;
      if (brand && car.brand !== brand) return false;
      if (category && car.category !== category) return false;
      if (fuel && car.fuel !== fuel) return false;
      if (transmission && car.transmission !== transmission) return false;
      if (supplier && car.supplier !== supplier) return false;
      if (minSeats && car.seats < minSeats) return false;
      if (car.dailyPrice > maxPrice) return false;
      if (freeCancellation && !car.freeCancellation) return false;
      if (unlimitedMileage && !car.unlimitedMileage) return false;
      if (airportPickup && !car.airportPickup) return false;
      if (zeroDeposit && car.deposit !== 0) return false;
      return true;
    });
    return [...filtered].sort((a,b) => {
      if (sort === "priceAsc") return a.dailyPrice-b.dailyPrice;
      if (sort === "priceDesc") return b.dailyPrice-a.dailyPrice;
      if (sort === "rating") return b.supplierRating-a.supplierRating;
      if (sort === "seats") return b.seats-a.seats;
      return score(b)-score(a);
    });
  }, [query,brand,category,fuel,transmission,supplier,minSeats,maxPrice,freeCancellation,unlimitedMileage,airportPickup,zeroDeposit,sort]);

  function resetFilters() {
    setQuery(""); setBrand(""); setCategory(""); setFuel(""); setTransmission(""); setSupplier("");
    setMinSeats(0); setMaxPrice(160); setFreeCancellation(false); setUnlimitedMileage(false); setAirportPickup(false); setZeroDeposit(false); setSort("recommended"); setVisible(18);
  }

  return <>
    <div className={styles.demoNotice}><div><span>{copy.demo}</span><p>{copy.demoBody}</p></div><ShieldCheck size={22}/></div>

    <section className={styles.searchSummary}>
      <div><span>{copy.pickup}</span><strong><MapPin size={15}/>{initialSearch.pickup}</strong></div>
      <div><span>{copy.dropoff}</span><strong>{initialSearch.dropoff === "same" ? initialSearch.pickup : initialSearch.dropoff}</strong></div>
      <div><span>{copy.searchSummary}</span><strong>{initialSearch.pickupDate} {initialSearch.pickupTime} → {initialSearch.returnDate} {initialSearch.returnTime}</strong></div>
      <div><span>{copy.driverAge}</span><strong>{initialSearch.driverAge}</strong></div>
      <Link href="/?service=cars">{copy.changeSearch}</Link>
    </section>

    <div className={styles.headingRow}>
      <div><h1>{copy.title}</h1><p><strong>{results.length}</strong> {copy.found}</p></div>
      <label className={styles.sortControl}><span>{copy.sort}</span><select value={sort} onChange={(event)=>setSort(event.target.value as SortValue)}><option value="recommended">{copy.recommended}</option><option value="priceAsc">{copy.lowPrice}</option><option value="priceDesc">{copy.highPrice}</option><option value="rating">{copy.rating}</option><option value="seats">{copy.seatSort}</option></select><ChevronDown size={15}/></label>
    </div>

    <div className={styles.marketLayout}>
      <aside className={styles.filters}>
        <div className={styles.filterHead}><strong><SlidersHorizontal size={17}/>{copy.filters}</strong><button type="button" onClick={resetFilters}>{copy.reset}</button></div>
        <label className={styles.carSearch}><Search size={16}/><input value={query} onChange={(event)=>{setQuery(event.target.value);setVisible(18);}} placeholder={copy.searchCar}/>{query&&<button type="button" onClick={()=>setQuery("")}><X size={14}/></button>}</label>
        <FilterSelect label={copy.category} value={category} onChange={setCategory} options={categories.map((value)=>({value,label:categoryLabel(value,ar)}))} any={copy.any}/>
        <FilterSelect label={copy.brand} value={brand} onChange={setBrand} options={brands.map((value)=>({value,label:value}))} any={copy.any}/>
        <FilterSelect label={copy.transmission} value={transmission} onChange={setTransmission} options={[{value:"Automatic",label:copy.automatic},{value:"Manual",label:copy.manual}]} any={copy.any}/>
        <FilterSelect label={copy.fuel} value={fuel} onChange={setFuel} options={fuels.map((value)=>({value,label:fuelLabel(value,copy)}))} any={copy.any}/>
        <FilterSelect label={copy.supplier} value={supplier} onChange={setSupplier} options={suppliers.map((value)=>({value,label:value}))} any={copy.any}/>
        <div className={styles.filterBlock}><span>{copy.seats}</span><div className={styles.seatButtons}>{[0,4,5,7,8].map((count)=><button type="button" className={minSeats===count?styles.activeChoice:""} onClick={()=>setMinSeats(count)} key={count}>{count===0?copy.any:`${count}+`}</button>)}</div></div>
        <div className={styles.filterBlock}><div className={styles.rangeTitle}><span>{copy.maxPrice}</span><strong>{maxPrice} JOD</strong></div><input className={styles.range} type="range" min="20" max="160" step="5" value={maxPrice} onChange={(event)=>setMaxPrice(Number(event.target.value))}/></div>
        <Toggle checked={freeCancellation} setChecked={setFreeCancellation} label={copy.freeCancellation}/>
        <Toggle checked={unlimitedMileage} setChecked={setUnlimitedMileage} label={copy.unlimitedMileage}/>
        <Toggle checked={airportPickup} setChecked={setAirportPickup} label={copy.airportPickup}/>
        <Toggle checked={zeroDeposit} setChecked={setZeroDeposit} label={copy.zeroDeposit}/>
      </aside>

      <section className={styles.results} aria-live="polite">
        {results.length === 0 ? <div className={styles.empty}><Car size={34}/><h2>{copy.noResults}</h2><p>{copy.noResultsBody}</p><button type="button" onClick={resetFilters}>{copy.reset}</button></div> : <>
          {results.slice(0,visible).map((car)=><CarCard key={car.id} car={car} ar={ar} copy={copy} rentalDays={rentalDays} search={initialSearch}/>) }
          {visible < results.length && <button className={styles.showMore} type="button" onClick={()=>setVisible((current)=>current+18)}>{copy.showMore} <span>{Math.min(results.length-visible,18)}</span></button>}
        </>}
      </section>
    </div>
  </>;
}

function CarCard({car,ar,copy,rentalDays,search}:{car:DemoCar;ar:boolean;copy:any;rentalDays:number;search:CarSearchValues}) {
  const total=car.dailyPrice*rentalDays;
  const params=new URLSearchParams({pickup:search.pickup,dropoff:search.dropoff,pickupDate:search.pickupDate,pickupTime:search.pickupTime,returnDate:search.returnDate,returnTime:search.returnTime,driverAge:search.driverAge});
  return <article className={styles.carCard}>
    <div className={styles.carMedia}><img src={car.image} alt={car.imageAlt} loading="lazy" decoding="async" onError={(event)=>{event.currentTarget.src=`https://loremflickr.com/1200/800/car?lock=${Math.abs(hash(car.id))}`;}}/><span className={styles.demoPill}>{copy.demo}</span><span className={styles.categoryPill}>{categoryLabel(car.category,ar)}</span></div>
    <div className={styles.carMain}>
      <div className={styles.carTitle}><div><small>{car.brand} · {car.year}</small><h2>{car.model}</h2><span>{copy.orSimilar}</span></div><div className={styles.rating}><strong>{car.supplierRating.toFixed(1)}</strong><span><Star size={12}/>{car.supplier}</span></div></div>
      <div className={styles.specs}><span><Users size={15}/>{car.seats} {copy.seatsLabel}</span><span><BriefcaseBusiness size={15}/>{car.bags} {copy.bags}</span><span><Gauge size={15}/>{car.transmission === "Automatic" ? copy.automatic : copy.manual}</span><span><Fuel size={15}/>{fuelLabel(car.fuel,copy)}</span><span><Snowflake size={15}/>{copy.ac}</span></div>
      <div className={styles.benefits}>{car.freeCancellation&&<span><Check size={13}/>{copy.freeCancel}</span>}{car.unlimitedMileage&&<span><Check size={13}/>{copy.unlimited}</span>}{car.airportPickup&&<span><Check size={13}/>{copy.airport}</span>}{car.deposit===0&&<span className={styles.goldBenefit}><Check size={13}/>{copy.noDeposit}</span>}</div>
    </div>
    <div className={styles.priceBox}><span>{copy.perDay}</span><strong>{car.dailyPrice} JOD</strong><small>{rentalDays} {rentalDays===1?copy.day:copy.days}</small><div className={styles.total}><span>{copy.total}</span><b>{total} JOD</b></div><div className={styles.deposit}><CircleDollarSign size={14}/>{copy.deposit}: <strong>{car.deposit===0?copy.noDeposit:`${car.deposit} JOD`}</strong></div><Link href={`/cars/${car.id}?${params.toString()}`}>{copy.details}</Link></div>
  </article>;
}

function FilterSelect({label,value,onChange,options,any}:{label:string;value:string;onChange:(value:string)=>void;options:Array<{value:string;label:string}>;any:string}) {return <label className={styles.filterSelect}><span>{label}</span><div><select value={value} onChange={(event)=>onChange(event.target.value)}><option value="">{any}</option>{options.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={14}/></div></label>;}
function Toggle({checked,setChecked,label}:{checked:boolean;setChecked:(value:boolean)=>void;label:string}) {return <label className={styles.toggleRow}><input type="checkbox" checked={checked} onChange={(event)=>setChecked(event.target.checked)}/><span className={styles.fakeCheck}>{checked&&<Check size={13}/>}</span><strong>{label}</strong></label>;}
function unique<T>(values:T[]):T[]{return [...new Set(values)].sort((a,b)=>String(a).localeCompare(String(b)));}
function score(car:DemoCar){return car.supplierRating*10-car.dailyPrice*.05+(car.deposit===0?2:0)+(car.fuel==="Electric"?1:0);}
function rentalDayCount(start:string,end:string){const a=new Date(`${start}T12:00:00`);const b=new Date(`${end}T12:00:00`);const days=Math.round((b.getTime()-a.getTime())/86400000);return Number.isFinite(days)&&days>0?days:1;}
function categoryLabel(value:string,ar:boolean){if(!ar)return value;return ({Economy:"اقتصادية",Compact:"مدمجة",Sedan:"سيدان",SUV:"دفع رباعي / SUV",Luxury:"فاخرة",Van:"فان",Electric:"كهربائية",Pickup:"بيك أب"} as Record<string,string>)[value]??value;}
function fuelLabel(value:string,copy:any){if(value==="Petrol")return copy.petrol;if(value==="Diesel")return copy.diesel;if(value==="Hybrid")return copy.hybrid;if(value==="Electric")return copy.electric;return value;}
function hash(value:string){let result=0;for(let index=0;index<value.length;index++)result=((result<<5)-result)+value.charCodeAt(index);return result|0;}
