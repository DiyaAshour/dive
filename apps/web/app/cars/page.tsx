import { listPublicCarVehicles } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { CarsLiveMarketplace, type LiveCar } from "@/components/cars-live-marketplace";
import { CarsMarketplace, type CarSearchValues } from "@/components/cars-marketplace";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { defaultStayDates } from "@/lib/stay-dates";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "HandMeKey Cars · Car rental",
  description: "Find rental cars with clear daily pricing, deposits, insurance-friendly terms and pickup details on HandMeKey Cars.",
  robots: {index: false, follow: false},
};

type Params = Promise<{
  pickup?: string;
  dropoff?: string;
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string;
  returnTime?: string;
  driverAge?: string;
  brand?: string;
}>;

export default async function CarsPage({searchParams}: {searchParams: Params}) {
  const [market, query, liveCars] = await Promise.all([
    requestGuestMarket(),
    searchParams,
    listPublicCarVehicles().catch(() => []),
  ]);
  const dates = defaultStayDates();
  const ar = market.locale === "ar";
  const initialSearch: CarSearchValues = {
    pickup: query.pickup?.trim() || (ar ? "عمّان - مطار الملكة علياء" : "Amman - Queen Alia Airport"),
    dropoff: query.dropoff?.trim() || "same",
    pickupDate: query.pickupDate || dates.arrival,
    pickupTime: query.pickupTime || "10:00",
    returnDate: query.returnDate || dates.departure,
    returnTime: query.returnTime || "10:00",
    driverAge: query.driverAge || "30-65",
    brand: query.brand?.trim() || "",
  };

  return <main className="searchExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <div className="shell">
      {liveCars.length > 0
        ? <CarsLiveMarketplace locale={market.baseLocale} initialSearch={initialSearch} cars={liveCars as LiveCar[]}/>
        : <CarsMarketplace locale={market.baseLocale} initialSearch={initialSearch}/>} 
    </div>
  </main>;
}
