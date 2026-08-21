import { NextResponse } from "next/server";
import { hotels } from "@/lib/mock-data";
import { priceBreakdown } from "@/lib/pricing";

export async function GET() {
  return NextResponse.json(hotels.map((hotel) => ({
    ...hotel,
    price: priceBreakdown(hotel.baseRate),
    availabilityUpdatedAt: new Date().toISOString(),
  })));
}
