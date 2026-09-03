import { database } from "@platform/database";
import { badRequest, forbidden, notFound } from "../errors";
import { requirePlatformAdmin } from "../admin/authorization";

type CarCompanyRole = "OWNER" | "MANAGER" | "FLEET" | "RESERVATIONS" | "FINANCE" | "VIEWER";
type ReviewDecisionInput = Readonly<{decision: "APPROVE" | "REJECT"; reason?: string}>;
type ReadinessCheck = Readonly<{code: string; label: string; passed: boolean; detail: string}>;

const SUBMIT_ROLES = new Set<CarCompanyRole>(["OWNER", "MANAGER"]);

async function requireCompanyMembership(userId: string, allowedRoles?: ReadonlySet<CarCompanyRole>) {
  const membership = await database().carCompanyMembership.findFirst({
    where: {userId, status: "ACTIVE"},
    include: {company: true},
    orderBy: {createdAt: "asc"},
  });
  if (!membership) forbidden("Car rental company access required");
  if (allowedRoles && !allowedRoles.has(membership.role as CarCompanyRole)) forbidden("You do not have permission to manage company publishing");
  return membership;
}

export async function getCarCompanyPublishingReadiness(actorUserId: string) {
  const membership = await requireCompanyMembership(actorUserId);
  return buildCarCompanyPublishingReadiness(membership.companyId);
}

export async function submitCarCompanyForReview(actorUserId: string) {
  const membership = await requireCompanyMembership(actorUserId, SUBMIT_ROLES);
  const readiness = await buildCarCompanyPublishingReadiness(membership.companyId);
  if (readiness.status === "ACTIVE") badRequest("CAR_COMPANY_ALREADY_ACTIVE", "This car rental company is already active");
  if (readiness.status === "SUSPENDED") badRequest("CAR_COMPANY_SUSPENDED", "A suspended car rental company cannot be submitted for review");
  if (!readiness.ready) {
    const failed = readiness.checks.filter((check) => !check.passed).map((check) => check.label).join(", ");
    badRequest("CAR_COMPANY_NOT_READY", `Complete the company requirements before submission: ${failed}`);
  }

  const db = database();
  const existing = await db.carCompanyReview.findFirst({
    where: {companyId: membership.companyId, status: "PENDING", submittedRevision: readiness.publishRevision},
    orderBy: {submittedAt: "desc"},
  });
  if (existing) return {review: serializeReview(existing), readiness, reused: true};

  const snapshot = readinessSnapshot(readiness);
  const review = await db.$transaction(async (tx) => {
    const current = await tx.carRentalCompany.findUnique({
      where: {id: membership.companyId},
      select: {publishRevision: true, status: true},
    });
    if (!current) notFound("Car rental company");
    if (current.publishRevision !== readiness.publishRevision) badRequest("CAR_COMPANY_CHANGED_DURING_SUBMISSION", "The company changed while it was being submitted; review readiness and submit again");
    if (current.status === "ACTIVE") badRequest("CAR_COMPANY_ALREADY_ACTIVE", "This car rental company is already active");
    if (current.status === "SUSPENDED") badRequest("CAR_COMPANY_SUSPENDED", "A suspended car rental company cannot be submitted for review");

    const raced = await tx.carCompanyReview.findFirst({
      where: {companyId: membership.companyId, status: "PENDING", submittedRevision: readiness.publishRevision},
      orderBy: {submittedAt: "desc"},
    });
    if (raced) return raced;

    await tx.carCompanyReview.updateMany({
      where: {companyId: membership.companyId, status: "PENDING"},
      data: {status: "STALE", reviewedAt: new Date(), decisionReason: "Superseded by a newer submission"},
    });
    const created = await tx.carCompanyReview.create({
      data: {
        companyId: membership.companyId,
        submittedByUserId: actorUserId,
        submittedRevision: readiness.publishRevision,
        readinessSnapshot: snapshot,
      },
    });
    await tx.carRentalCompany.update({
      where: {id: membership.companyId},
      data: {status: "PENDING_REVIEW", verified: false},
    });
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: "CAR_COMPANY_SUBMITTED_FOR_REVIEW",
        entityType: "CarCompanyReview",
        entityId: created.id,
        after: {companyId: membership.companyId, submittedRevision: readiness.publishRevision, readiness: snapshot},
      },
    });
    return created;
  });

  return {review: serializeReview(review), readiness: {...readiness, status: "PENDING_REVIEW" as const}, reused: false};
}

export async function listCarCompanyReviewQueue(actorUserId: string) {
  await requirePlatformAdmin(actorUserId);
  const db = database();
  const reviews = await db.carCompanyReview.findMany({
    where: {status: "PENDING"},
    orderBy: {submittedAt: "asc"},
    take: 200,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          city: true,
          countryCode: true,
          address: true,
          status: true,
          verified: true,
          publishRevision: true,
          supportEmail: true,
          supportPhone: true,
          _count: {select: {vehicles: true, locations: true}},
        },
      },
    },
  });
  const submitterIds = [...new Set(reviews.map((review) => review.submittedByUserId))];
  const submitters = submitterIds.length
    ? await db.user.findMany({where: {id: {in: submitterIds}}, select: {id: true, displayName: true, email: true}})
    : [];
  const submitterById = new Map(submitters.map((user) => [user.id, user]));

  return reviews.map((review) => ({
    id: review.id,
    submittedRevision: review.submittedRevision,
    status: review.status,
    readinessSnapshot: review.readinessSnapshot,
    submittedAt: review.submittedAt.toISOString(),
    stale: review.company.publishRevision !== review.submittedRevision,
    submittedBy: submitterById.get(review.submittedByUserId) ?? {id: review.submittedByUserId, displayName: "Unknown user", email: ""},
    company: {
      ...review.company,
      counts: review.company._count,
      _count: undefined,
    },
  }));
}

export async function reviewCarCompanySubmission(actorUserId: string, reviewId: string, input: ReviewDecisionInput) {
  await requirePlatformAdmin(actorUserId);
  const db = database();
  const review = await db.carCompanyReview.findUnique({
    where: {id: reviewId},
    include: {company: {select: {id: true, status: true, publishRevision: true}}},
  });
  if (!review) notFound("Car company review");
  if (review.status !== "PENDING") badRequest("CAR_COMPANY_REVIEW_ALREADY_RESOLVED", "This car company review has already been resolved");

  if (review.company.publishRevision !== review.submittedRevision) {
    await invalidateCarCompanyReview(review.id, review.company.id, "Company changed after this review was submitted");
    badRequest("CAR_COMPANY_REVIEW_STALE", "The company changed after submission and must be submitted again");
  }

  if (input.decision === "REJECT") {
    const reason = input.reason?.trim();
    if (!reason) badRequest("CAR_COMPANY_REJECTION_REASON_REQUIRED", "A review note is required when rejecting a company");
    return db.$transaction(async (tx) => {
      const resolved = await tx.carCompanyReview.updateMany({
        where: {id: review.id, status: "PENDING"},
        data: {status: "REJECTED", reviewedByUserId: actorUserId, reviewedAt: new Date(), decisionReason: reason},
      });
      if (resolved.count !== 1) badRequest("CAR_COMPANY_REVIEW_ALREADY_RESOLVED", "This car company review has already been resolved");
      await tx.carRentalCompany.update({where: {id: review.company.id}, data: {status: "DRAFT", verified: false}});
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "CAR_COMPANY_REVIEW_REJECTED",
          entityType: "CarCompanyReview",
          entityId: review.id,
          after: {companyId: review.company.id, submittedRevision: review.submittedRevision, reason},
        },
      });
      return {reviewId: review.id, companyId: review.company.id, status: "REJECTED" as const};
    });
  }

  const readiness = await buildCarCompanyPublishingReadiness(review.company.id);
  if (!readiness.ready) {
    await invalidateCarCompanyReview(review.id, review.company.id, "Company no longer meets publishing readiness requirements");
    badRequest("CAR_COMPANY_NO_LONGER_READY", "The company no longer satisfies publishing requirements and must be submitted again");
  }

  return db.$transaction(async (tx) => {
    const companyUpdated = await tx.carRentalCompany.updateMany({
      where: {id: review.company.id, status: "PENDING_REVIEW", publishRevision: review.submittedRevision},
      data: {status: "ACTIVE", verified: true, publishedRevision: review.submittedRevision, lastPublishedAt: new Date()},
    });
    if (companyUpdated.count !== 1) badRequest("CAR_COMPANY_REVIEW_STALE", "The company changed or is no longer pending review");
    const resolved = await tx.carCompanyReview.updateMany({
      where: {id: review.id, status: "PENDING"},
      data: {status: "APPROVED", reviewedByUserId: actorUserId, reviewedAt: new Date(), decisionReason: input.reason?.trim() || null},
    });
    if (resolved.count !== 1) badRequest("CAR_COMPANY_REVIEW_ALREADY_RESOLVED", "This car company review has already been resolved");
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: "CAR_COMPANY_REVIEW_APPROVED",
        entityType: "CarCompanyReview",
        entityId: review.id,
        after: {companyId: review.company.id, publishedRevision: review.submittedRevision},
      },
    });
    return {reviewId: review.id, companyId: review.company.id, status: "APPROVED" as const, publishedRevision: review.submittedRevision};
  });
}

export async function touchCarCompanyPublishingRevision(companyId: string) {
  return database().carRentalCompany.update({
    where: {id: companyId},
    data: {publishRevision: {increment: 1}},
    select: {publishRevision: true},
  });
}

async function buildCarCompanyPublishingReadiness(companyId: string) {
  const company = await database().carRentalCompany.findUnique({
    where: {id: companyId},
    select: {
      id: true,
      name: true,
      city: true,
      countryCode: true,
      address: true,
      status: true,
      verified: true,
      publishRevision: true,
      publishedRevision: true,
      lastPublishedAt: true,
      supportEmail: true,
      supportPhone: true,
      locations: {
        where: {active: true},
        select: {id: true, pickupEnabled: true, returnEnabled: true},
      },
      vehicles: {
        where: {status: "ACTIVE"},
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          category: true,
          seats: true,
          doors: true,
          dailyPrice: true,
          imageUrl: true,
        },
      },
      reviews: {
        orderBy: {submittedAt: "desc"},
        take: 1,
        select: {id: true, status: true, submittedRevision: true, decisionReason: true, submittedAt: true, reviewedAt: true},
      },
    },
  });
  if (!company) notFound("Car rental company");

  const profileComplete = Boolean(company.name.trim() && company.city.trim() && company.address.trim() && company.countryCode.trim().length === 2);
  const pickupReady = company.locations.some((location) => location.pickupEnabled);
  const returnReady = company.locations.some((location) => location.returnEnabled);
  const publishableVehicles = company.vehicles.filter((vehicle) =>
    Boolean(
      vehicle.make.trim()
      && vehicle.model.trim()
      && vehicle.category.trim()
      && vehicle.year >= 1990
      && vehicle.seats > 0
      && vehicle.doors > 0
      && Number(vehicle.dailyPrice) > 0
      && vehicle.imageUrl?.trim(),
    ),
  );

  const checks: ReadinessCheck[] = [
    check("COMPANY_PROFILE", "Company profile", profileComplete, profileComplete ? "Company identity and address are complete" : "Add the company name, city, country and address"),
    check("ACTIVE_LOCATION", "Pickup and return location", pickupReady && returnReady, pickupReady && returnReady ? `${company.locations.length} active location(s)` : "Add an active location that supports pickup and return"),
    check("ACTIVE_VEHICLE", "Active vehicle", company.vehicles.length > 0, company.vehicles.length > 0 ? `${company.vehicles.length} active vehicle(s)` : "Add at least one active vehicle"),
    check("VEHICLE_LISTING", "Bookable vehicle listing", publishableVehicles.length > 0, publishableVehicles.length > 0 ? `${publishableVehicles.length} vehicle(s) have complete pricing and photos` : "At least one active vehicle needs complete details, a positive daily price and a real photo"),
  ];

  return {
    companyId: company.id,
    companyName: company.name,
    status: company.status,
    verified: company.verified,
    publishRevision: company.publishRevision,
    publishedRevision: company.publishedRevision,
    lastPublishedAt: company.lastPublishedAt?.toISOString() ?? null,
    ready: checks.every((item) => item.passed),
    checks,
    counts: {activeLocations: company.locations.length, activeVehicles: company.vehicles.length, publishableVehicles: publishableVehicles.length},
    support: {email: company.supportEmail, phone: company.supportPhone},
    latestReview: company.reviews[0]
      ? {
          id: company.reviews[0].id,
          status: company.reviews[0].status,
          submittedRevision: company.reviews[0].submittedRevision,
          decisionReason: company.reviews[0].decisionReason,
          submittedAt: company.reviews[0].submittedAt.toISOString(),
          reviewedAt: company.reviews[0].reviewedAt?.toISOString() ?? null,
        }
      : null,
  };
}

async function invalidateCarCompanyReview(reviewId: string, companyId: string, reason: string) {
  const db = database();
  await db.$transaction(async (tx) => {
    await tx.carCompanyReview.updateMany({
      where: {id: reviewId, status: "PENDING"},
      data: {status: "STALE", reviewedAt: new Date(), decisionReason: reason},
    });
    await tx.carRentalCompany.updateMany({where: {id: companyId, status: "PENDING_REVIEW"}, data: {status: "DRAFT", verified: false}});
    await tx.auditLog.create({
      data: {
        action: "CAR_COMPANY_REVIEW_STALE",
        entityType: "CarCompanyReview",
        entityId: reviewId,
        after: {companyId, reason},
      },
    });
  });
}

function check(code: string, label: string, passed: boolean, detail: string): ReadinessCheck {
  return {code, label, passed, detail};
}

function readinessSnapshot(readiness: Awaited<ReturnType<typeof buildCarCompanyPublishingReadiness>>) {
  return {
    companyId: readiness.companyId,
    companyName: readiness.companyName,
    publishRevision: readiness.publishRevision,
    counts: readiness.counts,
    checks: readiness.checks,
  };
}

function serializeReview(review: {id: string; companyId: string; submittedByUserId: string; reviewedByUserId: string | null; submittedRevision: number; status: string; readinessSnapshot: unknown; decisionReason: string | null; submittedAt: Date; reviewedAt: Date | null}) {
  return {
    ...review,
    submittedAt: review.submittedAt.toISOString(),
    reviewedAt: review.reviewedAt?.toISOString() ?? null,
  };
}
