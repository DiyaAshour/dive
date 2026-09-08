import {ApplicationError,createNuiteeCheckoutSession} from "@platform/server";

type Body={proof?:unknown;firstName?:unknown;lastName?:unknown;email?:unknown;phone?:unknown};

export async function POST(request:Request){
  let body:Body;
  try{body=await request.json() as Body;}catch{return Response.json({error:{code:"INVALID_JSON",message:"Invalid JSON body"}},{status:400});}
  const proof=value(body.proof);
  const firstName=value(body.firstName);
  const lastName=value(body.lastName);
  const email=value(body.email);
  const phone=value(body.phone);
  if(!proof||!firstName||!lastName||!email)return Response.json({error:{code:"MISSING_DETAILS",message:"Checkout proof and guest details are required"}},{status:400});
  try{
    const result=await createNuiteeCheckoutSession({proof,guest:{firstName,lastName,email,...(phone?{phone}:{})},origin:new URL(request.url).origin});
    return Response.json({data:result},{headers:{"cache-control":"no-store"}});
  }catch(error){
    const status=error instanceof ApplicationError?error.status:500;
    const code=error instanceof ApplicationError?error.code:"NUITEE_CHECKOUT_SESSION_FAILED";
    const message=error instanceof Error?error.message:"Could not create Nuitee checkout session";
    console.error("Nuitee checkout session creation failed",{code,status,message});
    return Response.json({error:{code,message}},{status,headers:{"cache-control":"no-store"}});
  }
}
function value(input:unknown):string|undefined{return typeof input==="string"&&input.trim()?input.trim():undefined;}
