import Link from "next/link";
import {BadgeCheck, BedDouble, ChevronLeft, CircleCheck, CreditCard, Image as ImageIcon, MapPin, Ruler, ShieldCheck, Star, UserRound, Utensils} from "lucide-react";
import type {NuiteeHotelDetails, NuiteeOffer} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {guestMoney} from "@/lib/guest-currency";
import type {GuestCurrency,GuestLocale} from "@/lib/guest-market";

type Stay=Readonly<{arrival:string;departure:string;adults:number;children:number;childrenAges?:readonly number[]}>;
type Market=Readonly<{locale:GuestLocale;currency:GuestCurrency;intlLocale:string;direction:"ltr"|"rtl"}>;
type RoomContent=NuiteeHotelDetails["rooms"][number];
type RoomGroup=Readonly<{key:string;roomName:string;mappedRoomId:string|null;room:RoomContent|null;offers:readonly NuiteeOffer[]}>;

export function NuiteeHotelPageV2({hotel,stay,market}:Readonly<{hotel:NuiteeHotelDetails;stay:Stay;market:Market}>) {
  const ar=market.locale==="ar";
  const groups=groupOffers(hotel.offers,hotel.rooms);
  const cheapest=hotel.offers.length?hotel.offers.reduce((best,offer)=>offer.total<best.total?offer:best):null;
  const cheapestMoney=cheapest?guestMoney(cheapest.total,cheapest.currency,market.currency,market.locale):null;
  const nights=stayNights(stay.arrival,stay.departure);
  const guestCount=stay.adults+stay.children;
  return <main className="hotelExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <section className="shell hotelDetailSection">
      <Link className="backLink" href={`/search?destination=${encodeURIComponent(hotel.city)}&${stayQuery(stay)}`}><ChevronLeft size={16}/>{ar?"العودة إلى نتائج البحث":"Back to search"}</Link>

      <div className="premiumHotelHead"><div><div className="hotelBadges"><span><BadgeCheck size={14}/>{ar?"فندق موثّق":"Verified Property"}</span>{hotel.starRating&&<span><Star size={14} fill="currentColor"/>{hotel.starRating} {ar?"نجوم":"star"}</span>}</div><h1>{hotel.name}</h1><p><MapPin size={16}/>{hotel.area?`${hotel.area}, `:""}{hotel.city}{hotel.address?` · ${hotel.address}`:""}</p>{hotel.location&&<a className="backLink" href={`https://www.google.com/maps/search/?api=1&query=${hotel.location.latitude},${hotel.location.longitude}`} target="_blank" rel="noreferrer"><MapPin size={15}/>{ar?"فتح الموقع على الخريطة":"Open location on map"}</a>}{hotel.reviewSummary.overall!==null&&<div className="hotelRatingSummary"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{ar?"تقييم الضيوف":"Guest rating"}<br/><small>{hotel.reviewSummary.count} {ar?"مراجعة":"reviews"}</small></span></div>}</div><div className="hotelQuickFacts"><div><span>{ar?"تسجيل الدخول":"Check-in"}</span><strong>{hotel.checkInTime??(ar?"حسب سياسة الفندق":"Property policy")}{hotel.checkInEndTime?` – ${hotel.checkInEndTime}`:""}</strong></div><div><span>{ar?"تسجيل الخروج":"Check-out"}</span><strong>{hotel.checkOutTime??(ar?"حسب سياسة الفندق":"Property policy")}</strong></div></div></div>

      {hotel.photos.length?<div className="premiumGallery">{hotel.photos.slice(0,5).map((photo,index)=><img className={`galleryPhoto${index+1}`} key={photo.url} src={photo.url} alt={photo.alt||hotel.name} loading={index===0?"eager":"lazy"} decoding="async"/>)}</div>:<div className="hotelMediaEmpty"><span>{ar?"صور الفندق غير متاحة حالياً":"Hotel photos are not available right now"}</span></div>}

      <div className="hotelTrustBar"><span><ShieldCheck size={17}/>{ar?"إجمالي إقامة واضح":"Clear final stay total"}</span><span><BadgeCheck size={17}/>{ar?"توفر مباشر":"Live inventory"}</span><span><BadgeCheck size={17}/>{ar?"إعادة تأكيد السعر قبل الدفع":"Price rechecked before payment"}</span></div>

      <div className="hotelInfoGrid"><div className="hotelAbout"><span className="eyebrow">{ar?"الفندق":"The property"}</span><h2>{ar?`عن ${hotel.name}`:`About ${hotel.name}`}</h2>{hotel.description?<p>{hotel.description}</p>:<p className="muted">{ar?"لا يتوفر وصف تفصيلي لهذا الفندق حالياً.":"A detailed property description is not available right now."}</p>}</div><aside className="hotelFacilities"><span className="eyebrow">{ar?"المرافق":"Facilities"}</span><div>{hotel.amenities.length?hotel.amenities.slice(0,18).map((amenity)=><span key={amenity.code}>{amenity.name}</span>):<p className="muted">{ar?"تفاصيل المرافق غير متاحة حالياً.":"Facility details are not available right now."}</p>}</div></aside></div>

      <div className="availabilityCard"><div><span className="eyebrow">{ar?"إقامتك":"Your stay"}</span><h2>{ar?"اختر التواريخ وشاهد التوفر المباشر":"Choose dates and see live availability"}</h2></div><form className="availabilityForm" method="get"><label><span>{ar?"الوصول":"Check-in"}</span><input name="arrival" type="date" defaultValue={stay.arrival} required/></label><label><span>{ar?"المغادرة":"Check-out"}</span><input name="departure" type="date" defaultValue={stay.departure} required/></label><label><span>{ar?"البالغون":"Adults"}</span><input name="adults" type="number" min="1" max="20" defaultValue={stay.adults}/></label><label><span>{ar?"الأطفال":"Children"}</span><input name="children" type="number" min="0" max="20" defaultValue={stay.children}/></label>{(stay.childrenAges??[]).map((age,index)=><input key={`${age}-${index}`} type="hidden" name="childrenAge" value={age}/>)}<button type="submit">{ar?"تحقق من التوفر":"Check availability"}</button></form></div>

      <div className="hotelBookingWorkspace">
        <div className="hotelBookingMain">
          <div className="rateSectionHead"><div><span className="eyebrow">{ar?"الغرف المتاحة":"Available rooms"}</span><h2>{hotel.offers.length} {hotel.offers.length===1?(ar?"سعر مباشر":"live rate"):(ar?"أسعار مباشرة":"live rates")}</h2><p>{nights} {nights===1?(ar?"ليلة":"night"):(ar?"ليالي":"nights")} · {ar?"الأسعار المعروضة هي إجمالي الإقامة حسب الخيار":"shown totals are for the complete stay"}</p></div>{cheapestMoney&&<div><span>{ar?"ابتداءً من":"From"}</span><strong>{cheapestMoney.converted?`${ar?"حوالي":"approx."} ${cheapestMoney.text}`:cheapestMoney.text}</strong>{cheapestMoney.converted&&<small>{cheapestMoney.sourceText}</small>}<small>{ar?"إجمالي الإقامة":"stay total"}</small></div>}</div>

          {!groups.length?<div className="premiumEmpty"><h3>{ar?"لا توجد غرف متاحة":"No rooms available"}</h3><p>{ar?"غيّر التواريخ أو عدد الضيوف وحاول مرة أخرى.":"Change the dates or guest count and try again."}</p></div>:<div className="roomOfferList" id="room-offers">{groups.map((group)=>{
            const lowInventory=Math.min(...group.offers.map((offer)=>offer.availableToSell));
            const roomPhoto=group.room?.photos[0]??null;
            return <article className="roomOfferCard" key={group.key}>
              <section className="publicRoomProduct">
                <div className="publicRoomMedia">{roomPhoto?<img src={roomPhoto.url} alt={group.roomName} loading="lazy" decoding="async"/>:<><ImageIcon size={28}/><span>{ar?"صورة الغرفة غير متاحة حالياً":"Room photo is not available right now"}</span></>}</div>
                <div className="publicRoomContent"><span className="eyebrow">{ar?"الغرفة":"Room"}</span><h3>{group.roomName}</h3><div className="publicRoomTags">{group.room?.maxOccupancy&&<span><UserRound size={14}/>{ar?`حتى ${group.room.maxOccupancy} ضيوف`:`Up to ${group.room.maxOccupancy} guests`}</span>}{group.room?.sizeValue&&<span><Ruler size={14}/>{group.room.sizeValue} {group.room.sizeUnit??"m²"}</span>}{group.room?.beds.slice(0,2).map((bed,index)=><span key={`${bed.type}-${index}`}><BedDouble size={14}/>{bed.quantity} {bed.type}</span>)}</div>{group.room?.description?<p className="publicRoomDescription">{group.room.description}</p>:<p className="publicRoomDescription">{ar?"اختر من خيارات الوجبات والإلغاء المتاحة لهذه الغرفة.":"Choose from the available meal and cancellation options for this room."}</p>}{group.room?.amenities.length?<div className="publicRoomTags">{group.room.amenities.slice(0,8).map((amenity)=><span key={amenity.code}>{amenity.name}</span>)}</div>:null}{lowInventory<=3&&<strong className="scarcityNote">{ar?`متبقي ${lowInventory} فقط لهذه التواريخ`:`Only ${lowInventory} left for these dates`}</strong>}</div>
              </section>
              <section className="publicRateOptions">
                <div className="publicRateHead"><span>{ar?"خيار الإقامة":"Stay option"}</span><span>{ar?"الإلغاء":"Cancellation"}</span><span>{ar?"الدفع":"Payment"}</span><span>{ar?"الإجمالي النهائي":"Final stay total"}</span></div>
                {group.offers.map((offer)=>{
                  const total=guestMoney(offer.total,offer.currency,market.currency,market.locale);
                  const average=guestMoney(offer.averageNightlyTotal,offer.currency,market.currency,market.locale);
                  const firstPenalty=offer.cancellationPolicy.rules.find((rule)=>rule.amount>0)??null;
                  const penalty=firstPenalty?guestMoney(firstPenalty.amount,firstPenalty.currency??offer.currency,market.currency,market.locale):null;
                  const penaltyStart=firstPenalty?.from?policyDeadline(firstPenalty.from,firstPenalty.timezone,market.locale):null;
                  const plan=stayOptionLabel(offer,ar);
                  return <div className="publicRateRow" key={offer.offerId}>
                    <div className="publicRateCell packageCell"><span>{ar?"الباقة":"Package"}</span><h4>{plan}</h4><div className="rateBadges">{offer.freeCancellationNow&&<span className="rateBadge success">{ar?"إلغاء مجاني الآن":"Free cancellation now"}</span>}{offer.availableToSell<=3&&<span className="rateBadge warning">{ar?`متبقي ${offer.availableToSell}`:`${offer.availableToSell} left`}</span>}</div>{offer.promotion&&<strong className="dealPill">{offer.promotion.discountPercent}% {ar?"خصم":"off"} · {offer.promotion.name}</strong>}</div>
                    <div className="publicRateCell"><span>{ar?"الإلغاء":"Cancellation"}</span><h4 className="rateCancellationTitle">{offer.cancellationPolicy.name}</h4><p className={offer.freeCancellationNow?"positiveText":"ratePenalty"}>{offer.freeCancellationNow?<><CircleCheck size={13}/> {penaltyStart?(ar?`إلغاء مجاني حتى ${penaltyStart}`:`Free cancellation until ${penaltyStart}`):(ar?"إلغاء مجاني حالياً":"Free cancellation right now")}</>:penalty?`${ar?"غرامة":"Penalty"} ${penalty.text}`:(ar?"تطبق سياسة الفندق":"Hotel policy applies")}</p>{firstPenalty&&<small>{ar?"تبدأ الغرامة":"Penalty starts"}: {penaltyStart??firstPenalty.from??"—"}{firstPenalty.timezone?` · ${firstPenalty.timezone}`:""}{firstPenalty.currency?` · ${firstPenalty.currency}`:""}</small>}</div>
                    <div className="publicRateCell"><span>{ar?"يتضمن":"Includes"}</span><div className="rateFeatureChips"><span><Utensils size={12}/>{plan}</span><span><CreditCard size={12}/>{ar?"دفع آمن":"Secure payment"}</span></div><p className="rateReward"><BadgeCheck size={13}/>{ar?"يتم تأكيد السعر قبل الدفع":"Price confirmed before payment"}</p></div>
                    <div className="publicRateAction"><span>{ar?"الإجمالي النهائي":"Final stay total"}</span><div className="ratePrice"><strong>{total.converted?`${ar?"حوالي":"approx."} ${total.text}`:total.text}</strong><small>{nights} {nights===1?(ar?"ليلة":"night"):(ar?"ليالي":"nights")}</small></div><small>{average.converted?`${ar?"حوالي":"approx."} ${average.text}`:average.text} {ar?"متوسط الليلة":"average / night"}</small>{total.converted&&<small className="fxSourceAmount">{total.sourceText} · {ar?"يتم الحجز بعملة المزود الأصلية":"booking is charged in the provider currency"}</small>}{offer.availableToSell<=3&&<span className="rateInventory">{ar?`متبقي ${offer.availableToSell} فقط`:`Only ${offer.availableToSell} left`}</span>}<Link prefetch={false} className="bookRateButton" href={checkoutHref(hotel.providerHotelCode,offer.offerId,stay)}>{ar?"اختر":"Choose"}</Link></div>
                  </div>;
                })}
              </section>
            </article>;
          })}</div>}
        </div>

        {cheapest&&cheapestMoney&&<aside className="hotelBookingRail">
          <div className="hotelRailTop"><span>{ar?"أفضل سعر مباشر":"Best live rate"}</span><strong>{cheapestMoney.converted?`${ar?"حوالي":"approx."} ${cheapestMoney.text}`:cheapestMoney.text}</strong>{cheapestMoney.converted&&<small>{cheapestMoney.sourceText}</small>}<small>{nights} {nights===1?(ar?"ليلة":"night"):(ar?"ليالي":"nights")}</small></div>
          <div className="hotelRailBody"><div className="hotelRailFacts"><div><span>{ar?"الوصول":"Check-in"}</span><strong>{stay.arrival}</strong></div><div><span>{ar?"المغادرة":"Check-out"}</span><strong>{stay.departure}</strong></div><div><span>{ar?"الضيوف":"Guests"}</span><strong>{guestCount}</strong></div><div><span>{ar?"أنواع الغرف":"Room types"}</span><strong>{groups.length}</strong></div></div><div><a className="hotelRailButton" href="#room-offers">{ar?"شاهد الغرف والخيارات":"See rooms & options"}</a><div className="hotelRailTrust"><span><BadgeCheck size={13}/>{ar?"توفر مباشر":"Live inventory"}</span><span><ShieldCheck size={13}/>{ar?"تأكيد السعر قبل الدفع":"Price confirmed before payment"}</span></div></div></div>
        </aside>}
      </div>

      {(hotel.importantInformation||hotel.checkInInstructions.length>0||hotel.checkInSpecialInstructions)&&<div className="hotelInfoGrid"><div className="hotelAbout"><span className="eyebrow">{ar?"معلومات مهمة":"Important information"}</span><h2>{ar?"قبل الوصول":"Before you arrive"}</h2>{hotel.importantInformation&&<p>{hotel.importantInformation}</p>}{hotel.checkInInstructions.map((instruction,index)=><p key={`${instruction}-${index}`}>{instruction}</p>)}{hotel.checkInSpecialInstructions&&<p>{hotel.checkInSpecialInstructions}</p>}</div></div>}
    </section>
  </main>;
}

function groupOffers(offers:readonly NuiteeOffer[],rooms:readonly RoomContent[]):RoomGroup[]{
  const roomById=new Map(rooms.map((room)=>[room.id.trim(),room] as const));
  const groups=new Map<string,{roomName:string;mappedRoomId:string|null;room:RoomContent|null;offers:NuiteeOffer[]}>();
  for(const offer of offers){
    const mapped=offer.mappedRoomId?.trim()||null;
    // Nuitee documents mappedRoomId as the exact join key to hotel data rooms[].id.
    // Never guess a room image by name when a mapping is missing or does not join:
    // showing no image is safer than attaching another room's photo.
    const matchedRoom=mapped?(roomById.get(mapped)??null):null;
    const key=mapped?`mapped:${mapped}`:`name:${normalizeRoomName(offer.roomName)}`;
    const current=groups.get(key);
    if(current)current.offers.push(offer);else groups.set(key,{roomName:offer.roomName,mappedRoomId:mapped,room:matchedRoom,offers:[offer]});
  }
  return [...groups.entries()].map(([key,value])=>({key,...value,offers:value.offers.sort((left,right)=>optionSort(left)-optionSort(right)||left.total-right.total)}));
}

function stayOptionLabel(offer:NuiteeOffer,ar:boolean):string{
  const code=(offer.boardCode??"").trim().toUpperCase();
  const name=(offer.boardName??"").trim();
  if(code==="RO"||/room only|without breakfast|no breakfast/i.test(name))return ar?"غرفة فقط":"Room only";
  if(code==="BB"||/breakfast/i.test(name))return ar?"غرفة + إفطار":"Room + breakfast";
  if(code==="HB"||/half board/i.test(name))return ar?"نصف إقامة":"Half board";
  if(code==="FB"||/full board/i.test(name))return ar?"إقامة كاملة":"Full board";
  if(code==="AI"||/all inclusive/i.test(name))return ar?"شامل كلياً":"All inclusive";
  return name||code||(ar?"خيار إقامة":"Stay option");
}
function policyDeadline(value:string,timezone:string|null,locale:GuestLocale):string{
  const parsed=Date.parse(value);
  if(!Number.isFinite(parsed))return value;
  try{return new Intl.DateTimeFormat(locale==="ar"?"ar-JO":"en-GB",{dateStyle:"medium",timeStyle:"short",...(timezone?{timeZone:timezone}: {})}).format(new Date(parsed));}catch{return value;}
}
function optionSort(offer:NuiteeOffer):number{const code=(offer.boardCode??"").toUpperCase();if(code==="RO")return 0;if(code==="BB")return 1;if(code==="HB")return 2;if(code==="FB")return 3;if(code==="AI")return 4;return 5;}
function normalizeRoomName(value:string):string{return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");}
function checkoutHref(hotelId:string,offerId:string,stay:Stay){const q=new URLSearchParams({hotelId,offerId,arrival:stay.arrival,departure:stay.departure,adults:String(stay.adults),children:String(stay.children)});for(const age of stay.childrenAges??[])q.append("childrenAge",String(age));return `/nuitee-checkout?${q.toString()}`;}
function stayQuery(stay:Stay){const q=new URLSearchParams({arrival:stay.arrival,departure:stay.departure,adults:String(stay.adults),children:String(stay.children)});for(const age of stay.childrenAges??[])q.append("childrenAge",String(age));return q.toString();}
function stayNights(arrival:string,departure:string){return Math.max(1,Math.round((Date.parse(`${departure}T00:00:00.000Z`)-Date.parse(`${arrival}T00:00:00.000Z`))/86_400_000));}
