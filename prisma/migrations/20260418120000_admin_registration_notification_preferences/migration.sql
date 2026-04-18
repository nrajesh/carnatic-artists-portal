-- AlterTable
ALTER TABLE "NotificationPreference"
ADD COLUMN "newRegistrationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "registrationApprovedEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "registrationRejectedEnabled" BOOLEAN NOT NULL DEFAULT true;
