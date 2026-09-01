import { redirect } from "next/navigation";
import { Settings2, ShieldCheck } from "lucide-react";
import { getCarCompanyForUser } from "@platform/server";
import { CarPartnerShell } from "@/components/car-partner-shell";
import styles from "@/components/car-partner-shell.module.css";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { currentUser } from "@/lib/server-session";

export const dynamic="force-dynamic";

export default async function CarSettingsPage(){
  const [user,market]=await Promise.all([currentUser(),requestGuestMarket()]);
  if(!user)redirect("/login?next=/car-dashboard/settings");
  const data=await getCarCompanyForUser(user.id);
  if(!data)redirect("/cars/partner");
  const ar=market.baseLocale==="ar";
  const company=data.company;
  return <CarPartnerShell companyName={company.name} status={company.status} verified={company.verified} locale={market.baseLocale}>
    <div className={styles.pageHead}><div><span>Company · Settings</span><h1>{ar?"إعدادات شركة التأجير":"Rental company settings"}</h1><p>{ar?"هوية الشركة وبيانات الدعم والحالة التشغيلية الخاصة بقسم السيارات.":"Company identity, support details and Cars operating status."}</p></div></div>
    <section className={styles.formCard}><div className={styles.notice}><Settings2 size={18}/><span>{ar?"هذه البيانات حية من سجل شركة التأجير. تعديلها المباشر سيضاف مع صلاحيات الأدوار وسجل التدقيق.":"These values are live from the rental company record. Direct editing will be added with role permissions and audit history."}</span></div><div className={styles.formGrid}>
      <Read label={ar?"اسم الشركة":"Company name"} value={company.name}/><Read label={ar?"الحالة":"Status"} value={company.status}/><Read label={ar?"المدينة":"City"} value={company.city}/><Read label={ar?"الدولة":"Country"} value={company.countryCode}/><Read label={ar?"العملة":"Currency"} value={company.currency}/><Read label={ar?"المنطقة الزمنية":"Timezone"} value={company.timezone}/><Read label={ar?"بريد الدعم":"Support email"} value={company.supportEmail??"—"}/><Read label={ar?"هاتف الدعم":"Support phone"} value={company.supportPhone??"—"}/><div className={`${styles.field} ${styles.fieldFull}`}><span>{ar?"التوثيق":"Verification"}</span><div className={company.verified?styles.success:""}><ShieldCheck size={15}/> {company.verified?(ar?"موثقة":"Verified"):(ar?"بانتظار المراجعة":"Pending review")}</div></div>
    </div></section>
  </CarPartnerShell>;
}
function Read({label,value}:{label:string;value:string}){return <div className={styles.field}><span>{label}</span><input value={value} readOnly/></div>}
