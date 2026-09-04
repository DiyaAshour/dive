"use client";

import {useEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, MapPin, Search, Users} from "lucide-react";
import stayStyles from "./home-booking-search.module.css";
import styles from "./cars-home-search.module.css";

type Locale = "ar" | "en";
type Props = Readonly<{locale: Locale; defaultPickupDate: string; defaultReturnDate: string}>;
type ActiveDate = "pickup" | "return";

const DRIVER_AGES = ["18-24", "25-29", "30-65", "66+"] as const;
const MIN_RENTAL_DAYS = 3;

export function CarsHomeSearch({locale, defaultPickupDate, defaultReturnDate}: Props) {
  const ar = locale === "ar";
  const [sameDropoff, setSameDropoff] = useState(true);
  const [pickupDate, setPickupDate] = useState(defaultPickupDate);
  const minimumReturnDate = useMemo(() => addDaysValue(pickupDate, MIN_RENTAL_DAYS), [pickupDate]);
  const [returnDate, setReturnDate] = useState(() => defaultReturnDate >= addDaysValue(defaultPickupDate, MIN_RENTAL_DAYS) ? defaultReturnDate : addDaysValue(defaultPickupDate, MIN_RENTAL_DAYS));
  const [openDates, setOpenDates] = useState(false);
  const [activeDate, setActiveDate] = useState<ActiveDate>("pickup");
  const [calendarCursor, setCalendarCursor] = useState(() => startOfMonth(parseDate(defaultPickupDate)));
  const rootRef = useRef<HTMLDivElement>(null);

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
    choosePickup: "اختر تاريخ الاستلام",
    chooseReturn: "اختر تاريخ الإعادة",
    previousMonth: "الشهر السابق",
    nextMonth: "الشهر التالي",
  } : {
    pickup: "Pick-up location",
    pickupValue: "Amman - Queen Alia Airport",
    same: "Return to the same location",
    dropoff: "Drop-off location",
    dropoffPlaceholder: "Choose drop-off location",
    pickupMoment: "Pick-up",
    returnMoment: "Return",
    age: "Driver age",
    search: "Search cars",
    ageSuffix: "years",
    choosePickup: "Choose pick-up date",
    chooseReturn: "Choose return date",
    previousMonth: "Previous month",
    nextMonth: "Next month",
  };

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenDates(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDates(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const monthOne = calendarCursor;
  const monthTwo = useMemo(() => addMonths(calendarCursor, 1), [calendarCursor]);
  const currentMonth = startOfMonth(new Date());
  const canGoPrevious = monthOne.getTime() > currentMonth.getTime();

  function showDates(field: ActiveDate) {
    setActiveDate(field);
    setCalendarCursor(startOfMonth(parseDate(field === "pickup" ? pickupDate : returnDate)));
    setOpenDates(true);
  }

  function chooseDate(value: string) {
    if (activeDate === "pickup") {
      setPickupDate(value);
      const nextMinimum = addDaysValue(value, MIN_RENTAL_DAYS);
      if (returnDate < nextMinimum) setReturnDate(nextMinimum);
      setActiveDate("return");
      return;
    }
    if (value < minimumReturnDate) return;
    setReturnDate(value);
    setOpenDates(false);
  }

  return <div className={`${stayStyles.root} ${styles.root}`} id="car-search" ref={rootRef}>
    <form className={`${stayStyles.dock} ${styles.form}`} action="/cars" method="get">
      <div className={`${stayStyles.field} ${stayStyles.whereField} ${styles.locationField}`}>
        <label className={styles.locationInput}>
          <span className={stayStyles.fieldLabel}><MapPin size={14}/>{copy.pickup}</span>
          <input name="pickup" defaultValue={copy.pickupValue} required/>
        </label>
        <label className={styles.sameLine}>
          <span>{copy.same}</span>
          <input className={styles.switchInput} type="checkbox" checked={sameDropoff} onChange={(event) => setSameDropoff(event.target.checked)}/>
          <span className={styles.switchTrack} aria-hidden="true"><span/></span>
        </label>
        {sameDropoff ? <input type="hidden" name="dropoff" value="same"/> : <label className={styles.dropoffReveal}><span>{copy.dropoff}</span><input name="dropoff" placeholder={copy.dropoffPlaceholder} required/></label>}
      </div>

      <MomentField locale={locale} label={copy.pickupMoment} date={pickupDate} timeName="pickupTime" active={openDates && activeDate === "pickup"} onDate={() => showDates("pickup")}/>
      <MomentField locale={locale} label={copy.returnMoment} date={returnDate} timeName="returnTime" active={openDates && activeDate === "return"} onDate={() => showDates("return")}/>

      <label className={`${stayStyles.field} ${stayStyles.guestField} ${styles.ageField}`}>
        <span className={stayStyles.fieldLabel}><Users size={14}/>{copy.age}</span>
        <select name="driverAge" defaultValue="30-65">
          {DRIVER_AGES.map((value) => <option value={value} key={value}>{value} {copy.ageSuffix}</option>)}
        </select>
        <ChevronDown size={16} className={stayStyles.fieldChevron}/>
      </label>

      <input type="hidden" name="pickupDate" value={pickupDate}/>
      <input type="hidden" name="returnDate" value={returnDate}/>
      <button className={`${stayStyles.searchButton} ${styles.searchButton}`} type="submit"><Search size={19}/><span>{copy.search}</span></button>
    </form>

    {openDates && <div className={stayStyles.datePanel} role="dialog" aria-label={activeDate === "pickup" ? copy.choosePickup : copy.chooseReturn}>
      <div className={stayStyles.calendarHeaderMobile}>{activeDate === "pickup" ? copy.pickupMoment : copy.returnMoment}</div>
      <div className={stayStyles.months}>
        <MonthCalendar month={monthOne} locale={locale} pickupDate={pickupDate} returnDate={returnDate} activeDate={activeDate} minimumReturnDate={minimumReturnDate} onSelect={chooseDate} previousAction={<button type="button" className={stayStyles.monthArrow} aria-label={copy.previousMonth} disabled={!canGoPrevious} onClick={() => setCalendarCursor((month) => addMonths(month, -1))}><ChevronLeft size={19}/></button>}/>
        <MonthCalendar month={monthTwo} locale={locale} pickupDate={pickupDate} returnDate={returnDate} activeDate={activeDate} minimumReturnDate={minimumReturnDate} onSelect={chooseDate} nextAction={<button type="button" className={stayStyles.monthArrow} aria-label={copy.nextMonth} onClick={() => setCalendarCursor((month) => addMonths(month, 1))}><ChevronRight size={19}/></button>}/>
      </div>
    </div>}
  </div>;
}

function MomentField({locale, label, date, timeName, active, onDate}: {locale: Locale; label: string; date: string; timeName: string; active: boolean; onDate: () => void}) {
  return <div className={`${stayStyles.field} ${stayStyles.dateField} ${styles.momentField} ${active ? stayStyles.activeField : ""}`}>
    <button type="button" className={styles.dateButton} onClick={onDate} aria-haspopup="dialog" aria-expanded={active}>
      <span className={stayStyles.fieldLabel}><CalendarDays size={14}/>{label}</span>
      <strong>{formatDate(date, locale)}</strong>
    </button>
    <div className={styles.timeBox}><Clock size={14}/><input name={timeName} type="time" defaultValue="10:00" required/></div>
    <ChevronDown size={16} className={`${stayStyles.fieldChevron} ${styles.dateChevron}`}/>
  </div>;
}

type MonthCalendarProps = Readonly<{month: Date; locale: Locale; pickupDate: string; returnDate: string; activeDate: ActiveDate; minimumReturnDate: string; onSelect: (value: string) => void; previousAction?: ReactNode; nextAction?: ReactNode}>;

function MonthCalendar({month, locale, pickupDate, returnDate, activeDate, minimumReturnDate, onSelect, previousAction, nextAction}: MonthCalendarProps) {
  const days = buildCalendarDays(month);
  const weekdayFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {weekday: "narrow"});
  const monthFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {month: "long", year: "numeric"});
  const weekAnchor = new Date(2026, 7, 31, 12);
  const weekdays = Array.from({length: 7}, (_, index) => weekdayFormatter.format(addDays(weekAnchor, index)));
  const today = localDateValue(new Date());

  return <section className={stayStyles.month}>
    <div className={stayStyles.monthTitle}>{previousAction ?? <span/>}<strong>{monthFormatter.format(month)}</strong>{nextAction ?? <span/>}</div>
    <div className={stayStyles.weekdays}>{weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}</div>
    <div className={stayStyles.daysGrid}>
      {days.map((date, index) => {
        if (!date) return <span className={stayStyles.emptyDay} key={`empty-${index}`}/>;
        const value = localDateValue(date);
        const selected = value === pickupDate || value === returnDate;
        const inRange = value > pickupDate && value < returnDate;
        const disabled = value < today || (activeDate === "return" && value < minimumReturnDate);
        return <button type="button" key={value} disabled={disabled} className={`${stayStyles.day} ${inRange ? stayStyles.inRange : ""} ${selected ? stayStyles.selectedDay : ""}`} onClick={() => onSelect(value)} aria-pressed={selected}><span>{date.getDate()}</span></button>;
      })}
    </div>
  </section>;
}

function parseDate(value: string) { const [year = "1970", month = "1", day = "1"] = value.split("-"); return new Date(Number(year), Number(month) - 1, Number(day), 12); }
function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
function addMonths(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12); }
function addDays(date: Date, amount: number) { const next = new Date(date); next.setDate(next.getDate() + amount); return next; }
function localDateValue(date: Date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }
function addDaysValue(value: string, amount: number) { return localDateValue(addDays(parseDate(value), amount)); }
function formatDate(value: string, locale: Locale) { return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "2-digit", year: "numeric"}).format(parseDate(value)); }
function buildCalendarDays(month: Date) { const first = startOfMonth(month); const mondayOffset = (first.getDay() + 6) % 7; const numberOfDays = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(); const cells: Array<Date | null> = Array.from({length: mondayOffset}, () => null); for (let day = 1; day <= numberOfDays; day += 1) cells.push(new Date(first.getFullYear(), first.getMonth(), day, 12)); while (cells.length % 7 !== 0) cells.push(null); return cells; }
