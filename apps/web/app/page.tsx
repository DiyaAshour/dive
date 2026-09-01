import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, CreditCard, MapPin, Search, ShieldCheck, Users } from "lucide-react";
import { listFeaturedDestinations, listFeaturedHotels } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { DestinationAutocomplete } from "@/components/destination-autocomplete";
import { HomeValueCarousel } from "@/components/home-value-carousel";
import { demoDestinationsFallback, demoFeaturedHotelsFallback } from "@/lib/demo-catalog-fallback";
import { guestDictionary } from "@/lib/guest-i18n";
import { guestUiCopy } from "@/lib/guest-ui-copy";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { defaultStayDates } from "@/lib/stay-dates";
import destinationStyles from "./city-discovery.module.css";

export const dynamic = "force-dynamic";

const CURATED_DESTINATION_PHOTOS = {
  amman: {
    url: "https://images.unsplash.com/photo-1768451673681-7e793a7f4900?auto=format&fit=crop&w=1800&q=88",
    altEn: "Amman cityscape and the Jordanian flag at sunset",
    altAr: "إطلالة حقيقية على مدينة عمّان والعلم الأردني وقت الغروب",
    objectPosition: "50% 50%",
  },
  aqaba: {
    url: "https://images.pexels.com/photos/17646516/pexels-photo-17646516.jpeg?auto=compress&cs=tinysrgb&w=1800",
    altEn: "Aqaba waterfront, Red Sea and the red mountains in Jordan",
    altAr: "واجهة العقبة البحرية والبحر الأحمر والجبال الحمراء في الأردن",
    objectPosition: "50% 52%",
  },
  petra: {
    url: "https://visitpetra.jo/uploads/LocationImages/9efd2b9f-2df6-4a29-88c8-533e5a6f51ca.jpg",
    altEn: "The Treasury in Petra, Jordan",
    altAr: "الخزنة في مدينة البتراء الأثرية في الأردن",
    objectPosition: "50% 52%",
  },
  "dead-sea": {
    url: "https://images.pexels.com/photos/3370311/pexels-photo-3370311.jpeg?auto=compress&cs=tinysrgb&w=1800",
    altEn: "Dead Sea salt formations and shoreline in Jordan",
    altAr: "تشكّلات الملح البيضاء على شاطئ البحر الميت في الأردن",
    objectPosition: "50% 60%",
  },
} as const;

function flagEmoji(countryCode: string) {
  return countryCode.toUpperCase().replace(/[A-Z]/g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}

export default async function HomePage() {
  const [liveHotels,liveDestinations,market] = await Promise.all([
    listFeaturedHotels(6).catch(() => []),
    listFeaturedDestinations({countryCode: "JO", limit: 4}).catch(() => []),
    requestGuestMarket(),
  ]);
  const hotels = liveHotels.length ? liveHotels : demoFeaturedHotelsFallback(6);
  const destinations = liveDestinations.length ? liveDestinations : demoDestinationsFallback(4);
  const locale=market.locale;
  const copy = guestDictionary(locale);
  const ui = guestUiCopy(locale);
  const stay = defaultStayDates();
  const visualHotels = hotels.filter((hotel)=>hotel.coverPhoto).slice(0,3);
  const destinationCopy = ui.destination;
  const homeEnhancement = ui.destination;
  const regionNames = new Intl.DisplayNames([market.intlLocale], {type: "region"});

  return <main className="customerPage" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <section className="premiumHero"><div className="shell premiumHeroGrid"><div className="premiumHeroCopy"><span className="heroKicker">{copy.home.kicker}</span><h1>{copy.home.title}</h1><p>{copy.home.intro}</p><div className="heroConfidence"><span><BadgeCheck size={17}/>{copy.home.verified}</span><span><ShieldCheck size={17}/>{copy.home.cancellation}</span><span><CreditCard size={17}/>{copy.home.total}</span></div></div><div className="heroVisual" aria-label={copy.home.verified}>{visualHotels.length ? visualHotels.map((hotel,index)=><Link prefetch={false} href={`/hotel/${hotel.slug}?arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`} className={`heroPhoto heroPhoto${index+1}`} key={hotel.id}><img src={hotel.coverPhoto!.url} alt={hotel.coverPhoto!.alt ?? hotel.name}/><span><small>{hotel.city}</small><strong>{hotel.name}</strong></span></Link>) : <div className="heroPlaceholder"><Search size={34}/><strong>{copy.home.livePlaceholder}</strong><span>{copy.home.livePlaceholderSub}</span></div>}</div></div>
      <div className="shell"><form className="premiumSearchDock homeSearchDock" action="/search" method="get">
        <label className="homeSearchWhere"><span className="homeSearchFieldLabel"><MapPin size={13}/>{copy.home.where}</span><DestinationAutocomplete locale={market.baseLocale} defaultValue={locale==="ar"?"عمّان":"Amman"} required ariaLabel={copy.home.where}/><small>{copy.home.whereHint}</small></label>
        <label className="homeSearchDate homeSearchCheckIn"><span className="homeSearchFieldLabel"><CalendarDays size={13}/>{copy.home.checkIn}</span><input name="arrival" type="date" defaultValue={stay.arrival} required/></label>
        <label className="homeSearchDate homeSearchCheckOut"><span className="homeSearchFieldLabel"><CalendarDays size={13}/>{copy.home.checkOut}</span><input name="departure" type="date" defaultValue={stay.departure} required/></label>
        <label className="homeSearchGuests"><span className="homeSearchFieldLabel"><Users size={13}/>{copy.home.guests}</span><input name="adults" type="number" min="1" max="20" defaultValue="2" required/><small>{copy.home.adults}</small></label>
        <input type="hidden" name="children" value="0"/><button type="submit"><Search size={19}/>{copy.home.search}</button>
      </form></div>
    </section>

    <section className="shell discoverySection"><div className="premiumSectionHead"><div><span className="eyebrow">{copy.home.liveEyebrow}</span><h2>{copy.home.liveTitle}</h2><p>{copy.home.liveIntro}</p></div><Link href={`/search?destination=${locale==="ar"?encodeURIComponent("عمّان"):"Amman"}&arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`}>{copy.home.explore} <ArrowRight size={16}/></Link></div>
      {hotels.length === 0 ? <div className="premiumEmpty"><BadgeCheck size={28}/><h3>{copy.home.noHotels}</h3><p>{copy.home.noHotelsSub}</p></div> : <div className="stayCardGrid" aria-label={copy.home.liveTitle}>{hotels.map((hotel)=><Link prefetch={false} className="stayCard" href={`/hotel/${hotel.slug}?arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`} key={hotel.id}><div className="stayCardMedia">{hotel.coverPhoto ? <img src={hotel.coverPhoto.url} alt={hotel.coverPhoto.alt ?? hotel.name} loading="lazy" decoding="async"/> : <div className="stayCardPlaceholder">{copy.home.photoPending}</div>}<span className="verifiedPill"><BadgeCheck size={14}/>{hotel.slug.startsWith("demo-")?copy.home.demoProperty:copy.home.verifiedLabel}</span></div><div className="stayCardBody"><div className="stayCardMeta">{hotel.starRating ? `${hotel.starRating}★ · ` : ""}{hotel.area ? `${hotel.area}, ` : ""}{hotel.city}</div><h3>{hotel.name}</h3>{hotel.reviewSummary.overall !== null && <div className="stayRating"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{hotel.reviewSummary.count} {hotel.reviewSummary.count===1?copy.home.review:copy.home.reviews}</span></div>}<div className="stayAmenities">{hotel.amenities.slice(0,3).map((item)=><span key={item.code}>{item.name}</span>)}</div><div className="stayCardCta"><span className="stayCardCtaCopy"><small>{homeEnhancement.clearPrice}</small><strong>{homeEnhancement.seeRooms}</strong></span><span className="stayCardCtaArrow"><ArrowRight size={17}/></span></div></div></Link>)}</div>}
    </section>

    {destinations.length > 0 && <section className={`shell ${destinationStyles.destinationSection}`}>
      <div className={destinationStyles.destinationHead}><div className={destinationStyles.destinationHeadText}><span className={destinationStyles.destinationEyebrow}>{destinationCopy.eyebrow}</span><h2>{destinationCopy.title}</h2><p>{destinationCopy.intro}</p></div></div>
      <div className={destinationStyles.destinationGrid}>{destinations.map((destination,index) => {
        const cityName = locale === "ar" ? destination.nameAr ?? destination.nameEn : destination.nameEn;
        const countryName = regionNames.of(destination.countryCode) ?? destination.countryCode;
        const curatedPhoto = CURATED_DESTINATION_PHOTOS[destination.slug as keyof typeof CURATED_DESTINATION_PHOTOS];
        const destinationPhoto = curatedPhoto ? {url: curatedPhoto.url, alt: locale === "ar" ? curatedPhoto.altAr : curatedPhoto.altEn} : destination.coverPhoto;
        return <Link prefetch={false} key={destination.id} className={`${destinationStyles.destinationCard} ${index < 2 ? destinationStyles.destinationCardFeatured : ""}`} href={destination.landingPath}>
          {destinationPhoto ? <div className={destinationStyles.destinationMedia}><img src={destinationPhoto.url} alt={destinationPhoto.alt ?? cityName} loading="lazy" decoding="async" style={curatedPhoto ? {objectPosition: curatedPhoto.objectPosition} : undefined}/></div> : <div className={destinationStyles.destinationFallback}><MapPin size={30}/><strong>{cityName}</strong></div>}
          <div className={destinationStyles.destinationShade}/>
          <div className={destinationStyles.destinationTopline}><span className={destinationStyles.destinationFlag}>{flagEmoji(destination.countryCode)}</span><span>{countryName}</span></div>
          <div className={destinationStyles.destinationContent}><h3>{cityName}</h3><p>{destination.propertyCount} {destinationCopy.stays}</p><span className={destinationStyles.destinationCta}>{destinationCopy.explore}<ArrowRight size={15}/></span></div>
        </Link>;
      })}</div>
    </section>}

    <section className="valueSection"><div className="shell"><div className="premiumSectionHead light"><div><span className="eyebrow">{copy.home.valueEyebrow}</span><h2>{copy.home.valueTitle}</h2></div></div><HomeValueCarousel finalTitle={copy.home.finalTitle} finalBody={copy.home.finalBody} policyTitle={copy.home.policyTitle} policyBody={copy.home.policyBody} watchTitle={copy.home.watchTitle} watchBody={copy.home.watchBody}/></div></section>

    <section className="shell partnerBridge"><div><span className="eyebrow">{copy.home.partnerEyebrow}</span><h2>{copy.home.partnerTitle}</h2><p>{copy.home.partnerBody}</p></div><Link href="/partner">{copy.home.partnerCta} <ArrowRight size={18}/></Link></section>
  </main>;
}