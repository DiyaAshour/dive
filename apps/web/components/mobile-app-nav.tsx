"use client";

import Link from "next/link";
import {CalendarDays, CarFront, Home, Search, Sparkles, UserRound} from "lucide-react";
import {usePathname, useSearchParams} from "next/navigation";
import {guestUiCopy} from "@/lib/guest-ui-copy";
import type {GuestLocale} from "@/lib/guest-market";

type Props=Readonly<{locale:GuestLocale;rewardsHref:string}>;

export function MobileAppNav({locale,rewardsHref}:Props){
  const pathname=usePathname();
  const searchParams=useSearchParams();
  const copy=guestUiCopy(locale).mobileNav;
  if(pathname.startsWith("/hotel/")||pathname.startsWith("/checkout")||pathname.startsWith("/booking/")||pathname.startsWith("/partner")||pathname.startsWith("/admin")||pathname.startsWith("/car-dashboard"))return null;

  const carMode=pathname.startsWith("/cars")||searchParams.get("service")==="cars";
  const bookingsLabel=carMode?(locale==="ar"?"حجوزاتي":"Bookings"):copy.trips;
  const BookingsIcon=carMode?CarFront:CalendarDays;
  const bookingsHref=carMode?"/cars/bookings":"/trips";
  const homeHref=carMode?"/?service=cars":"/";

  const items=[
    {href:homeHref,label:copy.home,icon:Home,active:pathname==="/"},
    {href:carMode?"/?service=cars":"/search",label:copy.search,icon:Search,active:carMode?pathname==="/cars":pathname.startsWith("/search")},
    {href:bookingsHref,label:bookingsLabel,icon:BookingsIcon,active:carMode?pathname.startsWith("/cars/bookings"):pathname.startsWith("/trips")},
    {href:rewardsHref,label:copy.rewards,icon:Sparkles,active:pathname.startsWith("/rewards")},
    {href:"/account",label:copy.account,icon:UserRound,active:pathname.startsWith("/account")},
  ];

  return <nav className="mobileAppNav" aria-label={copy.home}>
    {items.map(({href,label,icon:Icon,active})=><Link key={href} href={href} className={active?"active":""} aria-current={active?"page":undefined}><Icon size={20}/><span>{label}</span></Link>)}
  </nav>;
}
