import type {NextRequest} from "next/server";
import {buildGoogleHotelListXml} from "@platform/server";
import {googleHotelsFeedAuthorized} from "@/lib/google-hotels-feed-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!googleHotelsFeedAuthorized(request)) return unauthorized();
  const body = await buildGoogleHotelListXml();
  return new Response(body, {headers: {
    "content-type": "application/xml; charset=utf-8",
    "cache-control": "public, max-age=60, s-maxage=300",
  }});
}

function unauthorized() {
  return new Response("Authentication required", {status: 401, headers: {"www-authenticate": 'Basic realm="HandMeKey Google Hotels"'}});
}
