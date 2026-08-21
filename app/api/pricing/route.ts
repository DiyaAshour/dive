import { NextRequest, NextResponse } from "next/server";
import { priceBreakdown } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const base = Number(request.nextUrl.searchParams.get("base") ?? 0);
  if (!Number.isFinite(base) || base < 0) return NextResponse.json({ error: "Invalid base rate" }, { status: 400 });
  return NextResponse.json(priceBreakdown(base));
}
