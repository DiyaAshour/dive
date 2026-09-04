import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, Car, Fuel, Gauge, Headphones, ShieldCheck, Tag, Users } from "lucide-react";
import { CarsHomeSearch } from "@/components/cars-home-search";
import { demoCars } from "@/lib/demo-cars";
import styles from "./cars-home-experience.module.css";
import polish from "./cars-home-polish.module.css";
import backgroundFix from "./cars-home-background-fix.module.css";
import copyFix from "./cars-home-copy-fix.module.css";
import directionalHero from "./cars-home-directional-hero.module.css";

type Locale = "ar" | "en";
type HeroProps = Readonly<{locale: Locale; defaultPickupDate: string; defaultReturnDate: string}>;
type ShowcaseProps = Readonly<{locale: Locale}>;

const categoryConfig = [
  {id: "kia-picanto", ar: "سيارات صغيرة", en: "Small cars"},
  {id: "toyota-yaris", ar: "سيارات اقتصادية", en: "Economy cars"},
  {id: "kia-carnival", ar: "سيارات عائلية", en: "Family cars"},
  {id: "toyota-rav4", ar: "سيارات SUV", en: "SUVs"},
  {id: "nissan-patrol", ar: "سيارات فاخرة", en: "Luxury cars"},
] as const;

const popularIds = ["toyota-corolla", "kia-sportage", "hyundai-elantra", "nissan-xtrail", "toyota-prado"] as const;

export function CarsHomeHero({locale, defaultPickupDate, defaultReturnDate}: HeroProps) {
  const ar = locale === "ar";
  const copy = ar ? {
    kicker: "انطلق بثقة. واستمتع بالطريق.",
    lineOne: "رحلتك تبدأ",
    lineTwo: "من هنا",
    intro: "قارن بين شركات تأجير موثوقة، وشاهد الأسعار بوضوح، واحجز سيارتك بخطوات بسيطة.",
    clear: "أسعار واضحة",
    clearSub: "بدون رسوم مخفية",
    trusted: "شركات موثوقة",
    trustedSub: "شركات معتمدة",
    support: "دعم 24/7",
    supportSub: "معك وقتما تحتاجنا",
    explore: "Explore Jordan",
    rental: "تأجير السيارات",
    transfer: "نقل من المطار",
    comingSoon: "قريبًا",
  } : {
    kicker: "DRIVE WITH CONFIDENCE.",
    lineOne: "Your journey",
    lineTwo: "starts here.",
    intro: "Compare trusted rental companies, see clear prices, and book your car in just a few steps.",
    clear: "Clear pricing",
    clearSub: "No hidden fees",
    trusted: "Trusted rentals",
    trustedSub: "Verified companies",
    support: "24/7 support",
    supportSub: "Here when you need us",
    explore: "Explore Jordan",
    rental: "Car rental",
    transfer: "Airport transfer",
    comingSoon: "Soon",
  };

  return <>
    <div
      className={`${styles.heroScene} ${polish.heroScene} ${backgroundFix.heroScene} ${directionalHero.heroScene}`}
      data-cars-reference="true"
      style={{"--hero-full-bg": 'url("/images/cars/hero-amman-hq.webp")'} as React.CSSProperties}
    >
      <div className={`${styles.heroInner} ${polish.heroInner} ${directionalHero.heroInner}`}>
        <div className={`${styles.heroCopy} ${polish.heroCopy} ${backgroundFix.heroCopy} ${copyFix.heroCopy} ${directionalHero.heroCopy} ${ar ? styles.rtlCopy : styles.ltrCopy}`}>
          <span className={`${styles.kicker} ${polish.kicker} ${backgroundFix.kicker} ${copyFix.kicker}`}>{copy.kicker}</span>
          <h1><span>{copy.lineOne}</span><strong>{copy.lineTwo}</strong></h1>
          <p>{copy.intro}</p>
          <div className={`${styles.trustRow} ${polish.trustRow} ${copyFix.trustRow}`}>
            <div><span><Tag size={21}/></span><p><strong>{copy.clear}</strong><small>{copy.clearSub}</small></p></div>
            <div><span><ShieldCheck size={21}/></span><p><strong>{copy.trusted}</strong><small>{copy.trustedSub}</small></p></div>
            <div><span><Headphones size={21}/></span><p><strong>{copy.support}</strong><small>{copy.supportSub}</small></p></div>
          </div>
        </div>

        <div className={`${styles.heroVisual} ${polish.heroVisual} ${backgroundFix.heroVisual} ${directionalHero.heroVisual}`}>
          <div className={`${styles.exploreMark} ${polish.exploreMark} ${backgroundFix.exploreMark} ${directionalHero.exploreMark}`}>{copy.explore}</div>
        </div>
      </div>
    </div>

    <div className={`${styles.searchShell} ${polish.searchShell} ${backgroundFix.searchShell}`}>
      <div className={`${styles.searchModes} ${polish.searchModes}`} aria-label={ar ? "نوع خدمة السيارات" : "Car service type"}>
        <span className={`${styles.searchModeActive} ${polish.searchModeActive}`}><Car size={17}/>{copy.rental}</span>
        <span className={styles.searchModeDisabled} aria-disabled="true"><BadgeCheck size={16}/>{copy.transfer}<small>{copy.comingSoon}</small></span>
      </div>
      <CarsHomeSearch locale={locale} defaultPickupDate={defaultPickupDate} defaultReturnDate={defaultReturnDate}/>
    </div>
  </>;
}

export function CarsHomeShowcase({locale}: ShowcaseProps) {
  const ar = locale === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const copy = ar ? {
    categories: "استكشف حسب الفئة",
    allCategories: "عرض جميع الفئات",
    popular: "أكثر السيارات طلبًا",
    popularSub: "اختر من مجموعة واسعة من السيارات بأسعار واضحة للحجز.",
    allCars: "عرض جميع السيارات",
    perDay: "في اليوم",
    featured: "مميز",
    discount: "خصم 15%",
    seats: "مقاعد",
    bags: "حقائب",
    automatic: "أوتوماتيك",
  } : {
    categories: "Explore by category",
    allCategories: "View all categories",
    popular: "Most requested cars",
    popularSub: "Choose from a wide range of cars with clear daily pricing.",
    allCars: "View all cars",
    perDay: "per day",
    featured: "Featured",
    discount: "15% off",
    seats: "seats",
    bags: "bags",
    automatic: "Automatic",
  };

  const categories = categoryConfig.map((item) => ({...item, car: demoCars.find((car) => car.id === item.id)})).filter((item) => item.car);
  const popular = popularIds.map((id) => demoCars.find((car) => car.id === id)).filter(Boolean) as typeof demoCars;

  return <div className={`${styles.showcase} ${polish.showcase}`}>
    <section className={`${styles.section} ${polish.section}`}>
      <div className={styles.sectionHead}>
        <h2>{copy.categories}</h2>
        <Link href="/cars">{copy.allCategories}<Arrow size={17}/></Link>
      </div>
      <div className={`${styles.categoryGrid} ${polish.categoryGrid}`}>
        {categories.map(({car, ar: arLabel, en: enLabel}) => car && <Link className={`${styles.categoryCard} ${polish.categoryCard}`} key={car.id} href={`/cars?brand=${encodeURIComponent(car.brand)}`}>
          <div className={`${styles.categoryImage} ${polish.categoryImage}`}><img src={car.image} alt={car.imageAlt} loading="lazy" decoding="async"/></div>
          <strong>{ar ? arLabel : enLabel}</strong>
        </Link>)}
      </div>
    </section>

    <section className={`${styles.section} ${styles.popularSection} ${polish.section}`}>
      <div className={styles.sectionHead}>
        <div><h2>{copy.popular}</h2><p>{copy.popularSub}</p></div>
        <Link href="/cars">{copy.allCars}<Arrow size={17}/></Link>
      </div>
      <div className={`${styles.popularGrid} ${polish.popularGrid}`}>
        {popular.map((car,index) => {
          const discounted = index === 2;
          const displayedPrice = discounted ? Math.round(car.dailyPrice * .85) : car.dailyPrice;
          return <Link href={`/cars?brand=${encodeURIComponent(car.brand)}`} className={`${styles.carCard} ${polish.carCard}`} key={car.id}>
            <div className={`${styles.carCardMedia} ${polish.carCardMedia}`}>
              {index === 0 || index === 4 ? <span className={styles.featureBadge}>{copy.featured}</span> : null}
              {discounted ? <span className={styles.discountBadge}>{copy.discount}</span> : null}
              <img src={car.image} alt={car.imageAlt} loading="lazy" decoding="async"/>
            </div>
            <div className={styles.carCardBody}>
              <h3>{car.brand} {car.model}</h3>
              <div className={styles.specs}>
                <span><Users size={14}/>{car.seats}</span>
                <span><BriefcaseBusiness size={14}/>{car.bags}</span>
                <span><Gauge size={14}/>{ar ? copy.automatic : car.transmission}</span>
                <span><Fuel size={14}/>{car.fuel}</span>
              </div>
              <div className={styles.priceLine}>
                <div>{discounted ? <del>{car.dailyPrice} JOD</del> : null}<strong>{displayedPrice} JOD</strong><span>{copy.perDay}</span></div>
                <span className={styles.cardArrow}><Arrow size={18}/></span>
              </div>
            </div>
          </Link>;
        })}
      </div>
    </section>
  </div>;
}
