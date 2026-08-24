import Link from "next/link";
import {redirect} from "next/navigation";
import {Building2, Search} from "lucide-react";
import {getAdminNavigationCounts, listPlatformHotels} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {portalDictionary} from "@/lib/portal-i18n";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage({searchParams}: {searchParams: Promise<{q?: string; status?: string}>}) {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fproperties");
  const locale = await requestLocale();
  const copy = portalDictionary(locale);
  const query = await searchParams;
  const filters: {query?: string; status?: string} = {};
  if (query.q) filters.query = query.q;
  if (query.status) filters.status = query.status;
  const [hotels, counts] = await Promise.all([listPlatformHotels(principal.user.id, filters), getAdminNavigationCounts(principal.user.id)]);

  return <AdminShell locale={locale} principal={principal} active="properties" counts={counts}>
    <header className="adminTopbar"><div><span className="eyebrow">{copy.admin.propertyManager}</span><h1>{copy.admin.propertyManagerTitle}</h1><p>{copy.admin.propertyManagerIntro}</p></div><div className="adminSessionBadge"><Building2 size={18}/><span><strong>{hotels.length} {copy.admin.properties}</strong><small>{query.status || copy.admin.anyStatus}</small></span></div></header>
    <section className="adminPanel adminSection">
      <form className="adminFilterBar" method="get">
        <label><Search size={16}/><input name="q" defaultValue={query.q ?? ""} placeholder={copy.admin.searchPlaceholder}/></label>
        <select name="status" defaultValue={query.status ?? ""} aria-label={copy.common.status}>
          <option value="">{copy.admin.anyStatus}</option><option value="ACTIVE">ACTIVE</option><option value="DRAFT">DRAFT</option><option value="PENDING_REVIEW">PENDING REVIEW</option><option value="SUSPENDED">SUSPENDED</option>
        </select>
        <button className="primaryButton" type="submit">{copy.common.search}</button>
        {(query.q || query.status) && <Link className="secondaryButton" href="/admin/properties">{copy.common.cancel}</Link>}
      </form>
      {hotels.length === 0 ? <div className="adminEmptyState"><Building2 size={26}/><strong>{copy.common.noResults}</strong></div> : <div className="adminPropertyDirectory">
        {hotels.map((hotel) => <article key={hotel.id}>
          <div className="adminPropertyIdentity"><span className={`propertyStatus ${hotel.status.toLowerCase()}`}>{statusLabel(hotel.status, locale)}</span><h2>{hotel.name}</h2><p>{hotel.slug}</p><small>{hotel.city}, {hotel.countryCode}</small></div>
          <div className="adminPropertyStats"><span><strong>{hotel._count.roomTypes}</strong>{copy.admin.rooms}</span><span><strong>{hotel._count.bookings}</strong>{copy.admin.bookings}</span><span><strong>{hotel._count.guestReviews}</strong>{copy.admin.guestReviews}</span><span><strong>{hotel._count.memberships}</strong>{copy.admin.team}</span></div>
          <div className="adminPropertyMeta"><span>{hotel.verified ? copy.admin.verified : copy.admin.notVerified}</span><small>{copy.admin.revision} {hotel.publishRevision}{hotel.publishedRevision ? ` / ${hotel.publishedRevision}` : ""}</small></div>
          <Link className="primaryButton" href={`/admin/properties/${hotel.id}`}>{copy.admin.openEditor}</Link>
        </article>)}
      </div>}
    </section>
  </AdminShell>;
}

function statusLabel(status: string, locale: "en" | "ar") {
  if (locale === "en") return status.replaceAll("_", " ");
  return ({ACTIVE: "نشطة", DRAFT: "مسودة", PENDING_REVIEW: "قيد المراجعة", SUSPENDED: "موقوفة"} as Record<string, string>)[status] ?? status;
}
