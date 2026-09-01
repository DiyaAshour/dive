"use client";

import { useRef, useState } from "react";
import { BellRing, CreditCard, ShieldCheck } from "lucide-react";

type HomeValueCarouselProps = {
  finalTitle: string;
  finalBody: string;
  policyTitle: string;
  policyBody: string;
  watchTitle: string;
  watchBody: string;
};

export function HomeValueCarousel({
  finalTitle,
  finalBody,
  policyTitle,
  policyBody,
  watchTitle,
  watchBody,
}: HomeValueCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = [
    {title: finalTitle, body: finalBody, Icon: CreditCard},
    {title: policyTitle, body: policyBody, Icon: ShieldCheck},
    {title: watchTitle, body: watchBody, Icon: BellRing},
  ];

  function updateActiveSlide() {
    const track = trackRef.current;
    if (!track) return;

    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    Array.from(track.children).forEach((child, index) => {
      const rect = (child as HTMLElement).getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - trackCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  }

  function goToSlide(index: number) {
    const slide = trackRef.current?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({behavior: "smooth", block: "nearest", inline: "center"});
  }

  return <>
    <div className="valueGrid homeValueCarousel" ref={trackRef} onScroll={updateActiveSlide}>
      {items.map(({title, body, Icon}) => <article key={title}>
        <span><Icon/></span>
        <h3>{title}</h3>
        <p>{body}</p>
      </article>)}
    </div>
    <div className="homeValueDots" aria-label={`${activeIndex + 1} / ${items.length}`}>
      {items.map(({title}, index) => <button
        type="button"
        key={title}
        className={activeIndex === index ? "isActive" : ""}
        onClick={() => goToSlide(index)}
        aria-label={title}
        aria-current={activeIndex === index ? "true" : undefined}
      />)}
    </div>
  </>;
}
