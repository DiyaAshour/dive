import { redirect } from "next/navigation";
import { Tag } from "lucide-react";
import { getCarCompanyForUser } from "@platform/server";
import { CarPartnerShell } from "@/components/car-partner-shell";
import styles from "@/components/car-partner-shell.module.css";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic="force-dynamic";

export default async function CarPromotionsPage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/car-dashboard/promotions");
  const company=await getCarCompanyForUser(user.id);
  if(!company)redirect("/cars/partner");
  const ar=market.baseLocale==="ar";
  return <CarPartnerShell companyName={company.company.name} status={company.company.status} verified={company.company.verified} locale={market.baseLocale}>
    <div className={styles.pageHead}><div><span>Grow · Promotions</span><h1>{ar?"عروض السيارات":"Car promotions"}</h1><p>{ar?"مساحة مستقلة لعروض التأجير مثل خصم الحجز المبكر، الإيجار الأسبوعي وعروض المطار.":"A dedicated workspace for early-booking, weekly-rental and airport promotions."}</p></div></div>
    <section className={styles.panel}><div className={styles.empty}><span className={styles.emptyIcon}><Tag size={24}/></span><h3>{ar?"محرك عروض السيارات هو الخطوة التالية":"Cars promotion engine is next"}</h3><p>{ar?"الـCars Partner Hub جاهز لاستقبال محرك عروض منفصل عن Promotions الفنادق حتى لا تختلط قواعد الخصم بين المنتجين.":"The Cars Partner Hub is ready for a promotion engine separate from hotel Promotions so discount rules never mix across products."}</p></div></section>
  </CarPartnerShell>;
}
