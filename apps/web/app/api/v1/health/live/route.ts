export async function GET() {
  return Response.json({status:"ok",service:"handmekey-web",time:new Date().toISOString()},{status:200,headers:{"cache-control":"no-store"}});
}
