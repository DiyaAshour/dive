"use client";

import {useMemo, useState} from "react";
import {CalendarDays, Clock, MapPin, Search, Users} from "lucide-react";
import styles from "./cars-home-search.module.css";

type Locale = "ar" | "en";
type Props = Readonly<{locale: Locale; defaultPickupDate: string; defaultReturnDate: string}>;

const DRIVER_AGES = ["18-24", "25-29", "30-65", "66+"] as const;

export function CarsHomeSearch({locale, defaultPickupDate, defaultReturnDate}: Props) {
  const ar = locale === "ar";
  const [sameDropoff, setSameDropoff] = useState(true);
  const [pickupDate, setPickupDate] = useState(defaultPickupDate);
  const minimumReturnDate = useMemo(() => addDays(pickupDate, 3), [pickupDate]);
  const [returnDate, setReturnDate] = useState(defaultReturnDate >= minimumReturnDate ? defaultReturnDate : minimumReturnDate);

  const copy = ar ? {
    pickup: "مكان الاستلام",
    pickupValue: "عمّان - مطار الملكة علياء",
    same: "إعادة في نفس الموقع",
    dropoff: "مكان التسليم",
    dropoffPlaceholder: "اختر مكان التسليم",
    pickupMoment: "الاستلام",
    returnMoment: "الإعادة",
    age: "العمر",
    search: "ابحث عن سيارة",
    ageSuffix: "سنة",
  } : {
    pickup: "Pick-up location",
    pickupValue: "Amman - Queen Alia Airport",
    same: "Return to the same location",
    dropoff: "Drop-off location",
    dropoffPlaceholder: "Choose drop-off location",
    pickupMoment: "Pick-up",
    returnMoment: "Return",
    age: "Age",
    search: "Search cars",
    ageSuffix: "years",
  };

  function onPickupDate(value: string) {
    setPickupDate(value);
    const nextMinimum = addDays(value, 3);
    if (returnDate < nextMinimum) setReturnDate(nextMinimum);
  }

  return <form className={styles.form} action="/cars" method="get">
    <div className={`${styles.field} ${styles.locationField}`}>
      <label>
        <span className={styles.label}><MapPin size={15}/>{copy.pickup}</span>
        <input name="pickup" defaultValue={copy.pickupValue} required/>
      </label>
      <label className={styles.sameLine}>
        <span>{copy.same}</span>
        <input className={styles.switchInput} type="checkbox" checked={sameDropoff} onChange={(event) => setSameDropoff(event.target.checked)}/>
        <span className={styles.switchTrack} aria-hidden="true"><span/></span>
      </label>
      {sameDropoff ? <input type="hidden" name="dropoff" value="same"/> : <label className={styles.dropoffReveal}><span>{copy.dropoff}</span><input name="dropoff" placeholder={copy.dropoffPlaceholder} required/></label>}
    </div>

    <div className={styles.field}>
      <span className={styles.label}><CalendarDays size={15}/>{copy.pickupMoment}</span>
      <div className={styles.momentRow}>
        <input name="pickupDate" type="date" value={pickupDate} onChange={(event) => onPickupDate(event.target.value)} required/>
        <span className={styles.timeBox}><Clock size={14}/><input name="pickupTime" type="time" defaultValue="10:00" required/></span>
      </div>
    </div>

    <div className={styles.field}>
      <span className={styles.label}><CalendarDays size={15}/>{copy.returnMoment}</span>
      <div className={styles.momentRow}>
        <input name="returnDate" type="date" min={minimumReturnDate} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required/>
        <span className={styles.timeBox}><Clock size={14}/><input name="returnTime" type="time" defaultValue="10:00" required/></span>
      </div>
    </div>

    <label className={`${styles.field} ${styles.ageField}`}>
      <span className={styles.label}><Users size={15}/>{copy.age}</span>
      <select name="driverAge" defaultValue="30-65">
        {DRIVER_AGES.map((value) => <option value={value} key={value}>{value} {copy.ageSuffix}</option>)}
      </select>
    </label>

    <button className={styles.searchButton} type="submit"><Search size={21}/><span>{copy.search}</span></button>
  </form>;
}

function addDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, (day || 1) + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
