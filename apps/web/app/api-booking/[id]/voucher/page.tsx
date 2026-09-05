import Link from "next/link";
import {BadgeCheck} from "lucide-react";
import {getApiBookingVoucher} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {VoucherActions} from "./voucher-actions";

export default async function HotelbedsVoucherPage({params}: {params: Promise<{id: string}>}) {
  const [{id},market] = await Promise.all([params,requestGuestMarket()]);
  const voucher = await getApiBookingVoucher(id);
  const ar = market.locale === "ar";
  if (!voucher) return <main className="checkoutExperience" lang={market.intlLocale} dir={market.direction}><CustomerHeader minimal/><section className="shell checkoutSection"><div className="premiumEmpty"><h3>{ar ? "القسيمة غير موجودة" : "Voucher not found"}</h3><Link className="resultCta" href="/search">{ar ? "العودة إلى البحث" : "Return to search"}</Link></div></section></main>;
  const supplierVat = voucher.supplier.vatNumber ?? (ar ? "غير متوفر في رد المزود" : "Not returned by provider");
  return <main className="checkoutExperience voucherPage" lang={market.intlLocale} dir={market.direction}>
    <div className="voucherNoPrint"><CustomerHeader minimal/></div>
    <section className="shell checkoutSection">
      <div className="panel voucherSheet">
        <div className="voucherHead"><div><span className="eyebrow">HandMeKey · Hotelbeds API</span><h1>{ar ? "قسيمة الحجز" : "Booking voucher"}</h1><p><BadgeCheck size={15}/> {voucher.status}</p></div><div className="voucherNoPrint"><VoucherActions label={ar ? "طباعة / حفظ PDF" : "Print / Save PDF"}/></div></div>
        <div className="voucherGrid">
          <section><h3>{ar ? "الفندق" : "Hotel"}</h3><p><strong>{voucher.hotel.name}</strong></p><p>{voucher.hotel.address ?? (ar ? "العنوان غير متوفر" : "Address unavailable")}</p><p>{voucher.hotel.city} · Hotelbeds #{voucher.hotel.code}</p></section>
          <section><h3>{ar ? "المراجع" : "References"}</h3><p>{ar ? "مرجع Hotelbeds" : "Hotelbeds reference"}: <strong>{voucher.hotelbedsReference ?? "—"}</strong></p><p>{ar ? "مرجع الوكالة" : "Agency reference"}: <strong>{voucher.clientReference}</strong></p><p>{ar ? "مرجع HandMeKey" : "HandMeKey reference"}: {voucher.handMeKeyReference}</p></section>
          <section><h3>{ar ? "الإقامة" : "Stay"}</h3><p>{ar ? "الوصول" : "Check-in"}: <strong>{voucher.arrival}</strong></p><p>{ar ? "المغادرة" : "Check-out"}: <strong>{voucher.departure}</strong></p><p>{ar ? "الغرفة" : "Room"}: <strong>{voucher.roomName ?? "—"}</strong></p><p>{ar ? "الوجبات / الباقة" : "Board"}: <strong>{voucher.boardName ?? "—"}</strong></p></section>
          <section><h3>{ar ? "المسافرون" : "Passengers"}</h3><p>{ar ? "صاحب الحجز" : "Holder"}: <strong>{voucher.guest.name}</strong></p><p>{voucher.guest.email}</p><p>{voucher.adults} {ar ? "بالغ" : voucher.adults === 1 ? "adult" : "adults"}{voucher.children ? ` · ${voucher.children} ${ar ? "طفل" : voucher.children === 1 ? "child" : "children"}` : ""}</p>{voucher.childrenAges.length>0&&<p>{ar ? "أعمار الأطفال" : "Children ages"}: {voucher.childrenAges.join(", ")}</p>}</section>
        </div>
        {voucher.rateComments&&<section className="voucherRemarks"><h3>{ar ? "ملاحظات السعر / العقد" : "Rate / contract remarks"}</h3><p>{voucher.rateComments}</p></section>}
        <section className="voucherPayment"><h3>{ar ? "معلومات المزود" : "Supplier information"}</h3><p>Payable through {voucher.supplier.name}, acting as agent for the service operating company, details of which can be provided upon request. VAT: {supplierVat} Reference: {voucher.hotelbedsReference ?? voucher.clientReference}</p></section>
        <div className="voucherNoPrint" style={{marginTop:24}}><Link className="resultCta" href={`/api-booking/${voucher.id}`}>{ar ? "العودة إلى تأكيد الحجز" : "Back to booking confirmation"}</Link></div>
      </div>
    </section>
    <style>{`@media print{.voucherNoPrint{display:none!important}.voucherPage{background:#fff!important}.voucherSheet{box-shadow:none!important;border:0!important;margin:0!important;max-width:none!important}.checkoutSection{padding:0!important}.voucherSheet{font-size:11pt}}.voucherHead{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.voucherGrid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:26px}.voucherGrid section,.voucherRemarks,.voucherPayment{border:1px solid var(--line);border-radius:12px;padding:16px}.voucherRemarks,.voucherPayment{margin-top:18px}.voucherRemarks p{white-space:pre-line}@media(max-width:700px){.voucherGrid{grid-template-columns:1fr}}`}</style>
  </main>;
}
