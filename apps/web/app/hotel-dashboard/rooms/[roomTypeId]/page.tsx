import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft, Image as ImageIcon} from "lucide-react";
import {getRoomTypeForManagement, listUserHotels} from "@platform/server";
import {PartnerSidebar} from "@/components/partner-sidebar";
import {PartnerLanguageBar} from "@/components/partner-language-bar";
import {currentUser} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {direction} from "@/lib/i18n";
import RoomProductEditor from "../room-product-editor";

export const dynamic = "force-dynamic";

export default async function EditRoomPage({params, searchParams}: {params: Promise<{roomTypeId: string}>; searchParams: Promise<{hotelId?: string}>}) {
  const user = await currentUser();
  if (!user) redirect("/partner/login");
  const [{roomTypeId}, query, locale] = await Promise.all([params, searchParams, requestLocale()]);
  const ar = locale === "ar";
  const hotels = await listUserHotels(user.id);
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/partner/onboarding");
  const room = await getRoomTypeForManagement(user.id, selected.id, roomTypeId);
  const initialRoom = {...room, description: room.description ?? ""};

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={selected.id} hotelName={selected.name} city={selected.city} status={selected.status} active="rooms" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <Link className="roomBackLink" href={`/hotel-dashboard/rooms?hotelId=${selected.id}`}><ArrowLeft size={16}/>{ar ? "العودة إلى الغرف" : "Back to rooms"}</Link>
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">{ar ? "تعديل منتج الغرفة" : "Edit room product"}</span><h1>{room.name}</h1><p>{ar ? "تعديل واحد يغذي بطاقة الضيف، البحث، الحجز وجاهزية النشر." : "One edit feeds the guest card, discovery, booking and publishing readiness."}</p></div><Link className="secondaryButton" href={`/hotel-dashboard?hotelId=${selected.id}`}><ImageIcon size={16}/>{ar ? "إدارة الصور" : "Manage photos"}</Link></div>
      <RoomProductEditor hotelId={selected.id} locale={locale} initialRoom={initialRoom}/>
    </section>
  </main>;
}
