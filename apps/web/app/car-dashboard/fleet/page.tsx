import { redirect } from "next/navigation";
import { getCarCompanyForUser, listCarCompanyLocations, listCarCompanyVehicles } from "@platform/server";
import { CarFleetManager } from "@/components/car-fleet-manager";
import { CarPartnerShell } from "@/components/car-partner-shell";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic="force-dynamic";

export default async function CarFleetPage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/car-dashboard/fleet");
  const company=await getCarCompanyForUser(user.id);
  if(!company)redirect("/cars/partner");
  const [vehicles,locations]=await Promise.all([listCarCompanyVehicles(user.id),listCarCompanyLocations(user.id)]);
  return <CarPartnerShell companyName={company.company.name} status={company.company.status} verified={company.company.verified} locale={market.baseLocale}>
    <CarFleetManager locale={market.baseLocale} initialVehicles={vehicles} locations={locations.map(({id,name,city})=>({id,name,city}))} currency={company.company.currency}/>
  </CarPartnerShell>;
}
