import {bookNuitee} from "@platform/server";

type Body={prebookId?:unknown;firstName?:unknown;lastName?:unknown;email?:unknown;phone?:unknown};

export async function POST(request:Request){
  let body:Body;
  try{body=await request.json() as Body;}catch{return Response.json({error:{message:"Invalid JSON body"}},{status:400});}
  const prebookId=value(body.prebookId);
  const firstName=value(body.firstName);
  const lastName=value(body.lastName);
  const email=value(body.email);
  const phone=value(body.phone);
  if(!prebookId||!firstName||!lastName||!email||!email.includes("@"))return Response.json({error:{message:"Missing or invalid guest details"}},{status:400});
  try{
    const result=await bookNuitee({prebookId,holderFirstName:firstName,holderLastName:lastName,email,...(phone?{phone}:{})});
    return Response.json({data:result});
  }catch(error){
    console.error("Nuitee booking failed",error);
    return Response.json({error:{message:error instanceof Error?error.message:"Nuitee booking failed"}},{status:502});
  }
}
function value(input:unknown):string|undefined{return typeof input==="string"&&input.trim()?input.trim():undefined;}
