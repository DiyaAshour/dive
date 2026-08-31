"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { GuestLocale } from "@/lib/guest-market";

const COPY: Readonly<Record<GuestLocale,(name:string,city:string)=>string>> = {
  en:(name,city)=>`${name} is a fictional HandMeKey demo property in ${city}. It is shown for product testing and presentation only.`,
  ar:(name,city)=>`${name} هو مكان إقامة تجريبي على HandMeKey في ${city}، ويُعرض لأغراض اختبار المنتج والعرض التوضيحي فقط.`,
  zh:(name,city)=>`${name} 是 HandMeKey 在${city}的虚构演示住宿，仅用于产品测试和展示。`,
  fr:(name,city)=>`${name} est un établissement de démonstration fictif HandMeKey à ${city}. Il est présenté uniquement à des fins de test et de démonstration du produit.`,
  de:(name,city)=>`${name} ist eine fiktive HandMeKey-Demo-Unterkunft in ${city}. Sie wird ausschließlich zu Produkt-Test- und Präsentationszwecken angezeigt.`,
  es:(name,city)=>`${name} es un alojamiento ficticio de demostración de HandMeKey en ${city}. Se muestra únicamente para pruebas y presentación del producto.`,
  it:(name,city)=>`${name} è una struttura dimostrativa fittizia di HandMeKey a ${city}. Viene mostrata esclusivamente per test e presentazione del prodotto.`,
  tr:(name,city)=>`${name}, ${city} şehrinde bulunan kurgusal bir HandMeKey demo tesisidir. Yalnızca ürün testi ve tanıtım amacıyla gösterilmektedir.`,
  ru:(name,city)=>`${name} — вымышленный демонстрационный объект HandMeKey в городе ${city}. Он показан исключительно для тестирования и презентации продукта.`,
  ja:(name,city)=>`${name} は、${city}にある架空の HandMeKey デモ施設です。製品テストとプレゼンテーションの目的でのみ表示されています。`,
  ko:(name,city)=>`${name}은(는) ${city}에 있는 가상의 HandMeKey 데모 숙소입니다. 제품 테스트와 시연 목적으로만 표시됩니다.`,
  hi:(name,city)=>`${name}, ${city} में एक काल्पनिक HandMeKey डेमो प्रॉपर्टी है। इसे केवल उत्पाद परीक्षण और प्रस्तुति के लिए दिखाया गया है।`,
  pt:(name,city)=>`${name} é uma propriedade fictícia de demonstração da HandMeKey em ${city}. É exibida apenas para testes e apresentação do produto.`,
  id:(name,city)=>`${name} adalah properti demo fiktif HandMeKey di ${city}. Properti ini ditampilkan hanya untuk pengujian dan presentasi produk.`,
  th:(name,city)=>`${name} เป็นที่พักสาธิตสมมติของ HandMeKey ใน ${city} ซึ่งแสดงไว้เพื่อการทดสอบและนำเสนอผลิตภัณฑ์เท่านั้น`,
};

export function HotelDescriptionLocalizer() {
  const pathname=usePathname();

  useEffect(()=>{
    if(!pathname.startsWith("/hotel/"))return;
    const page=document.querySelector<HTMLElement>(".hotelExperience");
    const about=page?.querySelector<HTMLElement>(".hotelAbout");
    const paragraph=about?.querySelector<HTMLParagraphElement>("p:not(.muted)");
    if(!page||!about||!paragraph)return;

    const original=paragraph.dataset.originalDescription??paragraph.textContent?.trim()??"";
    if(!paragraph.dataset.originalDescription)paragraph.dataset.originalDescription=original;
    const isDemo=/fictional\s+HandMeKey\s+demo\s+property|product\s+testing\s+and\s+presentation\s+only/i.test(original);
    if(!isDemo)return;

    const rawLanguage=(page.getAttribute("lang")||document.documentElement.lang||"en").trim().toLowerCase().split(/[-_]/)[0];
    const locale=(rawLanguage in COPY?rawLanguage:"en") as GuestLocale;
    const heading=about.querySelector<HTMLHeadingElement>("h2")?.textContent?.trim()??"";
    const name=heading.replace(/^(about|عن)\s*[:：]?\s*/i,"").trim()||"HandMeKey Demo Property";
    const locationLine=page.querySelector<HTMLElement>(".premiumHotelHead p")?.textContent?.trim()??"";
    const city=locationLine.split("·")[0]?.split(",").pop()?.trim()||"Amman";
    paragraph.textContent=COPY[locale](name,city);
  },[pathname]);

  return null;
}
