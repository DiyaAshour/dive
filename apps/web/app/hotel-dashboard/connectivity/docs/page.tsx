import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft, BookOpen, KeyRound, RefreshCcw, Send, ShieldCheck, Webhook} from "lucide-react";
import {listUserHotels} from "@platform/server";
import {PartnerSidebar} from "@/components/partner-sidebar";
import {PartnerLanguageBar} from "@/components/partner-language-bar";
import {currentUser} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {direction} from "@/lib/i18n";

export const dynamic="force-dynamic";

export default async function ConnectivityDocsPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}){
  const user=await currentUser();
  if(!user)redirect("/partner/login");
  const locale=await requestLocale();
  const ar=locale==="ar";
  const hotels=await listUserHotels(user.id);
  if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;
  const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];
  if(!selected)redirect("/partner/onboarding");
  const q=`?hotelId=${encodeURIComponent(selected.id)}`;

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={selected.id} hotelName={selected.name} city={selected.city} status={selected.status} active="connectivity" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">{ar?"Developer integration":"Developer integration"}</span><h1>{ar?"دليل HandMeKey Connectivity API":"HandMeKey Connectivity API guide"}</h1><p>{ar?"اربط PMS أو Channel Manager مباشرة مع مخزون وحجوزات HandMeKey.":"Connect a PMS or channel manager directly to HandMeKey inventory and reservations."}</p></div><div className="partnerTopbarActions"><Link className="partnerSecondaryAction" href={`/hotel-dashboard/connectivity${q}`}><ArrowLeft size={16}/>{ar?"العودة للربط":"Back to connectivity"}</Link></div></div>

      <div className="partnerWorkspaceStack">
        <section className="panel"><div className="sectionHeading"><div><span className="eyebrow">1 · AUTHENTICATION</span><h2>{ar?"مفتاح API خاص بكل فندق":"One API key per property"}</h2></div><KeyRound size={22}/></div><p className="muted">{ar?"أنشئ المفتاح من صفحة Connectivity. يتم عرض المفتاح الكامل مرة واحدة فقط. أرسله كـ Bearer token في كل طلب ولا تضعه في المتصفح أو تطبيق الضيف.":"Generate the key from Connectivity. The complete key is shown once only. Send it as a Bearer token on every request and never expose it in guest-side browser code."}</p><Code>{`Authorization: Bearer hmk_live_...\nContent-Type: application/json`}</Code></section>

        <section className="panel"><div className="sectionHeading"><div><span className="eyebrow">2 · PROPERTY & MAPPING</span><h2>{ar?"اقرأ أكواد الغرف وخطط الأسعار":"Read rooms and rate-plan codes"}</h2></div><BookOpen size={22}/></div><Endpoint method="GET" path="/api/v1/connectivity/property"/><p className="muted">{ar?"الرد يحتوي على الفندق، الغرف، خطط الأسعار، وأكواد HandMeKey والأكواد الخارجية المحفوظة في الـMapping. إذا لم تستخدم Mapping، يمكنك إرسال أكواد HandMeKey نفسها.":"The response contains the property, rooms, rate plans, HandMeKey codes and any external codes saved in Mapping. If you do not configure mappings, send the HandMeKey codes directly."}</p></section>

        <section className="panel"><div className="sectionHeading"><div><span className="eyebrow">3 · ARI PUSH</span><h2>{ar?"حدّث السعر والمخزون والقيود":"Push rates, inventory and restrictions"}</h2></div><RefreshCcw size={22}/></div><Endpoint method="POST" path="/api/v1/connectivity/ari"/><p className="muted">{ar?"كل طلب يقبل حتى 500 سطر. استخدم x-idempotency-key فريدًا لكل batch حتى تكون إعادة المحاولة آمنة.":"Each request accepts up to 500 rows. Use a unique x-idempotency-key for each batch so retries are safe."}</p><Code>{`x-idempotency-key: pms-ari-2026-09-10-001\n\n{\n  "updates": [\n    {\n      "roomCode": "DLX",\n      "ratePlanCode": "BAR",\n      "date": "2026-10-01",\n      "rate": 115.00,\n      "available": 8,\n      "minStay": 1,\n      "closedToArrival": false,\n      "closedToDeparture": false,\n      "stopSell": false\n    }\n  ]\n}`}</Code><p className="muted">{ar?"الحقول المدعومة: rate، available، overbookingLimit، minStay، maxStay، min/maxAdvanceBookingDays، closedToArrival، closedToDeparture، closed، stopSell.":"Supported fields: rate, available, overbookingLimit, minStay, maxStay, min/maxAdvanceBookingDays, closedToArrival, closedToDeparture, closed and stopSell."}</p></section>

        <section className="panel"><div className="sectionHeading"><div><span className="eyebrow">4 · RESERVATIONS</span><h2>{ar?"استقبل الحجز والتعديل والإلغاء":"Receive bookings, modifications and cancellations"}</h2></div><Send size={22}/></div><Endpoint method="GET" path="/api/v1/connectivity/reservations?limit=50"/><p className="muted">{ar?"كل حدث يحتوي على reference، الضيف، الإقامة، الغرفة، خطة السعر، الأكواد الخارجية، المبالغ وحالة الدفع. بعد تسجيل الحدث في PMS أرسل ACK حتى لا يبقى معلقًا.":"Each event contains the reservation reference, guest, stay, room, rate plan, external mapping codes, amounts and payment state. After committing the event in the PMS, acknowledge it."}</p><Endpoint method="POST" path="/api/v1/connectivity/reservations/{eventId}/ack"/><Code>{`{\n  "data": {\n    "acknowledged": true,\n    "eventId": "..."\n  }\n}`}</Code></section>

        <section className="panel"><div className="sectionHeading"><div><span className="eyebrow">5 · WEBHOOKS</span><h2>{ar?"تسليم تلقائي موقع HMAC":"HMAC-signed automatic delivery"}</h2></div><Webhook size={22}/></div><p className="muted">{ar?"إذا أضفت Webhook URL عام يعمل عبر HTTPS، يرسل HandMeKey أحداث reservation.created وreservation.modified وreservation.cancelled تلقائيًا. في حال الفشل تتم إعادة المحاولة تدريجيًا.":"When a public HTTPS webhook URL is configured, HandMeKey automatically delivers reservation.created, reservation.modified and reservation.cancelled events. Failed deliveries are retried with backoff."}</p><Code>{`x-handmekey-event: reservation.created\nx-handmekey-delivery: <event-id>\nx-handmekey-timestamp: <unix-seconds>\nx-handmekey-signature: sha256=<hex-hmac>`}</Code><p className="muted">{ar?"احسب HMAC-SHA256 باستخدام Webhook signing secret على النص: timestamp + نقطة + raw request body، ثم قارنه مع x-handmekey-signature. ارفض timestamps القديمة لمنع replay.":"Compute HMAC-SHA256 with the webhook signing secret over: timestamp + '.' + raw request body, then compare it with x-handmekey-signature. Reject stale timestamps to prevent replay attacks."}</p></section>

        <section className="panel"><div className="sectionHeading"><div><span className="eyebrow">6 · OPERATIONS</span><h2>{ar?"فحص الصحة والأمان":"Health & security"}</h2></div><ShieldCheck size={22}/></div><Endpoint method="GET" path="/api/v1/connectivity/health"/><p className="muted">{ar?"المفاتيح لا تُخزن كنص واضح؛ يتم تخزين hash للمفتاح داخل بيانات اتصال مشفرة. تدوير المفتاح يلغي القديم فورًا. عناوين Webhook يجب أن تكون HTTPS عامة، ويتم رفض localhost والشبكات الخاصة.":"API keys are not stored in plaintext; their hash is kept inside encrypted connectivity credentials. Rotating a key invalidates the previous one immediately. Webhook targets must be public HTTPS URLs; localhost and private networks are rejected."}</p></section>
      </div>
    </section>
  </main>;
}

function Endpoint({method,path}:{method:string;path:string}){return <div style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",margin:"12px 0",border:"1px solid var(--border,#e0e4e8)",borderRadius:10,overflow:"auto"}}><b style={{fontSize:12}}>{method}</b><code style={{whiteSpace:"nowrap"}}>{path}</code></div>}
function Code({children}:{children:string}){return <pre style={{overflow:"auto",padding:14,borderRadius:12,background:"#0e2238",color:"#f6f1e6",fontSize:12,lineHeight:1.6,margin:"12px 0",direction:"ltr",textAlign:"left"}}><code>{children}</code></pre>}
