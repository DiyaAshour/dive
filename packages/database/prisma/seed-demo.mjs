import { fileURLToPath } from "node:url";

// Demo media uses hotlinked Unsplash images under the Unsplash License.
// These assets belong only to fictional demo-* properties and are replaced when the catalog is reseeded.
// License: https://unsplash.com/license
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  dotenv.config({path:fileURLToPath(new URL("../../../.env", import.meta.url))});
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const { PrismaClient } = await import("../src/generated/prisma/client.ts");
const prisma = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});

const hotels = [
  {slug:"demo-citadel-house-amman",name:"Citadel House Amman",city:"Amman",area:"Jabal Al Qala'a",stars:4,base:72,lat:31.9539,lng:35.9340,profile:"HERITAGE",tagline:"Historic-city views, a calm urban base and easy access to downtown Amman.",amenities:["WIFI","BREAKFAST","PARKING","AIRPORT_SHUTTLE","RESTAURANT","ROOFTOP"]},
  {slug:"demo-olive-crown-amman",name:"Olive Crown Hotel",city:"Amman",area:"Shmeisani",stars:4,base:78,lat:31.9730,lng:35.9085,profile:"BUSINESS",tagline:"A polished business stay with practical workspaces and central Amman access.",amenities:["WIFI","BREAKFAST","GYM","PARKING","BUSINESS_CENTER","ROOM_SERVICE"]},
  {slug:"demo-seven-hills-amman",name:"Seven Hills Residence",city:"Amman",area:"Abdoun",stars:5,base:118,lat:31.9490,lng:35.8920,profile:"RESIDENCE",tagline:"Larger residential-style stays for guests who want space, privacy and premium comfort.",amenities:["WIFI","BREAKFAST","GYM","POOL","PARKING","FAMILY_ROOMS","ROOM_SERVICE"]},
  {slug:"demo-abdali-gate-amman",name:"Abdali Gate Hotel",city:"Amman",area:"Al Abdali",stars:5,base:132,lat:31.9635,lng:35.9080,profile:"BUSINESS",tagline:"A modern city hotel designed around Abdali, business travel and high-comfort short stays.",amenities:["WIFI","BREAKFAST","GYM","BUSINESS_CENTER","PARKING","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-jabal-view-suites-amman",name:"Jabal View Suites",city:"Amman",area:"Jabal Amman",stars:4,base:84,lat:31.9510,lng:35.9180,profile:"BOUTIQUE",tagline:"A boutique hillside stay close to cafés, galleries and the character of Jabal Amman.",amenities:["WIFI","BREAKFAST","FAMILY_ROOMS","PARKING","ROOFTOP","AIRPORT_SHUTTLE"]},
  {slug:"demo-cedar-court-amman",name:"Cedar Court Amman",city:"Amman",area:"Sweifieh",stars:4,base:81,lat:31.9580,lng:35.8600,profile:"CITY",tagline:"A convenient west-Amman base with shopping, dining and flexible room choices nearby.",amenities:["WIFI","BREAKFAST","GYM","PARKING","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-royal-stone-amman",name:"Royal Stone Amman",city:"Amman",area:"Um Uthaina",stars:5,base:126,lat:31.9700,lng:35.8750,profile:"LUXURY",tagline:"A quieter luxury address with spa-led comfort and generous premium rooms.",amenities:["WIFI","BREAKFAST","GYM","SPA","PARKING","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-lantern-house-amman",name:"Lantern House Hotel",city:"Amman",area:"Rainbow Street",stars:3,base:61,lat:31.9495,lng:35.9230,profile:"BOUTIQUE",tagline:"A compact, walkable stay for travelers who want Rainbow Street and old Amman close by.",amenities:["WIFI","BREAKFAST","AIRPORT_SHUTTLE","ROOFTOP","RESTAURANT"]},
  {slug:"demo-garden-stay-amman",name:"Amman Garden Stay",city:"Amman",area:"Khalda",stars:4,base:75,lat:31.9950,lng:35.8370,profile:"FAMILY",tagline:"A relaxed family-friendly stay with larger units and easy west-Amman access.",amenities:["WIFI","BREAKFAST","FAMILY_ROOMS","PARKING","PLAY_AREA","ROOM_SERVICE"]},
  {slug:"demo-blue-arch-amman",name:"Blue Arch Hotel Amman",city:"Amman",area:"Dabouq",stars:4,base:92,lat:32.0150,lng:35.8260,profile:"LEISURE",tagline:"A quieter leisure stay with pool time, open spaces and room to slow down.",amenities:["WIFI","BREAKFAST","POOL","PARKING","FAMILY_ROOMS","RESTAURANT"]},
  {slug:"demo-capital-terrace-amman",name:"Capital Terrace Hotel",city:"Amman",area:"Al Rabieh",stars:4,base:88,lat:31.9820,lng:35.8790,profile:"BUSINESS",tagline:"A practical city hotel pairing work-friendly rooms with a central Rabieh location.",amenities:["WIFI","BREAKFAST","GYM","BUSINESS_CENTER","ROOFTOP","ROOM_SERVICE"]},
  {slug:"demo-wadi-grand-amman",name:"Wadi Grand Amman",city:"Amman",area:"7th Circle",stars:5,base:109,lat:31.9590,lng:35.8500,profile:"LUXURY",tagline:"A full-service premium stay with pool, spa and flexible room products near 7th Circle.",amenities:["WIFI","BREAKFAST","GYM","POOL","PARKING","SPA","RESTAURANT","ROOM_SERVICE"]},
  {slug:"demo-coral-gate-aqaba",name:"Coral Gate Aqaba",city:"Aqaba",area:"City Centre",stars:4,base:96,lat:29.5320,lng:35.0060,profile:"COAST",tagline:"A bright Aqaba stay balancing city access, pool time and Red Sea weekends.",amenities:["WIFI","BREAKFAST","POOL","PARKING","RESTAURANT","BEACH_SHUTTLE","FAMILY_ROOMS"]},
  {slug:"demo-red-sea-lantern-aqaba",name:"Red Sea Lantern",city:"Aqaba",area:"Marina District",stars:4,base:102,lat:29.5280,lng:34.9990,profile:"COAST",tagline:"Marina energy, family-friendly rooms and easy access to Aqaba's waterfront.",amenities:["WIFI","BREAKFAST","POOL","FAMILY_ROOMS","MARINA","RESTAURANT","BEACH_SHUTTLE"]},
  {slug:"demo-marina-house-aqaba",name:"Aqaba Marina House",city:"Aqaba",area:"South Beach",stars:5,base:148,lat:29.4420,lng:34.9730,profile:"RESORT",tagline:"A premium South Beach resort concept with spa, larger suites and private-style units.",amenities:["WIFI","BREAKFAST","POOL","SPA","PARKING","BEACH_ACCESS","RESTAURANT","WATER_SPORTS"]},
  {slug:"demo-gulf-view-aqaba",name:"Gulf View Suites Aqaba",city:"Aqaba",area:"Ayla District",stars:5,base:139,lat:29.5480,lng:34.9980,profile:"RESORT",tagline:"A polished Ayla-style escape with sea-facing suites, leisure facilities and family space.",amenities:["WIFI","BREAKFAST","POOL","GYM","FAMILY_ROOMS","MARINA","RESTAURANT","BEACH_ACCESS"]},
  {slug:"demo-rose-canyon-petra",name:"Rose Canyon Hotel",city:"Petra",area:"Wadi Musa",stars:4,base:89,lat:30.3220,lng:35.4810,profile:"PETRA",tagline:"A comfortable Wadi Musa base made for early Petra starts and restorative evenings.",amenities:["WIFI","BREAKFAST","PARKING","AIRPORT_SHUTTLE","RESTAURANT","TERRACE"]},
  {slug:"demo-nabataean-gate-petra",name:"Nabataean Gate Inn",city:"Petra",area:"Wadi Musa",stars:3,base:67,lat:30.3200,lng:35.4780,profile:"PETRA",tagline:"A simple, value-led Petra stay with practical rooms and an easy Wadi Musa base.",amenities:["WIFI","BREAKFAST","PARKING","RESTAURANT","TERRACE"]},
  {slug:"demo-salt-shore-dead-sea",name:"Salt Shore Resort",city:"Dead Sea",area:"Sweimeh",stars:5,base:156,lat:31.7190,lng:35.5860,profile:"DEAD_SEA",tagline:"A full Dead Sea resort concept with spa rituals, pools and larger premium accommodation.",amenities:["WIFI","BREAKFAST","POOL","SPA","GYM","PARKING","BEACH_ACCESS","RESTAURANT","FAMILY_ROOMS"]},
  {slug:"demo-lowest-point-retreat",name:"Lowest Point Retreat",city:"Dead Sea",area:"Sweimeh",stars:4,base:121,lat:31.7110,lng:35.5840,profile:"DEAD_SEA",tagline:"A relaxed Dead Sea retreat with family space, pool time and clear final-price packages.",amenities:["WIFI","BREAKFAST","POOL","FAMILY_ROOMS","PARKING","BEACH_ACCESS","RESTAURANT","SPA"]},
];

const demoPhotoPool = [
  {id:"unsplash-1566073771259",url:"https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=82",alt:"Demo resort pool and exterior"},
  {id:"unsplash-1611892440504",url:"https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1600&q=82",alt:"Demo wood-finished guest room"},
  {id:"unsplash-1571896349842",url:"https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=82",alt:"Demo hotel pool and exterior"},
  {id:"unsplash-1564501049412",url:"https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=82",alt:"Demo modern resort exterior"},
  {id:"unsplash-1560200353",url:"https://images.unsplash.com/photo-1560200353-ce0a76b1d438?auto=format&fit=crop&w=1600&q=82",alt:"Demo hotel pool at night"},
  {id:"unsplash-1590490360182",url:"https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1600&q=82",alt:"Demo premium hotel suite"},
  {id:"unsplash-1540541338287",url:"https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1600&q=82",alt:"Demo coastal resort and pool"},
  {id:"unsplash-1595576508898",url:"https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1600&q=82",alt:"Demo twin guest room"},
  {id:"unsplash-1600585154340",url:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=82",alt:"Demo contemporary accommodation exterior"},
  {id:"unsplash-1551882547",url:"https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1600&q=82",alt:"Demo resort courtyard and pool"},
  {id:"unsplash-1540518614846",url:"https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1600&q=82",alt:"Demo king guest room"},
  {id:"unsplash-1582719478250",url:"https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=82",alt:"Demo tropical guest room"},
];

const amenityNames = {
  WIFI:"Free Wi-Fi",BREAKFAST:"Breakfast",PARKING:"Parking",GYM:"Fitness centre",POOL:"Swimming pool",SPA:"Spa",AIRPORT_SHUTTLE:"Airport shuttle",FAMILY_ROOMS:"Family rooms",BUSINESS_CENTER:"Business centre",
  RESTAURANT:"Restaurant",ROOM_SERVICE:"Room service",ROOFTOP:"Rooftop terrace",PLAY_AREA:"Children's play area",BEACH_SHUTTLE:"Beach shuttle",BEACH_ACCESS:"Beach access",MARINA:"Marina access",WATER_SPORTS:"Water sports",TERRACE:"Terrace",
};

const standardRoomAmenities = [["AIR_CONDITIONING","Air conditioning","Comfort"],["FLAT_SCREEN_TV","Flat-screen TV","Media"],["WIFI","Wi-Fi","Connectivity"],["TEA_COFFEE","Tea/Coffee maker","Kitchen"],["SAFE","In-room safe","Safety"]];
const premiumRoomAmenities = [["SEATING_AREA","Seating area","Living"],["REFRIGERATOR","Refrigerator","Kitchen"],["BATHROBE","Bathrobe","Bathroom"],["WORK_DESK","Work desk","Workspace"]];

let demoMediaUploaderId = "";

function isoDate(date) { return date.toISOString().slice(0,10); }
function dayAt(offset) { const d=new Date(); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()+offset); return d; }
function demoPhotosFor(index) { const offset=(index*3)%demoPhotoPool.length; return Array.from({length:8},(_,position)=>demoPhotoPool[(offset+position)%demoPhotoPool.length]); }
function rateFor(base,offset,premium=0,factor=1) { const day=dayAt(offset).getUTCDay(); const weekend=day===4||day===5 ? 1.12 : 1; const wave=offset%17===0?1.05:1; return Number(((base+premium)*factor*weekend*wave).toFixed(2)); }
function roomAmenity(code,name,category) { return [code,name,category]; }

function roomSpecsFor(spec,index) {
  if (spec.city==="Dead Sea") return [
    {name:"Dead Sea View King",code:"VIEW_KING",unitType:"ROOM",description:"A generous king room with a private bathroom, seating corner and wide resort-facing outlook for a slower Dead Sea stay.",quantity:10,maxGuests:3,maxAdults:2,maxChildren:1,maxInfants:1,bedroomCount:1,livingRoomCount:0,bathroomCount:1,sizeValue:38,extraBedCount:0,cribCount:1,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0}],amenities:[...standardRoomAmenities,roomAmenity("SEA_VIEW","Dead Sea view","View"),roomAmenity("BALCONY","Balcony","Outdoor")],premium:0,inventory:9},
    {name:"Family Spa Suite",code:"SPA_SUITE",unitType:"SUITE",description:"A larger suite with bedroom, living room, two bathrooms and family-ready sleeping options close to the resort's spa and pools.",quantity:6,maxGuests:5,maxAdults:3,maxChildren:2,maxInfants:1,bedroomCount:1,livingRoomCount:1,bathroomCount:2,sizeValue:66,extraBedCount:1,cribCount:1,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0},{area:"Living room",type:"SOFA_BED",quantity:1,sortOrder:1}],amenities:[...standardRoomAmenities,...premiumRoomAmenities,roomAmenity("SEA_VIEW","Dead Sea view","View"),roomAmenity("BATHTUB","Bathtub","Bathroom")],premium:46,inventory:5},
    {name:"Private Pool Villa",code:"POOL_VILLA",unitType:"VILLA",description:"A showcase villa product with separate living space, two bedrooms, two bathrooms and a private-pool style layout for premium family stays.",quantity:3,maxGuests:6,maxAdults:4,maxChildren:2,maxInfants:1,bedroomCount:2,livingRoomCount:1,bathroomCount:2,sizeValue:112,extraBedCount:1,cribCount:1,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0},{area:"Bedroom 2",type:"SINGLE",quantity:2,sortOrder:1},{area:"Living room",type:"SOFA_BED",quantity:1,sortOrder:2}],amenities:[...standardRoomAmenities,...premiumRoomAmenities,roomAmenity("PRIVATE_POOL","Private pool","Outdoor"),roomAmenity("TERRACE","Private terrace","Outdoor")],premium:118,inventory:3},
  ];
  if (spec.city==="Aqaba") return [
    {name:"Red Sea King",code:"SEA_KING",unitType:"ROOM",description:"A bright king room with a comfortable seating area and resort-style facilities for short Aqaba escapes.",quantity:11,maxGuests:3,maxAdults:2,maxChildren:1,maxInfants:1,bedroomCount:1,livingRoomCount:0,bathroomCount:1,sizeValue:36,extraBedCount:0,cribCount:1,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0}],amenities:[...standardRoomAmenities,roomAmenity("SEA_VIEW","Sea view","View"),roomAmenity("BALCONY","Balcony","Outdoor")],premium:0,inventory:9},
    {name:"Family Sea Suite",code:"FAMILY_SEA",unitType:"SUITE",description:"A family-focused suite with separate living space, flexible sleeping and a larger footprint for multi-night Red Sea stays.",quantity:7,maxGuests:5,maxAdults:3,maxChildren:2,maxInfants:1,bedroomCount:1,livingRoomCount:1,bathroomCount:1,sizeValue:62,extraBedCount:1,cribCount:1,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0},{area:"Living room",type:"SOFA_BED",quantity:1,sortOrder:1}],amenities:[...standardRoomAmenities,...premiumRoomAmenities,roomAmenity("SEA_VIEW","Sea view","View")],premium:42,inventory:5},
    {name:index%2===0?"Beach Bungalow":"Marina Studio",code:index%2===0?"BUNGALOW":"MARINA_STUDIO",unitType:index%2===0?"BUNGALOW":"STUDIO",description:index%2===0?"A low-rise beach-style unit with a private terrace and independent holiday feel.":"An open-plan studio unit with marina-inspired living space and a practical kitchenette-style setup.",quantity:4,maxGuests:4,maxAdults:2,maxChildren:2,maxInfants:1,bedroomCount:1,livingRoomCount:index%2===0?1:0,bathroomCount:1,sizeValue:index%2===0?54:44,extraBedCount:1,cribCount:1,beds:[{area:"Bedroom 1",type:index%2===0?"QUEEN":"KING",quantity:1,sortOrder:0},{area:"Living room",type:"SOFA_BED",quantity:1,sortOrder:1}],amenities:[...standardRoomAmenities,...premiumRoomAmenities,roomAmenity("TERRACE","Terrace","Outdoor")],premium:74,inventory:3},
  ];
  if (spec.city==="Petra") return [
    {name:"Canyon King",code:"CANYON_KING",unitType:"ROOM",description:"A comfortable king room for early Petra starts, with a private bathroom and calm evening setup.",quantity:9,maxGuests:3,maxAdults:2,maxChildren:1,maxInfants:1,bedroomCount:1,livingRoomCount:0,bathroomCount:1,sizeValue:31,extraBedCount:0,cribCount:1,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0}],amenities:[...standardRoomAmenities,roomAmenity("MOUNTAIN_VIEW","Mountain view","View")],premium:0,inventory:8},
    {name:"Petra Twin Terrace",code:"TWIN_TERRACE",unitType:"ROOM",description:"A twin room with two individual beds and terrace-style outdoor space for friends or independent travelers.",quantity:7,maxGuests:3,maxAdults:2,maxChildren:1,maxInfants:0,bedroomCount:1,livingRoomCount:0,bathroomCount:1,sizeValue:34,extraBedCount:0,cribCount:0,beds:[{area:"Bedroom 1",type:"SINGLE",quantity:2,sortOrder:0}],amenities:[...standardRoomAmenities,roomAmenity("TERRACE","Terrace","Outdoor"),roomAmenity("MOUNTAIN_VIEW","Mountain view","View")],premium:18,inventory:6},
    {name:"Nabataean Family Chalet",code:"FAMILY_CHALET",unitType:"CHALET",description:"A larger chalet-style family product with bedroom and living area, designed to showcase alternative accommodation beyond a standard hotel room.",quantity:4,maxGuests:5,maxAdults:3,maxChildren:2,maxInfants:1,bedroomCount:1,livingRoomCount:1,bathroomCount:1,sizeValue:57,extraBedCount:1,cribCount:1,beds:[{area:"Bedroom 1",type:"QUEEN",quantity:1,sortOrder:0},{area:"Living room",type:"SOFA_BED",quantity:1,sortOrder:1}],amenities:[...standardRoomAmenities,...premiumRoomAmenities,roomAmenity("TERRACE","Private terrace","Outdoor")],premium:48,inventory:3},
  ];
  const thirdIsApartment=index%3!==0;
  return [
    {name:"Classic King",code:"KING",unitType:"ROOM",description:"A polished king room with private bathroom, workspace and the practical essentials for a clear city stay.",quantity:10+(index%4),maxGuests:3,maxAdults:2,maxChildren:1,maxInfants:1,bedroomCount:1,livingRoomCount:0,bathroomCount:1,sizeValue:32+(index%3)*2,extraBedCount:0,cribCount:1,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0}],amenities:[...standardRoomAmenities,roomAmenity("WORK_DESK","Work desk","Workspace")],premium:0,inventory:9+(index%3)},
    {name:index%2===0?"Executive Studio":"Executive Twin",code:index%2===0?"STUDIO":"TWIN",unitType:index%2===0?"STUDIO":"ROOM",description:index%2===0?"An open-plan studio with seating, work area and a little more independence for longer city stays.":"A flexible twin room with two single beds, work area and practical city-hotel comforts.",quantity:7+(index%3),maxGuests:3,maxAdults:2,maxChildren:1,maxInfants:1,bedroomCount:1,livingRoomCount:index%2===0?1:0,bathroomCount:1,sizeValue:40+(index%4),extraBedCount:0,cribCount:1,beds:[{area:"Bedroom 1",type:index%2===0?"KING":"SINGLE",quantity:index%2===0?1:2,sortOrder:0}],amenities:[...standardRoomAmenities,...premiumRoomAmenities],premium:24,inventory:6+(index%2)},
    {name:thirdIsApartment?"Family Apartment":"Family Suite",code:thirdIsApartment?"APARTMENT":"FAMILY_SUITE",unitType:thirdIsApartment?"APARTMENT":"SUITE",description:thirdIsApartment?"A residential-style family unit with bedroom, living room and kitchen-oriented facilities for longer stays.":"A larger family suite with separate bedroom and living space, flexible bedding and extra comfort.",quantity:5,maxGuests:5,maxAdults:3,maxChildren:2,maxInfants:1,bedroomCount:1,livingRoomCount:1,bathroomCount:index%4===0?2:1,sizeValue:60+(index%5)*3,extraBedCount:1,cribCount:1,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0},{area:"Living room",type:"SOFA_BED",quantity:1,sortOrder:1}],amenities:[...standardRoomAmenities,...premiumRoomAmenities,roomAmenity("DINING_AREA","Dining area","Living")],premium:52,inventory:3+(index%2)},
  ];
}

function thirdRatePlanFor(spec,index) {
  if (spec.city==="Dead Sea") return {name:"Full Board Retreat",code:"RETREAT",mealPlan:"FULL_BOARD",factor:1.28,allowPayNow:true,allowPayAtHotel:true};
  if (spec.city==="Aqaba") return {name:"Half Board Escape",code:"ESCAPE",mealPlan:"HALF_BOARD",factor:1.20,allowPayNow:index%2===0,allowPayAtHotel:true};
  if (spec.city==="Petra") return {name:index%2===0?"Dinner & Breakfast":"Flexible Breakfast Plus",code:"PLUS",mealPlan:index%2===0?"HALF_BOARD":"BREAKFAST",factor:index%2===0?1.18:1.08,allowPayNow:true,allowPayAtHotel:true};
  return {name:index%3===0?"City Half Board":"Flexible Breakfast Plus",code:"PLUS",mealPlan:index%3===0?"HALF_BOARD":"BREAKFAST",factor:index%3===0?1.17:1.08,allowPayNow:index%2===0,allowPayAtHotel:true};
}

function inventoryFor(roomSpec,roomIndex,index,offset) {
  if (roomIndex===2 && offset<21) return 2+(index%2);
  if (roomIndex===1 && offset<10 && (dayAt(offset).getUTCDay()===4||dayAt(offset).getUTCDay()===5)) return Math.min(3,roomSpec.inventory);
  return roomSpec.inventory;
}

async function seedHotel(spec,index) {
  const now=new Date();
  const hotel=await prisma.hotel.create({data:{
    name:spec.name,slug:spec.slug,city:spec.city,countryCode:"JO",address:`Fictional showcase · ${spec.area}, ${spec.city}, Jordan`,area:spec.area,
    description:`${spec.tagline} This fictional HandMeKey demo property exists only to showcase live marketplace behaviour. Its room products, prices, inventory, policies and promotions are demonstration data and do not represent a real hotel.`,
    starRating:spec.stars,latitude:spec.lat,longitude:spec.lng,checkInTime:index%4===0?"14:00":"15:00",checkOutTime:index%5===0?"11:00":"12:00",timezone:"Asia/Amman",currency:"JOD",
    status:"ACTIVE",verified:true,publishRevision:1,publishedRevision:1,lastPublishedAt:now,commissionRate:0.10,serviceRate:0.07,taxRate:0.086,
  }});

  await prisma.hotelAmenity.createMany({data:spec.amenities.map((code)=>({hotelId:hotel.id,code,name:amenityNames[code]??code.replaceAll("_"," ").toLowerCase(),category:"PROPERTY"}))});

  const photos=demoPhotosFor(index);
  const hotelPhotos=[];
  for (let sortOrder=0;sortOrder<photos.length;sortOrder+=1) {
    const photo=photos[sortOrder];
    const media=await prisma.mediaObject.create({data:{hotelId:hotel.id,uploadedByUserId:demoMediaUploaderId,kind:"HOTEL_IMAGE",state:"READY",visibility:"PUBLIC",objectKey:`demo/${spec.slug}/${String(sortOrder+1).padStart(2,"0")}-${photo.id}.jpg`,originalFileName:`demo-${photo.id}.jpg`,contentType:"image/jpeg",expectedSizeBytes:0,publicUrl:photo.url,uploadExpiresAt:new Date(now.getTime()+31_536_000_000),uploadedAt:now}});
    hotelPhotos.push(await prisma.hotelPhoto.create({data:{hotelId:hotel.id,mediaObjectId:media.id,alt:`${photo.alt} for fictional showcase property ${spec.name}`,sortOrder}}));
  }

  const roomSpecs=roomSpecsFor(spec,index);
  const saverRatePlanIds=[];
  const flexibleRatePlanIds=[];
  const plusRatePlanIds=[];

  for (const [roomIndex,roomSpec] of roomSpecs.entries()) {
    const room=await prisma.roomType.create({data:{hotelId:hotel.id,name:roomSpec.name,code:roomSpec.code,description:roomSpec.description,unitType:roomSpec.unitType,quantity:roomSpec.quantity,maxGuests:roomSpec.maxGuests,maxAdults:roomSpec.maxAdults,maxChildren:roomSpec.maxChildren,maxInfants:roomSpec.maxInfants,bedroomCount:roomSpec.bedroomCount,livingRoomCount:roomSpec.livingRoomCount,bathroomCount:roomSpec.bathroomCount,privateBathroom:true,sizeValue:roomSpec.sizeValue,sizeUnit:"SQM",smokingPolicy:roomIndex===1&&index%7===0?"BOTH":"NON_SMOKING",extraBedCount:roomSpec.extraBedCount,cribCount:roomSpec.cribCount,allowsCribAndExtraBed:roomSpec.extraBedCount>0&&roomSpec.cribCount>0,active:true,beds:{create:roomSpec.beds},amenities:{create:roomSpec.amenities.map(([code,name,category])=>({code,name,category}))}}});

    const roomPhotoIndexes=[roomIndex*2,roomIndex*2+1];
    for (const photoIndex of roomPhotoIndexes) if (hotelPhotos[photoIndex]) await prisma.hotelPhoto.update({where:{id:hotelPhotos[photoIndex].id},data:{roomTypeId:room.id}});

    await prisma.inventoryDay.createMany({data:Array.from({length:120},(_,offset)=>({roomTypeId:room.id,date:dayAt(offset),available:inventoryFor(roomSpec,roomIndex,index,offset),overbookingLimit:0}))});

    const flexible=await prisma.ratePlan.create({data:{roomTypeId:room.id,name:"Flexible Breakfast",code:"FLEX",refundable:true,mealPlan:"BREAKFAST",allowPayNow:true,allowPayAtHotel:true,active:true,cancellationPolicy:{create:{name:"Free cancellation until 3 days before arrival",noShowPenaltyType:"FULL_STAY",rules:{create:[{minimumDaysBeforeArrival:3,penaltyType:"NONE"},{minimumDaysBeforeArrival:0,penaltyType:"FIRST_NIGHT"}]}}}}});
    const saver=await prisma.ratePlan.create({data:{roomTypeId:room.id,name:"Pay Now Saver",code:"SAVER",refundable:false,mealPlan:"ROOM_ONLY",allowPayNow:true,allowPayAtHotel:false,active:true,cancellationPolicy:{create:{name:"Non-refundable",noShowPenaltyType:"FULL_STAY",rules:{create:[{minimumDaysBeforeArrival:0,penaltyType:"FULL_STAY"}]}}}}});
    const plusSpec=thirdRatePlanFor(spec,index);
    const plus=await prisma.ratePlan.create({data:{roomTypeId:room.id,name:plusSpec.name,code:plusSpec.code,refundable:true,mealPlan:plusSpec.mealPlan,allowPayNow:plusSpec.allowPayNow,allowPayAtHotel:plusSpec.allowPayAtHotel,active:true,cancellationPolicy:{create:{name:"Free cancellation until 7 days before arrival",noShowPenaltyType:"FULL_STAY",rules:{create:[{minimumDaysBeforeArrival:7,penaltyType:"NONE"},{minimumDaysBeforeArrival:2,penaltyType:"FIRST_NIGHT"},{minimumDaysBeforeArrival:0,penaltyType:"FULL_STAY"}]}}}}});

    flexibleRatePlanIds.push(flexible.id); saverRatePlanIds.push(saver.id); plusRatePlanIds.push(plus.id);
    await prisma.dailyRate.createMany({data:Array.from({length:120},(_,offset)=>({ratePlanId:flexible.id,date:dayAt(offset),baseRate:rateFor(spec.base,offset,roomSpec.premium,1),minStay:1,maxStay:21,closed:false,stopSell:false}))});
    await prisma.dailyRate.createMany({data:Array.from({length:120},(_,offset)=>({ratePlanId:saver.id,date:dayAt(offset),baseRate:rateFor(spec.base,offset,roomSpec.premium,0.92),minStay:(dayAt(offset).getUTCDay()===4&&index%2===0)?2:1,maxStay:14,closed:false,stopSell:false}))});
    await prisma.dailyRate.createMany({data:Array.from({length:120},(_,offset)=>({ratePlanId:plus.id,date:dayAt(offset),baseRate:rateFor(spec.base,offset,roomSpec.premium,plusSpec.factor),minStay:1,maxStay:21,closed:false,stopSell:false}))});
  }

  const showcaseDiscount=10+(index%5)*2;
  const deal=await prisma.promotion.create({data:{hotelId:hotel.id,name:spec.city==="Dead Sea"?`Dead Sea Escape ${showcaseDiscount}%`:spec.city==="Aqaba"?`Red Sea Deal ${showcaseDiscount}%`:spec.city==="Petra"?`Petra Stay Deal ${showcaseDiscount}%`:`HandMeKey City Deal ${showcaseDiscount}%`,code:"SHOWCASE_DEAL",discountPercent:showcaseDiscount,bookingStartsAt:new Date(now.getTime()-86_400_000),bookingEndsAt:dayAt(90),stayStartsOn:dayAt(0),stayEndsOn:dayAt(119),minimumNights:1,status:"ACTIVE"}});
  await prisma.promotionRatePlan.createMany({data:saverRatePlanIds.map((ratePlanId)=>({promotionId:deal.id,ratePlanId}))});

  const flexibleDeal=await prisma.promotion.create({data:{hotelId:hotel.id,name:index%2===0?"Two-Night Flex Bonus":"Flexible Stay Offer",code:"FLEX_BONUS",discountPercent:6+(index%3),bookingStartsAt:new Date(now.getTime()-86_400_000),bookingEndsAt:dayAt(60),stayStartsOn:dayAt(0),stayEndsOn:dayAt(90),minimumNights:index%2===0?2:1,status:"ACTIVE"}});
  await prisma.promotionRatePlan.createMany({data:flexibleRatePlanIds.slice(0,2).map((ratePlanId)=>({promotionId:flexibleDeal.id,ratePlanId}))});

  if (spec.city==="Dead Sea"||spec.city==="Aqaba") {
    const resortDeal=await prisma.promotion.create({data:{hotelId:hotel.id,name:"Board Package Saving",code:"BOARD_SAVING",discountPercent:8,bookingStartsAt:new Date(now.getTime()-86_400_000),bookingEndsAt:dayAt(75),stayStartsOn:dayAt(0),stayEndsOn:dayAt(110),minimumNights:2,status:"ACTIVE"}});
    await prisma.promotionRatePlan.createMany({data:plusRatePlanIds.map((ratePlanId)=>({promotionId:resortDeal.id,ratePlanId}))});
  }

  console.log(`[demo-seed] ${String(index+1).padStart(2,"0")}/20 ${spec.name} · ${spec.city} · 3 room products · 9 rate plans · from ${spec.base} JOD`);
}

try {
  const demoMediaUploader=await prisma.user.upsert({where:{email:"demo-media@handmekey.invalid"},create:{email:"demo-media@handmekey.invalid",displayName:"HandMeKey Demo Media",platformRole:"GUEST"},update:{displayName:"HandMeKey Demo Media",platformRole:"GUEST"},select:{id:true}});
  demoMediaUploaderId=demoMediaUploader.id;

  const demoHotels=await prisma.hotel.findMany({where:{slug:{startsWith:"demo-"}},select:{id:true}});
  if (demoHotels.length) {
    console.log(`[demo-seed] replacing ${demoHotels.length} existing demo properties; non-demo hotels are untouched`);
    const hotelIds=demoHotels.map((hotel)=>hotel.id);
    const demoBookings=await prisma.booking.findMany({where:{hotelId:{in:hotelIds}},select:{id:true}});
    const bookingIds=demoBookings.map((booking)=>booking.id);
    if (bookingIds.length) {
      await prisma.financialEvent.deleteMany({where:{hotelId:{in:hotelIds}}});
      await prisma.refund.deleteMany({where:{bookingId:{in:bookingIds}}});
      await prisma.paymentAttempt.deleteMany({where:{bookingId:{in:bookingIds}}});
      await prisma.bookingEvent.deleteMany({where:{bookingId:{in:bookingIds}}});
      await prisma.booking.deleteMany({where:{id:{in:bookingIds}}});
      console.log(`[demo-seed] removed ${bookingIds.length} disposable demo bookings before replacing properties`);
    }
    await prisma.hotel.deleteMany({where:{id:{in:hotelIds}}});
  }

  for (let index=0;index<hotels.length;index+=1) await seedHotel(hotels[index],index);

  const seededHotels=await prisma.hotel.findMany({where:{slug:{startsWith:"demo-"}},select:{id:true}});
  const hotelIds=seededHotels.map((hotel)=>hotel.id);
  const [photoCount,roomCount,ratePlanCount,promotionCount,reviewCount,bookingCount]=await Promise.all([
    prisma.hotelPhoto.count({where:{hotelId:{in:hotelIds}}}),
    prisma.roomType.count({where:{hotelId:{in:hotelIds}}}),
    prisma.ratePlan.count({where:{roomType:{hotelId:{in:hotelIds}}}}),
    prisma.promotion.count({where:{hotelId:{in:hotelIds}}}),
    prisma.guestReview.count({where:{hotelId:{in:hotelIds}}}),
    prisma.booking.count({where:{hotelId:{in:hotelIds}}}),
  ]);

  if (seededHotels.length!==hotels.length||photoCount!==hotels.length*8||roomCount!==hotels.length*3||ratePlanCount!==hotels.length*9||reviewCount!==0||bookingCount!==0) {
    throw new Error(`[demo-seed] integrity check failed: hotels=${seededHotels.length}, photos=${photoCount}, rooms=${roomCount}, ratePlans=${ratePlanCount}, reviews=${reviewCount}, bookings=${bookingCount}`);
  }

  console.log(`[demo-seed] showcase complete: ${seededHotels.length} fictional ACTIVE + verified properties, ${roomCount} room products, ${ratePlanCount} rate plans, ${promotionCount} promotions, ${photoCount} licensed demo photos`);
  console.log(`[demo-seed] integrity: 0 seeded guest reviews, 0 seeded bookings, 0 seeded payments`);
  console.log(`[demo-seed] availability seeded ${isoDate(dayAt(0))} through ${isoDate(dayAt(119))}`);
} finally {
  await prisma.$disconnect();
}
