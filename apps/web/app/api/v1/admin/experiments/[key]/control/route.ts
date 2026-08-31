import type {NextRequest} from "next/server";
import {controlPlatformExperiment} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

const ACTIONS = new Set(["START","PAUSE","COMPLETE","KILL","UNKILL"] as const);
type Action = "START"|"PAUSE"|"COMPLETE"|"KILL"|"UNKILL";

export async function POST(request: NextRequest, {params}: {params: Promise<{key:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const body = await request.json().catch(() => null);
    const action = body && typeof body === "object" && !Array.isArray(body) ? String((body as Record<string,unknown>).action ?? "").toUpperCase() : "";
    if (!ACTIONS.has(action as Action)) return Response.json({data:null,error:{code:"INVALID_EXPERIMENT_ACTION",message:"action must be START, PAUSE, COMPLETE, KILL or UNKILL"}},{status:400});
    const {key} = await params;
    return ok(await controlPlatformExperiment(user.id, decodeURIComponent(key), action as Action));
  } catch (error) {
    return handleApiError(error);
  }
}
