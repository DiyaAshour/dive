import { cookies } from "next/headers";
import { getSessionUser } from "@platform/server";
import { sessionCookieName } from "./session";
export async function currentUser(){const cookieStore=await cookies();return getSessionUser(cookieStore.get(sessionCookieName())?.value??null)}
