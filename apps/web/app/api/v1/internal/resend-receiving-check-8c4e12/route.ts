export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return Response.json({ok: false, configured: false}, {status: 503});

  const response = await fetch("https://api.resend.com/emails/receiving?limit=1", {
    headers: {authorization: `Bearer ${apiKey}`},
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as {data?: unknown[]} | null;
  return Response.json({
    ok: response.ok,
    configured: true,
    providerStatus: response.status,
    canReadReceiving: response.ok,
    hasReceivedEmail: Array.isArray(body?.data) && body.data.length > 0,
  }, {status: response.ok ? 200 : 502});
}
