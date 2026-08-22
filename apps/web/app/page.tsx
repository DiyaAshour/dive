import Link from "next/link";
import { ArrowRight, BadgeCheck, BellRing, CreditCard, Search, ShieldCheck } from "lucide-react";
import { listFeaturedHotels } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { dictionary } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { defaultStayDates } from "@/lib/stay-dates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [hotels,locale] = await Promise.all([listFeaturedHotels(6),requestLocale()]);
  const copy = dictionary(locale);
  const stay = defaultStayDates();
  const visualHotels = hotels.filter((hotel)=>hotel.coverPhoto).slice(0,3);
  return <main className="customerPage">
    <CustomerHeader/>
    <section className="premiumHero"><div className="shell premiumHeroGrid"><div className="premiumHeroCopy"><span className="heroKicker">{copy.home.kicker}</span><h1>{copy.home.title}</h1><p>{copy.home.intro}</p><div className="heroConfidence"><span><BadgeCheck size={17}/>{copy.home.verified}</span><span><ShieldCheck size={17}/>{copy.home.cancellation}</span><span><CreditCard size={17}/>{copy.home.total}</span></div></div><div className="heroVisual" aria-label={copy.home.verified}>{visualHotels.length ? visualHotels.map((hotel,index)=><Link prefetch={false} href={`/hotel/${hotel.id}?arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`} className={`heroPhoto heroPhoto${index+1}`} key={hotel.id}><img src={hotel.coverPhoto!.url} alt={hotel.coverPhoto!.alt ?? hotel.name}/><span><small>{hotel.city}</small><strong>{hotel.name}</strong></span></Link>) : <div className="heroPlaceholder"><Search size={34}/><strong>{copy.home.livePlaceholder}</strong><span>{copy.home.livePlaceholderSub}</span></div>}</div></div>
      <div className="shell"><form className="premiumSearchDock" action="/search" method="get"><label><span>{copy.home.where}</span><input name="destination" defaultValue="Amman" required aria-label={copy.home.where}/><small>{copy.home.whereHint}</small></label><label><span>{copy.home.checkIn}</span><input name="arrival" type="date" defaultValue={stay.arrival} required/></label><label><span>{copy.home.checkOut}</span><input name="departure" type="date" defaultValue={stay.departure} required/></label><label><span>{copy.home.guests}</span><input name="adults" type="number" min="1" max="20" defaultValue="2" required/><small>{copy.home.adults}</small></label><input type="hidden" name="children" value="0"/><button type="submit"><Search size={19}/>{copy.home.search}</button></form></div>
    </section>

    <section className="shell discoverySection"><div className="premiumSectionHead"><div><span className="eyebrow">{copy.home.liveEyebrow}</span><h2>{copy.home.liveTitle}</h2><p>{copy.home.liveIntro}</p></div><Link href={`/search?destination=Amman&arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`}>{copy.home.explore} <ArrowRight size={16}/></Link></div>
      {hotels.length === 0 ? <div className="premiumEmpty"><BadgeCheck size={28}/><h3>{copy.home.noHotels}</h3><p>{copy.home.noHotelsSub}</p></div> : <div className="stayCardGrid">{hotels.map((hotel)=><Link prefetch={false} className="stayCard" href={`/hotel/${hotel.id}?arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`} key={hotel.id}><div className="stayCardMedia">{hotel.coverPhoto ? <img src={hotel.coverPhoto.url} alt={hotel.coverPhoto.alt ?? hotel.name}/> : <div className="stayCardPlaceholder">{copy.home.photoPending}</div>}<span className="verifiedPill"><BadgeCheck size={14}/>{copy.home.verifiedLabel}</span></div><div className="stayCardBody"><div className="stayCardMeta">{hotel.starRating ? `${hotel.starRating}★ · ` : ""}{hotel.area ? `${hotel.area}, ` : ""}{hotel.city}</div><h3>{hotel.name}</h3>{hotel.reviewSummary.overall !== null && <div className="stayRating"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{hotel.reviewSummary.count} {hotel.reviewSummary.count===1?copy.home.review:copy.home.reviews}</span></div>}<div className="stayAmenities">{hotel.amenities.slice(0,3).map((item)=><span key={item.code}>{item.name}</span>)}</div><div className="stayCardCta"><span>{copy.home.checkPrice}</span><ArrowRight size={17}/></div></div></Link>)}</div>}
    </section>

    <section className="valueSection"><div className="shell"><div className="premiumSectionHead light"><div><span className="eyebrow">{copy.home.valueEyebrow}</span><h2>{copy.home.valueTitle}</h2></div></div><div className="valueGrid"><article><span><CreditCard/></span><h3>{copy.home.finalTitle}</h3><p>{copy.home.finalBody}</p></article><article><span><ShieldCheck/></span><h3>{copy.home.policyTitle}</h3><p>{copy.home.policyBody}</p></article><article><span><BellRing/></span><h3>{copy.home.watchTitle}</h3><p>{copy.home.watchBody}</p></article></div></div></section>

    <section className="shell partnerBridge"><div><span className="eyebrow">{copy.home.partnerEyebrow}</span><h2>{copy.home.partnerTitle}</h2><p>{copy.home.partnerBody}</p></div><Link href="/partner">{copy.home.partnerCta} <ArrowRight size={18}/></Link></section>
  </main>;
}
