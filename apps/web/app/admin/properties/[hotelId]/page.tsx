import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft, BadgeCheck, Building2, CalendarCheck2, Images, MessageSquareText, Users} from "lucide-react";
import {getAdminNavigationCounts, getPlatformHotel} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {portalDictionary} from "@/lib/portal-i18n";
import PropertyActions from "../../property-actions";
import HotelEditor from "./hotel-editor";

export const dynamic = "force-dynamic";

export default async function AdminPropertyPage({params}: {params: Promise<{hotelId: string}>}) {
  const {hotelId} = await params;
  const principal = await currentAdminPrincipal();
  if (!principal) redirect(`/admin/login?next=${encodeURIComponent(`/admin/properties/${hotelId}`)}`);
  const locale = await requestLocale();
  const copy = portalDictionary(locale);
  const [hotel, counts] = await Promise.all([getPlatformHotel(principal.user.id, hotelId), getAdminNavigationCounts(principal.user.id)]);
  const serialized = {...hotel, createdAt: hotel.createdAt.toISOString(), updatedAt: hotel.updatedAt.toISOString(), lastPublishedAt: hotel.lastPublishedAt?.toISOString() ?? null};

  return <AdminShell locale={locale} principal={principal} active="properties" counts={counts}>
    <div className="adminBreadcrumb"><Link href="/admin/properties"><ArrowLeft size={15}/>{copy.admin.properties}</Link><span>/</span><strong>{hotel.name}</strong></div>
    <header className="adminTopbar adminPropertyTopbar">
      <div><span className="eyebrow">{copy.admin.editProperty}</span><h1>{hotel.name}</h1><p>{copy.admin.editPropertyIntro}</p></div>
      <div className="adminPropertyGovernance"><span className={`propertyStatus ${hotel.status.toLowerCase()}`}>{hotel.status.replaceAll("_", " ")}</span><span>{hotel.verified ? <><BadgeCheck size={15}/>{copy.admin.verified}</> : copy.admin.notVerified}</span></div>
    </header>
    <div className="adminKpiGrid adminPropertyKpis">
      <article><span><Building2 size={16}/>{copy.admin.rooms}</span><strong>{hotel._count.roomTypes}</strong><small>{copy.admin.revision} {hotel.publishRevision}</small></article>
      <article><span><CalendarCheck2 size={16}/>{copy.admin.bookings}</span><strong>{hotel._count.bookings}</strong><small>{hotel.currency}</small></article>
      <article><span><MessageSquareText size={16}/>{copy.admin.guestReviews}</span><strong>{hotel._count.guestReviews}</strong><small><Link href={`/admin/reviews?hotelId=${hotel.id}`}>{copy.common.open}</Link></small></article>
      <article><span><Users size={16}/>{copy.admin.team}</span><strong>{hotel._count.memberships}</strong><small>{copy.admin.hotelUsers}</small></article>
      <article><span><Images size={16}/>{locale === "ar" ? "الصور" : "Photos"}</span><strong>{hotel._count.photos}</strong><small>{hotel.slug}</small></article>
    </div>
    <div className="adminIntegrityBanner"><BadgeCheck size={18}/><div><strong>{locale === "ar" ? "تعديل إداري موثّق" : "Audited administrator editing"}</strong><p>{copy.admin.integrityNote}</p></div></div>
    <HotelEditor hotel={serialized} locale={locale}/>
    <section className="adminPanel adminDangerZone"><div><span className="eyebrow">{locale === "ar" ? "إجراء منفصل" : "Separate control"}</span><h2>{locale === "ar" ? "إيقاف أو استعادة المنشأة" : "Suspend or restore property"}</h2><p>{locale === "ar" ? "لا يتم تغيير حالة النشر ضمن نموذج التعديل العام. الإيقاف يحتاج سببًا ويسجل كإجراء مستقل." : "Publishing status is not changed inside the general editor. Suspension requires a reason and is audited separately."}</p></div><PropertyActions hotelId={hotel.id} status={hotel.status} locale={locale} nextPath={`/admin/properties/${hotel.id}`}/></section>
  </AdminShell>;
}
