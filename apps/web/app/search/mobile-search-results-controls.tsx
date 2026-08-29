"use client";

import { CalendarDays, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Sheet = "search" | "filters" | null;

const amenities = [
  ["WIFI", "Wi-Fi", "واي فاي", "无线网络"],
  ["PARKING", "Parking", "مواقف سيارات", "停车场"],
  ["POOL", "Pool", "مسبح", "游泳池"],
  ["GYM", "Gym", "نادي رياضي", "健身房"],
  ["BREAKFAST", "Breakfast", "إفطار", "早餐"],
] as const;

export function MobileSearchResultsControls() {
  const params = useSearchParams();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [locale, setLocale] = useState<"en" | "ar" | "zh">("en");

  useEffect(() => {
    const lang = document.documentElement.lang.toLowerCase();
    setLocale(lang.startsWith("ar") ? "ar" : lang.startsWith("zh") ? "zh" : "en");
    const main = document.querySelector<HTMLElement>(".searchExperience");
    const header = main?.querySelector<HTMLElement>(".siteHeader");
    if (!main || !header) return;
    const mount = document.createElement("div");
    mount.className = "mobileSearchPortalHost";
    header.after(mount);
    setHost(mount);
    return () => mount.remove();
  }, []);

  useEffect(() => {
    if (!sheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [sheet]);

  const destination = params.get("destination") || "Amman";
  const arrival = params.get("arrival") || "";
  const departure = params.get("departure") || "";
  const adults = params.get("adults") || "2";
  const children = params.get("children") || "0";
  const dateSummary = useMemo(() => compactDates(arrival, departure, locale), [arrival, departure, locale]);
  const guestSummary = locale === "ar" ? `${Number(adults) + Number(children)} ضيوف` : locale === "zh" ? `${Number(adults) + Number(children)} 位住客` : `${Number(adults) + Number(children)} guests`;
  const activeFilters = countActiveFilters(params);

  if (!host) return null;

  return createPortal(<>
    <section className="mobileSearchCommand" aria-label={locale === "ar" ? "ملخص البحث" : locale === "zh" ? "搜索摘要" : "Search summary"}>
      <button type="button" className="mobileSearchCommandMain" onClick={() => setSheet("search")}>
        <Search size={18}/>
        <span className="mobileSearchCommandCopy">
          <strong>{destination}</strong>
          <small><CalendarDays size={12}/>{dateSummary}<span>·</span><Users size={12}/>{guestSummary}</small>
        </span>
      </button>
      <button type="button" className="mobileSearchFilterButton" onClick={() => setSheet("filters")} aria-label={locale === "ar" ? "الفلاتر" : locale === "zh" ? "筛选" : "Filters"}>
        <SlidersHorizontal size={18}/>
        {activeFilters > 0 && <span>{activeFilters}</span>}
      </button>
    </section>

    {sheet && <div className="mobileSearchSheetBackdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSheet(null); }}>
      <section className="mobileSearchSheet" role="dialog" aria-modal="true" aria-label={sheet === "search" ? t(locale,"Edit search","تعديل البحث","修改搜索") : t(locale,"Filters","الفلاتر","筛选")}>
        <header className="mobileSearchSheetHeader">
          <div>
            <span>{sheet === "search" ? t(locale,"Search","البحث","搜索") : t(locale,"Refine results","تصفية النتائج","筛选结果")}</span>
            <strong>{sheet === "search" ? t(locale,"Edit your stay","عدّل إقامتك","修改住宿") : t(locale,"Filters","الفلاتر","筛选")}</strong>
          </div>
          <button type="button" onClick={() => setSheet(null)} aria-label={t(locale,"Close","إغلاق","关闭")}><X size={20}/></button>
        </header>

        {sheet === "search" ? <form className="mobileSearchEditForm" method="get" action="/search">
          {preservedFields(params, new Set(["destination","arrival","departure","adults","children","cursor"]))}
          <label><span>{t(locale,"Destination","الوجهة","目的地")}</span><input name="destination" defaultValue={destination} required autoComplete="off"/></label>
          <div className="mobileSearchSheetGrid">
            <label><span>{t(locale,"Check in","تسجيل الوصول","入住")}</span><input name="arrival" type="date" defaultValue={arrival} required/></label>
            <label><span>{t(locale,"Check out","تسجيل المغادرة","退房")}</span><input name="departure" type="date" defaultValue={departure} required/></label>
            <label><span>{t(locale,"Adults","البالغون","成人")}</span><input name="adults" type="number" min="1" max="20" defaultValue={adults} required/></label>
            <label><span>{t(locale,"Children","الأطفال","儿童")}</span><input name="children" type="number" min="0" max="20" defaultValue={children} required/></label>
          </div>
          <button className="mobileSearchSheetPrimary" type="submit"><Search size={18}/>{t(locale,"Search stays","ابحث عن إقامة","搜索住宿")}</button>
        </form> : <form className="mobileSearchFilterForm" method="get" action="/search">
          <input type="hidden" name="destination" value={destination}/>
          <input type="hidden" name="arrival" value={arrival}/>
          <input type="hidden" name="departure" value={departure}/>
          <input type="hidden" name="adults" value={adults}/>
          <input type="hidden" name="children" value={children}/>
          <input type="hidden" name="pageSize" value={params.get("pageSize") || "20"}/>

          <div className="mobileFilterSection">
            <strong>{t(locale,"Nightly total","السعر الليلي","每晚总价")}</strong>
            <div className="mobileSearchSheetGrid">
              <label><span>{t(locale,"Min","الحد الأدنى","最低")}</span><input name="minPrice" type="number" min="0" step="0.01" defaultValue={params.get("minPrice") || ""}/></label>
              <label><span>{t(locale,"Max","الحد الأعلى","最高")}</span><input name="maxPrice" type="number" min="0" step="0.01" defaultValue={params.get("maxPrice") || ""}/></label>
            </div>
          </div>

          <div className="mobileFilterSection mobileFilterSelects">
            <label><span>{t(locale,"Star rating","تصنيف النجوم","星级")}</span><select name="stars" defaultValue={params.get("stars") || ""}><option value="">{t(locale,"Any stars","أي تصنيف","不限星级")}</option><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option></select></label>
            <label><span>{t(locale,"Payment","الدفع","付款")}</span><select name="paymentMode" defaultValue={params.get("paymentMode") || ""}><option value="">{t(locale,"Any payment mode","أي طريقة دفع","不限付款方式")}</option><option value="PAY_AT_HOTEL">{t(locale,"Pay at hotel","الدفع في الفندق","到店付款")}</option><option value="PAY_NOW">{t(locale,"Pay now","ادفع الآن","立即付款")}</option></select></label>
            <label><span>{t(locale,"Sort by","الترتيب","排序")}</span><select name="sort" defaultValue={params.get("sort") || "RECOMMENDED"}><option value="RECOMMENDED">{t(locale,"Recommended","موصى به","推荐")}</option><option value="PRICE_ASC">{t(locale,"Lowest price","الأقل سعرًا","价格从低到高")}</option><option value="PRICE_DESC">{t(locale,"Highest price","الأعلى سعرًا","价格从高到低")}</option><option value="STARS_DESC">{t(locale,"Highest stars","الأعلى نجومًا","星级最高")}</option></select></label>
          </div>

          <div className="mobileFilterSection">
            <label className="mobileFilterCheck"><input type="checkbox" name="freeCancellation" value="true" defaultChecked={params.get("freeCancellation") === "true"}/><span>{t(locale,"Free cancellation","إلغاء مجاني","免费取消")}</span></label>
            <strong>{t(locale,"Facilities","المرافق","设施")}</strong>
            <div className="mobileAmenityGrid">{amenities.map(([code,en,ar,zh]) => <label key={code}><input type="checkbox" name="amenities" value={code} defaultChecked={params.getAll("amenities").includes(code)}/><span>{locale === "ar" ? ar : locale === "zh" ? zh : en}</span></label>)}</div>
          </div>

          <div className="mobileSearchSheetActions">
            <a href={baseSearchHref(destination,arrival,departure,adults,children,params.get("pageSize") || "20")}>{t(locale,"Clear","مسح","清除")}</a>
            <button className="mobileSearchSheetPrimary" type="submit"><SlidersHorizontal size={18}/>{t(locale,"Show results","عرض النتائج","显示结果")}</button>
          </div>
        </form>}
      </section>
    </div>}
  </>, host);
}

function compactDates(arrival:string,departure:string,locale:"en"|"ar"|"zh") {
  if (!arrival || !departure) return "—";
  const lang = locale === "ar" ? "ar-JO" : locale === "zh" ? "zh-CN" : "en-GB";
  const fmt = new Intl.DateTimeFormat(lang,{day:"numeric",month:"short"});
  return `${fmt.format(new Date(`${arrival}T12:00:00`))} – ${fmt.format(new Date(`${departure}T12:00:00`))}`;
}

function countActiveFilters(params:ReadonlyURLSearchParamsLike) {
  let count = 0;
  if (params.get("minPrice")) count++;
  if (params.get("maxPrice")) count++;
  if (params.get("stars")) count++;
  if (params.get("paymentMode")) count++;
  if (params.get("freeCancellation") === "true") count++;
  count += params.getAll("amenities").length;
  if (params.get("sort") && params.get("sort") !== "RECOMMENDED") count++;
  return count;
}

type ReadonlyURLSearchParamsLike = {get(name:string):string|null;getAll(name:string):string[];entries():IterableIterator<[string,string]>};

function preservedFields(params:ReadonlyURLSearchParamsLike, excluded:Set<string>) {
  return Array.from(params.entries()).filter(([key]) => !excluded.has(key)).map(([key,value],index) => <input key={`${key}-${index}`} type="hidden" name={key} value={value}/>);
}

function baseSearchHref(destination:string,arrival:string,departure:string,adults:string,children:string,pageSize:string) {
  const query = new URLSearchParams({destination,arrival,departure,adults,children,pageSize});
  return `/search?${query.toString()}`;
}

function t(locale:"en"|"ar"|"zh",en:string,ar:string,zh:string) { return locale === "ar" ? ar : locale === "zh" ? zh : en; }
