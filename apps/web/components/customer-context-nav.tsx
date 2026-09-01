"use client";

import Link from "next/link";
import { Bell, BookOpenText, Building2, CarFront, Sparkles } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { GuestLocale } from "@/lib/guest-market";

type NavProps = Readonly<{
  locale: GuestLocale;
  rewardsHref: string;
  guideHref: string;
}>;

type PartnerProps = Readonly<{
  locale: GuestLocale;
  className: string;
}>;

function isCarsContext(pathname: string, service: string | null) {
  return pathname.startsWith("/cars") || pathname.startsWith("/car-dashboard") || service === "cars";
}

function contextCopy(locale: GuestLocale, cars: boolean) {
  const ar = locale === "ar";
  if (cars) {
    return ar
      ? {
          search: "ابحث عن سيارة",
          rewards: "المكافآت",
          guide: "دليل السيارات",
          bookings: "حجوزاتي",
          alerts: "تنبيهات أسعار السيارات",
          partner: "أضف شركة تأجيرك",
        }
      : {
          search: "Find a car",
          rewards: "Rewards",
          guide: "Car rental guide",
          bookings: "My bookings",
          alerts: "Car price alerts",
          partner: "List your rental company",
        };
  }

  return ar
    ? {
        search: "ابحث عن إقامة",
        rewards: "المكافآت",
        guide: "دليل السفر",
        bookings: "حجوزاتي",
        alerts: "تنبيهات الأسعار",
        partner: "أضف منشأتك",
      }
    : {
        search: "Find a stay",
        rewards: "Rewards",
        guide: "Travel guide",
        bookings: "My bookings",
        alerts: "Price alerts",
        partner: "List your property",
      };
}

export function CustomerContextNav({ locale, rewardsHref, guideHref }: NavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cars = isCarsContext(pathname, searchParams.get("service"));
  const copy = contextCopy(locale, cars);

  return <>
    <Link href={cars ? "/?service=cars" : "/search"}>{cars && <CarFront size={15}/>} {copy.search}</Link>
    <Link href={rewardsHref}><Sparkles size={15}/>{copy.rewards}</Link>
    <Link href={cars ? `${guideHref}?topic=cars` : guideHref}><BookOpenText size={15}/>{copy.guide}</Link>
    <Link href={cars ? "/trips?service=cars" : "/trips"}>{copy.bookings}</Link>
    <Link href={cars ? "/account/alerts?service=cars" : "/account/alerts"}><Bell size={16}/>{copy.alerts}</Link>
  </>;
}

export function ContextPartnerEntry({ locale, className }: PartnerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cars = isCarsContext(pathname, searchParams.get("service"));
  const copy = contextCopy(locale, cars);

  return <Link className={className} href={cars ? "/cars/partner" : "/partner"}>
    {cars ? <CarFront size={17}/> : <Building2 size={17}/>} {copy.partner}
  </Link>;
}
