import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, CarFront, CheckCircle2, CircleDollarSign, Gauge, Images, MapPin, Save, Settings2, ShieldCheck, Wrench } from "lucide-react";
import { getAdminCarVehicle, getAdminNavigationCounts } from "@platform/server";
import { AdminShell } from "@/components/admin-shell";
import { currentAdminPrincipal } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { updateCompanyFleetVehicle } from "../../../actions";
import styles from "../../../cars-admin.module.css";

export const dynamic = "force-dynamic";
export const metadata = {title: "Edit fleet vehicle · HandMeKey"};

export default async function AdminCompanyFleetVehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{companyId: string; vehicleId: string}>;
  searchParams: Promise<{saved?: string}>;
}) {
  const {companyId, vehicleId} = await params;
  const query = await searchParams;
  const principal = await currentAdminPrincipal();
  if (!principal) redirect(`/admin/login?next=${encodeURIComponent(`/admin/cars/companies/${companyId}/fleet/${vehicleId}`)}`);
  const locale = await requestLocale();
  const ar = locale === "ar";
  const [vehicle, counts] = await Promise.all([
    getAdminCarVehicle(principal.user.id, companyId, vehicleId),
    getAdminNavigationCounts(principal.user.id),
  ]);

  return <AdminShell locale={locale} principal={principal} active="cars" counts={counts}>
    <div className="adminBreadcrumb">
      <Link href={`/admin/cars/companies/${companyId}`}><ArrowLeft size={15}/>{ar ? "العودة إلى الشركة" : "Back to company"}</Link>
      <span>/</span><strong>{vehicle.make} {vehicle.model}</strong>
    </div>

    <div className={styles.detailHeader}>
      <div>
        <span className="eyebrow">HandMeKey Cars · Fleet Control</span>
        <h1>{ar ? "تعديل سيارة الشركة" : "Edit company fleet vehicle"}</h1>
        <p>{vehicle.company.name} · {vehicle.make} {vehicle.model} · {vehicle.year}</p>
      </div>
      <div className={styles.governance}>
        <Status value={vehicle.status}/>
        {vehicle.catalog ? <span className={styles.verified}><BadgeCheck size={15}/>{ar ? "مرتبطة بالمجسم" : "Visual matched"}</span> : <span className={styles.status}>{ar ? "بدون مجسم مطابق" : "No exact visual"}</span>}
      </div>
    </div>

    {query.saved === "1" ? <div className={styles.successBanner}><CheckCircle2 size={18}/><div><strong>{ar ? "تم حفظ السيارة" : "Vehicle saved"}</strong><span>{ar ? "تم تحديث بيانات الأسطول على مستوى المنصة." : "The fleet record has been updated across the platform."}</span></div></div> : null}

    <form action={updateCompanyFleetVehicle} className={styles.vehicleEditForm}>
      <input type="hidden" name="companyId" value={companyId}/>
      <input type="hidden" name="vehicleId" value={vehicleId}/>

      <div className={styles.editGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "الهوية" : "Identity"}</span><h2>{ar ? "الماركة والموديل" : "Make & model"}</h2><p>{ar ? "هذه البيانات تظهر للعميل وفي البحث والحجز." : "These fields drive customer-facing search and booking."}</p></div><CarFront size={20}/></div>
          <div className={styles.formGrid}>
            <Field label={ar ? "الماركة" : "Make"}><input name="make" required defaultValue={vehicle.make}/></Field>
            <Field label={ar ? "الموديل" : "Model"}><input name="model" required defaultValue={vehicle.model}/></Field>
            <Field label={ar ? "السنة" : "Year"}><input name="year" type="number" min="1990" max={new Date().getUTCFullYear() + 1} required defaultValue={vehicle.year}/></Field>
            <Field label={ar ? "الفئة" : "Category"}><input name="category" required defaultValue={vehicle.category}/></Field>
            <Field label={ar ? "حالة السيارة" : "Vehicle status"}><select name="status" defaultValue={vehicle.status}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="MAINTENANCE">MAINTENANCE</option></select></Field>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "المواصفات" : "Specifications"}</span><h2>{ar ? "المواصفات الأساسية" : "Core specifications"}</h2><p>{ar ? "عدّل المواصفات التي يعتمد عليها العميل عند المقارنة." : "Edit the specs customers use when comparing cars."}</p></div><Gauge size={20}/></div>
          <div className={styles.formGrid}>
            <Field label={ar ? "ناقل الحركة" : "Transmission"}><select name="transmission" defaultValue={vehicle.transmission}><option value="AUTOMATIC">{ar ? "أوتوماتيك" : "Automatic"}</option><option value="MANUAL">{ar ? "عادي" : "Manual"}</option></select></Field>
            <Field label={ar ? "الوقود" : "Fuel"}><select name="fuel" defaultValue={vehicle.fuel}><option value="PETROL">{ar ? "بنزين" : "Petrol"}</option><option value="DIESEL">{ar ? "ديزل" : "Diesel"}</option><option value="HYBRID">Hybrid</option><option value="ELECTRIC">{ar ? "كهرباء" : "Electric"}</option></select></Field>
            <Field label={ar ? "المقاعد" : "Seats"}><input name="seats" type="number" min="1" max="16" required defaultValue={vehicle.seats}/></Field>
            <Field label={ar ? "الحقائب" : "Bags"}><input name="bags" type="number" min="0" max="20" required defaultValue={vehicle.bags}/></Field>
            <Field label={ar ? "الأبواب" : "Doors"}><input name="doors" type="number" min="2" max="8" required defaultValue={vehicle.doors}/></Field>
          </div>
          <label className={styles.toggleRow}><input type="checkbox" name="airConditioning" defaultChecked={vehicle.airConditioning}/><span><strong>{ar ? "مكيف" : "Air conditioning"}</strong><small>{ar ? "السيارة تحتوي على تكييف." : "Vehicle includes air conditioning."}</small></span></label>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "السعر والتشغيل" : "Pricing & operations"}</span><h2>{ar ? "السعر والوديعة والفرع" : "Price, deposit & location"}</h2><p>{ar ? "التغييرات هنا تؤثر على الحجوزات الجديدة فقط؛ الحجز المؤكد يحتفظ بسعره المحفوظ." : "Changes here affect new bookings; confirmed reservations keep their stored booking price."}</p></div><CircleDollarSign size={20}/></div>
          <div className={styles.formGrid}>
            <Field label={`${ar ? "السعر اليومي" : "Daily price"} (${vehicle.company.currency})`}><input name="dailyPrice" type="number" min="0.01" step="0.01" required defaultValue={vehicle.dailyPrice}/></Field>
            <Field label={`${ar ? "الوديعة" : "Deposit"} (${vehicle.company.currency})`}><input name="deposit" type="number" min="0.01" step="0.01" required defaultValue={vehicle.deposit}/></Field>
            <Field label={ar ? "الفرع الرئيسي" : "Home location"}><select name="homeLocationId" defaultValue={vehicle.homeLocationId ?? ""}><option value="">{ar ? "بدون فرع محدد" : "No specific location"}</option>{vehicle.locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.city}{location.active ? "" : ar ? " · غير فعال" : " · inactive"}</option>)}</select></Field>
          </div>
          <div className={styles.toggleGrid}>
            <label className={styles.toggleRow}><input type="checkbox" name="freeCancellation" defaultChecked={vehicle.freeCancellation}/><span><strong>{ar ? "إلغاء مجاني" : "Free cancellation"}</strong><small>{ar ? "يظهر ضمن مزايا السيارة." : "Shown as a vehicle benefit."}</small></span></label>
            <label className={styles.toggleRow}><input type="checkbox" name="unlimitedMileage" defaultChecked={vehicle.unlimitedMileage}/><span><strong>{ar ? "كيلومترات غير محدودة" : "Unlimited mileage"}</strong><small>{ar ? "لا يوجد حد كيلومترات على هذا العرض." : "No mileage cap on this vehicle offer."}</small></span></label>
            <label className={styles.toggleRow}><input type="checkbox" name="airportPickup" defaultChecked={vehicle.airportPickup}/><span><strong>{ar ? "استلام من المطار" : "Airport pickup"}</strong><small>{ar ? "السيارة متاحة ضمن عروض المطار." : "Vehicle can be offered for airport pickup."}</small></span></label>
          </div>
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}><div><span className="eyebrow">{ar ? "المجسم والصورة" : "Visual identity"}</span><h2>{ar ? "ارتباط مكتبة HandMeKey" : "HandMeKey catalog match"}</h2></div><Images size={20}/></div>
          {vehicle.catalog ? <div className={styles.visualMatchCard}>
            {vehicle.catalog.primaryImageUrl ? <div className={styles.visualPreview}><img src={vehicle.catalog.primaryImageUrl} alt={`${vehicle.catalog.make} ${vehicle.catalog.model}`}/></div> : null}
            <strong>{vehicle.catalog.make} {vehicle.catalog.model}{vehicle.catalog.trim ? ` ${vehicle.catalog.trim}` : ""} · {vehicle.catalog.year}</strong>
            <span>{[vehicle.catalog.generation, vehicle.catalog.provider].filter(Boolean).join(" · ")}</span>
            <small>{ar ? "إذا غيّرت الماركة أو الموديل أو السنة، سيُلغى هذا الربط تلقائيًا حتى لا يظهر مجسم خاطئ للعميل." : "If make, model or year changes, this match is cleared automatically so customers never see the wrong visual."}</small>
          </div> : <div className={styles.empty}>{ar ? "هذه السيارة غير مرتبطة حاليًا بموديل مرئي دقيق. يمكنك تجهيز المجسم من مكتبة السيارات." : "This vehicle is not linked to an exact visual yet. Prepare the matching cutout from the vehicle catalog."}</div>}
          <div className={styles.vehicleEditorLinks}>
            <Link href="/admin/cars/catalog"><Images size={14}/>{ar ? "فتح مكتبة المجسمات" : "Open visual catalog"}</Link>
            <Link href={`/admin/cars/companies/${companyId}`}><MapPin size={14}/>{ar ? "العودة لصفحة الشركة" : "Back to company"}</Link>
          </div>
        </aside>
      </div>

      <div className={styles.stickySaveBar}>
        <div><Settings2 size={18}/><span><strong>{vehicle.make} {vehicle.model}</strong><small>{ar ? "أنت تعدّل أسطول شركة من Control Center" : "Editing partner fleet from Cars Control Center"}</small></span></div>
        <div className={styles.saveActions}><Link href={`/admin/cars/companies/${companyId}`}>{ar ? "إلغاء" : "Cancel"}</Link><button type="submit"><Save size={15}/>{ar ? "حفظ التعديلات" : "Save changes"}</button></div>
      </div>
    </form>
  </AdminShell>;
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <label className={styles.formField}><span>{label}</span>{children}</label>;
}

function Status({value}: {value: string}) {
  const icon = value === "MAINTENANCE" ? <Wrench size={12}/> : value === "ACTIVE" ? <ShieldCheck size={12}/> : null;
  return <span className={`${styles.status} ${styles[value.toLowerCase()] ?? ""}`}>{icon}{value.replaceAll("_", " ")}</span>;
}
