import Link from "next/link";
import { Baby, BadgeCheck, Bath, BedDouble, ChevronLeft, CircleCheck, CreditCard, Gift, Home, Image as ImageIcon, MapPin, Ruler, ShieldCheck, Star, UserRound, Utensils } from "lucide-react";
import { calculateLoyaltyPoints } from "@platform/core";
import { publicStaySchema } from "@platform/contracts";
import { getPublicHotelDetails, getPublicHotelReviews } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { guestMoney } from "@/lib/guest-currency";
import { guestDictionary, guestMarketCopy } from "@/lib/guest-i18n";
import { type GuestLocale } from "@/lib/guest-market";
import { hotelAmenityLabel } from "@/lib/hotel-amenity-copy";
import { hotelBedAreaLabel, hotelBedLabel, hotelRoomUiCopy, hotelUnitTypeLabel } from "@/lib/hotel-room-ui-copy";
import { hotelRoomFacilityLabel } from "@/lib/hotel-room-facility-copy";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { interpolate } from "@/lib/i18n";
import { defaultStayDates } from "@/lib/stay-dates";
import { HotelTrustLayer } from "./hotel-trust-layer";
import { PriceWatch } from "./price-watch";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HotelPage({params, searchParams}: {params: Promise<{id:string}>; searchParams: Promise<SearchParams>}) {
  const [{id},query,market]=await Promise.all([params,searchParams,requestGuestMarket()]);
  const locale=market.locale;
  const copy=guestDictionary(locale);
  const fxCopy=guestMarketCopy(locale);
  const roomUi=hotelRoomUiCopy(locale);
  const defaults=defaultStayDates();
  const parsed=publicStaySchema.safeParse({arrival:first(query.arrival)??defaults.arrival,departure:first(query.departure)??defaults.departure,adults:first(query.adults)??"2",children:first(query.children)??"0"});
  const stay=parsed.success?parsed.data:{arrival:defaults.arrival,departure:defaults.departure,adults:2,children:0};
  const [hotel,reviewData]=await Promise.all([getPublicHotelDetails(id,stay),getPublicHotelReviews(id,6)]);
  const cheapest=hotel.offers.length?hotel.offers.reduce((best,offer)=>offer.total<best.total?offer:best):null;
  const roomGroups=groupOffers(hotel.offers);
  const cheapestPoints=cheapest?calculateLoyaltyPoints(cheapest.amounts.base,"MEMBER",hotel.currency):0;
  const cheapestMoney=cheapest?guestMoney(cheapest.total,hotel.currency,market.currency,locale):null;
  return <main className="hotelExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <section className="shell hotelDetailSection">
      <Link className="backLink" href={`/search?destination=${encodeURIComponent(hotel.city)}&arrival=${stay.arrival}&departure=${stay.departure}&adults=${stay.adults}&children=${stay.children}`}><ChevronLeft size={16}/>{interpolate(copy.hotel.back,{city:hotel.city})}</Link>
      <div className="premiumHotelHead"><div><div className="hotelBadges"><span><BadgeCheck size={14}/>{hotel.slug.startsWith("demo-")?copy.hotel.demoProperty:copy.hotel.verified}</span>{hotel.starRating&&<span><Star size={14} fill="currentColor"/>{hotel.starRating} {copy.hotel.star}</span>}</div><h1>{hotel.name}</h1><p><MapPin size={16}/>{hotel.area?`${hotel.area}, `:""}{hotel.city} · {hotel.address}</p>{hotel.reviewSummary.overall!==null&&<div className="hotelRatingSummary"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{copy.hotel.guestSignal}<br/><small>{hotel.reviewSummary.count} {hotel.reviewSummary.count===1?copy.hotel.stayReview:copy.hotel.stayReviews}</small></span></div>}</div><div className="hotelQuickFacts"><div><span>{copy.hotel.checkIn}</span><strong>{hotel.checkInTime??copy.hotel.propertyPolicy}</strong></div><div><span>{copy.hotel.checkOut}</span><strong>{hotel.checkOutTime??copy.hotel.propertyPolicy}</strong></div></div></div>
      {hotel.photos.length?<div className="premiumGallery">{hotel.photos.slice(0,5).map((photo,index)=><img className={`galleryPhoto${index+1}`} key={`${photo.url}-${photo.sortOrder}`} src={photo.url} alt={photo.alt??hotel.name} loading={index===0?"eager":"lazy"} decoding="async"/>)}</div>:<div className="hotelMediaEmpty"><span>{copy.hotel.noPhotos}</span></div>}
      <div className="hotelTrustBar"><span><ShieldCheck size={17}/>{copy.hotel.finalPrice}</span><span><BadgeCheck size={17}/>{copy.hotel.liveInventory}</span><span><BadgeCheck size={17}/>{copy.hotel.verifiedReviews}</span></div>
      <HotelTrustLayer hotel={hotel} reviews={reviewData} locale={market.locale}/>
      <div className="hotelInfoGrid"><div className="hotelAbout"><span className="eyebrow">{copy.hotel.property}</span><h2>{interpolate(copy.hotel.about,{hotel:hotel.name})}</h2>{hotel.description?<p>{hotel.description}</p>:<p className="muted">{copy.hotel.noDescription}</p>}</div><aside className="hotelFacilities"><span className="eyebrow">{copy.hotel.facilities}</span><div>{hotel.amenities.length?hotel.amenities.map((amenity)=><span key={amenity.code}>{hotelAmenityLabel(locale,amenity.code,amenity.name)}</span>):<p className="muted">{copy.hotel.noFacilities}</p>}</div></aside></div>
      <div className="availabilityCard"><div><span className="eyebrow">{copy.hotel.yourStay}</span><h2>{copy.hotel.chooseDates}</h2></div><form className="availabilityForm" method="get"><label><span>{copy.hotel.checkIn}</span><input name="arrival" type="date" defaultValue={stay.arrival} required/></label><label><span>{copy.hotel.checkOut}</span><input name="departure" type="date" defaultValue={stay.departure} required/></label><label><span>{copy.hotel.adults}</span><input name="adults" type="number" min="1" max="20" defaultValue={stay.adults}/></label><label><span>{copy.hotel.children}</span><input name="children" type="number" min="0" max="20" defaultValue={stay.children}/></label><button type="submit">{copy.hotel.availability}</button></form></div>
      {!parsed.success&&<div className="inlineWarning">{copy.hotel.invalidStay}</div>}
      {cheapest&&<PriceWatch locale={market.locale} hotelId={hotel.id} arrival={stay.arrival} departure={stay.departure} adults={stay.adults} children={stay.children} currentTotal={cheapest.total} currency={hotel.currency}/>} 
      <div className="hotelBookingWorkspace">
        <div className="hotelBookingMain">
          <div className="rateSectionHead"><div><span className="eyebrow">{copy.hotel.available}</span><h2>{hotel.offers.length} {hotel.offers.length===1?copy.hotel.liveRate:copy.hotel.liveRates}</h2><p>{hotel.stay.nights} {hotel.stay.nights===1?copy.hotel.night:copy.hotel.nights} · {copy.hotel.totalsNote}</p></div>{cheapestMoney&&<div><span>{copy.hotel.from}</span><strong>{cheapestMoney.converted?`${fxCopy.approx} ${cheapestMoney.text}`:cheapestMoney.text}</strong>{cheapestMoney.converted&&<small>{cheapestMoney.sourceText}</small>}<small>{copy.hotel.stayTotal}</small></div>}</div>
          {hotel.offers.length===0?<div className="premiumEmpty"><h3>{copy.hotel.noRooms}</h3><p>{copy.hotel.noRoomsBody}</p></div>:<div className="roomOfferList" id="room-offers">{roomGroups.map(({room,offers})=>{
            const lowInventory=Math.min(...offers.map((offer)=>offer.availableToSell));
            return <article className="roomOfferCard" key={room.roomTypeId}>
              <section className="publicRoomProduct">
                <div className="publicRoomMedia">{room.roomPhotos[0]?<img src={room.roomPhotos[0].url} alt={room.roomPhotos[0].alt??room.roomName}/>:<><ImageIcon size={28}/><span>{roomUi.roomPhotoPending}</span></>}</div>
                <div className="publicRoomContent"><span className="eyebrow">{hotelUnitTypeLabel(locale,room.unitType)}</span><h3>{room.roomName}</h3><div className="publicRoomFits"><strong>{roomUi.fits}</strong><span aria-label={`${room.maxGuests} ${roomUi.guests}`}>{Array.from({length:Math.min(room.maxGuests,6)},(_,index)=><UserRound size={18} fill="currentColor" key={index}/>)}{room.maxGuests>6&&<b>× {room.maxGuests}</b>}</span><small>{room.maxAdults} {copy.hotel.adults}{room.maxChildren?` · ${room.maxChildren} ${copy.hotel.children}`:""}{room.maxInfants?` · ${room.maxInfants} ${roomUi.infants}`:""}</small></div>
                <div className="publicBedLayout">{groupBeds(room.beds).map(([area,beds])=><p key={area}><strong>{hotelBedAreaLabel(locale,area)}:</strong> {beds.map((bed)=>`${bed.quantity} ${hotelBedLabel(locale,bed.type)}`).join(" + ")} <BedDouble size={16}/></p>)}</div>
                {(room.cribCount>0||room.extraBedCount>0)&&<div className="publicRoomExtras">{room.cribCount>0&&<span><Baby size={15}/>{roomUi.crib}</span>}{room.extraBedCount>0&&<span><BedDouble size={15}/>{roomUi.extraBed}</span>}</div>}
                <div className="publicRoomTags"><span><Home size={14}/>{hotelUnitTypeLabel(locale,room.unitType)}</span>{room.sizeValue&&<span><Ruler size={14}/>{room.sizeValue} {room.sizeUnit==="SQM"?"m²":"ft²"}</span>}{room.privateBathroom&&<span><Bath size={14}/>{roomUi.privateBathroom}</span>}{room.roomAmenities.slice(0,8).map((amenity)=><span key={amenity.code}>{hotelRoomFacilityLabel(locale,amenity.code,amenity.name)}</span>)}</div>
                {room.roomDescription&&<p className="publicRoomDescription">{room.roomDescription}</p>}{lowInventory<=3&&<strong className="scarcityNote">{copy.hotel.only} {lowInventory} {copy.hotel.left}</strong>}</div>
              </section>
              <section className="publicRateOptions">
                <div className="publicRateHead"><span>{roomUi.offerMeal}</span><span>{copy.hotel.cancellation}</span><span>{roomUi.paymentBenefits}</span><span>{copy.hotel.finalTotal}</span></div>
                {offers.map((offer)=>{
                  const points=calculateLoyaltyPoints(offer.amounts.base,"MEMBER",hotel.currency);
                  const badges=rateBadges(offer,offers,locale);
                  const totalMoney=guestMoney(offer.total,hotel.currency,market.currency,locale);
                  const averageMoney=guestMoney(offer.averageNightlyTotal,hotel.currency,market.currency,locale);
                  const penaltyMoney=guestMoney(offer.cancellationNow.penaltyAmount,hotel.currency,market.currency,locale);
                  const baseMoney=guestMoney(offer.amounts.base,hotel.currency,market.currency,locale);
                  const serviceMoney=guestMoney(offer.amounts.service,hotel.currency,market.currency,locale);
                  const taxMoney=guestMoney(offer.amounts.tax,hotel.currency,market.currency,locale);
                  return <div className="publicRateRow" key={offer.ratePlanId}>
                    <div className="publicRateCell packageCell"><span>{copy.hotel.package}</span><h4>{mealPlan(offer.mealPlan,locale)}</h4><div className="rateBadges">{badges.map((badge)=><span className={`rateBadge ${badge.kind}`} key={badge.text}>{badge.text}</span>)}</div>{offer.promotion&&<strong className="dealPill">{offer.promotion.discountPercent}% {roomUi.off} · {offer.promotion.name}</strong>}</div>
                    <div className="publicRateCell"><span>{copy.hotel.cancellation}</span><h4 className="rateCancellationTitle">{offer.cancellationPolicy.name}</h4><p className={offer.freeCancellationNow?"positiveText":"ratePenalty"}>{offer.freeCancellationNow?<><CircleCheck size={13}/> {copy.hotel.freeNow}</>:<>{copy.hotel.currentPenalty} {penaltyMoney.converted?`${fxCopy.approx} ${penaltyMoney.text}`:penaltyMoney.text}</>}</p></div>
                    <div className="publicRateCell"><span>{roomUi.includes}</span><div className="rateFeatureChips"><span><Utensils size={12}/>{mealPlan(offer.mealPlan,locale)}</span>{paymentModeChip(offer.paymentModes,copy.hotel.payNow,copy.hotel.payHotel)}</div>{points>0&&<p className="rateReward"><Gift size={13}/>{roomUi.earnPoints(points.toLocaleString(market.intlLocale))}</p>}</div>
                    <div className="publicRateAction"><span>{copy.hotel.finalTotal}</span><div className="ratePrice"><strong>{totalMoney.converted?`${fxCopy.approx} ${totalMoney.text}`:totalMoney.text}</strong><small>{hotel.stay.nights} {hotel.stay.nights===1?copy.hotel.night:copy.hotel.nights}</small></div><small>{averageMoney.converted?`${fxCopy.approx} ${averageMoney.text}`:averageMoney.text} {copy.hotel.average}</small><small className="rateBreakdown">{copy.hotel.base} {baseMoney.text} + {copy.hotel.service} {serviceMoney.text} + {copy.hotel.tax} {taxMoney.text}</small>{totalMoney.converted&&<small className="fxSourceAmount">{totalMoney.sourceText} · {fxCopy.charged}</small>}{offer.availableToSell<=3&&<span className="rateInventory">{copy.hotel.only} {offer.availableToSell} {copy.hotel.left}</span>}<Link className="bookRateButton" href={checkoutHref(hotel.id,offer.roomTypeId,offer.ratePlanId,stay.arrival,stay.departure,stay.adults,stay.children)}>{copy.hotel.choose}</Link></div>
                  </div>;
                })}
              </section>
            </article>;
          })}</div>}
        </div>
        {cheapest&&cheapestMoney&&<aside className="hotelBookingRail">
          <div className="hotelRailTop"><span>{roomUi.bestLiveRate}</span><strong>{cheapestMoney.converted?`${fxCopy.approx} ${cheapestMoney.text}`:cheapestMoney.text}</strong>{cheapestMoney.converted&&<small>{cheapestMoney.sourceText} · {fxCopy.charged}</small>}<small>{hotel.stay.nights} {hotel.stay.nights===1?copy.hotel.night:copy.hotel.nights} · {copy.hotel.stayTotal}</small>{cheapestPoints>0&&<div className="hotelRailReward"><Gift size={15}/>{roomUi.rewardsPoints(cheapestPoints.toLocaleString(market.intlLocale))}</div>}</div>
          <div className="hotelRailBody"><div className="hotelRailFacts"><div><span>{copy.hotel.checkIn}</span><strong>{stay.arrival}</strong></div><div><span>{copy.hotel.checkOut}</span><strong>{stay.departure}</strong></div><div><span>{roomUi.guests}</span><strong>{stay.adults} {copy.hotel.adults}{stay.children?` · ${stay.children} ${copy.hotel.children}`:""}</strong></div><div><span>{roomUi.rateChoices}</span><strong>{hotel.offers.length}</strong></div></div><div><a className="hotelRailButton" href="#room-offers">{roomUi.seeRoomsRates}</a><Link className="hotelRailLink" href={`/rewards/${market.baseLocale}`}>{roomUi.learnRewards}</Link><div className="hotelRailTrust"><span><ShieldCheck size={13}/>{copy.hotel.finalPrice}</span><span><BadgeCheck size={13}/>{copy.hotel.liveInventory}</span><span><BadgeCheck size={13}/>{copy.hotel.verifiedReviews}</span></div></div></div>
        </aside>}
      </div>
      <section className="reviewsSection"><div className="premiumSectionHead"><div><span className="eyebrow">{copy.hotel.verifiedStays}</span><h2>{copy.hotel.reviewsTitle}</h2></div></div>{reviewData.summary.count===0?<div className="premiumEmpty"><h3>{copy.hotel.noReviews}</h3><p>{copy.hotel.noReviewsBody}</p></div>:<><div className="reviewScoreGrid"><div className="reviewOverall"><strong>{reviewData.summary.overall?.toFixed(1)}</strong><span>{copy.hotel.outOf10}</span><small>{reviewData.summary.count} {copy.hotel.verifiedStaysCount}</small></div>{[[copy.hotel.cleanliness,reviewData.summary.cleanliness],[copy.hotel.staff,reviewData.summary.staff],[copy.hotel.location,reviewData.summary.location],[copy.hotel.comfort,reviewData.summary.comfort],[copy.hotel.value,reviewData.summary.value]].map(([label,value])=><div className="reviewMetric" key={String(label)}><span>{label}</span><strong>{typeof value==="number"?value.toFixed(1):"—"}</strong></div>)}</div><div className="reviewCards">{reviewData.reviews.map((review)=><article key={review.id}><div className="reviewCardTop"><strong>{review.overall}/10</strong><span>{review.guestName}<small>{copy.hotel.verifiedStay} · {review.stayCompleted}</small></span></div>{review.title&&<h3>{review.title}</h3>}<p>{review.comment}</p>{review.hotelReply&&<div className="hotelReply"><strong>{copy.hotel.propertyResponse}</strong><p>{review.hotelReply}</p></div>}</article>)}</div></>}
      </section>
    </section>
  </main>;
}

function first(value:string|string[]|undefined):string|undefined{return Array.isArray(value)?value[0]:value;}
function checkoutHref(hotelId:string,roomTypeId:string,ratePlanId:string,arrival:string,departure:string,adults:number,children:number){const query=new URLSearchParams({hotelId,roomTypeId,ratePlanId,arrival,departure,adults:String(adults),children:String(children)});return `/checkout?${query.toString()}`;}
function mealPlan(value:string,locale:GuestLocale){const copy=guestDictionary(locale).hotel;if(value==="BREAKFAST")return copy.breakfast;if(value==="HALF_BOARD")return copy.halfBoard;if(value==="FULL_BOARD")return copy.fullBoard;return copy.roomOnly;}
type Offer = Awaited<ReturnType<typeof getPublicHotelDetails>>["offers"][number];
function groupOffers(offers:Offer[]){const groups=new Map<string,{room:Offer;offers:Offer[]}>();for(const offer of offers){const group=groups.get(offer.roomTypeId);if(group)group.offers.push(offer);else groups.set(offer.roomTypeId,{room:offer,offers:[offer]});}return [...groups.values()].map((group)=>({...group,offers:[...group.offers].sort((a,b)=>a.total-b.total)}));}
function rateBadges(offer:Offer,offers:Offer[],locale:GuestLocale):Array<{text:string;kind:"best"|"flex"|"included"}>{const ui=hotelRoomUiCopy(locale);const badges:Array<{text:string;kind:"best"|"flex"|"included"}>=[];const cheapest=Math.min(...offers.map((candidate)=>candidate.total));if(Math.abs(offer.total-cheapest)<0.01)badges.push({text:ui.bestPrice,kind:"best"});if(offer.freeCancellationNow)badges.push({text:ui.flexible,kind:"flex"});if(offer.mealPlan==="FULL_BOARD")badges.push({text:ui.mostIncluded,kind:"included"});return badges.slice(0,2);}
function paymentModeChip(modes:Offer["paymentModes"],payNow:string,payHotel:string){if(modes.length===0)return null;if(modes.length===1){const mode=modes[0];return <span className={mode==="PAY_AT_HOTEL"?"positive":""}><CreditCard size={12}/>{mode==="PAY_AT_HOTEL"?payHotel:payNow}</span>;}return <span className="positive"><CreditCard size={12}/>{payNow} / {payHotel}</span>;}
function groupBeds(beds:Offer["beds"]){const groups=new Map<string,Offer["beds"]>();for(const bed of beds)groups.set(bed.area,[...(groups.get(bed.area)??[]),bed]);return [...groups.entries()];}
