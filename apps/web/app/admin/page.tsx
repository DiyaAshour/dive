import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {Activity, BadgeCheck, Building2, CircleCheck, Clock3, FileCheck2, LayoutDashboard, ShieldCheck, Users} from "lucide-react";
import {getPlatformAccessOverview, listPendingHotelDocuments, listPlatformAuditLog, listPlatformHotels, listPropertyReviewQueue} from "@platform/server";
import {AdminSignOutButton} from "@/components/admin-sign-out-button";
import {Brand} from "@/components/brand";
import {currentAdminPrincipal} from "@/lib/server-session";
import DocumentReviewQueue from "./document-review-queue";
import PropertyActions from "./property-actions";
import ReviewQueue from "./review-queue";

export const metadata: Metadata = {title: "Control Center"};
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const principal = await currentAdminPrincipal();
  if (!principal) redirect("/admin/login?next=%2Fadmin");

  const [hotels, reviews, documents, access, audit] = await Promise.all([
    listPlatformHotels(principal.user.id),
    listPropertyReviewQueue(principal.user.id),
    listPendingHotelDocuments(principal.user.id),
    getPlatformAccessOverview(principal.user.id),
    listPlatformAuditLog(principal.user.id, 50),
  ]);

  const active = hotels.filter((hotel) => hotel.status === "ACTIVE").length;
  const suspended = hotels.filter((hotel) => hotel.status === "SUSPENDED").length;
  const reviewProps = reviews.map((item) => ({...item, submittedAt: item.submittedAt.toISOString()}));
  const documentProps = documents.map((item) => ({...item, submittedAt: item.submittedAt.toISOString(), mediaObject: {...item.mediaObject, uploadedAt: item.mediaObject.uploadedAt?.toISOString() ?? null}}));

  return <main className="adminApp" dir="ltr">
    <aside className="adminSidebar">
      <div className="adminBrand"><Brand href="/admin" inverse/><span>Control Center</span></div>
      <nav className="adminNav" aria-label="Administrator navigation">
        <span>OPERATE</span>
        <a href="#overview"><LayoutDashboard size={17}/>Overview</a>
        <a href="#verification"><FileCheck2 size={17}/>Verification <b>{reviews.length + documents.length}</b></a>
        <a href="#properties"><Building2 size={17}/>Properties</a>
        <span>CONTROL</span>
        <a href="#access"><Users size={17}/>Access</a>
        <a href="#audit"><Activity size={17}/>Audit log</a>
      </nav>
      <div className="adminSidebarFoot">
        <div><span>Signed in as</span><strong>{principal.user.displayName}</strong><small>{principal.user.email}</small></div>
        <AdminSignOutButton/>
      </div>
    </aside>

    <section className="adminMain">
      <header className="adminTopbar">
        <div><span className="eyebrow">Platform administration</span><h1>Control Center</h1><p>Review the work that needs a platform decision, then keep every sensitive action attributable.</p></div>
        <div className="adminSessionBadge"><ShieldCheck size={18}/><span><strong>Admin-scoped session</strong><small>Expires {formatDateTime(principal.session.expiresAt)}</small></span></div>
      </header>

      <section id="overview" className="adminSection">
        <div className="adminSectionTitle"><div><span className="eyebrow">Live platform state</span><h2>What needs attention</h2></div><span className={reviews.length + documents.length ? "adminAttention" : "adminClear"}>{reviews.length + documents.length ? `${reviews.length + documents.length} decisions pending` : "Queues clear"}</span></div>
        <div className="adminKpiGrid">
          <article><span><Building2 size={16}/>Properties</span><strong>{hotels.length}</strong><small>All property workspaces</small></article>
          <article><span><CircleCheck size={16}/>Live</span><strong>{active}</strong><small>Active and discoverable</small></article>
          <article><span><BadgeCheck size={16}/>Property reviews</span><strong>{reviews.length}</strong><small>Waiting for a decision</small></article>
          <article><span><FileCheck2 size={16}/>Documents</span><strong>{documents.length}</strong><small>Private files pending</small></article>
          <article><span><ShieldCheck size={16}/>Suspended</span><strong>{suspended}</strong><small>Removed from discovery</small></article>
          <article><span><Users size={16}/>Accounts</span><strong>{access.totalUsers}</strong><small>{access.hotelUsers} hotel users</small></article>
        </div>
      </section>

      <section id="verification" className="adminSection adminVerificationSection">
        <div className="adminSectionTitle"><div><span className="eyebrow">Publishing gate</span><h2>Verification queues</h2><p>Only the exact reviewed revision and approved required documents can publish a property.</p></div></div>
        <ReviewQueue reviews={reviewProps}/>
        <DocumentReviewQueue documents={documentProps}/>
      </section>

      <section id="properties" className="adminSection adminPanel">
        <div className="adminSectionTitle"><div><span className="eyebrow">Property network</span><h2>Publishing status</h2><p>Administrative suspension is separate from hotel editing and always requires a reason.</p></div><strong>{hotels.length} properties</strong></div>
        <div className="adminPropertyTable" role="table" aria-label="Property publishing status">
          <div className="adminPropertyRow adminPropertyHead" role="row"><span>Property</span><span>Location</span><span>Status</span><span>Verification</span><span>Revision</span><span>Action</span></div>
          {hotels.map((hotel) => <div className="adminPropertyRow" role="row" key={hotel.id}>
            <div><strong>{hotel.name}</strong><small>{hotel.slug}</small></div>
            <span>{hotel.city}, {hotel.countryCode}</span>
            <span className={hotel.status === "ACTIVE" ? "statusOk" : "statusReview"}>{hotel.status === "ACTIVE" && <CircleCheck size={14}/>} {humanize(hotel.status)}</span>
            <span>{hotel.verified ? "Verified" : "Not verified"}</span>
            <span>{hotel.publishRevision}{hotel.publishedRevision ? ` / published ${hotel.publishedRevision}` : " / unpublished"}</span>
            <PropertyActions hotelId={hotel.id} status={hotel.status}/>
          </div>)}
        </div>
      </section>

      <section id="access" className="adminSection adminPanel">
        <div className="adminSectionTitle"><div><span className="eyebrow">Identity and access</span><h2>Platform administrators</h2><p>Public administrator registration is disabled. The first administrator is operator-bootstrapped; future access management must remain explicit and audited.</p></div><div className="adminAccessCounts"><span>{access.guests} travelers</span><span>{access.hotelUsers} hotel users</span></div></div>
        <div className="adminAccessList">
          {access.administrators.map((administrator) => <article key={administrator.id}>
            <div className="adminAvatar">{initials(administrator.displayName)}</div>
            <div><strong>{administrator.displayName}</strong><span>{administrator.email}</span><small>Administrator since {formatDate(administrator.createdAt)}</small></div>
            <div><strong>{administrator.activeAdminSessions}</strong><span>active admin session{administrator.activeAdminSessions === 1 ? "" : "s"}</span><small>{administrator.lastAdminActivity ? `Last activity ${formatDateTime(administrator.lastAdminActivity)}` : "No active session"}</small></div>
          </article>)}
        </div>
      </section>

      <section id="audit" className="adminSection adminPanel">
        <div className="adminSectionTitle"><div><span className="eyebrow">Accountability</span><h2>Recent audit activity</h2><p>Newest sensitive and operational mutations recorded by the shared domain services.</p></div><Clock3 size={20}/></div>
        <div className="adminAuditList">
          {audit.length === 0 ? <p className="muted">No audit activity has been recorded yet.</p> : audit.map((entry) => <article key={entry.id}>
            <span className="adminAuditDot"/>
            <div><strong>{humanize(entry.action)}</strong><p>{entry.hotel?.name ?? entry.entityType}{entry.entityId ? ` · ${entry.entityId}` : ""}</p><small>{entry.actor ? `${entry.actor.displayName} · ${entry.actor.email}` : "System action"}</small></div>
            <time>{formatDateTime(entry.createdAt)}</time>
          </article>)}
        </div>
      </section>
    </section>
  </main>;
}

function humanize(value: string): string {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {day: "2-digit", month: "short", year: "numeric"}).format(value);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"}).format(value);
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "A";
}
