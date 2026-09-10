import Link from "next/link";
import type {ReactNode} from "react";

export const connectivityDocs=[
  {slug:"quickstart",title:"Quickstart",description:"From API key to the first live ARI update and reservation."},
  {slug:"authentication",title:"Authentication",description:"API keys, environments, rotation and server-side credential handling."},
  {slug:"property-mapping",title:"Property & mapping",description:"Discover rooms and rate plans and map external PMS codes safely."},
  {slug:"ari",title:"Rates, inventory & restrictions",description:"Push ARI changes, stay controls, stop-sell and availability."},
  {slug:"reservations",title:"Reservations",description:"Receive new bookings, modifications and cancellations and ACK them."},
  {slug:"webhooks",title:"Webhooks",description:"Automatic reservation delivery, HMAC signatures and replay protection."},
  {slug:"idempotency-retries",title:"Idempotency & retries",description:"Build retry-safe integrations without duplicating inventory or bookings."},
  {slug:"errors",title:"Errors & troubleshooting",description:"HTTP statuses, common integration failures and recovery guidance."},
  {slug:"security",title:"Security",description:"Credential storage, webhook safety, key rotation and production controls."},
  {slug:"testing-uat",title:"UAT & testing",description:"Test checklist for mapping, ARI, reservation delivery and failure recovery."},
  {slug:"go-live",title:"Go-live checklist",description:"Production readiness checklist for hotel IT and HandMeKey operations."},
  {slug:"pms-adapters",title:"PMS / CRS adapters",description:"How Oracle, channel managers and custom hotel systems connect."},
  {slug:"api-reference",title:"API reference",description:"Endpoint summary and the machine-readable OpenAPI specification."},
  {slug:"changelog",title:"Changelog & versioning",description:"API compatibility, release policy and integration change tracking."},
] as const;

export type ConnectivityDocSlug=(typeof connectivityDocs)[number]["slug"];

const baseUrl="https://handmekey.com";

export function DeveloperDocsShell({active,eyebrow,title,description,children}:{active?:ConnectivityDocSlug;eyebrow:string;title:string;description:string;children:ReactNode}){
  return <main style={{maxWidth:1240,margin:"0 auto",padding:"26px 20px 80px",fontFamily:"inherit"}}>
    <header style={{display:"flex",justifyContent:"space-between",gap:18,alignItems:"center",flexWrap:"wrap",marginBottom:24}}>
      <div><Link href="/" style={{fontWeight:900,textDecoration:"none",fontSize:22}}>HandMeKey</Link><Link href="/developers/connectivity" style={{marginInlineStart:12,textDecoration:"none",opacity:.64,fontSize:13}}>Connectivity Docs</Link></div>
      <nav style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link href="/partner/login" style={button(false)}>Partner Hub</Link><a href="/api/v1/connectivity/openapi" style={button(true)}>OpenAPI JSON</a></nav>
    </header>
    <section style={{display:"grid",gridTemplateColumns:"minmax(220px,270px) minmax(0,1fr)",gap:22,alignItems:"start"}} className="developerDocsGrid">
      <aside style={{border:"1px solid #dce2e8",borderRadius:18,padding:12,position:"sticky",top:18,background:"#fff"}}>
        <div style={{fontSize:11,fontWeight:900,letterSpacing:".12em",opacity:.5,padding:"8px 10px 10px"}}>CONNECTIVITY API · V1</div>
        <nav style={{display:"grid",gap:4}}>{connectivityDocs.map((item)=><Link key={item.slug} href={`/developers/connectivity/${item.slug}`} style={{padding:"9px 10px",borderRadius:10,textDecoration:"none",fontSize:13,fontWeight:active===item.slug?850:650,background:active===item.slug?"#eef3f7":"transparent",color:"inherit"}}>{item.title}</Link>)}</nav>
      </aside>
      <article style={{minWidth:0}}>
        <div style={{fontSize:11,fontWeight:900,letterSpacing:".13em",opacity:.55}}>{eyebrow}</div>
        <h1 style={{fontSize:"clamp(30px,5vw,48px)",lineHeight:1.08,margin:"10px 0 12px"}}>{title}</h1>
        <p style={{fontSize:17,lineHeight:1.7,opacity:.72,maxWidth:820,margin:"0 0 22px"}}>{description}</p>
        <div style={{display:"grid",gap:16}}>{children}</div>
      </article>
    </section>
    <style>{`@media(max-width:820px){.developerDocsGrid{grid-template-columns:1fr!important}.developerDocsGrid aside{position:static!important}}`}</style>
  </main>;
}

export function DocSection({title,children}:{title:string;children:ReactNode}){return <section style={{border:"1px solid #dce2e8",borderRadius:18,padding:"22px 20px",background:"#fff"}}><h2 style={{fontSize:21,margin:"0 0 10px"}}>{title}</h2><div style={{lineHeight:1.75,fontSize:15.5}}>{children}</div></section>}
export function Endpoint({method,path}:{method:string;path:string}){return <div style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",margin:"10px 0",border:"1px solid #dce2e8",borderRadius:10,overflow:"auto"}}><b style={{fontSize:12}}>{method}</b><code style={{whiteSpace:"nowrap"}}>{path}</code></div>}
export function Code({children}:{children:string}){return <pre style={{overflow:"auto",padding:15,borderRadius:12,background:"#0e2238",color:"#f6f1e6",fontSize:12,lineHeight:1.7,margin:"12px 0",direction:"ltr",textAlign:"left"}}><code>{children}</code></pre>}
export function Note({children}:{children:ReactNode}){return <div style={{padding:"12px 14px",borderRadius:12,background:"#f4f7f9",border:"1px solid #dfe6eb",margin:"12px 0"}}>{children}</div>}
export function Flow({children}:{children:ReactNode}){return <div style={{padding:"14px 16px",borderRadius:12,background:"#0e2238",color:"#fff",fontWeight:750,lineHeight:1.75,margin:"12px 0"}}>{children}</div>}
export const connectivityBaseUrl=baseUrl;

function button(primary:boolean){return {display:"inline-flex",padding:"9px 12px",borderRadius:10,textDecoration:"none",fontWeight:800,fontSize:13,border:`1px solid ${primary?"#0e2238":"#d5dce2"}`,background:primary?"#0e2238":"#fff",color:primary?"#fff":"#0e2238"} as const;}
