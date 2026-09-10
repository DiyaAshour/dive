import type {Metadata} from "next";
import Link from "next/link";
import {Mail,MessageCircle,ReceiptText} from "lucide-react";
import {getSiteIdentityConfig} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {requestGuestMarket} from "@/lib/request-guest-market";

export const metadata:Metadata={title:"Contact HandMeKey",description:"Contact HandMeKey Guest Support about a hotel booking or platform question."};

export default async function ContactPage(){
  const [market,identity]=await Promise.all([requestGuestMarket(),getSiteIdentityConfig()]);
  const ar=market.locale==="ar";
  return <main className="legalPage">
    <CustomerHeader/>
    <section className="shell legalHero">
      <Link className="legalBack" href="/">← HandMeKey</Link>
      <span className="eyebrow">{ar?"دعم المسافرين":"Guest support"}</span>
      <h1>{ar?"تواصل معنا":"Contact HandMeKey"}</h1>
      <p>{ar?"إذا كان سؤالك عن حجز قائم، جهّز رقم الحجز واسم الفندق وتاريخ الوصول حتى نقدر نساعدك أسرع.":"If your question is about an existing reservation, have your booking reference, hotel name and arrival date ready so we can help faster."}</p>
    </section>
    <section className="shell contactTrustGrid">
      <article><ReceiptText/><h2>{ar?"عندي حجز قائم":"I have a booking"}</h2><p>{ar?"ابدأ من حجوزاتي لمراجعة تفاصيل الإقامة والإلغاء، ثم تواصل مع الدعم إذا احتجت تدخل من الفريق.":"Start in My Trips to review the stay and cancellation details, then contact support if you need our team to step in."}</p><Link href="/account/trips">{ar?"فتح حجوزاتي":"Open My Trips"}</Link></article>
      <article><Mail/><h2>{ar?"البريد الإلكتروني":"Email support"}</h2>{identity.supportEmail?<><p>{ar?"يمكنك مراسلة فريق دعم HandMeKey مباشرة.":"Email HandMeKey Guest Support directly."}</p><a href={`mailto:${identity.supportEmail}`}>{identity.supportEmail}</a></>:<><p>{ar?"لم يتم نشر بريد الدعم العام في إعدادات الموقع بعد. قبل الإطلاق العام يجب تعيينه من إعدادات هوية الموقع. تفاصيل التواصل المرتبطة بالحجز تبقى متاحة في تأكيد الحجز.":"A public support email has not yet been published in Site Identity. It must be configured before general launch. Booking-specific contact details remain available with the booking confirmation."}</p></>}</article>
      <article><MessageCircle/><h2>{ar?"مشكلة في الفندق أو الإلغاء":"Hotel or cancellation issue"}</h2><p>{ar?"HandMeKey Guest Support هو نقطة التواصل الأولى. إذا كان الحجز منفذاً عبر شريك مخزون، نتولى التنسيق مع الشريك أو الفندق عند الحاجة.":"HandMeKey Guest Support is your first point of contact. If the booking is fulfilled through an inventory partner, we coordinate with that partner or the hotel when required."}</p><Link href="/refund-policy">{ar?"سياسة الإلغاء والاسترجاع":"Cancellation & refund policy"}</Link></article>
    </section>
    <section className="shell supportSafetyNote"><strong>{ar?"للأمان":"Security note"}</strong><p>{ar?"لا ترسل رقم البطاقة الكامل أو رمز CVV أو كلمات المرور عبر البريد أو الرسائل.":"Never send a full card number, CVV or password by email or message."}</p></section>
  </main>;
}
