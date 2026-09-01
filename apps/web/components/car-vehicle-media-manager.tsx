"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Camera, CheckCircle2, ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import styles from "./car-vehicle-media-manager.module.css";

type Category = "EXTERIOR_FRONT"|"EXTERIOR_REAR"|"EXTERIOR_LEFT"|"EXTERIOR_RIGHT"|"INTERIOR_DASHBOARD"|"INTERIOR_FRONT_SEATS"|"INTERIOR_REAR_SEATS"|"TRUNK"|"INFOTAINMENT"|"STEERING_WHEEL"|"ODOMETER"|"KEYS_ACCESSORIES"|"OTHER";
type Photo = {id:string;vehicleId:string;category:Category;url:string|null;originalFileName:string;contentType:string;sizeBytes:number;alt:string|null;sortOrder:number;isPrimary:boolean;state:string;uploadExpiresAt:string;uploadedAt:string|null;createdAt:string};
type Vehicle = {id:string;make:string;model:string;year:number;category:string;status:string};
type Props = Readonly<{locale:"ar"|"en";vehicle:Vehicle;initialPhotos:Photo[]}>;

const CATEGORIES:Category[]=["EXTERIOR_FRONT","EXTERIOR_REAR","EXTERIOR_LEFT","EXTERIOR_RIGHT","INTERIOR_DASHBOARD","INTERIOR_FRONT_SEATS","INTERIOR_REAR_SEATS","TRUNK","INFOTAINMENT","STEERING_WHEEL","ODOMETER","KEYS_ACCESSORIES","OTHER"];

export function CarVehicleMediaManager({locale,vehicle,initialPhotos}:Props){
  const ar=locale==="ar";
  const [photos,setPhotos]=useState(initialPhotos);
  const [category,setCategory]=useState<Category>("EXTERIOR_FRONT");
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState("");
  const [error,setError]=useState("");
  const inputRef=useRef<HTMLInputElement|null>(null);
  const copy=ar?{
    back:"العودة للأسطول",title:"صور السيارة",subtitle:"ارفع صورًا حقيقية للسيارة ورتبها وصنّفها. الصورة الرئيسية تظهر أولًا في صفحة الحجز والنتائج.",uploadTitle:"إضافة صور",uploadBody:"يمكنك اختيار عدة صور دفعة واحدة. JPEG أو PNG أو WebP، حتى 15 MB للصورة.",category:"تصنيف الصور الجديدة",choose:"اضغط لاختيار الصور",chooseSub:"أو اسحب الصور إلى هذه المنطقة من جهازك",safe:"الصور ترفع مباشرة إلى التخزين الآمن وتُفحص قبل نشرها للمستخدمين.",uploading:"جارٍ رفع الصور",gallery:"معرض السيارة",photos:"صور",empty:"لا توجد صور منشورة بعد",emptyBody:"ابدأ بصورة أمامية واضحة، ثم أضف الخلفية والجوانب والمقصورة والمقاعد والشنطة.",primary:"الصورة الرئيسية",makePrimary:"اجعلها رئيسية",delete:"حذف",alt:"وصف الصورة",saving:"جارٍ الحفظ...",failed:"تعذر تنفيذ العملية.",pending:"بانتظار اكتمال الرفع",moveUp:"للأعلى",moveDown:"للأسفل",saved:"تم الحفظ"
  }:{
    back:"Back to fleet",title:"Vehicle photos",subtitle:"Upload real vehicle photos, categorize them and control their order. The primary image appears first on the booking page and search results.",uploadTitle:"Add photos",uploadBody:"Choose multiple photos at once. JPEG, PNG or WebP, up to 15 MB each.",category:"Category for new photos",choose:"Choose vehicle photos",chooseSub:"or drag image files into this area",safe:"Images upload directly to secure object storage and are verified before publication.",uploading:"Uploading photos",gallery:"Vehicle gallery",photos:"photos",empty:"No published photos yet",emptyBody:"Start with a clear front exterior photo, then add rear, sides, cabin, seats and trunk.",primary:"Primary image",makePrimary:"Make primary",delete:"Delete",alt:"Image description",saving:"Saving...",failed:"The operation could not be completed.",pending:"Upload pending",moveUp:"Move up",moveDown:"Move down",saved:"Saved"
  };
  const labels=useMemo(()=>categoryLabels(ar),[ar]);
  const readyPhotos=photos.filter((photo)=>photo.state==="READY");

  async function uploadFiles(files:FileList|File[]){
    const selected=Array.from(files).filter((file)=>["image/jpeg","image/png","image/webp"].includes(file.type));
    if(!selected.length)return;
    setBusy(true);setError("");
    try{
      for(let index=0;index<selected.length;index++){
        const file=selected[index];
        setProgress(`${copy.uploading} ${index+1}/${selected.length} · ${file.name}`);
        const init=await api(`/api/v1/cars/partner/vehicles/${vehicle.id}/media`,{
          method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fileName:file.name,contentType:file.type,sizeBytes:file.size,category,alt:`${vehicle.make} ${vehicle.model} · ${labels[category]}`})
        });
        const photo=init.photo as Photo;
        const upload=init.upload as {url:string;method:"PUT";headers:Record<string,string>};
        setPhotos((current)=>[...current,photo]);
        const storageResponse=await fetch(upload.url,{method:upload.method,headers:upload.headers,body:file});
        if(!storageResponse.ok)throw new Error(`${copy.failed} (${storageResponse.status})`);
        const completed=await api(`/api/v1/cars/partner/vehicles/${vehicle.id}/media/${photo.id}/complete`,{method:"POST"}) as Photo;
        setPhotos((current)=>current.map((item)=>item.id===photo.id?completed:item));
      }
      setProgress(copy.saved);
      window.setTimeout(()=>setProgress(""),1800);
      if(inputRef.current)inputRef.current.value="";
    }catch(value){setError(value instanceof Error?value.message:copy.failed);}finally{setBusy(false);}
  }

  async function patchPhoto(photoId:string,patch:Record<string,unknown>){
    setError("");
    try{
      const updated=await api(`/api/v1/cars/partner/vehicles/${vehicle.id}/media/${photoId}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(patch)}) as Photo;
      setPhotos((current)=>current.map((item)=>item.id===photoId?updated:(patch.isPrimary===true?{...item,isPrimary:false}:item)));
    }catch(value){setError(value instanceof Error?value.message:copy.failed);}
  }

  async function remove(photo:Photo){
    if(!window.confirm(ar?"حذف هذه الصورة من معرض السيارة؟":"Delete this photo from the vehicle gallery?"))return;
    setError("");
    try{
      await api(`/api/v1/cars/partner/vehicles/${vehicle.id}/media/${photo.id}`,{method:"DELETE"});
      setPhotos((current)=>{
        const remaining=current.filter((item)=>item.id!==photo.id);
        if(photo.isPrimary&&remaining.length&&!remaining.some((item)=>item.isPrimary))remaining[0]={...remaining[0],isPrimary:true};
        return remaining;
      });
    }catch(value){setError(value instanceof Error?value.message:copy.failed);}
  }

  async function move(photo:Photo,direction:-1|1){
    const ordered=readyPhotos.slice().sort((a,b)=>a.sortOrder-b.sortOrder||a.createdAt.localeCompare(b.createdAt));
    const index=ordered.findIndex((item)=>item.id===photo.id);
    const target=ordered[index+direction];
    if(!target)return;
    const aOrder=photo.sortOrder;const bOrder=target.sortOrder;
    setPhotos((current)=>current.map((item)=>item.id===photo.id?{...item,sortOrder:bOrder}:item.id===target.id?{...item,sortOrder:aOrder}:item));
    try{
      await Promise.all([
        api(`/api/v1/cars/partner/vehicles/${vehicle.id}/media/${photo.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({sortOrder:bOrder})}),
        api(`/api/v1/cars/partner/vehicles/${vehicle.id}/media/${target.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({sortOrder:aOrder})}),
      ]);
    }catch(value){setError(value instanceof Error?value.message:copy.failed);}
  }

  return <>
    <Link className={styles.back} href="/car-dashboard/fleet"><ArrowLeft size={15}/>{copy.back}</Link>
    <div className={styles.pageHead}><div><span className={styles.vehicleTag}><Camera size={14}/>{vehicle.make} {vehicle.model} · {vehicle.year}</span><h1>{copy.title}</h1><p>{copy.subtitle}</p></div></div>

    <section className={styles.uploadCard}>
      <div className={styles.uploadTop}><div><span className="eyebrow">Media studio</span><h2>{copy.uploadTitle}</h2><p>{copy.uploadBody}</p></div><label className={styles.categoryPicker}><span>{copy.category}</span><select value={category} onChange={(event)=>setCategory(event.target.value as Category)}>{CATEGORIES.map((item)=><option key={item} value={item}>{labels[item]}</option>)}</select></label></div>
      <label className={styles.dropzone} onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>{event.preventDefault();void uploadFiles(event.dataTransfer.files);}}><ImagePlus size={30}/><strong>{copy.choose}</strong><small>{copy.chooseSub}</small><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(event)=>{if(event.target.files)void uploadFiles(event.target.files);}}/></label>
      <div className={styles.notice}><CheckCircle2 size={15}/><span>{copy.safe}</span></div>
      {progress&&<div className={styles.progress}>{busy?<LoaderCircle className={styles.spin} size={15}/>:<CheckCircle2 size={15}/>}<span>{progress}</span></div>}
      {error&&<div className={styles.error}>{error}</div>}
    </section>

    <section className={styles.galleryCard}>
      <div className={styles.galleryHead}><div><span className="eyebrow">Vehicle media library</span><h2>{copy.gallery}</h2><p>{readyPhotos.length} {copy.photos}</p></div><strong>{vehicle.status}</strong></div>
      {photos.length?<div className={styles.grid}>{photos.slice().sort((a,b)=>Number(b.isPrimary)-Number(a.isPrimary)||a.sortOrder-b.sortOrder||a.createdAt.localeCompare(b.createdAt)).map((photo,index)=><article className={styles.photo} key={photo.id}>
        <div className={styles.media}>{photo.url?<img src={photo.url} alt={photo.alt||`${vehicle.make} ${vehicle.model}`}/>:<span className={styles.pending}><LoaderCircle className={styles.spin} size={15}/>{copy.pending}</span>}{photo.isPrimary&&photo.state==="READY"&&<span className={styles.primaryBadge}><Star size={12}/>{copy.primary}</span>}</div>
        <div className={styles.body}>
          <select value={photo.category} disabled={photo.state!=="READY"} onChange={(event)=>void patchPhoto(photo.id,{category:event.target.value})}>{CATEGORIES.map((item)=><option key={item} value={item}>{labels[item]}</option>)}</select>
          <input aria-label={copy.alt} placeholder={copy.alt} defaultValue={photo.alt??""} disabled={photo.state!=="READY"} onBlur={(event)=>{if(event.target.value!==(photo.alt??""))void patchPhoto(photo.id,{alt:event.target.value});}}/>
          <div className={styles.meta}><span>{formatBytes(photo.sizeBytes)}</span><span>#{photo.sortOrder+1}</span></div>
          <div className={styles.actions}>
            {!photo.isPrimary&&photo.state==="READY"&&<button className={styles.primary} type="button" onClick={()=>void patchPhoto(photo.id,{isPrimary:true})}><Star size={12}/>{copy.makePrimary}</button>}
            <button type="button" title={copy.moveUp} disabled={photo.state!=="READY"||index===0} onClick={()=>void move(photo,-1)}><ArrowUp size={12}/></button>
            <button type="button" title={copy.moveDown} disabled={photo.state!=="READY"||index===photos.length-1} onClick={()=>void move(photo,1)}><ArrowDown size={12}/></button>
            <button className={styles.danger} type="button" onClick={()=>void remove(photo)}><Trash2 size={12}/>{copy.delete}</button>
          </div>
        </div>
      </article>)}</div>:<div className={styles.empty}><Camera size={28}/><h3>{copy.empty}</h3><p>{copy.emptyBody}</p></div>}
    </section>
  </>;
}

function categoryLabels(ar:boolean):Record<Category,string>{return ar?{
  EXTERIOR_FRONT:"الخارج · من الأمام",EXTERIOR_REAR:"الخارج · من الخلف",EXTERIOR_LEFT:"الخارج · الجهة اليسرى",EXTERIOR_RIGHT:"الخارج · الجهة اليمنى",INTERIOR_DASHBOARD:"الداخل · لوحة القيادة",INTERIOR_FRONT_SEATS:"الداخل · المقاعد الأمامية",INTERIOR_REAR_SEATS:"الداخل · المقاعد الخلفية",TRUNK:"الشنطة / مساحة الأمتعة",INFOTAINMENT:"الشاشة ونظام الترفيه",STEERING_WHEEL:"المقود",ODOMETER:"العدادات",KEYS_ACCESSORIES:"المفتاح والملحقات",OTHER:"أخرى"
}:{EXTERIOR_FRONT:"Exterior · front",EXTERIOR_REAR:"Exterior · rear",EXTERIOR_LEFT:"Exterior · left side",EXTERIOR_RIGHT:"Exterior · right side",INTERIOR_DASHBOARD:"Interior · dashboard",INTERIOR_FRONT_SEATS:"Interior · front seats",INTERIOR_REAR_SEATS:"Interior · rear seats",TRUNK:"Trunk / luggage",INFOTAINMENT:"Infotainment",STEERING_WHEEL:"Steering wheel",ODOMETER:"Instrument cluster",KEYS_ACCESSORIES:"Keys & accessories",OTHER:"Other"};}

async function api(url:string,init?:RequestInit){const response=await fetch(url,init);const result=await response.json().catch(()=>null);if(!response.ok)throw new Error(result?.error?.message||`Request failed (${response.status})`);return result?.data;}
function formatBytes(bytes:number){if(bytes<1024*1024)return`${Math.max(1,Math.round(bytes/1024))} KB`;return`${(bytes/(1024*1024)).toFixed(1)} MB`;}
