"use client";

import Link from "next/link";
import {CalendarDays, Home, Search, Sparkles, UserRound} from "lucide-react";
import {usePathname} from "next/navigation";
import {guestUiCopy} from "@/lib/guest-ui-copy";
import type {GuestLocale} from "@/lib/guest-market";

type Props=Readonly<{locale:GuestLocale;rewardsHref:string}>;

export function MobileAppNav({locale,rewardsHref}:Props){
  const pathname=usePathname();
  const copy=guestUiCopy(locale).mobileNav;
  if(pathname.startsWith("/hotel/")||pathname.startsWith("/checkout")||pathname.startsWith("/booking/")||pathname.startsWith("/partner")||pathname.startsWith("/admin"))return null;

  const items=[
    {href:"/",label:copy.home,icon:Home,active:pathname==="/"},
    {href:"/search",label:copy.search,icon:Search,active:pathname.startsWith("/search")},
    {href:"/trips",label:copy.trips,icon:CalendarDays,active:pathname.startsWith("/trips")},
    {href:rewardsHref,label:copy.rewards,icon:Sparkles,active:pathname.startsWith("/rewards")},
    {href:"/account",label:copy.account,icon:UserRound,active:pathname.startsWith("/account")},
  ];

  return <nav className="mobileAppNav" aria-label={copy.home}>
    {items.map(({href,label,icon:Icon,active})=><Link key={href} href={href} className={active?"active":""} aria-current={active?"page":undefined}><Icon size={20}/><span>{label}</span></Link>)}
  </nav>;
}
