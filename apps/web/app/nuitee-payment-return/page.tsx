import Link from "next/link";
import {CustomerHeader} from "@/components/customer-header";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {FinalizeNuiteeBooking} from "./finalize";

type SearchParams=Record<string,string|string[]|undefined>;
export const metadata={robots:{index:false,follow:false}};

export default async function NuiteePaymentReturnPage({searchParams}:{searchParams:Promise<SearchParams>}){
  const [query,market]=await Promise.all([searchParams,requestGuestMarket()]);
  const tid=first(query.tid)?.trim()??"";
  const ar=market.locale==="ar";
  return <main className="checkoutExperience" lang={market.intlLocale} dir={market.direction}><CustomerHeader minimal/><section className="checkoutBanner"><div className="shell"><div><span className="eyebrow">Nuitee Connect</span><h1>{ar?"تأكيد الحجز":"Finalizing your booking"}</h1><p>{ar?"تمت العودة من بوابة الدفع. الآن يتم إرسال الحجز النهائي إلى Nuitee والفندق.":"Payment returned successfully. HandMeKey is now sending the final reservation to Nuitee and the hotel."}</p></div></div></section><section className="shell checkoutSection">{tid?<FinalizeNuiteeBooking transactionId={tid} locale={market.locale}/>:<div className="premiumEmpty"><h3>{ar?"جلسة الدفع غير مكتملة":"Payment session is incomplete"}</h3><p>{ar?"لم يتم العثور على رقم معاملة الدفع. ارجع إلى البحث وابدأ من جديد.":"The payment transaction reference is missing. Return to search and start again."}</p><Link className="resultCta" href="/search">{ar?"العودة إلى البحث":"Return to search"}</Link></div>}</section></main>;
}
function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
