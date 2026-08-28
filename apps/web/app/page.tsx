import Link from "next/link";
import { ArrowRight, BadgeCheck, BellRing, CreditCard, MapPin, Search, ShieldCheck } from "lucide-react";
import { listFeaturedDestinations, listFeaturedHotels } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { DestinationAutocomplete } from "@/components/destination-autocomplete";
import { guestDictionary } from "@/lib/guest-i18n";
import { requestGuestMarket } from "@/lib/guest-market";
import { defaultStayDates } from "@/lib/stay-dates";
import destinationStyles from "./city-discovery.module.css";

export const dynamic = "force-dynamic";

function flagEmoji(countryCode: string) {
  return countryCode.toUpperCase().replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}

export default async function HomePage() {
  const [hotels,destinations,market] = await Promise.all([
    listFeaturedHotels(6),
    listFeaturedDestinations({countryCode: "JO", limit: 5}),
    requestGuestMarket(),
  ]);
  const locale=market.locale;
  const copy = guestDictionary(locale);
  const stay = defaultStayDates();
  const visualHotels = hotels.filter((hotel)=>hotel.coverPhoto).slice(0,3);
  const destinationCopy = locale === "ar"
    ? {eyebrow: "اكتشف الأردن", title: "الوجهات الرائجة", intro: "استكشف المدن والوجهات الأكثر حضورًا في الأردن. ابحث بالعربي أو الإنجليزي وسيطابق HandMeKey الاسم والتهجئات البديلة.", stays: "إقامة متاحة", explore: "استكشف الإقامات"}
    : locale === "zh"
      ? {eyebrow:"探索约旦",title:"热门目的地",intro:"探索约旦热门城市和目的地，并查看实时已验证酒店房量。",stays:"家住宿可订",explore:"查看住宿"}
      : {eyebrow: "Explore Jordan", title: "Popular destinations", intro: "Explore Jordan destinations with bilingual aliases and live verified hotel inventory.", stays: "stays available", explore: "Explore stays"};
  const regionNames = new Intl.DisplayNames([market.intlLocale], {type: "region"});

  return <main className="customerPage" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <section className="premiumHero"><div className="shell premiumHeroGrid"><div className="premiumHeroCopy"><span className="heroKicker">{copy.home.kicker}</span><h1>{copy.home.title}</h1><p>{copy.home.intro}</p><div className="heroConfidence"><span><BadgeCheck size={17}/>{copy.home.verified}</span><span><ShieldCheck size={17}/>{copy.home.cancellation}</span><span><CreditCard size={17}/>{copy.home.total}</span></div></div><div className="heroVisual" aria-label={copy.home.verified}>{visualHotels.length ? visualHotels.map((hotel,index)=><Link prefetch={false} href={`/hotel/${hotel.slug}?arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`} className={`heroPhoto heroPhoto${index+1}`} key={hotel.id}><img src={hotel.coverPhoto!.url} alt={hotel.coverPhoto!.alt ?? hotel.name}/><span><small>{hotel.city}</small><strong>{hotel.name}</strong></span></Link>) : <div className="heroPlaceholder"><Search size={34}/><strong>{copy.home.livePlaceholder}</strong><span>{copy.home.livePlaceholderSub}</span></div>}</div></div>
      <div className="shell"><form className="premiumSearchDock" action="/search" method="get"><label><span>{copy.home.where}</span><DestinationAutocomplete locale={market.baseLocale} defaultValue={locale==="ar"?"عمّان":"Amman"} required ariaLabel={copy.home.where}/><small>{copy.home.whereHint}</small></label><label><span>{copy.home.checkIn}</span><input name="arrival" type="date" defaultValue={stay.arrival} required/></label><label><span>{copy.home.checkOut}</span><input name="departure" type="date" defaultValue={stay.departure} required/></label><label><span>{copy.home.guests}</span><input name="adults" type="number" min="1" max="20" defaultValue="2" required/><small>{copy.home.adults}</small></label><input type="hidden" name="children" value="0"/><button type="submit"><Search size={19}/>{copy.home.search}</button></form></div>
    </section>

    <section className="shell discoverySection"><div className="premiumSectionHead"><div><span className="eyebrow">{copy.home.liveEyebrow}</span><h2>{copy.home.liveTitle}</h2><p>{copy.home.liveIntro}</p></div><Link href={`/search?destination=${locale==="ar"?encodeURIComponent("عمّان"):"Amman"}&arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`}>{copy.home.explore} <ArrowRight size={16}/></Link></div>
      {hotels.length === 0 ? <div className="premiumEmpty"><BadgeCheck size={28}/><h3>{copy.home.noHotels}</h3><p>{copy.home.noHotelsSub}</p></div> : <div className="stayCardGrid">{hotels.map((hotel)=><Link prefetch={false} className="stayCard" href={`/hotel/${hotel.slug}?arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`} key={hotel.id}><div className="stayCardMedia">{hotel.coverPhoto ? <img src={hotel.coverPhoto.url} alt={hotel.coverPhoto.alt ?? hotel.name} loading="lazy" decoding="async"/> : <div className="stayCardPlaceholder">{copy.home.photoPending}</div>}<span className="verifiedPill"><BadgeCheck size={14}/>{hotel.slug.startsWith("demo-")?copy.home.demoProperty:copy.home.verifiedLabel}</span></div><div className="stayCardBody"><div className="stayCardMeta">{hotel.starRating ? `${hotel.starRating}★ · ` : ""}{hotel.area ? `${hotel.area}, ` : ""}{hotel.city}</div><h3>{hotel.name}</h3>{hotel.reviewSummary.overall !== null && <div className="stayRating"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{hotel.reviewSummary.count} {hotel.reviewSummary.count===1?copy.home.review:copy.home.reviews}</span></div>}<div className="stayAmenities">{hotel.amenities.slice(0,3).map((item)=><span key={item.code}>{item.name}</span>)}</div><div className="stayCardCta"><span>{copy.home.checkPrice}</span><ArrowRight size={17}/></div></div></Link>)}</div>}
    </section>

    {destinations.length > 0 && <section className={`shell ${destinationStyles.destinationSection}`}>
      <div className={destinationStyles.destinationHead}><div className={destinationStyles.destinationHeadText}><span className={destinationStyles.destinationEyebrow}>{destinationCopy.eyebrow}</span><h2>{destinationCopy.title}</h2><p>{destinationCopy.intro}</p></div></div>
      <div className={destinationStyles.destinationGrid}>{destinations.map((destination,index) => {
        const cityName = locale === "ar" ? destination.nameAr ?? destination.nameEn : destination.nameEn;
        const countryName = regionNames.of(destination.countryCode) ?? destination.countryCode;
        return <Link prefetch={false} key={destination.id} className={`${destinationStyles.destinationCard} ${index < 2 ? destinationStyles.destinationCardFeatured : ""}`} href={destination.landingPath}>
          {destination.coverPhoto ? <div className={destinationStyles.destinationMedia}><img src={destination.coverPhoto.url} alt={destination.coverPhoto.alt ?? cityName} loading="lazy" decoding="async"/></div> : <div className={destinationStyles.destinationFallback}><MapPin size={30}/><strong>{cityName}</strong></div>}
          <div className={destinationStyles.destinationShade}/>
          <div className={destinationStyles.destinationTopline}><span className={destinationStyles.destinationFlag}>{flagEmoji(destination.countryCode)}</span><span>{countryName}</span></div>
          <div className={destinationStyles.destinationContent}><h3>{cityName}</h3><p>{destination.propertyCount} {destinationCopy.stays}</p><span className={destinationStyles.destinationCta}>{destinationCopy.explore}<ArrowRight size={15}/></span></div>
        </Link>;
      })}</div>
    </section>}

    <section className="valueSection"><div className="shell"><div className="premiumSectionHead light"><div><span className="eyebrow">{copy.home.valueEyebrow}</span><h2>{copy.home.valueTitle}</h2></div></div><div className="valueGrid"><article><span><CreditCard/></span><h3>{copy.home.finalTitle}</h3><p>{copy.home.finalBody}</p></article><article><span><ShieldCheck/></span><h3>{copy.home.policyTitle}</h3><p>{copy.home.policyBody}</p></article><article><span><BellRing/></span><h3>{copy.home.watchTitle}</h3><p>{copy.home.watchBody}</p></article></div></div></section>

    <section className="shell partnerBridge"><div><span className="eyebrow">{copy.home.partnerEyebrow}</span><h2>{copy.home.partnerTitle}</h2><p>{copy.home.partnerBody}</p></div><Link href="/partner">{copy.home.partnerCta} <ArrowRight size={18}/></Link></section>
  </main>;
}
