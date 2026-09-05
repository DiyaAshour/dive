import {database} from "@platform/database";

const BLOB_API_URL = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";
const FALLBACK_STORE_ID = "Yv9ln4LVsKxepm5O";
const PREFIX = "Cars images /";

type BlobRow = Readonly<{pathname:string;url:string;size?:number;uploadedAt?:string}>;
type BlobListResponse = Readonly<{blobs?:ReadonlyArray<BlobRow>;cursor?:string}>;
type BlobAuth = Readonly<{token:string;storeId:string}>;
type CarInfo = Readonly<{
  catalog_date?:string;
  folder:string;
  display_name?:string;
  make:string;
  model:string;
  year:number;
  body_type?:string;
  category:string;
  seats:number;
  bags:number;
  doors:number;
  transmission:string;
  fuel:string;
  drive?:string;
  air_conditioning?:boolean;
  market_note?:string;
}>;

type PriceDefaults = Readonly<{daily:number;deposit:number}>;

const EXACT_PRICES: Record<string, PriceDefaults> = {
  "Suzuki|Alto": {daily:20,deposit:80},
  "Kia|Picanto": {daily:21,deposit:80},
  "Hyundai|i20": {daily:23,deposit:100},
  "Nissan|Sunny": {daily:22,deposit:90},
  "Toyota|Yaris Sedan": {daily:24,deposit:100},
  "Kia|Pegas": {daily:24,deposit:100},
  "Hyundai|Accent": {daily:23,deposit:100},
  "Toyota|Corolla Sedan": {daily:28,deposit:120},
  "Hyundai|Elantra": {daily:29,deposit:120},
  "Toyota|Camry Hybrid": {daily:42,deposit:180},
  "MG|5": {daily:27,deposit:120},
  "Hyundai|Tucson": {daily:47,deposit:180},
  "Kia|Sportage": {daily:46,deposit:180},
  "Toyota|Corolla Cross Hybrid": {daily:49,deposit:180},
  "MG|ZS": {daily:40,deposit:150},
  "Mitsubishi|Outlander": {daily:52,deposit:200},
  "Mitsubishi|Pajero": {daily:66,deposit:250},
  "Toyota|Land Cruiser Prado": {daily:88,deposit:350},
  "Nissan|Patrol": {daily:105,deposit:450},
  "Hyundai|Staria": {daily:79,deposit:280},
  "Kia|Carnival": {daily:74,deposit:260},
  "Mercedes-Benz|V-Class": {daily:120,deposit:500},
  "Suzuki|Jimny": {daily:55,deposit:180},
  "Ford|Explorer": {daily:69,deposit:260},
  "Chevrolet|Tahoe": {daily:105,deposit:400},
  "Jetour|T2": {daily:72,deposit:280},
};

const auth = blobAuthCandidates()[0];
if (!auth) throw new Error("HandMeKey car import requires VERCEL_OIDC_TOKEN or BLOB_READ_WRITE_TOKEN");

const blobs = await listAllBlobs(auth, PREFIX);
const infoBlobs = blobs.filter((blob)=>/^Cars images \/2026-\d{2}-\d{2}_.+\/car-info\.json$/i.test(blob.pathname));
if (!infoBlobs.length) throw new Error("No dated HandMeKey vehicle folders were found in Cars images /");

const cars: Array<{info:CarInfo;folderBlobs:BlobRow[]}> = [];
for (const infoBlob of infoBlobs) {
  const response = await fetch(infoBlob.url, {cache:"no-store"});
  if (!response.ok) throw new Error(`Unable to read ${infoBlob.pathname}: HTTP ${response.status}`);
  const info = await response.json() as CarInfo;
  validateInfo(info, infoBlob.pathname);
  const folderPrefix = `${PREFIX}${info.folder}/`;
  const folderBlobs = blobs.filter((blob)=>blob.pathname.startsWith(folderPrefix));
  cars.push({info, folderBlobs});
}

cars.sort((a,b)=>`${a.info.make} ${a.info.model}`.localeCompare(`${b.info.make} ${b.info.model}`));

const db = database();
const company = await db.carRentalCompany.upsert({
  where: {slug:"handmekey"},
  create: {
    name:"HandMeKey",
    slug:"handmekey",
    city:"Amman",
    countryCode:"JO",
    address:"Amman, Jordan",
    timezone:"Asia/Amman",
    currency:"JOD",
    status:"ACTIVE",
    verified:true,
    supportEmail:null,
    supportPhone:null,
    commissionRate:0.10,
  },
  update: {
    name:"HandMeKey",
    city:"Amman",
    countryCode:"JO",
    timezone:"Asia/Amman",
    currency:"JOD",
    status:"ACTIVE",
    verified:true,
  },
});

let location = await db.carRentalLocation.findFirst({
  where:{companyId:company.id,airportCode:"AMM"},
  orderBy:{createdAt:"asc"},
});
if (!location) {
  location = await db.carRentalLocation.create({
    data:{
      companyId:company.id,
      name:"Queen Alia International Airport",
      city:"Amman",
      address:"Queen Alia International Airport, Amman, Jordan",
      airportCode:"AMM",
      pickupEnabled:true,
      returnEnabled:true,
      active:true,
    },
  });
} else if (!location.active || !location.pickupEnabled || !location.returnEnabled) {
  location = await db.carRentalLocation.update({
    where:{id:location.id},
    data:{active:true,pickupEnabled:true,returnEnabled:true},
  });
}

const admin = await db.user.findFirst({
  where:{platformRole:"PLATFORM_ADMIN"},
  orderBy:{createdAt:"asc"},
  select:{id:true,email:true,displayName:true},
});
let ownerLinked = false;
if (admin) {
  const activeMembership = await db.carCompanyMembership.findFirst({where:{userId:admin.id,status:"ACTIVE"}});
  if (!activeMembership || activeMembership.companyId === company.id) {
    await db.carCompanyMembership.upsert({
      where:{companyId_userId:{companyId:company.id,userId:admin.id}},
      create:{companyId:company.id,userId:admin.id,role:"OWNER",status:"ACTIVE"},
      update:{role:"OWNER",status:"ACTIVE"},
    });
    ownerLinked = true;
  }
}

let createdVehicles = 0;
let updatedVehicles = 0;
let createdCatalog = 0;
let updatedCatalog = 0;
let assetCount = 0;
const imported: string[] = [];

for (const {info, folderBlobs} of cars) {
  const hero = asset(folderBlobs, "view-280.webp") ?? asset(folderBlobs, "front.webp");
  const front = asset(folderBlobs, "front.webp");
  const rear = asset(folderBlobs, "rear.webp");
  const left = asset(folderBlobs, "left.webp");
  const right = asset(folderBlobs, "right.webp");
  if (!hero || !front || !rear || !left || !right) throw new Error(`Incomplete image set for ${info.make} ${info.model}`);

  const catalogSlug = `handmekey-${slugify(info.make)}-${slugify(info.model)}-${info.year}`.slice(0,120);
  let catalog = await db.carCatalogVehicle.findUnique({where:{slug:catalogSlug}});
  if (!catalog) {
    catalog = await db.carCatalogVehicle.create({
      data:{
        slug:catalogSlug,
        make:info.make,
        model:info.model,
        year:info.year,
        bodyType:info.body_type ?? null,
        category:info.category,
        transmission:transmission(info.transmission),
        fuel:fuel(info.fuel),
        seats:info.seats,
        bags:info.bags,
        doors:info.doors,
        provider:"HANDMEKEY",
        providerVehicleId:info.folder,
        providerRevision:info.catalog_date ?? "2026-09-05",
        primaryImageUrl:hero.url,
        exterior360Available:false,
        interior360Available:false,
        reviewed:true,
        active:true,
        lastSyncedAt:new Date(),
      },
    });
    createdCatalog++;
  } else {
    catalog = await db.carCatalogVehicle.update({
      where:{id:catalog.id},
      data:{
        make:info.make,
        model:info.model,
        year:info.year,
        bodyType:info.body_type ?? null,
        category:info.category,
        transmission:transmission(info.transmission),
        fuel:fuel(info.fuel),
        seats:info.seats,
        bags:info.bags,
        doors:info.doors,
        provider:"HANDMEKEY",
        providerVehicleId:info.folder,
        providerRevision:info.catalog_date ?? "2026-09-05",
        primaryImageUrl:hero.url,
        reviewed:true,
        active:true,
        lastSyncedAt:new Date(),
      },
    });
    updatedCatalog++;
  }

  await db.carCatalogAsset.deleteMany({where:{catalogVehicleId:catalog.id,provider:"HANDMEKEY"}});
  const assets = [
    {type:"HERO" as const, blob:hero, angle:"high three-quarter", sortOrder:0},
    {type:"EXTERIOR_FRONT" as const, blob:front, angle:"front three-quarter", sortOrder:10},
    {type:"EXTERIOR_REAR" as const, blob:rear, angle:"rear three-quarter", sortOrder:20},
    {type:"EXTERIOR_SIDE_LEFT" as const, blob:left, angle:"left side", sortOrder:30},
    {type:"EXTERIOR_SIDE_RIGHT" as const, blob:right, angle:"right side", sortOrder:40},
  ];
  await db.carCatalogAsset.createMany({
    data:assets.map(({type,blob,angle,sortOrder})=>({
      catalogVehicleId:catalog.id,
      type,
      provider:"HANDMEKEY" as const,
      url:blob.url,
      angle,
      sortOrder,
      active:true,
      sourceRef:blob.pathname,
    })),
  });
  assetCount += assets.length;

  const existing = await db.carVehicle.findFirst({
    where:{companyId:company.id,make:info.make,model:info.model,year:info.year},
    orderBy:{createdAt:"asc"},
  });
  const publicCategory = category(info.category, info.body_type);
  const defaults = EXACT_PRICES[`${info.make}|${info.model}`] ?? fallbackPrice(info.category);
  let vehicle;
  if (!existing) {
    vehicle = await db.carVehicle.create({
      data:{
        companyId:company.id,
        homeLocationId:location.id,
        make:info.make,
        model:info.model,
        year:info.year,
        category:publicCategory,
        transmission:transmission(info.transmission),
        fuel:fuel(info.fuel),
        seats:info.seats,
        bags:info.bags,
        doors:info.doors,
        airConditioning:info.air_conditioning !== false,
        dailyPrice:defaults.daily,
        deposit:defaults.deposit,
        freeCancellation:true,
        unlimitedMileage:true,
        airportPickup:true,
        imageUrl:hero.url,
        imageAlt:`${info.make} ${info.model} ${info.year}`,
        status:"ACTIVE",
      },
    });
    createdVehicles++;
  } else {
    vehicle = await db.carVehicle.update({
      where:{id:existing.id},
      data:{
        homeLocationId:location.id,
        category:publicCategory,
        transmission:transmission(info.transmission),
        fuel:fuel(info.fuel),
        seats:info.seats,
        bags:info.bags,
        doors:info.doors,
        airConditioning:info.air_conditioning !== false,
        imageUrl:hero.url,
        imageAlt:`${info.make} ${info.model} ${info.year}`,
      },
    });
    updatedVehicles++;
  }

  await db.carVehicleCatalogLink.upsert({
    where:{vehicleId:vehicle.id},
    create:{vehicleId:vehicle.id,catalogVehicleId:catalog.id,matchedBy:"HANDMEKEY_BLOB_IMPORT"},
    update:{catalogVehicleId:catalog.id,matchedBy:"HANDMEKEY_BLOB_IMPORT"},
  });

  imported.push(`${info.make} ${info.model} ${info.year}`);
}

console.log(`[handmekey-car-import] company=${company.id} slug=${company.slug} status=${company.status} verified=${company.verified}`);
console.log(`[handmekey-car-import] location=${location.id} ${location.name}`);
console.log(`[handmekey-car-import] admin=${admin ? `${admin.displayName} <${admin.email}>` : "not-found"} ownerLinked=${ownerLinked}`);
console.log(`[handmekey-car-import] vehicles=${cars.length} created=${createdVehicles} updated=${updatedVehicles} catalogCreated=${createdCatalog} catalogUpdated=${updatedCatalog} assets=${assetCount}`);
console.log(`[handmekey-car-import] imported=${JSON.stringify(imported)}`);

async function listAllBlobs(blobAuth:BlobAuth,prefix:string) {
  const output:BlobRow[]=[];
  let cursor:string|undefined;
  do {
    const url=new URL(BLOB_API_URL);
    url.searchParams.set("limit","1000");
    url.searchParams.set("prefix",prefix);
    if(cursor) url.searchParams.set("cursor",cursor);
    const response=await fetch(url,{headers:{authorization:`Bearer ${blobAuth.token}`,"x-api-version":BLOB_API_VERSION,"x-vercel-blob-store-id":blobAuth.storeId},cache:"no-store"});
    if(!response.ok) throw new Error(`Blob list failed: HTTP ${response.status}`);
    const body=await response.json() as BlobListResponse;
    output.push(...(body.blobs??[]));
    cursor=body.cursor||undefined;
  } while(cursor);
  return output;
}

function blobAuthCandidates():BlobAuth[]{
  const candidates:BlobAuth[]=[];
  const oidc=process.env.VERCEL_OIDC_TOKEN?.trim();
  if(oidc)candidates.push({token:oidc,storeId:FALLBACK_STORE_ID});
  const readWrite=process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if(readWrite){const storeId=readWrite.split("_")[3]?.trim();if(storeId)candidates.unshift({token:readWrite,storeId});}
  const seen=new Set<string>();
  return candidates.filter((candidate)=>{const key=`${candidate.storeId}:${candidate.token}`;if(seen.has(key))return false;seen.add(key);return true;});
}
function validateInfo(info:CarInfo,path:string){
  if(!info.folder||!info.make||!info.model||!Number.isInteger(info.year)||!Number.isInteger(info.seats)||!Number.isInteger(info.bags)||!Number.isInteger(info.doors)) throw new Error(`Invalid car-info.json: ${path}`);
}
function asset(blobs:BlobRow[],file:string){return blobs.find((blob)=>blob.pathname.endsWith(`/${file}`));}
function transmission(value:string){return value.toLowerCase()==="manual"?"MANUAL" as const:"AUTOMATIC" as const;}
function fuel(value:string){const normalized=value.toUpperCase();if(normalized==="DIESEL")return"DIESEL" as const;if(normalized==="HYBRID")return"HYBRID" as const;if(normalized==="ELECTRIC")return"ELECTRIC" as const;return"PETROL" as const;}
function category(value:string,bodyType?:string){
  const normalized=value.toLowerCase();
  if(normalized==="economy")return"Economy";
  if(normalized==="compact")return"Compact";
  if(normalized==="standard")return"Sedan";
  if(normalized==="premium"&&!bodyType?.toLowerCase().includes("suv"))return"Luxury";
  if(normalized.includes("van"))return"Van";
  if(normalized.includes("suv")||normalized.includes("4x4")||normalized==="7_seater")return"SUV";
  return bodyType?.toLowerCase().includes("sedan")?"Sedan":"SUV";
}
function fallbackPrice(value:string):PriceDefaults{
  const normalized=value.toLowerCase();
  if(normalized==="economy")return{daily:22,deposit:80};
  if(normalized==="compact")return{daily:25,deposit:100};
  if(normalized==="standard")return{daily:30,deposit:120};
  if(normalized==="premium")return{daily:45,deposit:180};
  if(normalized==="suv"||normalized==="hybrid_suv")return{daily:48,deposit:180};
  if(normalized==="7_seater")return{daily:60,deposit:240};
  if(normalized==="4x4")return{daily:65,deposit:250};
  if(normalized==="premium_4x4"||normalized==="premium_suv")return{daily:95,deposit:350};
  if(normalized==="van")return{daily:75,deposit:260};
  if(normalized==="luxury_van")return{daily:120,deposit:500};
  return{daily:45,deposit:180};
}
function slugify(value:string){return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
