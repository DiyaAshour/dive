import {database} from "@platform/database";

type RawRecord = Record<string, unknown>;

export type StoredNuiteeHotelPreview = Readonly<{
  id:string;
  slug:string;
  name:string;
  city:string;
  area:string|null;
  starRating:number|null;
  coverPhoto:{url:string;alt:string}|null;
  reviewSummary:{count:number;overall:number|null};
}>;

export async function searchStoredNuiteeHotelPreviews(destination:string,countryCode="JO",limit=20):Promise<StoredNuiteeHotelPreview[]> {
  const query=destination.trim();
  if(!query)return[];
  const rows=await database().nuiteeContentHotel.findMany({
    where:{
      countryCode:countryCode.trim().toUpperCase(),
      claimedByHotelId:null,
      OR:[{city:{contains:query,mode:"insensitive"}},{area:{contains:query,mode:"insensitive"}},{name:{contains:query,mode:"insensitive"}}],
    },
    orderBy:[{starRating:"desc"},{name:"asc"}],
    take:Math.max(1,Math.min(50,limit)),
    select:{providerHotelId:true,name:true,city:true,area:true,starRating:true,raw:true},
  });
  return rows.map((row)=>toPreview(row,query));
}

export async function listDailyStoredNuiteeHotelPreviews(countryCode="JO",limit=6,date=new Date()):Promise<StoredNuiteeHotelPreview[]> {
  const normalizedCountry=countryCode.trim().toUpperCase()||"JO";
  const take=Math.max(1,Math.min(12,limit));
  const db=database();
  const where={countryCode:normalizedCountry,claimedByHotelId:null,starRating:5} as const;
  const count=await db.nuiteeContentHotel.count({where});
  if(count===0)return[];

  const dayKey=dailyKey(date,normalizedCountry);
  const seed=hash(`${normalizedCountry}:${dayKey}`);
  const poolSize=Math.min(count,Math.max(take*4,24));
  const maxSkip=Math.max(0,count-poolSize);
  const skip=maxSkip===0?0:seed%(maxSkip+1);
  const rows=await db.nuiteeContentHotel.findMany({
    where,
    orderBy:[{providerHotelId:"asc"}],
    skip,
    take:poolSize,
    select:{providerHotelId:true,name:true,city:true,area:true,starRating:true,raw:true},
  });

  return seededShuffle(rows,seed)
    .map((row)=>toPreview(row,row.city??""))
    .sort((a,b)=>Number(Boolean(b.coverPhoto))-Number(Boolean(a.coverPhoto)))
    .slice(0,take);
}

function dailyKey(date:Date,countryCode:string):string{
  if(countryCode==="JO"){
    return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Amman",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
  }
  return date.toISOString().slice(0,10);
}

function hash(value:string):number{
  let result=2166136261;
  for(let index=0;index<value.length;index+=1){
    result^=value.charCodeAt(index);
    result=Math.imul(result,16777619);
  }
  return result>>>0;
}

function seededShuffle<T>(items:T[],seed:number):T[]{
  const output=[...items];
  let state=seed||1;
  const random=()=>{
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/4294967296;
  };
  for(let index=output.length-1;index>0;index-=1){
    const swapIndex=Math.floor(random()*(index+1));
    [output[index],output[swapIndex]]=[output[swapIndex]!,output[index]!];
  }
  return output;
}

function toPreview(row:{providerHotelId:string;name:string;city:string|null;area:string|null;starRating:number|null;raw:unknown},fallbackCity:string):StoredNuiteeHotelPreview{
  const raw=record(row.raw);
  const cover=coverPhoto(raw,row.name);
  const rating=numberValue(raw.rating);
  return {
    id:`nuitee:${row.providerHotelId}`,
    slug:`nuitee-${row.providerHotelId}`,
    name:row.name,
    city:row.city??fallbackCity,
    area:row.area,
    starRating:row.starRating,
    coverPhoto:cover,
    reviewSummary:{count:Math.max(0,Math.round(numberValue(raw.reviewCount)??0)),overall:rating===null?null:Math.max(0,Math.min(10,rating))},
  };
}

function coverPhoto(raw:RawRecord,name:string):{url:string;alt:string}|null{
  const main=text(raw.main_photo)??text(raw.mainPhoto);
  if(main)return{url:main,alt:name};
  const images=Array.isArray(raw.hotelImages)?raw.hotelImages:[];
  for(const image of images){const item=record(image);const url=text(item.urlHd)??text(item.url);if(url)return{url,alt:text(item.caption)??name};}
  return null;
}
function record(value:unknown):RawRecord{return value&&typeof value==="object"&&!Array.isArray(value)?value as RawRecord:{};}
function text(value:unknown):string|null{return typeof value==="string"&&value.trim()?value.trim():null;}
function numberValue(value:unknown):number|null{const parsed=typeof value==="number"?value:typeof value==="string"?Number(value):NaN;return Number.isFinite(parsed)?parsed:null;}
