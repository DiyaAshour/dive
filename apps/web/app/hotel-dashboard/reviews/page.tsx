import { redirect } from "next/navigation";
import { listHotelReviewsForManagement, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { currentUser } from "@/lib/server-session";
import ReviewManager from "./review-manager";

export default async function ReviewsPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}){
  const user=await currentUser();if(!user)redirect("/partner/login");
  const hotels=await listUserHotels(user.id);if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];if(!selected)redirect("/hotel-dashboard");
  const reviews=await listHotelReviewsForManagement(user.id,selected.id);
  const initial=reviews.map((review)=>({...review,createdAt:review.createdAt.toISOString(),repliedAt:review.repliedAt?.toISOString()??null}));
  return <main className="partnerAppShell"><PartnerSidebar hotelId={selected.id} hotelName={selected.name} active="reviews"/><section className="partnerMain"><div className="partnerTopbar"><div><span className="partnerPageEyebrow">Guest trust</span><h1>Reviews</h1><p>Verified-stay feedback for {selected.name}.</p></div></div><div className="partnerPageIntro"><strong>Only completed stays can review</strong><span>Property replies are permission-scoped and remain attached to the verified guest review.</span></div><ReviewManager hotelId={selected.id} initialReviews={initial}/></section></main>;
}
