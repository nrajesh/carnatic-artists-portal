-- Persist free-text registration locations so approved artists keep what they entered.
ALTER TABLE "RegistrationRequest"
ADD COLUMN "province" TEXT NOT NULL DEFAULT '';
