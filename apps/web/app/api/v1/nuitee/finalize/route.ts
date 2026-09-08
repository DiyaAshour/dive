import {ApplicationError,finalizeNuiteeCheckoutSession} from "@platform/server";

type Body={token?:unknown};

export async function POST(request:Request){
  let body:Body;
  try{body=await request.json() as Body;}catch{return Response.json({error:{code:"INVALID_JSON",message:"Invalid JSON body"}},{status:400});}
  const token=value(body.token);
  if(!token)return Response.json({error:{code:"MISSING_TOKEN",message:"Checkout recovery token is required"}},{status:400});
  try{
    const result=await finalizeNuiteeCheckoutSession(token);
    return Response.json({data:result},{status:result.state==="processing"?202:200,headers:{"cache-control":"no-store"}});
  }catch(error){
    const status=error instanceof ApplicationError?error.status:500;
    const code=error instanceof ApplicationError?error.code:"NUITEE_FINALIZE_FAILED";
    const message=error instanceof Error?error.message:"Could not finalize Nuitee booking";
    console.error("Nuitee checkout finalize failed",{code,status,message});
    return Response.json({error:{code,message}},{status,headers:{"cache-control":"no-store"}});
  }
}
function value(input:unknown):string|undefined{return typeof input==="string"&&input.trim()?input.trim():undefined;}
