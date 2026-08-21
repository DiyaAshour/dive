import { ApplicationError } from "../errors";
import type { PaymentProvider } from "./provider";

const providers = new Map<string, PaymentProvider>();

export function registerPaymentProvider(provider: PaymentProvider): void {
  const key = provider.key.trim().toLowerCase();
  if (!key) throw new Error("Payment provider key is required");
  if (providers.has(key)) throw new Error(`Payment provider '${key}' is already registered`);
  providers.set(key, provider);
}

export function paymentCapabilities() {
  const configured = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
  const provider = configured && configured !== "none" ? providers.get(configured) : null;
  return {onlinePaymentAvailable: Boolean(provider), provider: provider?.key ?? null};
}

export function resolveConfiguredPaymentProvider(): PaymentProvider {
  const configured = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
  if (!configured || configured === "none") {
    throw new ApplicationError("PAYMENT_PROVIDER_NOT_CONFIGURED", "Online payment is not configured for this deployment", 503);
  }
  return resolvePaymentProvider(configured);
}

export function resolvePaymentProvider(key: string): PaymentProvider {
  const normalized = key.trim().toLowerCase();
  const provider = providers.get(normalized);
  if (!provider) throw new ApplicationError("PAYMENT_PROVIDER_UNAVAILABLE", `Payment provider '${normalized}' is not registered`, 503);
  return provider;
}

export function registeredPaymentProviderKeys(): readonly string[] {
  return [...providers.keys()].sort();
}
