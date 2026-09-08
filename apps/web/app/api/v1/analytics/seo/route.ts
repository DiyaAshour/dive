import {NextRequest, NextResponse} from "next/server";
import {database} from "@platform/database";

const EVENTS = new Set(["BLOG_VIEW", "BLOG_TO_SEARCH", "BLOG_TO_CARS"]);

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.nextUrl.host; } catch { return false; }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ok:false},{status:403});
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ok:false},{status:400}); }
  if (!body || typeof body !== "object") return NextResponse.json({ok:false},{status:400});
  const input = body as Record<string, unknown>;
  const event = typeof input.event === "string" ? input.event : "";
  const slug = typeof input.slug === "string" ? input.slug.slice(0,160) : "";
  const locale = input.locale === "ar" || input.locale === "en" ? input.locale : null;
  const target = typeof input.target === "string" ? input.target.slice(0,240) : null;
  if (!EVENTS.has(event) || !slug || !locale) return NextResponse.json({ok:false},{status:400});

  await database().auditLog.create({data:{
    action:event,
    entityType:"SEO_CONVERSION",
    entityId:slug,
    after:{locale,target},
  }}).catch(()=>null);

  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
