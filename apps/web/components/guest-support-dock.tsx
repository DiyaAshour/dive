"use client";

import Link from "next/link";
import {Headphones,Mail} from "lucide-react";
import {usePathname} from "next/navigation";
import type {GuestLocale} from "@/lib/guest-market";

export function GuestSupportDock({locale,supportEmail}:{locale:GuestLocale;supportEmail:string}){
  const pathname=usePathname();
  const ar=locale==="ar";
  const bookingContext=pathname.startsWith("/nuitee-checkout")||pathname.startsWith("/checkout")||pathname.startsWith("/booking/")||pathname.startsWith("/account/trips")||pathname.startsWith("/trips");
  if(!bookingContext)return null;
  return <aside className="guestSupportDock" aria-label={ar?"دعم الحجوزات":"Booking support"}>
    <div className="guestSupportDockIcon"><Headphones size={20}/></div>
    <div><strong>{ar?"تحتاج مساعدة في حجزك؟":"Need help with a booking?"}</strong><span>{ar?"فريق HandMeKey هو نقطة التواصل الأولى للدعم والإلغاء والمشاكل المتعلقة بالحجز.":"HandMeKey Guest Support is your first point of contact for booking, cancellation and stay issues."}</span></div>
    {supportEmail?<a href={`mailto:${supportEmail}`}><Mail size={15}/>{ar?"راسل الدعم":"Email support"}</a>:<Link href="/contact">{ar?"تواصل مع الدعم":"Contact support"}</Link>}
  </aside>;
}
