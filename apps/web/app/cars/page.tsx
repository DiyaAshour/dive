import { listPublicCarVehicles } from "@platform/server";
import { CarBookingSearch } from "@/components/car-booking-search";
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
  const pickupDate = query.pickupDate || dates.arrival;
  const returnDate = ensureMinReturnDate(pickupDate, query.returnDate || dates.departure);
  const initialSearch: CarSearchValues = {
    pickup: query.pickup?.trim() || (ar ? "عمّان - مطار الملكة علياء" : "Amman - Queen Alia Airport"),
    dropoff: query.dropoff?.trim() || "same",
    pickupDate,
    pickupTime: query.pickupTime || "10:00",
    returnDate,
    returnTime: query.returnTime || "10:00",
    driverAge: query.driverAge || "30-65",
    brand: query.brand?.trim() || "",
  };

  return <main className="searchExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <div className="shell">
      <div className="carsInlineSearch">
        <CarBookingSearch
          locale={market.baseLocale}
          defaultPickupDate={initialSearch.pickupDate}
          defaultReturnDate={initialSearch.returnDate}
        />
      </div>
      <div className="carsInlineResults">
        {liveCars.length > 0
          ? <CarsLiveMarketplace locale={market.baseLocale} initialSearch={initialSearch} cars={liveCars as LiveCar[]}/>
          : <CarsMarketplace locale={market.baseLocale} initialSearch={initialSearch}/>} 
      </div>
    </div>
    <style>{`
      .carsInlineSearch { padding-top: 28px; }
      .carsInlineSearch #car-search { margin-top: 0; }
      .carsInlineResults > div > section:first-of-type,
      .carsInlineResults > section:first-of-type { display: none !important; }
      @media (max-width: 620px) {
        .carsInlineSearch { padding-top: 18px; }
        .carsInlineResults > div { padding-top: 14px; }
      }
    `}</style>
  </main>;
}

function ensureMinReturnDate(pickupDate:string,requestedReturnDate:string){
  const minimum=addDays(pickupDate,3);
  return requestedReturnDate>=minimum?requestedReturnDate:minimum;
}
function addDays(value:string,days:number){
  const [year,month,day]=value.split("-").map(Number);
  const date=new Date(Date.UTC(year||1970,(month||1)-1,(day||1)+days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;
}
