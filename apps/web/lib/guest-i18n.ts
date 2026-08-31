import {dictionary} from "./i18n";
import type {GuestLocale} from "./guest-market";
import {zh} from "./locales/zh";
import {fr} from "./locales/fr";
import {de} from "./locales/de";
import {es} from "./locales/es";
import {it} from "./locales/it";
import {tr} from "./locales/tr";
import {ru} from "./locales/ru";
import {ja} from "./locales/ja";
import {ko} from "./locales/ko";
import {hi} from "./locales/hi";
import {pt} from "./locales/pt";
import {id} from "./locales/id";
import {th} from "./locales/th";

type Dictionary = ReturnType<typeof dictionary>;
type TranslatedLocale = Exclude<GuestLocale,"en"|"ar">;

const translatedDictionaries = {
  zh,fr,de,es,it,tr,ru,ja,ko,hi,pt,id,th,
} satisfies Record<TranslatedLocale,Dictionary>;

export function guestDictionary(locale:GuestLocale):Dictionary {
  if(locale==="en"||locale==="ar") return dictionary(locale);
  return translatedDictionaries[locale];
}

export function guestMarketCopy(locale:GuestLocale) {
  const copies: Record<GuestLocale,{approx:string;charged:string;currency:string;auto:string}> = {
    en:{approx:"approx.",charged:"The booking is charged in the hotel's original currency",currency:"Currency",auto:"Automatically selected for your region"},
    ar:{approx:"تقريبًا",charged:"سيتم احتساب الحجز بعملة الفندق",currency:"العملة",auto:"اختيار تلقائي حسب موقعك"},
    zh:{approx:"约",charged:"预订将按酒店原始币种计费",currency:"货币",auto:"已根据您的地区自动选择"},
    fr:{approx:"env.",charged:"La réservation sera facturée dans la devise de l'hôtel",currency:"Devise",auto:"Sélection automatique selon votre région"},
    de:{approx:"ca.",charged:"Die Buchung wird in der Hotelwährung berechnet",currency:"Währung",auto:"Automatisch nach Region gewählt"},
    es:{approx:"aprox.",charged:"La reserva se cobrará en la moneda original del hotel",currency:"Moneda",auto:"Selección automática según tu región"},
    it:{approx:"circa",charged:"La prenotazione sarà addebitata nella valuta originale dell'hotel",currency:"Valuta",auto:"Selezione automatica in base alla tua regione"},
    tr:{approx:"yakl.",charged:"Rezervasyon otelin kendi para biriminde tahsil edilir",currency:"Para birimi",auto:"Bölgenize göre otomatik seçildi"},
    ru:{approx:"примерно",charged:"Бронирование оплачивается в исходной валюте отеля",currency:"Валюта",auto:"Автоматически выбрано для вашего региона"},
    ja:{approx:"約",charged:"予約はホテルの元の通貨で請求されます",currency:"通貨",auto:"地域に応じて自動選択"},
    ko:{approx:"약",charged:"예약은 호텔의 원래 통화로 청구됩니다",currency:"통화",auto:"지역에 따라 자동 선택"},
    hi:{approx:"लगभग",charged:"बुकिंग का शुल्क होटल की मूल मुद्रा में लिया जाएगा",currency:"मुद्रा",auto:"आपके क्षेत्र के अनुसार स्वतः चुना गया"},
    pt:{approx:"aprox.",charged:"A reserva será cobrada na moeda original do hotel",currency:"Moeda",auto:"Selecionado automaticamente para sua região"},
    id:{approx:"sekitar",charged:"Pemesanan ditagihkan dalam mata uang asli hotel",currency:"Mata uang",auto:"Dipilih otomatis sesuai wilayah Anda"},
    th:{approx:"ประมาณ",charged:"การจองจะเรียกเก็บเป็นสกุลเงินเดิมของโรงแรม",currency:"สกุลเงิน",auto:"เลือกอัตโนมัติตามภูมิภาคของคุณ"},
  };
  return copies[locale];
}
