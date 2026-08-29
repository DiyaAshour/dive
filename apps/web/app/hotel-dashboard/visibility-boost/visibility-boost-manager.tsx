"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, Globe2, Info, Pause, Percent, Play, Search, ShieldCheck, Users, X } from "lucide-react";
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

const MARKET_GROUPS: Array<Readonly<{key:string; countries:string[]}>> = [
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
    name: ar ? "حملة زيادة الظهور" : "Visibility Boost campaign",
    targetCountries:["SA","AE"],
    bookingStartsOn:isoDate(0),
    bookingEndsOn:isoDate(30),
    stayStartsOn:isoDate(1),
    stayEndsOn:isoDate(60),
    extraCommissionPercent:4,
    guestSegment:"ALL",
    minimumNights:1,
    maximumNights:null,
    status:"ACTIVE",
  });

  const basePercent = baseCommissionRate * 100;
  const totalPercent = basePercent + form.extraCommissionPercent;
  const filteredCountries = COUNTRY_CODES.filter((code) => {
    const label = names.of(code) ?? code;
    return !query || code.toLowerCase().includes(query.toLowerCase()) || label.toLowerCase().includes(query.toLowerCase());
  });

  function toggleCountry(code:string) {
    setForm((current) => ({...current, targetCountries: current.targetCountries.includes(code) ? current.targetCountries.filter((item) => item !== code) : [...current.targetCountries, code]}));
  }

  async function createCampaign() {
    if (!form.targetCountries.length) {
      setMessage(ar ? "اختر سوقًا واحدًا على الأقل." : "Choose at least one target market.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/visibility-boost`, {
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(form),
      });
      const payload = await response.json() as {data?:Campaign;error?:{message?:string}};
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Unable to create campaign");
      setCampaigns((items) => [payload.data!, ...items]);
      setMessage(ar ? "تم تشغيل الحملة بنجاح." : "Campaign launched successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create campaign");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(campaign:Campaign, status:CampaignStatus) {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/hotels/${encodeURIComponent(hotelId)}/visibility-boost/${encodeURIComponent(campaign.id)}`, {
        method:"PUT",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(formFromCampaign(campaign, status)),
      });
      const payload = await response.json() as {data?:Campaign;error?:{message?:string}};
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Unable to update campaign");
      setCampaigns((items) => items.map((item) => item.id === campaign.id ? payload.data! : item));
      setMessage(status === "PAUSED" ? (ar ? "تم إيقاف الحملة مؤقتًا." : "Campaign paused.") : (ar ? "تم تشغيل الحملة." : "Campaign activated."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update campaign");
    } finally {
      setSaving(false);
    }
  }

  const segmentLabel = (segment:GuestSegment) => ({
    ALL: ar ? "جميع الضيوف" : "All guests",
    COUPLES: ar ? "أزواج" : "Couples",
    FAMILIES: ar ? "عائلات" : "Families",
    BUSINESS: ar ? "أعمال" : "Business",
    SOLO: ar ? "فردي" : "Solo",
  })[segment];

  return <div className="boostWorkspace">
    <section className="boostIntro">
      <div>
        <span className="boostKicker">{ar ? "أداة توزيع مدفوعة بالأداء" : "Performance-based distribution"}</span>
        <h2>{ar ? "ارفع ظهور فندقك في الأسواق التي تهمك" : "Increase visibility in the markets that matter"}</h2>
        <p>{ar ? "تطبق العمولة الإضافية فقط على الحجوزات المؤهلة والمنسوبة للحملة. لا يوجد إنفاق يومي أو ميزانية إعلانية مسبقة." : "Extra commission applies only to eligible bookings attributed to the campaign. There is no daily ad spend or prepaid budget."}</p>
      </div>
      <div className="boostPolicyNote"><ShieldCheck size={20}/><div><strong>{ar ? "نموذج الدفع" : "Commercial model"}</strong><span>{ar ? "عمولة إضافية على الحجوزات المنسوبة فقط" : "Incremental commission on attributed bookings only"}</span></div></div>
    </section>

    <section className="boostTermsStrip" aria-label={ar ? "الشروط التجارية" : "Commercial terms"}>
      <div><span>{ar ? "العمولة الأساسية" : "Base commission"}</span><strong>{basePercent.toFixed(1)}%</strong></div>
      <div><span>{ar ? "الزيادة المختارة" : "Selected uplift"}</span><strong>+{form.extraCommissionPercent.toFixed(1)}%</strong></div>
      <div><span>{ar ? "إجمالي عمولة الحجز المؤهل" : "Total on eligible booking"}</span><strong>{totalPercent.toFixed(1)}%</strong></div>
      <div><span>{ar ? "طريقة التحصيل" : "Charging basis"}</span><strong>{ar ? "حجز منسوب فقط" : "Attributed booking only"}</strong></div>
    </section>

    <div className="boostCommercialGrid">
      <section className="boostPanel boostMarketsPanel">
        <div className="boostPanelHead">
          <div><Globe2 size={19}/><div><h3>{ar ? "الأسواق المستهدفة" : "Target markets"}</h3><p>{ar ? "اختر البلدان التي تريد زيادة ظهور الفندق للباحثين القادمين منها." : "Choose the traveler source markets where you want additional visibility."}</p></div></div>
          <span className="boostCount">{form.targetCountries.length} {ar ? "محدد" : "selected"}</span>
        </div>

        <div className="boostMarketGroups">{MARKET_GROUPS.map((group) => <button type="button" key={group.key} onClick={() => setForm((current) => ({...current,targetCountries:[...group.countries]}))}>{group.key}</button>)}<button type="button" onClick={() => setForm((current)=>({...current,targetCountries:[]}))}>{ar ? "مسح" : "Clear"}</button></div>

        {!!form.targetCountries.length && <div className="boostSelectedMarkets">{form.targetCountries.slice(0,12).map((code)=><button type="button" key={code} onClick={()=>toggleCountry(code)}>{flag(code)} {names.of(code) ?? code}<X size={12}/></button>)}{form.targetCountries.length>12&&<span>+{form.targetCountries.length-12}</span>}</div>}

        <div className="boostCountrySearch"><Search size={17}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={ar ? "ابحث باسم الدولة أو الرمز" : "Search country or code"}/>{query&&<button type="button" onClick={()=>setQuery("")}><X size={15}/></button>}</div>

        <div className="boostCountryTable" role="list">
          {filteredCountries.map((code)=>{
            const selected=form.targetCountries.includes(code);
            return <button type="button" role="listitem" key={code} className={selected?"selected":""} onClick={()=>toggleCountry(code)}>
              <span className="boostCountryIdentity"><span className="boostFlag">{flag(code)}</span><span><strong>{names.of(code) ?? code}</strong><small>{code}</small></span></span>
              <span className="boostCheck">{selected?<Check size={14}/>:null}</span>
            </button>;
          })}
        </div>
      </section>

      <aside className="boostPanel boostCommissionPanel">
        <div className="boostPanelHead compact"><div><Percent size={19}/><div><h3>{ar ? "العمولة الإضافية" : "Commission uplift"}</h3><p>{ar ? "حدد الزيادة التي تقبل دفعها للحجوزات المؤهلة." : "Set the additional commission for eligible bookings."}</p></div></div></div>

        <div className="boostCommissionSummary">
          <div><span>{ar ? "الأساسية" : "Base"}</span><strong>{basePercent.toFixed(1)}%</strong></div>
          <div><span>{ar ? "إضافية" : "Uplift"}</span><strong>+{form.extraCommissionPercent.toFixed(1)}%</strong></div>
          <div className="total"><span>{ar ? "الإجمالي" : "Total"}</span><strong>{totalPercent.toFixed(1)}%</strong></div>
        </div>

        <label className="boostCommissionControl">
          <span><b>{ar ? "زيادة العمولة" : "Additional commission"}</b><strong>+{form.extraCommissionPercent.toFixed(1)}%</strong></span>
          <input type="range" min="1" max="10" step="0.5" value={form.extraCommissionPercent} onChange={(event)=>setForm((current)=>({...current,extraCommissionPercent:Number(event.target.value)}))}/>
          <div><small>+1%</small><small>+10%</small></div>
        </label>

        <div className="boostCommercialNotice"><Info size={18}/><p>{ar ? "رفع العمولة قد يزيد فرصة الظهور في النتائج الموصى بها، لكنه لا يضمن ترتيبًا محددًا. الملاءمة والجودة والتوفر تظل عوامل ترتيب أساسية." : "A higher commission may increase visibility in recommended results, but it does not guarantee a fixed position. Relevance, quality and availability remain core ranking factors."}</p></div>
      </aside>
    </div>

    <section className="boostPanel boostRulesPanel">
      <div className="boostPanelHead"><div><CalendarDays size={19}/><div><h3>{ar ? "إعدادات الحملة" : "Campaign settings"}</h3><p>{ar ? "حدد فترة الحجز والإقامة ونوع الضيف وشروط مدة الإقامة." : "Define booking and stay windows, traveler segment and length-of-stay rules."}</p></div></div></div>
      <div className="boostFormGrid">
        <label className="wide"><span>{ar ? "اسم الحملة" : "Campaign name"}</span><input value={form.name} onChange={(event)=>setForm((current)=>({...current,name:event.target.value}))}/></label>
        <label><span>{ar ? "بداية الحجز" : "Booking starts"}</span><input type="date" value={form.bookingStartsOn} onChange={(event)=>setForm((current)=>({...current,bookingStartsOn:event.target.value}))}/></label>
        <label><span>{ar ? "نهاية الحجز" : "Booking ends"}</span><input type="date" value={form.bookingEndsOn} onChange={(event)=>setForm((current)=>({...current,bookingEndsOn:event.target.value}))}/></label>
        <label><span>{ar ? "بداية الإقامة" : "Stay starts"}</span><input type="date" value={form.stayStartsOn} onChange={(event)=>setForm((current)=>({...current,stayStartsOn:event.target.value}))}/></label>
        <label><span>{ar ? "نهاية الإقامة" : "Stay ends"}</span><input type="date" value={form.stayEndsOn} onChange={(event)=>setForm((current)=>({...current,stayEndsOn:event.target.value}))}/></label>
        <label><span>{ar ? "نوع الضيف" : "Guest segment"}</span><select value={form.guestSegment} onChange={(event)=>setForm((current)=>({...current,guestSegment:event.target.value as GuestSegment}))}><option value="ALL">{segmentLabel("ALL")}</option><option value="COUPLES">{segmentLabel("COUPLES")}</option><option value="FAMILIES">{segmentLabel("FAMILIES")}</option><option value="BUSINESS">{segmentLabel("BUSINESS")}</option><option value="SOLO">{segmentLabel("SOLO")}</option></select></label>
        <label><span>{ar ? "الحد الأدنى لليالي" : "Minimum nights"}</span><input type="number" min="1" max="30" value={form.minimumNights} onChange={(event)=>setForm((current)=>({...current,minimumNights:Number(event.target.value)}))}/></label>
        <label><span>{ar ? "الحد الأقصى لليالي" : "Maximum nights"}</span><input type="number" min="1" max="60" value={form.maximumNights ?? ""} placeholder={ar?"بدون حد":"No limit"} onChange={(event)=>setForm((current)=>({...current,maximumNights:event.target.value?Number(event.target.value):null}))}/></label>
      </div>
    </section>

    <section className="boostReviewBar">
      <div className="boostReviewFacts">
        <div><Globe2 size={16}/><span>{ar ? "الأسواق" : "Markets"}<strong>{form.targetCountries.length}</strong></span></div>
        <div><Percent size={16}/><span>{ar ? "العمولة الإجمالية" : "Total commission"}<strong>{totalPercent.toFixed(1)}%</strong></span></div>
        <div><Users size={16}/><span>{ar ? "الضيوف" : "Guests"}<strong>{segmentLabel(form.guestSegment)}</strong></span></div>
        <div><CalendarDays size={16}/><span>{ar ? "الإقامة" : "Stay window"}<strong>{form.stayStartsOn} → {form.stayEndsOn}</strong></span></div>
      </div>
      <button type="button" className="boostLaunchButton" disabled={saving} onClick={createCampaign}><Play size={16}/>{saving ? (ar?"جاري الحفظ...":"Saving...") : (ar?"تشغيل الحملة":"Launch campaign")}</button>
    </section>
    {message && <div className="boostMessage">{message}</div>}

    <section className="boostPanel boostCampaignsPanel">
      <div className="boostPanelHead"><div><div><h3>{ar?"الحملات":"Campaigns"}</h3><p>{ar?"الحملات الحالية والسابقة وشروطها التجارية.":"Current and previous campaigns with their commercial terms."}</p></div></div><span className="boostCount">{campaigns.length}</span></div>
      {campaigns.length===0 ? <div className="boostEmpty"><strong>{ar?"لا توجد حملات حتى الآن":"No campaigns yet"}</strong><span>{ar?"أنشئ أول حملة من الإعدادات أعلاه. لن تظهر مقاييس أداء حتى تتوفر زيارات وحجوزات منسوبة فعليًا.":"Create your first campaign above. Performance metrics will appear only after real attributed traffic and bookings exist."}</span></div> : <div className="boostCampaignTableWrap"><table className="boostCampaignTable"><thead><tr><th>{ar?"الحملة":"Campaign"}</th><th>{ar?"الحالة":"Status"}</th><th>{ar?"الأسواق":"Markets"}</th><th>{ar?"فترة الإقامة":"Stay window"}</th><th>{ar?"إضافية":"Uplift"}</th><th>{ar?"الإجمالي":"Total"}</th><th>{ar?"إجراء":"Action"}</th></tr></thead><tbody>{campaigns.map((campaign)=><tr key={campaign.id}><td><strong>{campaign.name}</strong><small>{segmentLabel(campaign.guestSegment)}</small></td><td><span className={`boostStatus ${campaign.status.toLowerCase()}`}>{campaign.status}</span></td><td><span className="boostMarketCell">{campaign.targetCountries.slice(0,4).map(flag).join(" ")}{campaign.targetCountries.length>4?` +${campaign.targetCountries.length-4}`:""}</span></td><td><span>{campaign.stayStartsOn}</span><small>{campaign.stayEndsOn}</small></td><td><strong>+{campaign.extraCommissionPercent.toFixed(1)}%</strong></td><td><strong>{(campaign.totalCommissionRate*100).toFixed(1)}%</strong></td><td><button type="button" className="boostRowAction" disabled={saving||campaign.status==="FINISHED"} onClick={()=>changeStatus(campaign,campaign.status==="ACTIVE"?"PAUSED":"ACTIVE")}>{campaign.status==="ACTIVE"?<><Pause size={14}/>{ar?"إيقاف":"Pause"}</>:<><Play size={14}/>{ar?"تشغيل":"Activate"}</>}</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
