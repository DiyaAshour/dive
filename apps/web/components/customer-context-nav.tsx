"use client";

import Link from "next/link";
import { Bell, BookOpenText, Building2, Car, ChevronDown, Search, Sparkles } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./customer-context-nav.module.css";

type Props = Readonly<{
  locale: string;
  staysSearchLabel: string;
  rewardsLabel: string;
  guideLabel: string;
  tripsLabel: string;
  alertsLabel: string;
  rewardsHref: string;
  mobile?: boolean;
}>;

function useCarsMode() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return pathname.startsWith("/cars") || pathname.startsWith("/car-dashboard") || (pathname === "/" && searchParams.get("service") === "cars");
}

export function CustomerContextNav({
  locale,
  staysSearchLabel,
  rewardsLabel,
  guideLabel,
  tripsLabel,
  alertsLabel,
  rewardsHref,
  mobile = false,
}: Props) {
  const isCars = useCarsMode();
  const ar = locale.startsWith("ar");

  if (isCars) {
    const searchCars = <Link href="/?service=cars#car-search"><Search size={15}/>{ar ? "ابحث عن سيارة" : "Search cars"}</Link>;
    const carBookings = <Link href="/cars/bookings"><Car size={15}/>{ar ? "حجوزات السيارات" : "Car bookings"}</Link>;
    const priceAlerts = <Link href="/account/alerts?service=cars"><Bell size={15}/>{ar ? "تنبيهات الأسعار" : "Price alerts"}</Link>;
    const rentalCompanies = <Link href="/cars"><Building2 size={15}/>{ar ? "شركات التأجير" : "Rental companies"}</Link>;

    if (mobile) return <>{searchCars}{carBookings}{priceAlerts}{rentalCompanies}</>;

    return <>
      {searchCars}
      {carBookings}
      <details className={styles.moreMenu}>
        <summary><span>{ar ? "المزيد" : "More"}</span><ChevronDown size={15}/></summary>
        <div className={styles.morePanel}>
          <section>
            <span className={styles.groupLabel}>{ar ? "لرحلتك" : "For your trip"}</span>
            {priceAlerts}
          </section>
          <section>
            <span className={styles.groupLabel}>{ar ? "استكشف" : "Explore"}</span>
            {rentalCompanies}
          </section>
        </div>
      </details>
    </>;
  }

  return <>
    <Link href="/search">{staysSearchLabel}</Link>
    <Link href={rewardsHref}><Sparkles size={15}/>{rewardsLabel}</Link>
    <Link href={`/blog/${locale.startsWith("ar") ? "ar" : "en"}`}><BookOpenText size={15}/>{guideLabel}</Link>
    <Link href="/trips">{tripsLabel}</Link>
    <Link href="/account/alerts"><Bell size={16}/>{alertsLabel}</Link>
  </>;
}

export function CustomerContextPartnerLink({locale, staysLabel, mobile = false}: {locale:string;staysLabel:string;mobile?:boolean}) {
  const isCars = useCarsMode();
  const ar = locale.startsWith("ar");
  return <Link className={mobile ? "mobilePartnerEntry" : "partnerEntry"} href={isCars ? "/cars/partner" : "/partner"}>
    {isCars ? <Car size={mobile ? 17 : 16}/> : <Building2 size={mobile ? 17 : 16}/>}
    {isCars ? (ar ? "أضف شركة تأجير" : "List rental company") : staysLabel}
  </Link>;
}
