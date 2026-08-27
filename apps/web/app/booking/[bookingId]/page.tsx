import { CustomerHeader } from "@/components/customer-header";
import { requestLocale } from "@/lib/request-locale";
import { BookingStatus } from "./booking-status";
import { GuestTools } from "./guest-tools";

export default async function BookingPage({params}:{params:Promise<{bookingId:string}>}) {
  const [{bookingId},locale]=await Promise.all([params,requestLocale()]);
  const ar=locale==="ar";
  return <main className="soft bookingCenterPage">
    <CustomerHeader/>
    <section className="shell bookingCenterSection">
      <header className="bookingCenterPageHead">
        <span className="eyebrow">{ar?"مركز الحجز":"Reservation center"}</span>
        <h1>{ar?"حجزك":"Your booking"}</h1>
        <p>{ar?"كل ما يخص إقامتك، الدفع، الوصول والتواصل مع الفندق في مكان واحد.":"Your stay, payment, arrival and property communication in one place."}</p>
      </header>
      <BookingStatus bookingId={bookingId} locale={locale}/>
      <GuestTools bookingId={bookingId} locale={locale}/>
    </section>
  </main>;
}
