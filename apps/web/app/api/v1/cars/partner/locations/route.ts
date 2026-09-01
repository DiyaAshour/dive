import { createCarLocationSchema } from "@platform/contracts";
import { createCarRentalLocation, listCarCompanyLocations } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: Request) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    return ok(await listCarCompanyLocations(user.id));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = createCarLocationSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const input = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    ) as Parameters<typeof createCarRentalLocation>[1];
    return ok(await createCarRentalLocation(user.id, input), {status:201});
  } catch (error) { return handleApiError(error); }
}
