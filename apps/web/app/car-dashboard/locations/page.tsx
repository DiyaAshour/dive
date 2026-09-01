import { redirect } from "next/navigation";
import { getCarCompanyForUser, listCarCompanyLocations } from "@platform/server";
import { CarLocationsManager } from "@/components/car-locations-manager";
import { CarPartnerShell } from "@/components/car-partner-shell";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic="force-dynamic";

export default async function CarLocationsPage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/car-dashboard/locations");
  const company=await getCarCompanyForUser(user.id);
  if(!company)redirect("/cars/partner");
  const locations=await listCarCompanyLocations(user.id);
  return <CarPartnerShell companyName={company.company.name} status={company.company.status} verified={company.company.verified} locale={market.baseLocale}>
    <CarLocationsManager locale={market.baseLocale} initialLocations={locations}/>
  </CarPartnerShell>;
}
