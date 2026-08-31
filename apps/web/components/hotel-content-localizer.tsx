"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function HotelContentLocalizer() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/hotel/")) return;
    const page = document.querySelector<HTMLElement>(".hotelExperience");
    if (!page) return;
    const locale = (page.getAttribute("lang") || document.documentElement.lang || "en").trim().toLowerCase().split(/[-_]/)[0];
    const hotelId = decodeURIComponent(pathname.slice("/hotel/".length).split("/")[0] ?? "");
    if (!hotelId || !locale) return;

    const controller = new AbortController();
    async function localize() {
      try {
        const query = new URLSearchParams({hotelId, locale});
        const response = await fetch(`/api/v1/hotel-translation?${query.toString()}`, {signal: controller.signal});
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        const translation = payload?.data?.translation as {name?: string | null; description?: string | null} | null | undefined;
        if (!translation) return;

        if (translation.name) {
          const title = page.querySelector<HTMLElement>(".premiumHotelHead h1");
          if (title) title.textContent = translation.name;
        }
        if (translation.description) {
          const about = page.querySelector<HTMLElement>(".hotelAbout");
          const description = about?.querySelector<HTMLParagraphElement>("p");
          if (description) {
            description.textContent = translation.description;
            description.classList.remove("muted");
            description.setAttribute("lang", locale);
            description.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.warn("[hotel-content-localizer] lookup failed", error);
      }
    }

    void localize();
    return () => controller.abort();
  }, [pathname]);

  return null;
}
