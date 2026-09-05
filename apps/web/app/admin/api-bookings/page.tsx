import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {CalendarRange, CircleDollarSign, Globe2, ShieldCheck} from "lucide-react";
import {getAdminNavigationCounts, listApiBookings} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {HotelbedsCancellationButton, HotelbedsContentSyncButton} from "./hotelbeds-tools";

export const metadata: Metadata = {title: "API Bookings"};
export const dynamic = "force-dynamic";

export default async function ApiBookingsPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin%2Fapi-bookings");
  const [locale,bookings,counts] = await Promise.all([requestLocale(),listApiBookings(principal.user.id),getAdminNavigationCounts(principal.user.id)]);
  const ar = locale === "ar";
  const confirmed = bookings.filter((booking) => booking.status === "CONFIRMED").length;
  const failed = bookings.filter((booking) => booking.status === "FAILED").length;
  const total = bookings.reduce((sum,booking) => sum + booking.amounts.total,0);
  const currencies = [...new Set(bookings.map((booking) => booking.currency))];
  const grossDisplay = currencies.length === 1 ? `${total.toFixed(2)} ${currencies[0]}` : "—";
  return <AdminShell locale={locale} principal={principal} active="api-bookings" counts={counts}>
    <header className="adminTopbar"><div><span className="eyebrow">HandMeKey · Hotelbeds API</span><h1>{ar ? "حجوزات API" : "API booking control"}</h1><p>{ar ? "سجل منفصل للحجوزات القادمة من Hotelbeds، مع مرجع المزود والتكلفة والهامش وحالة الدفع." : "A separate operational ledger for Hotelbeds reservations, provider references, source cost, margin and payment state."}</p></div><div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{ar ? "جلسة إدارية آمنة" : "Secure admin session"}</strong><small>{bookings.length} {ar ? "حجز مسجل" : "API bookings recorded"}</small></span></div></header>
    <section className="adminSection"><div className="adminKpiGrid"><article><span><Globe2 size={16}/>{ar ? "كل حجوزات API" : "All API bookings"}</span><strong>{bookings.length}</strong><small>{ar ? "Hotelbeds" : "Hotelbeds source"}</small></article><article><span><ShieldCheck size={16}/>{ar ? "مؤكدة" : "Confirmed"}</span><strong>{confirmed}</strong><small>{ar ? "مرجع مزود محفوظ" : "Provider reference stored"}</small></article><article><span><CalendarRange size={16}/>{ar ? "فاشلة" : "Failed"}</span><strong>{failed}</strong><small>{ar ? "تحتاج متابعة" : "Needs attention"}</small></article><article><span><CircleDollarSign size={16}/>{ar ? "الإجمالي" : "Gross total"}</span><strong>{grossDisplay}</strong><small>{currencies.length > 1 ? `${currencies.length} ${ar ? "عملات مصدر" : "source currencies"}` : (ar ? "عملة مصدر الحجز" : "Provider currency")}</small></article></div></section>
    <section className="adminSection adminPanel"><div className="adminSectionTitle"><div><span className="eyebrow">Hotelbeds Content API</span><h2>{ar ? "كتالوج الفنادق المحلي" : "Local hotel catalogue"}</h2><p>{ar ? "تسحب بيانات الفنادق الثابتة وتخزنها داخل HandMeKey. استخدم هذا الزر بعد تجدد quota للاختبار الأول، وبعدها التحديث اليومي يعمل تلقائيًا." : "Pull static hotel content into HandMeKey. Use this after the Evaluation quota resets for the initial bootstrap; daily refresh then runs automatically."}</p></div></div><HotelbedsContentSyncButton locale={locale}/></section>
    <section className="adminSection adminPanel"><div className="adminSectionTitle"><div><span className="eyebrow">{ar ? "سجل المزود" : "Provider ledger"}</span><h2>{ar ? "كل حجوزات Hotelbeds" : "All Hotelbeds bookings"}</h2><p>{ar ? "حجوزات API تبقى منفصلة عن حجوزات فنادق الشركاء، مع إمكانية مراجعة المرجع والحالة ومحاكاة الإلغاء قبل تنفيذه." : "API reservations stay separate from partner-property bookings, with provider reference, lifecycle status and cancellation simulation before commitment."}</p></div></div><div className="adminPropertyTable" role="table" aria-label={ar ? "حجوزات API" : "API bookings"}><div className="adminPropertyRow adminPropertyHead" role="row"><span>{ar ? "المرجع" : "Reference"}</span><span>{ar ? "الفندق" : "Hotel"}</span><span>{ar ? "الضيف" : "Guest"}</span><span>{ar ? "الإقامة" : "Stay"}</span><span>{ar ? "المبلغ" : "Amount"}</span><span>{ar ? "الحالة" : "Status"}</span></div>{bookings.length ? bookings.map((booking) => <div className="adminPropertyRow" role="row" key={booking.id}><div><strong>{booking.reference}</strong><small>Hotelbeds {booking.providerBooking.reference ?? booking.clientReference}</small>{booking.status === "CONFIRMED" && booking.providerBooking.reference && <HotelbedsCancellationButton id={booking.id} locale={locale}/>}</div><div><strong>{booking.hotel.name}</strong><small>{booking.hotel.city}</small></div><div><strong>{booking.guest.name}</strong><small>{booking.guest.email}</small></div><span>{booking.arrival} → {booking.departure}</span><span><strong>{booking.amounts.total.toFixed(2)} {booking.currency}</strong><small>{ar ? "هامش" : "Margin"}: {booking.amounts.markup.toFixed(2)}</small></span><span className={booking.status === "CONFIRMED" ? "statusOk" : "statusReview"}>{booking.status}<small>{paymentStateLabel(booking.paymentState, ar)}</small></span></div>) : <div className="adminPropertyRow"><span>{ar ? "لا توجد حجوزات API بعد." : "No API bookings yet."}</span></div>}</div></section>
  </AdminShell>;
}

function paymentStateLabel(state: string, ar: boolean): string {
  if (state === "CAPTURED") return ar ? "مدفوع إلكترونيًا" : "Paid online";
  if (state === "FAILED") return ar ? "فشل الدفع" : "Payment failed";
  if (state === "PENDING") return ar ? "بانتظار الدفع" : "Payment pending";
  return ar ? "لا يحتاج دفعًا إلكترونيًا" : "No online payment";
}
