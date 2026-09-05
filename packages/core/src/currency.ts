// Reference rates used only for presentation and search-filter comparisons.
// Booking ledgers always keep the provider's authoritative currency and amount.
export const USD_REFERENCE_RATES: Readonly<Record<string, number>> = {
  USD: 1, JOD: 0.709, AED: 3.6725, SAR: 3.75, QAR: 3.64, BHD: 0.376, KWD: 0.307, OMR: 0.385,
  CNY: 7.18, HKD: 7.82, TWD: 31.8, JPY: 147.5, KRW: 1385, SGD: 1.29, MYR: 4.22, THB: 32.4, IDR: 16250, PHP: 57.2, VND: 26300, INR: 88, PKR: 280, BDT: 122.2, LKR: 300, NPR: 140.8,
  EUR: 0.86, GBP: 0.74, CHF: 0.8, SEK: 9.35, NOK: 9.9, DKK: 6.42, PLN: 3.68, CZK: 20.9, HUF: 333, RON: 4.37, BGN: 1.68, RSD: 100, ALL: 83.5, BAM: 1.68, MKD: 52.8, ISK: 122,
  TRY: 41.2, RUB: 81.5, UAH: 41.3, GEL: 2.7, AMD: 383, AZN: 1.7, KZT: 538, KGS: 87.4, UZS: 12450,
  AUD: 1.53, NZD: 1.69, CAD: 1.38, MXN: 18.7, BRL: 5.42, ARS: 1350, CLP: 970, COP: 4100, PEN: 3.52, UYU: 40.1, PYG: 7900, BOB: 6.91, CRC: 505, DOP: 60, GTQ: 7.66, HNL: 26, NIO: 36.8, PAB: 1,
  ZAR: 17.7, EGP: 48.5, MAD: 9.05, DZD: 130, TND: 2.9, NGN: 1530, GHS: 11.2, KES: 129, TZS: 2500, UGX: 3550, RWF: 1450, ETB: 141, BWP: 13.7, NAD: 17.7, MUR: 45.8, MZN: 63.9, ZMW: 23.5, XAF: 564, XOF: 564,
  ILS: 3.35, IQD: 1310, LBP: 89500, YER: 240, AFN: 68.5, IRR: 42000, SYP: 13000,
};

export function convertCurrency(amount: number, sourceCurrency: string, targetCurrency: string): number | null {
  if (!Number.isFinite(amount)) return null;
  const source = sourceCurrency.trim().toUpperCase();
  const target = targetCurrency.trim().toUpperCase();
  if (source === target) return amount;
  const sourceRate = USD_REFERENCE_RATES[source];
  const targetRate = USD_REFERENCE_RATES[target];
  if (!sourceRate || !targetRate) return null;
  return roundCurrency((amount / sourceRate) * targetRate, target);
}

export function hasReferenceRate(currency: string): boolean {
  return Boolean(USD_REFERENCE_RATES[currency.trim().toUpperCase()]);
}

function roundCurrency(value: number, currency: string): number {
  const decimals = ["JPY", "KRW", "VND", "IDR", "CLP", "PYG", "UGX", "RWF", "XAF", "XOF"].includes(currency) ? 0 : 2;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
