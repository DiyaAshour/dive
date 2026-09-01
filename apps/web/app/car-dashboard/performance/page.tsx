import { redirect } from "next/navigation";
import { BarChart3, CalendarRange, CarFront, MapPin, Wrench } from "lucide-react";
import { getCarDashboard } from "@platform/server";
import { CarPartnerShell } from "@/components/car-partner-shell";
import styles from "@/components/car-partner-shell.module.css";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic="force-dynamic";

export default async function CarPerformancePage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/car-dashboard/performance");
  const dashboard=await getCarDashboard(user.id).catch(()=>null);
  if(!dashboard)redirect("/cars/partner");
  const ar=market.baseLocale==="ar";
  const m=dashboard.metrics;
  return <CarPartnerShell companyName={dashboard.company.name} status={dashboard.company.status} verified={dashboard.company.verified} locale={market.baseLocale}>
    <div className={styles.pageHead}><div><span>Grow · Performance</span><h1>{ar?"أداء شركة التأجير":"Rental company performance"}</h1><p>{ar?"أرقام السيارات مستقلة بالكامل عن أداء الفنادق: الأسطول، التوفر، الصيانة والحجوزات.":"Cars metrics stay fully separate from hotel performance: fleet, availability, maintenance and reservations."}</p></div></div>
    <section className={styles.metrics}>
      <Metric icon={<CarFront size={17}/>} label={ar?"الأسطول":"Fleet"} value={m.vehicleCount}/>
      <Metric icon={<CarFront size={17}/>} label={ar?"نشطة":"Active"} value={m.activeVehicles}/>
      <Metric icon={<Wrench size={17}/>} label={ar?"صيانة":"Maintenance"} value={m.maintenanceVehicles}/>
      <Metric icon={<CalendarRange size={17}/>} label={ar?"حجوزات قادمة":"Upcoming"} value={m.upcomingReservations}/>
      <Metric icon={<MapPin size={17}/>} label={ar?"الفروع":"Locations"} value={m.locationCount}/>
    </section>
    <section className={styles.panel}><div className={styles.empty}><span className={styles.emptyIcon}><BarChart3 size={25}/></span><h3>{ar?"التحليلات التجارية ستبنى فوق البيانات الحية":"Commercial analytics will build on live data"}</h3><p>{ar?"بعد تشغيل الحجوزات الحية سنضيف معدل التحويل، الإيراد لكل سيارة متاحة، متوسط مدة الإيجار وإشغال الأسطول بدون خلطها مع KPI الفنادق.":"Once live bookings are flowing, this becomes conversion, revenue per available car, average rental length and fleet utilization without mixing hotel KPIs."}</p></div></section>
  </CarPartnerShell>;
}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:number}){return <article className={styles.metric}><div className={styles.metricTop}><span>{label}</span>{icon}</div><strong>{value}</strong></article>}
