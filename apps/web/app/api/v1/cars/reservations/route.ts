import { createCarReservationSchema } from "@platform/contracts";
import { createCarReservation, ensureBookableDemoCar, listMyCarReservations } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { demoCars } from "@/lib/demo-cars";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: Request) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    return ok(await listMyCarReservations(user.id));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = createCarReservationSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const demoCar = demoCars.find((car) => car.id === parsed.data.vehicleId);
    if (demoCar) await ensureBookableDemoCar(demoCar);

    const input = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    ) as Parameters<typeof createCarReservation>[1];
    return ok(await createCarReservation(user.id, input), {status:201});
  } catch (error) { return handleApiError(error); }
}
