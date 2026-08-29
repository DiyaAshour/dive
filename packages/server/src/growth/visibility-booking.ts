import type { CreateBookingHoldInput } from "@platform/contracts";
import { roundMoney } from "@platform/core";
import { database } from "@platform/database";
import { createBookingHold } from "../bookings/service";
import { resolveVisibilityBoostAttribution } from "./visibility-boost";

const ATTRIBUTION_ACTION = "VISIBILITY_BOOST_ATTRIBUTION_DECIDED";

type Context = Readonly<{
  userId?: string | null;
  idempotencyKey: string;
  travelerCountry?: string | null;
  visibilityBoostToken?: string | null;
}>;

export async function createBookingHoldWithVisibilityBoost(input: CreateBookingHoldInput, context: Context) {
  const attribution = await resolveVisibilityBoostAttribution(context.visibilityBoostToken, context.travelerCountry, {
    hotelId: input.hotelId,
    arrival: input.arrival,
    departure: input.departure,
    adults: input.adults,
    children: input.children,
  });

  const result = await createBookingHold(input, {userId:context.userId ?? null,idempotencyKey:context.idempotencyKey});
  const bookingId = result.booking.id;

  await database().$transaction(async (tx) => {
    const decided = await tx.auditLog.findFirst({where:{entityType:"Booking",entityId:bookingId,action:ATTRIBUTION_ACTION},orderBy:{createdAt:"desc"},select:{id:true}});
    if (decided) return;
    const booking = await tx.booking.findUnique({where:{id:bookingId},select:{id:true,hotelId:true,baseAmount:true,commissionRateSnapshot:true,commissionAmount:true,status:true}});
    if (!booking) return;

    if (!attribution || booking.hotelId !== input.hotelId) {
      await tx.auditLog.create({data:{hotelId:booking.hotelId,actorUserId:context.userId ?? null,action:ATTRIBUTION_ACTION,entityType:"Booking",entityId:bookingId,after:{attributed:false}}});
      return;
    }

    const baseCommissionRate = Number(booking.commissionRateSnapshot);
    const totalCommissionRate = baseCommissionRate + attribution.extraCommissionPercent / 100;
    const commissionAmount = roundMoney(Number(booking.baseAmount) * totalCommissionRate);
    await tx.booking.update({where:{id:bookingId},data:{commissionRateSnapshot:totalCommissionRate,commissionAmount}});
    await tx.auditLog.create({data:{
      hotelId:booking.hotelId,
      actorUserId:context.userId ?? null,
      action:ATTRIBUTION_ACTION,
      entityType:"Booking",
      entityId:bookingId,
      before:{commissionRateSnapshot:baseCommissionRate,commissionAmount:Number(booking.commissionAmount)},
      after:{attributed:true,campaignId:attribution.campaignId,baseCommissionRate,extraCommissionPercent:attribution.extraCommissionPercent,totalCommissionRate,commissionAmount,travelerCountry:context.travelerCountry?.toUpperCase() ?? null},
    }});
  },{isolationLevel:"Serializable"});

  return {...result, visibilityBoost: attribution ? {campaignId:attribution.campaignId,extraCommissionPercent:attribution.extraCommissionPercent} : null};
}
