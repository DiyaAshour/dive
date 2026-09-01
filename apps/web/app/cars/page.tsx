import { CustomerHeader } from "@/components/customer-header";
import { CarsMarketplace, type CarSearchValues } from "@/components/cars-marketplace";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { defaultStayDates } from "@/lib/stay-dates";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "HandMeKey Cars",
  description: "Explore the HandMeKey Cars demo marketplace with car search, filters, transparent demo pricing and rental terms.",
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
}>;

export default async function CarsPage({searchParams}: {searchParams: Params}) {
  const [market, query] = await Promise.all([requestGuestMarket(), searchParams]);
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
  };

  return <main className="searchExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <div className="shell"><CarsMarketplace locale={market.baseLocale} initialSearch={initialSearch}/></div>
  </main>;
}
