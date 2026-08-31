"use client";

import {useMemo, useState} from "react";
import {ChevronDown, ChevronUp, Clock3, Search, ShieldCheck, UserRound} from "lucide-react";

type Locale = "en" | "ar";

type AuditActor = {
  id: string;
  email: string;
  displayName: string;
  platformRole: string;
  hotelMemberships: Array<{
    role: string;
    hotel: {id: string; name: string};
  }>;
};

type AuditEntry = {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  hotel: {id: string; name: string} | null;
  actor: AuditActor | null;
  targetLabel: string | null;
};

type Props = {
  locale: Locale;
  actors: AuditActor[];
  entries: AuditEntry[];
};

type Copy = {
  title: string;
  intro: string;
  people: string;
  searchPlaceholder: string;
  allPeople: string;
  actions: string;
  noPeople: string;
  noActivity: string;
  system: string;
  reason: string;
  when: string;
  target: string;
  whatChanged: string;
  before: string;
  after: string;
  noFieldChanges: string;
  exactAction: string;
  closeDetails: string;
  openDetails: string;
  noRecordedReason: string;
};

const copyByLocale: Record<Locale, Copy> = {
  ar: {
    title: "سجل نشاط المسؤولين",
    intro: "اختر شخصًا وشاهد كل عملياته المسجلة، سبب العملية، وقتها الدقيق، وما الذي تغيّر قبل وبعد.",
    people: "المسؤولون والمستخدمون المخولون",
    searchPlaceholder: "ابحث بالاسم أو البريد…",
    allPeople: "كل الأشخاص",
    actions: "حركة",
    noPeople: "لا يوجد شخص مطابق للبحث.",
    noActivity: "لا توجد عمليات مسجلة لهذا الشخص ضمن السجل الحالي.",
    system: "عملية تلقائية من النظام",
    reason: "السبب",
    when: "الوقت الدقيق",
    target: "على ماذا تم الإجراء؟",
    whatChanged: "ما الذي تغيّر؟",
    before: "قبل",
    after: "بعد",
    noFieldChanges: "هذه العملية لا تحتوي على تغيير حقول قبل/بعد؛ تم تسجيل الحدث نفسه فقط.",
    exactAction: "العملية بالضبط",
    closeDetails: "إخفاء التفاصيل",
    openDetails: "عرض التفاصيل",
    noRecordedReason: "لم يُسجّل سبب نصّي إضافي لهذه العملية.",
  },
  en: {
    title: "Staff activity audit",
    intro: "Select a person to see their recorded actions, reason, exact time, and the fields that changed before and after.",
    people: "Administrators and authorized staff",
    searchPlaceholder: "Search by name or email…",
    allPeople: "Everyone",
    actions: "actions",
    noPeople: "No person matches this search.",
    noActivity: "No recorded activity for this person in the current audit window.",
    system: "Automated system action",
    reason: "Reason",
    when: "Exact time",
    target: "Affected item",
    whatChanged: "What changed?",
    before: "Before",
    after: "After",
    noFieldChanges: "This event has no before/after field changes; only the event itself was recorded.",
    exactAction: "Exact action",
    closeDetails: "Hide details",
    openDetails: "View details",
    noRecordedReason: "No additional written reason was recorded for this action.",
  },
};

const roleOrder = ["PLATFORM_ADMIN", "OWNER", "MANAGER", "REVENUE", "FRONT_DESK", "FINANCE", "VIEWER", "HOTEL_USER"];

const roleLabels: Record<string, {ar: string; en: string}> = {
  PLATFORM_ADMIN: {ar: "إدارة المنصة", en: "Platform administration"},
  OWNER: {ar: "مالكو الفنادق", en: "Property owners"},
  MANAGER: {ar: "مديرو الفنادق", en: "Property managers"},
  REVENUE: {ar: "إدارة الإيرادات", en: "Revenue"},
  FRONT_DESK: {ar: "الاستقبال", en: "Front desk"},
  FINANCE: {ar: "المالية", en: "Finance"},
  VIEWER: {ar: "عرض فقط", en: "View only"},
  HOTEL_USER: {ar: "مستخدمو الفنادق", en: "Hotel users"},
};

const actionLabels: Record<string, {ar: string; en: string; arReason?: string; enReason?: string}> = {
  ADMIN_SESSION_CREATED: {ar: "تم تسجيل الدخول إلى لوحة الإدارة", en: "Admin session created", arReason: "تسجيل دخول إداري ناجح وبدء جلسة إدارة جديدة.", enReason: "Successful administrator sign-in and creation of a new admin session."},
  ADMIN_SESSION_REVOKED: {ar: "تم إنهاء جلسة إدارة", en: "Admin session ended", arReason: "تم إنهاء جلسة الإدارة أو تسجيل الخروج منها.", enReason: "The administrator session was ended or signed out."},
  ADMIN_SESSION_TERMINATED: {ar: "تم إنهاء جلسة إدارة", en: "Admin session terminated", arReason: "تم إنهاء جلسة الإدارة من إدارة الجلسات.", enReason: "The admin session was terminated from session management."},
  PLATFORM_ADMIN_BOOTSTRAPPED: {ar: "تم إنشاء أول صلاحية لإدارة المنصة", en: "Initial platform administrator created", arReason: "تهيئة أول حساب مخول بإدارة المنصة.", enReason: "Bootstrap of the first account authorized to administer the platform."},
  ADMIN_HOTEL_UPDATED: {ar: "تم تعديل بيانات فندق", en: "Hotel details updated"},
  GUEST_REVIEW_HIDDEN: {ar: "تم إخفاء تقييم ضيف", en: "Guest review hidden"},
  GUEST_REVIEW_RESTORED: {ar: "تمت إعادة نشر تقييم ضيف", en: "Guest review restored"},
  PROPERTY_REVIEW_APPROVED: {ar: "تم اعتماد مراجعة الفندق", en: "Property review approved"},
  PROPERTY_REVIEW_REJECTED: {ar: "تم رفض مراجعة الفندق", en: "Property review rejected"},
  HOTEL_DOCUMENT_APPROVED: {ar: "تم اعتماد مستند فندق", en: "Hotel document approved"},
  HOTEL_DOCUMENT_REJECTED: {ar: "تم رفض مستند فندق", en: "Hotel document rejected"},
  SITE_IDENTITY_UPDATED: {ar: "تم تعديل هوية الموقع", en: "Site identity updated"},
  SITE_ASSET_UPDATED: {ar: "تم تعديل أحد أصول هوية الموقع", en: "Site asset updated"},
  ADMIN_ACCESS_GRANTED: {ar: "تم منح صلاحية إدارية", en: "Admin access granted"},
  ADMIN_ACCESS_REVOKED: {ar: "تم سحب صلاحية إدارية", en: "Admin access revoked"},
  HOTEL_MEMBER_ROLE_CHANGED: {ar: "تم تغيير صلاحية موظف فندق", en: "Hotel staff role changed"},
  HOTEL_MEMBER_SUSPENDED: {ar: "تم إيقاف صلاحية موظف فندق", en: "Hotel staff access suspended"},
  BOOKING_MODIFIED: {ar: "تم تعديل حجز", en: "Booking modified"},
  BOOKING_CANCELLED: {ar: "تم إلغاء حجز", en: "Booking cancelled"},
  BOOKING_NO_SHOW: {ar: "تم تسجيل الحجز كعدم حضور", en: "Booking marked no-show"},
};

const fieldLabels: Record<string, {ar: string; en: string}> = {
  platformRole: {ar: "صلاحية المنصة", en: "Platform role"},
  role: {ar: "الصلاحية", en: "Role"},
  status: {ar: "الحالة", en: "Status"},
  moderationReason: {ar: "سبب المراجعة", en: "Moderation reason"},
  decisionReason: {ar: "سبب القرار", en: "Decision reason"},
  rejectionReason: {ar: "سبب الرفض", en: "Rejection reason"},
  reason: {ar: "السبب", en: "Reason"},
  name: {ar: "الاسم", en: "Name"},
  city: {ar: "المدينة", en: "City"},
  countryCode: {ar: "الدولة", en: "Country"},
  address: {ar: "العنوان", en: "Address"},
  area: {ar: "المنطقة", en: "Area"},
  description: {ar: "الوصف", en: "Description"},
  starRating: {ar: "تصنيف النجوم", en: "Star rating"},
  checkInTime: {ar: "وقت تسجيل الوصول", en: "Check-in time"},
  checkOutTime: {ar: "وقت تسجيل المغادرة", en: "Check-out time"},
  timezone: {ar: "المنطقة الزمنية", en: "Timezone"},
  currency: {ar: "العملة", en: "Currency"},
  commissionRate: {ar: "نسبة العمولة", en: "Commission rate"},
  serviceRate: {ar: "رسوم الخدمة", en: "Service rate"},
  taxRate: {ar: "نسبة الضريبة", en: "Tax rate"},
  overbookingEnabled: {ar: "السماح بالحجز الزائد", en: "Overbooking"},
  amenities: {ar: "المرافق", en: "Amenities"},
  verified: {ar: "حالة التوثيق", en: "Verification"},
  method: {ar: "طريقة التنفيذ", en: "Method"},
};

export default function AuditActivityExplorer({locale, actors, entries}: Props) {
  const copy = copyByLocale[locale];
  const [query, setQuery] = useState("");
  const [selectedActorId, setSelectedActorId] = useState("all");
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);

  const actionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.actorUserId) counts.set(entry.actorUserId, (counts.get(entry.actorUserId) ?? 0) + 1);
    }
    return counts;
  }, [entries]);

  const visibleActors = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale === "ar" ? "ar" : "en");
    if (!needle) return actors;
    return actors.filter((actor) => `${actor.displayName} ${actor.email}`.toLocaleLowerCase(locale === "ar" ? "ar" : "en").includes(needle));
  }, [actors, locale, query]);

  const groupedActors = useMemo(() => {
    const groups = new Map<string, AuditActor[]>();
    for (const actor of visibleActors) {
      const role = primaryRole(actor);
      groups.set(role, [...(groups.get(role) ?? []), actor]);
    }
    return [...groups.entries()].sort(([a], [b]) => roleRank(a) - roleRank(b));
  }, [visibleActors]);

  const visibleEntries = useMemo(
    () => selectedActorId === "all" ? entries : entries.filter((entry) => entry.actorUserId === selectedActorId),
    [entries, selectedActorId],
  );

  const selectedActor = actors.find((actor) => actor.id === selectedActorId) ?? null;

  return <div className="auditExplorer" dir={locale === "ar" ? "rtl" : "ltr"}>
    <div className="auditExplorerHeading">
      <div>
        <span className="eyebrow">Audit trail</span>
        <h3>{copy.title}</h3>
        <p>{copy.intro}</p>
      </div>
      <div className="auditTotal"><ShieldCheck size={17}/><strong>{visibleEntries.length}</strong><span>{copy.actions}</span></div>
    </div>

    <div className="auditExplorerGrid">
      <aside className="auditPeoplePanel">
        <div className="auditPeopleTitle"><UserRound size={16}/><strong>{copy.people}</strong></div>
        <label className="auditSearch"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} type="search"/></label>
        <button type="button" className={`auditPerson ${selectedActorId === "all" ? "selected" : ""}`} onClick={() => {setSelectedActorId("all"); setOpenEntryId(null);}}>
          <span className="auditAvatar">∞</span>
          <span><strong>{copy.allPeople}</strong><small>{entries.length} {copy.actions}</small></span>
        </button>

        <div className="auditPeopleGroups">
          {groupedActors.length === 0 ? <p className="auditEmpty">{copy.noPeople}</p> : groupedActors.map(([role, people]) => <section key={role}>
            <h4>{roleLabel(role, locale)}</h4>
            {people.map((actor) => <button type="button" key={actor.id} className={`auditPerson ${selectedActorId === actor.id ? "selected" : ""}`} onClick={() => {setSelectedActorId(actor.id); setOpenEntryId(null);}}>
              <span className="auditAvatar">{initials(actor.displayName)}</span>
              <span className="auditPersonText"><strong>{actor.displayName}</strong><small>{actor.email}</small><em>{actorContext(actor, locale)}</em></span>
              <b>{actionCounts.get(actor.id) ?? 0}</b>
            </button>)}
          </section>)}
        </div>
      </aside>

      <div className="auditActivityPanel">
        <div className="auditActivityHeader">
          <div>
            <span>{selectedActor ? roleLabel(primaryRole(selectedActor), locale) : copy.allPeople}</span>
            <h4>{selectedActor?.displayName ?? copy.title}</h4>
            {selectedActor && <p>{selectedActor.email}</p>}
          </div>
          <strong>{visibleEntries.length} {copy.actions}</strong>
        </div>

        <div className="auditTimeline">
          {visibleEntries.length === 0 ? <div className="auditEmptyState"><Clock3 size={20}/><p>{copy.noActivity}</p></div> : visibleEntries.map((entry) => {
            const open = openEntryId === entry.id;
            const label = actionLabel(entry.action, locale);
            const reason = auditReason(entry, locale, copy.noRecordedReason);
            const changes = changedFields(entry.before, entry.after);
            return <article className={`auditEvent ${open ? "open" : ""}`} key={entry.id}>
              <button className="auditEventSummary" type="button" onClick={() => setOpenEntryId(open ? null : entry.id)} aria-expanded={open}>
                <span className="auditEventDot"/>
                <span className="auditEventMain">
                  <strong>{label}</strong>
                  <span>{humanTarget(entry, locale)}</span>
                  <small>{entry.actor ? `${entry.actor.displayName} · ${roleLabel(primaryRole(entry.actor), locale)}` : copy.system}</small>
                </span>
                <time>{formatCompactTime(entry.createdAt, locale)}</time>
                <span className="auditExpand">{open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}<small>{open ? copy.closeDetails : copy.openDetails}</small></span>
              </button>

              {open && <div className="auditEventDetails">
                <div className="auditDetailGrid">
                  <Detail label={copy.exactAction} value={label}/>
                  <Detail label={copy.reason} value={reason}/>
                  <Detail label={copy.when} value={formatExactTime(entry.createdAt, locale)}/>
                  <Detail label={copy.target} value={humanTarget(entry, locale)}/>
                </div>

                <div className="auditChanges">
                  <h5>{copy.whatChanged}</h5>
                  {changes.length === 0 ? <p>{copy.noFieldChanges}</p> : <div className="auditChangeList">
                    {changes.map((change) => <div className="auditChange" key={change.key}>
                      <strong>{fieldLabel(change.key, locale)}</strong>
                      <div><span>{copy.before}</span><code>{formatValue(change.before, locale)}</code></div>
                      <div><span>{copy.after}</span><code>{formatValue(change.after, locale)}</code></div>
                    </div>)}
                  </div>}
                </div>
              </div>}
            </article>;
          })}
        </div>
      </div>
    </div>

    <style jsx>{`
      .auditExplorer{border-top:1px solid var(--line);padding-top:20px}.auditExplorerHeading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}.auditExplorerHeading h3{font-size:22px;letter-spacing:-.025em;margin:5px 0 3px}.auditExplorerHeading p{max-width:760px;margin:0;color:var(--muted);font-size:11px;line-height:1.65}.auditTotal{display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:8px 11px;background:#f8fafb;color:#526174;font-size:10px}.auditTotal svg{color:var(--navy)}.auditTotal strong{color:var(--ink)}
      .auditExplorerGrid{display:grid;grid-template-columns:310px minmax(0,1fr);gap:14px;align-items:start}.auditPeoplePanel,.auditActivityPanel{border:1px solid var(--line);border-radius:16px;background:#fff}.auditPeoplePanel{padding:12px;position:sticky;top:20px;max-height:76vh;overflow:auto}.auditPeopleTitle{display:flex;align-items:center;gap:7px;padding:4px 4px 10px;font-size:11px}.auditPeopleTitle svg{color:var(--navy)}.auditSearch{display:flex;align-items:center;gap:7px;border:1px solid var(--line-strong);border-radius:11px;padding:0 10px;margin-bottom:10px;background:#fbfcfd}.auditSearch:focus-within{border-color:#7892aa;box-shadow:0 0 0 3px rgba(33,78,118,.08)}.auditSearch svg{color:#7b8999;flex:0 0 auto}.auditSearch input{width:100%;border:0;outline:0;background:transparent;padding:10px 0;font-size:10px;color:var(--ink)}.auditPeopleGroups section{border-top:1px solid var(--line);padding-top:9px;margin-top:9px}.auditPeopleGroups h4{margin:0 6px 7px;color:#7b8998;font-size:9px;text-transform:uppercase;letter-spacing:.04em}.auditPerson{width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;border:1px solid transparent;background:transparent;border-radius:11px;padding:8px;text-align:start;color:var(--ink);cursor:pointer}.auditPerson:hover{background:#f6f8fa}.auditPerson.selected{background:#edf3f7;border-color:#cedce7}.auditAvatar{width:34px;height:34px;border-radius:10px;background:#172b40;color:#fff;display:grid;place-items:center;font-size:9px;font-weight:900}.auditPerson>span:nth-child(2) strong,.auditPerson>span:nth-child(2) small,.auditPersonText em{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.auditPerson>span:nth-child(2) strong{font-size:10px}.auditPerson>span:nth-child(2) small{font-size:8.5px;color:#7b8794;margin-top:2px}.auditPersonText em{font-size:8px;color:#8c98a4;margin-top:3px;font-style:normal}.auditPerson>b{font-size:9px;border-radius:999px;background:#eef2f5;color:#617184;padding:4px 6px}.auditEmpty{font-size:10px;color:var(--muted);padding:10px 7px}
      .auditActivityPanel{overflow:hidden}.auditActivityHeader{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:15px 17px;border-bottom:1px solid var(--line);background:#fafbfc}.auditActivityHeader span,.auditActivityHeader p{display:block;color:var(--muted);font-size:9px;margin:0}.auditActivityHeader h4{font-size:16px;margin:3px 0}.auditActivityHeader>strong{font-size:9px;border-radius:999px;background:#edf2f6;padding:6px 9px;color:#5d6e80}.auditTimeline{padding:0 16px 8px}.auditEvent{border-bottom:1px solid var(--line)}.auditEvent:last-child{border-bottom:0}.auditEventSummary{width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:11px;align-items:center;border:0;background:transparent;text-align:start;padding:14px 2px;color:var(--ink);cursor:pointer}.auditEventSummary:hover .auditEventMain strong{color:#214f76}.auditEventDot{width:9px;height:9px;border-radius:50%;background:var(--navy);box-shadow:0 0 0 4px #edf2f6}.auditEventMain strong,.auditEventMain span,.auditEventMain small{display:block}.auditEventMain strong{font-size:11px}.auditEventMain span{font-size:9.5px;color:#5f6e80;margin-top:3px}.auditEventMain small{font-size:8.5px;color:#929daa;margin-top:3px}.auditEventSummary time{font-size:9px;color:#758496;white-space:nowrap}.auditExpand{display:flex;align-items:center;gap:4px;color:#617286}.auditExpand small{font-size:8px;white-space:nowrap}.auditEvent.open{background:#fbfcfd}.auditEventDetails{padding:0 2px 16px 20px;margin-inline-start:20px}.auditDetailGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.auditDetail{border:1px solid var(--line);border-radius:11px;background:#fff;padding:10px}.auditDetail span{display:block;color:#84909d;font-size:8px;margin-bottom:4px}.auditDetail strong{display:block;font-size:10px;line-height:1.55;word-break:break-word}.auditChanges{margin-top:12px}.auditChanges h5{font-size:11px;margin:0 0 8px}.auditChanges>p{font-size:9px;color:var(--muted);margin:0;border:1px dashed var(--line-strong);border-radius:11px;padding:11px}.auditChangeList{display:grid;gap:7px}.auditChange{display:grid;grid-template-columns:150px minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:stretch}.auditChange>strong{display:flex;align-items:center;font-size:9px;color:#59697b;padding:8px}.auditChange>div{border:1px solid var(--line);background:#fff;border-radius:10px;padding:8px;min-width:0}.auditChange>div>span{display:block;font-size:8px;color:#8a96a4;margin-bottom:4px}.auditChange code{display:block;font-family:inherit;font-size:9px;white-space:pre-wrap;word-break:break-word;color:#25394d}.auditEmptyState{display:flex;align-items:center;gap:9px;padding:25px 4px;color:var(--muted)}.auditEmptyState p{font-size:10px;margin:0}
      @media(max-width:1050px){.auditExplorerGrid{grid-template-columns:260px minmax(0,1fr)}.auditChange{grid-template-columns:1fr}.auditChange>strong{padding:4px 0}.auditEventSummary{grid-template-columns:auto minmax(0,1fr) auto}.auditExpand{grid-column:2}.auditEventSummary time{grid-column:3;grid-row:1}}
      @media(max-width:760px){.auditExplorerHeading{align-items:flex-start;flex-direction:column}.auditExplorerGrid{grid-template-columns:1fr}.auditPeoplePanel{position:relative;top:auto;max-height:none}.auditPeopleGroups{max-height:330px;overflow:auto}.auditDetailGrid{grid-template-columns:1fr}.auditEventSummary{grid-template-columns:auto minmax(0,1fr)}.auditEventSummary time,.auditExpand{grid-column:2;grid-row:auto}.auditEventDetails{margin-inline-start:0;padding-inline-start:0}.auditTotal{align-self:flex-start}}
    `}</style>
  </div>;
}

function Detail({label, value}: {label: string; value: string}) {
  return <div className="auditDetail"><span>{label}</span><strong>{value}</strong></div>;
}

function primaryRole(actor: AuditActor): string {
  if (actor.platformRole === "PLATFORM_ADMIN") return "PLATFORM_ADMIN";
  return actor.hotelMemberships[0]?.role ?? actor.platformRole ?? "HOTEL_USER";
}

function roleRank(role: string): number {
  const index = roleOrder.indexOf(role);
  return index === -1 ? roleOrder.length : index;
}

function roleLabel(role: string, locale: Locale): string {
  return roleLabels[role]?.[locale] ?? humanize(role);
}

function actorContext(actor: AuditActor, locale: Locale): string {
  if (actor.platformRole === "PLATFORM_ADMIN") return roleLabel("PLATFORM_ADMIN", locale);
  const membership = actor.hotelMemberships[0];
  if (!membership) return roleLabel(actor.platformRole, locale);
  return `${roleLabel(membership.role, locale)} · ${membership.hotel.name}`;
}

function actionLabel(action: string, locale: Locale): string {
  return actionLabels[action]?.[locale] ?? humanize(action);
}

function auditReason(entry: AuditEntry, locale: Locale, fallback: string): string {
  const explicit = firstTextValue(entry.after, ["reason", "decisionReason", "rejectionReason", "moderationReason", "cancellationReason", "note"])
    ?? firstTextValue(entry.before, ["reason", "decisionReason", "rejectionReason", "moderationReason", "cancellationReason", "note"]);
  if (explicit) return explicit;
  const configured = actionLabels[entry.action]?.[locale === "ar" ? "arReason" : "enReason"];
  return configured ?? fallback;
}

function firstTextValue(value: unknown, keys: string[]): string | null {
  const record = plainRecord(value);
  if (!record) return null;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function humanTarget(entry: AuditEntry, locale: Locale): string {
  if (entry.targetLabel) return entry.targetLabel;
  const labels: Record<string, {ar: string; en: string}> = {
    Session: {ar: "جلسة الإدارة", en: "Admin session"},
    Hotel: {ar: "الفندق", en: "Hotel"},
    User: {ar: "حساب مستخدم", en: "User account"},
    Booking: {ar: "حجز", en: "Booking"},
    GuestReview: {ar: "تقييم ضيف", en: "Guest review"},
    PropertyReview: {ar: "مراجعة فندق", en: "Property review"},
    HotelDocument: {ar: "مستند فندق", en: "Hotel document"},
    SiteIdentity: {ar: "هوية الموقع", en: "Site identity"},
  };
  return labels[entry.entityType]?.[locale] ?? (locale === "ar" ? `عنصر من نوع ${humanize(entry.entityType)}` : humanize(entry.entityType));
}

function changedFields(before: unknown, after: unknown): Array<{key: string; before: unknown; after: unknown}> {
  const beforeRecord = plainRecord(before) ?? {};
  const afterRecord = plainRecord(after) ?? {};
  const ignored = new Set(["id", "createdAt", "updatedAt", "moderatedAt", "reviewedAt"]);
  const keys = [...new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])].filter((key) => !ignored.has(key));
  return keys.filter((key) => stableValue(beforeRecord[key]) !== stableValue(afterRecord[key])).map((key) => ({key, before: beforeRecord[key], after: afterRecord[key]}));
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stableValue(value: unknown): string {
  try { return JSON.stringify(value); } catch { return String(value); }
}

function fieldLabel(key: string, locale: Locale): string {
  return fieldLabels[key]?.[locale] ?? humanize(key);
}

function formatValue(value: unknown, locale: Locale): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return locale === "ar" ? (value ? "نعم" : "لا") : (value ? "Yes" : "No");
  if (typeof value === "number") return new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", {maximumFractionDigits: 5}).format(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    const compact = value.map((item) => {
      const record = plainRecord(item);
      if (record && typeof record.name === "string") return record.name;
      if (record && typeof record.code === "string") return record.code;
      return typeof item === "string" ? item : JSON.stringify(item);
    });
    return compact.join("، ");
  }
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function formatCompactTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {timeZone: "Asia/Amman", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"}).format(new Date(value));
}

function formatExactTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {timeZone: "Asia/Amman", dateStyle: "full", timeStyle: "medium"}).format(new Date(value));
}

function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "A";
}
