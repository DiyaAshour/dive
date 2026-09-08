import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";

/**
 * Runtime retirement guard for the former Hotelbeds integration.
 * Public legacy URLs are sent back to live search and old catalogue-sync
 * endpoints are explicitly gone so they cannot call the retired supplier.
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/hotel/hotelbeds-") || pathname === "/hotelbeds-checkout" || pathname.startsWith("/hotelbeds-checkout/")) {
    const target = request.nextUrl.clone();
    target.pathname = "/search";
    target.search = "";
    return NextResponse.redirect(target, 308);
  }

  if (pathname === "/api/v1/internal/hotelbeds-content-sync" || pathname === "/api/v1/admin/hotelbeds-content-sync") {
    return NextResponse.json(
      {error: {code: "PROVIDER_DECOMMISSIONED", message: "Hotelbeds integration has been retired"}},
      {status: 410},
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/hotel/:path*",
    "/hotelbeds-checkout/:path*",
    "/api/v1/internal/hotelbeds-content-sync",
    "/api/v1/admin/hotelbeds-content-sync",
  ],
};
