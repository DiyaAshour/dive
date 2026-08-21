import { calculatePrice } from "@platform/core";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api";

export async function GET(request: NextRequest) {
  const base = Number(request.nextUrl.searchParams.get("base") ?? "0");
  const serviceRate = Number(request.nextUrl.searchParams.get("serviceRate") ?? "0.07");
  const taxRate = Number(request.nextUrl.searchParams.get("taxRate") ?? "0.086");
  try { return ok(calculatePrice(base, {serviceRate, taxRate})); }
  catch (error) { return Response.json({data: null, error: {code: "INVALID_PRICING_INPUT", message: error instanceof Error ? error.message : "Invalid pricing input"}}, {status: 400}); }
}
