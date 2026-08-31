"use client";

import {ChevronDown, Coins, Languages, MapPin} from "lucide-react";
import {useEffect, useMemo, useRef, useState} from "react";
import {currencyDisplayName, hasReferenceRate} from "@/lib/guest-currency";
import {GUEST_CURRENCIES, GUEST_LOCALE_OPTIONS, guestIntlLocale, type GuestCurrency, type GuestLocale} from "@/lib/guest-market";
import {guestUiCopy} from "@/lib/guest-ui-copy";
import styles from "./market-switcher.module.css";

type Props = Readonly<{
  locale: GuestLocale;
  currency: GuestCurrency;
  countryCode?: string | null;
  edge?: "left" | "right";
}>;

const LANGUAGE_FLAGS: Readonly<Record<GuestLocale,string>> = {
  en:"🇬🇧",ar:"🇯🇴",zh:"🇨🇳",fr:"🇫🇷",de:"🇩🇪",es:"🇪🇸",it:"🇮🇹",tr:"🇹🇷",ru:"🇷🇺",ja:"🇯🇵",ko:"🇰🇷",hi:"🇮🇳",pt:"🇧🇷",id:"🇮🇩",th:"🇹🇭",
};

const CURRENCY_FLAGS: Partial<Record<GuestCurrency,string>> = {
  EUR:"🇪🇺",XAF:"🌍",XCD:"🌴",XOF:"🌍",XPF:"🌊",
};

const priority = ["JOD","USD","EUR","GBP","CNY","AED","SAR","JPY","KRW","TRY","INR","CAD","AUD","CHF"] as const;

function currencyFlag(code:GuestCurrency):string {
  const special=CURRENCY_FLAGS[code];
  if(special)return special;
  const countryCode=code.slice(0,2);
  if(!/^[A-Z]{2}$/.test(countryCode))return "🌐";
  return String.fromCodePoint(...countryCode.split("").map((char)=>127397+char.charCodeAt(0)));
}

export function MarketSwitcher({locale,currency,countryCode=null,edge}:Props) {
  const rootRef=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false);
  const [localeValue,setLocaleValue]=useState<GuestLocale>(locale);
  const [currencyValue,setCurrencyValue]=useState<GuestCurrency>(currency);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState(false);
  const copy=guestUiCopy(locale).market;

  const currencies=useMemo(()=>{
    const rank=new Map(priority.map((code,index)=>[code,index]));
    return [...GUEST_CURRENCIES].sort((a,b)=>{
      const ar=rank.get(a as (typeof priority)[number]);
      const br=rank.get(b as (typeof priority)[number]);
      if(ar!==undefined||br!==undefined)return (ar??999)-(br??999);
      return a.localeCompare(b);
    });
  },[]);

  const marketName=useMemo(()=>{
    if(!countryCode)return null;
    try {
      return new Intl.DisplayNames([guestIntlLocale(locale)],{type:"region"}).of(countryCode.toUpperCase()) ?? countryCode.toUpperCase();
    } catch {
      return countryCode.toUpperCase();
    }
  },[countryCode,locale]);

  const dirty=localeValue!==locale||currencyValue!==currency;

  function resetAndClose() {
    if(saving)return;
    setLocaleValue(locale);
    setCurrencyValue(currency);
    setError(false);
    setOpen(false);
  }

  useEffect(()=>{
    if(!open)return;
    function onPointerDown(event:MouseEvent) {
      if(rootRef.current&&!rootRef.current.contains(event.target as Node))resetAndClose();
    }
    function onKeyDown(event:KeyboardEvent) {
      if(event.key==="Escape")resetAndClose();
    }
    document.addEventListener("mousedown",onPointerDown);
    document.addEventListener("keydown",onKeyDown);
    return ()=>{
      document.removeEventListener("mousedown",onPointerDown);
      document.removeEventListener("keydown",onKeyDown);
    };
  },[open,saving,locale,currency]);

  async function apply() {
    if(!dirty||saving)return;
    setSaving(true);
    setError(false);
    try {
      const requests:Promise<Response>[]=[];
      if(localeValue!==locale)requests.push(fetch("/api/v1/preferences/locale",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({locale:localeValue})}));
      if(currencyValue!==currency)requests.push(fetch("/api/v1/preferences/currency",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currency:currencyValue})}));
      const responses=await Promise.all(requests);
      if(responses.some((response)=>!response.ok))throw new Error("Unable to save market preferences");
      window.location.reload();
    } catch {
      setSaving(false);
      setError(true);
    }
  }

  const edgeClass=edge==="left"?styles.edgeLeft:edge==="right"?styles.edgeRight:"";

  return <div className={`${styles.root} ${edgeClass}`} ref={rootRef}>
    <button className={styles.trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={copy.title} onClick={()=>open?resetAndClose():setOpen(true)}>
      <span className={styles.flag}>{LANGUAGE_FLAGS[locale]}</span>
      <span className={styles.dot}>·</span>
      <span className={styles.currency}>{currency}</span>
      <ChevronDown className={`${styles.chevron} ${open?styles.chevronOpen:""}`} size={13}/>
    </button>

    {open&&<div className={styles.panel} role="dialog" aria-label={copy.title} dir={locale==="ar"?"rtl":"ltr"}>
      <div className={styles.head}><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
      {marketName&&<div className={styles.marketHint}><MapPin size={14}/><span>{copy.detected}: {marketName}</span></div>}

      <div className={styles.grid}>
        <div className={styles.field}>
          <span className={styles.label}><Languages size={14}/>{copy.language}</span>
          <div className={styles.optionGrid}>
            {GUEST_LOCALE_OPTIONS.map((option)=><button type="button" key={option.code} disabled={saving} aria-pressed={localeValue===option.code} className={`${styles.optionCard} ${localeValue===option.code?styles.optionActive:""}`} onClick={()=>setLocaleValue(option.code)}>
              <span className={styles.optionFlag}>{LANGUAGE_FLAGS[option.code]}</span>
              <span className={styles.optionText}><strong>{option.label}</strong><small>{option.code.toUpperCase()}</small></span>
            </button>)}
          </div>
          <select className={styles.nativeMirror} aria-label={copy.language} value={localeValue} disabled={saving} onChange={(event)=>setLocaleValue(event.target.value as GuestLocale)} tabIndex={-1}>
            {GUEST_LOCALE_OPTIONS.map((option)=><option value={option.code} key={option.code}>{LANGUAGE_FLAGS[option.code]} {option.label}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <span className={styles.label}><Coins size={14}/>{copy.currency}</span>
          <div className={`${styles.optionGrid} ${styles.currencyOptionGrid}`}>
            {currencies.map((code)=><button type="button" key={code} disabled={saving} aria-pressed={currencyValue===code} className={`${styles.optionCard} ${currencyValue===code?styles.optionActive:""}`} onClick={()=>setCurrencyValue(code)}>
              <span className={styles.optionFlag}>{currencyFlag(code)}</span>
              <span className={styles.optionText}><strong>{code}</strong><small>{currencyDisplayName(code,locale)}{hasReferenceRate(code)?"":" *"}</small></span>
            </button>)}
          </div>
          <select className={styles.nativeMirror} aria-label={copy.currency} value={currencyValue} disabled={saving} onChange={(event)=>setCurrencyValue(event.target.value as GuestCurrency)} tabIndex={-1}>
            {currencies.map((code)=><option value={code} key={code}>{currencyFlag(code)} {code} · {currencyDisplayName(code,locale)}{hasReferenceRate(code)?"":" *"}</option>)}
          </select>
        </div>
      </div>

      {error&&<p className={styles.error}>{copy.error}</p>}
      <div className={styles.actions}>
        <button className={styles.cancel} type="button" disabled={saving} onClick={resetAndClose}>{copy.cancel}</button>
        <button className={styles.apply} type="button" disabled={!dirty||saving} onClick={()=>void apply()}>{saving?copy.saving:copy.apply}</button>
      </div>
    </div>}
  </div>;
}
