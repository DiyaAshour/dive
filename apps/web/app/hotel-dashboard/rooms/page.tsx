import Link from "next/link";
import {redirect} from "next/navigation";
import {Baby, BedDouble, Image as ImageIcon, Plus, Ruler, UserRound} from "lucide-react";
import {listRoomTypesForManagement, listUserHotels} from "@platform/server";
import {PartnerSidebar} from "@/components/partner-sidebar";
import {PartnerLanguageBar} from "@/components/partner-language-bar";
import {currentUser} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {direction} from "@/lib/i18n";
import RoomProductEditor from "./room-product-editor";

export const dynamic = "force-dynamic";

export default async function RoomsPage({searchParams}: {searchParams: Promise<{hotelId?: string; create?: string}>}) {
  const user = await currentUser();
  if (!user) redirect("/partner/login");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const hotels = await listUserHotels(user.id);
  if (!hotels.length) redirect("/partner/onboarding");
  const query = await searchParams;
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/partner/onboarding");
  const catalog = await listRoomTypesForManagement(user.id, selected.id);
  const activeRooms = catalog.roomTypes.filter((room) => room.active).length;
  const units = catalog.roomTypes.reduce((sum, room) => sum + room.quantity, 0);
  const ratePlans = catalog.roomTypes.reduce((sum, room) => sum + room.ratePlans.length, 0);

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={selected.id} hotelName={selected.name} city={selected.city} status={selected.status} active="rooms" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">{ar ? "كتالوج الإقامة" : "Accommodation catalog"}</span><h1>{ar ? "الغرف والوحدات" : "Rooms & units"}</h1><p>{ar ? "مصدر واحد للسعة والأسرّة والمرافق والصور التي يراها الضيف." : "One source of truth for occupancy, beds, facilities and the room card guests see."}</p></div>{query.create !== "1" && <Link className="primaryButton" href={`/hotel-dashboard/rooms?hotelId=${selected.id}&create=1`}><Plus size={17}/>{ar ? "إنشاء غرفة" : "Create room"}</Link>}</div>
      <div className="partnerPageIntro"><strong>{ar ? "أقوى من نموذج إضافة اسم فقط" : "More than an add-only room form"}</strong><span>{ar ? "كل تعديل محفوظ هنا يرفع نسخة نشر المنشأة ويُسجل قبل وبعد، ثم يظهر في محرك الحجز وصفحة الفندق." : "Every save creates an attributable publishing revision and feeds the booking engine and hotel page."}</span></div>
      <div className="partnerKpiGrid roomCatalogKpis"><Metric label={ar ? "أنواع الغرف" : "Room types"} value={catalog.roomTypes.length}/><Metric label={ar ? "نشطة للبيع" : "Active for sale"} value={activeRooms}/><Metric label={ar ? "إجمالي الوحدات" : "Total units"} value={units}/><Metric label={ar ? "خطط الأسعار" : "Rate plans"} value={ratePlans}/></div>
      {query.create === "1" ? <><div className="roomStudioTitle"><div><span className="eyebrow">{ar ? "منتج جديد" : "New product"}</span><h2>{ar ? "أنشئ الغرفة كما ستظهر للضيف" : "Build the room as guests will see it"}</h2></div><Link className="secondaryButton" href={`/hotel-dashboard/rooms?hotelId=${selected.id}`}>{ar ? "إلغاء" : "Cancel"}</Link></div><RoomProductEditor hotelId={selected.id} locale={locale}/></> : <section className="roomCatalogGrid">{catalog.roomTypes.length === 0 ? <div className="panel roomCatalogEmpty"><BedDouble size={32}/><h2>{ar ? "لم تُنشأ غرف بعد" : "No rooms created yet"}</h2><p>{ar ? "أنشئ أول غرفة مع السعة والأسرّة بدل البدء بسطر ناقص." : "Create the first complete room product with occupancy and beds."}</p><Link className="primaryButton" href={`/hotel-dashboard/rooms?hotelId=${selected.id}&create=1`}>{ar ? "إنشاء أول غرفة" : "Create first room"}</Link></div> : catalog.roomTypes.map((room) => <article className="roomCatalogCard" key={room.id}>
        <div className="roomCatalogMedia">{room.photos[0] ? <img src={room.photos[0].url} alt={room.photos[0].alt ?? room.name}/> : <><ImageIcon size={27}/><span>{ar ? "صورة الغرفة قيد الإضافة" : "Room photo pending"}</span></>}</div>
        <div className="roomCatalogBody"><div className="roomCatalogTop"><div><span className={`propertyStatus ${room.active ? "active" : "suspended"}`}>{room.active ? (ar ? "نشطة" : "ACTIVE") : (ar ? "غير نشطة" : "INACTIVE")}</span><h2>{room.name}</h2><p>{room.code} · {unitTypeLabel(room.unitType, ar)}</p></div><strong>{room._count.bookings}<small>{ar ? "حجز" : "bookings"}</small></strong></div>
        <div className="roomCatalogFacts"><span><UserRound size={16}/>{ar ? "تتسع" : "Fits"} {room.maxGuests}</span>{room.sizeValue && <span><Ruler size={16}/>{room.sizeValue} {room.sizeUnit === "SQM" ? "m²" : "ft²"}</span>}<span><BedDouble size={16}/>{bedSummary(room.beds, ar)}</span>{room.cribCount > 0 && <span><Baby size={16}/>{room.cribCount} {ar ? "مهد" : "crib"}</span>}</div>
        <div className="roomCatalogFacilities">{room.amenities.slice(0, 6).map((amenity) => <span key={amenity.id}>{amenity.name}</span>)}{room.amenities.length > 6 && <span>+{room.amenities.length - 6}</span>}</div>
        <div className="roomCatalogFoot"><div><strong>{room.ratePlans.length}</strong> {ar ? "خطط أسعار" : "rate plans"} · <strong>{room.photos.length}</strong> {ar ? "صور" : "photos"} · <strong>{room.quantity}</strong> {ar ? "وحدات" : "units"}</div><Link className="primaryButton" href={`/hotel-dashboard/rooms/${room.id}?hotelId=${selected.id}`}>{ar ? "تعديل الغرفة" : "Edit room"}</Link></div></div>
      </article>)}</section>}
    </section>
  </main>;
}

function Metric({label, value}: {label: string; value: number}) {return <div><span>{label}</span><strong>{value}</strong></div>;}
function unitTypeLabel(value: string, ar: boolean) {const en = value.toLowerCase().replaceAll("_", " "); const map: Record<string, string> = {ROOM: "غرفة", STUDIO: "استوديو", SUITE: "جناح", APARTMENT: "شقة", VILLA: "فيلا", CHALET: "شاليه", BUNGALOW: "بنغلو", HOLIDAY_HOME: "بيت عطلات", DORMITORY_ROOM: "غرفة مشتركة", BED_IN_DORMITORY: "سرير في غرفة مشتركة"}; return ar ? map[value] ?? value : en.replace(/\b\w/g, (letter) => letter.toUpperCase());}
function bedSummary(beds: Array<{type: string; quantity: number}>, ar: boolean) {const total = beds.reduce((sum, bed) => sum + bed.quantity, 0); return `${total} ${ar ? (total === 1 ? "سرير" : "أسرّة") : (total === 1 ? "bed" : "beds")}`;}
