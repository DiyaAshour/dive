import type { getPublicHotelDetails } from "./service";
import type { getPublicHotelSeoDetails } from "./seo";
import type { getPublicHotelReviews } from "../reviews/service";
import type { getPublicHotelGallery } from "../media/public-gallery";

type StayInput = Readonly<{arrival:string;departure:string;adults:number;children:number}>;
type DemoSeed = Readonly<{slug:string;name:string;city:string;area:string;stars:number;base:number;amenities:readonly string[]}>;

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
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=82",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1600&q=82",
] as const;

const AMENITY_NAMES: Record<string,string> = {
  WIFI:"Free Wi-Fi",BREAKFAST:"Breakfast",PARKING:"Parking",GYM:"Fitness centre",POOL:"Swimming pool",SPA:"Spa",AIRPORT_SHUTTLE:"Airport shuttle",FAMILY_ROOMS:"Family rooms",BUSINESS_CENTER:"Business centre",RESTAURANT:"Restaurant",ROOM_SERVICE:"Room service",ROOFTOP:"Rooftop terrace",PLAY_AREA:"Children's play area",BEACH_SHUTTLE:"Beach shuttle",BEACH_ACCESS:"Beach access",MARINA:"Marina access",WATER_SPORTS:"Water sports",TERRACE:"Terrace",
};

const CITY_LOCATION: Record<string,{latitude:number;longitude:number}> = {
  Amman:{latitude:31.9539,longitude:35.9106},Aqaba:{latitude:29.5321,longitude:35.0063},Petra:{latitude:30.3222,longitude:35.4793},"Dead Sea":{latitude:31.7194,longitude:35.5860},
};

function amenity(code:string){return {code,name:AMENITY_NAMES[code]??code,category:null};}
function hotelSeed(identifier:string){return DEMO_HOTELS.find((hotel)=>hotel.slug===identifier)??null;}
function nights(arrival:string,departure:string){const value=Math.round((Date.parse(`${departure}T00:00:00Z`)-Date.parse(`${arrival}T00:00:00Z`))/86_400_000);return Number.isFinite(value)&&value>0?value:1;}
function photosFor(hotel:DemoSeed){const index=Math.max(0,DEMO_HOTELS.findIndex((item)=>item.slug===hotel.slug));return Array.from({length:8},(_,position)=>({url:PHOTO_POOL[(index*3+position)%PHOTO_POOL.length]!,alt:`Demo photo for ${hotel.name}`,sortOrder:position}));}
function makeOffer(hotel:DemoSeed,stay:StayInput,room:"classic"|"suite",rate:"flex"|"saver"){
  const stayNights=nights(stay.arrival,stay.departure);
  const suite=room==="suite";
  const saver=rate==="saver";
  const nightlyBase=hotel.base*(suite?1.48:1)*(saver?0.9:1);
  const base=Number((nightlyBase*stayNights).toFixed(2));
  const service=Number((base*0.05).toFixed(2));
  const tax=Number(((base+service)*0.08).toFixed(2));
  const total=Number((base+service+tax).toFixed(2));
  const roomId=`${hotel.slug}-${room}`;
  const roomName=suite?"Family Suite":"Classic King";
  const roomPhotos=photosFor(hotel).slice(suite?4:1,suite?8:4);
  return {
    roomTypeId:roomId,roomName,roomDescription:suite?"A larger fictional demo suite with a separate living area, family-ready sleeping setup and private bathroom.":"A polished fictional demo king room with a private bathroom, work area and contemporary essentials.",unitType:suite?"SUITE":"ROOM",quantity:suite?6:10,maxGuests:suite?5:3,maxAdults:suite?3:2,maxChildren:suite?2:1,maxInfants:1,bedroomCount:1,livingRoomCount:suite?1:0,bathroomCount:suite?2:1,privateBathroom:true,sizeValue:suite?62:34,sizeUnit:"SQM",smokingPolicy:"NON_SMOKING",extraBedCount:suite?1:0,cribCount:1,allowsCribAndExtraBed:true,beds:suite?[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0},{area:"Living room",type:"SOFA_BED",quantity:1,sortOrder:1}]:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0}],roomAmenities:[amenity("WIFI"),{code:"AIR_CONDITIONING",name:"Air conditioning",category:"Comfort"},{code:"FLAT_SCREEN_TV",name:"Flat-screen TV",category:"Media"}],roomPhotos,
    ratePlanId:`${roomId}-${rate}`,ratePlanName:saver?"Saver Rate":"Flexible Breakfast",ratePlanCode:saver?"SAVER":"FLEX_BB",mealPlan:saver?"ROOM_ONLY":"BREAKFAST",promotion:saver?{id:`${hotel.slug}-promo`,name:"Demo Saver",discountPercent:10}:null,paymentModes:saver?["PAY_NOW"] as ("PAY_NOW"|"PAY_AT_HOTEL")[]:["PAY_NOW","PAY_AT_HOTEL"] as ("PAY_NOW"|"PAY_AT_HOTEL")[],cancellationPolicy:{name:saver?"Non-refundable":"Flexible",noShowPenaltyType:"FIRST_NIGHT",noShowPenaltyValue:1,rules:[]},cancellationNow:{daysBeforeArrival:0,penaltyType:saver?("FULL_STAY" as const):("NONE" as const),penaltyAmount:saver?total:0,refundableAmount:saver?0:total,rule:"CANCELLATION" as const},freeCancellationNow:!saver,availableToSell:suite?3:6,nightly:[],amounts:{base,service,tax,total},total,averageNightlyTotal:Number((total/stayNights).toFixed(2)),
  };
}

export function getDemoHotelDetails(identifier:string,stay:StayInput):Awaited<ReturnType<typeof getPublicHotelDetails>>|null {
  const hotel=hotelSeed(identifier);if(!hotel)return null;
  const location=CITY_LOCATION[hotel.city]??null;
  const photos=photosFor(hotel);
  return {
    id:hotel.slug,slug:hotel.slug,name:hotel.name,city:hotel.city,countryCode:"JO",address:`${hotel.area}, ${hotel.city}, Jordan`,area:hotel.area,description:`${hotel.name} is a fictional HandMeKey demo property in ${hotel.area}, ${hotel.city}. It is shown for product testing and presentation only.`,starRating:hotel.stars,reviewSummary:{count:0,overall:null},location,checkInTime:"15:00",checkOutTime:"12:00",timezone:"Asia/Amman",currency:"JOD",photos,amenities:hotel.amenities.map(amenity),stay:{arrival:stay.arrival,departure:stay.departure,nights:nights(stay.arrival,stay.departure),adults:stay.adults,children:stay.children},offers:[makeOffer(hotel,stay,"classic","flex"),makeOffer(hotel,stay,"classic","saver"),makeOffer(hotel,stay,"suite","flex"),makeOffer(hotel,stay,"suite","saver")],
  } as Awaited<ReturnType<typeof getPublicHotelDetails>>;
}

export function getDemoHotelReviews(identifier:string):Awaited<ReturnType<typeof getPublicHotelReviews>>|null {
  if(!hotelSeed(identifier))return null;
  return {summary:{count:0,overall:null,cleanliness:null,staff:null,location:null,facilities:null,comfort:null,value:null},reviews:[]} as Awaited<ReturnType<typeof getPublicHotelReviews>>;
}

export function getDemoHotelSeoDetails(identifier:string):Awaited<ReturnType<typeof getPublicHotelSeoDetails>>|null {
  const hotel=hotelSeed(identifier);if(!hotel)return null;
  const location=CITY_LOCATION[hotel.city]??null;
  return {id:hotel.slug,slug:hotel.slug,name:hotel.name,city:hotel.city,area:hotel.area,address:`${hotel.area}, ${hotel.city}, Jordan`,countryCode:"JO",description:`${hotel.name} is a fictional HandMeKey demo property in ${hotel.area}, ${hotel.city}.`,starRating:hotel.stars,location,updatedAt:new Date(0),photos:photosFor(hotel).map((photo)=>({url:photo.url,alt:photo.alt})),amenities:hotel.amenities.map((code)=>({code,name:AMENITY_NAMES[code]??code})),reviewSummary:{count:0,overall:null},primaryDestination:{slug:hotel.city.toLowerCase().replace(/\s+/g,"-"),countryCode:"JO",nameEn:hotel.city,nameAr:hotel.city==="Amman"?"عمّان":hotel.city==="Aqaba"?"العقبة":hotel.city==="Petra"?"البتراء":"البحر الميت",type:"CITY"}} as Awaited<ReturnType<typeof getPublicHotelSeoDetails>>;
}

export function getDemoHotelGallery(identifier:string):Awaited<ReturnType<typeof getPublicHotelGallery>>|null {
  const hotel=hotelSeed(identifier);if(!hotel)return null;
  return photosFor(hotel).map((photo,index)=>({id:`${hotel.slug}-photo-${index+1}`,url:photo.url,alt:photo.alt,sortOrder:index,roomTypeId:null,category:"OTHER"})) as Awaited<ReturnType<typeof getPublicHotelGallery>>;
}
