import { database } from "@platform/database";
import { ApplicationError } from "../errors";
import { requirePlatformOwner } from "./access";

export type SiteIdentityConfig = Readonly<{
  brandName: string;
  siteTitle: string;
  description: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  supportEmail: string;
  footerText: string;
  indexable: boolean;
  socialLinks: Readonly<{
    instagram: string | null;
    facebook: string | null;
    x: string | null;
    linkedin: string | null;
  }>;
}>;

export type SiteIdentityInput = SiteIdentityConfig;

const DEFAULT_SITE_IDENTITY: SiteIdentityConfig = {
  brandName: "HandMeKey",
  siteTitle: "HandMeKey — Hotels, clearly priced",
  description: "Search verified hotels, compare live rates and book with the final stay price visible before checkout.",
  logoUrl: null,
  faviconUrl: null,
  ogImageUrl: null,
  supportEmail: "",
  footerText: "",
  indexable: true,
  socialLinks: {instagram: null, facebook: null, x: null, linkedin: null},
};

const SITE_IDENTITY_ACTION = "SITE_IDENTITY_UPDATED";
const SITE_ENTITY_TYPE = "PlatformSite";
const SITE_ENTITY_ID = "IDENTITY";

export function defaultSiteIdentityConfig(): SiteIdentityConfig {
  return DEFAULT_SITE_IDENTITY;
}

export async function getSiteIdentityConfig(): Promise<SiteIdentityConfig> {
  try {
    const row = await database().auditLog.findFirst({
      where: {action: SITE_IDENTITY_ACTION, entityType: SITE_ENTITY_TYPE, entityId: SITE_ENTITY_ID},
      orderBy: {createdAt: "desc"},
      select: {after: true},
    });
    return row?.after ? normalizeStoredConfig(row.after) : DEFAULT_SITE_IDENTITY;
  } catch {
    // Public pages must keep rendering if the database is briefly unavailable.
    return DEFAULT_SITE_IDENTITY;
  }
}

export async function updateSiteIdentityConfig(actorUserId: string, input: SiteIdentityInput): Promise<SiteIdentityConfig> {
  await requirePlatformOwner(actorUserId);
  const next = validateConfig(input);
  const before = await getSiteIdentityConfig();
  await database().auditLog.create({data: {
    actorUserId,
    action: SITE_IDENTITY_ACTION,
    entityType: SITE_ENTITY_TYPE,
    entityId: SITE_ENTITY_ID,
    before,
    after: next,
  }});
  return next;
}

function validateConfig(input: SiteIdentityInput): SiteIdentityConfig {
  const brandName = cleanRequired(input.brandName, "Brand name", 2, 60);
  const siteTitle = cleanRequired(input.siteTitle, "Site title", 4, 120);
  const description = cleanRequired(input.description, "Site description", 20, 320);
  const supportEmail = input.supportEmail.trim().toLowerCase();
  if (supportEmail && (!supportEmail.includes("@") || supportEmail.length > 254)) {
    throw new ApplicationError("INVALID_SITE_SUPPORT_EMAIL", "Enter a valid support email address", 400);
  }
  const footerText = input.footerText.trim();
  if (footerText.length > 240) throw new ApplicationError("INVALID_SITE_FOOTER", "Footer text must be 240 characters or fewer", 400);
  return {
    brandName,
    siteTitle,
    description,
    logoUrl: cleanHttpUrl(input.logoUrl, "logo"),
    faviconUrl: cleanHttpUrl(input.faviconUrl, "favicon"),
    ogImageUrl: cleanHttpUrl(input.ogImageUrl, "social image"),
    supportEmail,
    footerText,
    indexable: Boolean(input.indexable),
    socialLinks: {
      instagram: cleanHttpUrl(input.socialLinks.instagram, "Instagram URL"),
      facebook: cleanHttpUrl(input.socialLinks.facebook, "Facebook URL"),
      x: cleanHttpUrl(input.socialLinks.x, "X URL"),
      linkedin: cleanHttpUrl(input.socialLinks.linkedin, "LinkedIn URL"),
    },
  };
}

function cleanRequired(value: string, label: string, min: number, max: number): string {
  const cleaned = value.trim();
  if (cleaned.length < min || cleaned.length > max) {
    throw new ApplicationError("INVALID_SITE_IDENTITY", `${label} must be between ${min} and ${max} characters`, 400);
  }
  return cleaned;
}

function cleanHttpUrl(value: string | null | undefined, label: string): string | null {
  const cleaned = value?.trim() ?? "";
  if (!cleaned) return null;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("unsupported protocol");
    return parsed.toString();
  } catch {
    throw new ApplicationError("INVALID_SITE_URL", `Enter a valid http(s) ${label}`, 400);
  }
}

function normalizeStoredConfig(value: unknown): SiteIdentityConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_SITE_IDENTITY;
  const record = value as Record<string, unknown>;
  const socials = record.socialLinks && typeof record.socialLinks === "object" && !Array.isArray(record.socialLinks)
    ? record.socialLinks as Record<string, unknown>
    : {};
  return {
    brandName: stringOr(record.brandName, DEFAULT_SITE_IDENTITY.brandName),
    siteTitle: stringOr(record.siteTitle, DEFAULT_SITE_IDENTITY.siteTitle),
    description: stringOr(record.description, DEFAULT_SITE_IDENTITY.description),
    logoUrl: nullableString(record.logoUrl),
    faviconUrl: nullableString(record.faviconUrl),
    ogImageUrl: nullableString(record.ogImageUrl),
    supportEmail: stringOr(record.supportEmail, ""),
    footerText: stringOr(record.footerText, ""),
    indexable: typeof record.indexable === "boolean" ? record.indexable : true,
    socialLinks: {
      instagram: nullableString(socials.instagram),
      facebook: nullableString(socials.facebook),
      x: nullableString(socials.x),
      linkedin: nullableString(socials.linkedin),
    },
  };
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
