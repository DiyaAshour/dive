import type {Metadata} from "next";
import Link from "next/link";

export const metadata:Metadata={
  title:"HandMeKey Connectivity API | Developer Documentation",
  description:"Technical integration guide for hotel PMS, CRS and channel-manager teams connecting rates, inventory and reservations to HandMeKey.",
};

const baseUrl="https://handmekey.com";

export default function ConnectivityDeveloperDocs(){
  return <main style={{maxWidth:1180,margin:"0 auto",padding:"28px 20px 80px",fontFamily:"inherit"}}>
    <header style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"center",marginBottom:28,flexWrap:"wrap"}}>
      <div><Link href="/" style={{fontWeight:900,textDecoration:"none",fontSize:22}}>HandMeKey</Link><span style={{marginInlineStart:10,opacity:.58,fontSize:13}}>Developer Platform</span></div>
      <nav style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <Link href="/partner/login" style={button(false)}>Partner Hub</Link>
        <a href="/api/v1/connectivity/openapi" style={button(true)}>OpenAPI JSON</a>
      </nav>
    </header>

    <section style={{padding:"34px 30px",border:"1px solid #d9dee5",borderRadius:22,background:"linear-gradient(135deg,#0e2238,#173856)",color:"#fff",marginBottom:24}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:".14em",opacity:.72}}>HANDMEKEY CONNECTIVITY API · V1</div>
      <h1 style={{fontSize:"clamp(32px,5vw,54px)",lineHeight:1.04,margin:"12px 0 14px"}}>Connect your hotel system to HandMeKey</h1>
      <p style={{maxWidth:820,fontSize:18,lineHeight:1.65,opacity:.88,margin:0}}>For PMS, CRS and channel-manager developers. Push rates, availability and restrictions to HandMeKey, then receive confirmed reservations, modifications and cancellations automatically.</p>
      <p dir="rtl" style={{maxWidth:820,fontSize:15,lineHeight:1.8,opacity:.78,margin:"14px 0 0"}}>هذا الدليل مخصص لفريق تقنية الفندق أو الشركة المطورة لنظام الـPMS/CRS. بعد الربط يصبح نظام الفندق هو مصدر الأسعار والمخزون، وتصل حجوزات HandMeKey للنظام تلقائيًا.</p>
    </section>

    <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:18}}>
      <Section no="01" title="Integration flow" subtitle="The complete production path">
        <ol style={{lineHeight:1.9,margin:"8px 0 0",paddingInlineStart:22}}>
          <li>Hotel creates or verifies its Partner Hub property.</li>
          <li>Hotel opens <b>Connectivity & integrations</b> and enables <b>HandMeKey Connectivity API</b>.</li>
          <li>Generate the property API key and save it securely. The complete key is displayed once.</li>
          <li>Read property, room and rate-plan codes from <code>GET /api/v1/connectivity/property</code>.</li>
          <li>Map the hotel system room/rate codes to HandMeKey codes once.</li>
          <li>Push ARI updates whenever price, inventory or restrictions change.</li>
          <li>Receive reservations by webhook or pull feed, write them into the PMS, then ACK each event.</li>
          <li>Run in UAT first. Move to Production only after the hotel confirms mapping, ARI and reservation delivery tests.</li>
        </ol>
      </Section>

      <Section no="02" title="Authentication" subtitle="One private API key per property">
        <p>{`Base URL: ${baseUrl}`}</p>
        <Code>{`Authorization: Bearer hmk_live_...\nContent-Type: application/json`}</Code>
        <p>Keep the API key on the server side only. Never place it in frontend JavaScript, mobile apps, public logs or a guest-facing website. Rotating the key invalidates the old key immediately.</p>
      </Section>

      <Section no="03" title="Health check" subtitle="Verify credentials before starting synchronization">
        <Endpoint method="GET" path="/api/v1/connectivity/health"/>
        <Code>{`curl ${baseUrl}/api/v1/connectivity/health \\\n  -H "Authorization: Bearer $HANDMEKEY_API_KEY"`}</Code>
        <p>A successful authenticated request confirms the property connection is active and refreshes the connectivity health timestamp.</p>
      </Section>

      <Section no="04" title="Property & mapping" subtitle="Discover the exact room and rate-plan codes">
        <Endpoint method="GET" path="/api/v1/connectivity/property"/>
        <Code>{`curl ${baseUrl}/api/v1/connectivity/property \\\n  -H "Authorization: Bearer $HANDMEKEY_API_KEY"`}</Code>
        <Code>{`{\n  "data": {\n    "hotel": {"id":"...","name":"Example Hotel","currency":"JOD"},\n    "rooms": [\n      {\n        "code":"DLX",\n        "externalCode":"DLXK",\n        "name":"Deluxe King",\n        "quantity":20,\n        "ratePlans":[\n          {"code":"BAR","externalCode":"BARBF","name":"Best Available Rate"}\n        ]\n      }\n    ]\n  },\n  "error": null\n}`}</Code>
        <p>Use <code>externalCode</code> when a mapping has been configured. If no mapping exists, your integration can send the HandMeKey <code>code</code> directly.</p>
      </Section>

      <Section no="05" title="Rates, availability & restrictions (ARI)" subtitle="PMS/CRS → HandMeKey">
        <Endpoint method="POST" path="/api/v1/connectivity/ari"/>
        <p>Send only changed values. A request accepts up to 500 updates. Always include a unique <code>x-idempotency-key</code> for safe retries.</p>
        <Code>{`curl -X POST ${baseUrl}/api/v1/connectivity/ari \\\n  -H "Authorization: Bearer $HANDMEKEY_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -H "x-idempotency-key: opera-ari-20260910-0001" \\\n  -d '{\n    "updates":[{\n      "roomCode":"DLXK",\n      "ratePlanCode":"BARBF",\n      "date":"2026-10-01",\n      "rate":115.00,\n      "available":8,\n      "minStay":1,\n      "maxStay":14,\n      "closedToArrival":false,\n      "closedToDeparture":false,\n      "stopSell":false\n    }]\n  }'`}</Code>
        <p>Supported fields: <code>rate</code>, <code>available</code>, <code>overbookingLimit</code>, <code>minStay</code>, <code>maxStay</code>, <code>minAdvanceBookingDays</code>, <code>maxAdvanceBookingDays</code>, <code>closedToArrival</code>, <code>closedToDeparture</code>, <code>closed</code>, <code>stopSell</code>.</p>
      </Section>

      <Section no="06" title="Reservations" subtitle="HandMeKey → PMS/CRS">
        <p>HandMeKey publishes three reservation lifecycle events: <code>reservation.created</code>, <code>reservation.modified</code> and <code>reservation.cancelled</code>.</p>
        <Endpoint method="GET" path="/api/v1/connectivity/reservations?limit=50"/>
        <Code>{`curl "${baseUrl}/api/v1/connectivity/reservations?limit=50" \\\n  -H "Authorization: Bearer $HANDMEKEY_API_KEY"`}</Code>
        <p>Each event contains the reservation reference, guest, dates, room, rate plan, mapped external codes, payment state, totals and nightly breakdown. Write the event to the hotel system transactionally before acknowledging it.</p>
      </Section>

      <Section no="07" title="Acknowledge a reservation" subtitle="Prevent re-processing after the PMS commits the event">
        <Endpoint method="POST" path="/api/v1/connectivity/reservations/{eventId}/ack"/>
        <Code>{`curl -X POST ${baseUrl}/api/v1/connectivity/reservations/EVENT_ID/ack \\\n  -H "Authorization: Bearer $HANDMEKEY_API_KEY"`}</Code>
        <p>ACK only after the PMS/CRS has durably stored the reservation change. If your system crashes before ACK, safely process the same event again using the event ID or reservation revision as your local idempotency key.</p>
      </Section>

      <Section no="08" title="Webhooks" subtitle="Recommended for immediate reservation delivery">
        <p>Configure a public HTTPS webhook URL in Partner Hub. HandMeKey signs every delivery using the property webhook signing secret.</p>
        <Code>{`x-handmekey-event: reservation.created\nx-handmekey-delivery: <event-id>\nx-handmekey-timestamp: <unix-seconds>\nx-handmekey-signature: sha256=<hex-hmac>`}</Code>
        <p>Signature input:</p>
        <Code>{`HMAC_SHA256(webhook_secret, timestamp + "." + raw_request_body)`}</Code>
        <p>Verify the signature using the unmodified raw body, compare signatures in constant time, and reject stale timestamps. Return any HTTP 2xx only after your system accepts the event. Non-2xx responses are retried with exponential backoff.</p>
      </Section>

      <Section no="09" title="Source-of-truth rules" subtitle="Avoid conflicts between Partner Hub and the hotel system">
        <p>Once a property is connected to a PMS/CRS, the hotel system should be treated as the source of truth for ARI. Do not run two independent rate-management systems against the same room/rate-plan/date combination. HandMeKey reservation references remain the canonical marketplace reference, while your PMS may store its own internal confirmation/reference alongside it.</p>
      </Section>

      <Section no="10" title="Retry & idempotency" subtitle="Required for a production-grade connector">
        <p>ARI requests should be retried with the same <code>x-idempotency-key</code>. Reservation events should be deduplicated by <code>eventId</code> and reservation revision. Webhook delivery is at-least-once, so hotel integrations must always be idempotent.</p>
      </Section>

      <Section no="11" title="Go-live checklist" subtitle="Required before selling live inventory">
        <ul style={{lineHeight:1.9,margin:"8px 0 0",paddingInlineStart:22}}>
          <li>UAT API authentication succeeds.</li>
          <li>All active room types and rate plans are mapped.</li>
          <li>ARI test updates appear correctly in HandMeKey.</li>
          <li>A test booking reaches the PMS automatically.</li>
          <li>Modification and cancellation tests update the same reservation.</li>
          <li>Webhook signature validation and duplicate-event handling are tested.</li>
          <li>Failed deliveries are retried safely.</li>
          <li>Hotel signs off on rates, inventory, taxes, cancellation terms and reservation mapping.</li>
          <li>Production API key is stored in the hotel's secret manager.</li>
        </ul>
      </Section>

      <Section no="12" title="Machine-readable specification" subtitle="For Postman, Swagger, code generation and connector teams">
        <p>The live OpenAPI document is available at:</p>
        <Code>{`${baseUrl}/api/v1/connectivity/openapi`}</Code>
        <p>Connector developers can import that URL into Postman, Swagger tooling or an OpenAPI client generator.</p>
      </Section>

      <section style={{padding:"26px 24px",borderRadius:18,background:"#f5f7f9",border:"1px solid #dce1e7"}}>
        <h2 style={{margin:"0 0 8px"}}>Need integration support?</h2>
        <p style={{margin:0,lineHeight:1.7}}>The hotel partner should open Partner Hub → Connectivity for credentials, mapping and webhook configuration. For certification or production onboarding, contact <b>support@handmekey.com</b>.</p>
      </section>
    </div>
  </main>;
}

function Section({no,title,subtitle,children}:{no:string;title:string;subtitle:string;children:React.ReactNode}){
  return <section style={{padding:"24px",border:"1px solid #dce1e7",borderRadius:18,background:"#fff"}}>
    <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:12}}><span style={{fontSize:12,fontWeight:900,letterSpacing:".08em",padding:"6px 8px",borderRadius:8,background:"#eef2f6"}}>{no}</span><div><h2 style={{margin:0,fontSize:23}}>{title}</h2><p style={{margin:"4px 0 0",opacity:.62,fontSize:14}}>{subtitle}</p></div></div>
    <div style={{lineHeight:1.75,fontSize:15}}>{children}</div>
  </section>;
}

function Endpoint({method,path}:{method:string;path:string}){
  return <div style={{display:"flex",gap:12,alignItems:"center",padding:"11px 13px",margin:"12px 0",border:"1px solid #dce1e7",borderRadius:10,overflow:"auto",background:"#fafbfc"}}><b style={{fontSize:12}}>{method}</b><code style={{whiteSpace:"nowrap"}}>{path}</code></div>;
}

function Code({children}:{children:string}){
  return <pre style={{overflow:"auto",padding:16,borderRadius:12,background:"#0e2238",color:"#f6f1e6",fontSize:12,lineHeight:1.65,margin:"14px 0",direction:"ltr",textAlign:"left"}}><code>{children}</code></pre>;
}

function button(primary:boolean):React.CSSProperties{
  return {display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"9px 13px",borderRadius:10,textDecoration:"none",fontWeight:800,fontSize:13,border:primary?"1px solid #0e2238":"1px solid #d9dee5",background:primary?"#0e2238":"#fff",color:primary?"#fff":"inherit"};
}
