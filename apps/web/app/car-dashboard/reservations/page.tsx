import { redirect } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { getCarCompanyForUser, listCarCompanyReservations } from "@platform/server";
import { CarPartnerShell } from "@/components/car-partner-shell";
import { CarReservationActions } from "@/components/car-reservation-actions";
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
  const activeCount=reservations.filter((reservation)=>["HOLD","CONFIRMED","MODIFIED"].includes(reservation.status)).length;
  const completedCount=reservations.filter((reservation)=>reservation.status==="COMPLETED").length;
  const cancelledCount=reservations.filter((reservation)=>["CANCELLED","NO_SHOW","EXPIRED"].includes(reservation.status)).length;

  return <CarPartnerShell companyName={company.company.name} status={company.company.status} verified={company.company.verified} locale={market.baseLocale}>
    <div className={styles.pageHead}><div><span>Operate · Reservations</span><h1>{ar?"حجوزات السيارات":"Car reservations"}</h1><p>{ar?"الحجوزات الحقيقية القادمة من HandMeKey Cars تظهر هنا مباشرة. حدّث الحالة بعد الاستلام أو التسليم، وسجّل الإلغاء أو عدم الحضور من نفس الشاشة.":"Live HandMeKey Cars reservations appear here automatically. Update the booking after pickup or return, and record cancellations or no-shows from the same screen."}</p></div></div>

    <section className={styles.metrics} aria-label={ar?"ملخص الحجوزات":"Reservation summary"}>
      <div className={styles.metric}><div className={styles.metricTop}><span>{ar?"نشطة":"Active"}</span></div><strong>{activeCount}</strong><small>{ar?"حجوزات قيد التنفيذ":"Open reservations"}</small></div>
      <div className={styles.metric}><div className={styles.metricTop}><span>{ar?"مكتملة":"Completed"}</span></div><strong>{completedCount}</strong><small>{ar?"تم تسليم السيارة":"Returned rentals"}</small></div>
      <div className={styles.metric}><div className={styles.metricTop}><span>{ar?"ملغية / لم يحضر":"Cancelled / no-show"}</span></div><strong>{cancelledCount}</strong><small>{ar?"حالات نهائية":"Final states"}</small></div>
      <div className={styles.metric}><div className={styles.metricTop}><span>{ar?"الإجمالي":"Total"}</span></div><strong>{reservations.length}</strong><small>{ar?"كل الحجوزات":"All reservations"}</small></div>
    </section>

    <section className={styles.panel}>{reservations.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar?"المرجع":"Reference"}</th><th>{ar?"الضيف":"Guest"}</th><th>{ar?"السيارة":"Vehicle"}</th><th>{ar?"الاستلام":"Pickup"}</th><th>{ar?"التسليم":"Return"}</th><th>{ar?"المبلغ":"Amount"}</th><th>{ar?"الحالة":"Status"}</th><th>{ar?"إدارة":"Manage"}</th></tr></thead><tbody>{reservations.map((r)=><tr key={r.id}><td><strong>{r.reference}</strong></td><td>{r.guestName}<div>{r.guestEmail}</div>{r.guestPhone&&<div>{r.guestPhone}</div>}</td><td>{r.vehicle}</td><td>{r.pickupLocation}<div>{new Date(r.pickupAt).toLocaleString(ar?"ar-JO":"en-GB")}</div></td><td>{r.returnLocation}<div>{new Date(r.returnAt).toLocaleString(ar?"ar-JO":"en-GB")}</div></td><td><strong>{r.total.toFixed(2)} {r.currency}</strong><div>{ar?"وديعة":"Deposit"}: {r.deposit.toFixed(2)} {r.currency}</div></td><td><span className={styles.chip}>{statusLabel(r.status,ar)}</span></td><td><CarReservationActions reservationId={r.id} status={r.status} pickupAt={r.pickupAt} returnAt={r.returnAt} locale={market.baseLocale}/></td></tr>)}</tbody></table></div>:<div className={styles.empty}><span className={styles.emptyIcon}><CalendarRange size={25}/></span><h3>{ar?"لا توجد حجوزات سيارات بعد":"No car reservations yet"}</h3><p>{ar?"عند تأكيد أول حجز سيارة من الموقع سيظهر هنا تلقائيًا، بدون بيانات Demo أو إدخال يدوي.":"The first confirmed car booking from the public site will appear here automatically, with no demo data or manual entry."}</p></div>}</section>
  </CarPartnerShell>;
}

function statusLabel(status:string,ar:boolean){
  if(!ar)return status.replaceAll("_"," ");
  if(status==="HOLD")return"معلّق";
  if(status==="CONFIRMED")return"مؤكد";
  if(status==="MODIFIED")return"معدل";
  if(status==="CANCELLED")return"ملغي";
  if(status==="NO_SHOW")return"لم يحضر";
  if(status==="COMPLETED")return"مكتمل";
  if(status==="EXPIRED")return"منتهي";
  return status;
}
