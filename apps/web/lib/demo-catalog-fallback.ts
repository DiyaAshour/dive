type DemoHotelSeed = Readonly<{
  slug: string;
  name: string;
  city: string;
  area: string;
  stars: number;
  base: number;
  tagline: string;
  amenities: readonly string[];
}>;

const HOTEL_SEEDS: readonly DemoHotelSeed[] = [
  {slug:"demo-citadel-house-amman",name:"Citadel House Amman",city:"Amman",area:"Jabal Al Qala'a",stars:4,base:72,tagline:"Historic-city views, a calm urban base and easy access to downtown Amman.",amenities:["WIFI","BREAKFAST","PARKING","AIRPORT_SHUTTLE","RESTAURANT","ROOFTOP"]},
  {slug:"demo-olive-crown-amman",name:"Olive Crown Hotel",city:"Amman",area:"Shmeisani",stars:4,base:78,tagline:"A polished business stay with practical workspaces and central Amman access.",amenities:["WIFI","BREAKFAST","GYM","PARKING","BUSINESS_CENTER","ROOM_SERVICE"]},
  {slug:"demo-seven-hills-amman",name:"Seven Hills Residence",city:"Amman",area:"Abdoun",stars:5,base:118,tagline:"Larger residential-style stays for guests who want space, privacy and premium comfort.",amenities:["WIFI","BREAKFAST","GYM","POOL","PARKING","FAMILY_ROOMS","ROOM_SERVICE"]},
  {slug:"demo-abdali-gate-amman",name:"Abdali Gate Hotel",city:"Amman",area:"Al Abdali",stars:5,base:132,tagline:"A modern city hotel designed around Abdali, business travel and high-comfort short stays.",amenities:["WIFI","BREAKFAST","GYM","BUSINESS_CENTER","PARKING","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-jabal-view-suites-amman",name:"Jabal View Suites",city:"Amman",area:"Jabal Amman",stars:4,base:84,tagline:"A boutique hillside stay close to cafés, galleries and the character of Jabal Amman.",amenities:["WIFI","BREAKFAST","FAMILY_ROOMS","PARKING","ROOFTOP","AIRPORT_SHUTTLE"]},
  {slug:"demo-cedar-court-amman",name:"Cedar Court Amman",city:"Amman",area:"Sweifieh",stars:4,base:81,tagline:"A convenient west-Amman base with shopping, dining and flexible room choices nearby.",amenities:["WIFI","BREAKFAST","GYM","PARKING","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-royal-stone-amman",name:"Royal Stone Amman",city:"Amman",area:"Um Uthaina",stars:5,base:126,tagline:"A quieter luxury address with spa-led comfort and generous premium rooms.",amenities:["WIFI","BREAKFAST","GYM","SPA","PARKING","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-lantern-house-amman",name:"Lantern House Hotel",city:"Amman",area:"Rainbow Street",stars:3,base:61,tagline:"A compact, walkable stay for travelers who want Rainbow Street and old Amman close by.",amenities:["WIFI","BREAKFAST","AIRPORT_SHUTTLE","ROOFTOP","RESTAURANT"]},
  {slug:"demo-garden-stay-amman",name:"Amman Garden Stay",city:"Amman",area:"Khalda",stars:4,base:75,tagline:"A relaxed family-friendly stay with larger units and easy west-Amman access.",amenities:["WIFI","BREAKFAST","FAMILY_ROOMS","PARKING","PLAY_AREA","ROOM_SERVICE"]},
  {slug:"demo-blue-arch-amman",name:"Blue Arch Hotel Amman",city:"Amman",area:"Dabouq",stars:4,base:92,tagline:"A quieter leisure stay with pool time, open spaces and room to slow down.",amenities:["WIFI","BREAKFAST","POOL","PARKING","FAMILY_ROOMS","RESTAURANT"]},
  {slug:"demo-capital-terrace-amman",name:"Capital Terrace Hotel",city:"Amman",area:"Al Rabieh",stars:4,base:88,tagline:"A practical city hotel pairing work-friendly rooms with a central Rabieh location.",amenities:["WIFI","BREAKFAST","GYM","BUSINESS_CENTER","ROOFTOP","ROOM_SERVICE"]},
  {slug:"demo-wadi-grand-amman",name:"Wadi Grand Amman",city:"Amman",area:"7th Circle",stars:5,base:109,tagline:"A full-service premium stay with pool, spa and flexible room products near 7th Circle.",amenities:["WIFI","BREAKFAST","GYM","POOL","PARKING","SPA","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-coral-gate-aqaba",name:"Coral Gate Aqaba",city:"Aqaba",area:"City Centre",stars:4,base:96,tagline:"A bright Aqaba stay balancing city access, pool time and Red Sea weekends.",amenities:["WIFI","BREAKFAST","POOL","PARKING","RESTAURANT","BEACH_SHUTTLE","FAMILY_ROOMS"]},
  {slug:"demo-red-sea-lantern-aqaba",name:"Red Sea Lantern",city:"Aqaba",area:"Marina District",stars:4,base:102,tagline:"Marina energy, family-friendly rooms and easy access to Aqaba's waterfront.",amenities:["WIFI","BREAKFAST","POOL","FAMILY_ROOMS","MARINA","RESTAURANT","BEACH_SHUTTLE"]},
  {slug:"demo-marina-house-aqaba",name:"Aqaba Marina House",city:"Aqaba",area:"South Beach",stars:5,base:148,tagline:"A premium South Beach resort concept with spa, larger suites and private-style units.",amenities:["WIFI","BREAKFAST","POOL","SPA","PARKING","BEACH_ACCESS","RESTAURANT","WATER_SPORTS"]},
  {slug:"demo-gulf-view-aqaba",name:"Gulf View Suites Aqaba",city:"Aqaba",area:"Ayla District",stars:5,base:139,tagline:"A polished Ayla-style escape with sea-facing suites, leisure facilities and family space.",amenities:["WIFI","BREAKFAST","POOL","GYM","FAMILY_ROOMS","MARINA","RESTAURANT","BEACH_ACCESS"]},
  {slug:"demo-rose-canyon-petra",name:"Rose Canyon Hotel",city:"Petra",area:"Wadi Musa",stars:4,base:89,tagline:"A comfortable Wadi Musa base made for early Petra starts and restorative evenings.",amenities:["WIFI","BREAKFAST","PARKING","AIRPORT_SHUTTLE","RESTAURANT","TERRACE"]},
  {slug:"demo-nabataean-gate-petra",name:"Nabataean Gate Inn",city:"Petra",area:"Wadi Musa",stars:3,base:67,tagline:"A simple, value-led Petra stay with practical rooms and an easy Wadi Musa base.",amenities:["WIFI","BREAKFAST","PARKING","RESTAURANT","TERRACE"]},
  {slug:"demo-salt-shore-dead-sea",name:"Salt Shore Resort",city:"Dead Sea",area:"Sweimeh",stars:5,base:156,tagline:"A full Dead Sea resort concept with spa rituals, pools and larger premium accommodation.",amenities:["WIFI","BREAKFAST","POOL","SPA","GYM","PARKING","BEACH_ACCESS","RESTAURANT","FAMILY_ROOMS"]},
  {slug:"demo-lowest-point-retreat",name:"Lowest Point Retreat",city:"Dead Sea",area:"Sweimeh",stars:4,base:121,tagline:"A relaxed Dead Sea retreat with family space, pool time and clear final-price packages.",amenities:["WIFI","BREAKFAST","POOL","FAMILY_ROOMS","PARKING","BEACH_ACCESS","RESTAURANT","SPA"]},
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

function amenity(code:string){return {code,name:AMENITY_NAMES[code]??code,category:null};}
function coverPhoto(index:number,name:string){return {url:PHOTO_POOL[(index*3)%PHOTO_POOL.length]!,alt:`Demo photo for ${name}`,sortOrder:0};}
function normalize(value:string){return value.trim().toLowerCase().replace(/\s+/g," ");}
function cityFromQuery(value:string){
  const q=normalize(value);
  if(["amman","عمّان","عمان"].includes(q)) return "Amman";
  if(["aqaba","العقبة","عقبة"].includes(q)) return "Aqaba";
  if(["petra","البتراء","بترا"].includes(q)) return "Petra";
  if(["dead sea","البحر الميت"].includes(q)) return "Dead Sea";
  return null;
}
function nightsBetween(arrival:string,departure:string){
  const start=Date.parse(`${arrival}T00:00:00Z`); const end=Date.parse(`${departure}T00:00:00Z`);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start) return 1;
  return Math.max(1,Math.round((end-start)/86400000));
}

export function demoFeaturedHotelsFallback(limit=6){
  return HOTEL_SEEDS.slice(0,Math.max(1,limit)).map((hotel,index)=>({
    id:hotel.slug,slug:hotel.slug,name:hotel.name,city:hotel.city,countryCode:"JO",area:hotel.area,starRating:hotel.stars,description:hotel.tagline,
    coverPhoto:coverPhoto(index,hotel.name),amenities:hotel.amenities.map(amenity),reviewSummary:{count:0,overall:null as number|null},
  }));
}

export function demoDestinationsFallback(limit=5){
  const rows=[
    {id:"demo-destination-amman",slug:"amman",city:"Amman",nameEn:"Amman",nameAr:"عمّان",countryCode:"JO",propertyCount:12,landingPath:"/search?destination=Amman",coverPhoto:coverPhoto(0,"Amman")},
    {id:"demo-destination-aqaba",slug:"aqaba",city:"Aqaba",nameEn:"Aqaba",nameAr:"العقبة",countryCode:"JO",propertyCount:4,landingPath:"/search?destination=Aqaba",coverPhoto:coverPhoto(12,"Aqaba")},
    {id:"demo-destination-petra",slug:"petra",city:"Petra",nameEn:"Petra",nameAr:"البتراء",countryCode:"JO",propertyCount:2,landingPath:"/search?destination=Petra",coverPhoto:coverPhoto(16,"Petra")},
    {id:"demo-destination-dead-sea",slug:"dead-sea",city:"Dead Sea",nameEn:"Dead Sea",nameAr:"البحر الميت",countryCode:"JO",propertyCount:2,landingPath:"/search?destination=Dead%20Sea",coverPhoto:coverPhoto(18,"Dead Sea")},
  ];
  return rows.slice(0,limit);
}

export function demoSearchFallback(input:{destination:string;arrival:string;departure:string;stars:readonly number[];amenities:readonly string[];freeCancellation:boolean;paymentMode?:string;minPrice?:number;maxPrice?:number;sort:string;pageSize:number}){
  const nights=nightsBetween(input.arrival,input.departure);
  const city=cityFromQuery(input.destination);
  const query=normalize(input.destination);
  let hotels=HOTEL_SEEDS.map((hotel,index)=>{
    const averageNightlyTotal=Number((hotel.base*0.88).toFixed(2));
    const total=Number((averageNightlyTotal*nights).toFixed(2));
    return {
      id:hotel.slug,slug:hotel.slug,name:hotel.name,city:hotel.city,countryCode:"JO",area:hotel.area,starRating:hotel.stars,currency:"JOD",
      coverPhoto:coverPhoto(index,hotel.name),amenities:hotel.amenities.map(amenity),reviewSummary:{count:0,overall:null as number|null},
      from:{
        total,averageNightlyTotal,availableToSell:4+(index%6),freeCancellationNow:true,
        paymentModes:["PAY_NOW","PAY_AT_HOTEL"] as ("PAY_NOW"|"PAY_AT_HOTEL")[],
        cancellationPolicy:{name:"Flexible"},
        promotion:{name:"Demo Saver",discountPercent:12},
      },
    };
  });
  hotels=hotels.filter((hotel)=>{
    const matchesDestination=city ? hotel.city===city : !query || [hotel.name,hotel.city,hotel.area].some((value)=>normalize(value).includes(query));
    if(!matchesDestination) return false;
    if(input.stars.length&&!input.stars.includes(hotel.starRating)) return false;
    if(input.amenities.length&&!input.amenities.every((code)=>hotel.amenities.some((item)=>item.code===code))) return false;
    if(input.minPrice!==undefined&&hotel.from.averageNightlyTotal<input.minPrice) return false;
    if(input.maxPrice!==undefined&&hotel.from.averageNightlyTotal>input.maxPrice) return false;
    return true;
  });
  if(input.sort==="PRICE_ASC") hotels.sort((a,b)=>a.from.averageNightlyTotal-b.from.averageNightlyTotal);
  else if(input.sort==="PRICE_DESC") hotels.sort((a,b)=>b.from.averageNightlyTotal-a.from.averageNightlyTotal);
  else if(input.sort==="STARS_DESC") hotels.sort((a,b)=>b.starRating-a.starRating);
  const pageSize=Math.max(1,Math.min(Number(input.pageSize)||20,50));
  const resolvedCity=city??undefined;
  const names:Record<string,{slug:string;nameAr:string}>={Amman:{slug:"amman",nameAr:"عمّان"},Aqaba:{slug:"aqaba",nameAr:"العقبة"},Petra:{slug:"petra",nameAr:"البتراء"},"Dead Sea":{slug:"dead-sea",nameAr:"البحر الميت"}};
  return {
    query:input,nights,count:hotels.length,results:hotels.slice(0,pageSize),pagination:{nextCursor:null as string|null},
    resolvedDestination:resolvedCity?{id:`demo-destination-${names[resolvedCity]?.slug??normalize(resolvedCity)}`,slug:names[resolvedCity]?.slug??normalize(resolvedCity),type:"CITY" as const,countryCode:"JO",nameEn:resolvedCity,nameAr:names[resolvedCity]?.nameAr??null,parentId:null}:null,
  };
}
