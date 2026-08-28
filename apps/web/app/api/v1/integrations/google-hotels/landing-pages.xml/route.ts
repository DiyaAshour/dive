import type {NextRequest} from "next/server";
import {buildGoogleLandingPagesXml} from "@platform/server";
import {googleHotelsFeedAuthorized} from "@/lib/google-hotels-feed-auth";
import {siteUrl} from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!googleHotelsFeedAuthorized(request)) return unauthorized();
  const body = buildGoogleLandingPagesXml(siteUrl());
  return new Response(body, {headers: {
    "content-type": "application/xml; charset=utf-8",
    "cache-control": "public, max-age=300, s-maxage=3600",
  }});
}

function unauthorized() {
  return new Response("Authentication required", {status: 401, headers: {"www-authenticate": 'Basic realm="HandMeKey Google Hotels"'}});
}
