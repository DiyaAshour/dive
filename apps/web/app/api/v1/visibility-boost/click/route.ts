import { NextResponse } from "next/server";
import { VISIBILITY_BOOST_COOKIE, VISIBILITY_BOOST_COOKIE_MAX_AGE } from "@platform/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const hotelSlug = safeSlug(url.searchParams.get("hotel"));
  if (!token || !hotelSlug) return NextResponse.redirect(new URL("/search",url));

  const target = new URL(`/hotel/${encodeURIComponent(hotelSlug)}`,url);
  for (const key of ["arrival","departure","adults","children"] as const) {
    const value = url.searchParams.get(key);
    if (value) target.searchParams.set(key,value);
  }
  const response = NextResponse.redirect(target);
  response.cookies.set(VISIBILITY_BOOST_COOKIE,token,{
    httpOnly:true,
    sameSite:"lax",
    secure:process.env.NODE_ENV === "production",
    path:"/",
    maxAge:VISIBILITY_BOOST_COOKIE_MAX_AGE,
  });
  return response;
}

function safeSlug(value:string|null) {
  if (!value || !/^[a-zA-Z0-9_-]{1,160}$/.test(value)) return null;
  return value;
}
