"use client";

import { useState } from "react";
import { CalendarDays, Clock, MapPin, Search, Users } from "lucide-react";
import styles from "./car-booking-search.module.css";

type Locale = "ar" | "en";

type Props = Readonly<{
  locale: Locale;
  defaultPickupDate: string;
  defaultReturnDate: string;
}>;

export function CarBookingSearch({locale, defaultPickupDate, defaultReturnDate}: Props) {
  const [sameDropoff, setSameDropoff] = useState(true);
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

      <button className={styles.searchButton} type="submit"><Search size={20}/><span>{copy.search}</span></button>
    </form>
  </div>;
}
