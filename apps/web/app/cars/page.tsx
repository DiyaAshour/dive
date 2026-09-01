import Link from "next/link";
import { ArrowRight, Car, CreditCard, MapPin, ShieldCheck } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { requestGuestMarket } from "@/lib/request-guest-market";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "HandMeKey Cars",
  robots: {index: false, follow: false},
};

type Params = Promise<{
  pickup?: string;
  dropoff?: string;
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string;
  returnTime?: string;
  driverAge?: string;
}>;

export default async function CarsPage({searchParams}: {searchParams: Params}) {
  const [market, query] = await Promise.all([requestGuestMarket(), searchParams]);
  const ar = market.locale === "ar";
  const pickup = query.pickup?.trim() || (ar ? "مكان الاستلام" : "Pick-up location");
  const dropoff = query.dropoff === "same" || !query.dropoff ? (ar ? "نفس مكان الاستلام" : "Same as pick-up") : query.dropoff;
  const copy = ar ? {
    eyebrow: "HandMeKey Cars",
    title: "بحث السيارات جاهز. المخزون الحي هو الخطوة التالية.",
    body: "لن نعرض سيارات أو أسعارًا وهمية. عندما يتم ربط أول شركة تأجير، ستظهر هنا السيارات المتاحة فعليًا مع السعر النهائي والتأمين والوديعة وشروط الوقود.",
    pickup: "الاستلام",
    dropoff: "التسليم",
    dates: "الفترة",
    driver: "عمر السائق",
    noHidden: "بدون رسوم مخفية",
    insurance: "تفاصيل التأمين قبل الحجز",
    deposit: "الوديعة وشروط الدفع بوضوح",
    back: "العودة وتعديل البحث",
    partner: "هل تدير شركة تأجير سيارات؟",
    partnerBody: "Partner Hub للسيارات سيعطي الشركات إدارة الأسطول والأسعار والتوفر والحجوزات من مكان واحد.",
    partnerCta: "ابدأ كشريك",
  } : {
    eyebrow: "HandMeKey Cars",
    title: "Car search is ready. Live inventory is the next step.",
    body: "We will not show fake cars or prices. Once the first rental company is connected, real available cars will appear here with final pricing, insurance, deposit and fuel terms.",
    pickup: "Pick-up",
    dropoff: "Drop-off",
    dates: "Dates",
    driver: "Driver age",
    noHidden: "No hidden fees",
    insurance: "Insurance details before booking",
    deposit: "Clear deposit and payment terms",
    back: "Back and edit search",
    partner: "Run a car rental company?",
    partnerBody: "The Cars Partner Hub will manage fleet, rates, availability and reservations from one place.",
    partnerCta: "Become a partner",
  };
  const dateLine = [query.pickupDate, query.pickupTime, query.returnDate, query.returnTime].filter(Boolean).join(" · ") || "—";

  return <main className="searchExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <section className="shell" style={{padding:"48px 0 80px"}}>
      <span className="eyebrow">{copy.eyebrow}</span>
      <h1 style={{fontSize:"clamp(34px,5vw,54px)",letterSpacing:"-.045em",maxWidth:820,margin:"10px 0 14px"}}>{copy.title}</h1>
      <p className="muted" style={{maxWidth:760,fontSize:16,lineHeight:1.75,margin:"0 0 28px"}}>{copy.body}</p>

      <div className="panel" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12,marginBottom:22}}>
        <div><small className="muted">{copy.pickup}</small><strong style={{display:"flex",gap:7,alignItems:"center",marginTop:5}}><MapPin size={16}/>{pickup}</strong></div>
        <div><small className="muted">{copy.dropoff}</small><strong style={{display:"flex",gap:7,alignItems:"center",marginTop:5}}><MapPin size={16}/>{dropoff}</strong></div>
        <div><small className="muted">{copy.dates}</small><strong style={{display:"block",marginTop:5}}>{dateLine}</strong></div>
        <div><small className="muted">{copy.driver}</small><strong style={{display:"block",marginTop:5}}>{query.driverAge || "30-65"}</strong></div>
      </div>

      <div className="grid3" style={{marginBottom:28}}>
        <div className="panel"><CreditCard size={22}/><h3>{copy.noHidden}</h3></div>
        <div className="panel"><ShieldCheck size={22}/><h3>{copy.insurance}</h3></div>
        <div className="panel"><Car size={22}/><h3>{copy.deposit}</h3></div>
      </div>

      <Link className="primaryButton" href="/?service=cars">{copy.back}<ArrowRight size={17}/></Link>

      <div className="partnerBridge" style={{marginInline:0,marginBottom:0}}><div><span className="eyebrow">HandMeKey Partner</span><h2>{copy.partner}</h2><p>{copy.partnerBody}</p></div><Link href="/partner">{copy.partnerCta}<ArrowRight size={18}/></Link></div>
    </section>
  </main>;
}
