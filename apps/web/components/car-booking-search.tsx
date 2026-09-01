"use client";

import { useState } from "react";
import { CalendarDays, Clock, MapPin, Search, Users } from "lucide-react";
import styles from "./car-booking-search.module.css";

type Locale = "ar" | "en";
type FeaturedBrand = "Toyota" | "BMW" | "Mercedes-Benz";

type Props = Readonly<{
  locale: Locale;
  defaultPickupDate: string;
  defaultReturnDate: string;
}>;

const FEATURED_BRANDS: ReadonlyArray<{value: FeaturedBrand; label: string}> = [
  {value: "Toyota", label: "Toyota"},
  {value: "BMW", label: "BMW"},
  {value: "Mercedes-Benz", label: "Mercedes"},
];

export function CarBookingSearch({locale, defaultPickupDate, defaultReturnDate}: Props) {
  const [sameDropoff, setSameDropoff] = useState(true);
  const [brand, setBrand] = useState<FeaturedBrand | "">("");
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
    search: "Search cars",
  };

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

      <div className={`${styles.field} ${styles.brandField}`}>
        <span className={styles.brandLabel}><span>{copy.brand}</span><small>{copy.brandHint}</small></span>
        <div className={styles.brandTabs} role="group" aria-label={copy.brand}>
          {FEATURED_BRANDS.map((item) => {
            const active = brand === item.value;
            return <button
              key={item.value}
              type="button"
              className={`${styles.brandTab} ${active ? styles.brandTabActive : ""}`}
              aria-pressed={active}
              onClick={() => setBrand((current) => current === item.value ? "" : item.value)}
            >
              <BrandMark brand={item.value}/>
              <span>{item.label}</span>
            </button>;
          })}
        </div>
        {brand && <input type="hidden" name="brand" value={brand}/>} 
      </div>

      <button className={styles.searchButton} type="submit"><Search size={20}/><span>{copy.search}</span></button>
    </form>
  </div>;
}

function BrandMark({brand}: {brand: FeaturedBrand}) {
  if (brand === "Toyota") return <svg className={styles.brandMark} viewBox="0 0 32 32" aria-hidden="true">
    <ellipse cx="16" cy="16" rx="13" ry="9.5" fill="none" stroke="currentColor" strokeWidth="2"/>
    <ellipse cx="16" cy="13.2" rx="5.3" ry="8.5" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <ellipse cx="16" cy="12" rx="10.1" ry="4.2" fill="none" stroke="currentColor" strokeWidth="1.7"/>
  </svg>;

  if (brand === "BMW") return <svg className={styles.brandMark} viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="13" fill="#fff" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="16" cy="17" r="7.2" fill="#fff" stroke="currentColor" strokeWidth="1"/>
    <path d="M16 9.8v7.2H8.8A7.2 7.2 0 0 1 16 9.8Z" fill="#4a9bd8"/>
    <path d="M16 17h7.2A7.2 7.2 0 0 1 16 24.2Z" fill="#4a9bd8"/>
    <path d="M9.3 11.1 11.2 8.8M22.7 11.1 20.8 8.8M13.2 7.1h5.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>;

  return <svg className={styles.brandMark} viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M16 5.8 18.1 15.2 26.1 21.5 17 18.4 7 21.5 13.9 15.2Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>;
}
