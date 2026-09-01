CREATE TYPE "CarCompanyRole" AS ENUM ('OWNER', 'MANAGER', 'FLEET', 'RESERVATIONS', 'FINANCE', 'VIEWER');
CREATE TYPE "CarCompanyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "CarVehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');
CREATE TYPE "CarTransmission" AS ENUM ('AUTOMATIC', 'MANUAL');
CREATE TYPE "CarFuel" AS ENUM ('PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC');
CREATE TYPE "CarReservationStatus" AS ENUM ('HOLD', 'CONFIRMED', 'MODIFIED', 'CANCELLED', 'NO_SHOW', 'COMPLETED', 'EXPIRED');
CREATE TYPE "CarPaymentMode" AS ENUM ('PAY_NOW', 'PAY_AT_COUNTER');

CREATE TABLE "CarRentalCompany" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "countryCode" CHAR(2) NOT NULL,
  "address" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Amman',
  "currency" CHAR(3) NOT NULL DEFAULT 'JOD',
  "status" "CarCompanyStatus" NOT NULL DEFAULT 'DRAFT',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "supportEmail" TEXT,
  "supportPhone" TEXT,
  "commissionRate" DECIMAL(6,5) NOT NULL DEFAULT 0.10,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarRentalCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarCompanyMembership" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "CarCompanyRole" NOT NULL DEFAULT 'OWNER',
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarCompanyMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarRentalLocation" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "airportCode" VARCHAR(3),
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
  "returnEnabled" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarRentalLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarVehicle" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "homeLocationId" TEXT,
  "make" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "transmission" "CarTransmission" NOT NULL,
  "fuel" "CarFuel" NOT NULL,
  "seats" INTEGER NOT NULL,
  "bags" INTEGER NOT NULL DEFAULT 2,
  "doors" INTEGER NOT NULL DEFAULT 4,
  "airConditioning" BOOLEAN NOT NULL DEFAULT true,
  "dailyPrice" DECIMAL(10,2) NOT NULL,
  "deposit" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "freeCancellation" BOOLEAN NOT NULL DEFAULT true,
  "unlimitedMileage" BOOLEAN NOT NULL DEFAULT false,
  "airportPickup" BOOLEAN NOT NULL DEFAULT false,
  "imageUrl" TEXT,
  "imageAlt" TEXT,
  "status" "CarVehicleStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarVehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarRatePlan" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "vehicleId" TEXT,
  "name" TEXT NOT NULL,
  "dailyPrice" DECIMAL(10,2) NOT NULL,
  "deposit" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "freeCancellation" BOOLEAN NOT NULL DEFAULT true,
  "cancellationHours" INTEGER NOT NULL DEFAULT 24,
  "unlimitedMileage" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarRatePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarAvailabilityDay" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "dailyPrice" DECIMAL(10,2),
  "minDays" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarAvailabilityDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarReservation" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "pickupLocationId" TEXT NOT NULL,
  "returnLocationId" TEXT NOT NULL,
  "userId" TEXT,
  "guestName" TEXT NOT NULL,
  "guestEmail" TEXT NOT NULL,
  "guestPhone" TEXT,
  "driverAgeRange" TEXT NOT NULL,
  "pickupAt" TIMESTAMP(3) NOT NULL,
  "returnAt" TIMESTAMP(3) NOT NULL,
  "status" "CarReservationStatus" NOT NULL DEFAULT 'HOLD',
  "paymentMode" "CarPaymentMode" NOT NULL DEFAULT 'PAY_AT_COUNTER',
  "currency" CHAR(3) NOT NULL,
  "dailyRate" DECIMAL(10,2) NOT NULL,
  "rentalDays" INTEGER NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL,
  "fees" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(10,2) NOT NULL,
  "deposit" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "cancellationNote" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CarRentalCompany_slug_key" ON "CarRentalCompany"("slug");
CREATE INDEX "CarRentalCompany_status_verified_city_idx" ON "CarRentalCompany"("status", "verified", "city");
CREATE INDEX "CarRentalCompany_countryCode_city_idx" ON "CarRentalCompany"("countryCode", "city");

CREATE UNIQUE INDEX "CarCompanyMembership_companyId_userId_key" ON "CarCompanyMembership"("companyId", "userId");
CREATE INDEX "CarCompanyMembership_userId_status_idx" ON "CarCompanyMembership"("userId", "status");

CREATE INDEX "CarRentalLocation_companyId_active_city_idx" ON "CarRentalLocation"("companyId", "active", "city");
CREATE INDEX "CarRentalLocation_airportCode_idx" ON "CarRentalLocation"("airportCode");

CREATE INDEX "CarVehicle_companyId_status_category_idx" ON "CarVehicle"("companyId", "status", "category");
CREATE INDEX "CarVehicle_make_model_idx" ON "CarVehicle"("make", "model");
CREATE INDEX "CarVehicle_homeLocationId_status_idx" ON "CarVehicle"("homeLocationId", "status");

CREATE INDEX "CarRatePlan_companyId_active_idx" ON "CarRatePlan"("companyId", "active");
CREATE INDEX "CarRatePlan_vehicleId_active_idx" ON "CarRatePlan"("vehicleId", "active");

CREATE UNIQUE INDEX "CarAvailabilityDay_vehicleId_date_key" ON "CarAvailabilityDay"("vehicleId", "date");
CREATE INDEX "CarAvailabilityDay_date_available_idx" ON "CarAvailabilityDay"("date", "available");

CREATE UNIQUE INDEX "CarReservation_reference_key" ON "CarReservation"("reference");
CREATE INDEX "CarReservation_companyId_status_pickupAt_idx" ON "CarReservation"("companyId", "status", "pickupAt");
CREATE INDEX "CarReservation_vehicleId_pickupAt_returnAt_idx" ON "CarReservation"("vehicleId", "pickupAt", "returnAt");
CREATE INDEX "CarReservation_userId_createdAt_idx" ON "CarReservation"("userId", "createdAt");
CREATE INDEX "CarReservation_guestEmail_createdAt_idx" ON "CarReservation"("guestEmail", "createdAt");

ALTER TABLE "CarCompanyMembership" ADD CONSTRAINT "CarCompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CarRentalCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarRentalLocation" ADD CONSTRAINT "CarRentalLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CarRentalCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarVehicle" ADD CONSTRAINT "CarVehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CarRentalCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarVehicle" ADD CONSTRAINT "CarVehicle_homeLocationId_fkey" FOREIGN KEY ("homeLocationId") REFERENCES "CarRentalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CarRatePlan" ADD CONSTRAINT "CarRatePlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CarRentalCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarRatePlan" ADD CONSTRAINT "CarRatePlan_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "CarVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarAvailabilityDay" ADD CONSTRAINT "CarAvailabilityDay_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "CarVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarReservation" ADD CONSTRAINT "CarReservation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CarRentalCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarReservation" ADD CONSTRAINT "CarReservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "CarVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarReservation" ADD CONSTRAINT "CarReservation_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "CarRentalLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarReservation" ADD CONSTRAINT "CarReservation_returnLocationId_fkey" FOREIGN KEY ("returnLocationId") REFERENCES "CarRentalLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
