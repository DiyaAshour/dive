import { updateCarCompanyReservationStatus, type ManagedCarReservationStatus } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

const allowedStatuses = new Set<ManagedCarReservationStatus>([
  "CONFIRMED",
  "CANCELLED",
  "NO_SHOW",
  "COMPLETED",
]);

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) {
      return Response.json(
        {data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}},
        {status: 401},
      );
    }

    const [{id}, body] = await Promise.all([params, request.json() as Promise<unknown>]);
    if (!body || typeof body !== "object") {
      return invalidRequest("Reservation update payload is required");
    }

    const status = "status" in body ? String(body.status) : "";
    if (!allowedStatuses.has(status as ManagedCarReservationStatus)) {
      return invalidRequest("Unsupported car reservation status");
    }

    const note = "note" in body && body.note != null ? String(body.note).slice(0, 1000) : undefined;
    return ok(await updateCarCompanyReservationStatus(user.id, id, {
      status: status as ManagedCarReservationStatus,
      ...(note !== undefined ? {note} : {}),
    }));
  } catch (error) {
    return handleApiError(error);
  }
}

function invalidRequest(message: string) {
  return Response.json(
    {data: null, error: {code: "INVALID_REQUEST", message}},
    {status: 400},
  );
}
