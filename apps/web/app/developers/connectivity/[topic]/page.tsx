import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {Code, connectivityBaseUrl, connectivityDocs, DeveloperDocsShell, DocSection, Endpoint, Flow, Note, type ConnectivityDocSlug} from "../docs-catalog";

export function generateStaticParams(){return connectivityDocs.map((item)=>({topic:item.slug}));}

export async function generateMetadata({params}:{params:Promise<{topic:string}>}):Promise<Metadata>{
  const {topic}=await params;
  const doc=connectivityDocs.find((item)=>item.slug===topic);
  if(!doc)return {title:"HandMeKey Connectivity Docs"};
  return {title:`${doc.title} | HandMeKey Connectivity API`,description:doc.description};
}

export default async function ConnectivityTopicPage({params}:{params:Promise<{topic:string}>}){
  const {topic}=await params;
  if(!isTopic(topic))notFound();
  return renderTopic(topic);
}

function renderTopic(topic:ConnectivityDocSlug){
  const doc=connectivityDocs.find((item)=>item.slug===topic)!;
  const content=topicContent(topic);
  return <DeveloperDocsShell active={topic} eyebrow="HANDMEKEY CONNECTIVITY API · V1" title={doc.title} description={doc.description}>{content}</DeveloperDocsShell>;
}

function topicContent(topic:ConnectivityDocSlug){switch(topic){
case "quickstart":return <>
  <DocSection title="1. Create a hotel connection"><p>In Partner Hub, open <b>Connectivity & integrations</b>, select <b>HandMeKey Connectivity API</b>, choose UAT or Production and generate the property API key. Store the key in the PMS/CRS secret manager. The complete key is shown once.</p><Note>Start with UAT. Do not put the API key in browser code, mobile applications, screenshots, tickets or public logs.</Note></DocSection>
  <DocSection title="2. Verify authentication"><Endpoint method="GET" path="/api/v1/connectivity/health"/><Code>{`curl ${connectivityBaseUrl}/api/v1/connectivity/health \\\n  -H "Authorization: Bearer $HANDMEKEY_API_KEY"`}</Code></DocSection>
  <DocSection title="3. Discover and map the property"><Endpoint method="GET" path="/api/v1/connectivity/property"/><p>Read the room and rate-plan codes, then map the PMS codes to HandMeKey once. The ARI and reservation payloads use these mappings automatically.</p></DocSection>
  <DocSection title="4. Send the first ARI update"><Endpoint method="POST" path="/api/v1/connectivity/ari"/><Code>{`curl -X POST ${connectivityBaseUrl}/api/v1/connectivity/ari \\\n  -H "Authorization: Bearer $HANDMEKEY_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -H "x-idempotency-key: first-ari-001" \\\n  -d '{"updates":[{"roomCode":"DLX","ratePlanCode":"BAR","date":"2026-10-01","rate":115,"available":8}]}'`}</Code></DocSection>
  <DocSection title="5. Receive a reservation"><Flow>HandMeKey booking → reservation event → hotel PMS/CRS → ACK</Flow><p>Use the webhook for automatic delivery or poll the reservation feed. Commit the reservation in the PMS before sending the ACK.</p></DocSection>
</>;
case "authentication":return <>
  <DocSection title="Bearer authentication"><p>Every Connectivity API request is scoped to one hotel connection and must include the property API key.</p><Code>{`Authorization: Bearer hmk_live_...`}</Code><p>UAT keys start with the test environment prefix and Production keys use the live environment prefix.</p></DocSection>
  <DocSection title="Key lifecycle"><p>Create the key from Partner Hub and save it immediately. HandMeKey stores a hash of the key inside encrypted connection credentials rather than storing the clear-text API key. Rotating a key invalidates the previous key immediately.</p></DocSection>
  <DocSection title="Recommended storage"><p>Keep credentials only in a server-side secret store or the PMS/CRS integration vault. Restrict access to the minimum hotel IT/integration staff required to operate the connection.</p></DocSection>
</>;
case "property-mapping":return <>
  <DocSection title="Read the hotel model"><Endpoint method="GET" path="/api/v1/connectivity/property"/><p>The property response includes the HandMeKey hotel, active room types, active rate plans, capacity details and the external codes saved in Partner Hub mapping.</p></DocSection>
  <DocSection title="Room mapping"><p>Map one PMS room code to the matching HandMeKey room type. Example: <code>DLXK</code> in the PMS can map to <code>DLX</code> in HandMeKey.</p><Note>Do not map two different physical products to one HandMeKey room type unless the hotel intentionally sells them as the same inventory pool.</Note></DocSection>
  <DocSection title="Rate-plan mapping"><p>Map each sellable external rate plan to the corresponding HandMeKey rate plan. Example: <code>BARBF</code> may map to the HandMeKey Best Available Rate with breakfast.</p><p>If no external mapping is configured, the integration may use the HandMeKey room/rate codes directly.</p></DocSection>
</>;
case "ari":return <>
  <DocSection title="Push ARI changes"><Endpoint method="POST" path="/api/v1/connectivity/ari"/><p>ARI means availability, rates and inventory restrictions. Send changed dates as soon as the PMS/CRS or revenue system changes them.</p><Code>{`{
  "updates": [{
    "roomCode": "DLXK",
    "ratePlanCode": "BARBF",
    "date": "2026-10-01",
    "rate": 115.00,
    "available": 8,
    "overbookingLimit": 0,
    "minStay": 1,
    "maxStay": 14,
    "minAdvanceBookingDays": 0,
    "maxAdvanceBookingDays": 365,
    "closedToArrival": false,
    "closedToDeparture": false,
    "closed": false,
    "stopSell": false
  }]
}`}</Code></DocSection>
  <DocSection title="Batching and idempotency"><p>One request accepts up to 500 update rows. Send a unique <code>x-idempotency-key</code> for every logical batch so network retries do not apply the same batch twice.</p></DocSection>
  <DocSection title="Source of truth"><p>For a connected hotel, the hotel PMS/CRS should be treated as the operational source of truth for rates and inventory. HandMeKey consumes those values as a distribution channel.</p></DocSection>
</>;
case "reservations":return <>
  <DocSection title="Reservation lifecycle"><p>HandMeKey publishes <code>reservation.created</code>, <code>reservation.modified</code> and <code>reservation.cancelled</code> events.</p><Flow>Guest confirms booking → HandMeKey → hotel system → durable reservation record → ACK</Flow></DocSection>
  <DocSection title="Pull feed"><Endpoint method="GET" path="/api/v1/connectivity/reservations?limit=50"/><p>The event payload contains the reservation reference, guest data, stay dates, mapped room/rate codes, payment state, totals and the nightly breakdown.</p></DocSection>
  <DocSection title="Acknowledge"><Endpoint method="POST" path="/api/v1/connectivity/reservations/{eventId}/ack"/><p>ACK only after the PMS/CRS has committed the change. If the integration crashes before ACK, reprocess the event safely using the event ID or reservation revision as your local idempotency key.</p></DocSection>
</>;
case "webhooks":return <>
  <DocSection title="Automatic reservation delivery"><p>Configure a public HTTPS webhook URL in Partner Hub. HandMeKey delivers reservation events automatically and retries failures with backoff.</p><Code>{`x-handmekey-event: reservation.created
x-handmekey-delivery: <event-id>
x-handmekey-timestamp: <unix-seconds>
x-handmekey-signature: sha256=<hex-hmac>`}</Code></DocSection>
  <DocSection title="Verify the signature"><p>Compute HMAC-SHA256 with the webhook signing secret over:</p><Code>{`timestamp + "." + raw_request_body`}</Code><p>Compare your calculated value with <code>x-handmekey-signature</code> using a constant-time comparison. Reject stale timestamps to reduce replay risk.</p></DocSection>
  <DocSection title="Response behavior"><p>Return a successful 2xx response only after the event is accepted for durable processing. A non-2xx response is treated as a delivery failure and can be retried.</p></DocSection>
</>;
case "idempotency-retries":return <>
  <DocSection title="Inbound ARI idempotency"><p>Use a stable unique <code>x-idempotency-key</code> for one logical ARI batch. If the same request must be retried after a timeout, reuse the same key.</p></DocSection>
  <DocSection title="Outbound reservation idempotency"><p>Every reservation event has a unique event ID and the reservation includes a revision. Store processed event IDs in the PMS integration layer so a retry can never create a duplicate reservation.</p></DocSection>
  <DocSection title="Retry strategy"><p>Retry temporary failures with exponential backoff and jitter. Do not retry validation failures until the request is corrected. Webhook delivery is retried by HandMeKey; integrations using the pull feed should poll again without ACKing failed local writes.</p></DocSection>
</>;
case "errors":return <>
  <DocSection title="HTTP status guide"><p><b>400</b> means invalid request or mapping. <b>401</b> means missing/invalid API key. <b>404</b> means the requested connectivity resource does not exist for that hotel. <b>409</b> means a state conflict. <b>5xx</b> means a temporary server/provider failure.</p></DocSection>
  <DocSection title="Common integration failures"><p>Typical causes include an unknown room code, unknown rate-plan code, missing base rate when creating a new rate day, invalid stay limits, invalid public webhook URL, disconnected connection or rotated API key.</p></DocSection>
  <DocSection title="Recovery"><p>For 401, replace the credential. For validation errors, correct the payload before retrying. For temporary 5xx/network failures, retry using the same idempotency key. Never create a second local reservation because a webhook or ACK response timed out.</p></DocSection>
</>;
case "security":return <>
  <DocSection title="Credentials"><p>Connectivity credentials are encrypted at rest. API keys are not stored as recoverable clear text, and key rotation invalidates the previous key.</p></DocSection>
  <DocSection title="Network controls"><p>Connectivity endpoints require HTTPS. Webhook targets must resolve to public internet addresses; localhost and private/local network targets are rejected.</p></DocSection>
  <DocSection title="Operational controls"><p>Use least-privilege hotel staff access, separate UAT and Production credentials, rotate credentials when staff/vendors change, and never transfer secrets through public email threads or chat screenshots.</p></DocSection>
  <DocSection title="Webhook integrity"><p>Verify the HMAC signature against the raw request body and validate the timestamp before processing any reservation event.</p></DocSection>
</>;
case "testing-uat":return <>
  <DocSection title="UAT test sequence"><ol><li>Health request succeeds with UAT key.</li><li>Property endpoint returns the expected hotel.</li><li>Every active sellable room is mapped.</li><li>Every active sellable rate plan is mapped.</li><li>Push a test price and verify it appears correctly.</li><li>Push availability and stop-sell changes and verify behavior.</li><li>Create a test booking and verify the PMS receives it once.</li><li>Modify the booking and verify the revision updates.</li><li>Cancel it and verify the PMS status.</li><li>Simulate a temporary webhook failure and verify retry/duplicate protection.</li></ol></DocSection>
  <DocSection title="Do not test in Production first"><p>Production should only be enabled after the hotel IT team and HandMeKey confirm mapping and the complete reservation lifecycle in UAT.</p></DocSection>
</>;
case "go-live":return <>
  <DocSection title="Hotel IT checklist"><ol><li>Production API key stored in a secret manager.</li><li>Room and rate-plan mapping signed off by the hotel.</li><li>ARI updates automated from the source system.</li><li>Webhook signature verification enabled.</li><li>Reservation create/modify/cancel processing is idempotent.</li><li>ACK occurs only after a durable PMS write.</li><li>Monitoring alerts the hotel integration team on failures.</li><li>Support owner and escalation contact are documented.</li></ol></DocSection>
  <DocSection title="Cutover"><p>Choose a controlled go-live window. Send an initial ARI snapshot, verify bookability on HandMeKey, make one monitored test reservation and confirm it appears correctly in the PMS before opening normal traffic.</p></DocSection>
</>;
case "pms-adapters":return <>
  <DocSection title="Direct HandMeKey API"><p>Any hotel PMS/CRS/channel manager that can make HTTPS requests can integrate with the HandMeKey Connectivity API using the documented ARI and reservation interfaces.</p></DocSection>
  <DocSection title="Oracle OPERA Cloud / OHIP"><p>HandMeKey also has an Oracle OHIP connectivity path in Partner Hub for properties where direct Oracle integration is approved and configured. Oracle credentials and mappings are managed separately from the native HandMeKey API key.</p></DocSection>
  <DocSection title="Channel managers and other PMS vendors"><p>SiteMinder, Cloudbeds, Mews and other providers can be added as dedicated adapters on the same connectivity engine. Until a dedicated adapter exists, a vendor may integrate directly against HandMeKey Connectivity API if its platform supports custom API connectivity.</p></DocSection>
</>;
case "api-reference":return <>
  <DocSection title="Core endpoints"><Endpoint method="GET" path="/api/v1/connectivity/health"/><Endpoint method="GET" path="/api/v1/connectivity/property"/><Endpoint method="POST" path="/api/v1/connectivity/ari"/><Endpoint method="GET" path="/api/v1/connectivity/reservations?limit=50"/><Endpoint method="POST" path="/api/v1/connectivity/reservations/{eventId}/ack"/></DocSection>
  <DocSection title="OpenAPI"><p>The machine-readable OpenAPI specification is available at:</p><Endpoint method="GET" path="/api/v1/connectivity/openapi"/><p>Import it into tools that support OpenAPI for request exploration, code generation and integration testing.</p></DocSection>
  <DocSection title="Base URL"><Code>{connectivityBaseUrl}</Code></DocSection>
</>;
case "changelog":return <>
  <DocSection title="Version 1 · 10 September 2026"><p>Initial HandMeKey Connectivity API developer platform: property authentication, room/rate mapping, ARI push, reservation create/modify/cancel event feed, event ACK, HMAC-signed webhooks, idempotency, retry handling, UAT/Production environments and OpenAPI documentation.</p></DocSection>
  <DocSection title="Compatibility policy"><p>Breaking request/response changes require a new API version. Additive fields may be introduced without breaking v1 consumers, so integrations should ignore unknown JSON properties.</p></DocSection>
  <DocSection title="Integration ownership"><p>Hotels and vendors should maintain a named technical owner for their connector so operational or compatibility issues can be escalated without interrupting bookings.</p></DocSection>
</>;
}}

function isTopic(value:string):value is ConnectivityDocSlug{return connectivityDocs.some((item)=>item.slug===value);}
