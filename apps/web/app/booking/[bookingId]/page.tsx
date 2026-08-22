import { CustomerHeader } from "@/components/customer-header";
import { requestLocale } from "@/lib/request-locale";
import { BookingStatus } from "./booking-status";
import { GuestTools } from "./guest-tools";

export default async function BookingPage({params}:{params:Promise<{bookingId:string}>}) {
  const [{bookingId},locale]=await Promise.all([params,requestLocale()]);
  const ar=locale==="ar";
  return <main className="soft">
    <CustomerHeader/>
    <section className="shell section"><div className="sectionHead"><div><span className="eyebrow">{ar?"مركز الحجز":"Reservation center"}</span><h2>{ar?"حجزك":"Your booking"}</h2></div></div><BookingStatus bookingId={bookingId} locale={locale}/><GuestTools bookingId={bookingId} locale={locale}/></section>
  </main>;
}
