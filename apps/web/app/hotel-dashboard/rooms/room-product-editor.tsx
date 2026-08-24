"use client";

import Link from "next/link";
import {useMemo, useState} from "react";
import type {FormEvent} from "react";
import {useRouter} from "next/navigation";
import {Baby, Bath, BedDouble, CheckCircle2, Circle, Home, Image as ImageIcon, Plus, Ruler, Save, Trash2, UserRound} from "lucide-react";
import type {Locale} from "@/lib/i18n";

const UNIT_TYPES = ["ROOM", "STUDIO", "SUITE", "APARTMENT", "VILLA", "CHALET", "BUNGALOW", "HOLIDAY_HOME", "DORMITORY_ROOM", "BED_IN_DORMITORY"] as const;
const BED_TYPES = ["SINGLE", "DOUBLE", "QUEEN", "KING", "EXTRA_LARGE_DOUBLE", "SOFA_BED", "BUNK_BED", "FUTON", "MURPHY_BED"] as const;
const FACILITIES = [
  ["AIR_CONDITIONING", "Air conditioning", "تكييف", "Comfort"],
  ["FLAT_SCREEN_TV", "Flat-screen TV", "تلفاز بشاشة مسطحة", "Media"],
  ["SOUNDPROOFING", "Soundproofing", "عزل صوتي", "Comfort"],
  ["PRIVATE_ENTRANCE", "Private entrance", "مدخل خاص", "Access"],
  ["REFRIGERATOR", "Refrigerator", "ثلاجة", "Kitchen"],
  ["TEA_COFFEE", "Tea/Coffee maker", "آلة شاي وقهوة", "Kitchen"],
  ["BALCONY", "Balcony", "شرفة", "Outdoor"],
  ["GARDEN_VIEW", "Garden view", "إطلالة على الحديقة", "View"],
  ["POOL_VIEW", "Pool view", "إطلالة على المسبح", "View"],
  ["CITY_VIEW", "City view", "إطلالة على المدينة", "View"],
  ["KITCHENETTE", "Kitchenette", "مطبخ صغير", "Kitchen"],
  ["WIFI", "Wi-Fi", "واي فاي", "Connectivity"],
  ["SAFE", "Safe", "خزنة", "Security"],
  ["MINIBAR", "Minibar", "ميني بار", "Food"],
  ["DESK", "Desk", "مكتب", "Workspace"],
  ["WASHING_MACHINE", "Washing machine", "غسالة", "Laundry"],
  ["SEATING_AREA", "Seating area", "منطقة جلوس", "Living"],
] as const;

type UnitType = typeof UNIT_TYPES[number];
type BedType = typeof BED_TYPES[number];
type BedDraft = {area: string; type: BedType; quantity: number; sortOrder: number};
type Amenity = {code: string; name: string; category: string | null};
type RoomDraft = {
  name: string; code: string; description: string; unitType: UnitType; quantity: number; maxGuests: number; maxAdults: number; maxChildren: number; maxInfants: number; bedroomCount: number; livingRoomCount: number; bathroomCount: number; privateBathroom: boolean; sizeValue: number | null; sizeUnit: "SQM" | "SQFT"; smokingPolicy: "NON_SMOKING" | "SMOKING" | "BOTH"; extraBedCount: number; cribCount: number; allowsCribAndExtraBed: boolean; active: boolean;
};
type RoomProduct = RoomDraft & {id: string; beds: Array<BedDraft & {id?: string}>; amenities: Array<Amenity & {id?: string}>; photos: Array<{id: string; url: string; alt: string | null; sortOrder: number}>};

export default function RoomProductEditor({hotelId, locale, initialRoom}: Readonly<{hotelId: string; locale: Locale; initialRoom?: RoomProduct | null}>) {
  const ar = locale === "ar";
  const router = useRouter();
  const [room, setRoom] = useState<RoomDraft>(() => initialRoom ? roomDraft(initialRoom) : emptyRoom());
  const [beds, setBeds] = useState<BedDraft[]>(() => initialRoom?.beds.map(({area, type, quantity, sortOrder}) => ({area, type, quantity, sortOrder})) ?? [{area: ar ? "غرفة النوم 1" : "Bedroom 1", type: "KING", quantity: 1, sortOrder: 0}]);
  const curatedCodes = useMemo(() => new Set(FACILITIES.map(([code]) => code)), []);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(() => initialRoom?.amenities.filter((item) => curatedCodes.has(item.code as typeof FACILITIES[number][0])).map((item) => item.code) ?? []);
  const [customAmenities, setCustomAmenities] = useState(() => initialRoom?.amenities.filter((item) => !curatedCodes.has(item.code as typeof FACILITIES[number][0])).map((item) => `${item.code} | ${item.name}${item.category ? ` | ${item.category}` : ""}`).join("\n") ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAmenityObjects = FACILITIES.filter(([code]) => selectedFacilities.includes(code)).map(([code, name, , category]) => ({code, name, category}));
  const checks = [
    {label: ar ? "اسم وكود الوحدة" : "Unit name and code", passed: room.name.trim().length >= 2 && room.code.trim().length >= 2},
    {label: ar ? "سعة ضيوف منطقية" : "Valid guest occupancy", passed: occupancyIsValid(room, beds)},
    {label: ar ? "توزيع أسرّة" : "Bed configuration", passed: bedsAreValid(beds)},
    {label: ar ? "مساحة الوحدة" : "Unit size", passed: room.sizeValue !== null && room.sizeValue > 0},
    {label: ar ? "وصف واضح" : "Guest description", passed: room.description.trim().length >= 40},
    {label: ar ? "ثلاثة مرافق" : "Three room facilities", passed: selectedAmenityObjects.length + customAmenityCount(customAmenities) >= 3},
    {label: ar ? "صورة مرتبطة بالغرفة" : "Room-level photo", passed: Boolean(initialRoom?.photos.length)},
  ];
  const complete = checks.filter((check) => check.passed).length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(null); setError(null);
    try {
      const custom = parseAmenities(customAmenities, ar);
      const amenities = [...selectedAmenityObjects, ...custom];
      if (new Set(amenities.map((item) => item.code)).size !== amenities.length) throw new Error(ar ? "يوجد كود مرفق مكرر." : "A room facility code is duplicated.");
      const endpoint = initialRoom ? `/api/v1/hotels/${hotelId}/room-types/${initialRoom.id}` : `/api/v1/hotels/${hotelId}/room-types`;
      const response = await fetch(endpoint, {method: initialRoom ? "PATCH" : "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({...room, description: room.description.trim() || null, code: room.code.toUpperCase(), beds: beds.map((bed, index) => ({...bed, area: bed.area.trim(), sortOrder: index})), amenities})});
      const payload = await response.json().catch(() => null);
      if (response.status === 401) {window.location.assign(`/partner/login?next=${encodeURIComponent(`/hotel-dashboard/rooms?hotelId=${hotelId}`)}`); return;}
      if (!response.ok) throw new Error(apiIssue(payload, ar));
      const saved = payload?.data?.roomType as {id?: string} | undefined;
      setMessage(initialRoom ? (ar ? "تم تحديث الغرفة وربط التعديل بصفحة الضيف." : "Room product updated and linked to the guest page.") : (ar ? "تم إنشاء الغرفة. يمكنك الآن إضافة الأسعار والصور." : "Room created. You can now add rates and photos."));
      if (!initialRoom && saved?.id) router.replace(`/hotel-dashboard/rooms/${saved.id}?hotelId=${hotelId}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ar ? "تعذر حفظ الغرفة" : "Unable to save room"));
    } finally {setBusy(false);}
  }

  function update<K extends keyof RoomDraft>(key: K, value: RoomDraft[K]) {setRoom((current) => ({...current, [key]: value}));}
  function updateBed(index: number, patch: Partial<BedDraft>) {setBeds((items) => items.map((bed, position) => position === index ? {...bed, ...patch} : bed));}
  function removeBed(index: number) {setBeds((items) => items.filter((_, position) => position !== index));}
  function toggleFacility(code: string) {setSelectedFacilities((items) => items.includes(code) ? items.filter((item) => item !== code) : [...items, code]);}

  return <form className="roomStudio" onSubmit={submit}>
    <div className="roomStudioMain">
      <section className="panel roomEditorSection"><div className="roomEditorHead"><Home size={20}/><div><span className="eyebrow">01</span><h2>{ar ? "هوية الوحدة" : "Unit identity"}</h2></div></div><div className="roomEditorGrid">
        <label>{ar ? "اسم الغرفة الظاهر للضيف" : "Guest-facing room name"}<input value={room.name} onChange={(event) => update("name", event.target.value)} minLength={2} maxLength={100} required/></label>
        <label>{ar ? "الكود الداخلي" : "Internal reference code"}<input value={room.code} onChange={(event) => update("code", event.target.value.toUpperCase())} minLength={2} maxLength={20} required/></label>
        <label>{ar ? "نوع الوحدة" : "Unit type"}<select value={room.unitType} onChange={(event) => update("unitType", event.target.value as UnitType)}>{UNIT_TYPES.map((type) => <option value={type} key={type}>{unitTypeLabel(type, ar)}</option>)}</select></label>
        <label>{ar ? "عدد الوحدات من هذا النوع" : "Number of units"}<input type="number" min="1" max="32000" value={room.quantity} onChange={(event) => update("quantity", Number(event.target.value))} required/></label>
        <label className="roomFieldWide">{ar ? "وصف الغرفة" : "Room description"}<textarea rows={5} maxLength={3000} value={room.description} onChange={(event) => update("description", event.target.value)} placeholder={ar ? "اشرح المساحة، الإطلالة وتجربة الإقامة داخل هذه الوحدة." : "Describe the space, view and stay experience inside this unit."}/></label>
        <label className="roomInlineCheck roomFieldWide"><input type="checkbox" checked={room.active} onChange={(event) => update("active", event.target.checked)}/><span><strong>{ar ? "متاحة للبيع" : "Active for sale"}</strong><small>{ar ? "إلغاء التفعيل يخفي الوحدة من العروض الجديدة ولا يلغي الحجوزات الحالية." : "Deactivation removes the unit from new offers without cancelling existing bookings."}</small></span></label>
      </div></section>

      <section className="panel roomEditorSection"><div className="roomEditorHead"><UserRound size={20}/><div><span className="eyebrow">02</span><h2>{ar ? "السعة والتوزيع" : "Occupancy & layout"}</h2></div></div><div className="roomEditorGrid roomCapacityGrid">
        <NumberField label={ar ? "Fits / إجمالي الضيوف" : "Fits / max guests"} value={room.maxGuests} min={1} max={50} onChange={(value) => update("maxGuests", value)}/>
        <NumberField label={ar ? "البالغون" : "Adults"} value={room.maxAdults} min={1} max={50} onChange={(value) => update("maxAdults", value)}/>
        <NumberField label={ar ? "الأطفال" : "Children"} value={room.maxChildren} min={0} max={49} onChange={(value) => update("maxChildren", value)}/>
        <NumberField label={ar ? "الرضّع" : "Infants"} value={room.maxInfants} min={0} max={49} onChange={(value) => update("maxInfants", value)}/>
        <NumberField label={ar ? "غرف النوم" : "Bedrooms"} value={room.bedroomCount} min={0} max={50} onChange={(value) => update("bedroomCount", value)}/>
        <NumberField label={ar ? "غرف المعيشة" : "Living rooms"} value={room.livingRoomCount} min={0} max={25} onChange={(value) => update("livingRoomCount", value)}/>
        <NumberField label={ar ? "الحمامات" : "Bathrooms"} value={room.bathroomCount} min={0} max={25} onChange={(value) => update("bathroomCount", value)}/>
        <label>{ar ? "سياسة التدخين" : "Smoking policy"}<select value={room.smokingPolicy} onChange={(event) => update("smokingPolicy", event.target.value as RoomDraft["smokingPolicy"])}><option value="NON_SMOKING">{ar ? "غير مدخنين" : "Non-smoking"}</option><option value="SMOKING">{ar ? "تدخين" : "Smoking"}</option><option value="BOTH">{ar ? "متاح الخياران" : "Both available"}</option></select></label>
        <label>{ar ? "المساحة" : "Size"}<div className="roomInputPair"><input type="number" min="0.1" max="9999.99" step="0.01" value={room.sizeValue ?? ""} onChange={(event) => update("sizeValue", event.target.value ? Number(event.target.value) : null)}/><select value={room.sizeUnit} onChange={(event) => update("sizeUnit", event.target.value as RoomDraft["sizeUnit"])}><option value="SQM">m²</option><option value="SQFT">ft²</option></select></div></label>
        <label className="roomInlineCheck"><input type="checkbox" checked={room.privateBathroom} onChange={(event) => update("privateBathroom", event.target.checked)}/><span><strong>{ar ? "حمام خاص" : "Private bathroom"}</strong></span></label>
      </div></section>

      <section className="panel roomEditorSection"><div className="roomEditorHead"><BedDouble size={20}/><div><span className="eyebrow">03</span><h2>{ar ? "تكوين الأسرّة" : "Bed configuration"}</h2><p>{ar ? "استخدم اسم المساحة مثل غرفة النوم 1 أو غرفة المعيشة." : "Name each sleeping area, such as Bedroom 1 or Living room."}</p></div></div><div className="bedEditorList">
        {beds.map((bed, index) => <div className="bedEditorRow" key={`${index}-${bed.type}`}><input aria-label={ar ? "المساحة" : "Sleeping area"} value={bed.area} onChange={(event) => updateBed(index, {area: event.target.value})} required/><select aria-label={ar ? "نوع السرير" : "Bed type"} value={bed.type} onChange={(event) => updateBed(index, {type: event.target.value as BedType})}>{BED_TYPES.map((type) => <option value={type} key={type}>{bedLabel(type, ar)}</option>)}</select><input aria-label={ar ? "العدد" : "Quantity"} type="number" min="1" max="255" value={bed.quantity} onChange={(event) => updateBed(index, {quantity: Number(event.target.value)})}/><button type="button" aria-label={ar ? "حذف السرير" : "Remove bed"} disabled={beds.length === 1} onClick={() => removeBed(index)}><Trash2 size={17}/></button></div>)}
        <button className="secondaryButton roomAddBed" type="button" onClick={() => setBeds((items) => [...items, {area: ar ? `غرفة النوم ${room.bedroomCount || 1}` : `Bedroom ${room.bedroomCount || 1}`, type: "SINGLE", quantity: 1, sortOrder: items.length}])}><Plus size={16}/>{ar ? "إضافة سرير أو مساحة" : "Add bed or sleeping area"}</button>
      </div><div className="roomEditorGrid roomExtrasGrid"><NumberField label={ar ? "أسرّة إضافية عند الطلب" : "Extra beds on request"} value={room.extraBedCount} min={0} max={100} onChange={(value) => update("extraBedCount", value)}/><NumberField label={ar ? "مهود أطفال عند الطلب" : "Cribs on request"} value={room.cribCount} min={0} max={100} onChange={(value) => update("cribCount", value)}/><label className="roomInlineCheck"><input type="checkbox" checked={room.allowsCribAndExtraBed} onChange={(event) => update("allowsCribAndExtraBed", event.target.checked)}/><span><strong>{ar ? "السماح بالمهد والسرير الإضافي معًا" : "Crib and extra bed may be requested together"}</strong></span></label></div></section>

      <section className="panel roomEditorSection"><div className="roomEditorHead"><CheckCircle2 size={20}/><div><span className="eyebrow">04</span><h2>{ar ? "مرافق الغرفة" : "Room facilities"}</h2></div></div><div className="facilityPicker">{FACILITIES.map(([code, nameEn, nameAr]) => <label className={selectedFacilities.includes(code) ? "selected" : ""} key={code}><input type="checkbox" checked={selectedFacilities.includes(code)} onChange={() => toggleFacility(code)}/><span>{ar ? nameAr : nameEn}</span></label>)}</div><label className="roomCustomAmenities">{ar ? "مرافق مخصصة" : "Custom facilities"}<small>{ar ? "كل سطر: CODE | الاسم | التصنيف اختياري" : "One per line: CODE | display name | optional category"}</small><textarea rows={5} value={customAmenities} onChange={(event) => setCustomAmenities(event.target.value)} placeholder="FIREPLACE | Fireplace | Comfort"/></label></section>
    </div>

    <aside className="roomStudioAside">
      <section className="roomGuestPreview"><div className="roomPreviewMedia">{initialRoom?.photos[0] ? <img src={initialRoom.photos[0].url} alt={initialRoom.photos[0].alt ?? room.name}/> : <><ImageIcon size={28}/><span>{ar ? "صورة الغرفة قيد الإضافة" : "Room photo pending"}</span></>}</div><div className="roomPreviewBody"><span className="eyebrow">{ar ? "معاينة بطاقة الضيف" : "Guest card preview"}</span><h2>{room.name || (ar ? "اسم الغرفة" : "Room name")}</h2><div className="roomFits"><strong>{ar ? "تتسع:" : "Fits:"}</strong><span>{guestIcons(room.maxGuests)}</span></div>{groupBeds(beds).map(([area, areaBeds]) => <p className="roomBedLine" key={area}><strong>{bedAreaLabel(area, ar)}:</strong> {areaBeds.map((bed) => `${bed.quantity} ${bedLabel(bed.type, ar)}`).join(" + ")} <BedDouble size={17}/></p>)}{room.cribCount > 0 && <p className="roomBedLine"><Baby size={16}/>{ar ? "مهد مجاني متاح عند الطلب" : "Crib available on request"}</p>}<div className="roomPreviewTags"><span><Home size={15}/>{unitTypeLabel(room.unitType, ar)}</span>{room.sizeValue && <span><Ruler size={15}/>{room.sizeValue} {room.sizeUnit === "SQM" ? "m²" : "ft²"}</span>}{room.privateBathroom && <span><Bath size={15}/>{ar ? "حمام خاص" : "Private bathroom"}</span>}{selectedAmenityObjects.slice(0, 7).map((amenity) => <span key={amenity.code}>{facilityLabel(amenity.code, ar)}</span>)}</div></div></section>
      <section className="panel roomCompleteness"><div><span className="eyebrow">{ar ? "جودة المنتج" : "Product quality"}</span><strong>{complete}/{checks.length}</strong></div><div className="roomProgress"><i style={{width: `${complete / checks.length * 100}%`}}/></div>{checks.map((check) => <p key={check.label}>{check.passed ? <CheckCircle2 size={16}/> : <Circle size={16}/>}<span>{check.label}</span></p>)}{!initialRoom?.photos.length && <Link href={`/hotel-dashboard?hotelId=${hotelId}`}>{ar ? "اربط صورة من قسم الوسائط" : "Assign a photo in Media"}</Link>}</section>
      <div className="roomSavePanel">{message && <p className="roomSuccess" role="status">{message}</p>}{error && <p className="formError" role="alert">{error}</p>}<button className="primaryButton" type="submit" disabled={busy}><Save size={17}/>{busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : initialRoom ? (ar ? "حفظ تغييرات الغرفة" : "Save room changes") : (ar ? "إنشاء الغرفة" : "Create room")}</button></div>
    </aside>
  </form>;
}

function emptyRoom(): RoomDraft {return {name: "", code: "", description: "", unitType: "ROOM", quantity: 1, maxGuests: 2, maxAdults: 2, maxChildren: 0, maxInfants: 0, bedroomCount: 1, livingRoomCount: 0, bathroomCount: 1, privateBathroom: true, sizeValue: null, sizeUnit: "SQM", smokingPolicy: "NON_SMOKING", extraBedCount: 0, cribCount: 0, allowsCribAndExtraBed: false, active: true};}
function roomDraft(room: RoomProduct): RoomDraft {const {id: _id, beds: _beds, amenities: _amenities, photos: _photos, ...draft} = room; return draft;}
function NumberField({label, value, min, max, onChange}: {label: string; value: number; min: number; max: number; onChange: (value: number) => void}) {return <label>{label}<input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} required/></label>;}
function groupBeds(beds: BedDraft[]): Array<[string, BedDraft[]]> {const groups = new Map<string, BedDraft[]>(); for (const bed of beds) groups.set(bed.area || "Bedroom", [...(groups.get(bed.area || "Bedroom") ?? []), bed]); return [...groups.entries()];}
function guestIcons(count: number) {const visible = Math.min(Math.max(count, 1), 6); return <>{Array.from({length: visible}, (_, index) => <UserRound size={19} fill="currentColor" key={index}/>)}{count > 6 && <b>× {count}</b>}</>;}
function unitTypeLabel(value: UnitType, ar: boolean) {const labels: Record<UnitType, [string, string]> = {ROOM: ["Room", "غرفة"], STUDIO: ["Entire studio", "استوديو كامل"], SUITE: ["Suite", "جناح"], APARTMENT: ["Entire apartment", "شقة كاملة"], VILLA: ["Villa", "فيلا"], CHALET: ["Chalet", "شاليه"], BUNGALOW: ["Bungalow", "بنغلو"], HOLIDAY_HOME: ["Holiday home", "بيت عطلات"], DORMITORY_ROOM: ["Dormitory room", "غرفة نوم مشتركة"], BED_IN_DORMITORY: ["Bed in dormitory", "سرير في غرفة مشتركة"]}; return labels[value][ar ? 1 : 0];}
function bedLabel(value: BedType, ar: boolean) {const labels: Record<BedType, [string, string]> = {SINGLE: ["single bed", "سرير فردي"], DOUBLE: ["double bed", "سرير مزدوج"], QUEEN: ["queen bed", "سرير كوين"], KING: ["king bed", "سرير كينغ"], EXTRA_LARGE_DOUBLE: ["extra-large double bed", "سرير مزدوج كبير جدًا"], SOFA_BED: ["sofa bed", "سرير أريكة"], BUNK_BED: ["bunk bed", "سرير بطابقين"], FUTON: ["futon bed", "سرير فوتون"], MURPHY_BED: ["Murphy bed", "سرير جداري"]}; return labels[value][ar ? 1 : 0];}
function bedAreaLabel(value: string, ar: boolean) {if (!ar) return value; const bedroom = /^bedroom\s*(\d+)?$/i.exec(value.trim()); if (bedroom) return bedroom[1] ? `غرفة النوم ${bedroom[1]}` : "غرفة النوم"; if (/^living room$/i.test(value.trim())) return "غرفة المعيشة"; return value;}
function facilityLabel(code: string, ar: boolean) {const found = FACILITIES.find(([facilityCode]) => facilityCode === code); return found ? found[ar ? 2 : 1] : code.replaceAll("_", " ");}
function parseAmenities(value: string, ar: boolean): Amenity[] {return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {const [code, name, category] = line.split("|").map((part) => part.trim()); if (!code || !name) throw new Error(ar ? `سطر المرفق ${index + 1} يجب أن يحتوي CODE | الاسم` : `Facility line ${index + 1} must include CODE | display name`); return {code: code.toUpperCase(), name, category: category || null};});}
function customAmenityCount(value: string) {return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;}
function bedsAreValid(beds: BedDraft[]) {const keys = beds.map((bed) => `${bed.area.trim().toLocaleLowerCase()}::${bed.type}`); return beds.length > 0 && beds.every((bed) => bed.area.trim() && bed.quantity > 0) && new Set(keys).size === keys.length;}
function occupancyIsValid(room: RoomDraft, beds: BedDraft[]) {const totalBeds = beds.reduce((sum, bed) => sum + bed.quantity, 0); const base = room.maxAdults <= room.maxGuests && room.maxGuests <= room.maxAdults + room.maxChildren + room.maxInfants && (room.maxChildren === 0 || room.maxChildren < room.maxGuests) && (room.maxInfants === 0 || room.maxInfants < room.maxGuests); if (!base) return false; if (room.unitType === "DORMITORY_ROOM") return room.maxAdults >= 2 && totalBeds >= 2; if (room.unitType === "BED_IN_DORMITORY") return room.maxGuests === 1 && room.maxAdults === 1 && totalBeds === 1; return true;}
function apiIssue(payload: unknown, ar: boolean) {const fallback = ar ? "تعذر حفظ الغرفة" : "Unable to save room"; if (!payload || typeof payload !== "object" || !("error" in payload)) return fallback; const error = (payload as {error?: {message?: string; issues?: Array<{message?: string}>}}).error; return error?.issues?.[0]?.message ?? error?.message ?? fallback;}
