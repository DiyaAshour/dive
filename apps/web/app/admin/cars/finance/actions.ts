"use server";

import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {closeAdminCarFinanceMonth, markAdminCarSettlementPaid} from "@platform/server";
import {currentAdminPrincipal} from "@/lib/server-session";

export async function createCarSettlementAction(formData: FormData) {
  const principal = await currentAdminPrincipal();
  if (!principal) throw new Error("Administrator session required");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();
  const periodEnd = String(formData.get("periodEnd") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!companyId || !periodStart || !periodEnd) throw new Error("Company and settlement period are required");

  const params = new URLSearchParams({companyId, from: periodStart, to: periodEnd});
  try {
    const settlement = await closeAdminCarFinanceMonth(principal.user.id, {companyId, periodStart, periodEnd, notes});
    revalidatePath("/admin/cars/finance");
    params.set("closed", settlement.settlementNumber);
  } catch (error) {
    params.set("financeError", readableFinanceError(error));
  }
  redirect(`/admin/cars/finance?${params.toString()}`);
}

export async function markCarSettlementPaidAction(formData: FormData) {
  const principal = await currentAdminPrincipal();
  if (!principal) throw new Error("Administrator session required");

  const settlementId = String(formData.get("settlementId") ?? "").trim();
  const externalReference = String(formData.get("externalReference") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!settlementId) throw new Error("Settlement is required");

  const params = new URLSearchParams();
  try {
    const settlement = await markAdminCarSettlementPaid(principal.user.id, settlementId, externalReference, notes);
    revalidatePath("/admin/cars/finance");
    params.set("companyId", settlement.companyId);
    params.set("from", settlement.periodStart);
    params.set("to", settlement.periodEnd);
    params.set("paid", settlement.settlementNumber);
  } catch (error) {
    params.set("financeError", readableFinanceError(error));
  }
  redirect(`/admin/cars/finance?${params.toString()}`);
}

function readableFinanceError(error: unknown) {
  if (error instanceof Error && error.message) return error.message.slice(0, 500);
  return "The finance action could not be completed. Please review the period and try again.";
}
