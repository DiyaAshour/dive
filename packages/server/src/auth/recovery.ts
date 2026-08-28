import { createHash, randomBytes } from "node:crypto";
import { database } from "@platform/database";
import { ApplicationError, badRequest } from "../errors";
import { hashPassword } from "./password";
import { passwordResetEmail, securityAlertEmail, verificationEmail } from "../communications/templates";
import { queueEmail } from "../communications/email";

const RESET_TTL_MS = 30 * 60_000;
const VERIFY_TTL_MS = 24 * 60 * 60_000;

export async function requestPasswordReset(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const user = await database().user.findUnique({where: {email}, select: {id: true, email: true, displayName: true}});
  if (!user) return {accepted: true};

  await database().authActionToken.deleteMany({where: {userId: user.id, purpose: "PASSWORD_RESET", consumedAt: null}});
  const rawToken = randomBytes(32).toString("base64url");
  const token = await database().authActionToken.create({data: {
    userId: user.id,
    email: user.email,
    purpose: "PASSWORD_RESET",
    tokenHash: tokenHash(rawToken),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  }});
  const resetUrl = `${siteOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const content = passwordResetEmail({displayName: user.displayName, resetUrl});
  await queueEmail({
    kind: "PASSWORD_RESET",
    toEmail: user.email,
    toName: user.displayName,
    subject: content.subject,
    htmlBody: content.html,
    textBody: content.text,
    dedupeKey: `PASSWORD_RESET:${token.id}`,
    userId: user.id,
  });
  return {accepted: true};
}

export async function resetPasswordWithToken(rawToken: string, newPassword: string) {
  const hash = tokenHash(rawToken.trim());
  const token = await database().authActionToken.findUnique({where: {tokenHash: hash}});
  if (!token || token.purpose !== "PASSWORD_RESET" || token.consumedAt || token.expiresAt.getTime() <= Date.now()) {
    throw new ApplicationError("PASSWORD_RESET_TOKEN_INVALID", "Password reset link is invalid or expired", 400);
  }
  const user = await database().user.findUnique({where: {id: token.userId}, select: {id: true, email: true, displayName: true, credential: {select: {userId: true}}}});
  if (!user) throw new ApplicationError("PASSWORD_RESET_TOKEN_INVALID", "Password reset link is invalid or expired", 400);
  const passwordHash = await hashPassword(newPassword);
  await database().$transaction(async (tx) => {
    const claimed = await tx.authActionToken.updateMany({where: {id: token.id, consumedAt: null, expiresAt: {gt: new Date()}}, data: {consumedAt: new Date()}});
    if (claimed.count !== 1) throw new ApplicationError("PASSWORD_RESET_TOKEN_INVALID", "Password reset link is invalid or expired", 400);
    await tx.credential.upsert({where: {userId: user.id}, create: {userId: user.id, passwordHash}, update: {passwordHash}});
    await tx.session.deleteMany({where: {userId: user.id}});
    await tx.authActionToken.deleteMany({where: {userId: user.id, purpose: "PASSWORD_RESET", consumedAt: null}});
  }, {isolationLevel: "Serializable"});

  const content = securityAlertEmail({displayName: user.displayName});
  await queueEmail({
    kind: "SECURITY_ALERT",
    toEmail: user.email,
    toName: user.displayName,
    subject: content.subject,
    htmlBody: content.html,
    textBody: content.text,
    dedupeKey: `SECURITY_ALERT:PASSWORD_RESET:${token.id}`,
    userId: user.id,
  });
  return {reset: true};
}

export async function requestEmailVerification(userId: string) {
  const user = await database().user.findUnique({where: {id: userId}, select: {id: true, email: true, displayName: true}});
  if (!user) throw new ApplicationError("ACCOUNT_NOT_FOUND", "Account not found", 404);
  const state = await database().emailVerificationState.findUnique({where: {userId}});
  if (state?.verifiedAt && normalizeEmail(state.email) === normalizeEmail(user.email)) return {verified: true};

  await database().authActionToken.deleteMany({where: {userId, purpose: "EMAIL_VERIFICATION", consumedAt: null}});
  const rawToken = randomBytes(32).toString("base64url");
  const token = await database().authActionToken.create({data: {
    userId,
    email: user.email,
    purpose: "EMAIL_VERIFICATION",
    tokenHash: tokenHash(rawToken),
    expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
  }});
  const verifyUrl = `${siteOrigin()}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const content = verificationEmail({displayName: user.displayName, verifyUrl});
  await queueEmail({
    kind: "EMAIL_VERIFICATION",
    toEmail: user.email,
    toName: user.displayName,
    subject: content.subject,
    htmlBody: content.html,
    textBody: content.text,
    dedupeKey: `EMAIL_VERIFICATION:${token.id}`,
    userId,
  });
  return {verified: false, sent: true};
}

export async function verifyEmailAddress(rawToken: string) {
  const token = await database().authActionToken.findUnique({where: {tokenHash: tokenHash(rawToken.trim())}});
  if (!token || token.purpose !== "EMAIL_VERIFICATION" || token.consumedAt || token.expiresAt.getTime() <= Date.now()) {
    throw new ApplicationError("EMAIL_VERIFICATION_TOKEN_INVALID", "Verification link is invalid or expired", 400);
  }
  const user = await database().user.findUnique({where: {id: token.userId}, select: {id: true, email: true}});
  if (!user || normalizeEmail(user.email) !== normalizeEmail(token.email)) {
    throw new ApplicationError("EMAIL_VERIFICATION_EMAIL_CHANGED", "The account email changed before verification completed", 409);
  }
  const now = new Date();
  await database().$transaction(async (tx) => {
    const claimed = await tx.authActionToken.updateMany({where: {id: token.id, consumedAt: null, expiresAt: {gt: now}}, data: {consumedAt: now}});
    if (claimed.count !== 1) badRequest("EMAIL_VERIFICATION_TOKEN_INVALID", "Verification link is invalid or expired");
    await tx.emailVerificationState.upsert({where: {userId: user.id}, create: {userId: user.id, email: user.email, verifiedAt: now}, update: {email: user.email, verifiedAt: now}});
    await tx.authActionToken.deleteMany({where: {userId: user.id, purpose: "EMAIL_VERIFICATION", consumedAt: null}});
  }, {isolationLevel: "Serializable"});
  return {verified: true};
}

export async function getEmailVerificationStatus(userId: string) {
  const [user, state] = await Promise.all([
    database().user.findUnique({where: {id: userId}, select: {email: true}}),
    database().emailVerificationState.findUnique({where: {userId}}),
  ]);
  if (!user) throw new ApplicationError("ACCOUNT_NOT_FOUND", "Account not found", 404);
  const verified = Boolean(state?.verifiedAt && normalizeEmail(state.email) === normalizeEmail(user.email));
  return {email: user.email, verified, verifiedAt: verified ? state?.verifiedAt ?? null : null};
}

function tokenHash(token: string): string {return createHash("sha256").update(token).digest("hex");}
function normalizeEmail(email: string): string {return email.trim().toLowerCase();}
function siteOrigin(): string {return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");}
