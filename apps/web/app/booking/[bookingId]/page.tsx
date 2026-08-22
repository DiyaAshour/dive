import Link from "next/link";
import { BookingStatus } from "./booking-status";
import { GuestTools } from "./guest-tools";

export default async function BookingPage({params}:{params:Promise<{bookingId:string}>}) {
  const {bookingId}=await params;
  return <main className="soft">
    <header className="shell topbar"><Link href="/" className="brand">B</Link><nav><Link href="/trips">My trips</Link><Link href="/search">Search</Link></nav></header>
    <section className="shell section"><div className="sectionHead"><div><span className="eyebrow">Reservation center</span><h2>Your booking</h2></div></div><BookingStatus bookingId={bookingId}/><GuestTools bookingId={bookingId}/></section>
  </main>;
}
