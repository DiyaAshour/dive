import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({path: new URL("../../../.env", import.meta.url)});

const adminEmail = "phase18-admin@handmekey.invalid";
const adminPassword = "Phase18-Admin-Pass!";
const userEmail = "phase18-user@handmekey.invalid";
const userPassword = "Phase18-User-Pass!";

const [{database}, server] = await Promise.all([
  import("@platform/database"),
  import("../src/index"),
]);

try {
  await database().user.deleteMany({where: {email: {in: [adminEmail, userEmail]}}});

  const registeredAdmin = await server.registerUser({email: adminEmail, password: adminPassword, displayName: "Phase 18 Admin"});
  assert.equal(registeredAdmin.user.platformRole, "GUEST");
  assert.ok(await server.getSessionUser(registeredAdmin.session.token));

  const bootstrapped = await server.bootstrapFirstPlatformAdmin(adminEmail);
  assert.equal(bootstrapped.alreadyAdmin, false);
  assert.equal(await server.getSessionUser(registeredAdmin.session.token), null, "bootstrap must revoke existing standard sessions");

  const login = await server.loginPlatformAdmin({email: adminEmail, password: adminPassword}, {userAgent: "phase18-smoke", ipAddress: "127.0.0.1"});
  assert.equal(login.session.scope, "ADMIN");
  assert.ok(login.session.expiresAt.getTime() <= Date.now() + 8 * 3_600_000 + 5_000);
  assert.equal(await server.getSessionUser(login.session.token), null, "an admin token must not authenticate as a standard session");
  const principal = await server.getAdminSessionPrincipal(login.session.token);
  assert.equal(principal?.user.email, adminEmail);
  assert.equal(principal?.session.userAgent, "phase18-smoke");

  await server.registerUser({email: userEmail, password: userPassword, displayName: "Phase 18 User"});
  await assert.rejects(
    () => server.loginPlatformAdmin({email: userEmail, password: userPassword}),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "INVALID_ADMIN_CREDENTIALS",
  );
  await assert.rejects(
    () => server.bootstrapFirstPlatformAdmin(userEmail),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "ADMIN_ALREADY_BOOTSTRAPPED",
  );

  const demoHotel = await database().hotel.findFirst({where: {slug: {startsWith: "demo-"}}, select: {id: true}});
  assert.ok(demoHotel, "demo hotel required for authorization smoke test");
  await assert.rejects(
    () => server.requireHotelPermission(bootstrapped.userId, demoHotel.id, "hotel:view"),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "FORBIDDEN",
    "platform role alone must not bypass hotel membership permissions",
  );

  const platformHotels = await server.listPlatformHotels(bootstrapped.userId);
  assert.ok(platformHotels.length >= 20);
  const bootstrapAudit = await database().auditLog.findFirst({where: {action: "PLATFORM_ADMIN_BOOTSTRAPPED", entityId: bootstrapped.userId}});
  assert.ok(bootstrapAudit, "bootstrap must create an audit event");

  await server.revokeSession(login.session.token);
  assert.equal(await server.getAdminSessionPrincipal(login.session.token), null);
  console.log("[admin-smoke] bootstrap, scope isolation, authorization and audit checks passed");
} finally {
  await database().$disconnect();
}
