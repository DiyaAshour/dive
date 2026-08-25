import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, Coins, Crown, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { CustomerHeader } from "@/components/customer-header";
import { siteUrl } from "@/lib/site-url";

const copy = {
  en: {
    seoTitle: "HandMeKey Rewards | Earn hotel points on every eligible stay",
    seoDescription: "Join HandMeKey Rewards and earn points on eligible hotel stays. Move from Member to Key Gold and Key Black as you complete qualifying nights.",
    eyebrow: "HandMeKey Rewards",
    title: "Every completed stay moves you closer to the next reward.",
    intro: "Book while signed in, complete your stay, and earn points from the eligible room base. Your balance, tier and every points movement stay visible in one account.",
    cta: "Find a stay",
    account: "Open my Rewards",
    howTitle: "How HandMeKey Rewards works",
    howIntro: "Rewards are built around completed stays, not clicks, registrations or temporary promotions.",
    steps: [
      ["1", "Book while signed in", "Use your HandMeKey account so the reservation is securely linked to you."],
      ["2", "Complete the stay", "Eligible points post only after the hotel-local departure date. Cancelled, expired and no-show bookings do not earn."],
      ["3", "Watch your tier grow", "Qualifying nights move you toward Key Gold and Key Black while your points ledger keeps the history."],
    ],
    levelsTitle: "Three levels. Faster earning as you stay more.",
    levelsIntro: "The launch program is simple enough to understand at a glance and strict enough to keep the economics trustworthy.",
    levels: [
      ["Member", "10 points / JOD", "Start earning from your first eligible completed stay.", "No minimum nights"],
      ["Key Gold", "12 points / JOD", "Earn 20% faster once you reach the Gold qualification threshold.", "From 5 qualifying nights"],
      ["Key Black", "15 points / JOD", "Our highest launch tier earns 50% faster than Member.", "From 15 qualifying nights"],
    ],
    eligibleTitle: "Points are calculated from a real booking amount",
    eligibleBody: "For the Jordan launch, points are earned on the persisted JOD room base after any applicable promotion. Employee service and tax / mandatory charges do not earn points. This keeps the reward calculation tied to the same booking record used by HandMeKey's reservation engine.",
    integrityTitle: "Designed to stay understandable",
    integrity: [
      ["Completed stays only", "No points are awarded for holds, expired reservations, cancellations or no-shows."],
      ["One award per stay", "Each eligible booking has a unique loyalty settlement key that prevents duplicate awards."],
      ["A visible ledger", "Your Rewards account shows the points movement instead of hiding everything behind a single unexplained balance."],
      ["No fake redemption", "Point redemption is not advertised until it is fully connected to checkout, payment and financial events."],
    ],
    faqTitle: "HandMeKey Rewards questions",
    faq: [
      ["When do I receive my points?", "After an eligible confirmed or modified stay reaches its departure date in the hotel's local timezone."],
      ["What part of the price earns points?", "At launch, the eligible amount is the room base in JOD after promotion pricing. Service and tax / mandatory charges are excluded."],
      ["Do cancelled bookings earn points?", "No. Cancelled, expired, no-show and hold bookings do not earn points."],
      ["How do I reach Key Gold?", "Reach 5 qualifying nights. Key Gold then earns 12 points for each eligible JOD."],
      ["How do I reach Key Black?", "Reach 15 qualifying nights. Key Black earns 15 points for each eligible JOD."],
      ["Can I spend points yet?", "Not yet. HandMeKey will only switch on redemption after it is integrated into live checkout and financial accounting rather than simulated as a UI discount."],
      ["Where can I see my points history?", "Signed-in travelers can open Account → Rewards to see balance, tier, progress and recent ledger entries."],
    ],
    finalTitle: "Start with the stay. Let the points follow.",
    finalBody: "Search verified properties, compare the final stay total, and keep your eligible bookings connected to one HandMeKey account.",
  },
  ar: {
    seoTitle: "مكافآت HandMeKey | اكسب نقاط على حجوزات الفنادق المؤهلة",
    seoDescription: "انضم إلى مكافآت HandMeKey واكسب نقاطًا على الإقامات الفندقية المؤهلة، وتدرج من Member إلى Key Gold ثم Key Black مع الليالي المؤهلة.",
    eyebrow: "مكافآت HandMeKey",
    title: "كل إقامة مكتملة تقرّبك من مكافأتك التالية.",
    intro: "احجز وأنت مسجّل الدخول، أكمل إقامتك، واكسب نقاطًا من قيمة الغرفة المؤهلة. رصيدك ومستواك وكل حركة نقاط تبقى واضحة داخل حساب واحد.",
    cta: "ابحث عن إقامة",
    account: "افتح مكافآتي",
    howTitle: "كيف تعمل مكافآت HandMeKey؟",
    howIntro: "البرنامج مبني على الإقامات المكتملة فعليًا، وليس على النقرات أو التسجيل أو العروض المؤقتة.",
    steps: [
      ["1", "احجز وأنت مسجّل الدخول", "استخدم حساب HandMeKey حتى يرتبط الحجز بك بشكل آمن."],
      ["2", "أكمل الإقامة", "تُضاف النقاط المؤهلة فقط بعد تاريخ المغادرة حسب توقيت الفندق. الحجوزات الملغاة أو المنتهية أو عدم الحضور لا تكسب نقاطًا."],
      ["3", "ارفع مستواك", "الليالي المؤهلة تقرّبك من Key Gold ثم Key Black، وسجل النقاط يحتفظ بتاريخ كل حركة."],
    ],
    levelsTitle: "ثلاثة مستويات. كسب أسرع كلما زادت إقاماتك.",
    levelsIntro: "صممنا النسخة الأولى لتكون سهلة الفهم للضيف ومنضبطة اقتصاديًا للمنصة.",
    levels: [
      ["Member", "10 نقاط / د.أ", "ابدأ الكسب من أول إقامة مكتملة ومؤهلة.", "بدون حد أدنى من الليالي"],
      ["Key Gold", "12 نقطة / د.أ", "اكسب أسرع بنسبة 20% بعد الوصول إلى حد Gold.", "من 5 ليالٍ مؤهلة"],
      ["Key Black", "15 نقطة / د.أ", "أعلى مستوى عند الإطلاق ويكسب أسرع بنسبة 50% من Member.", "من 15 ليلة مؤهلة"],
    ],
    eligibleTitle: "النقاط محسوبة من مبلغ حجز حقيقي",
    eligibleBody: "عند الإطلاق في الأردن، تُحتسب النقاط على قيمة الغرفة الأساسية المحفوظة بالحجز بالدينار الأردني بعد الخصم إن وجد. رسوم الخدمة والضرائب أو الرسوم الإلزامية لا تكسب نقاطًا. هكذا تبقى المكافأة مرتبطة بنفس سجل الحجز الذي يستخدمه محرك HandMeKey.",
    integrityTitle: "برنامج واضح من البداية",
    integrity: [
      ["إقامات مكتملة فقط", "لا نقاط للحجز المعلّق أو المنتهي أو الملغى أو عدم الحضور."],
      ["مكافأة واحدة لكل إقامة", "كل حجز مؤهل يملك مفتاح تسوية فريد يمنع تكرار منح النقاط."],
      ["سجل نقاط واضح", "حساب Rewards يعرض حركة النقاط بدل الاكتفاء برصيد نهائي غير مفسر."],
      ["لا استبدال وهمي", "لن نعرض استبدال النقاط قبل ربطه فعليًا بالـcheckout والدفع والسجلات المالية."],
    ],
    faqTitle: "أسئلة شائعة عن مكافآت HandMeKey",
    faq: [
      ["متى تنزل النقاط؟", "بعد وصول الحجز المؤهل والمؤكد أو المعدل إلى تاريخ المغادرة حسب التوقيت المحلي للفندق."],
      ["أي جزء من السعر يكسب نقاطًا؟", "عند الإطلاق، المبلغ المؤهل هو قيمة الغرفة الأساسية بالدينار بعد الخصم. الخدمة والضريبة أو الرسوم الإلزامية مستثناة."],
      ["هل الحجز الملغى يكسب نقاطًا؟", "لا. الحجوزات الملغاة والمنتهية وعدم الحضور والحجوزات المعلقة لا تكسب نقاطًا."],
      ["كيف أصل إلى Key Gold؟", "بعد 5 ليالٍ مؤهلة. بعدها يصبح معدل الكسب 12 نقطة لكل دينار مؤهل."],
      ["كيف أصل إلى Key Black؟", "بعد 15 ليلة مؤهلة. بعدها يصبح معدل الكسب 15 نقطة لكل دينار مؤهل."],
      ["هل أقدر أستبدل النقاط الآن؟", "ليس بعد. سيتم تفعيل الاستبدال فقط عندما يكون مرتبطًا بالحجز المباشر والدفع والمحاسبة المالية، وليس كخصم شكلي في الواجهة."],
      ["وين أشوف سجل نقاطي؟", "بعد تسجيل الدخول افتح الحساب ثم Rewards لتشاهد الرصيد والمستوى والتقدم وآخر حركات النقاط."],
    ],
    finalTitle: "ابدأ بالإقامة، وخلي النقاط تتبعها.",
    finalBody: "ابحث عن منشآت موثقة، قارن السعر النهائي، وخلي حجوزاتك المؤهلة مرتبطة بحساب HandMeKey واحد.",
  },
} as const;

type Locale = keyof typeof copy;

export function generateStaticParams() { return [{locale:"en"},{locale:"ar"}]; }

export async function generateMetadata({params}: {params: Promise<{locale:string}>}): Promise<Metadata> {
  const {locale:raw} = await params;
  if (raw!=="en" && raw!=="ar") return {};
  const locale = raw as Locale;
  const c = copy[locale];
  const canonical = siteUrl(`/rewards/${locale}`);
  return {
    title: c.seoTitle,
    description: c.seoDescription,
    alternates: {canonical, languages: {"en":siteUrl("/rewards/en"),"ar":siteUrl("/rewards/ar"),"x-default":siteUrl("/rewards/en")}},
    openGraph: {type:"website",url:canonical,title:c.seoTitle,description:c.seoDescription,siteName:"HandMeKey",locale:locale==="ar"?"ar_JO":"en_US"},
    twitter: {card:"summary_large_image",title:c.seoTitle,description:c.seoDescription},
  };
}

export default async function RewardsLandingPage({params}: {params: Promise<{locale:string}>}) {
  const {locale:raw}=await params;
  if(raw!=="en"&&raw!=="ar")notFound();
  const locale=raw as Locale;
  const c=copy[locale];
  const rtl=locale==="ar";
  const structuredData = {
    "@context":"https://schema.org",
    "@type":"WebPage",
    name:c.seoTitle,
    description:c.seoDescription,
    url:siteUrl(`/rewards/${locale}`),
    inLanguage:locale,
    isPartOf:{"@type":"WebSite",name:"HandMeKey",url:siteUrl()},
    breadcrumb:{"@type":"BreadcrumbList",itemListElement:[
      {"@type":"ListItem",position:1,name:"HandMeKey",item:siteUrl()},
      {"@type":"ListItem",position:2,name:c.eyebrow,item:siteUrl(`/rewards/${locale}`)},
    ]},
  };
  return <main className="rewardsLanding" dir={rtl?"rtl":"ltr"}>
    <CustomerHeader/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData)}}/>
    <section className="rewardsHero"><div className="shell rewardsHeroGrid"><div><span className="eyebrow"><Sparkles size={16}/>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.intro}</p><div className="rewardsHeroActions"><Link className="primaryButton" href="/search">{c.cta}<ArrowRight size={17}/></Link><Link className="secondaryButton" href="/account/rewards">{c.account}</Link></div><div className="rewardsLanguageLinks"><Link href="/rewards/en" hrefLang="en">English</Link><Link href="/rewards/ar" hrefLang="ar">العربية</Link></div></div><div className="rewardsKeyVisual" aria-hidden="true"><div><KeyRound size={58}/><strong>10×</strong><span>Member</span></div><div><Crown size={54}/><strong>12×</strong><span>Key Gold</span></div><div><Sparkles size={54}/><strong>15×</strong><span>Key Black</span></div></div></div></section>

    <section className="shell rewardsSection"><div className="rewardsSectionHead"><span className="eyebrow">01</span><h2>{c.howTitle}</h2><p>{c.howIntro}</p></div><div className="rewardsSteps">{c.steps.map(([number,title,body])=><article key={number}><b>{number}</b><h3>{title}</h3><p>{body}</p></article>)}</div></section>

    <section className="rewardsLevelsBand"><div className="shell rewardsSection"><div className="rewardsSectionHead"><span className="eyebrow">02</span><h2>{c.levelsTitle}</h2><p>{c.levelsIntro}</p></div><div className="rewardsLevels">{c.levels.map(([name,rate,body,threshold],index)=><article className={index===2?"black":index===1?"gold":""} key={name}><span>{index===0?<BadgeCheck size={22}/>:index===1?<Crown size={22}/>:<Sparkles size={22}/>}</span><h3>{name}</h3><strong>{rate}</strong><p>{body}</p><small>{threshold}</small></article>)}</div></div></section>

    <section className="shell rewardsSection rewardsExplain"><div><span className="eyebrow">03</span><h2>{c.eligibleTitle}</h2><p>{c.eligibleBody}</p></div><div className="rewardsFormula"><Coins size={34}/><strong>Eligible room base × tier earning rate</strong><span>JOD launch model</span></div></section>

    <section className="shell rewardsSection"><div className="rewardsSectionHead"><span className="eyebrow">04</span><h2>{c.integrityTitle}</h2></div><div className="rewardsIntegrity">{c.integrity.map(([title,body])=><article key={title}><ShieldCheck size={21}/><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>

    <section className="shell rewardsSection rewardsFaq"><div className="rewardsSectionHead"><span className="eyebrow">FAQ</span><h2>{c.faqTitle}</h2></div><div>{c.faq.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className="rewardsFinal"><div className="shell"><KeyRound size={35}/><h2>{c.finalTitle}</h2><p>{c.finalBody}</p><Link className="primaryButton" href="/search">{c.cta}<ArrowRight size={17}/></Link></div></section>
  </main>;
}
