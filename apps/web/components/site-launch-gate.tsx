"use client";

import type {ReactNode} from "react";
import {useEffect, useMemo, useState} from "react";
import {usePathname} from "next/navigation";
import {Brand} from "./brand";
import type {SiteLaunchConfig} from "@/lib/site-launch";

type Props = Readonly<{
  locale: string;
  config: SiteLaunchConfig;
  children: ReactNode;
}>;

const BYPASS_PREFIXES = ["/admin", "/api", "/partner", "/hotel-dashboard"];

export function SiteLaunchGate({locale, config, children}: Props) {
  const pathname = usePathname() || "/";
  const target = useMemo(() => config.launchAt ? new Date(config.launchAt).getTime() : null, [config.launchAt]);
  const [now, setNow] = useState(() => Date.now());
  const bypass = BYPASS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const active = config.enabled && target !== null && now < target;

  useEffect(() => {
    if (!config.enabled || target === null || bypass) return;
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
  const ar = locale === "ar";
  const labels = ar ? ["يوم", "ساعة", "دقيقة", "ثانية"] : ["Days", "Hours", "Minutes", "Seconds"];

  return <main className="launchPage" dir={ar ? "rtl" : "ltr"}>
    <div className="launchGlow launchGlowOne"/>
    <div className="launchGlow launchGlowTwo"/>
    <section className="launchCard" aria-label={ar ? "العد التنازلي لإطلاق HandMeKey" : "HandMeKey launch countdown"}>
      <div className="launchBrand"><Brand href="/" inverse/></div>
      <span className="launchEyebrow">{ar ? "قريبًا" : "COMING SOON"}</span>
      <h1>{config.title}</h1>
      <p>{config.message}</p>
      <div className="launchCountdown" aria-live="polite">
        {[days, hours, minutes, seconds].map((value, index) => <article key={labels[index]}>
          <strong>{String(value).padStart(2, "0")}</strong>
          <span>{labels[index]}</span>
        </article>)}
      </div>
      <div className="launchDivider"/>
      <small>{ar ? "منصة HandMeKey للحجوزات الفندقية تجهّز تجربتها النهائية." : "HandMeKey is preparing the final hotel booking experience."}</small>
    </section>
  </main>;
}
