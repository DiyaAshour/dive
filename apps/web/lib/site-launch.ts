import {database} from "@platform/database";

export type SiteLaunchConfig = {
  enabled: boolean;
  launchAt: string | null;
  title: string;
  message: string;
};

export const DEFAULT_SITE_LAUNCH_CONFIG: SiteLaunchConfig = {
  enabled: false,
  launchAt: null,
  title: "HandMeKey is almost ready",
  message: "We are preparing the final details before launch. Come back when the countdown reaches zero.",
};

const SETTINGS_FILTER = {
  action: "SITE_LAUNCH_UPDATED",
  entityType: "PLATFORM_SETTINGS",
  entityId: "SITE_LAUNCH",
} as const;

export async function getSiteLaunchConfig(): Promise<SiteLaunchConfig> {
  const latest = await database().auditLog.findFirst({
    where: SETTINGS_FILTER,
    orderBy: {createdAt: "desc"},
    select: {after: true},
  });
  return parseSiteLaunchConfig(latest?.after);
}

export async function updateSiteLaunchConfig(actorUserId: string, input: SiteLaunchConfig): Promise<SiteLaunchConfig> {
  const before = await getSiteLaunchConfig();
  const next: SiteLaunchConfig = {
    enabled: input.enabled,
    launchAt: input.launchAt,
    title: cleanText(input.title, 100) || DEFAULT_SITE_LAUNCH_CONFIG.title,
    message: cleanText(input.message, 320) || DEFAULT_SITE_LAUNCH_CONFIG.message,
  };

  await database().auditLog.create({
    data: {
      actorUserId,
      action: SETTINGS_FILTER.action,
      entityType: SETTINGS_FILTER.entityType,
      entityId: SETTINGS_FILTER.entityId,
      before: {...before},
      after: {...next},
    },
  });
  return next;
}

function parseSiteLaunchConfig(value: unknown): SiteLaunchConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {...DEFAULT_SITE_LAUNCH_CONFIG};
  const raw = value as Record<string, unknown>;
  const launchAt = typeof raw.launchAt === "string" && !Number.isNaN(Date.parse(raw.launchAt)) ? raw.launchAt : null;
  return {
    enabled: raw.enabled === true,
    launchAt,
    title: typeof raw.title === "string" && raw.title.trim() ? cleanText(raw.title, 100) : DEFAULT_SITE_LAUNCH_CONFIG.title,
    message: typeof raw.message === "string" && raw.message.trim() ? cleanText(raw.message, 320) : DEFAULT_SITE_LAUNCH_CONFIG.message,
  };
}

function cleanText(value: string, max: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}
