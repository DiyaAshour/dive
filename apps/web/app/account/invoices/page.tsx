import Link from "next/link";
import { redirect } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { listUserInvoices } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { invoicesUiCopy } from "@/lib/invoices-ui-copy";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic="force-dynamic";

export default async function InvoicesPage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/account/invoices");
  const invoices=await listUserInvoices(user.id);
  const copy=invoicesUiCopy(market.locale);
  return <AccountShell active="invoices" eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
    <div className="accountCard invoiceAccountCard">
      {invoices.length===0?<div className="opsEmpty"><ReceiptText size={28}/><strong>{copy.emptyTitle}</strong><p>{copy.emptyBody}</p></div>:<div className="invoiceList">{invoices.map((invoice)=><article key={invoice.id}><div><span>{invoice.documentType==="CANCELLATION_NOTE"?copy.cancellationNote:copy.bookingInvoice}</span><strong>{invoice.hotelName}</strong><small>{invoice.invoiceNumber} · {invoice.issuedAt.toLocaleDateString(market.intlLocale)}</small></div><div><b>{invoice.totalAmount.toLocaleString(market.intlLocale,{minimumFractionDigits:2,maximumFractionDigits:2})} {invoice.currency}</b><Link href={`/invoice/${invoice.id}?token=${encodeURIComponent(invoice.accessToken)}`}>{copy.openInvoice}</Link></div></article>)}</div>}
    </div>
  </AccountShell>;
}
