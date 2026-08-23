import { cookies } from "next/headers";
import { getAdminSessionPrincipal, getSessionUser } from "@platform/server";
import { adminSessionCookieName } from "./admin-session";
import { sessionCookieName } from "./session";
export async function currentUser(){const cookieStore=await cookies();return getSessionUser(cookieStore.get(sessionCookieName())?.value??null)}
export async function currentAdminPrincipal(){const cookieStore=await cookies();return getAdminSessionPrincipal(cookieStore.get(adminSessionCookieName())?.value??null)}
