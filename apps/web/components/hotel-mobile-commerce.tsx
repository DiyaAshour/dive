"use client";

import { BedDouble, ChevronDown, Info, MessageSquareText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Locale = "en" | "ar" | "zh";

type RoomTarget = Readonly<{
  key: string;
  card: HTMLElement;
  controlHost: HTMLElement;
  summaryHost: HTMLElement;
  rateCount: number;
  price: string;
}>;

export function HotelMobileCommerceEnhancer() {
  const [locale, setLocale] = useState<Locale>("en");
  const [navHost, setNavHost] = useState<HTMLElement | null>(null);
  const [rooms, setRooms] = useState<RoomTarget[]>([]);

  useEffect(() => {
    if (!window.location.pathname.startsWith("/hotel/")) return;
    const page = document.querySelector<HTMLElement>(".hotelExperience");
    if (!page) return;

    const language = (page.getAttribute("lang") || document.documentElement.lang || "en").toLowerCase();
    setLocale(language.startsWith("ar") ? "ar" : language.startsWith("zh") ? "zh" : "en");

    const hotelHead = page.querySelector<HTMLElement>(".premiumHotelHead");
    const trustBar = page.querySelector<HTMLElement>(".hotelTrustBar");
    const detailLayer = page.querySelector<HTMLElement>(".hotelTrustLayer");
    const reviews = page.querySelector<HTMLElement>(".reviewsSection");
    if (hotelHead) hotelHead.id = "hotel-mobile-overview";
    if (detailLayer) detailLayer.id = "hotel-mobile-details";
    if (reviews) reviews.id = "hotel-mobile-reviews";

    let quickNavHost: HTMLElement | null = null;
    if (trustBar) {
      quickNavHost = document.createElement("div");
      quickNavHost.className = "hotelMobileQuickNavHost";
      trustBar.after(quickNavHost);
      setNavHost(quickNavHost);
    }

    const preparedRooms = Array.from(page.querySelectorAll<HTMLElement>(".roomOfferCard")).flatMap((card, index) => {
      const rateOptions = card.querySelector<HTMLElement>(".publicRateOptions");
      const roomContent = card.querySelector<HTMLElement>(".publicRoomContent");
      if (!rateOptions || !roomContent) return [];
      const rows = Array.from(rateOptions.querySelectorAll<HTMLElement>(".publicRateRow"));
      if (!rows.length) return [];

      rows.slice(1).forEach((row) => row.classList.add("mobileSecondaryRate"));
      card.dataset.mobileRatesExpanded = "false";

      const summaryHost = document.createElement("div");
      summaryHost.className = "mobileRoomCommerceHost";
      roomContent.append(summaryHost);

      const controlHost = document.createElement("div");
      controlHost.className = "mobileRoomRateControlHost";
      rateOptions.append(controlHost);

      const price = rows[0]?.querySelector<HTMLElement>(".ratePrice strong")?.textContent?.trim() ?? "";
      return [{key: card.dataset.roomTypeId || `room-${index}`, card, controlHost, summaryHost, rateCount: rows.length, price}];
    });
    setRooms(preparedRooms);

    return () => {
      quickNavHost?.remove();
      preparedRooms.forEach((room) => {
        room.controlHost.remove();
        room.summaryHost.remove();
        delete room.card.dataset.mobileRatesExpanded;
        room.card.querySelectorAll(".mobileSecondaryRate").forEach((row) => row.classList.remove("mobileSecondaryRate"));
      });
      if (hotelHead?.id === "hotel-mobile-overview") hotelHead.removeAttribute("id");
      if (detailLayer?.id === "hotel-mobile-details") detailLayer.removeAttribute("id");
      if (reviews?.id === "hotel-mobile-reviews") reviews.removeAttribute("id");
    };
  }, []);

  return <>
    {navHost && createPortal(<MobileHotelQuickNav locale={locale}/>, navHost)}
    {rooms.map((room) => <RoomCommerceControl key={room.key} room={room} locale={locale}/>)}
  </>;
}

function MobileHotelQuickNav({locale}:{locale:Locale}) {
  const copy = locale === "ar"
    ? {overview:"نظرة عامة", rooms:"الغرف", details:"التفاصيل", reviews:"التقييمات"}
    : locale === "zh"
      ? {overview:"概览", rooms:"房型", details:"详情", reviews:"评价"}
      : {overview:"Overview", rooms:"Rooms", details:"Details", reviews:"Reviews"};
  return <nav className="hotelMobileQuickNav" aria-label={copy.overview}>
    <a href="#hotel-mobile-overview"><Info size={15}/><span>{copy.overview}</span></a>
    <a className="primary" href="#room-offers"><BedDouble size={15}/><span>{copy.rooms}</span></a>
    <a href="#hotel-mobile-details"><Sparkles size={15}/><span>{copy.details}</span></a>
    <a href="#hotel-mobile-reviews"><MessageSquareText size={15}/><span>{copy.reviews}</span></a>
  </nav>;
}

function RoomCommerceControl({room, locale}:{room:RoomTarget;locale:Locale}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    room.card.dataset.mobileRatesExpanded = expanded ? "true" : "false";
  }, [expanded, room.card]);

  const copy = locale === "ar"
    ? {from:"يبدأ من", plans:(count:number)=>`${count} خيارات سعر`, show:(count:number)=>`عرض جميع خيارات الأسعار (${count})`, less:"عرض خيارات أقل"}
    : locale === "zh"
      ? {from:"起价", plans:(count:number)=>`${count} 个价格方案`, show:(count:number)=>`查看全部 ${count} 个价格方案`, less:"收起价格方案"}
      : {from:"From", plans:(count:number)=>`${count} rate options`, show:(count:number)=>`Show all ${count} rate options`, less:"Show fewer options"};

  return <>
    {createPortal(<div className="mobileRoomCommerceSummary">
      <span><small>{copy.from}</small>{room.price && <strong>{room.price}</strong>}</span>
      <b>{copy.plans(room.rateCount)}</b>
    </div>, room.summaryHost)}
    {room.rateCount > 1 && createPortal(<button className={`mobileRoomRateToggle ${expanded ? "isOpen" : ""}`} type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      <span>{expanded ? copy.less : copy.show(room.rateCount)}</span><ChevronDown size={18}/>
    </button>, room.controlHost)}
  </>;
}
