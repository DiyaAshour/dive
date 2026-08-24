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

let smokeBookingId: string | null = null;

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

  const registeredUser = await server.registerUser({email: userEmail, password: userPassword, displayName: "Phase 20 User"});
  await assert.rejects(
    () => server.loginPlatformAdmin({email: userEmail, password: userPassword}),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "INVALID_ADMIN_CREDENTIALS",
  );
  await assert.rejects(
    () => server.bootstrapFirstPlatformAdmin(userEmail),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "ADMIN_ALREADY_BOOTSTRAPPED",
  );

  const demoHotel = await database().hotel.findFirst({where: {slug: {startsWith: "demo-"}}, select: {id: true, roomTypes: {take: 1, select: {id: true, ratePlans: {take: 1, select: {id: true}}}}}});
  assert.ok(demoHotel, "demo hotel required for authorization smoke test");
  await assert.rejects(
    () => server.requireHotelPermission(bootstrapped.userId, demoHotel.id, "hotel:view"),
    (error: unknown) => error instanceof server.ApplicationError && error.code === "FORBIDDEN",
    "platform role alone must not bypass hotel membership permissions",
  );

  const platformHotels = await server.listPlatformHotels(bootstrapped.userId);
  assert.ok(platformHotels.length >= 20);
  const managedHotel = await server.getPlatformHotel(bootstrapped.userId, demoHotel.id);
  const originalArea = managedHotel.area;
  const adminInput = {
    name: managedHotel.name,
    city: managedHotel.city,
    countryCode: managedHotel.countryCode,
    address: managedHotel.address,
    area: "Phase 20 audited edit",
    description: managedHotel.description,
    starRating: managedHotel.starRating,
    latitude: managedHotel.latitude,
    longitude: managedHotel.longitude,
    checkInTime: managedHotel.checkInTime,
    checkOutTime: managedHotel.checkOutTime,
    timezone: managedHotel.timezone,
    currency: managedHotel.currency,
    commissionRate: managedHotel.commissionRate,
    serviceRate: managedHotel.serviceRate,
    taxRate: managedHotel.taxRate,
    overbookingEnabled: managedHotel.overbookingEnabled,
    amenities: managedHotel.amenities,
  };
  const editedHotel = await server.updatePlatformHotel(bootstrapped.userId, demoHotel.id, adminInput);
  assert.equal(editedHotel.area, "Phase 20 audited edit");
  assert.ok(editedHotel.publishRevision > managedHotel.publishRevision);
  assert.ok(await database().auditLog.findFirst({where: {hotelId: demoHotel.id, actorUserId: bootstrapped.userId, action: "ADMIN_HOTEL_UPDATED"}}));

  const roomType = demoHotel.roomTypes[0];
  const ratePlan = roomType?.ratePlans[0];
  assert.ok(roomType && ratePlan, "demo room and rate plan required for moderation smoke test");
  const suffix = Date.now().toString(36);
  const booking = await database().booking.create({data: {
    reference: `P20-${suffix}`,
    userId: registeredUser.user.id,
    hotelId: demoHotel.id,
    roomTypeId: roomType.id,
    ratePlanId: ratePlan.id,
    guestName: "Phase 20 Guest",
    guestEmail: userEmail,
    arrival: new Date("2026-01-01T00:00:00.000Z"),
    departure: new Date("2026-01-02T00:00:00.000Z"),
    status: "CONFIRMED",
    paymentMode: "PAY_AT_HOTEL",
    paymentState: "NOT_REQUIRED",
    currency: managedHotel.currency,
    baseAmount: 100,
    serviceAmount: 7,
    taxAmount: 8.6,
    totalAmount: 115.6,
    commissionRateSnapshot: managedHotel.commissionRate,
    commissionAmount: 10,
    cancellationPolicySnapshot: {name: "Smoke policy", rules: []},
    idempotencyKey: `phase20-${suffix}`,
    requestFingerprint: `phase20-${suffix}`,
    accessTokenHash: `phase20-${suffix}`,
    confirmedAt: new Date(),
  }});
  smokeBookingId = booking.id;
  const guestReview = await database().guestReview.create({data: {bookingId: booking.id, hotelId: demoHotel.id, authorUserId: registeredUser.user.id, overall: 8, cleanliness: 8, staff: 9, location: 8, facilities: 7, comfort: 8, value: 8, title: "Verified smoke stay", comment: "A verified review used to test audited moderation behavior."}});
  const hidden = await server.moderatePlatformGuestReview(bootstrapped.userId, guestReview.id, {status: "HIDDEN", reason: "Automated moderation smoke verification"});
  assert.equal(hidden.status, "HIDDEN");
  const publicWhileHidden = await server.getPublicHotelReviews(demoHotel.id);
  assert.equal(publicWhileHidden.reviews.some((review: {id: string}) => review.id === guestReview.id), false);
  const restored = await server.moderatePlatformGuestReview(bootstrapped.userId, guestReview.id, {status: "PUBLISHED", reason: "Automated restore smoke verification"});
  assert.equal(restored.status, "PUBLISHED");
  assert.ok(await database().auditLog.findFirst({where: {entityId: guestReview.id, action: "GUEST_REVIEW_RESTORED"}}));

  await server.updatePlatformHotel(bootstrapped.userId, demoHotel.id, {...adminInput, area: originalArea});
  const bootstrapAudit = await database().auditLog.findFirst({where: {action: "PLATFORM_ADMIN_BOOTSTRAPPED", entityId: bootstrapped.userId}});
  assert.ok(bootstrapAudit, "bootstrap must create an audit event");

  await server.revokeSession(login.session.token);
  assert.equal(await server.getAdminSessionPrincipal(login.session.token), null);
  console.log("[admin-smoke] bootstrap, scope isolation, authorization and audit checks passed");
} finally {
  if (smokeBookingId) await database().booking.deleteMany({where: {id: smokeBookingId}});
  await database().$disconnect();
}
