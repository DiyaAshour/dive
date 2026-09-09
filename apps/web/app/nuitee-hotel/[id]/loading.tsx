import {BadgeCheck} from "lucide-react";
import {CustomerHeader} from "@/components/customer-header";

export default function NuiteeHotelLoading() {
  return <main className="hotelExperience">
    <CustomerHeader/>
    <section className="shell hotelDetailSection" aria-busy="true" aria-live="polite">
      <div className="premiumHotelHead">
        <div>
          <div className="hotelBadges"><span><BadgeCheck size={14}/>Verified Property</span></div>
          <h1>Loading hotel…</h1>
          <p>جاري تحميل الفندق والأسعار المباشرة…</p>
        </div>
      </div>
      <div className="premiumGallery" style={{minHeight:"260px",opacity:.45}} aria-hidden="true">
        {Array.from({length:5},(_,index)=><div key={index} className={`galleryPhoto${index+1}`} style={{background:"rgba(15,35,58,.08)",borderRadius:"14px"}}/>) }
      </div>
      <div className="availabilityCard" style={{minHeight:"120px",opacity:.55}} aria-hidden="true">
        <div><span className="eyebrow">Live availability</span><h2>Checking rooms and rates…</h2></div>
      </div>
      <div className="roomOfferList" aria-hidden="true">
        {Array.from({length:2},(_,index)=><article className="roomOfferCard" key={index} style={{minHeight:"220px",opacity:.45}}>
          <section className="publicRoomProduct">
            <div className="publicRoomMedia" style={{background:"rgba(15,35,58,.08)"}}/>
            <div className="publicRoomContent"><span className="eyebrow">Room</span><h3>Loading available room…</h3></div>
          </section>
        </article>)}
      </div>
    </section>
  </main>;
}
