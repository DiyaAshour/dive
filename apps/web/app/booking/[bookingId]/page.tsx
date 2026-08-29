import { CustomerHeader } from "@/components/customer-header";
import { requestLocale } from "@/lib/request-locale";
import { BookingStatus } from "./booking-status";
import { GuestTools } from "./guest-tools";

export default async function BookingPage({params}:{params:Promise<{bookingId:string}>}) {
  const [{bookingId},locale]=await Promise.all([params,requestLocale()]);
  const ar=locale==="ar";
  const demo=bookingId.startsWith("demo-booking-");
  return <main className="soft bookingCenterPage">
    <CustomerHeader/>
    <section className="shell bookingCenterSection">
      <header className="bookingCenterPageHead">
        <span className="eyebrow">{ar?"مركز الحجز":"Reservation center"}</span>
        <h1>{ar?"حجزك":"Your booking"}</h1>
        <p>{ar?"كل ما يخص إقامتك، الدفع، الوصول والتواصل مع الفندق في مكان واحد.":"Your stay, payment, arrival and property communication in one place."}</p>
      </header>
      {demo&&<div className="panel"><strong>{ar?"حجز تجريبي":"Demo reservation"}</strong><p className="muted">{ar?"هذا الحجز مخصص لاختبار تجربة HandMeKey ولا ينشئ حجزًا حقيقيًا لدى الفندق.":"This reservation is for testing the HandMeKey experience and does not create a real hotel reservation."}</p></div>}
      <BookingStatus bookingId={bookingId} locale={locale}/>
      {!demo&&<GuestTools bookingId={bookingId} locale={locale}/>} 
    </section>
  </main>;
}
