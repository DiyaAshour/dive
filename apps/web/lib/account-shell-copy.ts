import type {GuestLocale} from "./guest-market";

const COPY:Record<GuestLocale,{rewards:string;wallet:string;invoices:string}>={
  en:{rewards:"Rewards",wallet:"Wallet",invoices:"Invoices"},
  ar:{rewards:"المكافآت",wallet:"المحفظة",invoices:"الفواتير"},
  zh:{rewards:"奖励",wallet:"钱包",invoices:"发票"},
  fr:{rewards:"Récompenses",wallet:"Portefeuille",invoices:"Factures"},
  de:{rewards:"Prämien",wallet:"Wallet",invoices:"Rechnungen"},
  es:{rewards:"Recompensas",wallet:"Monedero",invoices:"Facturas"},
  it:{rewards:"Premi",wallet:"Portafoglio",invoices:"Fatture"},
  tr:{rewards:"Ödüller",wallet:"Cüzdan",invoices:"Faturalar"},
  ru:{rewards:"Награды",wallet:"Кошелёк",invoices:"Счета"},
  ja:{rewards:"リワード",wallet:"ウォレット",invoices:"請求書"},
  ko:{rewards:"리워드",wallet:"지갑",invoices:"청구서"},
  hi:{rewards:"रिवॉर्ड्स",wallet:"वॉलेट",invoices:"इनवॉइस"},
  pt:{rewards:"Recompensas",wallet:"Carteira",invoices:"Faturas"},
  id:{rewards:"Reward",wallet:"Dompet",invoices:"Faktur"},
  th:{rewards:"รางวัล",wallet:"วอลเล็ต",invoices:"ใบแจ้งหนี้"},
};
export function accountShellCopy(locale:GuestLocale){return COPY[locale];}
