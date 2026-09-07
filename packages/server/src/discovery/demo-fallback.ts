import type { DiscoverySearchInput } from "@platform/contracts";

type DemoSeed = Readonly<{
  slug: string;
  name: string;
  city: string;
  area: string;
  stars: number;
  base: number;
  amenities: readonly string[];
}>;

const DEMO_HOTELS: readonly DemoSeed[] = [
  {slug:"demo-citadel-house-amman",name:"Citadel House Amman",city:"Amman",area:"Jabal Al Qala'a",stars:4,base:72,amenities:["WIFI","BREAKFAST","PARKING","AIRPORT_SHUTTLE","RESTAURANT","ROOFTOP"]},
  {slug:"demo-olive-crown-amman",name:"Olive Crown Hotel",city:"Amman",area:"Shmeisani",stars:4,base:78,amenities:["WIFI","BREAKFAST","GYM","PARKING","BUSINESS_CENTER","ROOM_SERVICE"]},
  {slug:"demo-seven-hills-amman",name:"Seven Hills Residence",city:"Amman",area:"Abdoun",stars:5,base:118,amenities:["WIFI","BREAKFAST","GYM","POOL","PARKING","FAMILY_ROOMS","ROOM_SERVICE"]},
  {slug:"demo-abdali-gate-amman",name:"Abdali Gate Hotel",city:"Amman",area:"Al Abdali",stars:5,base:132,amenities:["WIFI","BREAKFAST","GYM","BUSINESS_CENTER","PARKING","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-jabal-view-suites-amman",name:"Jabal View Suites",city:"Amman",area:"Jabal Amman",stars:4,base:84,amenities:["WIFI","BREAKFAST","FAMILY_ROOMS","PARKING","ROOFTOP","AIRPORT_SHUTTLE"]},
  {slug:"demo-cedar-court-amman",name:"Cedar Court Amman",city:"Amman",area:"Sweifieh",stars:4,base:81,amenities:["WIFI","BREAKFAST","GYM","PARKING","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-royal-stone-amman",name:"Royal Stone Amman",city:"Amman",area:"Um Uthaina",stars:5,base:126,amenities:["WIFI","BREAKFAST","GYM","SPA","PARKING","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-lantern-house-amman",name:"Lantern House Hotel",city:"Amman",area:"Rainbow Street",stars:3,base:61,amenities:["WIFI","BREAKFAST","AIRPORT_SHUTTLE","ROOFTOP","RESTAURANT"]},
  {slug:"demo-garden-stay-amman",name:"Amman Garden Stay",city:"Amman",area:"Khalda",stars:4,base:75,amenities:["WIFI","BREAKFAST","FAMILY_ROOMS","PARKING","PLAY_AREA","ROOM_SERVICE"]},
  {slug:"demo-blue-arch-amman",name:"Blue Arch Hotel Amman",city:"Amman",area:"Dabouq",stars:4,base:92,amenities:["WIFI","BREAKFAST","POOL","PARKING","FAMILY_ROOMS","RESTAURANT"]},
  {slug:"demo-capital-terrace-amman",name:"Capital Terrace Hotel",city:"Amman",area:"Al Rabieh",stars:4,base:88,amenities:["WIFI","BREAKFAST","GYM","BUSINESS_CENTER","ROOFTOP","ROOM_SERVICE"]},
  {slug:"demo-wadi-grand-amman",name:"Wadi Grand Amman",city:"Amman",area:"7th Circle",stars:5,base:109,amenities:["WIFI","BREAKFAST","GYM","POOL","PARKING","SPA","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-coral-gate-aqaba",name:"Coral Gate Aqaba",city:"Aqaba",area:"City Centre",stars:4,base:96,amenities:["WIFI","BREAKFAST","POOL","PARKING","RESTAURANT","BEACH_SHUTTLE","FAMILY_ROOMS"]},
  {slug:"demo-red-sea-lantern-aqaba",name:"Red Sea Lantern",city:"Aqaba",area:"Marina District",stars:4,base:102,amenities:["WIFI","BREAKFAST","POOL","FAMILY_ROOMS","MARINA","RESTAURANT","BEACH_SHUTTLE"]},
  {slug:"demo-marina-house-aqaba",name:"Aqaba Marina House",city:"Aqaba",area:"South Beach",stars:5,base:148,amenities:["WIFI","BREAKFAST","POOL","SPA","PARKING","BEACH_ACCESS","RESTAURANT","WATER_SPORTS"]},
  {slug:"demo-gulf-view-aqaba",name:"Gulf View Suites Aqaba",city:"Aqaba",area:"Ayla District",stars:5,base:139,amenities:["WIFI","BREAKFAST","POOL","GYM","FAMILY_ROOMS","MARINA","RESTAURANT","BEACH_ACCESS"]},
  {slug:"demo-rose-canyon-petra",name:"Rose Canyon Hotel",city:"Petra",area:"Wadi Musa",stars:4,base:89,amenities:["WIFI","BREAKFAST","PARKING","AIRPORT_SHUTTLE","RESTAURANT","TERRACE"]},
  {slug:"demo-nabataean-gate-petra",name:"Nabataean Gate Inn",city:"Petra",area:"Wadi Musa",stars:3,base:67,amenities:["WIFI","BREAKFAST","PARKING","RESTAURANT","TERRACE"]},
  {slug:"demo-salt-shore-dead-sea",name:"Salt Shore Resort",city:"Dead Sea",area:"Sweimeh",stars:5,base:156,amenities:["WIFI","BREAKFAST","POOL","SPA","GYM","PARKING","BEACH_ACCESS","RESTAURANT","FAMILY_ROOMS"]},
  {slug:"demo-lowest-point-retreat",name:"Lowest Point Retreat",city:"Dead Sea",area:"Sweimeh",stars:4,base:121,amenities:["WIFI","BREAKFAST","POOL","FAMILY_ROOMS","PARKING","BEACH_ACCESS","RESTAURANT","SPA"]},
];

const PHOTO_POOL = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1600&q=82",
] as const;

const AMENITIES: Record<string,string> = {
  WIFI:"Free Wi-Fi",BREAKFAST:"Breakfast",PARKING:"Parking",GYM:"Fitness centre",POOL:"Swimming pool",SPA:"Spa",AIRPORT_SHUTTLE:"Airport shuttle",FAMILY_ROOMS:"Family rooms",BUSINESS_CENTER:"Business centre",RESTAURANT:"Restaurant",ROOM_SERVICE:"Room service",ROOFTOP:"Rooftop terrace",PLAY_AREA:"Children's play area",BEACH_SHUTTLE:"Beach shuttle",BEACH_ACCESS:"Beach access",MARINA:"Marina access",WATER_SPORTS:"Water sports",TERRACE:"Terrace",
};

function normalized(value:string){return value.trim().toLowerCase().replace(/\s+/g," ");}
function cityFor(value:string){
  const query=normalized(value);
  if(["amman","عمّان","عمان"].includes(query)) return "Amman";
  if(["aqaba","العقبة","عقبة"].includes(query)) return "Aqaba";
  if(["petra","البتراء","بترا"].includes(query)) return "Petra";
  if(["dead sea","البحر الميت"].includes(query)) return "Dead Sea";
  return null;
}
function nightCount(arrival:string,departure:string){
  const diff=Date.parse(`${departure}T00:00:00Z`)-Date.parse(`${arrival}T00:00:00Z`);
  return Number.isFinite(diff)&&diff>0?Math.max(1,Math.round(diff/86_400_000)):1;
}
function amenity(code:string){return {code,name:AMENITIES[code]??code,category:null};}

export function demoSearchFallback(input:DiscoverySearchInput){
  const city=cityFor(input.destination);
  const query=normalized(input.destination);
  const nights=nightCount(input.arrival,input.departure);
  let results=DEMO_HOTELS.map((hotel,index)=>{
    const averageNightlyTotal=Number((hotel.base*0.88).toFixed(2));
    const total=Number((averageNightlyTotal*nights).toFixed(2));
    return {
      id:hotel.slug,
      slug:hotel.slug,
      name:hotel.name,
      city:hotel.city,
      countryCode:"JO",
      area:hotel.area,
      starRating:hotel.stars,
      reviewSummary:{count:0,overall:null as number|null},
      currency:"JOD",
      coverPhoto:{url:PHOTO_POOL[(index*3)%PHOTO_POOL.length]!,alt:`Demo photo for ${hotel.name}`,sortOrder:0},
      amenities:hotel.amenities.map(amenity),
      availableOffers:2,
      from:{
        roomTypeId:`${hotel.slug}-classic`,roomName:"Classic King",roomDescription:"Demo room",unitType:"ROOM",quantity:10,maxGuests:3,maxAdults:2,maxChildren:1,maxInfants:1,bedroomCount:1,livingRoomCount:0,bathroomCount:1,privateBathroom:true,sizeValue:32,sizeUnit:"SQM",smokingPolicy:"NON_SMOKING",extraBedCount:0,cribCount:1,allowsCribAndExtraBed:true,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0}],roomAmenities:[amenity("WIFI")],roomPhotos:[],
        ratePlanId:`${hotel.slug}-flex`,ratePlanName:"Flexible Breakfast",ratePlanCode:"FLEX_BB",mealPlan:"BREAKFAST",promotion:{id:`${hotel.slug}-promo`,name:"Demo Saver",discountPercent:12},paymentModes:["PAY_NOW","PAY_AT_HOTEL"] as ("PAY_NOW"|"PAY_AT_HOTEL")[],cancellationPolicy:{name:"Flexible",noShowPenaltyType:"FIRST_NIGHT",noShowPenaltyValue:1,rules:[]},cancellationNow:{penaltyAmount:0,refundableAmount:total,reason:"Free cancellation in demo mode"},freeCancellationNow:true,availableToSell:4+(index%6),nightly:[],amounts:{base:total,service:0,tax:0,total},total,averageNightlyTotal,
      },
    };
  }).filter((hotel)=>{
    const destinationMatches=city?hotel.city===city:!query||[hotel.name,hotel.city,hotel.area].some((value)=>normalized(value).includes(query));
    if(!destinationMatches) return false;
    if(input.stars.length&&!input.stars.includes(hotel.starRating)) return false;
    if(input.amenities.length&&!input.amenities.every((code)=>hotel.amenities.some((item)=>item.code===code))) return false;
    if(input.paymentMode&&!hotel.from.paymentModes.includes(input.paymentMode)) return false;
    if(input.freeCancellation&&!hotel.from.freeCancellationNow) return false;
    if(input.minPrice!==undefined&&hotel.from.averageNightlyTotal<input.minPrice) return false;
    if(input.maxPrice!==undefined&&hotel.from.averageNightlyTotal>input.maxPrice) return false;
    return true;
  });

  if(input.sort==="PRICE_ASC") results.sort((a,b)=>a.from.averageNightlyTotal-b.from.averageNightlyTotal);
  else if(input.sort==="PRICE_DESC") results.sort((a,b)=>b.from.averageNightlyTotal-a.from.averageNightlyTotal);
  else if(input.sort==="STARS_DESC") results.sort((a,b)=>b.starRating-a.starRating);

  const pageSize=Math.max(1,Math.min(input.pageSize,50));
  const sliced=results.slice(0,pageSize);
  const labels:Record<string,{slug:string;nameAr:string}>={Amman:{slug:"amman",nameAr:"عمّان"},Aqaba:{slug:"aqaba",nameAr:"العقبة"},Petra:{slug:"petra",nameAr:"البتراء"},"Dead Sea":{slug:"dead-sea",nameAr:"البحر الميت"}};
  const destination=city?{id:`demo-destination-${labels[city]!.slug}`,slug:labels[city]!.slug,type:"CITY" as const,countryCode:"JO",nameEn:city,nameAr:labels[city]!.nameAr}:null;

  return {
    query:input,
    resolvedDestination:destination,
    count:sliced.length,
    candidateCount:results.length,
    results:sliced,
    pagination:{pageSize,scanned:results.length,offset:0,nextCursor:null as string|null,hasMore:false},
  };
}
