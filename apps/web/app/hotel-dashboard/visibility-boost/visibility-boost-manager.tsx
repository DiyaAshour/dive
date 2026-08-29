"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Globe2, Pause, Play, Search, ShieldCheck, Sparkles, Target, TrendingUp, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
type GuestSegment = "ALL" | "COUPLES" | "FAMILIES" | "BUSINESS" | "SOLO";

type Campaign = Readonly<{
  id: string;
  name: string;
  targetCountries: string[];
  bookingStartsOn: string;
  bookingEndsOn: string;
  stayStartsOn: string;
  stayEndsOn: string;
  extraCommissionPercent: number;
  guestSegment: GuestSegment;
  minimumNights: number;
  maximumNights: number | null;
  status: CampaignStatus;
  baseCommissionRate: number;
  totalCommissionRate: number;
  createdAt: string;
  updatedAt: string;
}>;

type FormState = Readonly<{
  name: string;
  targetCountries: string[];
  bookingStartsOn: string;
  bookingEndsOn: string;
  stayStartsOn: string;
  stayEndsOn: string;
  extraCommissionPercent: number;
  guestSegment: GuestSegment;
  minimumNights: number;
  maximumNights: number | null;
  status: CampaignStatus;
}>;

const COUNTRY_CODES = "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW".split(" ");

const MAP_MARKETS = [
  ["CA",56,-106],["US",38,-97],["MX",23,-102],["BR",-10,-52],["GB",55,-3],["FR",46,2],["ES",40,-4],["DE",51,10],["IT",42,12],["NL",52,5],["TR",39,35],["RU",61,90],
  ["EG",27,30],["JO",31,36],["SA",24,45],["AE",24,54],["QA",25,51],["KW",29,47],["BH",26,50],["OM",21,57],["ZA",-30,25],["IN",22,79],["CN",35,103],["JP",36,138],["KR",36,128],["SG",1,104],["MY",4,102],["ID",-2,118],["AU",-25,134],
] as const;

const PRESETS: Array<Readonly<{key:string; countries:string[]}>> = [
  {key:"GCC", countries:["SA","AE","QA","KW","BH","OM"]},
  {key:"Europe", countries:["GB","FR","DE","IT","ES","NL","BE","CH","AT","SE","NO","DK","IE","PT","PL","GR","CZ","RO"]},
  {key:"North America", countries:["US","CA","MX"]},
  {key:"East Asia", countries:["CN","JP","KR","SG","MY","ID","TH","VN","PH"]},
  {key:"Worldwide", countries:COUNTRY_CODES},
];

function isoDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function flag(code: string) {
  return code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function mapPoint(lat: number, lng: number) {
  return {x: ((lng + 180) / 360) * 960, y: ((90 - lat) / 180) * 460};
}

function formFromCampaign(campaign: Campaign, status = campaign.status): FormState {
  return {
    name: campaign.name,
    targetCountries: campaign.targetCountries,
    bookingStartsOn: campaign.bookingStartsOn,
    bookingEndsOn: campaign.bookingEndsOn,
    stayStartsOn: campaign.stayStartsOn,
    stayEndsOn: campaign.stayEndsOn,
    extraCommissionPercent: campaign.extraCommissionPercent,
    guestSegment: campaign.guestSegment,
    minimumNights: campaign.minimumNights,
    maximumNights: campaign.maximumNights,
    status,
  };
}

export default function VisibilityBoostManager({hotelId, baseCommissionRate, initialCampaigns, locale}:{hotelId:string;baseCommissionRate:number;initialCampaigns:Campaign[];locale:Locale}) {
  const ar = locale === "ar";
  const names = useMemo(() => new Intl.DisplayNames([locale], {type:"region"}), [locale]);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: ar ? "حملة زيادة الظهور" : "Visibility boost campaign",
    targetCountries:["SA","AE"],
    bookingStartsOn:isoDate(0), bookingEndsOn:isoDate(30), stayStartsOn:isoDate(1), stayEndsOn:isoDate(60),
    extraCommissionPercent:4, guestSegment:"ALL", minimumNights:1, maximumNights:null, status:"ACTIVE",
  });

  const basePercent = baseCommissionRate * 100;
  const totalPercent = basePercent + form.extraCommissionPercent;
  const boostStrength = Math.min(100, Math.round(form.extraCommissionPercent * 8 + Math.min(form.targetCountries.length, 10) * 2));
  const filteredCountries = COUNTRY_CODES.filter((code) => {
    const label = names.of(code) ?? code;
    return !query || code.toLowerCase().includes(query.toLowerCase()) || label.toLowerCase().includes(query.toLowerCase());
  }).slice(0, 36);

  function toggleCountry(code:string) {
    setForm((current) => ({...current, targetCountries: current.targetCountries.includes(code) ? current.targetCountries.filter((item) => item !== code) : [...current.targetCountries, code]}));
  }

  async function createCampaign() {
    if (!form.targetCountries.length) { setMessage(ar ? "اختر دولة واحدة على الأقل." : "Choose at least one target market."); return; }
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/visibility-boost`, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(form)});
      const payload = await response.json() as {data?:Campaign;error?:{message?:string}};
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Unable to create campaign");
      setCampaigns((items) => [payload.data!, ...items]);
      setMessage(ar ? "تم تشغيل حملة زيادة الظهور." : "Visibility Boost campaign is live.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create campaign"); }
    finally { setSaving(false); }
  }

  async function changeStatus(campaign:Campaign, status:CampaignStatus) {
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/visibility-boost/${encodeURIComponent(campaign.id)}`, {method:"PUT", headers:{"content-type":"application/json"}, body:JSON.stringify(formFromCampaign(campaign, status))});
      const payload = await response.json() as {data?:Campaign;error?:{message?:string}};
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Unable to update campaign");
      setCampaigns((items) => items.map((item) => item.id === campaign.id ? payload.data! : item));
      setMessage(status === "PAUSED" ? (ar ? "تم إيقاف الحملة مؤقتًا." : "Campaign paused.") : (ar ? "تم تشغيل الحملة." : "Campaign activated."));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update campaign"); }
    finally { setSaving(false); }
  }

  return <div className="boostWorkspace">
    <section className="boostHero">
      <div><span className="boostEyebrow"><Sparkles size={15}/>{ar ? "نمو قائم على الأداء" : "Performance-based growth"}</span><h2>{ar ? "ادفع أكثر فقط عندما تكسب أكثر." : "Contribute more only when you earn more."}</h2><p>{ar ? "لا ميزانية إعلانية ولا دفع مقدم. اختر الأسواق التي تريدها وارفع عمولة HandMeKey فقط على الحجوزات المؤهلة للحملة." : "No ad budget and no upfront spend. Pick the markets you want and increase HandMeKey commission only on bookings eligible for the campaign."}</p></div>
      <div className="boostHeroPromise"><ShieldCheck size={22}/><div><strong>{ar ? "الدفع مقابل الأداء" : "Pay for performance"}</strong><span>{ar ? "الزيادة تُطبق على الحجوزات المنسوبة للحملة، وليس كل حجوزات الفندق." : "The uplift applies to campaign-attributed bookings, not every hotel booking."}</span></div></div>
    </section>

    <div className="boostBuilderGrid">
      <section className="boostCard boostTargetCard">
        <div className="boostSectionHead"><div><span>01</span><div><h3>{ar ? "اختر الأسواق المستهدفة" : "Choose target markets"}</h3><p>{ar ? "اضغط على الخريطة أو ابحث عن أي دولة." : "Click the map or search for any country."}</p></div></div><strong>{form.targetCountries.length} {ar ? "سوق" : "markets"}</strong></div>
        <div className="boostPresetRow">{PRESETS.map((preset) => <button type="button" key={preset.key} onClick={() => setForm((current) => ({...current,targetCountries:[...preset.countries]}))}>{preset.key}</button>)}</div>
        <div className="worldTargetMap" aria-label="World targeting map">
          <svg viewBox="0 0 960 460" role="img" aria-label="Interactive world market map">
            <rect width="960" height="460" rx="24" className="mapOcean"/>
            <path className="mapLand" d="M90 92c65-55 166-52 223 4l-18 46-48 13-20 42-50 2-31 48-45-15-31-72z"/>
            <path className="mapLand" d="M246 252l62 12 35 52-22 103-45-24-16-68-38-31z"/>
            <path className="mapLand" d="M430 105l82-37 99 18 38 40-35 31-80-7-28 34-63-13-30-31z"/>
            <path className="mapLand" d="M493 184l74-9 51 43-13 113-43 64-47-23-18-76-38-48z"/>
            <path className="mapLand" d="M610 112l137-43 132 39 10 50-83 34-37 59-85-15-45-49-56-26z"/>
            <path className="mapLand" d="M770 325l84-20 55 39-18 62-72 17-59-43z"/>
            {MAP_MARKETS.map(([code,lat,lng]) => { const point=mapPoint(lat,lng); const selected=form.targetCountries.includes(code); return <g key={code} transform={`translate(${point.x} ${point.y})`} onClick={() => toggleCountry(code)} className={`mapMarket ${selected ? "selected" : ""}`} role="button" aria-label={names.of(code) ?? code}><circle r={selected ? 10 : 7}/><text y={-14} textAnchor="middle">{flag(code)}</text></g>; })}
          </svg>
          <div className="mapLegend"><Target size={15}/>{ar ? "النقاط الذهبية قابلة للاختيار · استخدم البحث لأي دولة أخرى" : "Gold points are selectable · use search for any other country"}</div>
        </div>
        <div className="countrySearch"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ar ? "ابحث عن دولة..." : "Search any country..."}/>{query && <button type="button" onClick={() => setQuery("")}><X size={15}/></button>}</div>
        <div className="countryPicker">{filteredCountries.map((code) => {const selected=form.targetCountries.includes(code);return <button type="button" key={code} className={selected ? "selected" : ""} onClick={() => toggleCountry(code)}><span>{flag(code)}</span><b>{names.of(code) ?? code}</b>{selected && <Check size={14}/>}</button>;})}</div>
        {!!form.targetCountries.length && <div className="selectedMarkets">{form.targetCountries.slice(0,14).map((code)=><button type="button" key={code} onClick={()=>toggleCountry(code)}>{flag(code)} {names.of(code) ?? code}<X size={12}/></button>)}{form.targetCountries.length>14&&<span>+{form.targetCountries.length-14}</span>}</div>}
      </section>

      <aside className="boostCommissionPanel">
        <div className="commissionSticky">
          <span className="boostEyebrow"><TrendingUp size={15}/>{ar ? "محاكي العمولة" : "Commission simulator"}</span>
          <div className="commissionNumbers"><div><span>{ar ? "الأساسية" : "Base"}</span><strong>{basePercent.toFixed(1)}%</strong></div><ChevronRight size={20}/><div className="boostPlus"><span>{ar ? "زيادة" : "Boost"}</span><strong>+{form.extraCommissionPercent.toFixed(1)}%</strong></div><ChevronRight size={20}/><div className="commissionTotal"><span>{ar ? "على حجز Boost" : "Boost booking"}</span><strong>{totalPercent.toFixed(1)}%</strong></div></div>
          <label className="boostRange"><span><b>{ar ? "العمولة الإضافية" : "Extra commission"}</b><strong>+{form.extraCommissionPercent.toFixed(1)}%</strong></span><input type="range" min="1" max="10" step="0.5" value={form.extraCommissionPercent} onChange={(event)=>setForm((current)=>({...current,extraCommissionPercent:Number(event.target.value)}))}/><div><small>+1%</small><small>+10%</small></div></label>
          <div className="boostStrength"><span><b>{ar ? "قوة الحملة" : "Boost strength"}</b><strong>{boostStrength}/100</strong></span><div><i style={{width:`${boostStrength}%`}}/></div><small>{ar ? "مؤشر تخطيطي مبني على نسبة الزيادة واتساع الاستهداف، وليس ضمانًا للترتيب أو الحجوزات." : "Planning signal based on commission uplift and targeting breadth; it is not a guarantee of ranking or bookings."}</small></div>
          <div className="noBudgetBox"><Globe2 size={20}/><div><strong>{ar ? "0 ميزانية مسبقة" : "0 upfront budget"}</strong><span>{ar ? "لا CPC، لا شحن رصيد، لا إنفاق يومي." : "No CPC, wallet top-up or daily ad spend."}</span></div></div>
        </div>
      </aside>
    </div>

    <section className="boostCard boostRulesCard">
      <div className="boostSectionHead"><div><span>02</span><div><h3>{ar ? "قواعد الحملة" : "Campaign rules"}</h3><p>{ar ? "حدد متى ومن تستهدف بدون تغيير سعر الغرفة." : "Control when and who to target without changing the room price."}</p></div></div></div>
      <div className="boostFormGrid">
        <label className="wide"><span>{ar ? "اسم الحملة" : "Campaign name"}</span><input value={form.name} onChange={(event)=>setForm((current)=>({...current,name:event.target.value}))}/></label>
        <label><span>{ar ? "بداية الحجز" : "Booking starts"}</span><input type="date" value={form.bookingStartsOn} onChange={(event)=>setForm((current)=>({...current,bookingStartsOn:event.target.value}))}/></label>
        <label><span>{ar ? "نهاية الحجز" : "Booking ends"}</span><input type="date" value={form.bookingEndsOn} onChange={(event)=>setForm((current)=>({...current,bookingEndsOn:event.target.value}))}/></label>
        <label><span>{ar ? "بداية الإقامة" : "Stay starts"}</span><input type="date" value={form.stayStartsOn} onChange={(event)=>setForm((current)=>({...current,stayStartsOn:event.target.value}))}/></label>
        <label><span>{ar ? "نهاية الإقامة" : "Stay ends"}</span><input type="date" value={form.stayEndsOn} onChange={(event)=>setForm((current)=>({...current,stayEndsOn:event.target.value}))}/></label>
        <label><span>{ar ? "نوع الضيف" : "Guest segment"}</span><select value={form.guestSegment} onChange={(event)=>setForm((current)=>({...current,guestSegment:event.target.value as GuestSegment}))}><option value="ALL">{ar?"جميع الضيوف":"All guests"}</option><option value="COUPLES">{ar?"أزواج":"Couples"}</option><option value="FAMILIES">{ar?"عائلات":"Families"}</option><option value="BUSINESS">{ar?"أعمال":"Business"}</option><option value="SOLO">{ar?"فردي":"Solo"}</option></select></label>
        <label><span>{ar ? "الحد الأدنى لليالي" : "Minimum nights"}</span><input type="number" min="1" max="30" value={form.minimumNights} onChange={(event)=>setForm((current)=>({...current,minimumNights:Number(event.target.value)}))}/></label>
        <label><span>{ar ? "الحد الأقصى لليالي" : "Maximum nights"}</span><input type="number" min="1" max="60" value={form.maximumNights ?? ""} placeholder={ar?"بدون حد":"No limit"} onChange={(event)=>setForm((current)=>({...current,maximumNights:event.target.value?Number(event.target.value):null}))}/></label>
      </div>
      <div className="boostLaunchBar"><div><strong>{ar ? `ستستهدف ${form.targetCountries.length} سوق بنسبة إجمالية ${totalPercent.toFixed(1)}% على حجوزات Boost.` : `Targeting ${form.targetCountries.length} markets at ${totalPercent.toFixed(1)}% total commission on Boost bookings.`}</strong><span>{ar ? "الأسعار العامة للفندق لا تتغير." : "Your public room prices do not change."}</span></div><button type="button" className="boostLaunchButton" disabled={saving} onClick={createCampaign}><Play size={17}/>{saving ? (ar?"جاري الحفظ...":"Saving...") : (ar?"تشغيل الحملة":"Launch campaign")}</button></div>
      {message && <div className="boostMessage">{message}</div>}
    </section>

    <section className="boostCampaigns">
      <div className="boostCampaignsHead"><div><span className="boostEyebrow">{ar?"الحملات":"Campaigns"}</span><h3>{ar?"حملات زيادة الظهور":"Visibility Boost campaigns"}</h3></div><span>{campaigns.length}</span></div>
      {campaigns.length === 0 ? <div className="boostEmpty"><Target size={28}/><strong>{ar?"لا توجد حملات بعد":"No campaigns yet"}</strong><span>{ar?"أنشئ أول حملة من الأعلى. لن نعرض أرقام أداء وهمية؛ البيانات تظهر بعد وجود traffic وحجوزات منسوبة فعليًا.":"Create your first campaign above. We do not show invented performance numbers; metrics appear only after real attributed traffic and bookings exist."}</span></div> : <div className="boostCampaignList">{campaigns.map((campaign)=><article key={campaign.id} className="boostCampaignRow"><div className={`boostStatus ${campaign.status.toLowerCase()}`}>{campaign.status}</div><div className="boostCampaignMain"><strong>{campaign.name}</strong><span>{campaign.targetCountries.slice(0,5).map(flag).join(" ")} {campaign.targetCountries.length>5?`+${campaign.targetCountries.length-5}`:""} · {campaign.stayStartsOn} → {campaign.stayEndsOn}</span></div><div className="boostCampaignCommission"><span>{ar?"عمولة Boost":"Boost commission"}</span><strong>{(campaign.totalCommissionRate*100).toFixed(1)}%</strong><small>+{campaign.extraCommissionPercent.toFixed(1)}%</small></div><button type="button" disabled={saving || campaign.status === "FINISHED"} onClick={()=>changeStatus(campaign,campaign.status==="ACTIVE"?"PAUSED":"ACTIVE")}>{campaign.status==="ACTIVE"?<><Pause size={15}/>{ar?"إيقاف":"Pause"}</>:<><Play size={15}/>{ar?"تشغيل":"Activate"}</>}</button></article>)}</div>}
    </section>
  </div>;
}
