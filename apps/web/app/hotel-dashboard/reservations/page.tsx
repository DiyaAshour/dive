import {redirect} from "next/navigation";
import {localDateInTimeZone} from "@platform/core";
import {reservationCenterQuerySchema} from "@platform/contracts";
import {getHotelWorkspace, listHotelReservationCenter, listUserHotels} from "@platform/server";
import {PartnerSidebar} from "@/components/partner-sidebar";
import {PartnerLanguageBar} from "@/components/partner-language-bar";
import {currentUser} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {direction} from "@/lib/i18n";
import OperationsBoard from "./operations-board";

export const dynamic = "force-dynamic";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{hotelId?: string; date?: string; scope?: string; q?: string}>;
}) {
  const user = await currentUser();
  if (!user) redirect("/partner/login");

  const locale = await requestLocale();
  const ar = locale === "ar";
  const hotels = await listUserHotels(user.id);
  if (!hotels.length) redirect("/partner/onboarding");

  const query = await searchParams;
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/partner/onboarding");

  const workspace = await getHotelWorkspace(user.id, selected.id);
  const fallbackDate = localDateInTimeZone(new Date(), workspace.timezone);
  const parsed = reservationCenterQuerySchema.safeParse({
    date: query.date ?? fallbackDate,
    scope: query.scope ?? "ALL",
    q: query.q ?? "",
  });
  const filters = parsed.success ? parsed.data : {date: fallbackDate, scope: "ALL" as const, q: ""};
  const report = await listHotelReservationCenter(user.id, workspace.id, filters);
  const roomOptions = workspace.roomTypes.map((room) => ({
    id: room.id,
    name: room.name,
    code: room.code,
    active: room.active,
    ratePlans: room.ratePlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      code: plan.code,
      active: plan.active,
    })),
  }));

  return (
    <main className="partnerAppShell" dir={direction(locale)}>
      <PartnerSidebar
        hotelId={workspace.id}
        hotelName={workspace.name}
        city={workspace.city}
        status={workspace.status}
        active="reservations"
        locale={locale}
      />
      <section className="partnerMain">
        <PartnerLanguageBar locale={locale}/>
        <div className="partnerTopbar">
          <div>
            <span className="partnerPageEyebrow">{ar ? "تشغيل الحجوزات" : "Reservation operations"}</span>
            <h1>{ar ? "مركز الحجوزات" : "Reservation center"}</h1>
            <p>
              {ar
                ? `الوصول والمغادرة والإقامة الحالية والإلغاءات وعدم الحضور — بتوقيت ${workspace.timezone}.`
                : `Arrivals, departures, in-house stays, cancellations and no-shows — in ${workspace.timezone}.`}
            </p>
          </div>
        </div>
        <div className="partnerPageIntro">
          <strong>{ar ? "كل تعديل يمر عبر محرك الحجز الحقيقي" : "Every commercial edit runs through the booking engine"}</strong>
          <span>
            {ar
              ? "تغيير التواريخ أو الغرفة يعيد التسعير ويفحص السعة والمخزون. الإلغاء يحتسب السياسة ويعيد المخزون والمحفظة عند الاستحقاق."
              : "Date or room changes reprice and recheck capacity and inventory. Cancellation evaluates policy, releases inventory and reconciles wallet credit when eligible."}
          </span>
        </div>
        <OperationsBoard
          hotelId={workspace.id}
          initialDate={report.date}
          initialScope={report.scope}
          initialQ={report.q}
          initialReservations={report.reservations}
          initialStats={report.stats}
          rooms={roomOptions}
          currency={workspace.currency}
          timezone={workspace.timezone}
          locale={locale}
        />
      </section>
    </main>
  );
}
