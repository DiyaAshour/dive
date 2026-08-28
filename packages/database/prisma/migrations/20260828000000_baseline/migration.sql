-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TravelerLocale" AS ENUM ('EN', 'AR');

-- CreateEnum
CREATE TYPE "BlogLocale" AS ENUM ('EN', 'AR');

-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GrowthEventType" AS ENUM ('HOTEL_IMPRESSION', 'HOTEL_VIEW', 'CHECKOUT_STARTED', 'BOOKING_HOLD_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_EXPIRED');

-- CreateEnum
CREATE TYPE "UserNotificationKind" AS ENUM ('PRICE_DROP', 'PRICE_TARGET_REACHED');

-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('MEMBER', 'GOLD', 'BLACK');

-- CreateEnum
CREATE TYPE "LoyaltyEntryType" AS ENUM ('EARN', 'ADJUSTMENT', 'REDEMPTION', 'REVERSAL', 'EXPIRY');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "EmailMessageKind" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_MODIFIED', 'BOOKING_CANCELLED', 'PARTNER_BOOKING_NOTICE', 'PRICE_WATCH', 'PASSWORD_RESET', 'EMAIL_VERIFICATION', 'SECURITY_ALERT', 'PARTNER_STATEMENT', 'MANUAL_EMAIL');

-- CreateEnum
CREATE TYPE "AdminEmailConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdminEmailDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "InvoiceDocumentType" AS ENUM ('BOOKING_INVOICE', 'CANCELLATION_NOTE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'VOID');

-- CreateEnum
CREATE TYPE "PartnerStatementStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "AuthTokenPurpose" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION');

-- CreateEnum
CREATE TYPE "SupportCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportCasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('GUEST', 'HOTEL_USER', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "SessionScope" AS ENUM ('STANDARD', 'ADMIN');

-- CreateEnum
CREATE TYPE "HotelRole" AS ENUM ('OWNER', 'MANAGER', 'REVENUE', 'FRONT_DESK', 'FINANCE', 'VIEWER');

-- CreateEnum
CREATE TYPE "RoomUnitType" AS ENUM ('ROOM', 'STUDIO', 'SUITE', 'APARTMENT', 'VILLA', 'CHALET', 'BUNGALOW', 'HOLIDAY_HOME', 'DORMITORY_ROOM', 'BED_IN_DORMITORY');

-- CreateEnum
CREATE TYPE "RoomSizeUnit" AS ENUM ('SQM', 'SQFT');

-- CreateEnum
CREATE TYPE "RoomSmokingPolicy" AS ENUM ('NON_SMOKING', 'SMOKING', 'BOTH');

-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('SINGLE', 'DOUBLE', 'QUEEN', 'KING', 'EXTRA_LARGE_DOUBLE', 'SOFA_BED', 'BUNK_BED', 'FUTON', 'MURPHY_BED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PropertyReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'STALE');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('HOTEL_IMAGE', 'VERIFICATION_DOCUMENT');

-- CreateEnum
CREATE TYPE "MediaState" AS ENUM ('PENDING_UPLOAD', 'READY', 'DELETED');

-- CreateEnum
CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "HotelDocumentType" AS ENUM ('COMMERCIAL_REGISTRATION', 'BUSINESS_LICENSE', 'TAX_REGISTRATION', 'BANK_PROOF', 'OWNER_ID', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('HOLD', 'CONFIRMED', 'MODIFIED', 'CANCELLED', 'NO_SHOW', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ArrivalStatus" AS ENUM ('NOT_PROVIDED', 'EXPECTED', 'ARRIVED');

-- CreateEnum
CREATE TYPE "GuestRequestCategory" AS ENUM ('ARRIVAL', 'BEDDING', 'ACCESSIBILITY', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "GuestRequestStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageSenderKind" AS ENUM ('GUEST', 'HOTEL');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('PAY_NOW', 'PAY_AT_HOTEL');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('NOT_REQUIRED', 'PENDING', 'CAPTURED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('INITIATED', 'REQUIRES_ACTION', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('READY', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "MealPlan" AS ENUM ('ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD', 'FULL_BOARD');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('NONE', 'PERCENTAGE', 'FIXED_AMOUNT', 'FIRST_NIGHT', 'FULL_STAY');

-- CreateEnum
CREATE TYPE "BookingEventType" AS ENUM ('HOLD_CREATED', 'CONFIRMED', 'MODIFIED', 'CANCELLED', 'EXPIRED', 'PAYMENT_INITIATED', 'PAYMENT_CAPTURED', 'PAYMENT_FAILED', 'REFUND_RECORDED', 'ACCOUNT_LINKED', 'ARRIVAL_UPDATED', 'REQUEST_CREATED', 'REQUEST_STATUS_UPDATED', 'FRONT_DESK_NOTE_ADDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'FAILED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FinancialEventType" AS ENUM ('BOOKING_GROSS', 'ROOM_BASE', 'EMPLOYEE_SERVICE', 'TAX', 'PLATFORM_COMMISSION', 'CANCELLATION_ADJUSTMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "WalletEntryType" AS ENUM ('REWARDS_CONVERSION', 'BOOKING_DEBIT', 'BOOKING_REFUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "TravelerPreference" (
    "userId" TEXT NOT NULL,
    "locale" "TravelerLocale" NOT NULL DEFAULT 'EN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelerPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "locale" "BlogLocale" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "seoTitle" TEXT NOT NULL,
    "seoDescription" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverImageUrl" TEXT,
    "coverImageAlt" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "authorName" TEXT NOT NULL,
    "readingMinutes" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchDemandEvent" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "destinationKey" TEXT NOT NULL,
    "arrival" DATE NOT NULL,
    "departure" DATE NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "resultCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchDemandEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthEvent" (
    "id" TEXT NOT NULL,
    "type" "GrowthEventType" NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "ratePlanId" TEXT,
    "bookingId" TEXT,
    "arrival" DATE,
    "departure" DATE,
    "amount" DECIMAL(12,2),
    "currency" CHAR(3),
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "destinationKey" TEXT NOT NULL,
    "arrival" DATE NOT NULL,
    "departure" DATE NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "filters" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceWatch" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "arrival" DATE NOT NULL,
    "departure" DATE NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "baselineTotal" DECIMAL(12,2) NOT NULL,
    "lastSeenTotal" DECIMAL(12,2) NOT NULL,
    "lowestSeenTotal" DECIMAL(12,2) NOT NULL,
    "lastNotifiedTotal" DECIMAL(12,2) NOT NULL,
    "targetTotal" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "UserNotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyAccount" (
    "userId" TEXT NOT NULL,
    "tier" "LoyaltyTier" NOT NULL DEFAULT 'MEMBER',
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePointsEarned" INTEGER NOT NULL DEFAULT 0,
    "qualifyingNights" INTEGER NOT NULL DEFAULT 0,
    "qualifyingStays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LoyaltyLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "LoyaltyEntryType" NOT NULL,
    "points" INTEGER NOT NULL,
    "currency" CHAR(3),
    "eligibleAmount" DECIMAL(12,2),
    "pointsPerUnit" INTEGER,
    "tierAtPosting" "LoyaltyTier" NOT NULL,
    "description" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "kind" "EmailMessageKind" NOT NULL,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "bookingId" TEXT,
    "hotelId" TEXT,
    "userId" TEXT,
    "conversationId" TEXT,
    "conversationMessageId" TEXT,
    "replyTo" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminEmailConversation" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "participantEmail" TEXT NOT NULL,
    "participantName" TEXT,
    "status" "AdminEmailConversationStatus" NOT NULL DEFAULT 'OPEN',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminEmailConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminEmailConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "AdminEmailDirection" NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "subject" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "htmlBody" TEXT,
    "providerMessageId" TEXT,
    "inReplyTo" TEXT,
    "createdByUserId" TEXT,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminEmailConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingInvoice" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "documentType" "InvoiceDocumentType" NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "hotelAddress" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "serviceAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "walletAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "paymentState" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerStatement" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "statementNumber" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "bookingGross" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "roomBase" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "serviceAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "platformCommission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cancellationAdjustments" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "refunds" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "PartnerStatementStatus" NOT NULL DEFAULT 'DRAFT',
    "snapshot" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthActionToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationState" (
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationState_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "SupportCase" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT,
    "bookingId" TEXT,
    "hotelId" TEXT,
    "guestEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "SupportCaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportCasePriority" NOT NULL DEFAULT 'NORMAL',
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportCaseMessage" (
    "id" TEXT NOT NULL,
    "supportId" TEXT NOT NULL,
    "authorKind" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportCaseMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'GUEST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scope" "SessionScope" NOT NULL DEFAULT 'STANDARD',
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "address" TEXT NOT NULL,
    "area" TEXT,
    "description" TEXT,
    "starRating" INTEGER,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "timezone" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'JOD',
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "publishRevision" INTEGER NOT NULL DEFAULT 1,
    "publishedRevision" INTEGER,
    "lastPublishedAt" TIMESTAMP(3),
    "commissionRate" DECIMAL(6,5) NOT NULL DEFAULT 0.10,
    "serviceRate" DECIMAL(6,5) NOT NULL DEFAULT 0.07,
    "taxRate" DECIMAL(6,5) NOT NULL DEFAULT 0.086,
    "overbookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaObject" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "state" "MediaState" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "visibility" "MediaVisibility" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "expectedSizeBytes" INTEGER NOT NULL,
    "documentType" "HotelDocumentType",
    "publicUrl" TEXT,
    "uploadExpiresAt" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelPhoto" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "mediaObjectId" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelDocument" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "mediaObjectId" TEXT NOT NULL,
    "type" "HotelDocumentType" NOT NULL,
    "status" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "HotelDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelAmenity" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyReview" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "submittedRevision" INTEGER NOT NULL,
    "status" "PropertyReviewStatus" NOT NULL DEFAULT 'PENDING',
    "readinessSnapshot" JSONB NOT NULL,
    "decisionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PropertyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelMembership" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "HotelRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "unitType" "RoomUnitType" NOT NULL DEFAULT 'ROOM',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "maxGuests" INTEGER NOT NULL DEFAULT 2,
    "maxAdults" INTEGER NOT NULL,
    "maxChildren" INTEGER NOT NULL DEFAULT 0,
    "maxInfants" INTEGER NOT NULL DEFAULT 0,
    "bedroomCount" INTEGER NOT NULL DEFAULT 1,
    "livingRoomCount" INTEGER NOT NULL DEFAULT 0,
    "bathroomCount" INTEGER NOT NULL DEFAULT 1,
    "privateBathroom" BOOLEAN NOT NULL DEFAULT true,
    "sizeValue" DECIMAL(8,2),
    "sizeUnit" "RoomSizeUnit" NOT NULL DEFAULT 'SQM',
    "smokingPolicy" "RoomSmokingPolicy" NOT NULL DEFAULT 'NON_SMOKING',
    "extraBedCount" INTEGER NOT NULL DEFAULT 0,
    "cribCount" INTEGER NOT NULL DEFAULT 0,
    "allowsCribAndExtraBed" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBed" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "type" "BedType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomBed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomAmenity" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalRoom" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'READY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatePlan" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "refundable" BOOLEAN NOT NULL,
    "mealPlan" "MealPlan" NOT NULL DEFAULT 'ROOM_ONLY',
    "allowPayNow" BOOLEAN NOT NULL DEFAULT true,
    "allowPayAtHotel" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RatePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "bookingStartsAt" TIMESTAMP(3) NOT NULL,
    "bookingEndsAt" TIMESTAMP(3) NOT NULL,
    "stayStartsOn" DATE NOT NULL,
    "stayEndsOn" DATE NOT NULL,
    "minimumNights" INTEGER NOT NULL DEFAULT 1,
    "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRatePlan" (
    "promotionId" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,

    CONSTRAINT "PromotionRatePlan_pkey" PRIMARY KEY ("promotionId","ratePlanId")
);

-- CreateTable
CREATE TABLE "CancellationPolicy" (
    "id" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "noShowPenaltyType" "PenaltyType" NOT NULL DEFAULT 'FULL_STAY',
    "noShowPenaltyValue" DECIMAL(12,5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationRule" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "minimumDaysBeforeArrival" INTEGER NOT NULL,
    "penaltyType" "PenaltyType" NOT NULL,
    "penaltyValue" DECIMAL(12,5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancellationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyRate" (
    "id" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "baseRate" DECIMAL(12,2) NOT NULL,
    "minStay" INTEGER NOT NULL DEFAULT 1,
    "maxStay" INTEGER,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "stopSell" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryDay" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "available" INTEGER NOT NULL,
    "overbookingLimit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "arrival" DATE NOT NULL,
    "departure" DATE NOT NULL,
    "expectedArrivalTime" TEXT,
    "arrivalStatus" "ArrivalStatus" NOT NULL DEFAULT 'NOT_PROVIDED',
    "status" "BookingStatus" NOT NULL DEFAULT 'HOLD',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "paymentMode" "PaymentMode" NOT NULL,
    "paymentState" "PaymentState" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "serviceAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "commissionRateSnapshot" DECIMAL(6,5) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "promotionNameSnapshot" TEXT,
    "promotionDiscountPercentSnapshot" DECIMAL(5,2),
    "cancellationPolicySnapshot" JSONB NOT NULL,
    "cancellationPenaltyAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundableAmount" DECIMAL(12,2),
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "holdExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingNight" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "serviceAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingNight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "BookingEventType" NOT NULL,
    "actorUserId" TEXT,
    "idempotencyKey" TEXT,
    "requestFingerprint" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingGuestRequest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "category" "GuestRequestCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "GuestRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingGuestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingFrontDeskNote" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingFrontDeskNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "overall" INTEGER NOT NULL,
    "cleanliness" INTEGER NOT NULL,
    "staff" INTEGER NOT NULL,
    "location" INTEGER NOT NULL,
    "facilities" INTEGER NOT NULL,
    "comfort" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderationReason" TEXT,
    "moderatedByUserId" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "hotelReply" TEXT,
    "repliedByUserId" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingConversation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderKind" "MessageSenderKind" NOT NULL,
    "body" TEXT NOT NULL,
    "guestReadAt" TIMESTAMP(3),
    "hotelReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "externalPaymentId" TEXT,
    "returnUrl" TEXT NOT NULL,
    "redirectUrl" TEXT,
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByUserId" TEXT,
    "provider" TEXT,
    "externalReference" TEXT,
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "type" "FinancialEventType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletAccount" (
    "userId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'JOD',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "WalletLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "WalletEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'JOD',
    "sourcePoints" INTEGER,
    "description" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogPost_status_locale_publishedAt_idx" ON "BlogPost"("status", "locale", "publishedAt");

-- CreateIndex
CREATE INDEX "BlogPost_locale_category_status_idx" ON "BlogPost"("locale", "category", "status");

-- CreateIndex
CREATE INDEX "BlogPost_featured_status_publishedAt_idx" ON "BlogPost"("featured", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_locale_slug_key" ON "BlogPost"("locale", "slug");

-- CreateIndex
CREATE INDEX "SearchDemandEvent_destinationKey_arrival_createdAt_idx" ON "SearchDemandEvent"("destinationKey", "arrival", "createdAt");

-- CreateIndex
CREATE INDEX "SearchDemandEvent_arrival_createdAt_idx" ON "SearchDemandEvent"("arrival", "createdAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_hotelId_type_occurredAt_idx" ON "GrowthEvent"("hotelId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_hotelId_arrival_occurredAt_idx" ON "GrowthEvent"("hotelId", "arrival", "occurredAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_bookingId_type_idx" ON "GrowthEvent"("bookingId", "type");

-- CreateIndex
CREATE INDEX "SavedSearch_ownerUserId_active_updatedAt_idx" ON "SavedSearch"("ownerUserId", "active", "updatedAt");

-- CreateIndex
CREATE INDEX "SavedSearch_destinationKey_arrival_idx" ON "SavedSearch"("destinationKey", "arrival");

-- CreateIndex
CREATE INDEX "PriceWatch_ownerUserId_active_updatedAt_idx" ON "PriceWatch"("ownerUserId", "active", "updatedAt");

-- CreateIndex
CREATE INDEX "PriceWatch_active_lastCheckedAt_idx" ON "PriceWatch"("active", "lastCheckedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceWatch_ownerUserId_hotelId_arrival_departure_adults_chi_key" ON "PriceWatch"("ownerUserId", "hotelId", "arrival", "departure", "adults", "children");

-- CreateIndex
CREATE INDEX "UserNotification_userId_readAt_createdAt_idx" ON "UserNotification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_userId_createdAt_idx" ON "UserNotification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyLedgerEntry_idempotencyKey_key" ON "LoyaltyLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LoyaltyLedgerEntry_userId_createdAt_idx" ON "LoyaltyLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyLedgerEntry_bookingId_type_idx" ON "LoyaltyLedgerEntry"("bookingId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_dedupeKey_key" ON "EmailOutbox"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmailOutbox_conversationMessageId_key" ON "EmailOutbox"("conversationMessageId");

-- CreateIndex
CREATE INDEX "EmailOutbox_status_nextAttemptAt_createdAt_idx" ON "EmailOutbox"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_bookingId_createdAt_idx" ON "EmailOutbox"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_userId_createdAt_idx" ON "EmailOutbox"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_conversationId_createdAt_idx" ON "EmailOutbox"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminEmailConversation_lastMessageAt_idx" ON "AdminEmailConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "AdminEmailConversation_participantEmail_lastMessageAt_idx" ON "AdminEmailConversation"("participantEmail", "lastMessageAt");

-- CreateIndex
CREATE INDEX "AdminEmailConversation_status_lastMessageAt_idx" ON "AdminEmailConversation"("status", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminEmailConversationMessage_providerMessageId_key" ON "AdminEmailConversationMessage"("providerMessageId");

-- CreateIndex
CREATE INDEX "AdminEmailConversationMessage_conversationId_createdAt_idx" ON "AdminEmailConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingInvoice_invoiceNumber_key" ON "BookingInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BookingInvoice_dedupeKey_key" ON "BookingInvoice"("dedupeKey");

-- CreateIndex
CREATE INDEX "BookingInvoice_userId_issuedAt_idx" ON "BookingInvoice"("userId", "issuedAt");

-- CreateIndex
CREATE INDEX "BookingInvoice_hotelId_issuedAt_idx" ON "BookingInvoice"("hotelId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingInvoice_bookingId_revision_documentType_key" ON "BookingInvoice"("bookingId", "revision", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerStatement_statementNumber_key" ON "PartnerStatement"("statementNumber");

-- CreateIndex
CREATE INDEX "PartnerStatement_hotelId_periodEnd_status_idx" ON "PartnerStatement"("hotelId", "periodEnd", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerStatement_hotelId_periodStart_periodEnd_currency_key" ON "PartnerStatement"("hotelId", "periodStart", "periodEnd", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "AuthActionToken_tokenHash_key" ON "AuthActionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthActionToken_userId_purpose_expiresAt_idx" ON "AuthActionToken"("userId", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthActionToken_email_purpose_expiresAt_idx" ON "AuthActionToken"("email", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationState_email_idx" ON "EmailVerificationState"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SupportCase_reference_key" ON "SupportCase"("reference");

-- CreateIndex
CREATE INDEX "SupportCase_status_priority_updatedAt_idx" ON "SupportCase"("status", "priority", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportCase_userId_updatedAt_idx" ON "SupportCase"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportCase_bookingId_idx" ON "SupportCase"("bookingId");

-- CreateIndex
CREATE INDEX "SupportCase_hotelId_updatedAt_idx" ON "SupportCase"("hotelId", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportCaseMessage_supportId_createdAt_idx" ON "SupportCaseMessage"("supportId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_scope_expiresAt_idx" ON "Session"("userId", "scope", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_slug_key" ON "Hotel"("slug");

-- CreateIndex
CREATE INDEX "Hotel_status_verified_city_idx" ON "Hotel"("status", "verified", "city");

-- CreateIndex
CREATE INDEX "Hotel_countryCode_city_idx" ON "Hotel"("countryCode", "city");

-- CreateIndex
CREATE UNIQUE INDEX "MediaObject_objectKey_key" ON "MediaObject"("objectKey");

-- CreateIndex
CREATE INDEX "MediaObject_hotelId_kind_state_createdAt_idx" ON "MediaObject"("hotelId", "kind", "state", "createdAt");

-- CreateIndex
CREATE INDEX "MediaObject_uploadExpiresAt_state_idx" ON "MediaObject"("uploadExpiresAt", "state");

-- CreateIndex
CREATE UNIQUE INDEX "HotelPhoto_mediaObjectId_key" ON "HotelPhoto"("mediaObjectId");

-- CreateIndex
CREATE INDEX "HotelPhoto_hotelId_sortOrder_idx" ON "HotelPhoto"("hotelId", "sortOrder");

-- CreateIndex
CREATE INDEX "HotelPhoto_roomTypeId_sortOrder_idx" ON "HotelPhoto"("roomTypeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "HotelDocument_mediaObjectId_key" ON "HotelDocument"("mediaObjectId");

-- CreateIndex
CREATE INDEX "HotelDocument_hotelId_type_status_submittedAt_idx" ON "HotelDocument"("hotelId", "type", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "HotelDocument_status_submittedAt_idx" ON "HotelDocument"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "HotelAmenity_code_idx" ON "HotelAmenity"("code");

-- CreateIndex
CREATE UNIQUE INDEX "HotelAmenity_hotelId_code_key" ON "HotelAmenity"("hotelId", "code");

-- CreateIndex
CREATE INDEX "PropertyReview_hotelId_submittedAt_idx" ON "PropertyReview"("hotelId", "submittedAt");

-- CreateIndex
CREATE INDEX "PropertyReview_status_submittedAt_idx" ON "PropertyReview"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "PropertyReview_reviewedByUserId_reviewedAt_idx" ON "PropertyReview"("reviewedByUserId", "reviewedAt");

-- CreateIndex
CREATE INDEX "HotelMembership_userId_status_idx" ON "HotelMembership"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HotelMembership_hotelId_userId_key" ON "HotelMembership"("hotelId", "userId");

-- CreateIndex
CREATE INDEX "RoomType_hotelId_active_idx" ON "RoomType"("hotelId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_hotelId_code_key" ON "RoomType"("hotelId", "code");

-- CreateIndex
CREATE INDEX "RoomBed_roomTypeId_sortOrder_idx" ON "RoomBed"("roomTypeId", "sortOrder");

-- CreateIndex
CREATE INDEX "RoomAmenity_code_idx" ON "RoomAmenity"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RoomAmenity_roomTypeId_code_key" ON "RoomAmenity"("roomTypeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalRoom_roomTypeId_roomNumber_key" ON "PhysicalRoom"("roomTypeId", "roomNumber");

-- CreateIndex
CREATE INDEX "RatePlan_roomTypeId_active_idx" ON "RatePlan"("roomTypeId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RatePlan_roomTypeId_code_key" ON "RatePlan"("roomTypeId", "code");

-- CreateIndex
CREATE INDEX "Promotion_hotelId_status_bookingStartsAt_bookingEndsAt_idx" ON "Promotion"("hotelId", "status", "bookingStartsAt", "bookingEndsAt");

-- CreateIndex
CREATE INDEX "Promotion_hotelId_stayStartsOn_stayEndsOn_idx" ON "Promotion"("hotelId", "stayStartsOn", "stayEndsOn");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_hotelId_code_key" ON "Promotion"("hotelId", "code");

-- CreateIndex
CREATE INDEX "PromotionRatePlan_ratePlanId_idx" ON "PromotionRatePlan"("ratePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationPolicy_ratePlanId_key" ON "CancellationPolicy"("ratePlanId");

-- CreateIndex
CREATE INDEX "CancellationRule_policyId_minimumDaysBeforeArrival_idx" ON "CancellationRule"("policyId", "minimumDaysBeforeArrival");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationRule_policyId_minimumDaysBeforeArrival_key" ON "CancellationRule"("policyId", "minimumDaysBeforeArrival");

-- CreateIndex
CREATE INDEX "DailyRate_date_closed_stopSell_idx" ON "DailyRate"("date", "closed", "stopSell");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRate_ratePlanId_date_key" ON "DailyRate"("ratePlanId", "date");

-- CreateIndex
CREATE INDEX "InventoryDay_date_available_idx" ON "InventoryDay"("date", "available");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryDay_roomTypeId_date_key" ON "InventoryDay"("roomTypeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_accessTokenHash_key" ON "Booking"("accessTokenHash");

-- CreateIndex
CREATE INDEX "Booking_hotelId_arrival_departure_status_idx" ON "Booking"("hotelId", "arrival", "departure", "status");

-- CreateIndex
CREATE INDEX "Booking_hotelId_arrival_arrivalStatus_status_idx" ON "Booking"("hotelId", "arrival", "arrivalStatus", "status");

-- CreateIndex
CREATE INDEX "Booking_guestEmail_createdAt_idx" ON "Booking"("guestEmail", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_status_holdExpiresAt_idx" ON "Booking"("status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "BookingNight_bookingId_revision_idx" ON "BookingNight"("bookingId", "revision");

-- CreateIndex
CREATE INDEX "BookingNight_date_idx" ON "BookingNight"("date");

-- CreateIndex
CREATE UNIQUE INDEX "BookingNight_bookingId_revision_date_key" ON "BookingNight"("bookingId", "revision", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BookingEvent_idempotencyKey_key" ON "BookingEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_createdAt_idx" ON "BookingEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingGuestRequest_bookingId_status_createdAt_idx" ON "BookingGuestRequest"("bookingId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingFrontDeskNote_bookingId_createdAt_idx" ON "BookingFrontDeskNote"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingFrontDeskNote_authorUserId_createdAt_idx" ON "BookingFrontDeskNote"("authorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuestReview_bookingId_key" ON "GuestReview"("bookingId");

-- CreateIndex
CREATE INDEX "GuestReview_hotelId_status_createdAt_idx" ON "GuestReview"("hotelId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "GuestReview_authorUserId_createdAt_idx" ON "GuestReview"("authorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "GuestReview_moderatedByUserId_moderatedAt_idx" ON "GuestReview"("moderatedByUserId", "moderatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingConversation_bookingId_key" ON "BookingConversation"("bookingId");

-- CreateIndex
CREATE INDEX "BookingConversation_hotelId_updatedAt_idx" ON "BookingConversation"("hotelId", "updatedAt");

-- CreateIndex
CREATE INDEX "BookingMessage_conversationId_createdAt_idx" ON "BookingMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingMessage_senderUserId_createdAt_idx" ON "BookingMessage"("senderUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentAttempt_bookingId_createdAt_idx" ON "PaymentAttempt"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_provider_status_createdAt_idx" ON "PaymentAttempt"("provider", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_provider_externalPaymentId_key" ON "PaymentAttempt"("provider", "externalPaymentId");

-- CreateIndex
CREATE INDEX "Refund_bookingId_createdAt_idx" ON "Refund"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "Refund_provider_status_createdAt_idx" ON "Refund"("provider", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialEvent_bookingId_createdAt_idx" ON "FinancialEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialEvent_hotelId_type_createdAt_idx" ON "FinancialEvent"("hotelId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_hotelId_createdAt_idx" ON "AuditLog"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLedgerEntry_idempotencyKey_key" ON "WalletLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_userId_createdAt_idx" ON "WalletLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_bookingId_type_idx" ON "WalletLedgerEntry"("bookingId", "type");

-- AddForeignKey
ALTER TABLE "LoyaltyLedgerEntry" ADD CONSTRAINT "LoyaltyLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LoyaltyAccount"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AdminEmailConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_conversationMessageId_fkey" FOREIGN KEY ("conversationMessageId") REFERENCES "AdminEmailConversationMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminEmailConversationMessage" ADD CONSTRAINT "AdminEmailConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AdminEmailConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCaseMessage" ADD CONSTRAINT "SupportCaseMessage_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES "SupportCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaObject" ADD CONSTRAINT "MediaObject_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaObject" ADD CONSTRAINT "MediaObject_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelPhoto" ADD CONSTRAINT "HotelPhoto_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelPhoto" ADD CONSTRAINT "HotelPhoto_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelPhoto" ADD CONSTRAINT "HotelPhoto_mediaObjectId_fkey" FOREIGN KEY ("mediaObjectId") REFERENCES "MediaObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDocument" ADD CONSTRAINT "HotelDocument_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDocument" ADD CONSTRAINT "HotelDocument_mediaObjectId_fkey" FOREIGN KEY ("mediaObjectId") REFERENCES "MediaObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDocument" ADD CONSTRAINT "HotelDocument_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelAmenity" ADD CONSTRAINT "HotelAmenity_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyReview" ADD CONSTRAINT "PropertyReview_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyReview" ADD CONSTRAINT "PropertyReview_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyReview" ADD CONSTRAINT "PropertyReview_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelMembership" ADD CONSTRAINT "HotelMembership_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelMembership" ADD CONSTRAINT "HotelMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomType" ADD CONSTRAINT "RoomType_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBed" ADD CONSTRAINT "RoomBed_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAmenity" ADD CONSTRAINT "RoomAmenity_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalRoom" ADD CONSTRAINT "PhysicalRoom_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRatePlan" ADD CONSTRAINT "PromotionRatePlan_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRatePlan" ADD CONSTRAINT "PromotionRatePlan_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "RatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationPolicy" ADD CONSTRAINT "CancellationPolicy_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "RatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationRule" ADD CONSTRAINT "CancellationRule_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "CancellationPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRate" ADD CONSTRAINT "DailyRate_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "RatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryDay" ADD CONSTRAINT "InventoryDay_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_ratePlanId_fkey" FOREIGN KEY ("ratePlanId") REFERENCES "RatePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNight" ADD CONSTRAINT "BookingNight_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingGuestRequest" ADD CONSTRAINT "BookingGuestRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingGuestRequest" ADD CONSTRAINT "BookingGuestRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFrontDeskNote" ADD CONSTRAINT "BookingFrontDeskNote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingFrontDeskNote" ADD CONSTRAINT "BookingFrontDeskNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_repliedByUserId_fkey" FOREIGN KEY ("repliedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingConversation" ADD CONSTRAINT "BookingConversation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingConversation" ADD CONSTRAINT "BookingConversation_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingMessage" ADD CONSTRAINT "BookingMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "BookingConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingMessage" ADD CONSTRAINT "BookingMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEvent" ADD CONSTRAINT "FinancialEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEvent" ADD CONSTRAINT "FinancialEvent_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "WalletAccount"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

