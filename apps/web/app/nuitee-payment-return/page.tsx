import Link from "next/link";
import {CustomerHeader} from "@/components/customer-header";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {FinalizeNuiteeBooking} from "./finalize";

type SearchParams=Record<string,string|string[]|undefined>;
export const metadata={robots:{index:false,follow:false}};

export default async function NuiteePaymentReturnPage({searchParams}:{searchParams:Promise<SearchParams>}){
  const [query,market]=await Promise.all([searchParams,requestGuestMarket()]);
  const token=first(query.token)?.trim()??"";
  const legacyTransactionId=first(query.tid)?.trim()??"";
  const ar=market.locale==="ar";
  return <main className="checkoutExperience" lang={market.intlLocale} dir={market.direction}><CustomerHeader minimal/><section className="checkoutBanner"><div className="shell"><div><span className="eyebrow">Nuitee Connect</span><h1>{ar?"تأكيد الحجز":"Finalizing your booking"}</h1><p>{ar?"تمت العودة من بوابة الدفع. HandMeKey يسترجع جلسة الحجز المحفوظة على الخادم ثم يطابق التأكيد مع Nuitee.":"Payment returned successfully. HandMeKey is recovering the server-side checkout session and reconciling the final confirmation with Nuitee."}</p></div></div></section><section className="shell checkoutSection">{token?<FinalizeNuiteeBooking token={token} locale={market.locale}/>:<div className="premiumEmpty"><h3>{ar?"جلسة الدفع تحتاج تحقق":"Payment session needs verification"}</h3><p>{legacyTransactionId?(ar?"هذه جلسة دفع قديمة بدأت قبل ترقية نظام الاسترجاع. لا تدفع مرة ثانية؛ تحقق من معاملة Nuitee قبل إعادة المحاولة.":"This payment began before the new server-side recovery flow was enabled. Do not pay again; verify the Nuitee transaction before retrying."):(ar?"رمز استرجاع الدفع غير موجود. لا تبدأ دفعة جديدة إذا كان قد تم خصم مبلغ.":"The payment recovery token is missing. Do not start a new payment if a charge may already have occurred.")}</p><Link className="resultCta" href="/search">{ar?"العودة إلى البحث":"Return to search"}</Link></div>}</section></main>;
}
function first(value:string|string[]|undefined){return Array.isArray(value)?value[0]:value;}
