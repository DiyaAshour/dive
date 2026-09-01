import { redirect } from "next/navigation";
import { getCarCompanyForUser, getCarVehicleMediaManager } from "@platform/server";
import { CarPartnerShell } from "@/components/car-partner-shell";
import { CarVehicleMediaManager } from "@/components/car-vehicle-media-manager";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic = "force-dynamic";
export const metadata = {title: "Vehicle photos · HandMeKey Cars Partner"};

export default async function CarVehicleMediaPage({params}: {params: Promise<{vehicleId: string}>}) {
  const {vehicleId} = await params;
  const [user, market] = await Promise.all([currentUser(), requestGuestMarket()]);
  if (!user) redirect(`/login?next=${encodeURIComponent(`/car-dashboard/fleet/${vehicleId}/media`)}`);
  const company = await getCarCompanyForUser(user.id);
  if (!company) redirect("/cars/partner");
  const manager = await getCarVehicleMediaManager(user.id, vehicleId);
  return <CarPartnerShell companyName={company.company.name} status={company.company.status} verified={company.company.verified} locale={market.baseLocale}>
    <CarVehicleMediaManager locale={market.baseLocale} vehicle={manager.vehicle} initialPhotos={manager.photos}/>
  </CarPartnerShell>;
}
