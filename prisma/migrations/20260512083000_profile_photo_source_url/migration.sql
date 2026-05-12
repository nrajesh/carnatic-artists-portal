ALTER TABLE "Artist"
ADD COLUMN IF NOT EXISTS "profilePhotoSourceUrl" TEXT;

ALTER TABLE "RegistrationRequest"
ADD COLUMN IF NOT EXISTS "profilePhotoSourceUrl" TEXT;
