"use client";

import {Coins} from "lucide-react";
import {useMemo, useState} from "react";
import {currencyDisplayName, hasReferenceRate} from "@/lib/guest-currency";
import {GUEST_CURRENCIES, type GuestCurrency, type GuestLocale} from "@/lib/guest-market";
import {guestMarketCopy} from "@/lib/guest-i18n";

type Props = Readonly<{currency:GuestCurrency;locale:GuestLocale;compact?:boolean}>;

const priority = ["JOD","USD","EUR","GBP","CNY","AED","SAR","JPY","KRW","TRY","INR","CAD","AUD","CHF"] as const;

export function CurrencySwitcher({currency,locale,compact=false}:Props) {
  const [value,setValue]=useState<GuestCurrency>(currency);
  const [saving,setSaving]=useState(false);
  const copy=guestMarketCopy(locale);
  const currencies=useMemo(()=>{
    const rank=new Map(priority.map((code,index)=>[code,index]));
    return [...GUEST_CURRENCIES].sort((a,b)=>{
      const ar=rank.get(a as (typeof priority)[number]);
      const br=rank.get(b as (typeof priority)[number]);
      if(ar!==undefined||br!==undefined)return (ar??999)-(br??999);
      return a.localeCompare(b);
    });
  },[]);

  async function change(next:GuestCurrency) {
    if(next===currency||saving)return;
    setValue(next);setSaving(true);
    try {
      const response=await fetch("/api/v1/preferences/currency",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currency:next})});
      if(!response.ok)throw new Error("Unable to save currency");
      window.location.reload();
    } catch {setValue(currency);setSaving(false);}
  }

  return <label className={compact?"languageSwitcher currencySwitcher compact":"languageSwitcher currencySwitcher"} title={copy.auto}>
    <Coins size={15}/>
    <select aria-label={copy.currency} value={value} disabled={saving} onChange={(event)=>void change(event.target.value as GuestCurrency)}>
      {currencies.map((code)=><option value={code} key={code}>{code} · {currencyDisplayName(code,locale)}{hasReferenceRate(code)?"":" *"}</option>)}
    </select>
  </label>;
}
