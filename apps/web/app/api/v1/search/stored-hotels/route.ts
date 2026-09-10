import {NextResponse} from "next/server";
import {searchStoredNuiteeHotelPreviewPage} from "@platform/server";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  const url=new URL(request.url);
  const destination=(url.searchParams.get("destination")??"").trim();
  const country=(url.searchParams.get("country")??"JO").trim().toUpperCase();
  const offset=Math.max(0,Number(url.searchParams.get("offset")??0)||0);
  const limit=Math.max(1,Math.min(50,Number(url.searchParams.get("limit")??20)||20));
  const stars=url.searchParams.getAll("stars").flatMap((value)=>value.split(",")).map(Number).filter((value)=>Number.isFinite(value));
  const propertyType=(url.searchParams.get("propertyType")??"HOTEL").trim().toUpperCase();
  if(!destination)return NextResponse.json({hotels:[],total:0,nextOffset:null},{status:200});
  const page=await searchStoredNuiteeHotelPreviewPage(destination,country,limit,offset,stars,propertyType);
  return NextResponse.json(page,{headers:{"Cache-Control":"private, max-age=0, must-revalidate"}});
}
