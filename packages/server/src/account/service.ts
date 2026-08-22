import type { ChangePasswordRequest, LocalePreferenceRequest, UpdateAccountProfileRequest } from "@platform/contracts";
import { database } from "@platform/database";
import { ApplicationError } from "../errors";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, sessionTokenHash } from "../auth/session";

export type AccountSessionView = Readonly<{
  id: string;
  current: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}>;

export async function getAccountProfile(userId: string) {
  const user = await database().user.findUnique({
    where: {id: userId},
    select: {id: true, email: true, displayName: true, createdAt: true},
  });
  if (!user) throw new ApplicationError("ACCOUNT_NOT_FOUND", "Account not found", 404);
  return user;
}

export async function updateAccountProfile(userId: string, input: UpdateAccountProfileRequest) {
  return database().user.update({
    where: {id: userId},
    data: {displayName: input.displayName.trim()},
    select: {id: true, email: true, displayName: true, createdAt: true},
  });
}

export async function getAccountOverview(userId: string) {
  const now = new Date();
  const [totalTrips, upcomingTrips, activePriceWatches, unreadNotifications] = await Promise.all([
    database().booking.count({where: {userId}}),
    database().booking.count({
      where: {
        userId,
        status: {in: ["CONFIRMED", "MODIFIED"]},
        departure: {gte: now},
      },
    }),
    database().priceWatch.count({where: {ownerUserId: userId, active: true}}),
    database().userNotification.count({where: {userId, readAt: null}}),
  ]);
  return {totalTrips, upcomingTrips, activePriceWatches, unreadNotifications};
}

export async function listAccountSessions(userId: string, currentToken: string | null): Promise<AccountSessionView[]> {
  const now = new Date();
  await database().session.deleteMany({where: {userId, expiresAt: {lte: now}}});
  const currentHash = currentToken ? sessionTokenHash(currentToken) : null;
  const sessions = await database().session.findMany({
    where: {userId, expiresAt: {gt: now}},
    select: {id: true, tokenHash: true, createdAt: true, lastUsedAt: true, expiresAt: true},
    orderBy: {lastUsedAt: "desc"},
  });
  return sessions.map(({tokenHash, ...session}) => ({...session, current: currentHash === tokenHash}));
}

export async function revokeAccountSession(userId: string, sessionId: string, currentToken: string | null) {
  const currentHash = currentToken ? sessionTokenHash(currentToken) : null;
  const session = await database().session.findFirst({where: {id: sessionId, userId}, select: {id: true, tokenHash: true}});
  if (!session) throw new ApplicationError("SESSION_NOT_FOUND", "Session not found", 404);
  if (currentHash && session.tokenHash === currentHash) {
    throw new ApplicationError("CURRENT_SESSION", "Use Sign out to end the current session", 409);
  }
  await database().session.delete({where: {id: session.id}});
  return {revoked: true};
}

export async function revokeOtherAccountSessions(userId: string, currentToken: string | null) {
  if (!currentToken) throw new ApplicationError("SESSION_REQUIRED", "A current session is required", 401);
  const currentHash = sessionTokenHash(currentToken);
  const result = await database().session.deleteMany({where: {userId, tokenHash: {not: currentHash}}});
  return {revoked: result.count};
}

export async function changeAccountPassword(userId: string, input: ChangePasswordRequest) {
  const account = await database().user.findUnique({where: {id: userId}, include: {credential: true}});
  if (!account?.credential) throw new ApplicationError("PASSWORD_UNAVAILABLE", "Password authentication is not available for this account", 409);

  const currentMatches = await verifyPassword(input.currentPassword, account.credential.passwordHash);
  if (!currentMatches) throw new ApplicationError("INVALID_PASSWORD", "Current password is incorrect", 401);
  const samePassword = await verifyPassword(input.newPassword, account.credential.passwordHash);
  if (samePassword) throw new ApplicationError("PASSWORD_UNCHANGED", "Choose a new password", 400);

  const passwordHash = await hashPassword(input.newPassword);
  await database().$transaction([
    database().credential.update({where: {userId}, data: {passwordHash}}),
    database().session.deleteMany({where: {userId}}),
  ]);

  return createSession(userId);
}

export async function getTravelerLocale(userId: string): Promise<"en" | "ar" | null> {
  const preference = await database().travelerPreference.findUnique({where: {userId}, select: {locale: true}});
  if (!preference) return null;
  return preference.locale === "AR" ? "ar" : "en";
}

export async function setTravelerLocale(userId: string, input: LocalePreferenceRequest): Promise<{locale: "en" | "ar"}> {
  const storedLocale = input.locale === "ar" ? "AR" : "EN";
  await database().travelerPreference.upsert({
    where: {userId},
    create: {userId, locale: storedLocale},
    update: {locale: storedLocale},
  });
  return {locale: input.locale};
}
