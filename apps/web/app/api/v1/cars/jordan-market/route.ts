import { NextRequest } from "next/server";
import { getJordanRentalMarketSummary, searchJordanRentalMarket } from "@platform/server";
import { ok } from "@/lib/api";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || undefined;
  const make = url.searchParams.get("make")?.trim() || undefined;
  const category = url.searchParams.get("category")?.trim() || undefined;
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.trunc(rawLimit), 100) : 60;
  const filters: {q?:string;make?:string;category?:string;limit:number} = {limit};
  if (q) filters.q = q;
  if (make) filters.make = make;
  if (category) filters.category = category;

  return ok({
    models: searchJordanRentalMarket(filters),
    summary: getJordanRentalMarketSummary(),
  });
}
