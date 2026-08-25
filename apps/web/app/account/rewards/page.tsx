import { redirect } from "next/navigation";
import { Award, BedDouble, CircleDollarSign, Gem, Sparkles } from "lucide-react";
import { getLoyaltyOverview } from "@platform/server";
import { AccountShell } from "@/components/account-shell";
import { requestLocale } from "@/lib/request-locale";
import { currentUser } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account/rewards");
  const [rewards, locale] = await Promise.all([getLoyaltyOverview(user.id), requestLocale()]);
  const ar = locale === "ar";
  const tier = tierLabel(rewards.tier);
  const nextTier = rewards.progress.nextTier ? tierLabel(rewards.progress.nextTier) : null;

  return <AccountShell
    active="rewards"
    eyebrow="HandMeKey Rewards"
    title={ar ? "كل إقامة تقرّبك من مكافأتك التالية." : "Every stay moves you toward something better."}
    description={ar ? "اكسب نقاطًا على سعر الغرفة المؤهل بعد إتمام الإقامة، وارتقِ في مستويات HandMeKey Rewards مع الليالي التي تقضيها." : "Earn points on eligible room base after completed stays and move through HandMeKey Rewards tiers as you stay more."}
  >
    <section className={`rewardsHero rewardsTier-${rewards.tier.toLowerCase()}`}>
      <div className="rewardsHeroCopy">
        <span className="rewardsProgram"><Gem size={17}/> HandMeKey Rewards</span>
        <div className="rewardsTierLine"><strong>{tier}</strong><span>{ar ? "مستواك الحالي" : "Current tier"}</span></div>
        <p>{rewards.tier === "BLACK"
          ? (ar ? "وصلت إلى أعلى مستوى حالي في البرنامج." : "You have reached the highest current Rewards tier.")
          : (ar ? `${rewards.progress.nightsToNextTier} ليلة مؤهلة تفصلك عن ${nextTier}.` : `${rewards.progress.nightsToNextTier} qualifying nights to ${nextTier}.`)}</p>
      </div>
      <div className="rewardsBalance">
        <span>{ar ? "رصيد النقاط" : "Points balance"}</span>
        <strong>{rewards.pointsBalance.toLocaleString()}</strong>
        <small>{ar ? `${rewards.lifetimePointsEarned.toLocaleString()} نقطة مكتسبة إجمالًا` : `${rewards.lifetimePointsEarned.toLocaleString()} lifetime points earned`}</small>
      </div>
    </section>

    <section className="rewardsProgressCard">
      <div className="rewardsProgressTop">
        <div><span className="accountCardLabel">{ar ? "التقدم" : "Tier progress"}</span><h2>{ar ? `${rewards.qualifyingNights} ليلة مؤهلة` : `${rewards.qualifyingNights} qualifying nights`}</h2></div>
        <div className="rewardsProgressStats"><span>{ar ? "الإقامات" : "Stays"}<strong>{rewards.qualifyingStays}</strong></span><span>{ar ? "الكسب" : "Earn rate"}<strong>{rewards.pointsPerJod}×</strong></span></div>
      </div>
      <div className="rewardsProgressTrack" aria-label={ar ? "التقدم للمستوى التالي" : "Progress to next tier"}><span style={{width:`${rewards.progress.percent}%`}}/></div>
      <div className="rewardsProgressLabels"><span>{tier}</span><span>{nextTier ?? tier}</span></div>
    </section>

    <div className="rewardsBenefits">
      <article><span><CircleDollarSign size={20}/></span><div><h3>{ar ? "اكسب على سعر الغرفة" : "Earn on room base"}</h3><p>{ar ? `مستوى ${tier} يمنحك ${rewards.pointsPerJod} نقطة لكل 1 د.أ مؤهل من سعر الغرفة.` : `${tier} earns ${rewards.pointsPerJod} points for every eligible JOD 1 of room base.`}</p></div></article>
      <article><span><BedDouble size={20}/></span><div><h3>{ar ? "بعد الإقامة فقط" : "Completed stays only"}</h3><p>{ar ? "لا نحسب نقاطًا على حجز ملغي أو no-show، وتُنشر النقاط بعد تاريخ المغادرة." : "Cancelled bookings and no-shows do not earn. Points post only after departure."}</p></div></article>
      <article><span><Award size={20}/></span><div><h3>{ar ? "مستويات تكافئ الولاء" : "Tiers reward loyalty"}</h3><p>{ar ? "Member يبدأ بـ10×، Key Gold بـ12×، وKey Black بـ15× على الإقامات المؤهلة." : "Member starts at 10×, Key Gold earns 12× and Key Black earns 15× on eligible stays."}</p></div></article>
    </div>

    <section className="rewardsActivityCard">
      <div className="rewardsSectionHead"><div><span className="accountCardLabel">{ar ? "دفتر النقاط" : "Points ledger"}</span><h2>{ar ? "آخر النشاطات" : "Recent activity"}</h2></div><span className="rewardsComing"><Sparkles size={15}/>{ar ? "استخدام النقاط في الحجز قريبًا" : "Use points at checkout coming next"}</span></div>
      {rewards.recentActivity.length ? <div className="rewardsActivityList">
        {rewards.recentActivity.map((entry) => <div className="rewardsActivityRow" key={entry.id}>
          <div className="rewardsActivityIcon"><Gem size={17}/></div>
          <div className="rewardsActivityCopy">
            <strong>{entry.hotelName ?? (ar ? "تعديل نقاط" : "Points activity")}</strong>
            <span>{entry.bookingReference ? `${ar ? "الحجز" : "Booking"} ${entry.bookingReference}` : entry.type}</span>
            <small>{entry.createdAt.toLocaleDateString(ar ? "ar-JO" : "en", {year:"numeric",month:"short",day:"numeric"})}{entry.eligibleAmount !== null && entry.currency ? ` · ${entry.eligibleAmount.toFixed(2)} ${entry.currency}` : ""}</small>
          </div>
          <strong className={entry.points >= 0 ? "rewardsPointsPositive" : "rewardsPointsNegative"}>{entry.points >= 0 ? "+" : ""}{entry.points.toLocaleString()}</strong>
        </div>)}
      </div> : <div className="rewardsEmpty"><Gem size={25}/><h3>{ar ? "رصيدك يبدأ مع أول إقامة مكتملة" : "Your balance starts with your first completed stay"}</h3><p>{ar ? "احجز وأنت مسجل الدخول، وبعد المغادرة ننشر النقاط تلقائيًا في دفتر المكافآت." : "Book while signed in and, after departure, your eligible points are posted automatically to this ledger."}</p></div>}
    </section>

    <p className="rewardsFinePrint">{ar ? "الإطلاق المحلي: تحتسب النقاط حاليًا على الحجوزات المؤهلة بعملة JOD فقط. سعر الغرفة الأساسي بعد الخصم هو أساس الكسب، ولا تدخل الضرائب أو رسوم الخدمة ضمن النقاط." : "Local-launch rule: points currently accrue only on eligible JOD bookings. The discounted room base is the earning base; taxes and service charges do not earn points."}</p>
  </AccountShell>;
}

function tierLabel(tier: "MEMBER" | "GOLD" | "BLACK"): string {
  if (tier === "GOLD") return "Key Gold";
  if (tier === "BLACK") return "Key Black";
  return "Member";
}
