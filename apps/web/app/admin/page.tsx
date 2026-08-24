import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {BadgeCheck, Building2, CircleCheck, Clock3, FileCheck2, ShieldCheck, Users} from "lucide-react";
import {getAdminNavigationCounts, getPlatformAccessOverview, listPendingHotelDocuments, listPlatformAuditLog, listPlatformHotels, listPropertyReviewQueue} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {portalDictionary} from "@/lib/portal-i18n";
import DocumentReviewQueue from "./document-review-queue";
import ReviewQueue from "./review-queue";

export const metadata: Metadata = {title: "Control Center"};
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin");
  const locale = await requestLocale();
  const copy = portalDictionary(locale);
  const admin = copy.admin;

  const [hotels, reviews, documents, access, audit, counts] = await Promise.all([
    listPlatformHotels(principal.user.id),
    listPropertyReviewQueue(principal.user.id),
    listPendingHotelDocuments(principal.user.id),
    getPlatformAccessOverview(principal.user.id),
    listPlatformAuditLog(principal.user.id, 50),
    getAdminNavigationCounts(principal.user.id),
  ]);

  const active = hotels.filter((hotel) => hotel.status === "ACTIVE").length;
  const suspended = hotels.filter((hotel) => hotel.status === "SUSPENDED").length;
  const reviewProps = reviews.map((item) => ({...item, submittedAt: item.submittedAt.toISOString()}));
  const documentProps = documents.map((item) => ({...item, submittedAt: item.submittedAt.toISOString(), mediaObject: {...item.mediaObject, uploadedAt: item.mediaObject.uploadedAt?.toISOString() ?? null}}));
  const pending = reviews.length + documents.length;

  return <AdminShell locale={locale} principal={principal} active="overview" counts={counts}>
    <header className="adminTopbar">
      <div><span className="eyebrow">{admin.eyebrow}</span><h1>{admin.title}</h1><p>{admin.intro}</p></div>
      <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>{admin.secureSession}</strong><small>{admin.expires} {formatDateTime(principal.session.expiresAt, locale)}</small></span></div>
    </header>

    <section id="overview" className="adminSection">
      <div className="adminSectionTitle"><div><span className="eyebrow">{admin.liveState}</span><h2>{admin.attention}</h2></div><span className={pending ? "adminAttention" : "adminClear"}>{pending ? `${pending} ${admin.decisionsPending}` : admin.queuesClear}</span></div>
      <div className="adminKpiGrid">
        <article><span><Building2 size={16}/>{admin.properties}</span><strong>{hotels.length}</strong><small>{admin.allProperties}</small></article>
        <article><span><CircleCheck size={16}/>{admin.live}</span><strong>{active}</strong><small>{admin.activeDiscoverable}</small></article>
        <article><span><BadgeCheck size={16}/>{admin.propertyReviews}</span><strong>{reviews.length}</strong><small>{admin.waitingDecision}</small></article>
        <article><span><FileCheck2 size={16}/>{admin.documents}</span><strong>{documents.length}</strong><small>{admin.privatePending}</small></article>
        <article><span><ShieldCheck size={16}/>{admin.suspended}</span><strong>{suspended}</strong><small>{admin.removedDiscovery}</small></article>
        <article><span><Users size={16}/>{admin.accounts}</span><strong>{access.totalUsers}</strong><small>{access.hotelUsers} {admin.hotelUsers}</small></article>
      </div>
    </section>

    <section id="verification" className="adminSection adminVerificationSection">
      <div className="adminSectionTitle"><div><span className="eyebrow">{admin.publishingGate}</span><h2>{admin.verificationQueues}</h2><p>{admin.verificationIntro}</p></div></div>
      <ReviewQueue reviews={reviewProps} locale={locale}/>
      <DocumentReviewQueue documents={documentProps} locale={locale}/>
    </section>

    <section id="properties" className="adminSection adminPanel">
      <div className="adminSectionTitle"><div><span className="eyebrow">{admin.propertyNetwork}</span><h2>{admin.publishingStatus}</h2><p>{admin.propertyIntro}</p></div><Link className="primaryButton" href="/admin/properties"><Building2 size={16}/>{admin.manageProperties}</Link></div>
      <div className="adminPropertyTable" role="table" aria-label={admin.publishingStatus}>
        <div className="adminPropertyRow adminPropertyHead" role="row"><span>{admin.property}</span><span>{admin.location}</span><span>{copy.common.status}</span><span>{admin.verificationLabel}</span><span>{admin.revision}</span><span>{copy.common.actions}</span></div>
        {hotels.slice(0, 12).map((hotel) => <div className="adminPropertyRow" role="row" key={hotel.id}>
          <div><strong>{hotel.name}</strong><small>{hotel.slug}</small></div>
          <span>{hotel.city}, {hotel.countryCode}</span>
          <span className={hotel.status === "ACTIVE" ? "statusOk" : "statusReview"}>{hotel.status === "ACTIVE" && <CircleCheck size={14}/>} {statusLabel(hotel.status, locale)}</span>
          <span>{hotel.verified ? admin.verified : admin.notVerified}</span>
          <span>{hotel.publishRevision}{hotel.publishedRevision ? ` / ${hotel.publishedRevision}` : ` / ${admin.unpublished}`}</span>
          <Link className="secondaryButton" href={`/admin/properties/${hotel.id}`}>{copy.common.edit}</Link>
        </div>)}
      </div>
    </section>

    <section id="access" className="adminSection adminPanel">
      <div className="adminSectionTitle"><div><span className="eyebrow">{admin.identityAccess}</span><h2>{admin.administrators}</h2><p>{admin.accessIntro}</p></div><div className="adminAccessCounts"><span>{access.guests} {admin.travelers}</span><span>{access.hotelUsers} {admin.hotelUsers}</span></div></div>
      <div className="adminAccessList">
        {access.administrators.map((administrator) => <article key={administrator.id}>
          <div className="adminAvatar">{initials(administrator.displayName)}</div>
          <div><strong>{administrator.displayName}</strong><span>{administrator.email}</span><small>{admin.administratorSince} {formatDate(administrator.createdAt, locale)}</small></div>
          <div><strong>{administrator.activeAdminSessions}</strong><span>{administrator.activeAdminSessions === 1 ? admin.activeSession : admin.activeSessions}</span><small>{administrator.lastAdminActivity ? `${admin.lastActivity} ${formatDateTime(administrator.lastAdminActivity, locale)}` : admin.noActiveSession}</small></div>
        </article>)}
      </div>
    </section>

    <section id="audit" className="adminSection adminPanel">
      <div className="adminSectionTitle"><div><span className="eyebrow">{admin.accountability}</span><h2>{admin.recentAudit}</h2><p>{admin.auditIntro}</p></div><Clock3 size={20}/></div>
      <div className="adminAuditList">
        {audit.length === 0 ? <p className="muted">{admin.noAudit}</p> : audit.map((entry) => <article key={entry.id}>
          <span className="adminAuditDot"/>
          <div><strong>{humanize(entry.action)}</strong><p>{entry.hotel?.name ?? entry.entityType}{entry.entityId ? ` · ${entry.entityId}` : ""}</p><small>{entry.actor ? `${entry.actor.displayName} · ${entry.actor.email}` : admin.systemAction}</small></div>
          <time>{formatDateTime(entry.createdAt, locale)}</time>
        </article>)}
      </div>
    </section>
  </AdminShell>;
}

function statusLabel(value: string, locale: "en" | "ar") {
  if (locale === "en") return humanize(value);
  return ({ACTIVE: "نشطة", DRAFT: "مسودة", PENDING_REVIEW: "قيد المراجعة", SUSPENDED: "موقوفة"} as Record<string, string>)[value] ?? value;
}

function humanize(value: string): string {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: Date, locale: "en" | "ar"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", year: "numeric"}).format(value);
}

function formatDateTime(value: Date, locale: "en" | "ar"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"}).format(value);
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "A";
}
