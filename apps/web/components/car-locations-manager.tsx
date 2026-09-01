"use client";

import { useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import styles from "./car-partner-shell.module.css";

type Location={id:string;companyId:string;name:string;city:string;address:string;airportCode:string|null;pickupEnabled:boolean;returnEnabled:boolean;active:boolean;createdAt:string;updatedAt:string};
type Props=Readonly<{locale:"ar"|"en";initialLocations:Location[]}>;

export function CarLocationsManager({locale,initialLocations}:Props){
  const ar=locale==="ar";
  const [locations,setLocations]=useState(initialLocations);
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const copy=ar?{title:"مواقع الاستلام والتسليم",body:"أضف المطار والفروع التي يمكن للعميل استلام السيارة منها أو إعادتها إليها.",add:"أضف موقع",close:"إغلاق",name:"اسم الموقع",city:"المدينة",address:"العنوان",airport:"رمز المطار",save:"حفظ الموقع",saving:"جارٍ الحفظ...",empty:"لا توجد مواقع فعالة",failed:"تعذر حفظ الموقع."}:{title:"Pickup & return locations",body:"Add airports and branches where customers can pick up or return a vehicle.",add:"Add location",close:"Close",name:"Location name",city:"City",address:"Address",airport:"Airport code",save:"Save location",saving:"Saving...",empty:"No active locations",failed:"Could not save the location."};

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setLoading(true);setError("");const form=new FormData(event.currentTarget);
    const payload={name:String(form.get("name")||""),city:String(form.get("city")||""),address:String(form.get("address")||""),airportCode:String(form.get("airportCode")||"")||undefined};
    try{const response=await fetch("/api/v1/cars/partner/locations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result?.error?.message||copy.failed);setLocations((current)=>[...current,result.data]);setOpen(false);event.currentTarget.reset();}catch(value){setError(value instanceof Error?value.message:copy.failed);}finally{setLoading(false);}
  }

  return <>
    <div className={styles.pageHead}><div><span>Operate · Locations</span><h1>{copy.title}</h1><p>{copy.body}</p></div><button className={styles.primary} type="button" onClick={()=>setOpen((value)=>!value)}>{open?<X size={17}/>:<Plus size={17}/>} {open?copy.close:copy.add}</button></div>
    {open&&<div className={styles.formCard}><form onSubmit={submit}><div className={styles.formGrid}><Field label={copy.name}><input name="name" required placeholder={ar?"مطار الملكة علياء":"Queen Alia Airport"}/></Field><Field label={copy.city}><input name="city" required placeholder={ar?"عمّان":"Amman"}/></Field><div className={`${styles.field} ${styles.fieldFull}`}><span>{copy.address}</span><input name="address" required/></div><Field label={copy.airport}><input name="airportCode" maxLength={3} placeholder="AMM"/></Field></div>{error&&<div className={styles.error}>{error}</div>}<div className={styles.formActions}><button className={styles.primary} disabled={loading} type="submit"><Plus size={16}/>{loading?copy.saving:copy.save}</button></div></form></div>}
    <section className={styles.panel} style={{marginTop:open?18:0}}>{locations.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar?"الموقع":"Location"}</th><th>{ar?"المدينة":"City"}</th><th>{ar?"العنوان":"Address"}</th><th>{ar?"المطار":"Airport"}</th><th>{ar?"استلام":"Pickup"}</th><th>{ar?"تسليم":"Return"}</th><th>{ar?"الحالة":"Status"}</th></tr></thead><tbody>{locations.map((location)=><tr key={location.id}><td><strong>{location.name}</strong></td><td>{location.city}</td><td>{location.address}</td><td>{location.airportCode??"—"}</td><td>{location.pickupEnabled?"✓":"—"}</td><td>{location.returnEnabled?"✓":"—"}</td><td><span className={`${styles.chip} ${location.active?styles.chipActive:""}`}>{location.active?"ACTIVE":"INACTIVE"}</span></td></tr>)}</tbody></table></div>:<div className={styles.empty}><span className={styles.emptyIcon}><MapPin size={25}/></span><h3>{copy.empty}</h3></div>}</section>
  </>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className={styles.field}><span>{label}</span>{children}</label>}
