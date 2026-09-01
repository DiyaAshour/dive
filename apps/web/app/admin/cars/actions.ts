"use server";

import { revalidatePath } from "next/cache";
import { updateAdminCarCompany } from "@platform/server";
import { currentAdminPrincipal } from "@/lib/server-session";

const allowedStatuses = new Set(["DRAFT", "PENDING_REVIEW", "ACTIVE", "SUSPENDED"]);

export async function updateCarCompanyDecision(formData: FormData) {
  const principal = await currentAdminPrincipal();
  if (!principal) throw new Error("Administrator session required");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "").trim();
  const verified = formData.get("verified") === "on";
  if (!companyId || !allowedStatuses.has(rawStatus)) throw new Error("Invalid car company decision");

  const status = rawStatus as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";
  await updateAdminCarCompany(principal.user.id, companyId, {status, verified});
  revalidatePath("/admin/cars");
  revalidatePath("/admin/cars/companies");
  revalidatePath(`/admin/cars/companies/${companyId}`);
}
