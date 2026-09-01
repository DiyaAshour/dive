"use client";

import Link from "next/link";
import { Bell, BookOpenText, Building2, Car, Search, Sparkles } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

type Props = Readonly<{
  locale: string;
  staysSearchLabel: string;
  rewardsLabel: string;
  guideLabel: string;
  tripsLabel: string;
  alertsLabel: string;
  rewardsHref: string;
}>;

function useCarsMode() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return pathname.startsWith("/cars") || (pathname === "/" && searchParams.get("service") === "cars");
}

export function CustomerContextNav({
  locale,
  staysSearchLabel,
  rewardsLabel,
  guideLabel,
  tripsLabel,
  alertsLabel,
  rewardsHref,
}: Props) {
  const isCars = useCarsMode();
  const ar = locale.startsWith("ar");

  if (isCars) {
    return <>
      <Link href="/?service=cars#car-search"><Search size={15}/>{ar ? "ابحث عن سيارة" : "Search cars"}</Link>
      <Link href="/trips"><Car size={15}/>{ar ? "حجوزات السيارات" : "Car bookings"}</Link>
      <Link href="/account/alerts"><Bell size={15}/>{ar ? "تنبيهات الأسعار" : "Price alerts"}</Link>
      <Link href="/cars"><Building2 size={15}/>{ar ? "شركات التأجير" : "Rental companies"}</Link>
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
  return <Link className={mobile ? "mobilePartnerEntry" : "partnerEntry"} href="/partner">
    <Building2 size={mobile ? 17 : 16}/>
    {isCars ? (ar ? "أضف شركة تأجير" : "List rental company") : staysLabel}
  </Link>;
}
