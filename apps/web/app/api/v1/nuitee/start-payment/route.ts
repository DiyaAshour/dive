import {ApplicationError,createNuiteeCheckoutProof,createNuiteeCheckoutSession,NuiteeApiError,prebookNuitee} from "@platform/server";

type Body={hotelId?:unknown;offerId?:unknown;hotelName?:unknown;city?:unknown;arrival?:unknown;departure?:unknown;adults?:unknown;children?:unknown;childrenAges?:unknown;guestNationality?:unknown;firstName?:unknown;lastName?:unknown;email?:unknown;phone?:unknown};

export async function POST(request:Request){
  let body:Body;
  try{body=await request.json() as Body;}catch{return fail(400,"INVALID_JSON","Invalid JSON body");}
  const hotelId=value(body.hotelId,120);
  const offerId=value(body.offerId,16_000);
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
  if(!hotelId||!offerId||!hotelName||!datesValid||adults<1||children<0||childrenAges.length!==children||!firstName||!lastName||!email||!email.includes("@"))return fail(400,"INVALID_CHECKOUT","Hotel, rate, stay and guest details are required");
  if(!/^[A-Za-z0-9_-]+$/.test(hotelId))return fail(400,"INVALID_HOTEL","Invalid hotel identifier");

  try{
    console.info("Nuitee payment prebook requested",{hotelId});
    const prebook=await prebookNuitee(offerId);
    if(!prebook.transactionId||!prebook.secretKey)throw new ApplicationError("NUITEE_PAYMENT_DATA_MISSING","Nuitee did not return payment session data",502);
    if(prebook.hotelId&&prebook.hotelId!==hotelId)throw new ApplicationError("NUITEE_HOTEL_MISMATCH","The selected rate belongs to another hotel",409);
    const proof=createNuiteeCheckoutProof({
      prebookId:prebook.prebookId,
      transactionId:prebook.transactionId,
      offerId:prebook.offerId||offerId,
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
      if(error.code===2001||error.code===4002||error.status===409)return fail(409,"NUITEE_RATE_CHANGED","The selected rate changed or sold out. View the latest rooms and choose the rate again.");
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

function fail(status:number,code:string,message:string){return Response.json({error:{code,message}},{status,headers:{"cache-control":"no-store"}});}
function value(input:unknown,max:number):string|undefined{return typeof input==="string"&&input.trim()?input.trim().replace(/[\u0000-\u001f\u007f]/g,"").slice(0,max):undefined;}
function integer(input:unknown,fallback:number):number{const parsed=typeof input==="number"?input:Number.parseInt(String(input??""),10);return Number.isFinite(parsed)&&Number.isInteger(parsed)?parsed:fallback;}
function ages(input:unknown):number[]{if(!Array.isArray(input))return[];return input.flatMap((item)=>{const age=typeof item==="number"?item:Number.parseInt(String(item),10);return Number.isInteger(age)&&age>=0&&age<=17?[age]:[];});}
