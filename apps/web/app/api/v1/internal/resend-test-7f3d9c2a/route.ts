export const dynamic = "force-dynamic";

const TEST_RECIPIENT = "ashourdiya@gmail.com";
const DEFAULT_FROM = "HandMeKey <bookings@handmekey.com>";

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;

  if (!apiKey) {
    return Response.json({ ok: false, error: "RESEND_API_KEY is not configured" }, { status: 503 });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [TEST_RECIPIENT],
      subject: "HandMeKey — Email test",
      html: "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#14213d\"><h2>HandMeKey email test ✅</h2><p>This is a real test email sent from HandMeKey through Resend.</p><p>إذا وصلتك هذه الرسالة، فإعدادات البريد في HandMeKey تعمل بنجاح.</p></div>",
      text: "HandMeKey email test. This is a real test email sent through Resend. إذا وصلتك هذه الرسالة، فإعدادات البريد تعمل بنجاح.",
      reply_to: process.env.EMAIL_REPLY_TO?.trim() || "support@handmekey.com",
    }),
  });

  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };

  if (!response.ok || !body.id) {
    return Response.json(
      {
        ok: false,
        status: response.status,
        error: body.message || body.name || "Resend rejected the message",
      },
      { status: response.status || 502 },
    );
  }

  return Response.json({
    ok: true,
    provider: "resend",
    recipient: TEST_RECIPIENT,
    messageId: body.id,
  });
}
