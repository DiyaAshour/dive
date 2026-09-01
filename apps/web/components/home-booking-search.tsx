"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, MapPin, Minus, Plus, Search, Users } from "lucide-react";
import { DestinationAutocomplete } from "@/components/destination-autocomplete";
import styles from "./home-booking-search.module.css";

type Locale = "ar" | "en";
type OpenPanel = "dates" | "guests" | null;
type ActiveDate = "checkIn" | "checkOut";

type SearchCopy = Readonly<{
  where: string;
  whereHint: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  adults: string;
  search: string;
}>;

type Props = Readonly<{
  locale: Locale;
  defaultDestination: string;
  defaultArrival: string;
  defaultDeparture: string;
  copy: SearchCopy;
}>;

type GuestKey = "adults" | "children" | "infants" | "pets";
type Guests = Record<GuestKey, number>;

type GuestRow = Readonly<{
  key: GuestKey;
  title: string;
  description: string;
  max: number;
  min: number;
  serviceAnimal?: string;
}>;

const FLEX_OPTIONS = [0, 1, 2, 3, 7, 14] as const;

export function HomeBookingSearch({locale, defaultDestination, defaultArrival, defaultDeparture, copy}: Props) {
  const safeDeparture = defaultDeparture > defaultArrival ? defaultDeparture : addDaysValue(defaultArrival, 1);
  const [arrival, setArrival] = useState(defaultArrival);
  const [departure, setDeparture] = useState(safeDeparture);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [activeDate, setActiveDate] = useState<ActiveDate>("checkIn");
  const [calendarCursor, setCalendarCursor] = useState(() => startOfMonth(parseDate(defaultArrival)));
  const [dateMode, setDateMode] = useState<"dates" | "flexible">("dates");
  const [flexDays, setFlexDays] = useState<number>(0);
  const [guests, setGuests] = useState<Guests>({adults: 2, children: 0, infants: 0, pets: 0});
  const rootRef = useRef<HTMLDivElement>(null);

  const dictionary = locale === "ar" ? {
    dates: "التواريخ",
    flexible: "مرن",
    exactDates: "تواريخ محددة",
    day: "يوم",
    days: "أيام",
    adults: "البالغون",
    adultsHint: "13 سنة فأكثر",
    children: "الأطفال",
    childrenHint: "من 2 إلى 12 سنة",
    infants: "الرضّع",
    infantsHint: "أقل من سنتين",
    pets: "الحيوانات الأليفة",
    petsHint: "هل تصطحب حيوان خدمة؟",
    guest: "ضيف",
    guests: "ضيوف",
    pet: "حيوان أليف",
    petsCount: "حيوانات أليفة",
    previousMonth: "الشهر السابق",
    nextMonth: "الشهر التالي",
    decrease: "إنقاص",
    increase: "زيادة",
    chooseCheckIn: "اختر تاريخ الوصول",
    chooseCheckOut: "اختر تاريخ المغادرة",
  } : {
    dates: "Dates",
    flexible: "Flexible",
    exactDates: "Exact dates",
    day: "day",
    days: "days",
    adults: "Adults",
    adultsHint: "Ages 13 or above",
    children: "Children",
    childrenHint: "Ages 2–12",
    infants: "Infants",
    infantsHint: "Under 2",
    pets: "Pets",
    petsHint: "Bringing a service animal?",
    guest: "guest",
    guests: "guests",
    pet: "pet",
    petsCount: "pets",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    decrease: "Decrease",
    increase: "Increase",
    chooseCheckIn: "Choose check-in date",
    chooseCheckOut: "Choose check-out date",
  };

  const guestRows: GuestRow[] = [
    {key: "adults", title: dictionary.adults, description: dictionary.adultsHint, min: 1, max: 20},
    {key: "children", title: dictionary.children, description: dictionary.childrenHint, min: 0, max: 10},
    {key: "infants", title: dictionary.infants, description: dictionary.infantsHint, min: 0, max: 5},
    {key: "pets", title: dictionary.pets, description: "", serviceAnimal: dictionary.petsHint, min: 0, max: 5},
  ];

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenPanel(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPanel(null);
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
  const guestTotal = guests.adults + guests.children;
  const guestSummary = `${guestTotal} ${guestTotal === 1 ? dictionary.guest : dictionary.guests}${guests.pets ? ` · ${guests.pets} ${guests.pets === 1 ? dictionary.pet : dictionary.petsCount}` : ""}`;

  function openDates(field: ActiveDate) {
    setActiveDate(field);
    setCalendarCursor(startOfMonth(parseDate(field === "checkIn" ? arrival : departure)));
    setOpenPanel("dates");
  }

  function chooseDate(value: string) {
    if (activeDate === "checkIn") {
      setArrival(value);
      if (departure <= value) setDeparture(addDaysValue(value, 1));
      setActiveDate("checkOut");
      return;
    }
    if (value <= arrival) return;
    setDeparture(value);
    setOpenPanel(null);
  }

  function updateGuest(key: GuestKey, delta: number, min: number, max: number) {
    setGuests((current) => ({...current, [key]: Math.min(max, Math.max(min, current[key] + delta))}));
  }

  function selectFlex(days: number) {
    setFlexDays(days);
    setDateMode(days === 0 ? "dates" : "flexible");
  }

  return <div className={styles.root} ref={rootRef}>
    <span
      className="premiumSearchDock"
      aria-hidden="true"
      style={{position:"absolute",insetInlineStart:0,top:0,width:1,height:1,display:"block",margin:0,padding:0,border:0,background:"transparent",boxShadow:"none",pointerEvents:"none"}}
    />
    <form className={`${styles.dock} homeSearchDock`} action="/search" method="get">
      <label className={`${styles.field} ${styles.whereField} homeSearchWhere`} onPointerDown={() => setOpenPanel(null)}>
        <span className={styles.fieldLabel}><MapPin size={14}/>{copy.where}</span>
        <DestinationAutocomplete locale={locale} defaultValue={defaultDestination} required ariaLabel={copy.where} className={styles.destinationInput ?? ""}/>
        <small>{copy.whereHint}</small>
      </label>

      <button
        className={`${styles.field} ${styles.dateField} homeSearchCheckIn ${openPanel === "dates" && activeDate === "checkIn" ? styles.activeField : ""}`}
        type="button"
        onClick={() => openDates("checkIn")}
        aria-expanded={openPanel === "dates" && activeDate === "checkIn"}
        aria-haspopup="dialog"
      >
        <span className={styles.fieldLabel}><CalendarDays size={14}/>{copy.checkIn}</span>
        <strong>{formatDate(arrival, locale)}</strong>
        <ChevronDown size={16} className={styles.fieldChevron}/>
      </button>

      <button
        className={`${styles.field} ${styles.dateField} homeSearchCheckOut ${openPanel === "dates" && activeDate === "checkOut" ? styles.activeField : ""}`}
        type="button"
        onClick={() => openDates("checkOut")}
        aria-expanded={openPanel === "dates" && activeDate === "checkOut"}
        aria-haspopup="dialog"
      >
        <span className={styles.fieldLabel}><CalendarDays size={14}/>{copy.checkOut}</span>
        <strong>{formatDate(departure, locale)}</strong>
        <ChevronDown size={16} className={styles.fieldChevron}/>
      </button>

      <button
        className={`${styles.field} ${styles.guestField} homeSearchGuests ${openPanel === "guests" ? styles.activeField : ""}`}
        type="button"
        onClick={() => setOpenPanel((current) => current === "guests" ? null : "guests")}
        aria-expanded={openPanel === "guests"}
        aria-haspopup="dialog"
      >
        <span className={styles.fieldLabel}><Users size={14}/>{copy.guests}</span>
        <strong>{guestSummary}</strong>
        <small>{copy.adults}</small>
        <ChevronDown size={16} className={styles.fieldChevron}/>
      </button>

      <input type="hidden" name="arrival" value={arrival}/>
      <input type="hidden" name="departure" value={departure}/>
      <input type="hidden" name="adults" value={guests.adults}/>
      <input type="hidden" name="children" value={guests.children}/>
      <input type="hidden" name="infants" value={guests.infants}/>
      <input type="hidden" name="pets" value={guests.pets}/>
      <input type="hidden" name="flexibleDays" value={flexDays}/>

      <button className={styles.searchButton} type="submit"><Search size={19}/><span>{copy.search}</span></button>
    </form>

    {openPanel === "dates" && <div className={styles.datePanel} role="dialog" aria-label={activeDate === "checkIn" ? dictionary.chooseCheckIn : dictionary.chooseCheckOut}>
      <div className={styles.segmented}>
        <button type="button" className={dateMode === "dates" ? styles.segmentActive : ""} onClick={() => {setDateMode("dates"); setFlexDays(0);}}>{dictionary.dates}</button>
        <button type="button" className={dateMode === "flexible" ? styles.segmentActive : ""} onClick={() => {setDateMode("flexible"); if (flexDays === 0) setFlexDays(1);}}>{dictionary.flexible}</button>
      </div>

      <div className={styles.calendarHeaderMobile}>{activeDate === "checkIn" ? copy.checkIn : copy.checkOut}</div>
      <div className={styles.months}>
        <MonthCalendar
          month={monthOne}
          locale={locale}
          arrival={arrival}
          departure={departure}
          activeDate={activeDate}
          onSelect={chooseDate}
          previousAction={<button type="button" className={styles.monthArrow} aria-label={dictionary.previousMonth} disabled={!canGoPrevious} onClick={() => setCalendarCursor((month) => addMonths(month, -1))}><ChevronLeft size={19}/></button>}
        />
        <MonthCalendar
          month={monthTwo}
          locale={locale}
          arrival={arrival}
          departure={departure}
          activeDate={activeDate}
          onSelect={chooseDate}
          nextAction={<button type="button" className={styles.monthArrow} aria-label={dictionary.nextMonth} onClick={() => setCalendarCursor((month) => addMonths(month, 1))}><ChevronRight size={19}/></button>}
        />
      </div>

      <div className={styles.flexRow}>
        {FLEX_OPTIONS.map((days) => <button
          key={days}
          type="button"
          className={flexDays === days ? styles.flexActive : ""}
          onClick={() => selectFlex(days)}
        >{days === 0 ? <><CalendarDays size={14}/>{dictionary.exactDates}</> : `± ${days} ${days === 1 ? dictionary.day : dictionary.days}`}</button>)}
      </div>
    </div>}

    {openPanel === "guests" && <div className={styles.guestPanel} role="dialog" aria-label={copy.guests}>
      {guestRows.map((row) => <div className={styles.guestRow} key={row.key}>
        <div className={styles.guestCopy}>
          <strong>{row.title}</strong>
          {row.description && <span>{row.description}</span>}
          {row.serviceAnimal && <span className={styles.serviceAnimal}>{row.serviceAnimal}</span>}
        </div>
        <div className={styles.counter}>
          <button type="button" aria-label={`${dictionary.decrease} ${row.title}`} disabled={guests[row.key] <= row.min} onClick={() => updateGuest(row.key, -1, row.min, row.max)}><Minus size={17}/></button>
          <span aria-live="polite">{guests[row.key]}</span>
          <button type="button" aria-label={`${dictionary.increase} ${row.title}`} disabled={guests[row.key] >= row.max} onClick={() => updateGuest(row.key, 1, row.min, row.max)}><Plus size={17}/></button>
        </div>
      </div>)}
    </div>}
  </div>;
}

type MonthCalendarProps = Readonly<{
  month: Date;
  locale: Locale;
  arrival: string;
  departure: string;
  activeDate: ActiveDate;
  onSelect: (value: string) => void;
  previousAction?: ReactNode;
  nextAction?: ReactNode;
}>;

function MonthCalendar({month, locale, arrival, departure, activeDate, onSelect, previousAction, nextAction}: MonthCalendarProps) {
  const days = buildCalendarDays(month);
  const weekdayFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {weekday: "narrow"});
  const monthFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {month: "long", year: "numeric"});
  const weekAnchor = new Date(2026, 7, 31, 12);
  const weekdays = Array.from({length: 7}, (_, index) => weekdayFormatter.format(addDays(weekAnchor, index)));
  const today = localDateValue(new Date());

  return <section className={styles.month}>
    <div className={styles.monthTitle}>{previousAction ?? <span/>}<strong>{monthFormatter.format(month)}</strong>{nextAction ?? <span/>}</div>
    <div className={styles.weekdays}>{weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}</div>
    <div className={styles.daysGrid}>
      {days.map((date, index) => {
        if (!date) return <span className={styles.emptyDay} key={`empty-${index}`}/>;
        const value = localDateValue(date);
        const selected = value === arrival || value === departure;
        const inRange = value > arrival && value < departure;
        const disabled = value < today || (activeDate === "checkOut" && value <= arrival);
        return <button
          type="button"
          key={value}
          disabled={disabled}
          className={`${styles.day} ${inRange ? styles.inRange : ""} ${selected ? styles.selectedDay : ""}`}
          onClick={() => onSelect(value)}
          aria-pressed={selected}
        ><span>{date.getDate()}</span></button>;
      })}
    </div>
  </section>;
}

function parseDate(value: string) {
  const [year = "1970", month = "1", day = "1"] = value.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day), 12);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysValue(value: string, amount: number) {
  return localDateValue(addDays(parseDate(value), amount));
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {day: "2-digit", month: "2-digit", year: "numeric"}).format(parseDate(value));
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month);
  const mondayOffset = (first.getDay() + 6) % 7;
  const numberOfDays = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({length: mondayOffset}, () => null);
  for (let day = 1; day <= numberOfDays; day += 1) cells.push(new Date(first.getFullYear(), first.getMonth(), day, 12));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
