"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import type {GuestLocale} from "@/lib/guest-market";

type Props=Readonly<{
  locale:GuestLocale;
  supportEmail:string;
  footerText:string;
  socialLinks:Readonly<{instagram:string|null;facebook:string|null;x:string|null;linkedin:string|null}>;
}>;

export function SiteFooter({locale,supportEmail,footerText,socialLinks}:Props){
  const pathname=usePathname();
  const hidden=pathname.startsWith("/admin")||pathname.startsWith("/hotel-dashboard")||pathname.startsWith("/car-dashboard")||pathname.startsWith("/partner/login")||pathname.startsWith("/partner/onboarding");
  if(hidden)return null;
  const ar=locale==="ar";
  const socials=[
    ["Instagram",safeSocialUrl(socialLinks.instagram,["instagram.com","www.instagram.com"])],
    ["Facebook",safeSocialUrl(socialLinks.facebook,["facebook.com","www.facebook.com"])],
    ["X",safeSocialUrl(socialLinks.x,["x.com","www.x.com","twitter.com","www.twitter.com"])],
    ["LinkedIn",safeSocialUrl(socialLinks.linkedin,["linkedin.com","www.linkedin.com"])],
  ].filter((item):item is [string,string]=>Boolean(item[1]));
  return <footer className="siteTrustFooter">
    <div className="shell siteTrustFooterGrid">
      <div className="siteTrustFooterBrand">
        <strong>HandMeKey</strong>
        <p>{footerText||(ar?"حجوزات فنادق أوضح، سعر نهائي قبل الدفع، ودعم من HandMeKey عند الحاجة.":"Clearer hotel booking, a final stay total before payment, and HandMeKey support when you need it.")}</p>
        <span>{ar?"السوق الأساسي: الأردن":"Primary market: Jordan"}</span>
      </div>
      <nav aria-label={ar?"روابط الثقة":"Trust links"}>
        <strong>{ar?"الثقة والقانون":"Trust & legal"}</strong>
        <Link href="/about">{ar?"من نحن":"About us"}</Link>
        <Link href="/terms">{ar?"الشروط والأحكام":"Terms & conditions"}</Link>
        <Link href="/privacy">{ar?"سياسة الخصوصية":"Privacy policy"}</Link>
        <Link href="/refund-policy">{ar?"الإلغاء والاسترجاع":"Cancellation & refunds"}</Link>
      </nav>
      <nav aria-label={ar?"الدعم":"Support"}>
        <strong>{ar?"دعم الحجوزات":"Booking support"}</strong>
        <Link href="/contact">{ar?"تواصل معنا":"Contact us"}</Link>
        <Link href="/account/trips">{ar?"حجوزاتي":"My trips"}</Link>
        {supportEmail?<a href={`mailto:${supportEmail}`}>{supportEmail}</a>:<span>{ar?"تفاصيل التواصل تظهر أيضاً في تأكيد الحجز.":"Contact details also appear with your booking confirmation."}</span>}
      </nav>
      {socials.length>0&&<nav aria-label="Social"><strong>{ar?"تابعنا":"Follow"}</strong>{socials.map(([label,url])=><a key={label} href={url} target="_blank" rel="noreferrer">{label}</a>)}</nav>}
    </div>
    <div className="shell siteTrustFooterBottom"><span>© {new Date().getFullYear()} HandMeKey</span><span>{ar?"HandMeKey منصة حجز؛ الفندق يبقى مسؤولاً عن تقديم الإقامة، وقد يشارك مزود مخزون خارجي في تنفيذ بعض الحجوزات.":"HandMeKey is a booking platform; the hotel remains responsible for delivering the stay, and an external inventory partner may participate in fulfillment for some bookings."}</span></div>
  </footer>;
}

function safeSocialUrl(value:string|null,allowedHosts:readonly string[]):string|null{
  if(!value)return null;
  try{
    const parsed=new URL(value);
    if(parsed.protocol!=="https:"&&parsed.protocol!=="http:")return null;
    if(!allowedHosts.includes(parsed.hostname.toLowerCase()))return null;
    return parsed.toString();
  }catch{return null;}
}
