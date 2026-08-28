"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BedDouble, MapPin, Search } from "lucide-react";

type Suggestion = Readonly<{
  kind: "DESTINATION" | "HOTEL";
  id: string;
  label: string;
  searchValue: string;
  secondary: string;
  type: string;
  landingPath: string | null;
}>;

type Props = Readonly<{
  locale: "ar" | "en";
  name?: string;
  defaultValue?: string;
  required?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
}>;

export function DestinationAutocomplete({locale, name = "destination", defaultValue = "", required = false, ariaLabel, placeholder, className}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const current = ++requestId.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({q: value.trim(), locale, limit: "8"});
        const response = await fetch(`/api/v1/discovery/suggestions?${params.toString()}`, {headers: {accept: "application/json"}});
        const body = await response.json().catch(() => null) as {data?: Suggestion[] | null} | null;
        if (current !== requestId.current) return;
        const next = response.ok && Array.isArray(body?.data) ? body.data : [];
        setItems(next);
        setActive(-1);
        if (document.activeElement && rootRef.current?.contains(document.activeElement)) setOpen(true);
      } catch {
        if (current === requestId.current) setItems([]);
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    }, value.trim() ? 180 : 80);
    return () => window.clearTimeout(timer);
  }, [value, locale]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(item: Suggestion) {
    setValue(item.searchValue);
    setOpen(false);
    setActive(-1);
  }

  return <div className={`destinationAutocomplete${className ? ` ${className}` : ""}`} ref={rootRef}>
    <input
      name={name}
      value={value}
      onChange={(event) => {setValue(event.target.value); setOpen(true);}}
      onFocus={() => setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {event.preventDefault(); setOpen(true); setActive((index) => Math.min(items.length - 1, index + 1));}
        if (event.key === "ArrowUp") {event.preventDefault(); setActive((index) => Math.max(-1, index - 1));}
        if (event.key === "Enter" && open && active >= 0 && items[active]) {event.preventDefault(); select(items[active]);}
        if (event.key === "Escape") {setOpen(false); setActive(-1);}
      }}
      required={required}
      aria-label={ariaLabel}
      placeholder={placeholder}
      role="combobox"
      aria-autocomplete="list"
      aria-controls={listId}
      aria-expanded={open && (loading || items.length > 0)}
      aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      autoComplete="off"
    />
    {open && (loading || items.length > 0) && <div className="destinationSuggestPanel" id={listId} role="listbox">
      <div className="destinationSuggestHead"><Search size={14}/><span>{loading ? (locale === "ar" ? "نبحث عن الوجهات…" : "Finding destinations…") : (locale === "ar" ? "وجهات وفنادق" : "Destinations & hotels")}</span></div>
      {!loading && items.map((item,index) => <button
        id={`${listId}-${index}`}
        type="button"
        role="option"
        aria-selected={active === index}
        className={active === index ? "active" : ""}
        key={`${item.kind}-${item.id}`}
        onMouseEnter={() => setActive(index)}
        onClick={() => select(item)}
      >
        <span className="destinationSuggestIcon">{item.kind === "HOTEL" ? <BedDouble size={17}/> : <MapPin size={17}/>}</span>
        <span><strong>{item.label}</strong><small>{item.secondary}</small></span>
        <em>{item.kind === "HOTEL" ? (locale === "ar" ? "فندق" : "Hotel") : labelType(item.type,locale)}</em>
      </button>)}
    </div>}
  </div>;
}

function labelType(type:string,locale:"ar"|"en") {
  if (locale === "ar") return ({COUNTRY:"دولة",REGION:"منطقة",CITY:"مدينة",AREA:"منطقة",LANDMARK:"معلم"} as Record<string,string>)[type] ?? "وجهة";
  return type.charAt(0) + type.slice(1).toLowerCase();
}
