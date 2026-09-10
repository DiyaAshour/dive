import type {Metadata} from "next";
import {LegalPageShell} from "@/components/legal-page-shell";
import {requestGuestMarket} from "@/lib/request-guest-market";

export const metadata:Metadata={title:"About HandMeKey",description:"Learn what HandMeKey is building for hotel booking in Jordan."};

export default async function AboutPage(){
  const market=await requestGuestMarket();
  const ar=market.locale==="ar";
  const sections=ar?[
    {title:"ما هي HandMeKey؟",paragraphs:["HandMeKey منصة حجز سفر تركز أولاً على جعل تجربة حجز الفنادق في الأردن أوضح: فندق حقيقي، توفر حي، شروط إلغاء واضحة، والسعر النهائي قبل الدفع قدر الإمكان."]},
    {title:"كيف نحصل على الفنادق والأسعار؟",paragraphs:["نجمع بين فنادق يمكنها إدارة وجودها مباشرة على HandMeKey وبين مخزون فندقي مقدم عبر شركاء توريد وحجز خارجيين. نحاول إبقاء HandMeKey هي واجهة العميل والدعم، مع توضيح عندما تكون المراجعات أو بعض بيانات الحجز مقدمة من شريك خارجي."]},
    {title:"ما الذي نركز عليه الآن؟",bullets:["الأردن أولاً.","سرعة البحث ودقة السعر والتوفر.","توضيح السعر النهائي وسياسة الإلغاء قبل الحجز.","دعم واضح للمسافر قبل وأثناء وبعد الإقامة.","تمكين الفنادق من إدارة الأسعار والمخزون والحجوزات مباشرة عندما تكون شريكاً على المنصة."]},
    {title:"معلومات الشركة",paragraphs:["HandMeKey تعمل حالياً كسوق سفر يركز على الأردن. سيتم نشر الاسم القانوني المسجل ورقم التسجيل والعنوان القانوني هنا قبل الإطلاق التجاري العام فور اكتمال/اعتماد بيانات التسجيل الرسمية. لا نضع بيانات قانونية افتراضية أو غير مؤكدة."]},
  ]:[
    {title:"What is HandMeKey?",paragraphs:["HandMeKey is a travel-booking platform focused first on making hotel booking in Jordan clearer: real properties, live availability, understandable cancellation terms and the final stay total before payment whenever possible."]},
    {title:"Where do hotels and rates come from?",paragraphs:["HandMeKey combines properties that can manage their presence directly with hotel inventory supplied through external booking partners. We aim to keep HandMeKey as the traveler-facing booking and support experience while clearly identifying when reviews or booking data come from a third-party supply partner."]},
    {title:"What we are focused on now",bullets:["Jordan first.","Fast search and reliable live pricing and availability.","Clear final pricing and cancellation terms before booking.","Visible traveler support before, during and after a stay.","Direct property control of rates, inventory and reservations when a hotel is a HandMeKey partner."]},
    {title:"Company information",paragraphs:["HandMeKey is currently operating as a Jordan-focused travel marketplace. The registered legal entity name, registration number and registered business address will be published here before general commercial launch once the official registration details are finalized/approved. We do not publish placeholder legal details as if they were confirmed."]},
  ];
  return <LegalPageShell title={ar?"من نحن":"About HandMeKey"} kicker={ar?"منصة سفر تركز على الأردن":"Jordan-first travel platform"} intro={ar?"نبني تجربة حجز يكون فيها ما ستدفعه، شروط الإلغاء، ومصدر المعلومات واضحاً قبل أن تؤكد الحجز.":"We are building a booking experience where what you will pay, the cancellation rules and the source of booking information are clear before you confirm."} updated={ar?"معلومات المنتج: 10 سبتمبر 2026":"Product information: 10 September 2026"} sections={sections}/>;
}
