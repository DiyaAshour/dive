import {database} from "@platform/database";
import {forbidden} from "../errors";
import {getCarCompanyForUser} from "./service";

const ACTIVE_RESERVATION_STATUSES = ["CONFIRMED", "MODIFIED"] as const;
const UPCOMING_RESERVATION_STATUSES = ["HOLD", "CONFIRMED", "MODIFIED"] as const;
const BOOKED_VALUE_STATUSES = ["CONFIRMED", "MODIFIED", "COMPLETED"] as const;
const DAY_MS = 86_400_000;

export async function getCarDashboardOverview(userId: string) {
  const access = await getCarCompanyForUser(userId);
  if (!access) forbidden("Car rental company access required");

  const companyId = access.company.id;
  const db = database();
  const now = new Date();
  const next24Hours = new Date(now.getTime() + DAY_MS);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

  const [
    vehicleCount,
    activeVehicles,
    maintenanceVehicles,
    locationCount,
    upcomingReservations,
    pendingHolds,
    next24hPickups,
    next24hReturns,
    busyVehicles,
    bookedValue,
    cancellations30d,
    recentReservations,
    nextPickups,
  ] = await Promise.all([
    db.carVehicle.count({where: {companyId}}),
    db.carVehicle.count({where: {companyId, status: "ACTIVE"}}),
    db.carVehicle.count({where: {companyId, status: "MAINTENANCE"}}),
    db.carRentalLocation.count({where: {companyId, active: true}}),
    db.carReservation.count({where: {companyId, status: {in: [...UPCOMING_RESERVATION_STATUSES]}, pickupAt: {gte: now}}}),
    db.carReservation.count({where: {companyId, status: "HOLD", pickupAt: {gte: now}}}),
    db.carReservation.count({where: {companyId, status: {in: [...UPCOMING_RESERVATION_STATUSES]}, pickupAt: {gte: now, lt: next24Hours}}}),
    db.carReservation.count({where: {companyId, status: {in: [...ACTIVE_RESERVATION_STATUSES]}, returnAt: {gte: now, lt: next24Hours}}}),
    db.carReservation.findMany({
      where: {
        companyId,
        status: {in: [...ACTIVE_RESERVATION_STATUSES]},
        pickupAt: {lte: now},
        returnAt: {gt: now},
        vehicle: {status: "ACTIVE"},
      },
      distinct: ["vehicleId"],
      select: {vehicleId: true},
    }),
    db.carReservation.aggregate({
      where: {companyId, createdAt: {gte: thirtyDaysAgo}, status: {in: [...BOOKED_VALUE_STATUSES]}},
      _sum: {total: true},
    }),
    db.carReservation.count({where: {companyId, createdAt: {gte: thirtyDaysAgo}, status: "CANCELLED"}}),
    db.carReservation.findMany({
      where: {companyId},
      orderBy: {createdAt: "desc"},
      take: 7,
      include: {vehicle: true, pickupLocation: true, returnLocation: true},
    }),
    db.carReservation.findMany({
      where: {companyId, status: {in: [...ACTIVE_RESERVATION_STATUSES]}, pickupAt: {gte: now}},
      orderBy: {pickupAt: "asc"},
      take: 5,
      include: {vehicle: true, pickupLocation: true},
    }),
  ]);

  const activeRentals = busyVehicles.length;
  const availableNow = Math.max(0, activeVehicles - activeRentals);
  const utilizationRate = activeVehicles > 0 ? Math.round((activeRentals / activeVehicles) * 100) : 0;

  return {
    company: access.company,
    membership: access.membership,
    metrics: {
      vehicleCount,
      activeVehicles,
      availableNow,
      activeRentals,
      utilizationRate,
      maintenanceVehicles,
      locationCount,
      upcomingReservations,
      pendingHolds,
      next24hPickups,
      next24hReturns,
      bookedValue30d: Number(bookedValue._sum.total ?? 0),
      cancellations30d,
    },
    recentReservations: recentReservations.map((reservation) => ({
      id: reservation.id,
      reference: reservation.reference,
      guestName: reservation.guestName,
      status: reservation.status,
      paymentMode: reservation.paymentMode,
      paymentCollector: reservation.paymentCollector,
      pickupAt: reservation.pickupAt.toISOString(),
      returnAt: reservation.returnAt.toISOString(),
      total: Number(reservation.total),
      currency: reservation.currency,
      vehicle: `${reservation.vehicle.make} ${reservation.vehicle.model}`,
      pickupLocation: reservation.pickupLocation.name,
      returnLocation: reservation.returnLocation.name,
    })),
    nextPickups: nextPickups.map((reservation) => ({
      id: reservation.id,
      reference: reservation.reference,
      guestName: reservation.guestName,
      pickupAt: reservation.pickupAt.toISOString(),
      vehicle: `${reservation.vehicle.make} ${reservation.vehicle.model}`,
      pickupLocation: reservation.pickupLocation.name,
    })),
  };
}
