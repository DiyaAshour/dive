import type {Metadata} from "next";
import {LegalPageShell} from "@/components/legal-page-shell";
import {requestGuestMarket} from "@/lib/request-guest-market";

export const metadata:Metadata={title:"Privacy Policy",description:"HandMeKey privacy policy for travelers and partners."};

export default async function PrivacyPage(){
  const market=await requestGuestMarket();
  const ar=market.locale==="ar";
  const sections=ar?[
    {title:"البيانات التي نجمعها",bullets:["بيانات الحساب والتواصل مثل الاسم والبريد ورقم الهاتف عند تقديمها.","بيانات البحث والحجز مثل الفندق، التواريخ، عدد الضيوف وتفضيلات الرحلة.","بيانات الدفع التي يعالجها مزود دفع معتمد؛ لا نعرض أرقام البطاقات الكاملة داخل HandMeKey.","بيانات تقنية مثل عنوان IP ونوع الجهاز وسجلات الأمان والأداء والكوكيز الضرورية."]},
    {title:"كيف نستخدم البيانات",paragraphs:["نستخدم البيانات لتشغيل البحث والحجز وخدمة العملاء، منع الاحتيال، تحسين الأداء، إرسال رسائل الحجز المطلوبة، والامتثال للمتطلبات القانونية."],bullets:["تأكيد وإدارة الحجوزات والإلغاءات.","تقديم دعم قبل وأثناء وبعد الإقامة.","حماية الحسابات والمنصة من إساءة الاستخدام.","تحسين جودة البحث وتجربة الموقع."]},
    {title:"المشاركة مع الفنادق ومزودي الخدمة",paragraphs:["عندما يحتاج تنفيذ الحجز إلى فندق أو مزود مخزون أو مزود دفع أو خدمة تقنية، نشارك فقط البيانات اللازمة لتنفيذ الخدمة. قد يعمل بعض هؤلاء كمزودي خدمة مستقلين وفق سياساتهم القانونية الخاصة."]},
    {title:"المراجعات",paragraphs:["قد تعرض HandMeKey مراجعات جُمعت بواسطة شركاء توريد خارجيين. نوضح مصدر هذه المراجعات بصرياً ولا نقدّمها على أنها مراجعات كتبت داخل HandMeKey عندما لم تكن كذلك."]},
    {title:"الاحتفاظ والأمان",paragraphs:["نحتفظ بالبيانات للمدة اللازمة لتشغيل الحجز والدعم والوفاء بالالتزامات القانونية وحل النزاعات. نستخدم ضوابط وصول واتصالات مشفرة وإجراءات أمنية مناسبة لطبيعة البيانات."]},
    {title:"حقوقك",paragraphs:["يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها عندما يسمح القانون بذلك، والاعتراض على بعض الاستخدامات غير الضرورية. تواصل مع دعم HandMeKey من صفحة تواصل معنا."]},
    {title:"التغييرات",paragraphs:["قد نحدّث هذه السياسة عند تغير المنتج أو المتطلبات القانونية. سنحدّث تاريخ السريان ونبرز التغييرات الجوهرية عند الحاجة."]},
  ]:[
    {title:"Information we collect",bullets:["Account and contact data such as name, email and phone number when provided.","Search and booking data such as property, dates, guests and trip preferences.","Payment data processed by an approved payment provider; HandMeKey does not display full card numbers.","Technical data such as IP address, device type, security/performance logs and necessary cookies."]},
    {title:"How we use information",paragraphs:["We use information to operate search and booking, provide support, prevent abuse, improve performance, send required booking communications and meet legal obligations."],bullets:["Confirm and manage reservations and cancellations.","Provide support before, during and after a stay.","Protect accounts and the platform from abuse.","Improve search quality and site experience."]},
    {title:"Hotels and service providers",paragraphs:["When fulfillment requires a hotel, inventory partner, payment provider or technical service, we share only the information needed to deliver that service. Some providers may act independently under their own legal terms."]},
    {title:"Reviews",paragraphs:["HandMeKey may display reviews collected by external booking-supply partners. We identify the source of those reviews and do not present them as HandMeKey-authored reviews when they were collected elsewhere."]},
    {title:"Retention and security",paragraphs:["We retain information for as long as needed to operate bookings and support, meet legal duties and resolve disputes. We use access controls, encrypted transport and security measures appropriate to the data involved."]},
    {title:"Your rights",paragraphs:["You may request access, correction or deletion where applicable law permits, and object to certain non-essential uses. Contact HandMeKey Guest Support from the Contact page."]},
    {title:"Changes",paragraphs:["We may update this policy as the product or legal requirements change. We will update the effective date and highlight material changes when appropriate."]},
  ];
  return <LegalPageShell title={ar?"سياسة الخصوصية":"Privacy Policy"} kicker={ar?"الخصوصية والثقة":"Privacy & trust"} intro={ar?"توضح هذه السياسة كيف تتعامل HandMeKey مع بيانات المسافرين والشركاء أثناء البحث والحجز واستخدام المنصة.":"This policy explains how HandMeKey handles traveler and partner information while you search, book and use the platform."} updated={ar?"آخر تحديث: 10 سبتمبر 2026":"Last updated: 10 September 2026"} sections={sections}/>;
}
