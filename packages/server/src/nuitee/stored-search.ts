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
      OR:[{city:{contains:query,mode:"insensitive"}},{area:{contains:query,mode:"insensitive"}},{name:{contains:query,mode:"insensitive"}}],
    },
    orderBy:[{starRating:"desc"},{name:"asc"}],
    take:Math.max(1,Math.min(50,limit)),
    select:{providerHotelId:true,name:true,city:true,area:true,starRating:true,raw:true},
  });
  return rows.map((row)=>{
    const raw=record(row.raw);
    const cover=coverPhoto(raw,row.name);
    const rating=numberValue(raw.rating);
    return {
      id:`nuitee:${row.providerHotelId}`,
      slug:`nuitee-${row.providerHotelId}`,
      name:row.name,
      city:row.city??query,
      area:row.area,
      starRating:row.starRating,
      coverPhoto:cover,
      reviewSummary:{count:Math.max(0,Math.round(numberValue(raw.reviewCount)??0)),overall:rating===null?null:Math.max(0,Math.min(10,rating))},
    };
  });
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
