import { platformReadiness } from "@platform/server";

export async function GET() {
  const readiness = await platformReadiness();
  return Response.json(readiness,{status:readiness.ready?200:503,headers:{"cache-control":"no-store"}});
}
