"use client";

import {useEffect, useRef, useState} from "react";
import {CarFront, CheckCircle2, ImagePlus, LoaderCircle, Search} from "lucide-react";
import styles from "./car-catalog-cutout-uploader.module.css";

type Vehicle={id:string;make:string;model:string;year:number;trim:string|null;generation:string|null;bodyType:string|null;category:string;primaryImageUrl:string|null};
type UploadInit={item:{id:string};upload:{url:string;method:"PUT";headers:Record<string,string>}};
type Props=Readonly<{locale:"ar"|"en"}>;

export function CarCatalogCutoutUploader({locale}:Props){
  const ar=locale==="ar";
  const [q,setQ]=useState("");
  const [results,setResults]=useState<Vehicle[]>([]);
  const [vehicle,setVehicle]=useState<Vehicle|null>(null);
  const [type,setType]=useState("EXTERIOR_FRONT_LEFT");
  const [busy,setBusy]=useState(false);
  const [searching,setSearching]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const fileRef=useRef<HTMLInputElement|null>(null);
  const c=ar?{
    eyebrow:"HandMeKey Cutout Studio",title:"ارفع صورة السيارة المعزولة",body:"اختر السيارة الدقيقة أولًا، ثم ارفع PNG أو WebP بخلفية شفافة وبزاوية موحدة. الصورة تُفحص وتُربط مرة واحدة لتستخدمها كل شركات التأجير التي تعرض نفس النسخة.",search:"ابحث بالماركة أو الموديل أو السنة",none:"لا توجد نتائج",choose:"اختر صورة cutout",hint:"يفضل 1600×900، السيارة كاملة بمنتصف الإطار، بدون كتابة أو خلفية أو أشخاص.",uploading:"جارٍ الرفع والفحص...",done:"تم ربط الصورة القياسية بالسيارة.",failed:"تعذر رفع الصورة.",angle:"زاوية العرض",change:"تغيير السيارة"
  }:{
    eyebrow:"HandMeKey Cutout Studio",title:"Upload an isolated vehicle cutout",body:"Choose the exact vehicle first, then upload a transparent PNG or WebP at a consistent angle. It is verified and linked once so every rental company using the same exact variant can reuse it.",search:"Search make, model or year",none:"No results",choose:"Choose cutout image",hint:"Prefer 1600×900, whole vehicle centered, no text, people or background props.",uploading:"Uploading and verifying...",done:"Standard cutout linked to the vehicle.",failed:"The cutout upload failed.",angle:"View angle",change:"Change vehicle"
  };

  useEffect(()=>{
    if(vehicle)return;
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setSearching(true);setError("");
      try{
        const response=await fetch(`/api/v1/cars/catalog?q=${encodeURIComponent(q)}&limit=20`,{signal:controller.signal});
        const payload=await response.json();
        if(!response.ok)throw new Error(payload?.error?.message||"Search failed");
        setResults(Array.isArray(payload?.data)?payload.data:[]);
      }catch(value){if((value as Error)?.name!=="AbortError")setError(value instanceof Error?value.message:"Search failed");}
      finally{setSearching(false);}
    },q?180:0);
    return()=>{window.clearTimeout(timer);controller.abort();};
  },[q,vehicle]);

  async function upload(file:File){
    if(!vehicle)return;
    if(!["image/png","image/webp"].includes(file.type)){setError(ar?"الملف لازم يكون PNG أو WebP.":"File must be PNG or WebP.");return;}
    setBusy(true);setError("");setMessage(c.uploading);
    try{
      const init=await api<UploadInit>(`/api/v1/admin/cars/catalog/${vehicle.id}/cutouts`,{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fileName:file.name,contentType:file.type,sizeBytes:file.size,type,angle:angleFor(type),sourceRef:"HandMeKey standardized cutout"})
      });
      const stored=await fetch(init.upload.url,{method:init.upload.method,headers:init.upload.headers,body:file});
      if(!stored.ok)throw new Error(`${c.failed} (${stored.status})`);
      await api(`/api/v1/admin/cars/catalog/${vehicle.id}/cutouts/${init.item.id}/complete`,{method:"POST"});
      setVehicle({...vehicle,primaryImageUrl:URL.createObjectURL(file)});
      setMessage(c.done);
      if(fileRef.current)fileRef.current.value="";
    }catch(value){setMessage("");setError(value instanceof Error?value.message:c.failed);}finally{setBusy(false);}
  }

  return <section className={styles.wrap}>
    <div className={styles.head}><div><span>{c.eyebrow}</span><h2>{c.title}</h2><p>{c.body}</p></div>{vehicle?<button type="button" onClick={()=>{setVehicle(null);setMessage("");setError("");}}>{c.change}</button>:null}</div>
    {!vehicle?<>
      <label className={styles.search}><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={c.search}/>{searching?<LoaderCircle className={styles.spin} size={15}/>:null}</label>
      <div className={styles.results}>{results.map(item=><button key={item.id} type="button" onClick={()=>setVehicle(item)}><span className={styles.thumb}>{item.primaryImageUrl?<img src={item.primaryImageUrl} alt=""/>:<CarFront size={23}/>}</span><span><strong>{item.make} {item.model}{item.trim?` ${item.trim}`:""}</strong><small>{item.year}{item.generation?` · ${item.generation}`:""}{item.bodyType?` · ${item.bodyType}`:""}</small></span></button>)}{!searching&&!results.length?<div className={styles.empty}>{c.none}</div>:null}</div>
    </>:<div className={styles.selected}>
      <div className={styles.preview}>{vehicle.primaryImageUrl?<img src={vehicle.primaryImageUrl} alt={`${vehicle.make} ${vehicle.model}`}/>:<CarFront size={48}/>}</div>
      <div className={styles.controls}><div><strong>{vehicle.make} {vehicle.model}{vehicle.trim?` ${vehicle.trim}`:""}</strong><small>{vehicle.year}{vehicle.generation?` · ${vehicle.generation}`:""}</small></div><label><span>{c.angle}</span><select value={type} onChange={e=>setType(e.target.value)}><option value="EXTERIOR_FRONT_LEFT">Front-left 3/4</option><option value="EXTERIOR_FRONT_RIGHT">Front-right 3/4</option><option value="EXTERIOR_FRONT">Front</option><option value="EXTERIOR_SIDE_LEFT">Left side</option><option value="EXTERIOR_SIDE_RIGHT">Right side</option><option value="EXTERIOR_REAR_LEFT">Rear-left 3/4</option><option value="EXTERIOR_REAR_RIGHT">Rear-right 3/4</option><option value="EXTERIOR_REAR">Rear</option></select></label><label className={styles.drop}><ImagePlus size={25}/><strong>{c.choose}</strong><small>{c.hint}</small><input ref={fileRef} type="file" accept="image/png,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);}}/></label>{message?<div className={styles.ok}>{busy?<LoaderCircle className={styles.spin} size={15}/>:<CheckCircle2 size={15}/>}<span>{message}</span></div>:null}{error?<div className={styles.error}>{error}</div>:null}</div>
    </div>}
  </section>;
}

function angleFor(type:string){return ({EXTERIOR_FRONT_LEFT:"front-left-3q",EXTERIOR_FRONT_RIGHT:"front-right-3q",EXTERIOR_FRONT:"front",EXTERIOR_SIDE_LEFT:"side-left",EXTERIOR_SIDE_RIGHT:"side-right",EXTERIOR_REAR_LEFT:"rear-left-3q",EXTERIOR_REAR_RIGHT:"rear-right-3q",EXTERIOR_REAR:"rear"} as Record<string,string>)[type]??"front-left-3q";}
async function api<T=unknown>(url:string,init?:RequestInit):Promise<T>{const response=await fetch(url,init);const result=await response.json().catch(()=>null);if(!response.ok)throw new Error(result?.error?.message||`Request failed (${response.status})`);return result?.data as T;}
