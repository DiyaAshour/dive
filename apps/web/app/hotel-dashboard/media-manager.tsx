"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bath, BedDouble, Building2, Check, Coffee, Dumbbell, Eye, FileImage, FileLock2, ImagePlus, Images, Landmark, Save, Sparkles, Trash2, Utensils, Waves, Wine } from "lucide-react";
import type { HotelPhotoCategory } from "@platform/contracts";
import type {Locale} from "@/lib/i18n";

type MediaItem = {
  id: string;
  kind: string;
  state: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  publicUrl: string | null;
  uploadedAt: string | null;
  photo: {id: string; alt: string | null; sortOrder: number; roomTypeId: string | null; category: HotelPhotoCategory; roomType?: {id: string; name: string} | null} | null;
  document: {id: string; type: string; status: string; rejectionReason: string | null; submittedAt: string; reviewedAt: string | null} | null;
};

type UploadGrant = {method: "PUT"; url: string; headers: Record<string, string>};

type CategoryDefinition = {value: HotelPhotoCategory; ar: string; en: string; icon: typeof Building2};

const PHOTO_CATEGORIES: CategoryDefinition[] = [
  {value:"EXTERIOR",ar:"واجهة الفندق",en:"Exterior",icon:Building2},
  {value:"ROOM",ar:"الغرف",en:"Rooms",icon:BedDouble},
  {value:"BATHROOM",ar:"الحمامات",en:"Bathrooms",icon:Bath},
  {value:"LOBBY",ar:"البهو",en:"Lobby",icon:Landmark},
  {value:"RECEPTION",ar:"الاستقبال",en:"Reception",icon:Sparkles},
  {value:"RESTAURANT",ar:"المطاعم",en:"Restaurants",icon:Utensils},
  {value:"BAR",ar:"البار",en:"Bar",icon:Wine},
  {value:"BREAKFAST",ar:"الإفطار",en:"Breakfast",icon:Coffee},
  {value:"POOL",ar:"المسبح",en:"Pool",icon:Waves},
  {value:"SPA",ar:"السبا",en:"Spa",icon:Sparkles},
  {value:"GYM",ar:"النادي الرياضي",en:"Gym",icon:Dumbbell},
  {value:"VIEW",ar:"الإطلالات",en:"Views",icon:Eye},
  {value:"FACILITIES",ar:"المرافق",en:"Facilities",icon:Images},
  {value:"OTHER",ar:"أخرى",en:"Other",icon:FileImage},
];

export default function MediaManager({hotelId, initialMedia, roomTypes, locale}: {hotelId: string; initialMedia: MediaItem[]; roomTypes: Array<{id: string; name: string}>; locale: Locale}) {
  const ar=locale==="ar";
  const router=useRouter();
  const [items, setItems] = useState(initialMedia);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageFileNames, setImageFileNames] = useState<string[]>([]);
  const [documentFileName, setDocumentFileName] = useState<string | null>(null);
  const [uploadCategory,setUploadCategory]=useState<HotelPhotoCategory>("EXTERIOR");
  const [filterCategory,setFilterCategory]=useState<HotelPhotoCategory|"ALL">("ALL");

  const images = useMemo(()=>items.filter((item) => item.kind === "HOTEL_IMAGE"),[items]);
  const documents = useMemo(()=>items.filter((item) => item.kind === "VERIFICATION_DOCUMENT"),[items]);
  const filteredImages = filterCategory === "ALL" ? images : images.filter((item)=>item.photo?.category===filterCategory);
  const categoryCounts=useMemo(()=>new Map(PHOTO_CATEGORIES.map((category)=>[category.value,images.filter((item)=>item.photo?.category===category.value).length])),[images]);

  async function uploadImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const files = form.getAll("image").filter((value): value is File => value instanceof File && value.size > 0);
    if (!files.length) return setMessage(ar?"اختر صورة واحدة على الأقل":"Choose at least one image");
    setBusy(true);
    try {
      for (let index=0;index<files.length;index++) {
        const file=files[index]!;
        setMessage(ar?`جارٍ رفع الصورة ${index+1} من ${files.length}…`:`Uploading image ${index+1} of ${files.length}…`);
        await runUpload(file, {
          kind: "HOTEL_IMAGE",
          alt: textOrNull(form.get("alt")),
          sortOrder: Number(form.get("sortOrder") || 0)+index,
          roomTypeId: textOrNull(form.get("roomTypeId")),
          category: String(form.get("category") || "OTHER"),
        });
      }
      event.currentTarget.reset();
      setImageFileNames([]);
      setUploadCategory("EXTERIOR");
      await refresh();
      router.refresh();
      setMessage(ar?`تم رفع ${files.length} صورة وتصنيفها بنجاح`:`${files.length} image${files.length===1?"":"s"} uploaded and categorized successfully`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("document");
    if (!(file instanceof File) || file.size === 0) return setMessage(ar?"اختر مستند تحقق أولًا":"Choose a verification document first");
    setBusy(true);
    try {
      await runUpload(file, {kind: "VERIFICATION_DOCUMENT", documentType: String(form.get("documentType") || "")});
      event.currentTarget.reset();
      setDocumentFileName(null);
      await refresh();
      router.refresh();
      setMessage(ar?"تم رفع مستند التحقق":"Verification document uploaded");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function runUpload(file: File, metadata: Record<string, unknown>) {
    const intent = await api(`/api/v1/hotels/${hotelId}/media/uploads`, {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({...metadata, fileName: file.name, contentType: file.type, sizeBytes: file.size}),
    });
    const upload = intent.upload as UploadGrant;
    const stored = await fetch(upload.url, {method: upload.method, headers: upload.headers, body: file});
    if (!stored.ok) throw new Error(`Object storage rejected the upload (${stored.status})`);
    await api(`/api/v1/hotels/${hotelId}/media/${intent.mediaId}/complete`, {method: "POST"});
  }

  async function savePhoto(mediaId: string, form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/v1/hotels/${hotelId}/media/${mediaId}`, {
        method: "PATCH",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          alt: textOrNull(data.get("alt")),
          sortOrder: Number(data.get("sortOrder") || 0),
          roomTypeId: textOrNull(data.get("roomTypeId")),
          category: String(data.get("category") || "OTHER"),
        }),
      });
      await refresh();
      router.refresh();
      setMessage(ar?"تم حفظ الصورة وتصنيفها":"Photo details and category saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save photo");
    } finally {
      setBusy(false);
    }
  }

  async function remove(mediaId: string) {
    if (!window.confirm(ar?"حذف هذه الصورة من الفندق؟":"Remove this image from the property?")) return;
    setBusy(true);
    try {
      await api(`/api/v1/hotels/${hotelId}/media/${mediaId}`, {method: "DELETE"});
      await refresh();
      router.refresh();
      setMessage(ar?"تم حذف الصورة":"Photo removed");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove media");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const response = await api(`/api/v1/hotels/${hotelId}/media`);
    setItems(response as MediaItem[]);
  }

  return <section className="panel propertyMediaManager">
    <div className="propertyMediaHead">
      <div><span className="eyebrow">{ar?"محتوى الفندق":"Property content"}</span><h2>{ar?"الصور والمعرض":"Photos & gallery"}</h2><p className="muted">{ar?"ارفع عدة صور مرة واحدة، صنّفها حسب المكان، واربط صور الغرف بنوع الغرفة. نفس التصنيفات ستظهر للضيف داخل معرض الفندق.":"Upload multiple images at once, organize them by place, and link room photos to a room type. The same categories power the guest gallery."}</p></div>
      <div className="propertyMediaStat"><Images size={20}/><strong>{images.filter((item)=>item.state==="READY").length}</strong><span>{ar?"صورة جاهزة":"ready photos"}</span></div>
    </div>

    <div className="propertyMediaUploadGrid">
      <form className="propertyPhotoUploader" onSubmit={uploadImage}>
        <div className="propertyUploaderTitle"><ImagePlus size={20}/><div><strong>{ar?"إضافة صور للفندق":"Add property photos"}</strong><span>{ar?"يمكنك اختيار أكثر من صورة في نفس الرفع":"You can select multiple images in one upload"}</span></div></div>
        <label className={`propertyDropzone${imageFileNames.length ? " hasFiles" : ""}`}>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" multiple required disabled={busy} onChange={(event)=>setImageFileNames(Array.from(event.currentTarget.files??[]).map((file)=>file.name))}/>
          <ImagePlus size={28}/><strong>{imageFileNames.length ? (ar?`${imageFileNames.length} صور جاهزة للرفع`:`${imageFileNames.length} images ready`) : (ar?"اختر صور الفندق":"Choose property images")}</strong><span>{imageFileNames.length ? imageFileNames.slice(0,3).join(" · ") : (ar?"JPG أو PNG أو WebP · حد أقصى 10MB للصورة":"JPG, PNG or WebP · up to 10MB each")}</span><b>{ar?"استعراض الصور":"Browse images"}</b>
        </label>
        <div className="propertyUploadFields">
          <label><span>{ar?"تصنيف الصور":"Photo category"}</span><select name="category" value={uploadCategory} onChange={(event)=>setUploadCategory(event.target.value as HotelPhotoCategory)}>{PHOTO_CATEGORIES.map((category)=><option key={category.value} value={category.value}>{ar?category.ar:category.en}</option>)}</select></label>
          <label><span>{ar?"ربط بنوع غرفة":"Link to room type"}</span><select name="roomTypeId" defaultValue=""><option value="">{ar?"بدون ربط بغرفة محددة":"No specific room"}</option>{roomTypes.map((room)=><option value={room.id} key={room.id}>{room.name}</option>)}</select></label>
          <label className="wide"><span>{ar?"وصف الصورة (اختياري)":"Image description (optional)"}</span><input name="alt" maxLength={180} placeholder={ar?"مثال: اللوبي الرئيسي وإطلالة منطقة الجلوس":"Example: Main lobby and seating area"}/></label>
          <label><span>{ar?"بداية ترتيب العرض":"Starting display order"}</span><input name="sortOrder" type="number" min="0" max="1000" defaultValue="0"/></label>
        </div>
        <button className="primaryButton propertyUploadButton" disabled={busy||!imageFileNames.length}><ImagePlus size={17}/>{busy?(ar?"جارٍ الرفع…":"Uploading…"):(ar?"رفع الصور وإضافتها للمعرض":"Upload to gallery")}</button>
      </form>

      <form className="propertyDocumentUploader" onSubmit={uploadDocument}>
        <div className="propertyUploaderTitle"><FileLock2 size={20}/><div><strong>{ar?"مستندات التحقق":"Verification documents"}</strong><span>{ar?"مستندات خاصة لا تظهر للضيف":"Private files never shown to guests"}</span></div></div>
        <label><span>{ar?"نوع المستند":"Document type"}</span><select name="documentType" defaultValue="COMMERCIAL_REGISTRATION"><option value="COMMERCIAL_REGISTRATION">{ar?"السجل التجاري":"Commercial registration"}</option><option value="BUSINESS_LICENSE">{ar?"رخصة العمل":"Business license"}</option><option value="TAX_REGISTRATION">{ar?"التسجيل الضريبي":"Tax registration"}</option><option value="BANK_PROOF">{ar?"إثبات بنكي":"Bank proof"}</option><option value="OWNER_ID">{ar?"هوية المالك":"Owner ID"}</option><option value="OTHER">{ar?"أخرى":"Other"}</option></select></label>
        <label className={`propertyDocumentPicker${documentFileName?" hasFile":""}`}><input name="document" type="file" accept="application/pdf,image/jpeg,image/png" required disabled={busy} onChange={(event)=>setDocumentFileName(event.currentTarget.files?.[0]?.name??null)}/><FileLock2 size={22}/><div><strong>{documentFileName??(ar?"اختر المستند":"Choose document")}</strong><span>{ar?"PDF أو JPG أو PNG":"PDF, JPG or PNG"}</span></div></label>
        <button className="secondaryButton" disabled={busy}>{ar?"رفع المستند الخاص":"Upload private document"}</button>
        <div className="propertyDocumentList">{documents.length===0?<span className="muted">{ar?"لا توجد مستندات مرفوعة بعد":"No documents uploaded yet"}</span>:documents.map((item)=><div key={item.id}><FileLock2 size={15}/><div><strong>{documentTypeLabel(item.document?.type,ar)}</strong><span>{item.document?.status??item.state}</span></div></div>)}</div>
      </form>
    </div>

    {message && <div className="setupMessage propertyMediaMessage"><Check size={16}/>{message}</div>}

    <div className="propertyGalleryAdmin">
      <div className="propertyGalleryAdminHead"><div><h3>{ar?"مكتبة صور الفندق":"Property photo library"}</h3><p>{ar?"فلتر الصور حسب المكان ثم عدّل التصنيف أو الغرفة أو ترتيب العرض.":"Filter by area, then edit category, room assignment or display order."}</p></div><span>{images.length} {ar?"صورة":"photos"}</span></div>
      <div className="propertyCategoryTabs"><button type="button" className={filterCategory==="ALL"?"active":""} onClick={()=>setFilterCategory("ALL")}><Images size={15}/>{ar?"الكل":"All"}<b>{images.length}</b></button>{PHOTO_CATEGORIES.map((category)=>{const Icon=category.icon;const count=categoryCounts.get(category.value)??0;if(!count)return null;return <button type="button" className={filterCategory===category.value?"active":""} onClick={()=>setFilterCategory(category.value)} key={category.value}><Icon size={15}/>{ar?category.ar:category.en}<b>{count}</b></button>})}</div>
      {filteredImages.length===0?<div className="propertyGalleryEmpty"><FileImage size={28}/><strong>{ar?"لا توجد صور في هذا التصنيف":"No photos in this category"}</strong><span>{ar?"ارفع صورًا جديدة أو اختر تصنيفًا آخر.":"Upload new images or choose another category."}</span></div>:<div className="propertyPhotoGrid">{filteredImages.map((item)=>{
        const category=PHOTO_CATEGORIES.find((entry)=>entry.value===(item.photo?.category??"OTHER"))??PHOTO_CATEGORIES.at(-1)!;
        const Icon=category.icon;
        return <article className="propertyPhotoCard" key={item.id}>
          <div className="propertyPhotoPreview">{item.publicUrl&&item.state==="READY"?<img src={item.publicUrl} alt={item.photo?.alt??"Hotel"}/>:<div><FileImage size={26}/><span>{item.state}</span></div>}<span className="propertyPhotoCategoryBadge"><Icon size={13}/>{ar?category.ar:category.en}</span>{item.photo?.roomType&&<span className="propertyPhotoRoomBadge"><BedDouble size={12}/>{item.photo.roomType.name}</span>}</div>
          {item.photo&&<form className="propertyPhotoEditor" onSubmit={(event)=>{event.preventDefault();void savePhoto(item.id,event.currentTarget)}}>
            <label className="wide"><span>{ar?"وصف الصورة":"Image description"}</span><input name="alt" defaultValue={item.photo.alt??""} placeholder={ar?"وصف مختصر للصورة":"Short image description"}/></label>
            <label><span>{ar?"التصنيف":"Category"}</span><select name="category" defaultValue={item.photo.category}>{PHOTO_CATEGORIES.map((entry)=><option key={entry.value} value={entry.value}>{ar?entry.ar:entry.en}</option>)}</select></label>
            <label><span>{ar?"نوع الغرفة":"Room type"}</span><select name="roomTypeId" defaultValue={item.photo.roomTypeId??""}><option value="">{ar?"بدون غرفة":"No room"}</option>{roomTypes.map((room)=><option value={room.id} key={room.id}>{room.name}</option>)}</select></label>
            <label><span>{ar?"الترتيب":"Order"}</span><input name="sortOrder" type="number" min="0" max="1000" defaultValue={item.photo.sortOrder}/></label>
            <div className="propertyPhotoActions"><button className="secondaryButton" disabled={busy}><Save size={14}/>{ar?"حفظ":"Save"}</button><button type="button" className="propertyDeletePhoto" disabled={busy} onClick={()=>void remove(item.id)}><Trash2 size={14}/>{ar?"حذف":"Remove"}</button></div>
          </form>}
        </article>;
      })}</div>}
    </div>
  </section>;
}

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message ?? `Request failed (${response.status})`);
  return payload?.data;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function documentTypeLabel(type:string|undefined,ar:boolean) {
  const labels:Record<string,[string,string]>={COMMERCIAL_REGISTRATION:["السجل التجاري","Commercial registration"],BUSINESS_LICENSE:["رخصة العمل","Business license"],TAX_REGISTRATION:["التسجيل الضريبي","Tax registration"],BANK_PROOF:["إثبات بنكي","Bank proof"],OWNER_ID:["هوية المالك","Owner ID"],OTHER:["مستند آخر","Other document"]};
  const value=labels[type??"OTHER"]??labels.OTHER!;
  return ar?value[0]:value[1];
}
