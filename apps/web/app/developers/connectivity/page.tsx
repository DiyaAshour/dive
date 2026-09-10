import type {Metadata} from "next";
import Link from "next/link";
import {connectivityDocs} from "./docs-catalog";

export const metadata:Metadata={
  title:"HandMeKey Connectivity API | Developer Documentation",
  description:"Complete technical documentation for PMS, CRS and channel-manager teams integrating hotels with HandMeKey.",
};

export default function ConnectivityDeveloperDocs(){
  return <main style={{maxWidth:1180,margin:"0 auto",padding:"28px 20px 80px",fontFamily:"inherit"}}>
    <header style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"center",marginBottom:28,flexWrap:"wrap"}}>
      <div><Link href="/" style={{fontWeight:900,textDecoration:"none",fontSize:22}}>HandMeKey</Link><span style={{marginInlineStart:10,opacity:.58,fontSize:13}}>Developer Platform</span></div>
      <nav style={{display:"flex",gap:12,flexWrap:"wrap"}}><Link href="/partner/login" style={button(false)}>Partner Hub</Link><a href="/api/v1/connectivity/openapi" style={button(true)}>OpenAPI JSON</a></nav>
    </header>

    <section style={{padding:"36px 30px",border:"1px solid #d9dee5",borderRadius:22,background:"linear-gradient(135deg,#0e2238,#173856)",color:"#fff",marginBottom:24}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:".14em",opacity:.72}}>HANDMEKEY CONNECTIVITY API · V1</div>
      <h1 style={{fontSize:"clamp(34px,5vw,56px)",lineHeight:1.04,margin:"12px 0 14px"}}>Developer documentation</h1>
      <p style={{maxWidth:850,fontSize:18,lineHeight:1.65,opacity:.88,margin:0}}>Everything a hotel IT team, PMS vendor, CRS team or channel manager needs to connect rates, inventory and reservations directly with HandMeKey.</p>
      <p dir="rtl" style={{maxWidth:850,fontSize:15,lineHeight:1.8,opacity:.78,margin:"14px 0 0"}}>كل ما يحتاجه فريق تقنية الفندق أو شركة الـPMS/CRS للربط مع HandMeKey: من أول API key والـmapping إلى الأسعار والمخزون والحجوزات والـwebhooks والاختبار والـgo-live.</p>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:22}}><Link href="/developers/connectivity/quickstart" style={heroButton(true)}>Start quickstart</Link><Link href="/developers/connectivity/api-reference" style={heroButton(false)}>API reference</Link></div>
    </section>

    <section style={{marginTop:28}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"end",flexWrap:"wrap",marginBottom:14}}><div><div style={{fontSize:11,fontWeight:900,letterSpacing:".12em",opacity:.5}}>DOCUMENTATION</div><h2 style={{fontSize:28,margin:"7px 0 0"}}>Integration guides</h2></div><span style={{opacity:.58,fontSize:14}}>{connectivityDocs.length} developer documents</span></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>{connectivityDocs.map((doc,index)=><Link key={doc.slug} href={`/developers/connectivity/${doc.slug}`} style={{display:"block",padding:"20px 18px",border:"1px solid #dce2e8",borderRadius:16,textDecoration:"none",color:"inherit",background:"#fff"}}><span style={{fontSize:11,fontWeight:900,opacity:.45}}>DOC {String(index+1).padStart(2,"0")}</span><h3 style={{fontSize:18,margin:"8px 0 7px"}}>{doc.title}</h3><p style={{fontSize:14,lineHeight:1.6,opacity:.66,margin:0}}>{doc.description}</p></Link>)}</div>
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14,marginTop:28}}>
      <div style={infoCard}><b>Hotel / Partner team</b><p style={infoText}>Create the connection and credentials from Partner Hub → Connectivity, then share this documentation with the approved hotel IT or integration team.</p></div>
      <div style={infoCard}><b>PMS / CRS developer</b><p style={infoText}>Start with Quickstart, implement ARI and reservation delivery, test in UAT, then complete the Go-live checklist.</p></div>
      <div style={infoCard}><b>Automation tooling</b><p style={infoText}>Use the OpenAPI JSON specification with Postman, Swagger-compatible tools or client-generation pipelines.</p></div>
    </section>
  </main>;
}

const infoCard={padding:"20px",border:"1px solid #dce2e8",borderRadius:16,background:"#f8fafb"} as const;
const infoText={margin:"8px 0 0",lineHeight:1.65,fontSize:14,opacity:.7} as const;
function button(primary:boolean):React.CSSProperties{return {display:"inline-flex",padding:"9px 13px",borderRadius:10,textDecoration:"none",fontWeight:800,fontSize:13,border:primary?"1px solid #0e2238":"1px solid #d9dee5",background:primary?"#0e2238":"#fff",color:primary?"#fff":"inherit"};}
function heroButton(primary:boolean):React.CSSProperties{return {display:"inline-flex",padding:"11px 15px",borderRadius:11,textDecoration:"none",fontWeight:850,fontSize:14,border:"1px solid rgba(255,255,255,.28)",background:primary?"#fff":"rgba(255,255,255,.08)",color:primary?"#0e2238":"#fff"};}
