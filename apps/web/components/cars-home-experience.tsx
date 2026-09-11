import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, Car, Fuel, Gauge, Headphones, ShieldCheck, Tag, Users } from "lucide-react";
import type { LiveCar } from "@/components/cars-live-marketplace";
import { CarsHomeSearch } from "@/components/cars-home-search";
import { demoCars } from "@/lib/demo-cars";
import styles from "./cars-home-experience.module.css";
import polish from "./cars-home-polish.module.css";
import backgroundFix from "./cars-home-background-fix.module.css";
import copyFix from "./cars-home-copy-fix.module.css";
import directionalHero from "./cars-home-directional-hero.module.css";
import mobileHero from "./cars-home-mobile-hero.module.css";

type Locale = "ar" | "en";
type HeroProps = Readonly<{locale: Locale; defaultPickupDate: string; defaultReturnDate: string}>;
type ShowcaseProps = Readonly<{locale: Locale; cars?: readonly LiveCar[]}>;
type ShowcaseCar = Readonly<{
  id: string;
  brand: string;
  model: string;
  category: string;
  transmission: string;
  fuel: string;
  seats: number;
  bags: number;
  dailyPrice: number;
  image: string;
  imageAlt: string;
}>;

const categoryConfig = [
  {id: "small", ar: "سيارات صغيرة", en: "Small cars"},
  {id: "economy", ar: "سيارات اقتصادية", en: "Economy cars"},
  {id: "family", ar: "سيارات عائلية", en: "Family cars"},
  {id: "suv", ar: "سيارات SUV", en: "SUVs"},
  {id: "luxury", ar: "سيارات فاخرة", en: "Luxury cars"},
] as const;

const popularIds = ["toyota-corolla", "kia-sportage", "hyundai-elantra", "nissan-xtrail", "toyota-prado"] as const;

function fallbackCarImage() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#f5f7f9"/><path d="M290 485h620l-66-151c-18-41-55-67-99-67H475c-44 0-83 26-101 67L290 485Z" fill="#dfe6ec"/><path d="M230 498c0-38 31-69 69-69h602c38 0 69 31 69 69v88c0 31-25 56-56 56H286c-31 0-56-25-56-56v-88Z" fill="#17324d"/><circle cx="375" cy="620" r="72" fill="#102840"/><circle cx="825" cy="620" r="72" fill="#102840"/><circle cx="375" cy="620" r="34" fill="#eef2f5"/><circle cx="825" cy="620" r="34" fill="#eef2f5"/><text x="600" y="730" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="#8a98a6">HandMeKey Cars</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function handleCarImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = fallbackCarImage();
}

function demoShowcaseCar(car: (typeof demoCars)[number]): ShowcaseCar {
  return {
    id: car.id,
    brand: car.brand,
    model: car.model,
    category: car.category,
    transmission: car.transmission,
    fuel: car.fuel,
    seats: car.seats,
    bags: car.bags,
    dailyPrice: car.dailyPrice,
    image: car.image,
    imageAlt: car.imageAlt,
  };
}

function liveShowcaseCar(car: LiveCar): ShowcaseCar | null {
  if (!car.imageUrl) return null;
  return {
    id: car.id,
    brand: car.brand,
    model: car.model,
    category: car.category,
    transmission: car.transmission,
    fuel: car.fuel,
    seats: car.seats,
    bags: car.bags,
    dailyPrice: car.dailyPrice,
    image: car.imageUrl,
    imageAlt: car.imageAlt || `${car.brand} ${car.model}`,
  };
}

function categoryMatch(categoryId: (typeof categoryConfig)[number]["id"], car: ShowcaseCar) {
  const category = car.category.toLowerCase();
  if (categoryId === "small") return category === "compact" || category === "economy" || car.seats <= 4;
  if (categoryId === "economy") return category === "economy" || category === "sedan";
  if (categoryId === "family") return category === "van" || car.seats >= 7;
  if (categoryId === "suv") return category === "suv";
  return category === "luxury";
}

function liveCategoryCards(cars: ShowcaseCar[]) {
  const used = new Set<string>();
  return categoryConfig.flatMap((item) => {
    const car = cars.find((candidate) => !used.has(candidate.id) && categoryMatch(item.id, candidate));
    if (!car) return [];
    used.add(car.id);
    return [{...item, car}];
  });
}

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
      className={`${styles.heroScene} ${polish.heroScene} ${backgroundFix.heroScene} ${directionalHero.heroScene} ${mobileHero.heroScene}`}
      data-cars-reference="true"
      style={{"--hero-full-bg": 'url("/images/cars/hero-amman-hq.webp")'} as React.CSSProperties}
    >
      <div className={`${styles.heroInner} ${polish.heroInner} ${directionalHero.heroInner} ${mobileHero.heroInner}`}>
        <div className={`${styles.heroCopy} ${polish.heroCopy} ${backgroundFix.heroCopy} ${copyFix.heroCopy} ${directionalHero.heroCopy} ${mobileHero.heroCopy} ${ar ? styles.rtlCopy : styles.ltrCopy}`}>
          <span className={`${styles.kicker} ${polish.kicker} ${backgroundFix.kicker} ${copyFix.kicker}`}>{copy.kicker}</span>
          <h1><span>{copy.lineOne}</span><strong>{copy.lineTwo}</strong></h1>
          <p>{copy.intro}</p>
          <div className={`${styles.trustRow} ${polish.trustRow} ${copyFix.trustRow} ${mobileHero.trustRow}`}>
            <div><span><Tag size={21}/></span><p><strong>{copy.clear}</strong><small>{copy.clearSub}</small></p></div>
            <div><span><ShieldCheck size={21}/></span><p><strong>{copy.trusted}</strong><small>{copy.trustedSub}</small></p></div>
            <div><span><Headphones size={21}/></span><p><strong>{copy.support}</strong><small>{copy.supportSub}</small></p></div>
          </div>
        </div>

        <div className={`${styles.heroVisual} ${polish.heroVisual} ${backgroundFix.heroVisual} ${directionalHero.heroVisual} ${mobileHero.heroVisual}`}>
          <div className={`${styles.exploreMark} ${polish.exploreMark} ${backgroundFix.exploreMark} ${directionalHero.exploreMark}`}>{copy.explore}</div>
        </div>
      </div>
    </div>

    <div className={`${styles.searchShell} ${polish.searchShell} ${backgroundFix.searchShell} ${mobileHero.searchShell}`}>
      <div className={`${styles.searchModes} ${polish.searchModes}`} aria-label={ar ? "نوع خدمة السيارات" : "Car service type"}>
        <span className={`${styles.searchModeActive} ${polish.searchModeActive}`}><Car size={17}/>{copy.rental}</span>
        <span className={styles.searchModeDisabled} aria-disabled="true"><BadgeCheck size={16}/>{copy.transfer}<small>{copy.comingSoon}</small></span>
      </div>
      <CarsHomeSearch locale={locale} defaultPickupDate={defaultPickupDate} defaultReturnDate={defaultReturnDate}/>
    </div>
  </>;
}

export function CarsHomeShowcase({locale, cars = []}: ShowcaseProps) {
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

  const live = cars.map(liveShowcaseCar).filter((car): car is ShowcaseCar => Boolean(car));
  const useLiveCars = live.length > 0;
  const demo = demoCars.map(demoShowcaseCar);
  const categories = useLiveCars
    ? liveCategoryCards(live)
    : categoryConfig.map((item) => ({...item, car: demo.find((car) => {
        if (item.id === "small") return car.id === "kia-picanto";
        if (item.id === "economy") return car.id === "toyota-yaris";
        if (item.id === "family") return car.id === "kia-carnival";
        if (item.id === "suv") return car.id === "toyota-rav4";
        return car.id === "nissan-patrol";
      })})).filter((item): item is (typeof categoryConfig)[number] & {car: ShowcaseCar} => Boolean(item.car));
  const popular = useLiveCars
    ? live.slice(0, 5)
    : popularIds.map((id) => demo.find((car) => car.id === id)).filter((car): car is ShowcaseCar => Boolean(car));

  return <div className={`${styles.showcase} ${polish.showcase}`}>
    <section className={`${styles.section} ${polish.section}`}>
      <div className={styles.sectionHead}>
        <h2>{copy.categories}</h2>
        <Link href="/cars">{copy.allCategories}<Arrow size={17}/></Link>
      </div>
      <div className={`${styles.categoryGrid} ${polish.categoryGrid}`}>
        {categories.map(({car, ar: arLabel, en: enLabel}) => <Link className={`${styles.categoryCard} ${polish.categoryCard}`} key={`${car.id}-${enLabel}`} href={`/cars?brand=${encodeURIComponent(car.brand)}`}>
          <div className={`${styles.categoryImage} ${polish.categoryImage}`}><img src={car.image} alt={car.imageAlt} loading="lazy" decoding="async" onError={handleCarImageError}/></div>
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
          const discounted = !useLiveCars && index === 2;
          const displayedPrice = discounted ? Math.round(car.dailyPrice * .85) : car.dailyPrice;
          return <Link href={`/cars?brand=${encodeURIComponent(car.brand)}`} className={`${styles.carCard} ${polish.carCard}`} key={car.id}>
            <div className={`${styles.carCardMedia} ${polish.carCardMedia}`}>
              {index === 0 || index === 4 ? <span className={styles.featureBadge}>{copy.featured}</span> : null}
              {discounted ? <span className={styles.discountBadge}>{copy.discount}</span> : null}
              <img src={car.image} alt={car.imageAlt} loading="lazy" decoding="async" onError={handleCarImageError}/>
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
