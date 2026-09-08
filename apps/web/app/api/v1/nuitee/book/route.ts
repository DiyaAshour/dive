import {bookNuitee} from "@platform/server";

type Body={prebookId?:unknown;transactionId?:unknown;firstName?:unknown;lastName?:unknown;email?:unknown;phone?:unknown};

export async function POST(request:Request){
  let body:Body;
  try{body=await request.json() as Body;}catch{return Response.json({error:{message:"Invalid JSON body"}},{status:400});}
  const prebookId=value(body.prebookId);
  const transactionId=value(body.transactionId);
  const firstName=value(body.firstName);
  const lastName=value(body.lastName);
  const email=value(body.email);
  const phone=value(body.phone);
  if(!prebookId||!transactionId||!firstName||!lastName||!email||!email.includes("@")||!phone)return Response.json({error:{message:"Missing or invalid booking details"}},{status:400});
  try{
    const result=await bookNuitee({prebookId,transactionId,holderFirstName:firstName,holderLastName:lastName,email,phone});
    return Response.json({data:result},{headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error("Nuitee booking failed",error);
    return Response.json({error:{message:error instanceof Error?error.message:"Nuitee booking failed"}},{status:502,headers:{"cache-control":"no-store"}});
  }
}
function value(input:unknown):string|undefined{return typeof input==="string"&&input.trim()?input.trim():undefined;}
