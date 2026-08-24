import { redirect } from "next/navigation";
import { listHotelReviewsForManagement, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { PartnerLanguageBar } from "@/components/partner-language-bar";
import { currentUser } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { direction } from "@/lib/i18n";
import { portalDictionary } from "@/lib/portal-i18n";
import ReviewManager from "./review-manager";

export default async function ReviewsPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}){
  const user=await currentUser();if(!user)redirect("/partner/login");
  const locale=await requestLocale();const copy=portalDictionary(locale).partner;
  const hotels=await listUserHotels(user.id);if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];if(!selected)redirect("/hotel-dashboard");
  const reviews=await listHotelReviewsForManagement(user.id,selected.id);
  const initial=reviews.map((review)=>({...review,createdAt:review.createdAt.toISOString(),repliedAt:review.repliedAt?.toISOString()??null}));
  return <main className="partnerAppShell" dir={direction(locale)}><PartnerSidebar hotelId={selected.id} hotelName={selected.name} active="reviews" locale={locale}/><section className="partnerMain"><PartnerLanguageBar locale={locale}/><div className="partnerTopbar"><div><span className="partnerPageEyebrow">{copy.guestTrust}</span><h1>{copy.reviewsTitle}</h1><p>{copy.reviewsBody} {selected.name}.</p></div></div><div className="partnerPageIntro"><strong>{copy.verifiedOnly}</strong><span>{copy.repliesScoped}</span></div><ReviewManager hotelId={selected.id} initialReviews={initial} locale={locale}/></section></main>;
}
