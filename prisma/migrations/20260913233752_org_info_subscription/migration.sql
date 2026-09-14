-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "address" TEXT;
ALTER TABLE "Organization" ADD COLUMN "bankAccount" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingCycle" TEXT;
ALTER TABLE "Organization" ADD COLUMN "email" TEXT;
ALTER TABLE "Organization" ADD COLUMN "industry" TEXT;
ALTER TABLE "Organization" ADD COLUMN "mainActivities" TEXT;
ALTER TABLE "Organization" ADD COLUMN "phone" TEXT;
ALTER TABLE "Organization" ADD COLUMN "planEndsAt" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "planStartsAt" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "taxId" TEXT;
