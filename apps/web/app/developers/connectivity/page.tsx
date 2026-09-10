import type {Metadata} from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Braces,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  CloudCog,
  Code2,
  FileJson2,
  Fingerprint,
  GitBranch,
  Hotel,
  KeyRound,
  LifeBuoy,
  Link2,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  Rocket,
  Route,
  ScrollText,
  ShieldCheck,
  TestTube2,
  Webhook,
  Zap,
} from "lucide-react";
import {connectivityDocs} from "./docs-catalog";

export const metadata:Metadata={
  title:"HandMeKey Connectivity API | Developer Documentation",
  description:"Complete technical documentation for PMS, CRS and channel-manager teams integrating hotels with HandMeKey.",
};

const docIcons=[
  Rocket,
  KeyRound,
  GitBranch,
  CircleGauge,
  Hotel,
  Webhook,
  RefreshCw,
  LifeBuoy,
  ShieldCheck,
  TestTube2,
  CheckCircle2,
  PlugZap,
  Braces,
  ScrollText,
] as const;

const highlights=[
  {icon:Zap,label:"Fast to integrate",value:"REST + JSON"},
  {icon:Webhook,label:"Reliable delivery",value:"Signed webhooks"},
  {icon:RefreshCw,label:"Safe writes",value:"Idempotent requests"},
];

export default function ConnectivityDeveloperDocs(){
  return <main className="devPage">
    <header className="topbar">
      <Link href="/" className="brand" aria-label="HandMeKey home">
        <span className="brandMark">H</span>
        <span>HandMeKey</span>
      </Link>

      <div className="platformLabel">Developer Platform <span>API v1</span></div>

      <nav className="topnav" aria-label="Developer navigation">
        <Link href="/developers/connectivity" className="navText">Documentation</Link>
        <Link href="/partner/login" className="btn btnGhost">Partner Hub</Link>
        <a href="/api/v1/connectivity/openapi" className="btn btnDark"><FileJson2 size={15}/> OpenAPI JSON</a>
      </nav>
    </header>

    <section className="hero">
      <div className="heroGlow heroGlowOne"/>
      <div className="heroGlow heroGlowTwo"/>

      <div className="heroCopy">
        <div className="eyebrow"><span className="statusDot"/> HANDMEKEY CONNECTIVITY API · V1</div>
        <h1>One connection.<br/><span>Every hotel operation.</span></h1>
        <p className="heroLead">Connect your PMS, CRS or channel manager to HandMeKey for real-time rates, inventory, restrictions and reservations — through one clean API.</p>
        <p className="heroArabic" dir="rtl">اربط نظام الفندق مع HandMeKey من خلال API واحد للأسعار، المخزون، القيود والحجوزات مع webhooks موثوقة وتوثيق واضح.</p>

        <div className="heroActions">
          <Link href="/developers/connectivity/quickstart" className="heroBtn heroBtnPrimary">Start quickstart <ArrowRight size={17}/></Link>
          <Link href="/developers/connectivity/api-reference" className="heroBtn heroBtnSecondary"><Code2 size={17}/> API reference</Link>
        </div>

        <div className="trustRow">
          <span><CheckCircle2 size={15}/> UAT-ready</span>
          <span><CheckCircle2 size={15}/> HMAC webhooks</span>
          <span><CheckCircle2 size={15}/> Production controls</span>
        </div>
      </div>

      <div className="heroPanel" aria-label="Connectivity flow preview">
        <div className="panelTop">
          <div>
            <span className="panelKicker">LIVE CONNECTION MODEL</span>
            <strong>Hotel → HandMeKey</strong>
          </div>
          <span className="onlinePill"><span/> ONLINE</span>
        </div>

        <div className="flowCard">
          <div className="flowNode">
            <span className="flowIcon"><Hotel size={20}/></span>
            <div><small>YOUR SYSTEM</small><b>PMS / CRS</b></div>
          </div>
          <div className="flowLine"><span/><ChevronRight size={16}/></div>
          <div className="flowNode activeNode">
            <span className="flowIcon"><Link2 size={20}/></span>
            <div><small>CONNECTIVITY</small><b>API v1</b></div>
          </div>
          <div className="flowLine"><span/><ChevronRight size={16}/></div>
          <div className="flowNode">
            <span className="flowIcon"><CloudCog size={20}/></span>
            <div><small>PLATFORM</small><b>HandMeKey</b></div>
          </div>
        </div>

        <div className="terminal">
          <div className="terminalHead"><span/><span/><span/><em>POST /api/v1/connectivity/ari</em></div>
          <pre><code><span className="codeMuted">{"{"}</span>{"\n"}  <span className="codeKey">"hotelId"</span>: <span className="codeValue">"HMK-1042"</span>,{"\n"}  <span className="codeKey">"roomType"</span>: <span className="codeValue">"DLX-KING"</span>,{"\n"}  <span className="codeKey">"inventory"</span>: <span className="codeNumber">8</span>,{"\n"}  <span className="codeKey">"rate"</span>: <span className="codeNumber">145.00</span>{"\n"}<span className="codeMuted">{"}"}</span></code></pre>
          <div className="terminalStatus"><CheckCircle2 size={15}/> 200 OK <span>· 84 ms</span></div>
        </div>
      </div>
    </section>

    <section className="highlightStrip" aria-label="API capabilities">
      {highlights.map(({icon:Icon,label,value})=><div className="highlightItem" key={label}>
        <span className="highlightIcon"><Icon size={18}/></span>
        <div><small>{label}</small><strong>{value}</strong></div>
      </div>)}
      <div className="highlightCta"><LockKeyhole size={16}/> Server-to-server credentials</div>
    </section>

    <section className="startSection">
      <div className="sectionHeading">
        <div><span className="sectionEyebrow">START HERE</span><h2>Ship your first connection</h2></div>
        <p>Go from credentials to production with a predictable integration path.</p>
      </div>

      <div className="startGrid">
        <Link href="/developers/connectivity/quickstart" className="startCard featured">
          <span className="cardIcon"><Rocket size={22}/></span>
          <span className="stepNumber">01</span>
          <h3>Quickstart</h3>
          <p>Get credentials, map your first property and send your first ARI update.</p>
          <span className="cardLink">Start building <ArrowRight size={16}/></span>
        </Link>

        <Link href="/developers/connectivity/property-mapping" className="startCard">
          <span className="cardIcon"><Route size={22}/></span>
          <span className="stepNumber">02</span>
          <h3>Map your property</h3>
          <p>Connect hotel, room and rate-plan codes safely before live traffic.</p>
          <span className="cardLink">Open mapping guide <ArrowRight size={16}/></span>
        </Link>

        <Link href="/developers/connectivity/testing-uat" className="startCard">
          <span className="cardIcon"><TestTube2 size={22}/></span>
          <span className="stepNumber">03</span>
          <h3>Test & go live</h3>
          <p>Validate ARI, reservation delivery, retries and failure recovery in UAT.</p>
          <span className="cardLink">View UAT checklist <ArrowRight size={16}/></span>
        </Link>
      </div>
    </section>

    <section className="docsSection">
      <div className="sectionHeading docsHeading">
        <div><span className="sectionEyebrow">DOCUMENTATION</span><h2>Integration guides</h2></div>
        <div className="docCount"><Boxes size={16}/>{connectivityDocs.length} developer documents</div>
      </div>

      <div className="docsGrid">
        {connectivityDocs.map((doc,index)=>{
          const Icon=docIcons[index] ?? Braces;
          return <Link key={doc.slug} href={`/developers/connectivity/${doc.slug}`} className="docCard">
            <div className="docCardTop">
              <span className="docIcon"><Icon size={19}/></span>
              <span className="docNumber">DOC {String(index+1).padStart(2,"0")}</span>
            </div>
            <h3>{doc.title}</h3>
            <p>{doc.description}</p>
            <span className="docArrow"><ArrowRight size={16}/></span>
          </Link>;
        })}
      </div>
    </section>

    <section className="audienceSection">
      <div className="audienceIntro">
        <span className="sectionEyebrow light">BUILT FOR REAL HOTEL SYSTEMS</span>
        <h2>From one hotel to a full connectivity partner.</h2>
        <p>The same API model supports hotel IT teams, PMS/CRS vendors, channel managers and automation tooling.</p>
        <Link href="/developers/connectivity/go-live" className="heroBtn heroBtnPrimary audienceBtn">Go-live checklist <ArrowRight size={17}/></Link>
      </div>

      <div className="audienceCards">
        <div className="audienceCard"><Fingerprint size={21}/><div><b>Hotel / Partner team</b><p>Create credentials in Partner Hub and hand the integration package to your approved IT team.</p></div></div>
        <div className="audienceCard"><PlugZap size={21}/><div><b>PMS / CRS developer</b><p>Implement mapping, ARI, reservations and signed webhooks with retry-safe patterns.</p></div></div>
        <div className="audienceCard"><Braces size={21}/><div><b>Automation tooling</b><p>Use the OpenAPI specification with Postman, Swagger-compatible tools or generated clients.</p></div></div>
      </div>
    </section>

    <footer className="devFooter">
      <div><strong>HandMeKey Developer Platform</strong><span>Connectivity API · Version 1</span></div>
      <div className="footerLinks"><Link href="/developers/connectivity/changelog">Changelog</Link><Link href="/developers/connectivity/security">Security</Link><Link href="/developers/connectivity/errors">Troubleshooting</Link></div>
    </footer>

    <style>{`
      :root{--dev-navy:#0b2138;--dev-navy-2:#123754;--dev-ink:#102235;--dev-muted:#647384;--dev-line:#dfe6ec;--dev-bg:#f6f8fa;--dev-gold:#d4a84f;--dev-ivory:#fbf8ef}
      *{box-sizing:border-box}
      .devPage{max-width:1280px;margin:0 auto;padding:22px 24px 56px;font-family:inherit;color:var(--dev-ink)}
      .topbar{min-height:64px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;margin-bottom:24px}
      .brand{display:inline-flex;align-items:center;gap:10px;color:var(--dev-ink);font-size:20px;font-weight:900;text-decoration:none;letter-spacing:-.02em}
      .brandMark{width:30px;height:30px;border-radius:9px;background:var(--dev-navy);color:white;display:grid;place-items:center;font-size:14px;box-shadow:0 6px 18px rgba(11,33,56,.18)}
      .platformLabel{font-size:13px;color:#758292;display:flex;align-items:center;gap:9px}.platformLabel span{font-size:10px;font-weight:850;letter-spacing:.08em;color:#627283;background:#eef2f5;border:1px solid #e0e6eb;border-radius:999px;padding:5px 8px}
      .topnav{display:flex;align-items:center;gap:9px}.navText{font-size:13px;font-weight:700;text-decoration:none;color:#667585;padding:9px 8px}.navText:hover{color:var(--dev-ink)}
      .btn{height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 13px;border-radius:10px;text-decoration:none;font-size:12px;font-weight:800;transition:.18s ease}.btnGhost{border:1px solid #d8e0e7;color:var(--dev-ink);background:white}.btnDark{border:1px solid var(--dev-navy);background:var(--dev-navy);color:white}.btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(15,35,55,.1)}

      .hero{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(400px,.95fr);gap:46px;align-items:center;min-height:500px;border-radius:28px;padding:54px 52px;background:linear-gradient(135deg,#0a2037 0%,#102e49 54%,#173f5f 100%);color:white;box-shadow:0 18px 55px rgba(11,33,56,.16)}
      .heroGlow{position:absolute;border-radius:999px;filter:blur(2px);pointer-events:none}.heroGlowOne{width:420px;height:420px;right:-190px;top:-210px;background:radial-gradient(circle,rgba(212,168,79,.17),transparent 68%)}.heroGlowTwo{width:420px;height:420px;left:30%;bottom:-350px;background:radial-gradient(circle,rgba(91,151,195,.16),transparent 70%)}
      .heroCopy,.heroPanel{position:relative;z-index:1}.eyebrow{display:flex;align-items:center;gap:9px;font-size:11px;font-weight:850;letter-spacing:.14em;color:#cbd7e2}.statusDot{width:7px;height:7px;border-radius:50%;background:#58c995;box-shadow:0 0 0 4px rgba(88,201,149,.12)}
      .hero h1{font-size:clamp(42px,5vw,66px);line-height:1.02;letter-spacing:-.045em;margin:17px 0 18px;max-width:700px}.hero h1 span{color:#f0d59b}
      .heroLead{max-width:700px;margin:0;font-size:18px;line-height:1.68;color:#d6e0e8}.heroArabic{max-width:670px;margin:14px 0 0;font-size:14px;line-height:1.9;color:#aebfce}
      .heroActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:25px}.heroBtn{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:9px;border-radius:11px;padding:0 16px;text-decoration:none;font-size:13px;font-weight:850;transition:.18s ease}.heroBtn:hover{transform:translateY(-1px)}.heroBtnPrimary{background:#fff;color:var(--dev-navy);border:1px solid #fff;box-shadow:0 8px 25px rgba(0,0,0,.12)}.heroBtnSecondary{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);color:white}.trustRow{display:flex;gap:18px;flex-wrap:wrap;margin-top:24px;color:#aabaca;font-size:11px;font-weight:700}.trustRow span{display:flex;align-items:center;gap:6px}.trustRow svg{color:#70d2a5}

      .heroPanel{border:1px solid rgba(255,255,255,.15);border-radius:20px;background:rgba(7,25,42,.56);padding:18px;backdrop-filter:blur(12px);box-shadow:0 24px 60px rgba(0,0,0,.16)}
      .panelTop{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:2px 2px 15px}.panelTop>div{display:grid;gap:4px}.panelKicker{font-size:9px;font-weight:850;letter-spacing:.14em;color:#8299ab}.panelTop strong{font-size:15px}.onlinePill{display:flex;align-items:center;gap:6px;border:1px solid rgba(103,214,160,.2);background:rgba(78,181,132,.08);color:#8ee0b6;border-radius:999px;padding:6px 8px;font-size:9px;font-weight:900;letter-spacing:.08em}.onlinePill span{width:6px;height:6px;background:#6ed1a1;border-radius:50%}
      .flowCard{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:6px;align-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);border-radius:14px;padding:13px 11px}.flowNode{display:flex;align-items:center;gap:8px;min-width:0}.flowIcon{width:34px;height:34px;flex:0 0 34px;border-radius:9px;display:grid;place-items:center;background:rgba(255,255,255,.07);color:#bccbd8}.activeNode .flowIcon{background:rgba(212,168,79,.13);color:#f0d59b}.flowNode div{display:grid;gap:2px;min-width:0}.flowNode small{font-size:7px;letter-spacing:.09em;color:#71899c;font-weight:850}.flowNode b{font-size:10px;white-space:nowrap}.flowLine{display:flex;align-items:center;color:#6e8799}.flowLine span{display:block;width:10px;height:1px;background:#496376}
      .terminal{margin-top:12px;border-radius:13px;overflow:hidden;border:1px solid rgba(255,255,255,.09);background:#071a2a}.terminalHead{height:36px;display:flex;align-items:center;gap:6px;border-bottom:1px solid rgba(255,255,255,.07);padding:0 12px}.terminalHead>span{width:6px;height:6px;border-radius:50%;background:#536979}.terminalHead em{margin-left:5px;font-style:normal;color:#879baa;font-size:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.terminal pre{margin:0;padding:14px 15px 10px;overflow:auto;font-size:10px;line-height:1.65;color:#dbe7ef;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.codeKey{color:#9fcbe8}.codeValue{color:#e8c987}.codeNumber{color:#8cdbb1}.codeMuted{color:#8397a5}.terminalStatus{display:flex;align-items:center;gap:6px;padding:0 15px 13px;color:#79d7a9;font-size:9px;font-weight:850}.terminalStatus span{color:#6d8292;font-weight:600}

      .highlightStrip{display:grid;grid-template-columns:repeat(3,1fr) auto;align-items:stretch;margin:18px 0 42px;border:1px solid var(--dev-line);border-radius:16px;background:white;box-shadow:0 8px 28px rgba(18,36,53,.04);overflow:hidden}.highlightItem{display:flex;align-items:center;gap:10px;padding:16px 18px;border-right:1px solid var(--dev-line)}.highlightIcon{width:34px;height:34px;border-radius:9px;background:#f1f5f8;display:grid;place-items:center;color:var(--dev-navy)}.highlightItem>div{display:grid;gap:2px}.highlightItem small{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#83909c;font-weight:850}.highlightItem strong{font-size:12px}.highlightCta{display:flex;align-items:center;gap:7px;padding:0 17px;background:#f8fafb;color:#657483;font-size:10px;font-weight:750}

      .startSection,.docsSection{margin-top:42px}.sectionHeading{display:flex;justify-content:space-between;align-items:end;gap:25px;margin-bottom:18px}.sectionHeading>div:first-child{display:grid;gap:7px}.sectionEyebrow{font-size:10px;font-weight:900;letter-spacing:.14em;color:#8995a0}.sectionHeading h2{margin:0;font-size:30px;line-height:1.1;letter-spacing:-.025em}.sectionHeading>p{max-width:500px;margin:0;color:#6f7d8b;font-size:13px;line-height:1.6;text-align:right}
      .startGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.startCard{position:relative;min-height:235px;display:flex;flex-direction:column;padding:22px;border:1px solid var(--dev-line);border-radius:18px;background:#fff;text-decoration:none;color:inherit;overflow:hidden;transition:.2s ease}.startCard:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(16,34,53,.08);border-color:#cdd7df}.startCard.featured{background:linear-gradient(140deg,#fcfbf7,#fff);border-color:#e3dac2}.cardIcon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#eef3f6;color:var(--dev-navy)}.featured .cardIcon{background:#f4ead2;color:#9b762f}.stepNumber{position:absolute;right:20px;top:22px;color:#b9c2c9;font-size:11px;font-weight:900;letter-spacing:.08em}.startCard h3{font-size:18px;margin:18px 0 7px}.startCard p{font-size:13px;line-height:1.65;color:#687785;margin:0 0 20px}.cardLink{margin-top:auto;display:flex;align-items:center;gap:7px;font-size:11px;font-weight:850;color:#34495b}

      .docsHeading{align-items:center}.docCount{display:flex!important;grid-auto-flow:column;align-items:center;gap:7px!important;color:#7c8894;font-size:11px}.docsGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.docCard{position:relative;min-height:185px;padding:18px;border:1px solid var(--dev-line);border-radius:16px;background:#fff;text-decoration:none;color:inherit;transition:.18s ease}.docCard:hover{transform:translateY(-2px);border-color:#c8d3dc;box-shadow:0 12px 26px rgba(16,34,53,.06)}.docCardTop{display:flex;align-items:center;justify-content:space-between}.docIcon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#f2f5f7;color:#28445c}.docNumber{font-size:8px;font-weight:900;letter-spacing:.09em;color:#a4afb8}.docCard h3{font-size:15px;line-height:1.25;margin:15px 24px 6px 0}.docCard p{font-size:11.5px;line-height:1.6;color:#74818d;margin:0;padding-right:7px}.docArrow{position:absolute;right:16px;bottom:15px;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:#f6f8f9;color:#7d8a95;opacity:0;transform:translateX(-3px);transition:.18s ease}.docCard:hover .docArrow{opacity:1;transform:translateX(0)}

      .audienceSection{display:grid;grid-template-columns:.82fr 1.18fr;gap:32px;margin-top:48px;padding:36px;border-radius:22px;background:linear-gradient(135deg,#0b2138,#133a58);color:white;overflow:hidden}.sectionEyebrow.light{color:#89a1b4}.audienceIntro h2{font-size:30px;line-height:1.15;letter-spacing:-.025em;margin:10px 0 12px}.audienceIntro p{max-width:520px;color:#aebdcc;font-size:13px;line-height:1.7;margin:0}.audienceBtn{margin-top:20px;width:max-content}.audienceCards{display:grid;gap:10px}.audienceCard{display:grid;grid-template-columns:auto 1fr;gap:13px;padding:16px 17px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.045)}.audienceCard>svg{color:#e3c57f;margin-top:1px}.audienceCard b{font-size:12px}.audienceCard p{margin:5px 0 0;color:#aebdcc;font-size:11.5px;line-height:1.55}
      .devFooter{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:28px 4px 0;margin-top:16px;color:#7c8995}.devFooter>div:first-child{display:flex;align-items:center;gap:10px}.devFooter strong{color:#455868;font-size:12px}.devFooter span{font-size:10px}.footerLinks{display:flex;gap:18px}.footerLinks a{text-decoration:none;color:#74818c;font-size:10px;font-weight:750}.footerLinks a:hover{color:var(--dev-ink)}

      @media(max-width:1080px){.hero{grid-template-columns:1fr;padding:46px}.heroPanel{max-width:700px}.docsGrid{grid-template-columns:repeat(3,1fr)}.highlightStrip{grid-template-columns:repeat(3,1fr)}.highlightCta{display:none}}
      @media(max-width:820px){.devPage{padding:16px 16px 40px}.topbar{grid-template-columns:1fr auto}.platformLabel{display:none}.navText{display:none}.hero{padding:35px 26px;border-radius:22px;gap:32px}.hero h1{font-size:clamp(38px,10vw,54px)}.heroLead{font-size:16px}.startGrid{grid-template-columns:1fr}.docsGrid{grid-template-columns:repeat(2,1fr)}.audienceSection{grid-template-columns:1fr}.sectionHeading{align-items:start;flex-direction:column}.sectionHeading>p{text-align:left}.highlightStrip{grid-template-columns:1fr}.highlightItem{border-right:0;border-bottom:1px solid var(--dev-line)}.highlightItem:last-of-type{border-bottom:0}.flowCard{grid-template-columns:1fr}.flowLine{height:18px;justify-content:center;transform:rotate(90deg)}.heroPanel{padding:14px}}
      @media(max-width:560px){.topbar{grid-template-columns:1fr}.topnav{justify-content:space-between}.btn{flex:1}.hero{padding:30px 20px}.hero h1{font-size:39px}.heroArabic{font-size:13px}.heroActions{display:grid}.heroBtn{width:100%}.trustRow{gap:10px;display:grid}.docsGrid{grid-template-columns:1fr}.audienceSection{padding:28px 22px}.devFooter{align-items:flex-start;flex-direction:column}.devFooter>div:first-child{align-items:flex-start;flex-direction:column}.footerLinks{flex-wrap:wrap}.panelTop{align-items:flex-start}.flowNode{justify-content:center}.flowNode div{min-width:90px}.terminal pre{font-size:9px}.docsHeading{align-items:flex-start}}
    `}</style>
  </main>;
}
