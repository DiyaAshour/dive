"use client";

import { BedDouble, ChevronDown, Info, MessageSquareText, Sparkles } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { GuestLocale } from "@/lib/guest-market";

type Locale = GuestLocale;
type QuickNavTab = "overview" | "rooms" | "reviews" | "details";

type RoomTarget = Readonly<{
  key: string;
  card: HTMLElement;
  controlHost: HTMLElement;
  summaryHost: HTMLElement;
  rateCount: number;
  price: string;
}>;

const QUICK_NAV_COPY: Readonly<Record<Locale, Readonly<Record<QuickNavTab, string>>>> = {
  en: {overview:"Overview", rooms:"Rooms", reviews:"Reviews", details:"Details"},
  ar: {overview:"نظرة عامة", rooms:"الغرف", reviews:"التقييمات", details:"التفاصيل"},
  zh: {overview:"概览", rooms:"房型", reviews:"评价", details:"详情"},
  fr: {overview:"Vue d’ensemble", rooms:"Chambres", reviews:"Avis", details:"Détails"},
  de: {overview:"Übersicht", rooms:"Zimmer", reviews:"Bewertungen", details:"Details"},
  es: {overview:"Resumen", rooms:"Habitaciones", reviews:"Reseñas", details:"Detalles"},
  it: {overview:"Panoramica", rooms:"Camere", reviews:"Recensioni", details:"Dettagli"},
  tr: {overview:"Genel bakış", rooms:"Odalar", reviews:"Değerlendirmeler", details:"Detaylar"},
  ru: {overview:"Обзор", rooms:"Номера", reviews:"Отзывы", details:"Подробности"},
  ja: {overview:"概要", rooms:"客室", reviews:"口コミ", details:"詳細"},
  ko: {overview:"개요", rooms:"객실", reviews:"후기", details:"상세 정보"},
  hi: {overview:"अवलोकन", rooms:"कमरे", reviews:"समीक्षाएँ", details:"विवरण"},
  pt: {overview:"Visão geral", rooms:"Quartos", reviews:"Avaliações", details:"Detalhes"},
  id: {overview:"Ringkasan", rooms:"Kamar", reviews:"Ulasan", details:"Detail"},
  th: {overview:"ภาพรวม", rooms:"ห้องพัก", reviews:"รีวิว", details:"รายละเอียด"},
};

const QUICK_NAV_HASHES: Readonly<Record<string, QuickNavTab>> = {
  "#hotel-mobile-overview":"overview",
  "#room-offers":"rooms",
  "#hotel-mobile-reviews":"reviews",
  "#hotel-mobile-details":"details",
};

export function HotelMobileCommerceEnhancer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [locale, setLocale] = useState<Locale>("en");
  const [navHost, setNavHost] = useState<HTMLElement | null>(null);
  const [rooms, setRooms] = useState<RoomTarget[]>([]);

  useEffect(() => {
    setNavHost(null);
    setRooms([]);
    if (!pathname.startsWith("/hotel/")) return;
    const page = document.querySelector<HTMLElement>(".hotelExperience");
    if (!page) return;

    const language = page.getAttribute("lang") || document.documentElement.lang || "en";
    setLocale(quickNavLocale(language));

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
      return [{key: `room-${index}`, card, controlHost, summaryHost, rateCount: rows.length, price}];
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
  }, [pathname, searchKey]);

  return <>
    {navHost && createPortal(<MobileHotelQuickNav locale={locale}/>, navHost)}
    {rooms.map((room) => <RoomCommerceControl key={room.key} room={room} locale={locale}/>)}
  </>;
}

function MobileHotelQuickNav({locale}:{locale:Locale}) {
  const copy = QUICK_NAV_COPY[locale];
  const [activeTab, setActiveTab] = useState<QuickNavTab>("overview");

  useEffect(() => {
    const syncFromHash = () => {
      const tab = QUICK_NAV_HASHES[window.location.hash];
      if (tab) setActiveTab(tab);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const current = (tab:QuickNavTab) => activeTab === tab ? "location" as const : undefined;
  return <nav className="hotelMobileQuickNav" aria-label={copy.overview}>
    <a className={activeTab === "overview" ? "primary" : undefined} aria-current={current("overview")} href="#hotel-mobile-overview" onClick={() => setActiveTab("overview")}><Info size={15}/><span>{copy.overview}</span></a>
    <a className={activeTab === "rooms" ? "primary" : undefined} aria-current={current("rooms")} href="#room-offers" onClick={() => setActiveTab("rooms")}><BedDouble size={15}/><span>{copy.rooms}</span></a>
    <a className={activeTab === "reviews" ? "primary" : undefined} aria-current={current("reviews")} href="#hotel-mobile-reviews" onClick={() => setActiveTab("reviews")}><MessageSquareText size={15}/><span>{copy.reviews}</span></a>
    <a className={activeTab === "details" ? "primary" : undefined} aria-current={current("details")} href="#hotel-mobile-details" onClick={() => setActiveTab("details")}><Sparkles size={15}/><span>{copy.details}</span></a>
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

function quickNavLocale(language:string):Locale {
  const locale = language.trim().toLowerCase().split(/[-_]/)[0] as Locale;
  return locale in QUICK_NAV_COPY ? locale : "en";
}
