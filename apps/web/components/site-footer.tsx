"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {Headphones, Mail, ShieldCheck} from "lucide-react";
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
  const email=supportEmail||"support@handmekey.com";
  const socials=[
    ["Instagram",safeSocialUrl(socialLinks.instagram,["instagram.com","www.instagram.com"])],
    ["Facebook",safeSocialUrl(socialLinks.facebook,["facebook.com","www.facebook.com"])],
    ["X",safeSocialUrl(socialLinks.x,["x.com","www.x.com","twitter.com","www.twitter.com"])],
    ["LinkedIn",safeSocialUrl(socialLinks.linkedin,["linkedin.com","www.linkedin.com"])],
  ].filter((item):item is [string,string]=>Boolean(item[1]));

  return <footer className="siteTrustFooter">
    <div className="shell siteTrustFooterSupport">
      <div className="siteTrustFooterSupportIcon"><Headphones size={22}/></div>
      <div className="siteTrustFooterSupportCopy">
        <span>{ar?"دعم الحجوزات":"Booking support"}</span>
        <strong>{ar?"تحتاج مساعدة في حجزك؟ HandMeKey هي نقطة التواصل الأولى.":"Need help with a booking? HandMeKey is your first point of contact."}</strong>
        <p>{ar?"نساعدك قبل الإقامة وأثناءها وبعدها، بما في ذلك التعديلات والإلغاء ومتابعة المشاكل مع الفندق أو مزود الحجز عند الحاجة.":"We can help before, during and after your stay, including changes, cancellations and coordination with the hotel or booking-supply partner when needed."}</p>
      </div>
      <div className="siteTrustFooterSupportActions">
        <Link className="siteTrustFooterPrimary" href="/contact">{ar?"تواصل مع الدعم":"Contact support"}</Link>
        <a className="siteTrustFooterEmail" href={`mailto:${email}`}><Mail size={15}/>{email}</a>
      </div>
    </div>

    <div className="shell siteTrustFooterGrid">
      <div className="siteTrustFooterBrand">
        <Link className="siteTrustFooterWordmark" href="/" aria-label="HandMeKey home">HandMeKey</Link>
        <p>{footerText||(ar?"حجوزات فنادق أوضح، سعر نهائي قبل الدفع، ودعم من HandMeKey عند الحاجة.":"Clearer hotel booking, a final stay total before payment, and HandMeKey support when you need it.")}</p>
        <div className="siteTrustFooterTrust"><ShieldCheck size={15}/><span>{ar?"منصة حجز تركّز حاليًا على الأردن":"Booking platform currently focused on Jordan"}</span></div>
      </div>

      <nav aria-label={ar?"الحجز":"Booking"}>
        <strong>{ar?"الحجز":"Booking"}</strong>
        <Link href="/search">{ar?"ابحث عن إقامة":"Search stays"}</Link>
        <Link href="/trips">{ar?"حجوزاتي":"My trips"}</Link>
        <Link href="/refund-policy">{ar?"الإلغاء والاسترجاع":"Cancellation & refunds"}</Link>
        <Link href="/contact">{ar?"مساعدة في حجز":"Booking help"}</Link>
      </nav>

      <nav aria-label={ar?"الثقة والقانون":"Trust and legal"}>
        <strong>{ar?"الثقة والقانون":"Trust & legal"}</strong>
        <Link href="/about">{ar?"من نحن":"About us"}</Link>
        <Link href="/terms">{ar?"الشروط والأحكام":"Terms & conditions"}</Link>
        <Link href="/privacy">{ar?"سياسة الخصوصية":"Privacy policy"}</Link>
        <Link href="/refund-policy">{ar?"سياسة الإلغاء والاسترجاع":"Refund policy"}</Link>
      </nav>

      <nav aria-label={ar?"الدعم":"Support"}>
        <strong>{ar?"الدعم":"Support"}</strong>
        <Link href="/contact">{ar?"تواصل معنا":"Contact us"}</Link>
        <a href={`mailto:${email}`}>{email}</a>
        <span>{ar?"للمساعدة قبل وأثناء وبعد الإقامة.":"Help before, during and after your stay."}</span>
        {socials.length>0&&<div className="siteTrustFooterSocials">{socials.map(([label,url])=><a key={label} href={url} target="_blank" rel="noreferrer">{label}</a>)}</div>}
      </nav>
    </div>

    <div className="shell siteTrustFooterBottom">
      <span>© {new Date().getFullYear()} HandMeKey</span>
      <span>{ar?"HandMeKey منصة حجز ودعم للمسافر. الفندق مسؤول عن تقديم الإقامة، وقد يشارك شريك مخزون أو دفع خارجي في تنفيذ بعض الحجوزات وفق الشروط المعروضة قبل التأكيد.":"HandMeKey is a traveler booking and support platform. The hotel is responsible for delivering the stay, and an external inventory or payment partner may participate in fulfillment as disclosed before confirmation."}</span>
    </div>
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
