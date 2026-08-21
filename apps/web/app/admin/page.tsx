import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CircleCheck, ShieldAlert, Users } from "lucide-react";
import { listPendingHotelDocuments, listPropertyReviewQueue, listUserHotels } from "@platform/server";
import { currentUser } from "@/lib/server-session";
import ReviewQueue from "./review-queue";
import PropertyActions from "./property-actions";
import DocumentReviewQueue from "./document-review-queue";

export default async function AdminPage(){
  const user=await currentUser();
  if(!user)redirect("/login");
  if(user.platformRole!=="PLATFORM_ADMIN")return <main className="softBg"><div className="shell section"><div className="panel"><ShieldAlert size={30}/><h1>Admin access required</h1><p className="muted">Your account is authenticated, but it does not have the PLATFORM_ADMIN role.</p><Link className="primaryButton" href="/">Return home</Link></div></div></main>;
  const [hotels,reviews,documents]=await Promise.all([listUserHotels(user.id),listPropertyReviewQueue(user.id),listPendingHotelDocuments(user.id)]);
  const active=hotels.filter((hotel)=>hotel.status==="ACTIVE").length;
  const review=hotels.filter((hotel)=>hotel.status==="PENDING_REVIEW").length;
  const suspended=hotels.filter((hotel)=>hotel.status==="SUSPENDED").length;
  const reviewProps=reviews.map((item)=>({...item,submittedAt:item.submittedAt.toISOString()}));
  const documentProps=documents.map((item)=>({...item,submittedAt:item.submittedAt.toISOString(),mediaObject:{...item.mediaObject,uploadedAt:item.mediaObject.uploadedAt?.toISOString()??null}}));
  return <main className="dashboardBg adminTheme"><aside className="sidebar adminSide"><Link href="/" className="brandMark light">B</Link><div className="sideGroup"><span>CONTROL CENTER</span><a className="active"><Building2 size={18}/>Properties</a><a><Users size={18}/>Users & roles</a><a><ShieldAlert size={18}/>Audit & risk</a></div></aside><section className="dashboardMain"><div className="dashTop"><div><span className="eyebrow">Platform administration</span><h1>Control center</h1><p className="muted">Authenticated as {user.email}</p></div></div><div className="kpiGrid adminKpis"><div className="kpi"><span>Total properties</span><strong>{hotels.length}</strong></div><div className="kpi"><span>Active</span><strong>{active}</strong></div><div className="kpi"><span>Pending review</span><strong>{review}</strong></div><div className="kpi"><span>Documents pending</span><strong>{documents.length}</strong></div><div className="kpi"><span>Suspended</span><strong>{suspended}</strong></div></div><DocumentReviewQueue documents={documentProps}/><ReviewQueue reviews={reviewProps}/><div className="panel"><div className="sectionHeading"><div><span className="eyebrow">Property network</span><h2>Publishing status</h2></div></div><div className="adminTable"><div className="adminRow adminHead"><span>Hotel</span><span>City</span><span>Status</span><span>Verified</span><span>Revision</span><span>Admin action</span></div>{hotels.map((hotel)=><div className="adminRow" key={hotel.id}><div><strong>{hotel.name}</strong><div><Link href={`/hotel-dashboard?hotelId=${hotel.id}`}>Open workspace</Link></div></div><span>{hotel.city}</span><span className={hotel.status==="ACTIVE"?"statusOk":"statusReview"}>{hotel.status==="ACTIVE"&&<CircleCheck size={14}/>} {hotel.status}</span><span>{hotel.verified?"Yes":"No"}</span><span>{hotel.publishRevision}{hotel.publishedRevision?` / published ${hotel.publishedRevision}`:" / unpublished"}</span><PropertyActions hotelId={hotel.id} status={hotel.status}/></div>)}</div></div></section></main>;
}
