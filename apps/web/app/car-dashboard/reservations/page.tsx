import { redirect } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { getCarCompanyForUser, listCarCompanyReservations } from "@platform/server";
import { CarPartnerShell } from "@/components/car-partner-shell";
import styles from "@/components/car-partner-shell.module.css";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic="force-dynamic";

export default async function CarReservationsPage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/car-dashboard/reservations");
  const company=await getCarCompanyForUser(user.id);
  if(!company)redirect("/cars/partner");
  const reservations=await listCarCompanyReservations(user.id);
  const ar=market.baseLocale==="ar";
  return <CarPartnerShell companyName={company.company.name} status={company.company.status} verified={company.company.verified} locale={market.baseLocale}>
    <div className={styles.pageHead}><div><span>Operate · Reservations</span><h1>{ar?"حجوزات السيارات":"Car reservations"}</h1><p>{ar?"كل حجز سيارة يظهر هنا منفصلًا عن حجوزات الفنادق، مع الاستلام والتسليم والسيارة والمبلغ.":"Every car booking is kept separate from hotel stays, with pickup, return, vehicle and amount details."}</p></div></div>
    <section className={styles.panel}>{reservations.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar?"المرجع":"Reference"}</th><th>{ar?"الضيف":"Guest"}</th><th>{ar?"السيارة":"Vehicle"}</th><th>{ar?"الاستلام":"Pickup"}</th><th>{ar?"التسليم":"Return"}</th><th>{ar?"المبلغ":"Amount"}</th><th>{ar?"الحالة":"Status"}</th></tr></thead><tbody>{reservations.map((r)=><tr key={r.id}><td><strong>{r.reference}</strong></td><td>{r.guestName}<div>{r.guestEmail}</div></td><td>{r.vehicle}</td><td>{r.pickupLocation}<div>{new Date(r.pickupAt).toLocaleString(ar?"ar-JO":"en-GB")}</div></td><td>{r.returnLocation}<div>{new Date(r.returnAt).toLocaleString(ar?"ar-JO":"en-GB")}</div></td><td><strong>{r.total.toFixed(2)} {r.currency}</strong></td><td><span className={styles.chip}>{r.status}</span></td></tr>)}</tbody></table></div>:<div className={styles.empty}><span className={styles.emptyIcon}><CalendarRange size={25}/></span><h3>{ar?"لا توجد حجوزات سيارات بعد":"No car reservations yet"}</h3><p>{ar?"هذه الصفحة جاهزة لعرض الحجوزات الحية بمجرد ربط مسار الحجز العام بالـCar Reservation Engine.":"This page is ready for live bookings once the public checkout is connected to the Car Reservation Engine."}</p></div>}</section>
  </CarPartnerShell>;
}
