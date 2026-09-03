import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarRange, CarFront, MapPin, Plus, ShieldCheck, Wrench } from "lucide-react";
import { getCarCompanyPublishingReadiness, getCarDashboard } from "@platform/server";
import { CarPartnerShell } from "@/components/car-partner-shell";
import styles from "@/components/car-partner-shell.module.css";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic="force-dynamic";
export const metadata={title:"Cars Partner Dashboard · HandMeKey"};

export default async function CarDashboardPage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/car-dashboard");
  const [dashboard,readiness]=await Promise.all([getCarDashboard(user.id).catch(()=>null),getCarCompanyPublishingReadiness(user.id).catch(()=>null)]);
  if(!dashboard)redirect("/cars/partner");
  const ar=market.baseLocale==="ar";
  const m=dashboard.metrics;

  return <CarPartnerShell companyName={dashboard.company.name} status={dashboard.company.status} verified={dashboard.company.verified} locale={market.baseLocale}>
    <div className={styles.pageHead}><div><span>HandMeKey Cars Partner</span><h1>{ar?"مركز تشغيل السيارات":"Cars operations center"}</h1><p>{ar?"تابع الأسطول والحجوزات والفروع وحالة اعتماد الشركة من مكان واحد.":"Track fleet, reservations, locations and company verification from one control center."}</p></div><Link className={styles.primary} href="/car-dashboard/fleet"><Plus size={17}/>{ar?"أضف سيارة":"Add vehicle"}</Link></div>

    <section className={styles.metrics}>
      <Metric icon={<CarFront size={17}/>} label={ar?"إجمالي السيارات":"Total vehicles"} value={m.vehicleCount} sub={ar?"كل الأسطول":"Entire fleet"}/>
      <Metric icon={<ShieldCheck size={17}/>} label={ar?"متاحة للبيع":"Active vehicles"} value={m.activeVehicles} sub={ar?"حالة Active":"Active status"}/>
      <Metric icon={<Wrench size={17}/>} label={ar?"صيانة":"Maintenance"} value={m.maintenanceVehicles} sub={ar?"غير معروضة للحجز":"Not bookable"}/>
      <Metric icon={<CalendarRange size={17}/>} label={ar?"حجوزات قادمة":"Upcoming bookings"} value={m.upcomingReservations} sub={ar?"مؤكدة أو قيد التأكيد":"Confirmed or held"}/>
      <Metric icon={<MapPin size={17}/>} label={ar?"مواقع الاستلام":"Pickup locations"} value={m.locationCount} sub={ar?"فروع فعالة":"Active locations"}/>
    </section>

    <div className={styles.grid}>
      <section className={styles.panel}><div className={styles.panelHead}><h2>{ar?"أحدث الحجوزات":"Recent reservations"}</h2><Link href="/car-dashboard/reservations">{ar?"عرض الكل":"View all"}</Link></div>{dashboard.recentReservations.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar?"الحجز":"Booking"}</th><th>{ar?"الضيف":"Guest"}</th><th>{ar?"السيارة":"Vehicle"}</th><th>{ar?"الاستلام":"Pickup"}</th><th>{ar?"الإجمالي":"Total"}</th></tr></thead><tbody>{dashboard.recentReservations.map((r)=><tr key={r.id}><td><strong>{r.reference}</strong></td><td>{r.guestName}</td><td>{r.vehicle}</td><td>{new Date(r.pickupAt).toLocaleString(ar?"ar-JO":"en-GB")}</td><td>{r.total.toFixed(2)} {r.currency}</td></tr>)}</tbody></table></div>:<div className={styles.empty}><span className={styles.emptyIcon}><CalendarRange size={24}/></span><h3>{ar?"لا توجد حجوزات سيارات بعد":"No car reservations yet"}</h3><p>{ar?"عندما يبدأ العملاء بالحجز ستظهر الحجوزات الحية هنا مع السيارة والضيف ومكان الاستلام والتسليم.":"Live reservations will appear here with the vehicle, guest, pickup and return details."}</p></div>}</section>
      <aside className={styles.panel}><div className={styles.panelHead}><h2>{ar?"جاهزية الشركة":"Company readiness"}</h2><Link href="/car-dashboard/settings">{ar?"الاعتماد":"Verification"}</Link></div><div className={styles.panelBody}><div className={styles.checklist}>
        {(readiness?.checks??[]).map((item)=><CheckItem key={item.code} done={item.passed} title={readinessLabel(item.code,item.label,ar)} body={readinessDetail(item.code,item.detail,ar)}/>) }
        {!readiness&&<CheckItem done={dashboard.company.verified} title={ar?"توثيق الشركة":"Verify the company"} body={ar?"افتح الإعدادات لمراجعة متطلبات الاعتماد.":"Open Settings to review verification requirements."}/>} 
      </div><Link className={styles.secondary} style={{marginTop:14,width:"100%"}} href="/car-dashboard/settings">{dashboard.company.status==="PENDING_REVIEW"?(ar?"عرض حالة المراجعة":"View review status"):(dashboard.company.verified?(ar?"عرض حالة النشر":"View publishing status"):(ar?"إكمال الاعتماد":"Complete verification"))}</Link></div></aside>
    </div>
  </CarPartnerShell>;
}

function Metric({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:number;sub:string}){return <article className={styles.metric}><div className={styles.metricTop}><span>{label}</span>{icon}</div><strong>{value}</strong><small>{sub}</small></article>}
function CheckItem({done,title,body}:{done:boolean;title:string;body:string}){return <div className={styles.checkItem}><span className={styles.checkIcon} style={done?{background:"#e9f7ef",color:"#16794e"}:undefined}>{done?<ShieldCheck size={17}/>:<Plus size={17}/>}</span><div><strong>{title}</strong><p>{body}</p></div></div>}
function readinessLabel(code:string,fallback:string,ar:boolean){if(!ar)return fallback;return ({COMPANY_PROFILE:"بيانات الشركة",ACTIVE_LOCATION:"موقع الاستلام والتسليم",ACTIVE_VEHICLE:"سيارة فعالة",VEHICLE_LISTING:"سيارة جاهزة للحجز"} as Record<string,string>)[code]??fallback;}
function readinessDetail(code:string,fallback:string,ar:boolean){if(!ar)return fallback;return ({COMPANY_PROFILE:"الاسم والمدينة والدولة والعنوان.",ACTIVE_LOCATION:"فرع فعّال للاستلام والتسليم.",ACTIVE_VEHICLE:"سيارة واحدة فعالة على الأقل.",VEHICLE_LISTING:"بيانات وسعر وصورة حقيقية لسيارة فعالة."} as Record<string,string>)[code]??fallback;}
