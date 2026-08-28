import Link from "next/link";
import { redirect } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { listUserInvoices } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { currentUser } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";

export const dynamic="force-dynamic";

export default async function InvoicesPage(){const [user,locale]=await Promise.all([currentUser(),requestLocale()]);if(!user)redirect("/login?next=/account/invoices");const invoices=await listUserInvoices(user.id);return <AccountShell active="invoices" eyebrow={locale==="ar"?"السجلات المالية":"Financial records"} title={locale==="ar"?"الفواتير والمستندات":"Invoices & documents"} description={locale==="ar"?"كل فاتورة مبنية من سجل الحجز المحفوظ، مع رابط قابل للطباعة والحفظ PDF.":"Booking documents are generated from persisted reservation records and can be printed or saved as PDF."}><div className="accountCard invoiceAccountCard">{invoices.length===0?<div className="opsEmpty"><ReceiptText size={28}/><strong>{locale==="ar"?"لا توجد فواتير بعد":"No invoices yet"}</strong><p>{locale==="ar"?"تظهر فاتورة الحجز بعد تأكيد الحجز.":"A booking invoice appears after confirmation."}</p></div>:<div className="invoiceList">{invoices.map((invoice)=><article key={invoice.id}><div><span>{invoice.documentType==="CANCELLATION_NOTE"?(locale==="ar"?"إشعار إلغاء":"Cancellation note"):(locale==="ar"?"فاتورة حجز":"Booking invoice")}</span><strong>{invoice.hotelName}</strong><small>{invoice.invoiceNumber} · {invoice.issuedAt.toLocaleDateString(locale==="ar"?"ar-JO":"en-GB")}</small></div><div><b>{invoice.totalAmount.toFixed(2)} {invoice.currency}</b><Link href={`/invoice/${invoice.id}?token=${encodeURIComponent(invoice.accessToken)}`}>{locale==="ar"?"فتح الفاتورة":"Open invoice"}</Link></div></article>)}</div>}</div></AccountShell>}
