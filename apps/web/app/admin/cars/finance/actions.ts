"use server";

import {revalidatePath} from "next/cache";
import {createAdminCarSettlement, markAdminCarSettlementPaid} from "@platform/server";
import {currentAdminPrincipal} from "@/lib/server-session";

export async function createCarSettlementAction(formData: FormData) {
  const principal = await currentAdminPrincipal();
  if (!principal) throw new Error("Administrator session required");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();
  const periodEnd = String(formData.get("periodEnd") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!companyId || !periodStart || !periodEnd) throw new Error("Company and settlement period are required");

  await createAdminCarSettlement(principal.user.id, {companyId, periodStart, periodEnd, notes});
  revalidatePath("/admin/cars/finance");
}

export async function markCarSettlementPaidAction(formData: FormData) {
  const principal = await currentAdminPrincipal();
  if (!principal) throw new Error("Administrator session required");

  const settlementId = String(formData.get("settlementId") ?? "").trim();
  const externalReference = String(formData.get("externalReference") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!settlementId) throw new Error("Settlement is required");

  await markAdminCarSettlementPaid(principal.user.id, settlementId, externalReference, notes);
  revalidatePath("/admin/cars/finance");
}
