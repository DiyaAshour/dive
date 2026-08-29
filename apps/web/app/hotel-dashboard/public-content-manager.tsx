"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {Locale} from "@/lib/i18n";

type Content = {
  area: string | null;
  description: string | null;
  starRating: number | null;
  latitude: number | null;
  longitude: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  amenities: Array<{code: string; name: string; category: string | null}>;
};

export default function PublicContentManager({hotelId, content, locale}: {hotelId: string; content: Content; locale: Locale}) {
  const ar=locale==="ar";
  const router=useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [descriptionLength,setDescriptionLength]=useState(content.description?.length??0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/hotels/${hotelId}/content`, {
        method: "PUT",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          area: nullable(form.get("area")),
          description: nullable(form.get("description")),
          starRating: nullableNumber(form.get("starRating")),
          latitude: nullableNumber(form.get("latitude")),
          longitude: nullableNumber(form.get("longitude")),
          checkInTime: nullable(form.get("checkInTime")),
          checkOutTime: nullable(form.get("checkOutTime")),
          amenities: parseAmenities(String(form.get("amenities") ?? ""),content.amenities),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? (ar?"تعذر حفظ المعلومات":"Unable to save property details"));
      setMessage(ar?"تم الحفظ بنجاح. أي متطلب اكتمل سيختفي تلقائيًا من قائمة النواقص في خطوة النشر.":"Saved successfully. Any completed requirement will automatically disappear from the publishing checklist.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : (ar?"تعذر حفظ المعلومات":"Unable to save property details"));
    } finally {
      setSaving(false);
    }
  }

  return <section className="panel setupPanel wideSetup" style={{marginBottom:24}}>
    <span className="eyebrow">{ar?"الخطوة 1 من 4":"Step 1 of 4"}</span>
    <h2>{ar?"المعلومات الأساسية التي يراها الضيف":"Property details guests will see"}</h2>
    <div className="simpleSectionIntro">{ar?"عبّي المعلومات بشكل طبيعي ثم اضغط «حفظ هذه الخطوة». ما في رموز أو إعدادات تقنية مطلوبة. إذا اكتمل أحد شروط النشر سيُحتسب تلقائيًا.":"Fill in the information naturally, then select “Save this step”. No technical codes are required. Publishing requirements update automatically when completed."}</div>
    <form className="stackForm" onSubmit={submit}>
      <div className="formGrid">
        <label>{ar?"المنطقة أو الحي":"Area or neighborhood"}<span className="fieldHelp">{ar?"مثال: العبدلي، الشميساني، البحر الميت":"Example: Abdali, Shmeisani, Dead Sea"}</span><input name="area" defaultValue={content.area ?? ""} placeholder={ar?"مثال: العبدلي":"Example: Abdali"}/></label>
        <label>{ar?"تصنيف الفندق بالنجوم":"Hotel star rating"}<span className="fieldHelp">{ar?"اختر التصنيف الرسمي للفندق":"Choose the property's official rating"}</span><select name="starRating" defaultValue={content.starRating?.toString()??""}><option value="">{ar?"اختر عدد النجوم":"Choose rating"}</option>{[1,2,3,4,5].map((stars)=><option value={stars} key={stars}>{stars} {ar?(stars===1?"نجمة":"نجوم"):(stars===1?"star":"stars")}</option>)}</select></label>
      </div>

      <label className="partnerTextareaField partnerDescriptionField">{ar?"وصف الفندق":"Property description"}<span className="fieldHelp">{ar?"اكتب للضيف باختصار: أين يقع الفندق، ما الذي يميّزه، ولمن يناسب. مطلوب 80 حرفًا على الأقل للنشر.":"Tell guests where the property is, what makes it useful, and who it suits. At least 80 characters are required to publish."}</span><textarea name="description" rows={5} defaultValue={content.description ?? ""} onChange={(event)=>setDescriptionLength(event.currentTarget.value.length)} placeholder={ar?"مثال: يقع الفندق في قلب العبدلي بالقرب من المطاعم ومراكز التسوق، ويوفر غرفًا مريحة ومناسبة لرحلات العمل والعائلات.":"Example: Located in central Abdali near restaurants and shopping, with comfortable rooms for business and family stays."}/><span className="descriptionCounter"><span className={descriptionLength>=80?"ok":""}>{descriptionLength>=80?(ar?"✓ طول الوصف مناسب للنشر":"✓ Description length is ready"):(ar?`باقي ${Math.max(0,80-descriptionLength)} حرفًا للوصول للحد المطلوب`:`${Math.max(0,80-descriptionLength)} characters remaining`)}</span><b>{descriptionLength}/80+</b></span></label>

      <div className="formGrid">
        <label>{ar?"وقت تسجيل الدخول":"Guest check-in time"}<span className="fieldHelp">{ar?"من أي ساعة يستطيع الضيف استلام الغرفة؟":"From what time can guests receive their room?"}</span><input name="checkInTime" type="time" defaultValue={content.checkInTime ?? ""}/></label>
        <label>{ar?"وقت تسجيل المغادرة":"Guest check-out time"}<span className="fieldHelp">{ar?"حتى أي ساعة يجب على الضيف مغادرة الغرفة؟":"By what time should guests leave the room?"}</span><input name="checkOutTime" type="time" defaultValue={content.checkOutTime ?? ""}/></label>
      </div>

      <label className="partnerTextareaField partnerAmenitiesField">{ar?"مرافق وخدمات الفندق":"Property facilities & services"}<span className="fieldHelp">{ar?"اكتب اسم كل مرفق في سطر مستقل. تحتاج 3 مرافق على الأقل للنشر. لا تكتب أي أكواد.":"Enter one facility per line. At least 3 are required to publish. Do not enter technical codes."}</span><textarea name="amenities" rows={6} defaultValue={content.amenities.map((amenity)=>amenity.name).join("\n")} placeholder={ar?"واي فاي مجاني\nموقف سيارات\nمسبح\nمطعم\nنادي رياضي":"Free Wi-Fi\nParking\nSwimming pool\nRestaurant\nGym"}/></label>

      <details className="advancedLocation">
        <summary>{ar?"تحديد الموقع بدقة على الخريطة (اختياري الآن)":"Precise map location (optional for now)"}</summary>
        <p>{ar?"هذه الأرقام تحدد مكان الفندق على الخريطة. إذا لم تكن تعرفها اتركها فارغة الآن، ويمكن إضافتها لاحقًا.":"These coordinates place the property precisely on the map. If you do not know them, leave them empty and add them later."}</p>
        <div className="formGrid"><label>{ar?"خط العرض (Latitude)":"Latitude"}<input name="latitude" type="number" min="-90" max="90" step="0.000001" defaultValue={content.latitude ?? ""} placeholder="31.9539"/></label><label>{ar?"خط الطول (Longitude)":"Longitude"}<input name="longitude" type="number" min="-180" max="180" step="0.000001" defaultValue={content.longitude ?? ""} placeholder="35.9106"/></label></div>
      </details>

      <button className="primaryButton" disabled={saving}>{saving ? (ar?"جارٍ الحفظ…":"Saving…") : (ar?"حفظ هذه الخطوة":"Save this step")}</button>
    </form>
    {message && <div className="setupMessage">{message}</div>}
  </section>;
}

function nullable(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function nullableNumber(value: FormDataEntryValue | null): number | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error("Location and star rating fields must be valid numbers");
  return number;
}

function parseAmenities(value:string,existing:Content["amenities"]) {
  const existingByName=new Map(existing.map((amenity)=>[amenity.name.trim().toLocaleLowerCase(),amenity]));
  return lines(value).map((line,index)=>{
    if(line.includes("|")){
      const [code,name,category]=line.split("|").map((part)=>part.trim());
      if(!code||!name)throw new Error(`Amenity line ${index+1} is incomplete`);
      return {code,name,category:category||null};
    }
    const previous=existingByName.get(line.toLocaleLowerCase());
    return previous?{code:previous.code,name:line,category:previous.category}:{code:`CUSTOM_${stableCode(line)}`,name:line,category:null};
  });
}

function stableCode(value:string){
  let hash=2166136261;
  for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(36).toUpperCase();
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
