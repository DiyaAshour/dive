import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, CalendarRange, CarFront, MapPin, ShieldCheck } from "lucide-react";
import { getCarCompanyForUser } from "@platform/server";
import { CarCompanyOnboardingForm } from "@/components/car-company-onboarding-form";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import styles from "@/components/car-company-onboarding.module.css";

export const dynamic="force-dynamic";
export const metadata={title:"Cars Partner Hub · HandMeKey"};

export default async function CarsPartnerPage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/cars/partner");
  const existing=await getCarCompanyForUser(user.id);
  if(existing)redirect("/car-dashboard");
  const ar=market.baseLocale==="ar";

  return <main className={styles.page} dir={ar?"rtl":"ltr"} lang={market.intlLocale}>
    <div className={styles.shell}>
      <div className={styles.top}>
        <Link href="/?service=cars" className={styles.back}><ArrowLeft size={16}/>{ar?"العودة إلى السيارات":"Back to Cars"}</Link>
        <div className={styles.brand}><span><CarFront size={20}/></span>HandMeKey Cars Partner</div>
      </div>
      <div className={styles.grid}>
        <section className={styles.intro}>
          <span className={styles.eyebrow}>HandMeKey Cars Partner Hub</span>
          <h1>{ar?"شغّل شركة التأجير من مكان واحد.":"Run your rental company from one place."}</h1>
          <p>{ar?"لوحة مستقلة لشركات السيارات: الأسطول، الفروع، الأسعار والتوفر، الحجوزات والأداء. بيانات الفنادق لا تختلط مع السيارات.":"A dedicated control panel for rental companies: fleet, locations, rates, availability, reservations and performance. Cars stay separate from hotel operations."}</p>
          <div className={styles.benefits}>
            <div className={styles.benefit}><span><CarFront size={18}/></span><div><strong>{ar?"إدارة الأسطول":"Fleet management"}</strong><small>{ar?"أضف السيارات والفئات والأسعار والوديعة وشروط كل سيارة.":"Add vehicles, categories, pricing, deposits and rental conditions."}</small></div></div>
            <div className={styles.benefit}><span><MapPin size={18}/></span><div><strong>{ar?"الفروع ومواقع الاستلام":"Locations & pickup points"}</strong><small>{ar?"المطار، الفروع داخل المدينة ومواقع التسليم المختلفة.":"Airport, city branches and different return points."}</small></div></div>
            <div className={styles.benefit}><span><CalendarRange size={18}/></span><div><strong>{ar?"الحجوزات والتوفر":"Reservations & availability"}</strong><small>{ar?"اعرف السيارة المحجوزة ومتى تعود وما المتاح للبيع.":"Know what is booked, when vehicles return and what remains sellable."}</small></div></div>
            <div className={styles.benefit}><span><BarChart3 size={18}/></span><div><strong>{ar?"الأداء والإيرادات":"Performance & revenue"}</strong><small>{ar?"لوحة أرقام منفصلة بالكامل عن أداء الفنادق.":"A performance view completely separate from hotel metrics."}</small></div></div>
            <div className={styles.benefit}><span><ShieldCheck size={18}/></span><div><strong>{ar?"توثيق الشركة":"Company verification"}</strong><small>{ar?"الشركة تبقى Draft حتى تكتمل بياناتها ومراجعتها قبل النشر.":"The company remains Draft until its details are complete and reviewed before publishing."}</small></div></div>
          </div>
        </section>
        <CarCompanyOnboardingForm locale={market.baseLocale}/>
      </div>
    </div>
  </main>;
}
