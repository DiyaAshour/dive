import { database } from "@platform/database";
import { badRequest, forbidden, notFound } from "../errors";

export type ManagedCarReservationStatus = "CONFIRMED" | "CANCELLED" | "NO_SHOW" | "COMPLETED";

export type UpdateCarReservationStatusInput = Readonly<{
  status: ManagedCarReservationStatus;
  note?: string;
}>;

const terminalStatuses = new Set(["CANCELLED", "NO_SHOW", "COMPLETED", "EXPIRED"]);

export async function updateCarCompanyReservationStatus(
  userId: string,
  reservationId: string,
  input: UpdateCarReservationStatusInput,
) {
  const db = database();
  const membership = await db.carCompanyMembership.findFirst({
    where: {userId, status: "ACTIVE"},
    orderBy: {createdAt: "asc"},
    select: {companyId: true, role: true},
  });
  if (!membership) forbidden("Car rental company access required");
  if (membership.role === "VIEWER") forbidden("Viewer access cannot update reservations");

  const reservation = await db.carReservation.findFirst({
    where: {id: reservationId, companyId: membership.companyId},
    select: {
      id: true,
      reference: true,
      status: true,
      pickupAt: true,
      returnAt: true,
      confirmedAt: true,
    },
  });
  if (!reservation) notFound("Car reservation");

  if (terminalStatuses.has(reservation.status)) {
    badRequest("CAR_RESERVATION_FINAL", "This reservation is already in a final state");
  }

  const now = new Date();
  if (input.status === "NO_SHOW" && now.getTime() < reservation.pickupAt.getTime()) {
    badRequest("CAR_NO_SHOW_TOO_EARLY", "A reservation can only be marked no-show after the pickup time");
  }
  if (input.status === "COMPLETED" && now.getTime() < reservation.returnAt.getTime()) {
    badRequest("CAR_COMPLETE_TOO_EARLY", "A reservation can only be completed after the scheduled return time");
  }

  if (input.status === "CONFIRMED" && reservation.status !== "HOLD") {
    badRequest("CAR_CONFIRM_INVALID", "Only held reservations can be confirmed");
  }

  const note = input.note?.trim() || null;
  const updated = await db.carReservation.update({
    where: {id: reservation.id},
    data: {
      status: input.status,
      confirmedAt: input.status === "CONFIRMED" ? reservation.confirmedAt ?? now : reservation.confirmedAt,
      cancelledAt: input.status === "CANCELLED" ? now : null,
      cancellationNote: input.status === "CANCELLED" ? note : null,
    },
    select: {
      id: true,
      reference: true,
      status: true,
      cancellationNote: true,
      confirmedAt: true,
      cancelledAt: true,
      updatedAt: true,
    },
  });

  return {
    id: updated.id,
    reference: updated.reference,
    status: updated.status,
    cancellationNote: updated.cancellationNote,
    confirmedAt: updated.confirmedAt?.toISOString() ?? null,
    cancelledAt: updated.cancelledAt?.toISOString() ?? null,
    updatedAt: updated.updatedAt.toISOString(),
  };
}
