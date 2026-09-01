import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, BellRing, CarFront, CalendarRange, MessagesSquare, ShieldCheck } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { guestDictionary } from "@/lib/guest-i18n";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";
import AuthForm from "./auth-form";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{next?:string}>;

export default async function LoginPage({searchParams}:{searchParams:SearchParams}) {
  const [user,market,params] = await Promise.all([currentUser(),requestGuestMarket(),searchParams]);
  const nextPath=safeLocalPath(params.next);
  if (user) redirect(nextPath||"/trips");
  const copy = guestDictionary(market.locale);
  const cars=nextPath.startsWith("/cars/");
  const ar=market.baseLocale==="ar";
  const carsCopy=ar?{
    eyebrow:"HANDMEKEY CARS",title:"سجّل دخولك وأكمل حجز سيارتك.",intro:"لن تفقد السيارة أو التواريخ التي اخترتها. بعد تسجيل الدخول نرجعك مباشرة إلى الحجز.",verified:"حجز محفوظ في حسابك",verifiedSub:"رقم حجز واضح وتفاصيل الاستلام والتسليم في مكان واحد.",alerts:"العودة لنفس السيارة",alertsSub:"نحتفظ بمسار الحجز والتواريخ أثناء تسجيل الدخول.",messages:"حجز سيارات مستقل",messagesSub:"حجوزات السيارات تبقى منفصلة عن حجوزات الفنادق.",partner:"تدير شركة تأجير سيارات؟",partnerCta:"اذهب إلى Cars Partner Hub"
  }:{
    eyebrow:"HANDMEKEY CARS",title:"Sign in and continue your car booking.",intro:"You won’t lose the car or rental dates you selected. After sign-in, we return you directly to checkout.",verified:"Booking saved to your account",verifiedSub:"A clear booking reference with pick-up and return details in one place.",alerts:"Return to the same car",alertsSub:"Your car and rental dates stay attached while you sign in.",messages:"Dedicated car bookings",messagesSub:"Car reservations stay separate from hotel stays.",partner:"Managing a rental company?",partnerCta:"Go to Cars Partner Hub"
  };

  return <main className="authPage customerAuthPage" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader minimal/>
    <section className="shell authShell premiumAuthShell">
      <div className="authIntro">
        <span className="eyebrow">{cars?carsCopy.eyebrow:copy.login.eyebrow}</span>
        <h1>{cars?carsCopy.title:copy.login.title}</h1>
        <p>{cars?carsCopy.intro:copy.login.intro}</p>
        <div className="authBenefits">
          {cars?<>
            <div><ShieldCheck size={20}/><span><strong>{carsCopy.verified}</strong><small>{carsCopy.verifiedSub}</small></span></div>
            <div><CarFront size={20}/><span><strong>{carsCopy.alerts}</strong><small>{carsCopy.alertsSub}</small></span></div>
            <div><CalendarRange size={20}/><span><strong>{carsCopy.messages}</strong><small>{carsCopy.messagesSub}</small></span></div>
          </>:<>
            <div><BadgeCheck size={20}/><span><strong>{copy.login.verified}</strong><small>{copy.login.verifiedSub}</small></span></div>
            <div><BellRing size={20}/><span><strong>{copy.login.alerts}</strong><small>{copy.login.alertsSub}</small></span></div>
            <div><MessagesSquare size={20}/><span><strong>{copy.login.messages}</strong><small>{copy.login.messagesSub}</small></span></div>
          </>}
        </div>
        <p className="partnerAuthPrompt">{cars?carsCopy.partner:copy.login.partner} <Link href={cars?"/cars/partner":"/partner/login"}>{cars?carsCopy.partnerCta:copy.login.partnerCta} →</Link></p>
      </div>
      <AuthForm portal="guest" locale={market.locale} nextPath={nextPath||undefined} context={cars?"cars":"default"}/>
    </section>
  </main>;
}

function safeLocalPath(value?:string){
  if(!value||!value.startsWith("/")||value.startsWith("//"))return "";
  return value;
}
