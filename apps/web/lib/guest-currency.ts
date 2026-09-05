import {convertCurrency, hasReferenceRate as hasCurrencyReferenceRate} from "@platform/core";
import {guestIntlLocale, type GuestLocale} from "./guest-market";
import type {GuestCurrency} from "./guest-market";

export type GuestMoney = Readonly<{
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  convertedAmount: number;
  text: string;
  sourceText: string;
  converted: boolean;
  estimated: boolean;
}>;

export function guestMoney(amount: number, sourceCurrency: string, targetCurrency: GuestCurrency, locale: GuestLocale): GuestMoney {
  const source = sourceCurrency.toUpperCase();
  const converted = convertCurrency(amount, source, targetCurrency);
  const canConvert = converted !== null && source !== targetCurrency;
  const displayAmount = converted ?? amount;
  const displayCurrency = converted === null ? source : targetCurrency;
  return {
    amount,
    sourceCurrency:source,
    targetCurrency:displayCurrency,
    convertedAmount:displayAmount,
    text:formatCurrency(displayAmount,displayCurrency,locale),
    sourceText:formatCurrency(amount,source,locale),
    converted:canConvert,
    estimated:canConvert,
  };
}

export function formatCurrency(amount: number, currency: string, locale: GuestLocale): string {
  try {
    return new Intl.NumberFormat(guestIntlLocale(locale), {
      style:"currency",currency:currency.toUpperCase(),currencyDisplay:"narrowSymbol",
      minimumFractionDigits:0,maximumFractionDigits:currencyFractionDigits(currency),
    }).format(amount);
  } catch {
    return `${roundDisplay(amount,currency).toLocaleString(guestIntlLocale(locale))} ${currency.toUpperCase()}`;
  }
}

export function sourceAmountFromGuestInput(value: string | undefined, guestCurrency: GuestCurrency, sourceCurrency = "JOD"): string | undefined {
  if (!value?.trim()) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return value;
  const converted = convertCurrency(numeric,guestCurrency,sourceCurrency);
  return converted === null ? value : converted.toFixed(2);
}

export function currencyDisplayName(currency: string, locale: GuestLocale): string {
  try {
    return new Intl.DisplayNames([guestIntlLocale(locale)],{type:"currency"}).of(currency.toUpperCase()) ?? currency.toUpperCase();
  } catch { return currency.toUpperCase(); }
}

export function hasReferenceRate(currency: string): boolean {
  return hasCurrencyReferenceRate(currency);
}

function currencyFractionDigits(currency: string): number {
  return ["JPY","KRW","VND","IDR","CLP","PYG","UGX","RWF","XAF","XOF"].includes(currency.toUpperCase()) ? 0 : 2;
}

function roundDisplay(value: number, currency: string): number {
  const decimals = currencyFractionDigits(currency);
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
