import Link from "next/link";
import { redirect } from "next/navigation";
import { listHotelReviewsForManagement, listUserHotels } from "@platform/server";
import { currentUser } from "@/lib/server-session";
import ReviewManager from "./review-manager";

export default async function ReviewsPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}){
  const user=await currentUser();if(!user)redirect("/login");const hotels=await listUserHotels(user.id);if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];if(!selected)redirect("/hotel-dashboard");
  const reviews=await listHotelReviewsForManagement(user.id,selected.id);
  const initial=reviews.map((review)=>({...review,createdAt:review.createdAt.toISOString(),repliedAt:review.repliedAt?.toISOString()??null}));
  return <main className="soft"><header className="shell topbar"><Link href="/" className="brand">B</Link><nav><Link href={`/hotel-dashboard?hotelId=${selected.id}`}>Property</Link><Link href={`/hotel-dashboard/promotions?hotelId=${selected.id}`}>Promotions</Link><Link href={`/hotel-dashboard/messages?hotelId=${selected.id}`}>Messages</Link></nav></header><section className="shell section"><div className="sectionHead"><div><span className="eyebrow">Guest trust</span><h1>Reviews · {selected.name}</h1><p className="muted">Only reviews connected to completed bookings appear here.</p></div></div><ReviewManager hotelId={selected.id} initialReviews={initial}/></section></main>;
}
