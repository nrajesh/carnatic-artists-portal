-- Store metadata for managed profile photos uploaded through the registration review flow.
-- Legacy external URLs remain supported by nullable URL columns, but managed photos keep
-- their R2 object key so admins can remove the public image immediately.
ALTER TABLE "Artist"
ADD COLUMN IF NOT EXISTS "profilePhotoObjectKey" TEXT,
ADD COLUMN IF NOT EXISTS "profilePhotoRightsConfirmedAt" TIMESTAMP(3);

ALTER TABLE "RegistrationRequest"
ADD COLUMN IF NOT EXISTS "profilePhotoObjectKey" TEXT,
ADD COLUMN IF NOT EXISTS "profilePhotoRightsConfirmedAt" TIMESTAMP(3);
