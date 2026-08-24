import { fileURLToPath } from "node:url";

// Phase 17 demo media uses hotlinked Unsplash images under the Unsplash License.
// These images belong only to fictional demo-* properties and are replaced when the demo catalog is reseeded.
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
  {slug:"demo-citadel-house-amman",name:"Citadel House Amman",city:"Amman",area:"Jabal Al Qala'a",stars:4,base:72,lat:31.9539,lng:35.9340,amenities:["WIFI","BREAKFAST","PARKING","AIRPORT_SHUTTLE"]},
  {slug:"demo-olive-crown-amman",name:"Olive Crown Hotel",city:"Amman",area:"Shmeisani",stars:4,base:78,lat:31.9730,lng:35.9085,amenities:["WIFI","BREAKFAST","GYM","PARKING"]},
  {slug:"demo-seven-hills-amman",name:"Seven Hills Residence",city:"Amman",area:"Abdoun",stars:5,base:118,lat:31.9490,lng:35.8920,amenities:["WIFI","BREAKFAST","GYM","POOL","PARKING"]},
  {slug:"demo-abdali-gate-amman",name:"Abdali Gate Hotel",city:"Amman",area:"Al Abdali",stars:5,base:132,lat:31.9635,lng:35.9080,amenities:["WIFI","BREAKFAST","GYM","BUSINESS_CENTER","PARKING"]},
  {slug:"demo-jabal-view-suites-amman",name:"Jabal View Suites",city:"Amman",area:"Jabal Amman",stars:4,base:84,lat:31.9510,lng:35.9180,amenities:["WIFI","BREAKFAST","FAMILY_ROOMS","PARKING"]},
  {slug:"demo-cedar-court-amman",name:"Cedar Court Amman",city:"Amman",area:"Sweifieh",stars:4,base:81,lat:31.9580,lng:35.8600,amenities:["WIFI","BREAKFAST","GYM","PARKING"]},
  {slug:"demo-royal-stone-amman",name:"Royal Stone Amman",city:"Amman",area:"Um Uthaina",stars:5,base:126,lat:31.9700,lng:35.8750,amenities:["WIFI","BREAKFAST","GYM","SPA","PARKING"]},
  {slug:"demo-lantern-house-amman",name:"Lantern House Hotel",city:"Amman",area:"Rainbow Street",stars:3,base:61,lat:31.9495,lng:35.9230,amenities:["WIFI","BREAKFAST","AIRPORT_SHUTTLE"]},
  {slug:"demo-garden-stay-amman",name:"Amman Garden Stay",city:"Amman",area:"Khalda",stars:4,base:75,lat:31.9950,lng:35.8370,amenities:["WIFI","BREAKFAST","FAMILY_ROOMS","PARKING"]},
  {slug:"demo-blue-arch-amman",name:"Blue Arch Hotel Amman",city:"Amman",area:"Dabouq",stars:4,base:92,lat:32.0150,lng:35.8260,amenities:["WIFI","BREAKFAST","POOL","PARKING"]},
  {slug:"demo-capital-terrace-amman",name:"Capital Terrace Hotel",city:"Amman",area:"Al Rabieh",stars:4,base:88,lat:31.9820,lng:35.8790,amenities:["WIFI","BREAKFAST","GYM","BUSINESS_CENTER"]},
  {slug:"demo-wadi-grand-amman",name:"Wadi Grand Amman",city:"Amman",area:"7th Circle",stars:5,base:109,lat:31.9590,lng:35.8500,amenities:["WIFI","BREAKFAST","GYM","POOL","PARKING","SPA"]},
  {slug:"demo-coral-gate-aqaba",name:"Coral Gate Aqaba",city:"Aqaba",area:"City Centre",stars:4,base:96,lat:29.5320,lng:35.0060,amenities:["WIFI","BREAKFAST","POOL","PARKING"]},
  {slug:"demo-red-sea-lantern-aqaba",name:"Red Sea Lantern",city:"Aqaba",area:"Marina District",stars:4,base:102,lat:29.5280,lng:34.9990,amenities:["WIFI","BREAKFAST","POOL","FAMILY_ROOMS"]},
  {slug:"demo-marina-house-aqaba",name:"Aqaba Marina House",city:"Aqaba",area:"South Beach",stars:5,base:148,lat:29.4420,lng:34.9730,amenities:["WIFI","BREAKFAST","POOL","SPA","PARKING"]},
  {slug:"demo-gulf-view-aqaba",name:"Gulf View Suites Aqaba",city:"Aqaba",area:"Ayla District",stars:5,base:139,lat:29.5480,lng:34.9980,amenities:["WIFI","BREAKFAST","POOL","GYM","FAMILY_ROOMS"]},
  {slug:"demo-rose-canyon-petra",name:"Rose Canyon Hotel",city:"Petra",area:"Wadi Musa",stars:4,base:89,lat:30.3220,lng:35.4810,amenities:["WIFI","BREAKFAST","PARKING","AIRPORT_SHUTTLE"]},
  {slug:"demo-nabataean-gate-petra",name:"Nabataean Gate Inn",city:"Petra",area:"Wadi Musa",stars:3,base:67,lat:30.3200,lng:35.4780,amenities:["WIFI","BREAKFAST","PARKING"]},
  {slug:"demo-salt-shore-dead-sea",name:"Salt Shore Resort",city:"Dead Sea",area:"Sweimeh",stars:5,base:156,lat:31.7190,lng:35.5860,amenities:["WIFI","BREAKFAST","POOL","SPA","GYM","PARKING"]},
  {slug:"demo-lowest-point-retreat",name:"Lowest Point Retreat",city:"Dead Sea",area:"Sweimeh",stars:4,base:121,lat:31.7110,lng:35.5840,amenities:["WIFI","BREAKFAST","POOL","FAMILY_ROOMS","PARKING"]},
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

let demoMediaUploaderId = "";

function demoPhotosFor(index) {
  const offset=(index*3)%demoPhotoPool.length;
  return Array.from({length:6},(_,position)=>demoPhotoPool[(offset+position)%demoPhotoPool.length]);
}

const amenityNames = {
  WIFI:"Free Wi-Fi",BREAKFAST:"Breakfast",PARKING:"Parking",GYM:"Fitness centre",POOL:"Swimming pool",SPA:"Spa",AIRPORT_SHUTTLE:"Airport shuttle",FAMILY_ROOMS:"Family rooms",BUSINESS_CENTER:"Business centre",
};

function isoDate(date) { return date.toISOString().slice(0,10); }
function dayAt(offset) { const d=new Date(); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()+offset); return d; }
function rateFor(base, offset, roomPremium=0) { const day=dayAt(offset).getUTCDay(); const weekend=day===4||day===5 ? 1.12 : 1; return Number(((base+roomPremium)*weekend).toFixed(2)); }

async function seedHotel(spec,index) {
  const now=new Date();
  const hotel=await prisma.hotel.create({data:{
    name:spec.name,slug:spec.slug,city:spec.city,countryCode:"JO",address:`Demo property address · ${spec.area}, ${spec.city}`,area:spec.area,
    description:`This is a fictional HandMeKey staging property created only for product testing. It contains realistic room, rate, inventory, cancellation and promotion data so the marketplace can be evaluated without representing a real hotel.`,
    starRating:spec.stars,latitude:spec.lat,longitude:spec.lng,checkInTime:"15:00",checkOutTime:"12:00",timezone:"Asia/Amman",currency:"JOD",
    status:"ACTIVE",verified:true,publishRevision:1,publishedRevision:1,lastPublishedAt:now,commissionRate:0.10,serviceRate:0.07,taxRate:0.086,
  }});

  await prisma.hotelAmenity.createMany({data:spec.amenities.map((code)=>({hotelId:hotel.id,code,name:amenityNames[code]??code,category:"PROPERTY"}))});

  const photos=demoPhotosFor(index);
  const hotelPhotoIds=[];
  for (let sortOrder=0;sortOrder<photos.length;sortOrder+=1) {
    const photo=photos[sortOrder];
    const media=await prisma.mediaObject.create({data:{
      hotelId:hotel.id,uploadedByUserId:demoMediaUploaderId,kind:"HOTEL_IMAGE",state:"READY",visibility:"PUBLIC",
      objectKey:`demo/${spec.slug}/${String(sortOrder+1).padStart(2,"0")}-${photo.id}.jpg`,
      originalFileName:`demo-${photo.id}.jpg`,contentType:"image/jpeg",expectedSizeBytes:0,
      publicUrl:photo.url,uploadExpiresAt:new Date(now.getTime()+31_536_000_000),uploadedAt:now,
    }});
    const hotelPhoto=await prisma.hotelPhoto.create({data:{hotelId:hotel.id,mediaObjectId:media.id,alt:`${photo.alt} for fictional property ${spec.name}`,sortOrder}});
    hotelPhotoIds.push(hotelPhoto.id);
  }


  const roomSpecs=[
    {name:"Classic King",code:"KING",description:"A calm king room with a dedicated work area, private bathroom and practical comforts for a clear short or extended stay.",unitType:"ROOM",quantity:8+(index%5),maxGuests:3,maxAdults:2,maxChildren:1,maxInfants:1,bedroomCount:1,livingRoomCount:0,bathroomCount:1,sizeValue:32,extraBedCount:0,cribCount:1,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0}],amenities:[["AIR_CONDITIONING","Air conditioning","Comfort"],["FLAT_SCREEN_TV","Flat-screen TV","Media"],["PRIVATE_ENTRANCE","Private entrance","Access"],["TEA_COFFEE","Tea/Coffee maker","Kitchen"],["WIFI","Wi-Fi","Connectivity"]],premium:0,inventory:8+(index%5)},
    {name:"Family Suite",code:"FAMILY",description:"A spacious family suite with a separate bedroom and living area, flexible sleeping layout and room-level facilities for longer stays.",unitType:"SUITE",quantity:4+(index%4),maxGuests:5,maxAdults:3,maxChildren:2,maxInfants:1,bedroomCount:1,livingRoomCount:1,bathroomCount:1,sizeValue:58,extraBedCount:1,cribCount:1,beds:[{area:"Bedroom 1",type:"KING",quantity:1,sortOrder:0},{area:"Living room",type:"SOFA_BED",quantity:1,sortOrder:1}],amenities:[["AIR_CONDITIONING","Air conditioning","Comfort"],["FLAT_SCREEN_TV","Flat-screen TV","Media"],["SEATING_AREA","Seating area","Living"],["REFRIGERATOR","Refrigerator","Kitchen"],["WIFI","Wi-Fi","Connectivity"],["CITY_VIEW","City view","View"]],premium:38,inventory:4+(index%4)},
  ];

  for (const [roomIndex,roomSpec] of roomSpecs.entries()) {
    const room=await prisma.roomType.create({data:{hotelId:hotel.id,name:roomSpec.name,code:roomSpec.code,description:roomSpec.description,unitType:roomSpec.unitType,quantity:roomSpec.quantity,maxGuests:roomSpec.maxGuests,maxAdults:roomSpec.maxAdults,maxChildren:roomSpec.maxChildren,maxInfants:roomSpec.maxInfants,bedroomCount:roomSpec.bedroomCount,livingRoomCount:roomSpec.livingRoomCount,bathroomCount:roomSpec.bathroomCount,privateBathroom:true,sizeValue:roomSpec.sizeValue,sizeUnit:"SQM",smokingPolicy:"NON_SMOKING",extraBedCount:roomSpec.extraBedCount,cribCount:roomSpec.cribCount,allowsCribAndExtraBed:false,active:true,beds:{create:roomSpec.beds},amenities:{create:roomSpec.amenities.map(([code,name,category])=>({code,name,category}))}}});
    if (hotelPhotoIds[roomIndex]) await prisma.hotelPhoto.update({where:{id:hotelPhotoIds[roomIndex]},data:{roomTypeId:room.id}});
    await prisma.inventoryDay.createMany({data:Array.from({length:120},(_,offset)=>({roomTypeId:room.id,date:dayAt(offset),available:roomSpec.inventory,overbookingLimit:0}))});

    const flexible=await prisma.ratePlan.create({data:{
      roomTypeId:room.id,name:"Flexible Breakfast",code:"FLEX",refundable:true,mealPlan:"BREAKFAST",allowPayNow:true,allowPayAtHotel:true,active:true,
      cancellationPolicy:{create:{name:"Free cancellation until 3 days before arrival",noShowPenaltyType:"FULL_STAY",rules:{create:[{minimumDaysBeforeArrival:3,penaltyType:"NONE"},{minimumDaysBeforeArrival:0,penaltyType:"FIRST_NIGHT"}]}}},
    }});
    const saver=await prisma.ratePlan.create({data:{
      roomTypeId:room.id,name:"Saver Rate",code:"SAVER",refundable:false,mealPlan:"ROOM_ONLY",allowPayNow:true,allowPayAtHotel:true,active:true,
      cancellationPolicy:{create:{name:"Non-refundable",noShowPenaltyType:"FULL_STAY",rules:{create:[{minimumDaysBeforeArrival:0,penaltyType:"FULL_STAY"}]}}},
    }});

    await prisma.dailyRate.createMany({data:Array.from({length:120},(_,offset)=>({ratePlanId:flexible.id,date:dayAt(offset),baseRate:rateFor(spec.base,offset,roomSpec.premium),minStay:1,closed:false,stopSell:false}))});
    await prisma.dailyRate.createMany({data:Array.from({length:120},(_,offset)=>({ratePlanId:saver.id,date:dayAt(offset),baseRate:Number((rateFor(spec.base,offset,roomSpec.premium)*0.92).toFixed(2)),minStay:1,closed:false,stopSell:false}))});

    if (roomSpec.code==="KING") {
      const discount=10+(index%5)*2;
      const promo=await prisma.promotion.create({data:{hotelId:hotel.id,name:`Staging Deal ${discount}%`,code:"DEMO_DEAL",discountPercent:discount,bookingStartsAt:new Date(now.getTime()-86_400_000),bookingEndsAt:dayAt(90),stayStartsOn:dayAt(0),stayEndsOn:dayAt(119),minimumNights:2,status:"ACTIVE"}});
      await prisma.promotionRatePlan.create({data:{promotionId:promo.id,ratePlanId:saver.id}});
    }
  }

  console.log(`[demo-seed] ${String(index+1).padStart(2,"0")}/20 ${spec.name} · ${spec.city} · from ${spec.base} JOD`);
}

try {
  const demoMediaUploader=await prisma.user.upsert({
    where:{email:"demo-media@handmekey.invalid"},
    create:{email:"demo-media@handmekey.invalid",displayName:"HandMeKey Demo Media",platformRole:"GUEST"},
    update:{displayName:"HandMeKey Demo Media",platformRole:"GUEST"},
    select:{id:true},
  });
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
  const count=seededHotels.length;
  const photoCount=await prisma.hotelPhoto.count({where:{hotelId:{in:seededHotels.map((hotel)=>hotel.id)}}});
  if (count!==hotels.length||photoCount!==hotels.length*6) throw new Error(`[demo-seed] integrity check failed: expected ${hotels.length} hotels and ${hotels.length*6} photos, received ${count} and ${photoCount}`);
  console.log(`[demo-seed] complete: ${count} fictional ACTIVE + verified properties, ${photoCount} licensed demo photos, 0 seeded reviews`);
  console.log(`[demo-seed] availability seeded ${isoDate(dayAt(0))} through ${isoDate(dayAt(119))}`);
} finally {
  await prisma.$disconnect();
}
