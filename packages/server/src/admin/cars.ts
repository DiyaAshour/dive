import { database } from "@platform/database";
import { badRequest, notFound } from "../errors";
import { requirePlatformAdmin } from "./authorization";

export type CarCompanyDecisionInput = Readonly<{
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";
  verified: boolean;
}>;

export async function listAdminCarCompanies(adminUserId: string, filters: {query?:string;status?:string} = {}) {
  await requirePlatformAdmin(adminUserId);
  const query=filters.query?.trim();
  const allowedStatus=new Set(["DRAFT","PENDING_REVIEW","ACTIVE","SUSPENDED"]);
  const status=filters.status&&allowedStatus.has(filters.status)?filters.status as "DRAFT"|"PENDING_REVIEW"|"ACTIVE"|"SUSPENDED":undefined;
  const rows=await database().carRentalCompany.findMany({
    where:{
      ...(status?{status}:{}),
      ...(query?{OR:[{name:{contains:query,mode:"insensitive"}},{city:{contains:query,mode:"insensitive"}},{slug:{contains:query,mode:"insensitive"}}]}:{}),
    },
    orderBy:{createdAt:"desc"},
    include:{_count:{select:{vehicles:true,locations:true,reservations:true,memberships:true}}},
  });
  return rows.map((row)=>({
    id:row.id,name:row.name,slug:row.slug,city:row.city,countryCode:row.countryCode,address:row.address,currency:row.currency,status:row.status,verified:row.verified,
    supportEmail:row.supportEmail,supportPhone:row.supportPhone,commissionRate:Number(row.commissionRate),createdAt:row.createdAt.toISOString(),counts:row._count,
  }));
}

export async function updateAdminCarCompany(adminUserId:string,companyId:string,input:CarCompanyDecisionInput){
  await requirePlatformAdmin(adminUserId);
  if(input.status==="ACTIVE"||input.status==="PENDING_REVIEW")badRequest("CAR_COMPANY_REVIEW_REQUIRED","Use the company review queue to activate a car rental company");
  if(input.verified)badRequest("CAR_COMPANY_REVIEW_REQUIRED","Verification is granted only by an approved company review");
  const existing=await database().carRentalCompany.findUnique({where:{id:companyId},select:{id:true}});
  if(!existing)notFound("Car rental company");
  const row=await database().carRentalCompany.update({where:{id:companyId},data:{status:input.status,verified:false}});
  return {id:row.id,name:row.name,status:row.status,verified:row.verified,updatedAt:row.updatedAt.toISOString()};
}
