import type {DiscoverySearchInput} from "@platform/contracts";

const DESTINATIONS:Readonly<Record<string,{slug:string;nameEn:string;nameAr:string}>>={
  amman:{slug:"amman",nameEn:"Amman",nameAr:"عمّان"},
  "عمان":{slug:"amman",nameEn:"Amman",nameAr:"عمّان"},
  "عمّان":{slug:"amman",nameEn:"Amman",nameAr:"عمّان"},
  aqaba:{slug:"aqaba",nameEn:"Aqaba",nameAr:"العقبة"},
  "العقبة":{slug:"aqaba",nameEn:"Aqaba",nameAr:"العقبة"},
  petra:{slug:"petra",nameEn:"Petra",nameAr:"البتراء"},
  "البتراء":{slug:"petra",nameEn:"Petra",nameAr:"البتراء"},
  "dead sea":{slug:"dead-sea",nameEn:"Dead Sea",nameAr:"البحر الميت"},
  "البحر الميت":{slug:"dead-sea",nameEn:"Dead Sea",nameAr:"البحر الميت"},
};

/**
 * Legacy compatibility shim. Public search no longer serves fictional demo
 * properties, but callers still use this function to preserve destination
 * resolution when the production catalogue is empty or temporarily unavailable.
 */
export function demoSearchFallback(input:DiscoverySearchInput){
  const key=normalize(input.destination);
  const match=DESTINATIONS[key]??null;
  const pageSize=Math.max(1,Math.min(input.pageSize,50));
  return {
    query:input,
    resolvedDestination:match?{
      id:`fallback-destination-${match.slug}`,
      slug:match.slug,
      type:"CITY" as const,
      countryCode:"JO",
      nameEn:match.nameEn,
      nameAr:match.nameAr,
    }:null,
    count:0,
    candidateCount:0,
    results:[],
    pagination:{pageSize,scanned:0,offset:0,nextCursor:null as string|null,hasMore:false},
  };
}

function normalize(value:string){
  return value.normalize("NFKD").toLowerCase().replace(/[\u064b-\u065f\u0670]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").trim().replace(/\s+/g," ");
}
