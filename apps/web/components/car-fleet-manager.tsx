"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeDollarSign, Camera, CarFront, MapPin, Plus, Settings2, ShieldCheck, X } from "lucide-react";
import { CarCatalogPicker } from "./car-catalog-picker";
import styles from "./car-partner-shell.module.css";

type Vehicle={id:string;make:string;model:string;year:number;category:string;transmission:string;fuel:string;seats:number;bags:number;doors:number;dailyPrice:number;deposit:number;freeCancellation:boolean;unlimitedMileage:boolean;airportPickup:boolean;imageUrl:string|null;imageAlt:string|null;status:string;catalog?:{id:string;provider:string;primaryImageUrl:string|null;exterior360Available:boolean;interior360Available:boolean}|null;homeLocation:{id:string;name:string;city:string}|null;createdAt:string;updatedAt:string};
type Location={id:string;name:string;city:string};
type Props=Readonly<{locale:"ar"|"en";initialVehicles:Vehicle[];locations:Location[];currency:string}>;

export function CarFleetManager({locale,initialVehicles,locations,currency}:Props){
  const ar=locale==="ar";
  const [vehicles,setVehicles]=useState(initialVehicles);
  const [open,setOpen]=useState(initialVehicles.length===0);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const copy=ar?{
    title:"الأسطول",body:"اختر السيارة وأدخل سعرها؛ HandMeKey يطابق صور الاستوديو ومجسم 360° تلقائيًا.",add:"إضافة سيارة",close:"إغلاق",save:"حفظ السيارة",saving:"جارٍ اختيار الصور وحفظ السيارة...",
    basicTitle:"بيانات السيارة",basicBody:"اختر الموديل والسنة الصحيحة. لا تحتاج إلى تنزيل أو رفع صور السيارة.",rentalTitle:"التأجير والسعر",rentalBody:"السعر والوديعة وموقع الاستلام الأساسي.",extrasTitle:"مزايا العرض",extrasBody:"حدد ما يشمله السعر وسيظهر العرض مباشرة بالصورة الموحدة.",
    make:"الماركة",model:"الموديل",year:"السنة",category:"الفئة",transmission:"ناقل الحركة",fuel:"الوقود",seats:"المقاعد",bags:"الحقائب",price:"السعر اليومي",deposit:"الوديعة",location:"الفرع الأساسي",freeCancel:"إلغاء مجاني",unlimited:"كيلومترات غير محدودة",airport:"استلام من المطار",automatic:"أوتوماتيك",manual:"عادي",empty:"لا توجد سيارات في الأسطول بعد",emptyBody:"أضف أول سيارة؛ سيختار النظام صورها ومجسمها تلقائيًا.",failed:"تعذر حفظ السيارة.",required:"إلزامي",depositHint:"يجب تحديد وديعة أكبر من صفر لكل سيارة ولكل شركة، بدون استثناء.",stored:"لا يوجد رفع صور إجباري: نستخدم فقط صورة مطابقة للماركة والموديل والسنة، ولا نعرض صورة قريبة أو خاطئة.",depositMissing:"الوديعة مطلوبة",photos:"صور إضافية",catalog:"Catalog",visual360:"360°"
  }:{
    title:"Fleet",body:"Choose the vehicle and enter its rate; HandMeKey automatically matches the studio imagery and 360° visual.",add:"Add vehicle",close:"Close",save:"Save vehicle",saving:"Selecting visuals and saving...",
    basicTitle:"Vehicle details",basicBody:"Choose the correct model and year. You do not need to download or upload car artwork.",rentalTitle:"Rental & pricing",rentalBody:"Daily rate, mandatory deposit and primary pickup location.",extrasTitle:"Offer features",extrasBody:"Choose what the rate includes and the listing will use the standardized visual automatically.",
    make:"Make",model:"Model",year:"Year",category:"Category",transmission:"Transmission",fuel:"Fuel",seats:"Seats",bags:"Bags",price:"Daily price",deposit:"Deposit",location:"Home location",freeCancel:"Free cancellation",unlimited:"Unlimited mileage",airport:"Airport pickup",automatic:"Automatic",manual:"Manual",empty:"No vehicles in the fleet yet",emptyBody:"Add the first vehicle; its imagery and 360° visual are selected automatically.",failed:"Could not save the vehicle.",required:"Required",depositHint:"A deposit greater than zero is mandatory for every vehicle and every rental company, with no exceptions.",stored:"No catalog upload is required. HandMeKey only uses an exact make, model and year match—never close-but-wrong artwork.",depositMissing:"Deposit required",photos:"Extra photos",catalog:"Catalog",visual360:"360°"
  };

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setLoading(true);setError("");
    const form=new FormData(event.currentTarget);
    const payload={
      catalogVehicleId:String(form.get("catalogVehicleId")||"")||undefined,
      make:String(form.get("make")||""),model:String(form.get("model")||""),year:Number(form.get("year")),trim:String(form.get("trim")||"")||undefined,bodyType:String(form.get("bodyType")||"")||undefined,category:String(form.get("category")||"Economy"),
      transmission:String(form.get("transmission")) as "AUTOMATIC"|"MANUAL",fuel:String(form.get("fuel")) as "PETROL"|"DIESEL"|"HYBRID"|"ELECTRIC",
      seats:Number(form.get("seats")),bags:Number(form.get("bags")),doors:4,dailyPrice:Number(form.get("dailyPrice")),deposit:Number(form.get("deposit")),
      freeCancellation:form.get("freeCancellation")==="on",unlimitedMileage:form.get("unlimitedMileage")==="on",airportPickup:form.get("airportPickup")==="on",
      homeLocationId:String(form.get("homeLocationId")||"")||undefined,
    };
    try{
      const response=await fetch("/api/v1/cars/partner/vehicles",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error?.message||copy.failed);
      setVehicles((current)=>[result.data,...current]);setOpen(false);event.currentTarget.reset();
    }catch(value){setError(value instanceof Error?value.message:copy.failed);}finally{setLoading(false);}
  }

  return <>
    <div className={styles.pageHead}><div><span>Operate · Fleet</span><h1>{copy.title}</h1><p>{copy.body}</p></div><button className={styles.primary} type="button" onClick={()=>setOpen((value)=>!value)}>{open?<X size={17}/>:<Plus size={17}/>} {open?copy.close:copy.add}</button></div>

    {open&&<div className={`${styles.formCard} ${styles.fleetFormCard}`}>
      <div className={styles.notice}><CarFront size={18}/><span>{copy.stored}</span></div>
      <form onSubmit={submit}>
        <section className={styles.vehicleFormSection}>
          <div className={styles.vehicleFormHead}><span className={styles.vehicleFormIcon}><CarFront size={18}/></span><div><h2>{copy.basicTitle}</h2><p>{copy.basicBody}</p></div></div>
          <CarCatalogPicker locale={locale}/>
          <div className={styles.vehicleQuickGrid}>
            <Field label={copy.make}><input name="make" required placeholder="Toyota" autoComplete="off"/></Field>
            <Field label={copy.model}><input name="model" required placeholder="Corolla" autoComplete="off"/></Field>
            <Field label={copy.year}><input name="year" type="number" required min="1990" max={new Date().getFullYear()+1} defaultValue={new Date().getFullYear()}/></Field>
            <Field label={copy.category}><select name="category" defaultValue="Economy"><option>Economy</option><option>Compact</option><option>Sedan</option><option>SUV</option><option>Luxury</option><option>Family</option><option>Van</option><option>Pickup</option><option>Electric</option></select></Field>
            <Field label={copy.transmission}><select name="transmission" defaultValue="AUTOMATIC"><option value="AUTOMATIC">{copy.automatic}</option><option value="MANUAL">{copy.manual}</option></select></Field>
            <Field label={copy.fuel}><select name="fuel" defaultValue="PETROL"><option value="PETROL">Petrol</option><option value="DIESEL">Diesel</option><option value="HYBRID">Hybrid</option><option value="ELECTRIC">Electric</option></select></Field>
            <Field label={copy.seats}><input name="seats" type="number" min="1" max="16" defaultValue="5" required/></Field>
            <Field label={copy.bags}><input name="bags" type="number" min="0" max="12" defaultValue="2" required/></Field>
          </div>
        </section>

        <section className={styles.vehicleFormSection}>
          <div className={styles.vehicleFormHead}><span className={styles.vehicleFormIcon}><BadgeDollarSign size={18}/></span><div><h2>{copy.rentalTitle}</h2><p>{copy.rentalBody}</p></div></div>
          <div className={styles.vehiclePricingGrid}>
            <Field label={`${copy.price} · ${currency}`}><input name="dailyPrice" type="number" min="0.01" step="0.01" placeholder="35.00" required inputMode="decimal"/></Field>
            <label className={`${styles.field} ${styles.depositField}`}><span>{copy.deposit} · {currency} <b className={styles.requiredTag}>{copy.required}</b></span><input name="deposit" type="number" min="0.01" step="0.01" placeholder="100.00" required inputMode="decimal"/><small>{copy.depositHint}</small></label>
            <Field label={copy.location}><select name="homeLocationId" defaultValue={locations[0]?.id??""}><option value="">—</option>{locations.map((location)=><option key={location.id} value={location.id}>{location.name} · {location.city}</option>)}</select></Field>
          </div>
        </section>

        <section className={styles.vehicleFormSection}>
          <div className={styles.vehicleFormHead}><span className={styles.vehicleFormIcon}><Settings2 size={18}/></span><div><h2>{copy.extrasTitle}</h2><p>{copy.extrasBody}</p></div></div>
          <div className={styles.policyGrid}>
            <label className={styles.policyOption}><input type="checkbox" name="freeCancellation" defaultChecked/><span><ShieldCheck size={17}/><b>{copy.freeCancel}</b></span></label>
            <label className={styles.policyOption}><input type="checkbox" name="unlimitedMileage"/><span><Settings2 size={17}/><b>{copy.unlimited}</b></span></label>
            <label className={styles.policyOption}><input type="checkbox" name="airportPickup"/><span><MapPin size={17}/><b>{copy.airport}</b></span></label>
          </div>
        </section>

        {error&&<div className={styles.error}>{error}</div>}
        <div className={styles.formActions}><button className={styles.primary} type="submit" disabled={loading}><Plus size={16}/>{loading?copy.saving:copy.save}</button></div>
      </form>
    </div>}

    <section className={styles.panel} style={{marginTop:open?18:0}}>{vehicles.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar?"السيارة":"Vehicle"}</th><th>{ar?"الفئة":"Category"}</th><th>{ar?"المواصفات":"Specs"}</th><th>{ar?"الفرع":"Location"}</th><th>{ar?"السعر":"Price"}</th><th>{ar?"الوديعة":"Deposit"}</th><th>{ar?"الحالة":"Status"}</th><th>{ar?"الصور":"Photos"}</th></tr></thead><tbody>{vehicles.map((vehicle)=><tr key={vehicle.id}><td><strong>{vehicle.make} {vehicle.model}</strong><div>{vehicle.year}{vehicle.catalog?<span> · {copy.catalog}{vehicle.catalog.exterior360Available?` · ${copy.visual360}`:""}</span>:null}</div></td><td>{vehicle.category}</td><td>{vehicle.transmission} · {vehicle.fuel} · {vehicle.seats} {ar?"مقاعد":"seats"}</td><td>{vehicle.homeLocation?.name??"—"}</td><td><strong>{vehicle.dailyPrice.toFixed(2)} {currency}</strong></td><td>{vehicle.deposit>0?<strong>{vehicle.deposit.toFixed(2)} {currency}</strong>:<span className={styles.depositMissing}>{copy.depositMissing}</span>}</td><td><span className={`${styles.chip} ${vehicle.status==="ACTIVE"?styles.chipActive:vehicle.status==="MAINTENANCE"?styles.chipWarn:""}`}>{vehicle.status}</span></td><td><Link className={styles.secondary} href={`/car-dashboard/fleet/${vehicle.id}/media`}><Camera size={14}/>{copy.photos}</Link></td></tr>)}</tbody></table></div>:<div className={styles.empty}><span className={styles.emptyIcon}><CarFront size={25}/></span><h3>{copy.empty}</h3><p>{copy.emptyBody}</p><button className={styles.primary} type="button" onClick={()=>setOpen(true)}><Plus size={16}/>{copy.add}</button></div>}</section>
  </>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className={styles.field}><span>{label}</span>{children}</label>}
