import type {Metadata} from "next";
import {LegalPageShell} from "@/components/legal-page-shell";
import {requestGuestMarket} from "@/lib/request-guest-market";

export const metadata:Metadata={title:"Cancellation & Refund Policy",description:"HandMeKey cancellation and refund policy for hotel bookings."};

export default async function RefundPolicyPage(){
  const market=await requestGuestMarket();
  const ar=market.locale==="ar";
  const sections=ar?[
    {title:"السياسة التي تنطبق على حجزك",paragraphs:["سياسة الإلغاء الخاصة بالسعر الذي اخترته هي المرجع الأساسي. نعرض الموعد النهائي للإلغاء المجاني وأي غرامة معروفة قبل تأكيد الحجز متى كانت هذه البيانات متاحة من الفندق أو مزود المخزون."]},
    {title:"الإلغاء المجاني",paragraphs:["إذا كان السعر يسمح بإلغاء مجاني وتم الإلغاء قبل الموعد المحدد، تتم معالجة الاسترجاع المؤهل وفق طريقة الدفع الأصلية وشروط مزود الدفع أو المخزون."]},
    {title:"الأسعار غير القابلة للاسترجاع",paragraphs:["الأسعار المعلّمة بأنها غير قابلة للاسترجاع قد تترتب عليها غرامة تصل إلى كامل قيمة الحجز. لا تعد HandMeKey باسترجاع مخالف للشروط المعروضة عند الشراء إلا إذا وافق الفندق أو الجهة المنفذة على استثناء."]},
    {title:"مدة وصول المبلغ",paragraphs:["بعد قبول الاسترجاع، قد يحتاج المبلغ عدة أيام عمل ليظهر في الحساب حسب البنك وشبكة البطاقة ومزود الدفع. وقت المعالجة البنكي خارج سيطرة HandMeKey."]},
    {title:"فشل الفندق في تقديم الإقامة",paragraphs:["إذا لم يتمكن الفندق من تقديم الحجز المؤكد، تواصل مع HandMeKey Guest Support فوراً. سنراجع التأكيد ونتواصل مع الفندق أو مزود المخزون لمحاولة إيجاد حل مناسب، وقد يشمل ذلك إعادة الحجز أو الاسترجاع بحسب الحالة والحقوق المطبقة."]},
    {title:"كيف تطلب الإلغاء أو المساعدة",paragraphs:["ابدأ من صفحة حجوزاتي أو صفحة تواصل معنا واذكر رقم الحجز واسم الفندق وتاريخ الوصول. لا ترسل بيانات البطاقة الكاملة عبر البريد أو الرسائل."]},
  ]:[
    {title:"The policy that applies to your booking",paragraphs:["The cancellation policy attached to the rate you selected is the controlling policy. We display the free-cancellation deadline and known penalties before confirmation when supplied by the hotel or inventory partner."]},
    {title:"Free cancellation",paragraphs:["If the rate allows free cancellation and the booking is cancelled before the stated deadline, an eligible refund is processed according to the original payment method and the payment or inventory partner's processing rules."]},
    {title:"Non-refundable rates",paragraphs:["Rates marked non-refundable may carry a penalty up to the full booking value. HandMeKey does not promise a refund that conflicts with the terms shown at purchase unless the hotel or fulfillment party approves an exception."]},
    {title:"When the money arrives",paragraphs:["After a refund is accepted, it may take several business days to appear depending on your bank, card network and payment provider. Bank processing time is outside HandMeKey's control."]},
    {title:"If the hotel cannot deliver the stay",paragraphs:["If a hotel cannot honor a confirmed reservation, contact HandMeKey Guest Support immediately. We will review the confirmation and coordinate with the hotel or inventory partner to seek an appropriate resolution, which may include re-accommodation or refund depending on the circumstances and applicable rights."]},
    {title:"How to request cancellation or help",paragraphs:["Start from My Trips or the Contact page and include your booking reference, hotel name and arrival date. Never send full card details by email or message."]},
  ];
  return <LegalPageShell title={ar?"سياسة الإلغاء والاسترجاع":"Cancellation & Refund Policy"} kicker={ar?"قبل الحجز وبعده":"Before and after booking"} intro={ar?"لا توجد سياسة واحدة لكل الفنادق؛ الأهم هو شرط السعر الذي يظهر لك قبل الدفع. هذه الصفحة تشرح كيف تتعامل HandMeKey مع الإلغاء والاسترجاع والدعم.":"There is no single cancellation rule for every hotel; the rate terms shown before payment matter most. This page explains how HandMeKey handles cancellations, refunds and support."} updated={ar?"آخر تحديث: 10 سبتمبر 2026":"Last updated: 10 September 2026"} sections={sections}/>;
}
