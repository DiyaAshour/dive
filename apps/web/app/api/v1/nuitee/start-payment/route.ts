import {ApplicationError,createNuiteeCheckoutProof,createNuiteeCheckoutSession,getNuiteeHotelDetails,NuiteeApiError,prebookNuitee,type NuiteeOffer} from "@platform/server";

type Body={hotelId?:unknown;offerId?:unknown;rateId?:unknown;mappedRoomId?:unknown;roomName?:unknown;boardCode?:unknown;boardName?:unknown;policyName?:unknown;selectedTotal?:unknown;selectedCurrency?:unknown;freeCancellation?:unknown;hotelName?:unknown;city?:unknown;arrival?:unknown;departure?:unknown;adults?:unknown;children?:unknown;childrenAges?:unknown;guestNationality?:unknown;firstName?:unknown;lastName?:unknown;email?:unknown;phone?:unknown};

type SelectedRate=Readonly<{offerId:string;rateId:string;roomName:string;mappedRoomId:string;boardCode:string;boardName:string;policyName:string;total:number;currency:string;freeCancellation:boolean}>;

export async function POST(request:Request){
  let body:Body;
  try{body=await request.json() as Body;}catch{return fail(400,"INVALID_JSON","Invalid JSON body");}
  const hotelId=value(body.hotelId,120);
  const offerId=value(body.offerId,16_000);
  const rateId=value(body.rateId,16_000)??"";
  const mappedRoomId=value(body.mappedRoomId,500)??"";
  const roomName=value(body.roomName,500)??"";
  const boardCode=value(body.boardCode,100)??"";
  const boardName=value(body.boardName,300)??"";
  const policyName=value(body.policyName,500)??"";
  const selectedTotal=money(body.selectedTotal);
  const selectedCurrency=(value(body.selectedCurrency,3)??"").toUpperCase();
  const freeCancellation=body.freeCancellation===true;
  const hotelName=value(body.hotelName,240);
  const city=value(body.city,160)??"";
  const arrival=value(body.arrival,10);
  const departure=value(body.departure,10);
  const adults=integer(body.adults,1);
  const children=integer(body.children,0);
  const childrenAges=ages(body.childrenAges);
  const guestNationality=(value(body.guestNationality,2)??"JO").toUpperCase();
  const firstName=value(body.firstName,100);
  const lastName=value(body.lastName,100);
  const email=value(body.email,254);
  const phone=value(body.phone,60);
  const datesValid=Boolean(arrival&&departure&&/^\d{4}-\d{2}-\d{2}$/.test(arrival)&&/^\d{4}-\d{2}-\d{2}$/.test(departure)&&Date.parse(`${departure}T00:00:00Z`)>Date.parse(`${arrival}T00:00:00Z`));
  if(!hotelId||!offerId||!hotelName||!roomName||selectedTotal===null||!/^[A-Z]{3}$/.test(selectedCurrency)||!datesValid||adults<1||children<0||childrenAges.length!==children||!firstName||!lastName||!email||!email.includes("@"))return fail(400,"INVALID_CHECKOUT","Hotel, selected rate, stay and guest details are required");
  if(!/^[A-Za-z0-9_-]+$/.test(hotelId))return fail(400,"INVALID_HOTEL","Invalid hotel identifier");

  const selected:SelectedRate={offerId,rateId,mappedRoomId,roomName,boardCode,boardName,policyName,total:selectedTotal,currency:selectedCurrency,freeCancellation};

  try{
    console.info("Nuitee live rate refresh requested",{hotelId});
    const freshHotel=await getNuiteeHotelDetails(hotelId,{destination:city||"Nuitee",arrival:arrival!,departure:departure!,adults,children,...(childrenAges.length?{childrenAges}:{}),guestNationality,currency:selectedCurrency});
    if(!freshHotel)throw new ApplicationError("NUITEE_HOTEL_UNAVAILABLE","The selected hotel is not currently available",409);
    const freshOffer=findMatchingOffer(freshHotel.offers,selected);
    if(!freshOffer){
      console.info("Nuitee selected rate changed before prebook",{hotelId,roomName,boardCode,selectedTotal,selectedCurrency});
      return fail(409,"NUITEE_RATE_CHANGED","The selected room, price or cancellation terms changed. View the latest rooms before paying.");
    }

    console.info("Nuitee payment prebook requested",{hotelId,refreshedOffer:true});
    const prebook=await prebookNuitee(freshOffer.offerId);
    if(!prebook.transactionId||!prebook.secretKey)throw new ApplicationError("NUITEE_PAYMENT_DATA_MISSING","Nuitee did not return payment session data",502);
    if(prebook.hotelId&&prebook.hotelId!==hotelId)throw new ApplicationError("NUITEE_HOTEL_MISMATCH","The selected rate belongs to another hotel",409);
    if(!sameMoney(prebook.price,freshOffer.total)||prebook.currency.toUpperCase()!==freshOffer.currency.toUpperCase()){
      throw new ApplicationError("NUITEE_PREBOOK_PRICE_CHANGED","Nuitee changed the price during prebook. No payment was started.",409);
    }
    const proof=createNuiteeCheckoutProof({
      prebookId:prebook.prebookId,
      transactionId:prebook.transactionId,
      offerId:prebook.offerId||freshOffer.offerId,
      hotelId,
      hotelName,
      city,
      roomName:prebook.roomName,
      boardName:prebook.boardName,
      arrival:arrival!,
      departure:departure!,
      adults,
      children,
      price:prebook.price,
      currency:prebook.currency,
      cancellationPolicy:prebook.cancellationPolicy,
      sandbox:prebook.sandbox,
    });
    const session=await createNuiteeCheckoutSession({proof,guest:{firstName,lastName,email,...(phone?{phone}:{})},origin:new URL(request.url).origin});
    console.info("Nuitee payment prebook created",{hotelId,state:session.state,sandbox:prebook.sandbox});
    return Response.json({data:{...session,secretKey:prebook.secretKey,sandbox:prebook.sandbox,hotelName,roomName:prebook.roomName,boardName:prebook.boardName,amount:prebook.price,currency:prebook.currency}},{headers:{"cache-control":"no-store"}});
  }catch(error){
    if(error instanceof NuiteeApiError){
      const detail=`${error.description??""} ${error.providerMessage??""}`.toLowerCase();
      console.error("Nuitee payment prebook rejected",{hotelId,status:error.status,code:error.code,description:error.description,message:error.providerMessage});
      if(error.code===2001||error.code===4002||error.status===409)return fail(409,"NUITEE_RATE_CHANGED","The selected room or rate sold out during the final availability check. View the latest rooms and try again.");
      if(error.code===5000&&detail.includes("payment"))return fail(502,"NUITEE_PAYMENT_CREATE_FAILED","Nuitee could not create the payment session for this rate. No charge or booking was created.");
      return fail(error.status>=500?502:400,"NUITEE_PREBOOK_FAILED","Nuitee could not prebook the selected rate. No charge or booking was created.");
    }
    const status=error instanceof ApplicationError?error.status:500;
    const code=error instanceof ApplicationError?error.code:"NUITEE_START_PAYMENT_FAILED";
    const message=error instanceof Error?error.message:"Could not start Nuitee payment";
    console.error("Nuitee start-payment failed",{hotelId,status,code,message});
    return fail(status,code,message);
  }
}

function findMatchingOffer(offers:readonly NuiteeOffer[],selected:SelectedRate):NuiteeOffer|null{
  const exact=offers.find((offer)=>offer.offerId===selected.offerId&&sameTerms(offer,selected));
  if(exact)return exact;
  const candidates=offers.filter((offer)=>sameTerms(offer,selected));
  if(selected.rateId){const byRateId=candidates.find((offer)=>offer.rateId===selected.rateId);if(byRateId)return byRateId;}
  if(selected.mappedRoomId){const byMappedRoom=candidates.find((offer)=>offer.mappedRoomId===selected.mappedRoomId);if(byMappedRoom)return byMappedRoom;}
  return candidates.find((offer)=>normalize(offer.roomName)===normalize(selected.roomName))??null;
}
function sameTerms(offer:NuiteeOffer,selected:SelectedRate):boolean{
  if(offer.currency.toUpperCase()!==selected.currency)return false;
  if(!sameMoney(offer.total,selected.total))return false;
  if(offer.freeCancellationNow!==selected.freeCancellation)return false;
  if(normalize(offer.boardCode??"")!==normalize(selected.boardCode))return false;
  if(normalize(offer.boardName??"")!==normalize(selected.boardName))return false;
  if(normalize(offer.cancellationPolicy.name)!==normalize(selected.policyName))return false;
  if(selected.mappedRoomId&&offer.mappedRoomId&&offer.mappedRoomId!==selected.mappedRoomId)return false;
  return true;
}
function sameMoney(left:number,right:number):boolean{return Math.abs(left-right)<=0.01;}
function normalize(input:string):string{return input.trim().toLowerCase().replace(/\s+/g," ");}
function fail(status:number,code:string,message:string){return Response.json({error:{code,message}},{status,headers:{"cache-control":"no-store"}});}
function value(input:unknown,max:number):string|undefined{return typeof input==="string"&&input.trim()?input.trim().replace(/[\u0000-\u001f\u007f]/g,"").slice(0,max):undefined;}
function integer(input:unknown,fallback:number):number{const parsed=typeof input==="number"?input:Number.parseInt(String(input??""),10);return Number.isFinite(parsed)&&Number.isInteger(parsed)?parsed:fallback;}
function ages(input:unknown):number[]{if(!Array.isArray(input))return[];return input.flatMap((item)=>{const age=typeof item==="number"?item:Number.parseInt(String(item),10);return Number.isInteger(age)&&age>=0&&age<=17?[age]:[];});}
function money(input:unknown):number|null{const parsed=typeof input==="number"?input:Number(input);return Number.isFinite(parsed)&&parsed>=0?parsed:null;}
