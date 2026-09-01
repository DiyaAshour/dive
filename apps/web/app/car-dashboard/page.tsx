import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarRange, CarFront, MapPin, Plus, ShieldCheck, Wrench } from "lucide-react";
import { getCarDashboard } from "@platform/server";
import { CarPartnerShell } from "@/components/car-partner-shell";
import styles from "@/components/car-partner-shell.module.css";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic="force-dynamic";
export const metadata={title:"Cars Partner Dashboard · HandMeKey"};

export default async function CarDashboardPage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/car-dashboard");
  const dashboard=await getCarDashboard(user.id).catch(()=>null);
  if(!dashboard)redirect("/cars/partner");
  const ar=market.baseLocale==="ar";
  const m=dashboard.metrics;

  return <CarPartnerShell companyName={dashboard.company.name} status={dashboard.company.status} verified={dashboard.company.verified} locale={market.baseLocale}>
    <div className={styles.pageHead}><div><span>HandMeKey Cars Partner</span><h1>{ar?"مركز تشغيل السيارات":"Cars operations center"}</h1><p>{ar?"تابع الأسطول والحجوزات والفروع من لوحة مستقلة بالكامل عن الفنادق.":"Track fleet, reservations and locations from a control panel fully separate from hotels."}</p></div><Link className={styles.primary} href="/car-dashboard/fleet"><Plus size={17}/>{ar?"أضف سيارة":"Add vehicle"}</Link></div>

    <section className={styles.metrics}>
      <Metric icon={<CarFront size={17}/>} label={ar?"إجمالي السيارات":"Total vehicles"} value={m.vehicleCount} sub={ar?"كل الأسطول":"Entire fleet"}/>
      <Metric icon={<ShieldCheck size={17}/>} label={ar?"متاحة للبيع":"Active vehicles"} value={m.activeVehicles} sub={ar?"حالة Active":"Active status"}/>
      <Metric icon={<Wrench size={17}/>} label={ar?"صيانة":"Maintenance"} value={m.maintenanceVehicles} sub={ar?"غير معروضة للحجز":"Not bookable"}/>
      <Metric icon={<CalendarRange size={17}/>} label={ar?"حجوزات قادمة":"Upcoming bookings"} value={m.upcomingReservations} sub={ar?"مؤكدة أو قيد التأكيد":"Confirmed or held"}/>
      <Metric icon={<MapPin size={17}/>} label={ar?"مواقع الاستلام":"Pickup locations"} value={m.locationCount} sub={ar?"فروع فعالة":"Active locations"}/>
    </section>

    <div className={styles.grid}>
      <section className={styles.panel}><div className={styles.panelHead}><h2>{ar?"أحدث الحجوزات":"Recent reservations"}</h2><Link href="/car-dashboard/reservations">{ar?"عرض الكل":"View all"}</Link></div>{dashboard.recentReservations.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar?"الحجز":"Booking"}</th><th>{ar?"الضيف":"Guest"}</th><th>{ar?"السيارة":"Vehicle"}</th><th>{ar?"الاستلام":"Pickup"}</th><th>{ar?"الإجمالي":"Total"}</th></tr></thead><tbody>{dashboard.recentReservations.map((r)=><tr key={r.id}><td><strong>{r.reference}</strong></td><td>{r.guestName}</td><td>{r.vehicle}</td><td>{new Date(r.pickupAt).toLocaleString(ar?"ar-JO":"en-GB")}</td><td>{r.total.toFixed(2)} {r.currency}</td></tr>)}</tbody></table></div>:<div className={styles.empty}><span className={styles.emptyIcon}><CalendarRange size={24}/></span><h3>{ar?"لا توجد حجوزات سيارات بعد":"No car reservations yet"}</h3><p>{ar?"عندما يبدأ العملاء بالحجز ستظهر الحجوزات الحية هنا مع السيارة والضيف ومكان الاستلام والتسليم.":"Live reservations will appear here with the vehicle, guest, pickup and return details."}</p></div>}</section>
      <aside className={styles.panel}><div className={styles.panelHead}><h2>{ar?"جاهزية الشركة":"Company readiness"}</h2></div><div className={styles.panelBody}><div className={styles.checklist}>
        <CheckItem done={m.locationCount>0} title={ar?"أضف مواقع الاستلام":"Add pickup locations"} body={ar?"مطار أو فرع داخل المدينة.":"Airport or city branch."}/>
        <CheckItem done={m.vehicleCount>0} title={ar?"أضف السيارات":"Add vehicles"} body={ar?"الفئة والسعر والوديعة والشروط.":"Category, price, deposit and conditions."}/>
        <CheckItem done={dashboard.company.verified} title={ar?"توثيق الشركة":"Verify the company"} body={ar?"لا تظهر السيارات للعامة قبل التوثيق والتفعيل.":"Vehicles stay private until verification and activation."}/>
      </div></div></aside>
    </div>
  </CarPartnerShell>;
}

function Metric({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:number;sub:string}){return <article className={styles.metric}><div className={styles.metricTop}><span>{label}</span>{icon}</div><strong>{value}</strong><small>{sub}</small></article>}
function CheckItem({done,title,body}:{done:boolean;title:string;body:string}){return <div className={styles.checkItem}><span className={styles.checkIcon}>{done?<ShieldCheck size={17}/>:<Plus size={17}/>}</span><div><strong>{title}</strong><p>{body}</p></div></div>}
