import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CalendarCheck2, CircleDollarSign, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { direction } from "@/lib/i18n";
import { partnerMarketingDictionary } from "@/lib/partner-marketing-i18n";
import { requestLocale } from "@/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const copy = partnerMarketingDictionary(locale);
  return {
    title: { absolute: copy.metaTitle },
    description: copy.metaDescription,
    robots: { index: true, follow: true },
  };
}

export default async function PartnerLandingPage() {
  const locale = await requestLocale();
  const copy = partnerMarketingDictionary(locale);

  return <main className="partnerMarketingPage" dir={direction(locale)}>
    <header className="partnerMarketingHeader">
      <div className="shell partnerMarketingHeaderInner">
        <Brand inverse/>
        <nav>
          <Link href="/">{copy.forTravelers}</Link>
          <Link href="/partner/login">{copy.partnerSignIn}</Link>
          <Link className="partnerCtaSmall" href="/partner/login">{copy.listProperty}</Link>
        </nav>
      </div>
    </header>

    <section className="partnerHero">
      <div className="shell partnerHeroGrid">
        <div>
          <span className="partnerEyebrow">{copy.eyebrow}</span>
          <h1>{copy.heroTitle}</h1>
          <p>{copy.heroBody}</p>
          <div className="partnerHeroActions">
            <Link className="partnerHeroPrimary" href="/partner/login">{copy.startListing}</Link>
            <Link className="partnerHeroSecondary" href="/partner/login">{copy.partnerSignIn}</Link>
          </div>
          <div className="partnerProof">
            <span><ShieldCheck size={18}/>{copy.verifiedMarketplace}</span>
            <span><Sparkles size={18}/>{copy.noSyntheticMetrics}</span>
          </div>
        </div>

        <div className="partnerHeroMock">
          <div className="partnerMockTop"><span>{copy.todayAtProperty}</span><strong>{copy.live}</strong></div>
          <div className="partnerMockGrid">
            <div><small>{copy.bookings}</small><strong>31</strong><em>{copy.bookingsTrend}</em></div>
            <div><small>{copy.bookedValue}</small><strong>4,920 JOD</strong><em>{copy.thirtyDayView}</em></div>
            <div><small>{copy.conversion}</small><strong>6.8%</strong><em>{copy.fromSearchImpressions}</em></div>
            <div><small>{copy.highDemandDate}</small><strong>29 Aug</strong><em>{copy.destinationSearches}</em></div>
          </div>
          <div className="partnerMockSignal">
            <BarChart3 size={20}/>
            <div><strong>{copy.opportunityDetected}</strong><p>{copy.opportunityBody}</p></div>
          </div>
        </div>
      </div>
    </section>

    <section className="shell partnerFeatureSection">
      <div className="partnerSectionIntro">
        <span className="eyebrow">{copy.builtForTeams}</span>
        <h2>{copy.featureTitle}</h2>
        <p>{copy.featureBody}</p>
      </div>
      <div className="partnerFeatureGrid">
        <article><CalendarCheck2/><h3>{copy.reservationsTitle}</h3><p>{copy.reservationsBody}</p></article>
        <article><CircleDollarSign/><h3>{copy.ratesTitle}</h3><p>{copy.ratesBody}</p></article>
        <article><MessageSquareText/><h3>{copy.messagesTitle}</h3><p>{copy.messagesBody}</p></article>
        <article><BarChart3/><h3>{copy.performanceTitle}</h3><p>{copy.performanceBody}</p></article>
      </div>
    </section>

    <section className="partnerHow">
      <div className="shell">
        <div className="partnerSectionIntro"><span className="eyebrow">{copy.goLive}</span><h2>{copy.stepsTitle}</h2></div>
        <div className="partnerSteps">
          <div><span>01</span><strong>{copy.createAccount}</strong><p>{copy.createAccountBody}</p></div>
          <div><span>02</span><strong>{copy.buildListing}</strong><p>{copy.buildListingBody}</p></div>
          <div><span>03</span><strong>{copy.submitReview}</strong><p>{copy.submitReviewBody}</p></div>
          <div><span>04</span><strong>{copy.startSelling}</strong><p>{copy.startSellingBody}</p></div>
        </div>
        <div className="partnerFinalCta">
          <div><span className="eyebrow">{copy.ready}</span><h2>{copy.finalTitle}</h2></div>
          <Link className="partnerHeroPrimary" href="/partner/login">{copy.join}</Link>
        </div>
      </div>
    </section>
  </main>;
}
