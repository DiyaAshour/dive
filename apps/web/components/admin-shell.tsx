import Link from "next/link";
import {Activity, BadgeCheck, BedDouble, BookOpenText, Building2, CalendarRange, CarFront, FileCheck2, Gem, Globe2, LayoutDashboard, Mail, MessageSquareWarning, Rocket, Users, WalletCards} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import {direction} from "@/lib/i18n";
import {portalDictionary} from "@/lib/portal-i18n";
import {AdminSignOutButton} from "./admin-sign-out-button";
import {LanguageSwitcher} from "./language-switcher";
import {SiteBrand} from "./site-brand";
import styles from "./admin-shell.module.css";

type Active = "overview" | "verification" | "properties" | "cars" | "reviews" | "blog" | "email" | "distribution" | "finance" | "rewards" | "launch" | "access" | "audit";
type Principal = Readonly<{
  user: {displayName: string; email: string};
}>;

type Props = Readonly<{
  locale: Locale;
  principal: Principal;
  active: Active;
  counts?: {verification: number; hiddenReviews: number; emailOps?: number};
  children: React.ReactNode;
}>;

export function AdminShell({locale, principal, active, counts = {verification: 0, hiddenReviews: 0, emailOps: 0}, children}: Props) {
  const copy = portalDictionary(locale);
  const admin = copy.admin;
  const isCars = active === "cars";
  const dashboardHref = (section: Active) => section === "overview" ? "/admin" : `/admin#${section}`;
  const blogLabel = locale === "ar" ? "المحتوى والمدونة" : "Content & blog";
  const communicationsLabel = locale === "ar" ? "الاتصالات" : "Communications";
  const emailLabel = locale === "ar" ? "البريد الإلكتروني" : "Email";
  const distributionLabel = locale === "ar" ? "التوزيع والقنوات" : "Distribution";
  const googleHotelsLabel = locale === "ar" ? "فنادق Google" : "Google Hotels";
  const financeLabel = locale === "ar" ? "الدفعات والتسويات" : "Payouts & settlement";
  const rewardsLabel = locale === "ar" ? "المكافآت والعضويات" : "Rewards & memberships";
  const launchLabel = locale === "ar" ? "هوية البراند والإطلاق" : "Brand identity & launch";
  const accessLabel = locale === "ar" ? "المستخدمون والصلاحيات" : "Users & access";
  const staysLabel = locale === "ar" ? "الإقامة" : "Stays";
  const carsLabel = locale === "ar" ? "السيارات" : "Cars";
  const carBookingsLabel = locale === "ar" ? "حجوزات السيارات" : "Car reservations";
  const rentalCompaniesLabel = locale === "ar" ? "شركات التأجير" : "Rental companies";
  const carVerificationLabel = locale === "ar" ? "مراجعة الشركات" : "Company verification";

  return <main className="adminApp" dir={direction(locale)}>
    <aside className="adminSidebar">
      <div className="adminBrand"><SiteBrand href={isCars ? "/admin/cars" : "/admin"} inverse/><span>{admin.name}</span></div>

      <span className={styles.workspaceCaption}>{locale === "ar" ? "مساحة الإدارة" : "Admin workspace"}</span>
      <div className={styles.workspaceSwitcher} role="navigation" aria-label={locale === "ar" ? "تبديل قسم الإدارة" : "Switch admin workspace"}>
        <Link className={`${styles.workspaceLink} ${!isCars ? styles.workspaceActive : ""}`} href="/admin" aria-current={!isCars ? "page" : undefined}><BedDouble size={15}/>{staysLabel}</Link>
        <Link className={`${styles.workspaceLink} ${isCars ? styles.workspaceActive : ""}`} href="/admin/cars" aria-current={isCars ? "page" : undefined}><CarFront size={15}/>{carsLabel}</Link>
      </div>

      {isCars ? <>
        <div className={styles.carContext}><CarFront size={17}/><span><strong>{locale === "ar" ? "إدارة سوق السيارات" : "Cars marketplace"}</strong><small>{locale === "ar" ? "كل شركات التأجير وحجوزاتها" : "All rental partners and bookings"}</small></span></div>
        <nav className="adminNav" aria-label={locale === "ar" ? "إدارة السيارات" : "Cars administration"}>
          <span>{locale === "ar" ? "التشغيل" : "Operate"}</span>
          <Link href="/admin/cars"><LayoutDashboard size={17}/>{admin.overview}</Link>
          <Link href="/admin/cars/reservations"><CalendarRange size={17}/>{carBookingsLabel}</Link>
          <Link href="/admin/cars/companies"><Building2 size={17}/>{rentalCompaniesLabel}</Link>
          <span>{locale === "ar" ? "التحكم بالشركاء" : "Partner control"}</span>
          <Link href="/admin/cars/companies?status=PENDING_REVIEW"><BadgeCheck size={17}/>{carVerificationLabel}</Link>
        </nav>
      </> : <nav className="adminNav" aria-label={admin.name}>
        <span>{admin.operate}</span>
        <Link className={active === "overview" ? "active" : ""} href={dashboardHref("overview")}><LayoutDashboard size={17}/>{admin.overview}</Link>
        <Link className={active === "verification" ? "active" : ""} href={dashboardHref("verification")}><FileCheck2 size={17}/>{admin.verification}{counts.verification > 0 && <b>{counts.verification}</b>}</Link>
        <Link className={active === "properties" ? "active" : ""} href="/admin/properties"><Building2 size={17}/>{admin.properties}</Link>
        <Link className={active === "reviews" ? "active" : ""} href="/admin/reviews"><MessageSquareWarning size={17}/>{admin.reviews}{counts.hiddenReviews > 0 && <b>{counts.hiddenReviews}</b>}</Link>
        <Link className={active === "blog" ? "active" : ""} href="/admin/blog"><BookOpenText size={17}/>{blogLabel}</Link>
        <span>{communicationsLabel}</span>
        <Link className={active === "email" ? "active" : ""} href="/admin/communications/email"><Mail size={17}/>{emailLabel}{(counts.emailOps ?? 0) > 0 && <b>{counts.emailOps}</b>}</Link>
        <span>{distributionLabel}</span>
        <Link className={active === "distribution" ? "active" : ""} href="/admin/distribution/google-hotels"><Globe2 size={17}/>{googleHotelsLabel}</Link>
        <span>{locale === "ar" ? "المالية" : "Finance"}</span>
        <Link className={active === "finance" ? "active" : ""} href="/admin/finance/payouts"><WalletCards size={17}/>{financeLabel}</Link>
        <span>{admin.control}</span>
        <Link className={active === "rewards" ? "active" : ""} href="/admin/rewards"><Gem size={17}/>{rewardsLabel}</Link>
        <Link className={active === "launch" ? "active" : ""} href="/admin/site"><Rocket size={17}/>{launchLabel}</Link>
        <Link className={active === "access" ? "active" : ""} href="/admin/access"><Users size={17}/>{accessLabel}</Link>
        <Link className={active === "audit" ? "active" : ""} href={dashboardHref("audit")}><Activity size={17}/>{admin.audit}</Link>
      </nav>}

      <div className="adminSidebarFoot">
        <LanguageSwitcher locale={locale} compact/>
        <div><span>{copy.common.signedInAs}</span><strong>{principal.user.displayName}</strong><small>{principal.user.email}</small></div>
        <AdminSignOutButton locale={locale}/>
      </div>
    </aside>
    <section className="adminMain">{children}</section>
  </main>;
}
