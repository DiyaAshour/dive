import { partnerStatementRequestSchema } from "@platform/contracts";
import { issuePartnerStatement, queuePartnerStatementEmail } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function POST(request: Request,{params}:{params:Promise<{hotelId:string}>}){
  try{
    const user=await requestUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const {hotelId}=await params;
    const parsed=partnerStatementRequestSchema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return validationError(parsed.error);
    const statementInput=parsed.data.currency
      ? {from:parsed.data.from,to:parsed.data.to,currency:parsed.data.currency}
      : {from:parsed.data.from,to:parsed.data.to};
    const statement=await issuePartnerStatement(user.id,hotelId,statementInput);
    await queuePartnerStatementEmail(statement.id).catch((error)=>{
      console.error(JSON.stringify({event:"partner_statement_email_failed",statementId:statement.id,message:error instanceof Error?error.message:"unknown error"}));
    });
    return ok(statement);
  }catch(error){return handleApiError(error)}
}
