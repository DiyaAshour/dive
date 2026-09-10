import type {Metadata} from "next";
import {LegalPageShell} from "@/components/legal-page-shell";
import {requestGuestMarket} from "@/lib/request-guest-market";

export const metadata:Metadata={title:"Terms & Conditions",description:"HandMeKey terms and conditions for hotel booking and platform use."};

export default async function TermsPage(){
  const market=await requestGuestMarket();
  const ar=market.locale==="ar";
  const sections=ar?[
    {title:"دور HandMeKey",paragraphs:["HandMeKey منصة حجز وعرض أسعار تربط المسافر بخيارات إقامة. الفندق هو المسؤول عن تقديم الإقامة والخدمات الموجودة في الحجز. بعض الحجوزات قد تُنفذ تقنياً عبر مزود مخزون أو دفع خارجي يعمل مع HandMeKey."]},
    {title:"السعر والعملة",paragraphs:["نحاول عرض السعر النهائي للإقامة قبل تأكيد الحجز. إذا ظهرت قيمة تقريبية بعملة مختلفة، تكون عملة التحصيل الفعلية موضحة في صفحة الدفع أو التأكيد. أي ضرائب أو رسوم إلزامية معروفة لنا تُعرض ضمن تفاصيل السعر."]},
    {title:"التوفر وإعادة تأكيد السعر",paragraphs:["الأسعار والتوفر قد تتغير حتى لحظة التأكيد. لذلك قد نعيد التحقق من السعر قبل الدفع. إذا لم يعد السعر متاحاً، لن نؤكد الحجز بالسعر القديم دون موافقتك."]},
    {title:"الإلغاء والتعديل والاسترجاع",paragraphs:["سياسة السعر المختار هي المرجع الأساسي للإلغاء أو الاسترجاع. بعض الأسعار قابلة للإلغاء مجاناً حتى موعد محدد وبعضها غير قابل للاسترجاع. تظهر الشروط قبل الحجز وتبقى مرتبطة بتأكيد الحجز."]},
    {title:"الدعم والمسؤولية",paragraphs:["HandMeKey Guest Support هو نقطة التواصل الأولى عند وجود مشكلة في الحجز. قد نحتاج للتنسيق مع الفندق أو مزود المخزون أو مزود الدفع لتنفيذ تعديل أو إلغاء أو استرجاع. لا يغيّر ذلك مسؤولية الفندق عن تقديم الإقامة المحجوزة."]},
    {title:"بيانات الضيف",paragraphs:["يجب تقديم أسماء وبيانات صحيحة مطابقة لمتطلبات الفندق والحجز. قد يؤدي الخطأ في البيانات أو عدم استيفاء شروط الفندق مثل العمر أو الهوية إلى تعذر تنفيذ الإقامة."]},
    {title:"الاستخدام المقبول",paragraphs:["لا يجوز استخدام HandMeKey في الاحتيال، إساءة استخدام الأسعار، محاولات الاختراق، إنشاء حجوزات وهمية أو أي نشاط غير قانوني. يمكن تعليق أو إلغاء الوصول عند وجود إساءة استخدام مع مراعاة حقوق الحجوزات المشروعة القائمة."]},
    {title:"القانون والتغييرات",paragraphs:["تخضع الخدمة للمتطلبات القانونية المطبقة على HandMeKey ومزوديها والفنادق ذات الصلة. قد نحدّث هذه الشروط عند تغير المنتج أو المتطلبات القانونية مع توضيح تاريخ السريان."]},
  ]:[
    {title:"HandMeKey's role",paragraphs:["HandMeKey is a booking and rate-comparison platform connecting travelers with accommodation options. The hotel is responsible for delivering the booked stay and services. Some bookings may be technically fulfilled through an external inventory or payment partner working with HandMeKey."]},
    {title:"Price and currency",paragraphs:["We aim to show the final stay total before confirmation. If an approximate converted amount is displayed, the actual charge currency is identified at checkout or confirmation. Known mandatory taxes and charges are shown in the price details when available to us."]},
    {title:"Availability and price recheck",paragraphs:["Rates and availability can change until confirmation. We may therefore recheck the rate before payment. If the rate is no longer available, we will not confirm the booking at the old price without your approval."]},
    {title:"Cancellation, changes and refunds",paragraphs:["The selected rate policy controls cancellation and refund eligibility. Some rates allow free cancellation until a deadline; others are non-refundable. The applicable terms are shown before booking and remain attached to the booking confirmation."]},
    {title:"Support and responsibility",paragraphs:["HandMeKey Guest Support is your first point of contact for a booking problem. We may coordinate with the hotel, inventory partner or payment provider to process a change, cancellation or refund. The hotel remains responsible for delivering the booked stay."]},
    {title:"Guest information",paragraphs:["You must provide accurate names and details that meet hotel and booking requirements. Incorrect information or failure to meet property requirements such as age or identification rules may prevent fulfillment."]},
    {title:"Acceptable use",paragraphs:["You may not use HandMeKey for fraud, rate abuse, security attacks, fake reservations or unlawful activity. Access may be restricted for abuse while legitimate existing booking rights are handled appropriately."]},
    {title:"Law and changes",paragraphs:["The service is subject to legal requirements applicable to HandMeKey, relevant providers and properties. We may update these terms as the product or legal requirements change and will identify the effective date."]},
  ];
  return <LegalPageShell title={ar?"الشروط والأحكام":"Terms & Conditions"} kicker={ar?"شروط الحجز":"Booking terms"} intro={ar?"هذه الشروط تشرح دور HandMeKey، طريقة عرض السعر، ومسؤوليات الأطراف عند استخدام المنصة أو تنفيذ حجز.":"These terms explain HandMeKey's role, how pricing is presented and how responsibilities are divided when you use the platform or make a booking."} updated={ar?"آخر تحديث: 10 سبتمبر 2026":"Last updated: 10 September 2026"} sections={sections}/>;
}
