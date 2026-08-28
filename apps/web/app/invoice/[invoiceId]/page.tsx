import { notFound } from "next/navigation";
import { getInvoiceByToken } from "@platform/server";
import { requestLocale } from "@/lib/request-locale";
import { PrintInvoiceButton } from "./print-invoice-button";

export const dynamic="force-dynamic";

export default async function InvoicePage({params,searchParams}:{params:Promise<{invoiceId:string}>;searchParams:Promise<{token?:string}>}){
  const [{invoiceId},query,locale]=await Promise.all([params,searchParams,requestLocale()]);
  const invoice=await getInvoiceByToken(invoiceId,query.token).catch(()=>null);if(!invoice)notFound();
  const snapshot=invoice.snapshot as Record<string,unknown>;
  const cancelled=invoice.documentType==="CANCELLATION_NOTE";
  const legalName=process.env.LEGAL_ENTITY_NAME?.trim()||"HandMeKey";
  const legalAddress=process.env.LEGAL_ENTITY_ADDRESS?.trim()||"Jordan";
  const taxNumber=process.env.TAX_REGISTRATION_NUMBER?.trim()||null;
  return <main className="invoicePage" dir={locale==="ar"?"rtl":"ltr"}>
    <div className="invoiceToolbar"><a href="/account/invoices">{locale==="ar"?"الفواتير":"Invoices"}</a><PrintInvoiceButton label={locale==="ar"?"طباعة / حفظ PDF":"Print / save PDF"}/></div>
    <article className="invoiceSheet">
      <header className="invoiceHead"><div><strong className="invoiceBrand">HandMeKey</strong><span>{cancelled?(locale==="ar"?"إشعار إلغاء":"Cancellation note"):(locale==="ar"?"فاتورة حجز":"Booking invoice")}</span></div><div><b>{invoice.invoiceNumber}</b><small>{locale==="ar"?"تاريخ الإصدار":"Issued"}: {formatDate(invoice.issuedAt,locale)}</small></div></header>
      <section className="invoiceParties"><div><span>{locale==="ar"?"صادرة عن":"Issued by"}</span><strong>{legalName}</strong><p>{legalAddress}</p>{taxNumber&&<p>{locale==="ar"?"الرقم الضريبي":"Tax registration"}: {taxNumber}</p>}</div><div><span>{locale==="ar"?"الضيف":"Guest"}</span><strong>{invoice.guestName}</strong><p>{invoice.guestEmail}</p><p>{locale==="ar"?"مرجع الحجز":"Booking reference"}: {String(snapshot.bookingReference??"")}</p></div></section>
      <section className="invoiceStay"><div><span>{locale==="ar"?"الفندق":"Hotel"}</span><strong>{invoice.hotelName}</strong><small>{invoice.hotelAddress}</small></div><div><span>{locale==="ar"?"الإقامة":"Stay"}</span><strong>{String(snapshot.arrival??"")} → {String(snapshot.departure??"")}</strong><small>{String(snapshot.roomType??"")} · {String(snapshot.ratePlan??"")}</small></div></section>
      <table className="invoiceTable"><thead><tr><th>{locale==="ar"?"البند":"Item"}</th><th>{locale==="ar"?"القيمة":"Amount"}</th></tr></thead><tbody><MoneyRow label={locale==="ar"?"سعر الغرفة":"Room base"} value={invoice.baseAmount} currency={invoice.currency}/><MoneyRow label={locale==="ar"?"رسوم الخدمة":"Service charge"} value={invoice.serviceAmount} currency={invoice.currency}/><MoneyRow label={locale==="ar"?"الضريبة والرسوم الإلزامية":"Tax / mandatory charges"} value={invoice.taxAmount} currency={invoice.currency}/><tr className="invoiceTotal"><td>{locale==="ar"?"إجمالي الحجز":"Booking total"}</td><td>{money(invoice.totalAmount,invoice.currency)}</td></tr>{invoice.walletAmount>0&&<><MoneyRow label="HandMeKey Wallet" value={-invoice.walletAmount} currency={invoice.currency}/><tr className="invoiceDue"><td>{locale==="ar"?"المتبقي بوسيلة الدفع":"Remaining settlement"}</td><td>{money(invoice.amountDue,invoice.currency)}</td></tr></>}</tbody></table>
      {cancelled&&<section className="invoiceCancellation"><strong>{locale==="ar"?"تفاصيل الإلغاء":"Cancellation details"}</strong><p>{locale==="ar"?"رسوم الإلغاء":"Cancellation penalty"}: {money(Number(snapshot.cancellationPenalty??0),invoice.currency)}</p><p>{locale==="ar"?"المبلغ القابل للاسترداد":"Refundable amount"}: {money(Number(snapshot.refundableAmount??0),invoice.currency)}</p></section>}
      <footer className="invoiceFoot"><p>{locale==="ar"?"تعكس هذه الوثيقة بيانات الحجز المحفوظة في HandMeKey وقت الإصدار. المعالجة الضريبية النهائية تعتمد على نموذج التاجر والفندق والقوانين السارية.":"This document reflects the booking record stored by HandMeKey at issue time. Final tax treatment depends on the merchant model, property and applicable law."}</p><span>{locale==="ar"?"حالة الدفع":"Payment state"}: {invoice.paymentState} · {invoice.paymentMode}</span></footer>
    </article>
  </main>;
}
function MoneyRow({label,value,currency}:{label:string;value:number;currency:string}){return <tr><td>{label}</td><td>{money(value,currency)}</td></tr>}
function money(value:number,currency:string){return `${Number(value).toFixed(2)} ${currency}`}
function formatDate(value:Date,locale:"en"|"ar"){return value.toLocaleDateString(locale==="ar"?"ar-JO":"en-GB",{year:"numeric",month:"short",day:"numeric"})}
