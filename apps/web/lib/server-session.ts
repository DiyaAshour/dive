import { cookies } from "next/headers";
import { getAdminSessionPrincipal, getSessionUser } from "@platform/server";
import { adminSessionCookieName } from "./admin-session";
import { sessionCookieName } from "./session";

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value ?? null;
  if (!token) return null;
  try {
    return await getSessionUser(token);
  } catch {
    return null;
  }
}

export async function currentAdminPrincipal() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookieName())?.value ?? null;
  if (!token) return null;
  try {
    return await getAdminSessionPrincipal(token);
  } catch {
    return null;
  }
}
