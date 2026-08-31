"use client";

import type {ReactNode} from "react";
import {useEffect, useMemo, useState} from "react";
import {usePathname} from "next/navigation";
import {Brand} from "./brand";
import type {GuestLocale} from "@/lib/guest-market";
import type {SiteLaunchConfig} from "@/lib/site-launch";

type Props = Readonly<{
  locale: GuestLocale;
  config: SiteLaunchConfig;
  initialNow: number;
  children: ReactNode;
}>;

type LaunchCopy={labels:[string,string,string,string];aria:string;eyebrow:string;footer:string};
const COPY:Record<GuestLocale,LaunchCopy>={
  en:{labels:["Days","Hours","Minutes","Seconds"],aria:"HandMeKey launch countdown",eyebrow:"COMING SOON",footer:"HandMeKey is preparing the final hotel booking experience."},
  ar:{labels:["يوم","ساعة","دقيقة","ثانية"],aria:"العد التنازلي لإطلاق HandMeKey",eyebrow:"قريبًا",footer:"منصة HandMeKey للحجوزات الفندقية تجهّز تجربتها النهائية."},
  zh:{labels:["天","小时","分钟","秒"],aria:"HandMeKey 上线倒计时",eyebrow:"即将上线",footer:"HandMeKey 正在准备最终的酒店预订体验。"},
  fr:{labels:["Jours","Heures","Minutes","Secondes"],aria:"Compte à rebours du lancement de HandMeKey",eyebrow:"BIENTÔT",footer:"HandMeKey prépare l’expérience finale de réservation d’hôtel."},
  de:{labels:["Tage","Stunden","Minuten","Sekunden"],aria:"Countdown zum Start von HandMeKey",eyebrow:"BALD VERFÜGBAR",footer:"HandMeKey bereitet das finale Hotelbuchungserlebnis vor."},
  es:{labels:["Días","Horas","Minutos","Segundos"],aria:"Cuenta atrás para el lanzamiento de HandMeKey",eyebrow:"MUY PRONTO",footer:"HandMeKey está preparando la experiencia final de reserva de hoteles."},
  it:{labels:["Giorni","Ore","Minuti","Secondi"],aria:"Conto alla rovescia per il lancio di HandMeKey",eyebrow:"PROSSIMAMENTE",footer:"HandMeKey sta preparando l’esperienza finale di prenotazione hotel."},
  tr:{labels:["Gün","Saat","Dakika","Saniye"],aria:"HandMeKey lansman geri sayımı",eyebrow:"YAKINDA",footer:"HandMeKey son otel rezervasyonu deneyimini hazırlıyor."},
  ru:{labels:["Дни","Часы","Минуты","Секунды"],aria:"Обратный отсчёт до запуска HandMeKey",eyebrow:"СКОРО",footer:"HandMeKey готовит финальную версию сервиса бронирования отелей."},
  ja:{labels:["日","時間","分","秒"],aria:"HandMeKey 公開までのカウントダウン",eyebrow:"近日公開",footer:"HandMeKey はホテル予約体験の最終準備を進めています。"},
  ko:{labels:["일","시간","분","초"],aria:"HandMeKey 출시 카운트다운",eyebrow:"곧 출시",footer:"HandMeKey가 최종 호텔 예약 경험을 준비하고 있습니다."},
  hi:{labels:["दिन","घंटे","मिनट","सेकंड"],aria:"HandMeKey लॉन्च की उलटी गिनती",eyebrow:"जल्द आ रहा है",footer:"HandMeKey अंतिम होटल बुकिंग अनुभव तैयार कर रहा है।"},
  pt:{labels:["Dias","Horas","Minutos","Segundos"],aria:"Contagem regressiva para o lançamento do HandMeKey",eyebrow:"EM BREVE",footer:"O HandMeKey está preparando a experiência final de reserva de hotéis."},
  id:{labels:["Hari","Jam","Menit","Detik"],aria:"Hitung mundur peluncuran HandMeKey",eyebrow:"SEGERA HADIR",footer:"HandMeKey sedang menyiapkan pengalaman pemesanan hotel final."},
  th:{labels:["วัน","ชั่วโมง","นาที","วินาที"],aria:"นับถอยหลังเปิดตัว HandMeKey",eyebrow:"เร็ว ๆ นี้",footer:"HandMeKey กำลังเตรียมประสบการณ์จองโรงแรมเวอร์ชันสมบูรณ์"},
};

const BYPASS_PREFIXES = ["/admin", "/api", "/partner", "/hotel-dashboard"];

export function SiteLaunchGate({locale, config, initialNow, children}: Props) {
  const pathname = usePathname() || "/";
  const target = useMemo(() => config.launchAt ? new Date(config.launchAt).getTime() : null, [config.launchAt]);
  const [now, setNow] = useState(initialNow);
  const bypass = BYPASS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const active = config.enabled && target !== null && now < target;

  useEffect(() => {
    if (!config.enabled || target === null || bypass) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [config.enabled, target, bypass]);

  if (bypass || !active || target === null) return <>{children}</>;

  const remaining = Math.max(0, target - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const copy=COPY[locale];
  const rtl=locale==="ar";

  return <main className="launchPage" dir={rtl ? "rtl" : "ltr"}>
    <div className="launchGlow launchGlowOne"/>
    <div className="launchGlow launchGlowTwo"/>
    <section className="launchCard" aria-label={copy.aria}>
      <div className="launchBrand"><Brand href="/" inverse/></div>
      <span className="launchEyebrow">{copy.eyebrow}</span>
      <h1>{config.title}</h1>
      <p>{config.message}</p>
      <div className="launchCountdown" aria-live="polite">
        {[days, hours, minutes, seconds].map((value, index) => <article key={copy.labels[index]}>
          <strong>{String(value).padStart(2, "0")}</strong>
          <span>{copy.labels[index]}</span>
        </article>)}
      </div>
      <div className="launchDivider"/>
      <small>{copy.footer}</small>
    </section>
  </main>;
}
