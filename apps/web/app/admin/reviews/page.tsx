import Link from "next/link";
import {redirect} from "next/navigation";
import {MessageSquareWarning, Search, ShieldCheck} from "lucide-react";
import {getAdminNavigationCounts, listPlatformGuestReviews, listPlatformHotels} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {portalDictionary} from "@/lib/portal-i18n";
import ReviewModerationManager from "./review-moderation-manager";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({searchParams}: {searchParams: Promise<{q?: string; status?: string; hotelId?: string}>}) {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Freviews");
  const locale = await requestLocale();
  const copy = portalDictionary(locale);
  const query = await searchParams;
  const filters: {query?: string; status?: string; hotelId?: string} = {};
  if (query.q) filters.query = query.q;
  if (query.status) filters.status = query.status;
  if (query.hotelId) filters.hotelId = query.hotelId;
  const [reviews, hotels, counts] = await Promise.all([listPlatformGuestReviews(principal.user.id, filters), listPlatformHotels(principal.user.id), getAdminNavigationCounts(principal.user.id)]);
  const serialized = reviews.map((review) => ({...review, createdAt: review.createdAt.toISOString(), repliedAt: review.repliedAt?.toISOString() ?? null, moderatedAt: review.moderatedAt?.toISOString() ?? null, booking: {...review.booking, departure: review.booking.departure.toISOString().slice(0, 10)}}));

  return <AdminShell locale={locale} principal={principal} active="reviews" counts={counts}>
    <header className="adminTopbar"><div><span className="eyebrow">{copy.admin.moderation}</span><h1>{copy.admin.moderationTitle}</h1><p>{copy.admin.moderationIntro}</p></div><div className="adminSessionBadge"><MessageSquareWarning size={18}/><span><strong>{reviews.length} {copy.admin.guestReviews}</strong><small>{counts.hiddenReviews} {copy.admin.hidden}</small></span></div></header>
    <div className="adminIntegrityBanner"><ShieldCheck size={19}/><div><strong>{copy.admin.integrity}</strong><p>{copy.admin.integrityBody}</p></div></div>
    <section className="adminPanel adminSection">
      <form className="adminFilterBar adminReviewFilters" method="get">
        <label><Search size={16}/><input name="q" defaultValue={query.q ?? ""} placeholder={copy.admin.reviewSearch}/></label>
        <select name="hotelId" defaultValue={query.hotelId ?? ""} aria-label={copy.admin.property}><option value="">{locale === "ar" ? "كل المنشآت" : "All properties"}</option>{hotels.map((hotel) => <option value={hotel.id} key={hotel.id}>{hotel.name}</option>)}</select>
        <select name="status" defaultValue={query.status ?? ""} aria-label={copy.common.status}><option value="">{copy.admin.anyVisibility}</option><option value="PUBLISHED">{copy.admin.published}</option><option value="HIDDEN">{copy.admin.hidden}</option></select>
        <button className="primaryButton" type="submit">{copy.common.search}</button>
        {(query.q || query.status || query.hotelId) && <Link className="secondaryButton" href="/admin/reviews">{copy.common.cancel}</Link>}
      </form>
      <ReviewModerationManager initialReviews={serialized} locale={locale}/>
    </section>
  </AdminShell>;
}
