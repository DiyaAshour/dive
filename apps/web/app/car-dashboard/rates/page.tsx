import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeDollarSign, CarFront } from "lucide-react";
import { getCarCompanyForUser, listCarCompanyVehicles } from "@platform/server";
import { CarPartnerShell } from "@/components/car-partner-shell";
import styles from "@/components/car-partner-shell.module.css";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic="force-dynamic";

export default async function CarRatesPage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/car-dashboard/rates");
  const company=await getCarCompanyForUser(user.id);
  if(!company)redirect("/cars/partner");
  const vehicles=await listCarCompanyVehicles(user.id);
  const ar=market.baseLocale==="ar";
  return <CarPartnerShell companyName={company.company.name} status={company.company.status} verified={company.company.verified} locale={market.baseLocale}>
    <div className={styles.pageHead}><div><span>Operate · Rates & Availability</span><h1>{ar?"الأسعار والتوفر":"Rates & availability"}</h1><p>{ar?"الأسعار الأساسية لكل سيارة موجودة هنا. المرحلة التالية تضيف تقويم يومي لتغيير السعر والتوفر حسب التاريخ.":"Base vehicle pricing lives here. The next layer adds a daily calendar for date-specific rates and availability."}</p></div><Link className={styles.secondary} href="/car-dashboard/fleet"><CarFront size={16}/>{ar?"إدارة الأسطول":"Manage fleet"}</Link></div>
    <section className={styles.panel}>{vehicles.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{ar?"السيارة":"Vehicle"}</th><th>{ar?"الفئة":"Category"}</th><th>{ar?"السعر اليومي":"Daily rate"}</th><th>{ar?"الوديعة":"Deposit"}</th><th>{ar?"إلغاء مجاني":"Free cancellation"}</th><th>{ar?"كيلومترات":"Mileage"}</th><th>{ar?"الحالة":"Status"}</th></tr></thead><tbody>{vehicles.map((v)=><tr key={v.id}><td><strong>{v.make} {v.model}</strong><div>{v.year}</div></td><td>{v.category}</td><td><strong>{v.dailyPrice.toFixed(2)} {company.company.currency}</strong></td><td>{v.deposit.toFixed(2)} {company.company.currency}</td><td>{v.freeCancellation?"✓":"—"}</td><td>{v.unlimitedMileage?(ar?"غير محدودة":"Unlimited"):(ar?"محددة":"Limited")}</td><td><span className={`${styles.chip} ${v.status==="ACTIVE"?styles.chipActive:""}`}>{v.status}</span></td></tr>)}</tbody></table></div>:<div className={styles.empty}><span className={styles.emptyIcon}><BadgeDollarSign size={24}/></span><h3>{ar?"أضف سيارة أولًا":"Add a vehicle first"}</h3><p>{ar?"بمجرد إضافة السيارات ستظهر أسعارها الأساسية هنا.":"Vehicle base rates will appear here as soon as you add fleet inventory."}</p><Link className={styles.primary} href="/car-dashboard/fleet">{ar?"أضف سيارة":"Add vehicle"}</Link></div>}</section>
  </CarPartnerShell>;
}
