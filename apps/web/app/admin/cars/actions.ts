"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateAdminCarCompany, updateAdminCarVehicle } from "@platform/server";
import { currentAdminPrincipal } from "@/lib/server-session";

const allowedStatuses = new Set(["DRAFT", "PENDING_REVIEW", "ACTIVE", "SUSPENDED"]);
const allowedVehicleStatuses = new Set(["ACTIVE", "INACTIVE", "MAINTENANCE"]);
const allowedTransmissions = new Set(["AUTOMATIC", "MANUAL"]);
const allowedFuels = new Set(["PETROL", "DIESEL", "HYBRID", "ELECTRIC"]);

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

export async function updateCompanyFleetVehicle(formData: FormData) {
  const principal = await currentAdminPrincipal();
  if (!principal) throw new Error("Administrator session required");

  const companyId = text(formData, "companyId");
  const vehicleId = text(formData, "vehicleId");
  const make = text(formData, "make");
  const model = text(formData, "model");
  const category = text(formData, "category");
  const year = integer(formData, "year");
  const seats = integer(formData, "seats");
  const bags = integer(formData, "bags");
  const doors = integer(formData, "doors");
  const dailyPrice = decimal(formData, "dailyPrice");
  const deposit = decimal(formData, "deposit");
  const transmission = text(formData, "transmission");
  const fuel = text(formData, "fuel");
  const status = text(formData, "status");
  const homeLocationId = text(formData, "homeLocationId") || null;

  if (!companyId || !vehicleId || !make || !model || !category) throw new Error("Missing required vehicle fields");
  if (!allowedVehicleStatuses.has(status)) throw new Error("Invalid vehicle status");
  if (!allowedTransmissions.has(transmission)) throw new Error("Invalid transmission");
  if (!allowedFuels.has(fuel)) throw new Error("Invalid fuel type");

  await updateAdminCarVehicle(principal.user.id, companyId, vehicleId, {
    make,
    model,
    category,
    year,
    seats,
    bags,
    doors,
    dailyPrice,
    deposit,
    transmission: transmission as "AUTOMATIC" | "MANUAL",
    fuel: fuel as "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC",
    status: status as "ACTIVE" | "INACTIVE" | "MAINTENANCE",
    homeLocationId,
    airConditioning: checked(formData, "airConditioning"),
    freeCancellation: checked(formData, "freeCancellation"),
    unlimitedMileage: checked(formData, "unlimitedMileage"),
    airportPickup: checked(formData, "airportPickup"),
  });

  revalidatePath("/admin/cars");
  revalidatePath("/admin/cars/companies");
  revalidatePath(`/admin/cars/companies/${companyId}`);
  revalidatePath(`/admin/cars/companies/${companyId}/fleet/${vehicleId}`);
  revalidatePath("/cars");
  revalidatePath(`/cars/${vehicleId}`);
  redirect(`/admin/cars/companies/${companyId}/fleet/${vehicleId}?saved=1`);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function integer(formData: FormData, key: string) {
  const value = Number(text(formData, key));
  if (!Number.isInteger(value)) throw new Error(`Invalid ${key}`);
  return value;
}

function decimal(formData: FormData, key: string) {
  const value = Number(text(formData, key));
  if (!Number.isFinite(value)) throw new Error(`Invalid ${key}`);
  return value;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}
