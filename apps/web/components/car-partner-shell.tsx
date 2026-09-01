"use client";

import Link from "next/link";
import { BadgeDollarSign, BarChart3, CalendarRange, CarFront, LayoutDashboard, MapPin, Settings2, ShieldCheck, Tag } from "lucide-react";
import { usePathname } from "next/navigation";
import styles from "./car-partner-shell.module.css";

type Props = Readonly<{
  companyName: string;
  status: string;
  verified: boolean;
  locale: "ar" | "en";
  children: React.ReactNode;
}>;

export function CarPartnerShell({companyName,status,verified,locale,children}:Props) {
  const pathname=usePathname();
  const ar=locale==="ar";
  const links=[
    {href:"/car-dashboard",label:ar?"نظرة عامة":"Overview",icon:LayoutDashboard,exact:true},
    {href:"/car-dashboard/fleet",label:ar?"الأسطول":"Fleet",icon:CarFront},
    {href:"/car-dashboard/reservations",label:ar?"الحجوزات":"Reservations",icon:CalendarRange},
    {href:"/car-dashboard/locations",label:ar?"مواقع الاستلام":"Locations",icon:MapPin},
    {href:"/car-dashboard/rates",label:ar?"الأسعار والتوفر":"Rates & availability",icon:BadgeDollarSign},
    {href:"/car-dashboard/promotions",label:ar?"العروض":"Promotions",icon:Tag},
    {href:"/car-dashboard/performance",label:ar?"الأداء":"Performance",icon:BarChart3},
    {href:"/car-dashboard/settings",label:ar?"الإعدادات":"Settings",icon:Settings2},
  ];

  return <main className={styles.root} dir={ar?"rtl":"ltr"} lang={ar?"ar":"en"}>
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><div><strong>HandMeKey</strong><span>Cars Partner Hub</span><span className={styles.badge}>{ar?"شركات تأجير السيارات":"Car rental companies"}</span></div><CarFront size={27}/></div>
        <nav className={styles.nav} aria-label={ar?"إدارة شركة التأجير":"Car rental management"}>
          <div className={styles.navSection}>{ar?"التشغيل":"Operate"}</div>
          {links.slice(0,5).map(({href,label,icon:Icon,exact})=>{const active=exact?pathname===href:pathname.startsWith(href);return <Link key={href} href={href} className={active?styles.active:""}><Icon size={18}/><span>{label}</span></Link>;})}
          <div className={styles.navSection}>{ar?"النمو":"Grow"}</div>
          {links.slice(5,7).map(({href,label,icon:Icon})=>{const active=pathname.startsWith(href);return <Link key={href} href={href} className={active?styles.active:""}><Icon size={18}/><span>{label}</span></Link>;})}
          <div className={styles.navSection}>{ar?"الشركة":"Company"}</div>
          {links.slice(7).map(({href,label,icon:Icon})=>{const active=pathname.startsWith(href);return <Link key={href} href={href} className={active?styles.active:""}><Icon size={18}/><span>{label}</span></Link>;})}
        </nav>
        <div className={styles.sidebarFoot}><Link href="/?service=cars"><CarFront size={16}/>{ar?"العودة إلى HandMeKey Cars":"Back to HandMeKey Cars"}</Link></div>
      </aside>
      <section className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.topbarTitle}><small>HandMeKey Cars Partner</small><strong>{companyName}</strong></div>
          <div className={styles.topbarStatus}><span className={`${styles.status} ${verified?styles.verified:""}`}>{verified&&<ShieldCheck size={13}/>} {verified?(ar?"شركة موثقة":"Verified company"):(ar?"بانتظار التوثيق":"Verification pending")}</span><span className={styles.status}>{status}</span></div>
        </header>
        <div className={styles.workspace}>{children}</div>
      </section>
    </div>
  </main>;
}

export {styles as carPartnerStyles};
