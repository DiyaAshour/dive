"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HOTEL_AMENITY_CATALOG, HOTEL_AMENITY_MINIMUM, type HotelAmenityCode } from "@platform/contracts";
import type {Locale} from "@/lib/i18n";
import AmenityPicker from "./amenity-picker";

type Translation = {locale:string;name:string|null;description:string|null};
type Content = {
  area: string | null;
  description: string | null;
  starRating: number | null;
  latitude: number | null;
  longitude: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  amenities: Array<{code: string; name: string; category: string | null}>;
  translations: Translation[];
};

type TranslationDraft={name:string;description:string};

const CONTENT_LOCALES=[
  {code:"en",label:"English"},{code:"ar",label:"العربية"},{code:"zh",label:"中文"},{code:"fr",label:"Français"},{code:"de",label:"Deutsch"},
  {code:"es",label:"Español"},{code:"it",label:"Italiano"},{code:"tr",label:"Türkçe"},{code:"ru",label:"Русский"},{code:"ja",label:"日本語"},
  {code:"ko",label:"한국어"},{code:"hi",label:"हिन्दी"},{code:"pt",label:"Português"},{code:"id",label:"Bahasa Indonesia"},{code:"th",label:"ไทย"},
] as const;

const AMENITY_CODE_SET=new Set<string>(HOTEL_AMENITY_CATALOG.map((item)=>item.code));

export default function PublicContentManager({hotelId, content, locale}: {hotelId: string; content: Content; locale: Locale}) {
  const ar=locale==="ar";
  const router=useRouter();
  const initialAmenityCodes=content.amenities.flatMap((amenity)=>isHotelAmenityCode(amenity.code)?[amenity.code]:[]);
  const ignoredLegacyCount=content.amenities.length-initialAmenityCodes.length;
  const [amenityCodes,setAmenityCodes]=useState<HotelAmenityCode[]>(initialAmenityCodes);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [descriptionLength,setDescriptionLength]=useState(content.description?.length??0);
  const [translationLocale,setTranslationLocale]=useState(ar?"ar":"en");
  const [translations,setTranslations]=useState<Record<string,TranslationDraft>>(()=>Object.fromEntries(CONTENT_LOCALES.map(({code})=>{
    const existing=content.translations.find((item)=>item.locale===code);
    return [code,{name:existing?.name??"",description:existing?.description??""}];
  })));
  const activeTranslation=translations[translationLocale]??{name:"",description:""};
  const amenitiesReady=amenityCodes.length>=HOTEL_AMENITY_MINIMUM;

  function updateTranslation(field:keyof TranslationDraft,value:string){
    setTranslations((current)=>({...current,[translationLocale]:{...(current[translationLocale]??{name:"",description:""}),[field]:value}}));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if(!amenitiesReady){
      setMessage(ar?`اختر ${HOTEL_AMENITY_MINIMUM} مرافق وخدمات على الأقل قبل حفظ هذه الخطوة.`:`Choose at least ${HOTEL_AMENITY_MINIMUM} property facilities and services before saving this step.`);
      return;
    }
    setSaving(true);
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
          amenities: amenityCodes.map((code)=>{
            const item=HOTEL_AMENITY_CATALOG.find((amenity)=>amenity.code===code);
            if(!item)throw new Error(ar?"يوجد مرفق غير صالح في الاختيار":"An invalid amenity was selected");
            return {code:item.code,name:item.name,category:item.category};
          }),
          translations: CONTENT_LOCALES.map(({code})=>({locale:code,name:nullableText(translations[code]?.name),description:nullableText(translations[code]?.description)})),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? (ar?"تعذر حفظ المعلومات":"Unable to save property details"));
      setMessage(ar?"تم الحفظ بنجاح. المرافق المختارة مرتبطة الآن مباشرة بصفحة الفندق، والترجمة تظهر حسب لغة الضيف.":"Saved successfully. The selected facilities are now connected directly to the public hotel page, with labels localized for the guest language.");
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

      <label className="partnerTextareaField partnerDescriptionField">{ar?"الوصف الأساسي للفندق":"Default property description"}<span className="fieldHelp">{ar?"هذا هو النص الاحتياطي إذا لم تضف ترجمة للغة الضيف. اكتب أين يقع الفندق وما الذي يميّزه. مطلوب 80 حرفًا على الأقل للنشر.":"This is the fallback text when a guest-language translation is not available. Explain where the property is and what makes it useful. At least 80 characters are required to publish."}</span><textarea name="description" rows={5} defaultValue={content.description ?? ""} onChange={(event)=>setDescriptionLength(event.currentTarget.value.length)} placeholder={ar?"مثال: يقع الفندق في قلب العبدلي بالقرب من المطاعم ومراكز التسوق، ويوفر غرفًا مريحة ومناسبة لرحلات العمل والعائلات.":"Example: Located in central Abdali near restaurants and shopping, with comfortable rooms for business and family stays."}/><span className="descriptionCounter"><span className={descriptionLength>=80?"ok":""}>{descriptionLength>=80?(ar?"✓ طول الوصف مناسب للنشر":"✓ Description length is ready"):(ar?`باقي ${Math.max(0,80-descriptionLength)} حرفًا للوصول للحد المطلوب`:`${Math.max(0,80-descriptionLength)} characters remaining`)}</span><b>{descriptionLength}/80+</b></span></label>

      <details className="advancedLocation" open>
        <summary>{ar?"ترجمات اسم ووصف الفندق":"Property name & description translations"}</summary>
        <p>{ar?"اختر لغة واكتب الترجمة التي ستظهر للضيف عندما يستخدم HandMeKey بهذه اللغة. إذا تركتها فارغة سيظهر الوصف الأساسي أعلاه تلقائيًا.":"Choose a language and enter what guests should see when HandMeKey is displayed in that language. Leave a translation empty to use the default content above."}</p>
        <div className="formGrid">
          <label>{ar?"لغة الترجمة":"Translation language"}<select value={translationLocale} onChange={(event)=>setTranslationLocale(event.target.value)}>{CONTENT_LOCALES.map((item)=><option value={item.code} key={item.code}>{item.label}</option>)}</select></label>
          <label>{ar?"اسم الفندق المترجم (اختياري)":"Translated property name (optional)"}<input value={activeTranslation.name} onChange={(event)=>updateTranslation("name",event.currentTarget.value)} placeholder={ar?"اتركه فارغًا إذا كان اسم البراند لا يحتاج ترجمة":"Leave blank if the brand name should stay unchanged"}/></label>
        </div>
        <label className="partnerTextareaField"><span>{ar?"الوصف المترجم":"Translated description"}</span><span className="fieldHelp">{ar?`تعديل نسخة ${CONTENT_LOCALES.find((item)=>item.code===translationLocale)?.label??translationLocale}. يتم حفظ كل اللغات معًا عند الضغط على زر الحفظ.`:`Editing the ${CONTENT_LOCALES.find((item)=>item.code===translationLocale)?.label??translationLocale} version. All languages are saved together.`}</span><textarea rows={5} value={activeTranslation.description} onChange={(event)=>updateTranslation("description",event.currentTarget.value)} placeholder={ar?"اكتب وصف الفندق بهذه اللغة…":"Write the property description in this language…"}/></label>
      </details>

      <div className="formGrid">
        <label>{ar?"وقت تسجيل الدخول":"Guest check-in time"}<span className="fieldHelp">{ar?"من أي ساعة يستطيع الضيف استلام الغرفة؟":"From what time can guests receive their room?"}</span><input name="checkInTime" type="time" defaultValue={content.checkInTime ?? ""}/></label>
        <label>{ar?"وقت تسجيل المغادرة":"Guest check-out time"}<span className="fieldHelp">{ar?"حتى أي ساعة يجب على الضيف مغادرة الغرفة؟":"By what time should guests leave the room?"}</span><input name="checkOutTime" type="time" defaultValue={content.checkOutTime ?? ""}/></label>
      </div>

      <AmenityPicker locale={locale} selectedCodes={amenityCodes} onChange={setAmenityCodes} ignoredLegacyCount={ignoredLegacyCount}/>

      <details className="advancedLocation">
        <summary>{ar?"تحديد الموقع بدقة على الخريطة (اختياري الآن)":"Precise map location (optional for now)"}</summary>
        <p>{ar?"هذه الأرقام تحدد مكان الفندق على الخريطة. إذا لم تكن تعرفها اتركها فارغة الآن، ويمكن إضافتها لاحقًا.":"These coordinates place the property precisely on the map. If you do not know them, leave them empty and add them later."}</p>
        <div className="formGrid"><label>{ar?"خط العرض (Latitude)":"Latitude"}<input name="latitude" type="number" min="-90" max="90" step="0.000001" defaultValue={content.latitude ?? ""} placeholder="31.9539"/></label><label>{ar?"خط الطول (Longitude)":"Longitude"}<input name="longitude" type="number" min="-180" max="180" step="0.000001" defaultValue={content.longitude ?? ""} placeholder="35.9106"/></label></div>
      </details>

      <button className="primaryButton" disabled={saving||!amenitiesReady}>{saving ? (ar?"جارٍ الحفظ…":"Saving…") : !amenitiesReady ? (ar?`اختر ${HOTEL_AMENITY_MINIMUM} مرافق للمتابعة`:`Choose ${HOTEL_AMENITY_MINIMUM} facilities to continue`) : (ar?"حفظ هذه الخطوة":"Save this step")}</button>
    </form>
    {message && <div className="setupMessage">{message}</div>}
  </section>;
}

function isHotelAmenityCode(value:string):value is HotelAmenityCode{return AMENITY_CODE_SET.has(value);}

function nullable(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function nullableText(value:string|undefined):string|null{
  const text=value?.trim()??"";
  return text||null;
}

function nullableNumber(value: FormDataEntryValue | null): number | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error("Location and star rating fields must be valid numbers");
  return number;
}
