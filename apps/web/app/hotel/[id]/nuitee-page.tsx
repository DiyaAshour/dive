import Link from "next/link";
import {BadgeCheck, BedDouble, ChevronLeft, CircleCheck, CreditCard, Image as ImageIcon, MapPin, ShieldCheck, Star, Utensils} from "lucide-react";
import type {NuiteeHotelDetails, NuiteeOffer} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {guestMoney} from "@/lib/guest-currency";
import type {GuestCurrency,GuestLocale} from "@/lib/guest-market";

type Stay=Readonly<{arrival:string;departure:string;adults:number;children:number;childrenAges?:readonly number[]}>;
type Market=Readonly<{locale:GuestLocale;currency:GuestCurrency;intlLocale:string;direction:"ltr"|"rtl"}>;
type RoomGroup=Readonly<{key:string;roomName:string;offers:readonly NuiteeOffer[]}>;

export function NuiteeHotelPage({hotel,stay,market}:Readonly<{hotel:NuiteeHotelDetails;stay:Stay;market:Market}>) {
  const ar=market.locale==="ar";
  const cheapest=hotel.offers[0]??null;
  const cheapestMoney=cheapest?guestMoney(cheapest.total,cheapest.currency,market.currency,market.locale):null;
  const groups=groupOffers(hotel.offers);
  const nights=stayNights(stay.arrival,stay.departure);
  const guestCount=stay.adults+stay.children;
  return <main className="hotelExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <section className="shell hotelDetailSection">
      <Link className="backLink" href={`/search?destination=${encodeURIComponent(hotel.city)}&${stayQuery(stay)}`}><ChevronLeft size={16}/>{ar?"العودة إلى إقامات البحث":"Back to search"}</Link>

      <div className="premiumHotelHead"><div><div className="hotelBadges"><span><BadgeCheck size={14}/>Nuitee Connect</span>{hotel.sandbox&&<span>Sandbox</span>}{hotel.starRating&&<span><Star size={14} fill="currentColor"/>{hotel.starRating}★</span>}</div><h1>{hotel.name}</h1><p><MapPin size={16}/>{hotel.area?`${hotel.area}, `:""}{hotel.city}{hotel.address?` · ${hotel.address}`:""}</p>{hotel.reviewSummary.overall!==null&&<div className="hotelRatingSummary"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{ar?"تقييم الضيوف":"Guest rating"}<br/><small>{hotel.reviewSummary.count} {ar?"مراجعة مزود":"provider reviews"}</small></span></div>}</div><div className="hotelQuickFacts"><div><span>{ar?"تسجيل الدخول":"Check-in"}</span><strong>{hotel.checkInTime??(ar?"حسب سياسة الفندق":"Property policy")}</strong></div><div><span>{ar?"تسجيل الخروج":"Check-out"}</span><strong>{hotel.checkOutTime??(ar?"حسب سياسة الفندق":"Property policy")}</strong></div></div></div>

      {hotel.photos.length?<div className="premiumGallery">{hotel.photos.slice(0,5).map((photo,index)=><img className={`galleryPhoto${index+1}`} key={photo.url} src={photo.url} alt={photo.alt||hotel.name} loading={index===0?"eager":"lazy"} decoding="async"/>)}</div>:<div className="hotelMediaEmpty"><span>{ar?"صور الفندق غير متاحة من المزود حالياً":"Provider photos are not available right now"}</span></div>}

      <div className="hotelTrustBar"><span><ShieldCheck size={17}/>{ar?"أسعار مباشرة من المزود":"Live supplier pricing"}</span><span><BadgeCheck size={17}/>{ar?"إعادة تأكيد السعر قبل الدفع":"Price rechecked before payment"}</span><span><BadgeCheck size={17}/>{ar?"مخزون Nuitee Connect مباشر":"Live Nuitee Connect inventory"}</span></div>

      <div className="availabilityCard"><div><span className="eyebrow">{ar?"إقامتك":"Your stay"}</span><h2>{ar?"اختر التواريخ وشاهد التوفر المباشر":"Choose dates and see live availability"}</h2></div><form className="availabilityForm" method="get"><label><span>{ar?"الوصول":"Check-in"}</span><input name="arrival" type="date" defaultValue={stay.arrival} required/></label><label><span>{ar?"المغادرة":"Check-out"}</span><input name="departure" type="date" defaultValue={stay.departure} required/></label><label><span>{ar?"البالغون":"Adults"}</span><input name="adults" type="number" min="1" max="20" defaultValue={stay.adults}/></label><label><span>{ar?"الأطفال":"Children"}</span><input name="children" type="number" min="0" max="20" defaultValue={stay.children}/></label>{(stay.childrenAges??[]).map((age,index)=><input key={`${age}-${index}`} type="hidden" name="childrenAge" value={age}/>)}<button type="submit">{ar?"تحقق من التوفر":"Check availability"}</button></form></div>

      <div className="hotelBookingWorkspace">
        <div className="hotelBookingMain">
          <div className="rateSectionHead"><div><span className="eyebrow">Nuitee Connect</span><h2>{hotel.offers.length} {hotel.offers.length===1?(ar?"سعر مباشر":"live rate"):(ar?"أسعار مباشرة":"live rates")}</h2><p>{nights} {nights===1?(ar?"ليلة":"night"):(ar?"ليالي":"nights")} · {ar?"السعر يعاد تأكيده عبر Prebook قبل الدفع":"price is rechecked by prebook before payment"}</p></div>{cheapestMoney&&<div><span>{ar?"ابتداءً من":"From"}</span><strong>{cheapestMoney.converted?`${ar?"حوالي":"approx."} ${cheapestMoney.text}`:cheapestMoney.text}</strong>{cheapestMoney.converted&&<small>{cheapestMoney.sourceText}</small>}<small>{ar?"إجمالي الإقامة":"stay total"}</small></div>}</div>

          {!groups.length?<div className="premiumEmpty"><h3>{ar?"لا توجد غرف متاحة":"No rooms available"}</h3><p>{ar?"غيّر التواريخ أو عدد الضيوف وحاول مرة أخرى.":"Change the dates or guest count and try again."}</p></div>:<div className="roomOfferList" id="room-offers">{groups.map((group,index)=>{
            const lowInventory=Math.min(...group.offers.map((offer)=>offer.availableToSell));
            const roomPhoto=hotel.photos[index%Math.max(1,hotel.photos.length)]??hotel.coverPhoto;
            return <article className="roomOfferCard" key={group.key}>
              <section className="publicRoomProduct">
                <div className="publicRoomMedia">{roomPhoto?<img src={roomPhoto.url} alt={roomPhoto.alt||hotel.name}/>:<><ImageIcon size={28}/><span>{ar?"صورة الغرفة غير متاحة":"Room photo pending"}</span></>}</div>
                <div className="publicRoomContent"><span className="eyebrow">{ar?"غرفة Nuitee":"Nuitee room"}</span><h3>{group.roomName}</h3><div className="publicRoomTags"><span><BedDouble size={14}/>{ar?"نوع الغرفة من المزود":"Provider room type"}</span><span><CreditCard size={14}/>{ar?"الدفع الآن":"Pay now"}</span></div><p className="publicRoomDescription">{ar?"اسم الغرفة وخطة الوجبات وسياسة الإلغاء تأتي مباشرة من Nuitee Connect. السعر النهائي يعاد فحصه في خطوة Prebook قبل الدفع.":"Room name, board basis and cancellation terms come directly from Nuitee Connect. The final payable price is rechecked at prebook before payment."}</p>{lowInventory<=3&&<strong className="scarcityNote">{ar?`متبقي ${lowInventory} فقط لهذه التواريخ`:`Only ${lowInventory} left for these dates`}</strong>}</div>
              </section>
              <section className="publicRateOptions">
                <div className="publicRateHead"><span>{ar?"الوجبات":"Meal plan"}</span><span>{ar?"الإلغاء":"Cancellation"}</span><span>{ar?"الدفع والمزايا":"Payment & benefits"}</span><span>{ar?"الإجمالي النهائي":"Final stay total"}</span></div>
                {group.offers.map((offer)=>{
                  const total=guestMoney(offer.total,offer.currency,market.currency,market.locale);
                  const average=guestMoney(offer.averageNightlyTotal,offer.currency,market.currency,market.locale);
                  const firstPenalty=offer.cancellationPolicy.rules.find((rule)=>rule.amount>0)??null;
                  const penalty=firstPenalty?guestMoney(firstPenalty.amount,offer.currency,market.currency,market.locale):null;
                  return <div className="publicRateRow" key={offer.offerId}>
                    <div className="publicRateCell packageCell"><span>{ar?"الباقة":"Package"}</span><h4>{offer.boardName??offer.boardCode??(ar?"سعر المزود":"Provider rate")}</h4><div className="rateBadges">{offer.freeCancellationNow&&<span className="rateBadge success">{ar?"إلغاء مجاني الآن":"Free cancellation now"}</span>}{offer.availableToSell<=3&&<span className="rateBadge warning">{ar?`متبقي ${offer.availableToSell}`:`${offer.availableToSell} left`}</span>}</div></div>
                    <div className="publicRateCell"><span>{ar?"الإلغاء":"Cancellation"}</span><h4 className="rateCancellationTitle">{offer.cancellationPolicy.name}</h4><p className={offer.freeCancellationNow?"positiveText":"ratePenalty"}>{offer.freeCancellationNow?<><CircleCheck size={13}/> {ar?"إلغاء مجاني حالياً":"Free cancellation right now"}</>:penalty?`${ar?"غرامة حالية":"Current penalty"} ${penalty.text}`:(ar?"تطبق سياسة المزود":"Provider policy applies")}</p></div>
                    <div className="publicRateCell"><span>{ar?"يشمل":"Includes"}</span><div className="rateFeatureChips"><span><Utensils size={12}/>{offer.boardName??offer.boardCode??(ar?"خطة المزود":"Provider plan")}</span><span><CreditCard size={12}/>{ar?"الدفع الآن":"Pay now"}</span></div><p className="rateReward"><BadgeCheck size={13}/>{ar?"إعادة فحص السعر عبر Prebook":"Price rechecked by prebook"}</p></div>
                    <div className="publicRateAction"><span>{ar?"الإجمالي النهائي":"Final stay total"}</span><div className="ratePrice"><strong>{total.converted?`${ar?"حوالي":"approx."} ${total.text}`:total.text}</strong><small>{nights} {nights===1?(ar?"ليلة":"night"):(ar?"ليالي":"nights")}</small></div><small>{average.converted?`${ar?"حوالي":"approx."} ${average.text}`:average.text} {ar?"متوسط الليلة":"average / night"}</small>{total.converted&&<small className="fxSourceAmount">{total.sourceText} · {ar?"يتم الحجز بعملة المزود الأصلية":"booking is charged in the provider currency"}</small>}{offer.availableToSell<=3&&<span className="rateInventory">{ar?`متبقي ${offer.availableToSell} فقط`:`Only ${offer.availableToSell} left`}</span>}<Link className="bookRateButton" href={checkoutHref(hotel.providerHotelCode,offer.offerId,stay)}>{ar?"اختر هذه الغرفة":"Choose this room"}</Link></div>
                  </div>;
                })}
              </section>
            </article>;
          })}</div>}
        </div>

        {cheapest&&cheapestMoney&&<aside className="hotelBookingRail">
          <div className="hotelRailTop"><span>{ar?"أفضل سعر مباشر من Nuitee":"Best live Nuitee rate"}</span><strong>{cheapestMoney.converted?`${ar?"حوالي":"approx."} ${cheapestMoney.text}`:cheapestMoney.text}</strong>{cheapestMoney.converted&&<small>{cheapestMoney.sourceText}</small>}<small>{nights} {nights===1?(ar?"ليلة":"night"):(ar?"ليالي":"nights")}</small></div>
          <div className="hotelRailBody"><div className="hotelRailFacts"><div><span>{ar?"الوصول":"Check-in"}</span><strong>{stay.arrival}</strong></div><div><span>{ar?"المغادرة":"Check-out"}</span><strong>{stay.departure}</strong></div><div><span>{ar?"الضيوف":"Guests"}</span><strong>{guestCount}</strong></div><div><span>{ar?"الأسعار المباشرة":"Live rates"}</span><strong>{hotel.offers.length}</strong></div></div><div><a className="hotelRailButton" href="#room-offers">{ar?"شاهد الغرف والأسعار":"See rooms & rates"}</a><div className="hotelRailTrust"><span><BadgeCheck size={13}/>{ar?"Nuitee Connect مباشر":"Live Nuitee Connect"}</span><span><ShieldCheck size={13}/>{ar?"السعر يعاد فحصه قبل الدفع":"Price rechecked before payment"}</span></div></div></div>
        </aside>}
      </div>

      <div className="hotelInfoGrid"><div className="hotelAbout"><span className="eyebrow">{ar?"الفندق":"The property"}</span><h2>{ar?`عن ${hotel.name}`:`About ${hotel.name}`}</h2>{hotel.description?<p>{hotel.description}</p>:<p className="muted">{ar?"لم يرسل المزود وصفاً تفصيلياً لهذا الفندق.":"The provider has not supplied a detailed property description."}</p>}</div><aside className="hotelFacilities"><span className="eyebrow">{ar?"المرافق":"Facilities"}</span><div>{hotel.amenities.length?hotel.amenities.slice(0,18).map((amenity)=><span key={amenity.code}>{amenity.name}</span>):<p className="muted">{ar?"المرافق غير متاحة من المزود حالياً.":"Facility details are not available from the provider right now."}</p>}</div></aside></div>
    </section>
  </main>;
}

function groupOffers(offers:readonly NuiteeOffer[]):RoomGroup[]{
  const groups=new Map<string,{roomName:string;offers:NuiteeOffer[]}>();
  for(const offer of offers){
    const key=offer.mappedRoomId?.trim()||offer.roomName.trim().toLowerCase();
    const current=groups.get(key);
    if(current)current.offers.push(offer);else groups.set(key,{roomName:offer.roomName,offers:[offer]});
  }
  return [...groups.entries()].map(([key,value])=>({key,roomName:value.roomName,offers:value.offers}));
}
function checkoutHref(hotelId:string,offerId:string,stay:Stay){const q=new URLSearchParams({hotelId,offerId,arrival:stay.arrival,departure:stay.departure,adults:String(stay.adults),children:String(stay.children)});for(const age of stay.childrenAges??[])q.append("childrenAge",String(age));return `/nuitee-checkout?${q.toString()}`;}
function stayQuery(stay:Stay){const q=new URLSearchParams({arrival:stay.arrival,departure:stay.departure,adults:String(stay.adults),children:String(stay.children)});for(const age of stay.childrenAges??[])q.append("childrenAge",String(age));return q.toString();}
function stayNights(arrival:string,departure:string){return Math.max(1,Math.round((Date.parse(`${departure}T00:00:00.000Z`)-Date.parse(`${arrival}T00:00:00.000Z`))/86_400_000));}
