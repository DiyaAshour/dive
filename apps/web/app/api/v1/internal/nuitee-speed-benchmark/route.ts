import {database} from "@platform/database";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API_BASE = "https://api.liteapi.travel/v3.0";
const HOTEL_ID = "lp7246c";
const CHECKIN = "2026-12-08";
const CHECKOUT = "2026-12-09";

async function timed<T>(fn: () => Promise<T>) {
  const started = performance.now();
  const value = await fn();
  return {ms: Math.round((performance.now() - started) * 10) / 10, value};
}

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return new Response("Not found", {status: 404});
  }

  const apiKey = process.env.NUITEE_API_KEY?.trim();
  if (!apiKey) return Response.json({ok: false, error: "NUITEE_API_KEY missing"}, {status: 503});

  const db = await timed(async () => database().nuiteeContentHotel.findUnique({
    where: {providerHotelId: HOTEL_ID},
    select: {providerHotelId: true, name: true, syncedAt: true},
  }));

  const rates = await timed(async () => {
    const response = await fetch(`${API_BASE}/hotels/rates`, {
      method: "POST",
      headers: {accept: "application/json", "content-type": "application/json", "X-API-Key": apiKey},
      body: JSON.stringify({
        hotelIds: [HOTEL_ID],
        occupancies: [{rooms: 1, adults: 2, children: []}],
        currency: "USD",
        guestNationality: "JO",
        checkin: CHECKIN,
        checkout: CHECKOUT,
        roomMapping: true,
        includeHotelData: false,
        timeout: 10,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    await response.arrayBuffer();
    return {status: response.status, ok: response.ok};
  });

  const hostedUrl = `https://diyaashour-user-jx7pv.nuitee.link/hotels/${HOTEL_ID}?checkin=${CHECKIN}&checkout=${CHECKOUT}&rooms=1&adults=2&name=Paris&currency=USD&language=ar`;
  const hosted = await timed(async () => {
    const response = await fetch(hostedUrl, {cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(15000)});
    await response.arrayBuffer();
    return {status: response.status, ok: response.ok};
  });

  const handMeKeyUrl = `https://handmekey.com/hotel/nuitee-${HOTEL_ID}?arrival=${CHECKIN}&departure=${CHECKOUT}&adults=2&children=0&currency=USD`;
  const handmekey = await timed(async () => {
    const response = await fetch(handMeKeyUrl, {cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(30000)});
    await response.arrayBuffer();
    return {status: response.status, ok: response.ok};
  });

  return Response.json({
    ok: true,
    measuredFrom: "Vercel preview runtime",
    hotelId: HOTEL_ID,
    stay: {checkin: CHECKIN, checkout: CHECKOUT, adults: 2, rooms: 1, currency: "USD"},
    db: {ms: db.ms, found: Boolean(db.value), hotel: db.value?.name ?? null},
    rawNuiteeRates: {ms: rates.ms, ...rates.value},
    nuiteeHostedPage: {ms: hosted.ms, ...hosted.value},
    handMeKeyProductionPage: {ms: handmekey.ms, ...handmekey.value},
    note: "Full-response wall-clock timings from the same Vercel runtime; run multiple times to observe warm/cold variance.",
  });
}
