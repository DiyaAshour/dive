"use client";

import {CalendarDays, ChevronLeft, ChevronRight} from "lucide-react";
import {useMemo, useState, type ReactNode} from "react";

type Locale = "en" | "ar" | "zh";
type ActiveDate = "arrival" | "departure";

type Props = Readonly<{
  locale: Locale;
  defaultArrival: string;
  defaultDeparture: string;
}>;

export function MobileStayDatePicker({locale, defaultArrival, defaultDeparture}: Props) {
  const today = localDateValue(new Date());
  const initialArrival = defaultArrival || today;
  const initialDeparture = defaultDeparture && defaultDeparture > initialArrival ? defaultDeparture : addDaysValue(initialArrival, 1);
  const [arrival, setArrival] = useState(initialArrival);
  const [departure, setDeparture] = useState(initialDeparture);
  const [active, setActive] = useState<ActiveDate | null>(null);
  const [cursor, setCursor] = useState(() => startOfMonth(parseDate(initialArrival)));

  const monthTwo = useMemo(() => addMonths(cursor, 1), [cursor]);
  const currentMonth = startOfMonth(new Date());
  const canGoPrevious = cursor.getTime() > currentMonth.getTime();

  const copy = locale === "ar" ? {
    arrival: "تسجيل الوصول",
    departure: "تسجيل المغادرة",
    chooseArrival: "اختر تاريخ الوصول",
    chooseDeparture: "اختر تاريخ المغادرة",
    previous: "الشهر السابق",
    next: "الشهر التالي",
  } : locale === "zh" ? {
    arrival: "入住",
    departure: "退房",
    chooseArrival: "选择入住日期",
    chooseDeparture: "选择退房日期",
    previous: "上个月",
    next: "下个月",
  } : {
    arrival: "Check in",
    departure: "Check out",
    chooseArrival: "Choose check-in date",
    chooseDeparture: "Choose check-out date",
    previous: "Previous month",
    next: "Next month",
  };

  function openPicker(field: ActiveDate) {
    setActive(field);
    setCursor(startOfMonth(parseDate(field === "arrival" ? arrival : departure)));
  }

  function chooseDate(value: string) {
    if (active === "arrival") {
      setArrival(value);
      const nextDeparture = departure <= value ? addDaysValue(value, 1) : departure;
      setDeparture(nextDeparture);
      setActive("departure");
      setCursor(startOfMonth(parseDate(nextDeparture)));
      return;
    }
    if (active === "departure" && value > arrival) {
      setDeparture(value);
      setActive(null);
    }
  }

  const previousButton = <button type="button" aria-label={copy.previous} disabled={!canGoPrevious} onClick={() => setCursor((month) => addMonths(month, -1))}><ChevronLeft size={18}/></button>;
  const nextButton = <button type="button" aria-label={copy.next} onClick={() => setCursor((month) => addMonths(month, 1))}><ChevronRight size={18}/></button>;

  return <>
    <label className="mobileCustomDateField">
      <span>{copy.arrival}</span>
      <button type="button" className={active === "arrival" ? "isActive" : ""} onClick={() => openPicker("arrival")} aria-expanded={active === "arrival"} aria-haspopup="dialog">
        <CalendarDays size={16}/><strong>{formatDate(arrival, locale)}</strong>
      </button>
      <input type="hidden" name="arrival" value={arrival}/>
    </label>
    <label className="mobileCustomDateField">
      <span>{copy.departure}</span>
      <button type="button" className={active === "departure" ? "isActive" : ""} onClick={() => openPicker("departure")} aria-expanded={active === "departure"} aria-haspopup="dialog">
        <CalendarDays size={16}/><strong>{formatDate(departure, locale)}</strong>
      </button>
      <input type="hidden" name="departure" value={departure}/>
    </label>

    {active && <div className="mobileInlineCalendar" role="dialog" aria-label={active === "arrival" ? copy.chooseArrival : copy.chooseDeparture}>
      <div className="mobileInlineCalendarTitle">
        <strong>{active === "arrival" ? copy.arrival : copy.departure}</strong>
        <span>{active === "arrival" ? formatDate(arrival, locale) : formatDate(departure, locale)}</span>
      </div>
      <div className="mobileInlineMonths">
        <MonthCalendar month={cursor} locale={locale} arrival={arrival} departure={departure} active={active} onSelect={chooseDate} previous={previousButton} next={nextButton}/>
        <MonthCalendar month={monthTwo} locale={locale} arrival={arrival} departure={departure} active={active} onSelect={chooseDate} second/>
      </div>
    </div>}
  </>;
}

function MonthCalendar({month, locale, arrival, departure, active, onSelect, previous, next, second = false}: {
  month: Date;
  locale: Locale;
  arrival: string;
  departure: string;
  active: ActiveDate;
  onSelect: (value: string) => void;
  previous?: ReactNode;
  next?: ReactNode;
  second?: boolean;
}) {
  const days = buildCalendarDays(month);
  const lang = locale === "ar" ? "ar-JO-u-nu-latn" : locale === "zh" ? "zh-CN" : "en-GB";
  const monthFormatter = new Intl.DateTimeFormat(lang, {month: "long", year: "numeric"});
  const weekdayFormatter = new Intl.DateTimeFormat(lang, {weekday: "narrow"});
  const weekAnchor = new Date(2026, 7, 31, 12);
  const weekdays = Array.from({length: 7}, (_, index) => weekdayFormatter.format(addDays(weekAnchor, index)));
  const today = localDateValue(new Date());

  return <section className={`mobileInlineMonth ${second ? "mobileInlineMonthSecond" : ""}`}>
    <div className="mobileInlineMonthHead">{previous ?? <span/>}<strong>{monthFormatter.format(month)}</strong>{next ?? <span/>}</div>
    <div className="mobileInlineWeekdays">{weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
    <div className="mobileInlineDays">
      {days.map((date, index) => {
        if (!date) return <span key={`empty-${index}`} className="empty"/>;
        const value = localDateValue(date);
        const selected = value === arrival || value === departure;
        const inRange = value > arrival && value < departure;
        const disabled = value < today || (active === "departure" && value <= arrival);
        return <button type="button" key={value} disabled={disabled} className={`${selected ? "selected" : ""} ${inRange ? "inRange" : ""}`} onClick={() => onSelect(value)} aria-pressed={selected}><span>{date.getDate()}</span></button>;
      })}
    </div>
  </section>;
}

function parseDate(value: string) {
  const [year = "1970", month = "1", day = "1"] = value.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day), 12);
}
function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
function addMonths(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12); }
function addDays(date: Date, amount: number) { const next = new Date(date); next.setDate(next.getDate() + amount); return next; }
function localDateValue(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function addDaysValue(value: string, amount: number) { return localDateValue(addDays(parseDate(value), amount)); }
function formatDate(value: string, locale: Locale) {
  const lang = locale === "ar" ? "ar-JO-u-nu-latn" : locale === "zh" ? "zh-CN" : "en-GB";
  return new Intl.DateTimeFormat(lang, {day: "2-digit", month: "2-digit", year: "numeric"}).format(parseDate(value));
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
