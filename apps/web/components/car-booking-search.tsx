"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, Clock, MapPin, Search, Users, X } from "lucide-react";
import styles from "./car-booking-search.module.css";

type Locale = "ar" | "en";

type Props = Readonly<{
  locale: Locale;
  defaultPickupDate: string;
  defaultReturnDate: string;
}>;

const CAR_BRANDS = [
  "Toyota",
  "Hyundai",
  "Kia",
  "Nissan",
  "Honda",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Volkswagen",
  "Ford",
  "Chevrolet",
  "Lexus",
  "Tesla",
  "BYD",
  "MG",
  "Geely",
  "Land Rover",
  "Mazda",
  "Mitsubishi",
  "Suzuki",
  "Jeep",
] as const;

type CarBrand = (typeof CAR_BRANDS)[number];

export function CarBookingSearch({locale, defaultPickupDate, defaultReturnDate}: Props) {
  const [sameDropoff, setSameDropoff] = useState(true);
  const [brand, setBrand] = useState<CarBrand | "">("");
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");
  const brandPickerRef = useRef<HTMLDivElement>(null);

  const copy = locale === "ar" ? {
    pickup: "مكان الاستلام",
    pickupPlaceholder: "عمّان - مطار الملكة علياء",
    dropoff: "مكان التسليم",
    sameDropoff: "نفس مكان الاستلام",
    pickupDate: "تاريخ الاستلام",
    pickupTime: "وقت الاستلام",
    returnDate: "تاريخ التسليم",
    returnTime: "وقت التسليم",
    driverAge: "عمر السائق",
    driverAgeValue: "30 - 65 سنة",
    brand: "الماركة",
    brandHint: "اختياري",
    anyBrand: "أي ماركة",
    chooseBrand: "اختر الماركة",
    brandSearch: "ابحث عن الماركة",
    popularBrands: "الماركات",
    clearBrand: "إلغاء اختيار الماركة",
    noBrands: "لا توجد ماركة بهذا الاسم",
    search: "ابحث عن سيارة",
  } : {
    pickup: "Pick-up location",
    pickupPlaceholder: "Amman - Queen Alia Airport",
    dropoff: "Drop-off location",
    sameDropoff: "Same as pick-up",
    pickupDate: "Pick-up date",
    pickupTime: "Pick-up time",
    returnDate: "Return date",
    returnTime: "Return time",
    driverAge: "Driver age",
    driverAgeValue: "30 - 65 years",
    brand: "Brand",
    brandHint: "Optional",
    anyBrand: "Any brand",
    chooseBrand: "Choose brand",
    brandSearch: "Search brands",
    popularBrands: "Brands",
    clearBrand: "Clear brand",
    noBrands: "No matching brand",
    search: "Search cars",
  };

  const filteredBrands = useMemo(() => {
    const query = brandQuery.trim().toLowerCase();
    if (!query) return CAR_BRANDS;
    return CAR_BRANDS.filter((item) => item.toLowerCase().includes(query));
  }, [brandQuery]);

  useEffect(() => {
    if (!brandOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (brandPickerRef.current && !brandPickerRef.current.contains(event.target as Node)) {
        setBrandOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setBrandOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [brandOpen]);

  function chooseBrand(value: CarBrand) {
    setBrand(value);
    setBrandQuery("");
    setBrandOpen(false);
  }

  return <div className={styles.root}>
    <form className={styles.dock} action="/cars" method="get">
      <label className={`${styles.field} ${styles.locationField}`}>
        <span className={styles.label}><MapPin size={15}/>{copy.pickup}</span>
        <input name="pickup" defaultValue={copy.pickupPlaceholder} required/>
      </label>

      <div className={`${styles.field} ${styles.dropoffField}`}>
        <span className={styles.label}><MapPin size={15}/>{copy.dropoff}</span>
        <label className={styles.switchRow}>
          <button
            type="button"
            className={`${styles.switch} ${sameDropoff ? styles.switchOn : ""}`}
            role="switch"
            aria-checked={sameDropoff}
            aria-label={copy.sameDropoff}
            onClick={() => setSameDropoff((value) => !value)}
          ><span/></button>
          <strong>{copy.sameDropoff}</strong>
        </label>
        {!sameDropoff && <input className={styles.dropoffInput} name="dropoff" placeholder={copy.dropoff}/>} 
        {sameDropoff && <input type="hidden" name="dropoff" value="same"/>}
      </div>

      <label className={styles.field}>
        <span className={styles.label}><CalendarDays size={15}/>{copy.pickupDate}</span>
        <input name="pickupDate" type="date" defaultValue={defaultPickupDate} required/>
      </label>

      <label className={styles.field}>
        <span className={styles.label}><Clock size={15}/>{copy.pickupTime}</span>
        <input name="pickupTime" type="time" defaultValue="10:00" required/>
      </label>

      <label className={styles.field}>
        <span className={styles.label}><CalendarDays size={15}/>{copy.returnDate}</span>
        <input name="returnDate" type="date" defaultValue={defaultReturnDate} required/>
      </label>

      <label className={styles.field}>
        <span className={styles.label}><Clock size={15}/>{copy.returnTime}</span>
        <input name="returnTime" type="time" defaultValue="10:00" required/>
      </label>

      <label className={`${styles.field} ${styles.ageField}`}>
        <span className={styles.label}><Users size={15}/>{copy.driverAge}</span>
        <select name="driverAge" defaultValue="30-65">
          <option value="18-24">18 - 24</option>
          <option value="25-29">25 - 29</option>
          <option value="30-65">{copy.driverAgeValue}</option>
          <option value="66+">66+</option>
        </select>
      </label>

      <div className={`${styles.field} ${styles.brandField}`} ref={brandPickerRef}>
        <span className={styles.brandLabel}><span>{copy.brand}</span><small>{copy.brandHint}</small></span>
        <button
          className={`${styles.brandTrigger} ${brand ? styles.brandTriggerSelected : ""}`}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={brandOpen}
          onClick={() => setBrandOpen((current) => !current)}
        >
          <span className={styles.brandTriggerText}>
            {brand ? <><BrandBadge brand={brand}/><strong>{brand}</strong></> : <strong>{copy.chooseBrand}</strong>}
          </span>
          <ChevronDown size={16} className={brandOpen ? styles.chevronOpen : ""}/>
        </button>

        {brandOpen && <div className={styles.brandPopover}>
          <div className={styles.brandPopoverHead}>
            <div>
              <strong>{copy.brand}</strong>
              <span>{copy.anyBrand}</span>
            </div>
            <button type="button" className={styles.brandClose} aria-label={copy.clearBrand} onClick={() => setBrandOpen(false)}><X size={17}/></button>
          </div>

          <label className={styles.brandSearch}>
            <Search size={16}/>
            <input autoFocus value={brandQuery} onChange={(event) => setBrandQuery(event.target.value)} placeholder={copy.brandSearch}/>
            {brandQuery && <button type="button" aria-label={copy.clearBrand} onClick={() => setBrandQuery("")}><X size={14}/></button>}
          </label>

          <span className={styles.brandSectionTitle}>{copy.popularBrands}</span>
          <div className={styles.brandGrid} role="listbox" aria-label={copy.brand}>
            {filteredBrands.map((item) => {
              const active = brand === item;
              return <button
                type="button"
                key={item}
                role="option"
                aria-selected={active}
                className={`${styles.brandOption} ${active ? styles.brandOptionActive : ""}`}
                onClick={() => chooseBrand(item)}
              >
                <BrandBadge brand={item}/>
                <span>{item}</span>
                {active && <Check size={15}/>} 
              </button>;
            })}
          </div>

          {filteredBrands.length === 0 && <div className={styles.brandEmpty}>{copy.noBrands}</div>}

          {brand && <button type="button" className={styles.clearBrandButton} onClick={() => {setBrand("");setBrandQuery("");setBrandOpen(false);}}>{copy.clearBrand}</button>}
        </div>}

        {brand && <input type="hidden" name="brand" value={brand}/>} 
      </div>

      <button className={styles.searchButton} type="submit"><Search size={20}/><span>{copy.search}</span></button>
    </form>
  </div>;
}

function BrandBadge({brand}: {brand: CarBrand}) {
  const short = brand === "Mercedes-Benz" ? "MB" : brand === "Land Rover" ? "LR" : brand.slice(0, 2).toUpperCase();
  return <span className={styles.brandBadge} aria-hidden="true">{short}</span>;
}
