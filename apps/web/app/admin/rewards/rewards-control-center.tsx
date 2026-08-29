"use client";

import {useMemo, useState} from "react";
import {Ban, CheckCircle2, Coins, Gem, RefreshCcw, Search, ShieldCheck, WalletCards} from "lucide-react";
import type {Locale} from "@/lib/i18n";

type Tier = "MEMBER" | "GOLD" | "BLACK";
type MembershipStatus = "ACTIVE" | "SUSPENDED";
type Program = {
  enabled:boolean; earningEnabled:boolean; redemptionEnabled:boolean; eligibleCurrency:string;
  memberPointsPerJod:number; goldMinimumNights:number; goldPointsPerJod:number;
  blackMinimumNights:number; blackPointsPerJod:number; walletPointsPerJod:number;
  minimumRedemptionPoints:number; redemptionStepPoints:number; updatedByUserId:string|null; updatedAt:string;
};
type MemberListItem = {
  userId:string; displayName:string; email:string; platformRole:string; createdAt:string;
  status:MembershipStatus; tier:Tier; tierOverride:Tier|null; pointsBalance:number;
  lifetimePointsEarned:number; qualifyingNights:number; qualifyingStays:number;
  walletBalance:number; walletCurrency:string;
};
type LedgerEntry = {
  id:string; bookingId:string|null; type:string; points:number; currency:string|null;
  eligibleAmount:number|null; pointsPerUnit:number|null; tierAtPosting:Tier; description:string; createdAt:string;
};
type MemberDetail = MemberListItem & {ledger:LedgerEntry[]};
type Dashboard = {
  program:Program;
  summary:{accounts:number;active:number;suspended:number;pointsOutstanding:number;lifetimePointsEarned:number};
  members:MemberListItem[];
  selectedMember:MemberDetail|null;
};
type Props = {locale:Locale;initialDashboard:Dashboard};

type ApiPayload<T> = {data:T|null;error:{message?:string}|null};

export default function RewardsControlCenter({locale, initialDashboard}:Props) {
  const ar = locale === "ar";
  const [dashboard,setDashboard] = useState(initialDashboard);
  const [program,setProgram] = useState(initialDashboard.program);
  const [selected,setSelected] = useState(initialDashboard.selectedMember);
  const [search,setSearch] = useState("");
  const [busy,setBusy] = useState<string|null>(null);
  const [notice,setNotice] = useState<{kind:"ok"|"error";text:string}|null>(null);
  const [adjustMode,setAdjustMode] = useState<"ADD"|"REMOVE"|"SET">("ADD");
  const [adjustPoints,setAdjustPoints] = useState(0);
  const [adjustReason,setAdjustReason] = useState("");
  const [memberReason,setMemberReason] = useState("");
  const [memberStatus,setMemberStatus] = useState<MembershipStatus>(selected?.status ?? "ACTIVE");
  const [tierOverride,setTierOverride] = useState<Tier|"AUTO">(selected?.tierOverride ?? "AUTO");
  const [qualifyingNights,setQualifyingNights] = useState(selected?.qualifyingNights ?? 0);
  const [qualifyingStays,setQualifyingStays] = useState(selected?.qualifyingStays ?? 0);

  const selectedTierLabel = selected ? tierLabel(selected.tier) : "—";
  const pointValue = useMemo(() => program.walletPointsPerJod > 0 ? selected?.pointsBalance ? selected.pointsBalance / program.walletPointsPerJod : 0 : 0, [selected?.pointsBalance,program.walletPointsPerJod]);

  async function saveProgram() {
    setBusy("program"); setNotice(null);
    try {
      const next = await requestJson<Program>("/api/v1/admin/rewards", {method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(stripProgramMeta(program))});
      setProgram({...next,updatedAt:new Date(next.updatedAt).toISOString()});
      setDashboard((current)=>({...current,program:{...next,updatedAt:new Date(next.updatedAt).toISOString()}}));
      setNotice({kind:"ok",text:ar?"تم حفظ قواعد Rewards وتطبيقها على العمليات الجديدة.":"Rewards rules saved and applied to new activity."});
    } catch (error) { setNotice({kind:"error",text:errorMessage(error,ar)}); }
    finally { setBusy(null); }
  }

  async function loadDashboard(nextSearch = search, userId?:string) {
    setBusy("search"); setNotice(null);
    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search",nextSearch.trim());
      if (userId) params.set("userId",userId);
      const next = await requestJson<Dashboard>(`/api/v1/admin/rewards?${params.toString()}`);
      setDashboard(next);
      setProgram(next.program);
      if (next.selectedMember) selectLocalMember(next.selectedMember);
      else { setSelected(null); }
    } catch (error) { setNotice({kind:"error",text:errorMessage(error,ar)}); }
    finally { setBusy(null); }
  }

  async function chooseMember(userId:string) {
    setBusy("member-load");
    try {
      const params = new URLSearchParams({userId});
      if (search.trim()) params.set("search",search.trim());
      const next = await requestJson<Dashboard>(`/api/v1/admin/rewards?${params.toString()}`);
      setDashboard(next); setProgram(next.program);
      if (next.selectedMember) selectLocalMember(next.selectedMember);
    } catch (error) { setNotice({kind:"error",text:errorMessage(error,ar)}); }
    finally { setBusy(null); }
  }

  function selectLocalMember(member:MemberDetail) {
    setSelected(member);
    setMemberStatus(member.status);
    setTierOverride(member.tierOverride ?? "AUTO");
    setQualifyingNights(member.qualifyingNights);
    setQualifyingStays(member.qualifyingStays);
    setMemberReason(""); setAdjustReason(""); setAdjustPoints(0);
  }

  async function saveMember() {
    if (!selected) return;
    setBusy("member"); setNotice(null);
    try {
      const member = await requestJson<MemberDetail>(`/api/v1/admin/rewards/users/${selected.userId}`, {
        method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({
          status:memberStatus,
          tierOverride:tierOverride === "AUTO" ? null : tierOverride,
          qualifyingNights,
          qualifyingStays,
          reason:memberReason,
        }),
      });
      applyMember(member);
      setMemberReason("");
      setNotice({kind:"ok",text:ar?"تم تحديث عضوية المستخدم وتسجيل السبب في سجل التدقيق.":"Membership updated and the reason was written to the audit log."});
    } catch (error) { setNotice({kind:"error",text:errorMessage(error,ar)}); }
    finally { setBusy(null); }
  }

  async function adjustBalance() {
    if (!selected) return;
    setBusy("points"); setNotice(null);
    try {
      const member = await requestJson<MemberDetail>(`/api/v1/admin/rewards/users/${selected.userId}/points`, {
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:adjustMode,points:adjustPoints,reason:adjustReason}),
      });
      applyMember(member);
      setAdjustReason(""); setAdjustPoints(0);
      setNotice({kind:"ok",text:ar?"تم تعديل رصيد النقاط وإضافة حركة Adjustment إلى دفتر النقاط.":"Points balance updated and an Adjustment entry was added to the ledger."});
    } catch (error) { setNotice({kind:"error",text:errorMessage(error,ar)}); }
    finally { setBusy(null); }
  }

  function applyMember(member:MemberDetail) {
    selectLocalMember(member);
    setDashboard((current)=>({
      ...current,
      members:current.members.map((item)=>item.userId === member.userId ? {...item,...member} : item),
      selectedMember:member,
    }));
  }

  return <div className="rewardsAdminWorkspace">
    {notice && <div className={`rewardsAdminNotice ${notice.kind}`}>{notice.kind === "ok" ? <CheckCircle2 size={16}/> : <Ban size={16}/>}<span>{notice.text}</span></div>}

    <div className="rewardsAdminKpis">
      <article><span><Gem size={16}/>{ar?"عضويات Rewards":"Rewards accounts"}</span><strong>{dashboard.summary.accounts.toLocaleString()}</strong><small>{ar?"حساب Rewards مُنشأ":"created Rewards accounts"}</small></article>
      <article><span><CheckCircle2 size={16}/>{ar?"نشطة":"Active"}</span><strong>{dashboard.summary.active.toLocaleString()}</strong><small>{ar?"يمكنها الكسب والاستبدال وفق القواعد":"eligible under current rules"}</small></article>
      <article><span><Ban size={16}/>{ar?"موقوفة":"Suspended"}</span><strong>{dashboard.summary.suspended.toLocaleString()}</strong><small>{ar?"لا تكسب ولا تحول النقاط":"earning and redemption blocked"}</small></article>
      <article><span><Coins size={16}/>{ar?"نقاط متداولة":"Points outstanding"}</span><strong>{dashboard.summary.pointsOutstanding.toLocaleString()}</strong><small>{ar?"الرصيد الحالي لجميع الأعضاء":"current member balances"}</small></article>
      <article><span><WalletCards size={16}/>{ar?"قيمة تقريبية":"Approx. wallet value"}</span><strong>{(dashboard.summary.pointsOutstanding/Math.max(1,program.walletPointsPerJod)).toFixed(2)} JOD</strong><small>{ar?"حسب قاعدة التحويل الحالية":"at the current conversion rate"}</small></article>
    </div>

    <section className="adminPanel rewardsProgramPanel">
      <div className="rewardsAdminPanelHead"><div><span className="eyebrow">{ar?"إعدادات البرنامج":"PROGRAM RULES"}</span><h3>{ar?"تحكم بالقواعد العامة":"Global Rewards rules"}</h3><p>{ar?"أي تعديل هنا يؤثر على الكسب والاستبدال الجديد. الحركات السابقة تبقى محفوظة كما هي في الدفتر.":"Changes affect new earning and redemption. Historical ledger entries remain immutable."}</p></div><ShieldCheck size={22}/></div>

      <div className="rewardsAdminSwitches">
        <Toggle checked={program.enabled} onChange={(value)=>setProgram({...program,enabled:value})} label={ar?"تشغيل برنامج Rewards":"Rewards program enabled"} note={ar?"المفتاح الرئيسي للبرنامج":"Master program switch"}/>
        <Toggle checked={program.earningEnabled} onChange={(value)=>setProgram({...program,earningEnabled:value})} label={ar?"السماح بكسب النقاط":"Allow point earning"} note={ar?"إيقاف نشر نقاط الإقامات الجديدة":"Pause new stay earnings"}/>
        <Toggle checked={program.redemptionEnabled} onChange={(value)=>setProgram({...program,redemptionEnabled:value})} label={ar?"السماح بتحويل النقاط":"Allow redemption"} note={ar?"تحويل Rewards إلى Wallet":"Rewards to Wallet conversion"}/>
      </div>

      <div className="rewardsProgramGrid">
        <NumberField label={ar?"نقاط Member لكل 1 د.أ":"Member points / JOD"} value={program.memberPointsPerJod} min={1} onChange={(value)=>setProgram({...program,memberPointsPerJod:value})}/>
        <NumberField label={ar?"Gold يبدأ بعد عدد ليالٍ":"Gold minimum nights"} value={program.goldMinimumNights} min={1} onChange={(value)=>setProgram({...program,goldMinimumNights:value})}/>
        <NumberField label={ar?"نقاط Gold لكل 1 د.أ":"Gold points / JOD"} value={program.goldPointsPerJod} min={1} onChange={(value)=>setProgram({...program,goldPointsPerJod:value})}/>
        <NumberField label={ar?"Black يبدأ بعد عدد ليالٍ":"Black minimum nights"} value={program.blackMinimumNights} min={2} onChange={(value)=>setProgram({...program,blackMinimumNights:value})}/>
        <NumberField label={ar?"نقاط Black لكل 1 د.أ":"Black points / JOD"} value={program.blackPointsPerJod} min={1} onChange={(value)=>setProgram({...program,blackPointsPerJod:value})}/>
        <label className="rewardsAdminField"><span>{ar?"عملة الإقامات المؤهلة":"Eligible stay currency"}</span><input maxLength={3} value={program.eligibleCurrency} onChange={(event)=>setProgram({...program,eligibleCurrency:event.target.value.toUpperCase()})}/></label>
      </div>

      <div className="rewardsWalletRuleBlock">
        <div><WalletCards size={20}/><span><strong>{ar?"قواعد التحويل إلى HandMeKey Wallet":"HandMeKey Wallet conversion"}</strong><small>{ar?"حدد قيمة النقاط والحد الأدنى وخطوة الاستبدال":"Control conversion value, minimum and redemption step"}</small></span></div>
        <div className="rewardsProgramGrid three">
          <NumberField label={ar?"نقاط مقابل 1 د.أ":"Points per JOD credit"} value={program.walletPointsPerJod} min={1} onChange={(value)=>setProgram({...program,walletPointsPerJod:value})}/>
          <NumberField label={ar?"الحد الأدنى للاستبدال":"Minimum redemption points"} value={program.minimumRedemptionPoints} min={1} onChange={(value)=>setProgram({...program,minimumRedemptionPoints:value})}/>
          <NumberField label={ar?"خطوة الاستبدال":"Redemption step"} value={program.redemptionStepPoints} min={1} onChange={(value)=>setProgram({...program,redemptionStepPoints:value})}/>
        </div>
      </div>
      <div className="rewardsAdminActions"><span>{ar?`آخر تحديث: ${formatDate(program.updatedAt,locale)}`:`Last updated: ${formatDate(program.updatedAt,locale)}`}</span><button className="primaryButton" disabled={busy!==null} onClick={saveProgram}>{busy==="program"?<RefreshCcw className="spin" size={15}/>:<ShieldCheck size={15}/>} {ar?"حفظ قواعد Rewards":"Save Rewards rules"}</button></div>
    </section>

    <section className="adminPanel rewardsMembersPanel">
      <div className="rewardsAdminPanelHead"><div><span className="eyebrow">{ar?"إدارة الأعضاء":"MEMBER CONTROL"}</span><h3>{ar?"تحكم بكل مستخدم بشكل منفصل":"Manage every member individually"}</h3><p>{ar?"ابحث بالاسم أو البريد، ثم عدّل العضوية والمستوى والتقدم ورصيد النقاط.":"Search by name or email, then edit membership, tier, progress and points balance."}</p></div></div>
      <form className="rewardsAdminSearch" onSubmit={(event)=>{event.preventDefault();void loadDashboard(search);}}><Search size={17}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder={ar?"اسم المستخدم أو البريد الإلكتروني":"Member name or email"}/><button className="secondaryButton" disabled={busy!==null}>{ar?"بحث":"Search"}</button></form>

      <div className="rewardsMemberWorkspace">
        <div className="rewardsMemberList">
          {dashboard.members.length ? dashboard.members.map((member)=><button type="button" key={member.userId} className={`rewardsMemberButton ${selected?.userId===member.userId?"active":""}`} onClick={()=>void chooseMember(member.userId)}>
            <span className="rewardsMemberAvatar">{initials(member.displayName)}</span><span><strong>{member.displayName}</strong><small>{member.email}</small><em>{tierLabel(member.tier)} · {member.pointsBalance.toLocaleString()} {ar?"نقطة":"pts"}</em></span><b className={member.status==="ACTIVE"?"ok":"danger"}>{member.status==="ACTIVE"?(ar?"نشطة":"Active"):(ar?"موقوفة":"Suspended")}</b>
          </button>) : <div className="rewardsAdminEmpty">{ar?"لا توجد نتائج مطابقة.":"No matching users."}</div>}
        </div>

        <div className="rewardsMemberDetail">
          {!selected ? <div className="rewardsAdminEmpty">{ar?"اختر مستخدمًا لإدارة Rewards.":"Select a user to manage Rewards."}</div> : <>
            <div className="rewardsMemberHero">
              <div className="rewardsMemberAvatar large">{initials(selected.displayName)}</div>
              <div><span className="eyebrow">{selected.platformRole}</span><h3>{selected.displayName}</h3><p>{selected.email}</p></div>
              <div className="rewardsMemberTier"><span>{ar?"المستوى الحالي":"Current tier"}</span><strong>{selectedTierLabel}</strong><small>{selected.tierOverride ? (ar?"تعيين إداري يدوي":"Admin override") : (ar?"محسوب تلقائيًا":"Automatic")}</small></div>
            </div>
            <div className="rewardsMemberStats">
              <div><span>{ar?"رصيد النقاط":"Points balance"}</span><strong>{selected.pointsBalance.toLocaleString()}</strong></div>
              <div><span>{ar?"إجمالي المكتسب":"Lifetime earned"}</span><strong>{selected.lifetimePointsEarned.toLocaleString()}</strong></div>
              <div><span>{ar?"ليالٍ مؤهلة":"Qualifying nights"}</span><strong>{selected.qualifyingNights.toLocaleString()}</strong></div>
              <div><span>{ar?"إقامات مؤهلة":"Qualifying stays"}</span><strong>{selected.qualifyingStays.toLocaleString()}</strong></div>
              <div><span>{ar?"رصيد Wallet":"Wallet balance"}</span><strong>{selected.walletBalance.toFixed(2)} {selected.walletCurrency}</strong></div>
              <div><span>{ar?"قيمة النقاط الحالية":"Current point value"}</span><strong>{pointValue.toFixed(2)} JOD</strong></div>
            </div>

            <div className="rewardsAdminControlColumns">
              <div className="rewardsControlCard">
                <div><span className="eyebrow">{ar?"النقاط":"POINTS"}</span><h4>{ar?"زيادة، تقليل أو تعيين الرصيد":"Add, remove or set balance"}</h4></div>
                <div className="rewardsModeTabs">{(["ADD","REMOVE","SET"] as const).map((mode)=><button type="button" key={mode} className={adjustMode===mode?"active":""} onClick={()=>setAdjustMode(mode)}>{modeLabel(mode,ar)}</button>)}</div>
                <NumberField label={adjustMode==="SET"?(ar?"الرصيد الجديد":"New balance"):(ar?"عدد النقاط":"Points amount")} value={adjustPoints} min={0} onChange={setAdjustPoints}/>
                <label className="rewardsAdminField"><span>{ar?"سبب التعديل (إجباري)":"Reason (required)"}</span><textarea value={adjustReason} onChange={(event)=>setAdjustReason(event.target.value)} placeholder={ar?"مثال: تعويض خدمة، تصحيح رصيد...":"Example: service recovery, balance correction..."}/></label>
                <button className="primaryButton" disabled={busy!==null||adjustReason.trim().length<3} onClick={()=>void adjustBalance()}><Coins size={15}/>{busy==="points"?(ar?"جارٍ الحفظ...":"Saving..."):(ar?"تنفيذ تعديل النقاط":"Apply points adjustment")}</button>
              </div>

              <div className="rewardsControlCard">
                <div><span className="eyebrow">{ar?"العضوية":"MEMBERSHIP"}</span><h4>{ar?"الحالة والمستوى والتقدم":"Status, tier and progress"}</h4></div>
                <label className="rewardsAdminField"><span>{ar?"حالة عضوية Rewards":"Rewards membership status"}</span><select value={memberStatus} onChange={(event)=>setMemberStatus(event.target.value as MembershipStatus)}><option value="ACTIVE">{ar?"نشطة":"Active"}</option><option value="SUSPENDED">{ar?"موقوفة":"Suspended"}</option></select></label>
                <label className="rewardsAdminField"><span>{ar?"تعيين المستوى":"Tier control"}</span><select value={tierOverride} onChange={(event)=>setTierOverride(event.target.value as Tier|"AUTO")}><option value="AUTO">{ar?"تلقائي حسب الليالي":"Automatic by nights"}</option><option value="MEMBER">Member</option><option value="GOLD">Key Gold</option><option value="BLACK">Key Black</option></select></label>
                <div className="rewardsMiniGrid"><NumberField label={ar?"الليالي المؤهلة":"Qualifying nights"} value={qualifyingNights} min={0} onChange={setQualifyingNights}/><NumberField label={ar?"الإقامات المؤهلة":"Qualifying stays"} value={qualifyingStays} min={0} onChange={setQualifyingStays}/></div>
                <label className="rewardsAdminField"><span>{ar?"سبب التعديل (إجباري)":"Reason (required)"}</span><textarea value={memberReason} onChange={(event)=>setMemberReason(event.target.value)} placeholder={ar?"اكتب سبب تغيير العضوية أو المستوى":"Explain the membership or tier change"}/></label>
                <button className="secondaryButton rewardsMembershipSave" disabled={busy!==null||memberReason.trim().length<3} onClick={()=>void saveMember()}><ShieldCheck size={15}/>{busy==="member"?(ar?"جارٍ الحفظ...":"Saving..."):(ar?"حفظ العضوية":"Save membership")}</button>
              </div>
            </div>

            <div className="rewardsLedgerBlock">
              <div className="rewardsAdminPanelHead compact"><div><span className="eyebrow">{ar?"دفتر النقاط":"POINTS LEDGER"}</span><h4>{ar?"سجل الحركات الأخير":"Recent point activity"}</h4></div><span>{selected.ledger.length} {ar?"حركة":"entries"}</span></div>
              <div className="rewardsLedgerList">{selected.ledger.length ? selected.ledger.map((entry)=><article key={entry.id}><span className={`rewardsLedgerDelta ${entry.points>=0?"positive":"negative"}`}>{entry.points>=0?"+":""}{entry.points.toLocaleString()}</span><div><strong>{entry.description}</strong><span>{entry.type} · {tierLabel(entry.tierAtPosting)}{entry.bookingId?` · ${entry.bookingId}`:""}</span></div><time>{formatDate(entry.createdAt,locale)}</time></article>) : <div className="rewardsAdminEmpty">{ar?"لا توجد حركات نقاط بعد.":"No points activity yet."}</div>}</div>
            </div>
          </>}
        </div>
      </div>
    </section>
  </div>;
}

function Toggle({checked,onChange,label,note}:{checked:boolean;onChange:(value:boolean)=>void;label:string;note:string}) {
  return <label className={`rewardsAdminToggle ${checked?"on":""}`}><input type="checkbox" checked={checked} onChange={(event)=>onChange(event.target.checked)}/><span className="toggleTrack"><i/></span><span><strong>{label}</strong><small>{note}</small></span></label>;
}
function NumberField({label,value,min,onChange}:{label:string;value:number;min:number;onChange:(value:number)=>void}) {
  return <label className="rewardsAdminField"><span>{label}</span><input type="number" min={min} step={1} value={value} onChange={(event)=>onChange(Math.max(min,Number.parseInt(event.target.value||String(min),10)||min))}/></label>;
}
function stripProgramMeta(program:Program) {
  const {updatedAt:_updatedAt,updatedByUserId:_updatedByUserId,...editable}=program;
  return editable;
}
async function requestJson<T>(url:string,init?:RequestInit):Promise<T> {
  const response = await fetch(url,{...init,cache:"no-store"});
  const payload = await response.json().catch(()=>null) as ApiPayload<T>|null;
  if (!response.ok || !payload || payload.error || payload.data===null) throw new Error(payload?.error?.message||`Request failed (${response.status})`);
  return payload.data;
}
function tierLabel(tier:Tier) {return tier==="GOLD"?"Key Gold":tier==="BLACK"?"Key Black":"Member";}
function modeLabel(mode:"ADD"|"REMOVE"|"SET",ar:boolean) {if(!ar)return mode==="ADD"?"Add":mode==="REMOVE"?"Remove":"Set balance";return mode==="ADD"?"زيادة":mode==="REMOVE"?"تقليل":"تعيين الرصيد";}
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map((part)=>part.charAt(0).toUpperCase()).join("")||"U";}
function formatDate(value:string,locale:Locale){return new Intl.DateTimeFormat(locale==="ar"?"ar-JO":"en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}
function errorMessage(error:unknown,ar:boolean){return error instanceof Error?error.message:(ar?"حدث خطأ غير متوقع":"An unexpected error occurred");}
