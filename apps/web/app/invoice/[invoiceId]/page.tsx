import { notFound } from "next/navigation";
import { getInvoiceByToken } from "@platform/server";
import { invoiceDetailUiCopy } from "@/lib/invoice-detail-ui-copy";
import { invoicesUiCopy } from "@/lib/invoices-ui-copy";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { PrintInvoiceButton } from "./print-invoice-button";

export const dynamic="force-dynamic";

export default async function InvoicePage({params,searchParams}:{params:Promise<{invoiceId:string}>;searchParams:Promise<{token?:string}>}){
  const [{invoiceId},query,market]=await Promise.all([params,searchParams,requestGuestMarket()]);
  const invoice=await getInvoiceByToken(invoiceId,query.token).catch(()=>null);if(!invoice)notFound();
  const snapshot=invoice.snapshot as Record<string,unknown>;
  const cancelled=invoice.documentType==="CANCELLATION_NOTE";
  const legalName=process.env.LEGAL_ENTITY_NAME?.trim()||"HandMeKey";
  const legalAddress=process.env.LEGAL_ENTITY_ADDRESS?.trim()||"Jordan";
  const taxNumber=process.env.TAX_REGISTRATION_NUMBER?.trim()||null;
  const copy=invoiceDetailUiCopy(market.locale);
  const listCopy=invoicesUiCopy(market.locale);
  return <main className="invoicePage" lang={market.intlLocale} dir={market.direction}>
    <div className="invoiceToolbar"><a href="/account/invoices">{copy.invoices}</a><PrintInvoiceButton label={copy.printPdf}/></div>
    <article className="invoiceSheet">
      <header className="invoiceHead"><div><strong className="invoiceBrand">HandMeKey</strong><span>{cancelled?listCopy.cancellationNote:listCopy.bookingInvoice}</span></div><div><b>{invoice.invoiceNumber}</b><small>{copy.issued}: {formatDate(invoice.issuedAt,market.intlLocale)}</small></div></header>
      <section className="invoiceParties"><div><span>{copy.issuedBy}</span><strong>{legalName}</strong><p>{legalAddress}</p>{taxNumber&&<p>{copy.taxRegistration}: {taxNumber}</p>}</div><div><span>{copy.guest}</span><strong>{invoice.guestName}</strong><p>{invoice.guestEmail}</p><p>{copy.bookingReference}: {String(snapshot.bookingReference??"")}</p></div></section>
      <section className="invoiceStay"><div><span>{copy.hotel}</span><strong>{invoice.hotelName}</strong><small>{invoice.hotelAddress}</small></div><div><span>{copy.stay}</span><strong>{String(snapshot.arrival??"")} → {String(snapshot.departure??"")}</strong><small>{String(snapshot.roomType??"")} · {String(snapshot.ratePlan??"")}</small></div></section>
      <table className="invoiceTable"><thead><tr><th>{copy.item}</th><th>{copy.amount}</th></tr></thead><tbody><MoneyRow label={copy.roomBase} value={invoice.baseAmount} currency={invoice.currency} locale={market.intlLocale}/><MoneyRow label={copy.serviceCharge} value={invoice.serviceAmount} currency={invoice.currency} locale={market.intlLocale}/><MoneyRow label={copy.taxCharges} value={invoice.taxAmount} currency={invoice.currency} locale={market.intlLocale}/><tr className="invoiceTotal"><td>{copy.bookingTotal}</td><td>{money(invoice.totalAmount,invoice.currency,market.intlLocale)}</td></tr>{invoice.walletAmount>0&&<><MoneyRow label="HandMeKey Wallet" value={-invoice.walletAmount} currency={invoice.currency} locale={market.intlLocale}/><tr className="invoiceDue"><td>{copy.remainingSettlement}</td><td>{money(invoice.amountDue,invoice.currency,market.intlLocale)}</td></tr></>}</tbody></table>
      {cancelled&&<section className="invoiceCancellation"><strong>{copy.cancellationDetails}</strong><p>{copy.cancellationPenalty}: {money(Number(snapshot.cancellationPenalty??0),invoice.currency,market.intlLocale)}</p><p>{copy.refundableAmount}: {money(Number(snapshot.refundableAmount??0),invoice.currency,market.intlLocale)}</p></section>}
      <footer className="invoiceFoot"><p>{copy.footer}</p><span>{copy.paymentState}: {invoice.paymentState} · {invoice.paymentMode}</span></footer>
    </article>
  </main>;
}
function MoneyRow({label,value,currency,locale}:{label:string;value:number;currency:string;locale:string}){return <tr><td>{label}</td><td>{money(value,currency,locale)}</td></tr>}
function money(value:number,currency:string,locale:string){return new Intl.NumberFormat(locale,{style:"currency",currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value));}
function formatDate(value:Date,locale:string){return value.toLocaleDateString(locale,{year:"numeric",month:"short",day:"numeric"});}
