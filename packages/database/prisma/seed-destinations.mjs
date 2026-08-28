import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  dotenv.config({path:fileURLToPath(new URL("../../../.env", import.meta.url))});
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const { PrismaClient } = await import("../src/generated/prisma/client.ts");
const prisma = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});

const destinations = [
  {
    slug:"jordan",type:"COUNTRY",countryCode:"JO",nameEn:"Jordan",nameAr:"الأردن",sortOrder:0,
    latitude:31.24,longitude:36.51,radiusKm:270,
    seoTitleEn:"Hotels in Jordan | HandMeKey",seoTitleAr:"فنادق الأردن | HandMeKey",
    seoDescriptionEn:"Compare verified hotels across Jordan with live availability, clear cancellation terms and the final stay price before booking.",
    seoDescriptionAr:"قارن فنادق موثقة في الأردن مع توفر مباشر وشروط إلغاء واضحة والسعر النهائي للإقامة قبل الحجز.",
    aliases:[["Jordan","en",140],["Hashemite Kingdom of Jordan","en",80],["الأردن","ar",150],["الاردن","ar",145]],
  },
  {
    slug:"amman",type:"CITY",countryCode:"JO",nameEn:"Amman",nameAr:"عمّان",parentSlug:"jordan",sortOrder:10,
    latitude:31.9539,longitude:35.9106,radiusKm:28,
    seoTitleEn:"Hotels in Amman, Jordan | HandMeKey",seoTitleAr:"فنادق عمّان، الأردن | HandMeKey",
    seoDescriptionEn:"Find hotels in Amman with live room availability, verified stay reviews and final JOD prices before checkout.",
    seoDescriptionAr:"اكتشف فنادق عمّان مع توفر غرف مباشر وتقييمات من إقامات موثقة وأسعار نهائية بالدينار قبل الحجز.",
    aliases:[["Amman","en",160],["Ammam","en",60],["عمّان","ar",170],["عمان","ar",165]],
  },
  {
    slug:"aqaba",type:"CITY",countryCode:"JO",nameEn:"Aqaba",nameAr:"العقبة",parentSlug:"jordan",sortOrder:20,
    latitude:29.5321,longitude:35.0063,radiusKm:32,
    seoTitleEn:"Hotels in Aqaba, Jordan | HandMeKey",seoTitleAr:"فنادق العقبة، الأردن | HandMeKey",
    seoDescriptionEn:"Compare Aqaba hotels, Red Sea stays and live room rates with the final price, payment choice and cancellation terms shown clearly.",
    seoDescriptionAr:"قارن فنادق العقبة وإقامات البحر الأحمر مع أسعار غرف مباشرة والسعر النهائي وخيارات الدفع وشروط الإلغاء بوضوح.",
    aliases:[["Aqaba","en",170],["Akaba","en",85],["Aqaba Jordan","en",130],["العقبة","ar",180],["عقبة","ar",150],["العقبه","ar",145]],
  },
  {
    slug:"petra",type:"CITY",countryCode:"JO",nameEn:"Petra",nameAr:"البتراء",parentSlug:"jordan",sortOrder:30,
    latitude:30.3285,longitude:35.4444,radiusKm:22,
    seoTitleEn:"Hotels in Petra, Jordan | HandMeKey",seoTitleAr:"فنادق البتراء، الأردن | HandMeKey",
    seoDescriptionEn:"Book hotels around Petra and Wadi Musa with live availability, transparent stay totals and verified property information.",
    seoDescriptionAr:"احجز فنادق قرب البتراء ووادي موسى مع توفر مباشر وإجمالي إقامة واضح ومعلومات فنادق موثقة.",
    aliases:[["Petra","en",170],["Wadi Musa","en",135],["البتراء","ar",180],["بترا","ar",140],["وادي موسى","ar",150]],
  },
  {
    slug:"dead-sea",type:"REGION",countryCode:"JO",nameEn:"Dead Sea",nameAr:"البحر الميت",parentSlug:"jordan",sortOrder:40,
    latitude:31.5590,longitude:35.4732,radiusKm:55,
    seoTitleEn:"Dead Sea Hotels in Jordan | HandMeKey",seoTitleAr:"فنادق البحر الميت في الأردن | HandMeKey",
    seoDescriptionEn:"Compare Dead Sea resorts and hotels in Jordan with live rates, clear cancellation conditions and final stay totals.",
    seoDescriptionAr:"قارن منتجعات وفنادق البحر الميت في الأردن مع أسعار مباشرة وشروط إلغاء واضحة وإجمالي نهائي للإقامة.",
    aliases:[["Dead Sea","en",175],["Dead Sea Jordan","en",145],["البحر الميت","ar",185],["بحر الميت","ar",160]],
  },
  {slug:"aqaba-city-centre",type:"AREA",countryCode:"JO",nameEn:"City Centre",nameAr:"وسط العقبة",parentSlug:"aqaba",sortOrder:10,latitude:29.532,longitude:35.006,radiusKm:4,aliases:[["Aqaba City Centre","en",125],["Downtown Aqaba","en",110],["وسط العقبة","ar",135]]},
  {slug:"aqaba-marina",type:"AREA",countryCode:"JO",nameEn:"Marina District",nameAr:"منطقة المارينا",parentSlug:"aqaba",sortOrder:20,latitude:29.528,longitude:34.999,radiusKm:5,aliases:[["Aqaba Marina","en",140],["Marina District","en",125],["مارينا العقبة","ar",145],["المارينا","ar",100]]},
  {slug:"south-beach",type:"AREA",countryCode:"JO",nameEn:"South Beach",nameAr:"الشاطئ الجنوبي",parentSlug:"aqaba",sortOrder:30,latitude:29.442,longitude:34.973,radiusKm:10,aliases:[["South Beach","en",150],["Aqaba South Beach","en",145],["الشاطئ الجنوبي","ar",160],["شاطئ الجنوب","ar",150]]},
  {slug:"ayla",type:"AREA",countryCode:"JO",nameEn:"Ayla District",nameAr:"أيلة",parentSlug:"aqaba",sortOrder:40,latitude:29.548,longitude:34.998,radiusKm:7,aliases:[["Ayla","en",160],["Ayla Aqaba","en",145],["Ayla District","en",130],["أيلة","ar",160],["ايلة","ar",155]]},
  {slug:"tala-bay",type:"AREA",countryCode:"JO",nameEn:"Tala Bay",nameAr:"تالا باي",parentSlug:"aqaba",sortOrder:50,latitude:29.408,longitude:34.979,radiusKm:8,aliases:[["Tala Bay","en",165],["Tala Bay Aqaba","en",150],["تالا باي","ar",170],["خليج تالا","ar",120]]},
  {slug:"wadi-musa",type:"AREA",countryCode:"JO",nameEn:"Wadi Musa",nameAr:"وادي موسى",parentSlug:"petra",sortOrder:10,latitude:30.322,longitude:35.481,radiusKm:10,aliases:[["Wadi Musa","en",165],["Petra Wadi Musa","en",130],["وادي موسى","ar",175]]},
  {slug:"sweimeh",type:"AREA",countryCode:"JO",nameEn:"Sweimeh",nameAr:"سويمة",parentSlug:"dead-sea",sortOrder:10,latitude:31.715,longitude:35.585,radiusKm:20,aliases:[["Sweimeh","en",160],["Sowayma","en",110],["Dead Sea Sweimeh","en",135],["سويمة","ar",165],["السويمة","ar",150]]},
];

const ammanAreas = [
  ["jabal-al-qalaa","Jabal Al Qala'a","جبل القلعة"],["shmeisani","Shmeisani","الشميساني"],["abdoun","Abdoun","عبدون"],["al-abdali","Al Abdali","العبدلي"],
  ["jabal-amman","Jabal Amman","جبل عمّان"],["sweifieh","Sweifieh","الصويفية"],["um-uthaina","Um Uthaina","أم أذينة"],["rainbow-street","Rainbow Street","شارع الرينبو"],
  ["khalda","Khalda","خلدا"],["dabouq","Dabouq","دابوق"],["al-rabieh","Al Rabieh","الرابية"],["7th-circle","7th Circle","الدوار السابع"],
];
for (const [slug,nameEn,nameAr] of ammanAreas) destinations.push({slug,type:"AREA",countryCode:"JO",nameEn,nameAr,parentSlug:"amman",sortOrder:100,aliases:[[nameEn,"en",130],[nameAr,"ar",140]]});

const bySlug = new Map();
try {
  for (const spec of destinations.filter((item)=>!item.parentSlug)) {
    bySlug.set(spec.slug, await upsertDestination(spec, null));
  }
  let remaining = destinations.filter((item)=>item.parentSlug);
  for (let pass=0; pass<6 && remaining.length; pass++) {
    const next=[];
    for (const spec of remaining) {
      const parent=bySlug.get(spec.parentSlug);
      if (!parent) { next.push(spec); continue; }
      bySlug.set(spec.slug, await upsertDestination(spec,parent.id));
    }
    remaining=next;
  }
  if (remaining.length) throw new Error(`Unresolved destination parents: ${remaining.map((item)=>item.slug).join(", ")}`);

  const allDestinations = await prisma.destination.findMany({where:{countryCode:"JO",active:true},include:{aliases:true}});
  const hotels = await prisma.hotel.findMany({select:{id:true,city:true,area:true,countryCode:true}});
  for (const hotel of hotels) {
    if (hotel.countryCode !== "JO") continue;
    const cityNorm=normalize(hotel.city);
    const areaNorm=normalize(hotel.area ?? "");
    const city = allDestinations.find((destination)=>[destination.nameEn,destination.nameAr,...destination.aliases.map((alias)=>alias.alias)].some((value)=>normalize(value ?? "")===cityNorm) && ["CITY","REGION"].includes(destination.type));
    if (!city) continue;
    const child = areaNorm ? allDestinations.find((destination)=>destination.parentId===city.id && [destination.nameEn,destination.nameAr,...destination.aliases.map((alias)=>alias.alias)].some((value)=>normalize(value ?? "")===areaNorm)) : null;
    await prisma.hotelDestination.deleteMany({where:{hotelId:hotel.id,destination:{countryCode:"JO"}}});
    await prisma.hotelDestination.create({data:{hotelId:hotel.id,destinationId:city.id,primary:true}});
    if (child) await prisma.hotelDestination.create({data:{hotelId:hotel.id,destinationId:child.id,primary:false}});
  }
  console.log(`Destination registry ready: ${allDestinations.length} Jordan destinations linked to ${hotels.length} hotel records.`);
} finally {
  await prisma.$disconnect();
}

async function upsertDestination(spec,parentId) {
  const destination=await prisma.destination.upsert({
    where:{slug:spec.slug},
    create:{type:spec.type,slug:spec.slug,countryCode:spec.countryCode,nameEn:spec.nameEn,nameAr:spec.nameAr??null,parentId,latitude:spec.latitude??null,longitude:spec.longitude??null,radiusKm:spec.radiusKm??null,seoTitleEn:spec.seoTitleEn??null,seoTitleAr:spec.seoTitleAr??null,seoDescriptionEn:spec.seoDescriptionEn??null,seoDescriptionAr:spec.seoDescriptionAr??null,sortOrder:spec.sortOrder??0},
    update:{type:spec.type,countryCode:spec.countryCode,nameEn:spec.nameEn,nameAr:spec.nameAr??null,parentId,latitude:spec.latitude??null,longitude:spec.longitude??null,radiusKm:spec.radiusKm??null,seoTitleEn:spec.seoTitleEn??null,seoTitleAr:spec.seoTitleAr??null,seoDescriptionEn:spec.seoDescriptionEn??null,seoDescriptionAr:spec.seoDescriptionAr??null,sortOrder:spec.sortOrder??0,active:true},
  });
  const aliases=[...(spec.aliases??[]),[spec.nameEn,"en",150],...(spec.nameAr?[[spec.nameAr,"ar",160]]:[])];
  for (const [alias,locale,weight] of aliases) {
    const normalized=normalize(alias);
    if (!normalized) continue;
    await prisma.destinationAlias.upsert({where:{destinationId_normalized:{destinationId:destination.id,normalized}},create:{destinationId:destination.id,alias,normalized,locale,weight},update:{alias,locale,weight}});
  }
  return destination;
}

function normalize(value) {
  return String(value ?? "").normalize("NFKD").toLowerCase().replace(/[\u064b-\u065f\u0670]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
}
