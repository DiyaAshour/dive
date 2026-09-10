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
  const ar=locale==="ar";

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

    <section className="shell partnerCommercial">
      <div className="partnerSectionIntro">
        <span className="eyebrow">{ar?"قبل أن تبدأ":"Before you start"}</span>
        <h2>{ar?"كيف تعمل العلاقة التجارية؟":"How does the commercial relationship work?"}</h2>
        <p>{ar?"الأسئلة التي يحتاج الفندق جوابها قبل التسجيل أو تفعيل البيع.":"The commercial questions a property should understand before listing or going live."}</p>
      </div>
      <div className="partnerCommercialGrid">
        <article><h3>{ar?"هل توجد عمولة؟":"Is there a commission?"}</h3><p>{ar?"أي عمولة أو رسوم تجارية يتم توضيحها في شروط الشريك قبل تفعيل الفندق. لا يفترض هذا الموقع نسبة واحدة لجميع الشركاء ولا يخصم رسماً غير ظاهر في الاتفاق.":"Any commission or commercial fee is disclosed in the partner terms before activation. This page does not assume one universal rate and HandMeKey does not deduct an undisclosed fee."}</p></article>
        <article><h3>{ar?"هل التسجيل مجاني؟":"Is sign-up free?"}</h3><p>{ar?"يمكن بدء إنشاء الحساب وتجهيز ملف الفندق قبل النشر. إذا انطبق رسم أو خدمة مدفوعة على نموذجك التجاري فسيظهر ذلك قبل الموافقة أو التفعيل.":"You can start account setup and build the property profile before publication. If a fee or paid service applies to your commercial model, it is shown before acceptance or activation."}</p></article>
        <article><h3>{ar?"متى يستلم الفندق مستحقاته؟":"When does the hotel get paid?"}</h3><p>{ar?"التوقيت يعتمد على نموذج الدفع الخاص بالحجز: دفع أونلاين أو دفع في الفندق أو نموذج يحدده الاتفاق. يجب أن يظهر مسار التحصيل والتسوية في شروط الشريك والحجز نفسه.":"Timing depends on the booking payment model: online collection, pay at property, or another agreed model. Collection and settlement terms are identified in the partner agreement and the reservation."}</p></article>
        <article><h3>{ar?"من يحصّل الدفع؟":"Who collects payment?"}</h3><p>{ar?"يعتمد على خيار السعر والحجز. HandMeKey توضح للمسافر وللفندق ما إذا كان الدفع يتم أونلاين أو عند الفندق قبل التأكيد.":"It depends on the rate and reservation. HandMeKey identifies whether payment is collected online or at the property before confirmation."}</p></article>
        <article><h3>{ar?"هل يوجد Channel Manager؟":"Channel-manager connectivity?"}</h3><p>{ar?"إدارة الأسعار والمخزون متاحة من Partner Hub. أي ربط خارجي مع PMS أو channel manager لا يتم الادعاء بدعمه إلا عندما يكون متوفراً ومفعلاً لذلك الفندق.":"Rates and inventory can be managed in Partner Hub. External PMS or channel-manager connectivity is only represented as supported when it is actually available and enabled for that property."}</p></article>
        <article><h3>{ar?"ما الفرق عن المنصات العالمية؟":"How is this different from global OTAs?"}</h3><p>{ar?"تركيز HandMeKey الحالي هو الأردن أولاً: سعر نهائي أوضح، تحكم مباشر للفندق، وتجربة أخف للمسافر والشريك. لا ندّعي امتلاك تغطية عالمية أوسع من المنصات الكبرى.":"HandMeKey is currently Jordan-first: clearer final pricing, direct property control and a lighter traveler/partner experience. We do not claim broader global inventory than the largest OTAs."}</p></article>
        <article><h3>{ar?"ما الأسواق المستهدفة؟":"Which markets are targeted?"}</h3><p>{ar?"الأولوية الحالية للفنادق والسفر داخل الأردن، ثم التوسع سوقاً بسوق بعد تثبيت الحجز والدعم والتسوية.":"The current priority is hotels and travel in Jordan, followed by market-by-market expansion after booking, support and settlement operations are proven."}</p></article>
        <article><h3>{ar?"من يدعم الضيف؟":"Who supports the guest?"}</h3><p>{ar?"HandMeKey هي نقطة التواصل الأولى للضيف في الحجز الذي تم عبر المنصة، مع التنسيق مع الفندق أو مزود التنفيذ عند الحاجة.":"HandMeKey is the traveler's first point of contact for a booking made on the platform, coordinating with the property or fulfillment partner when needed."}</p></article>
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
