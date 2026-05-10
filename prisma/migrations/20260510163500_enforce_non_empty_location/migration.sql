UPDATE "Artist"
SET "province" = 'Hilversum'
WHERE "isSuspended" = true
  AND btrim("province") = '';

UPDATE "RegistrationRequest" AS r
SET "province" = a."province"
FROM "Artist" AS a
WHERE btrim(r."province") = ''
  AND r."emailLookupHash" IS NOT NULL
  AND a."emailLookupHash" = r."emailLookupHash";

UPDATE "RegistrationRequest"
SET "province" = 'Unknown'
WHERE btrim("province") = '';

ALTER TABLE "Artist"
ADD CONSTRAINT "Artist_province_not_blank"
CHECK (btrim("province") <> '');

ALTER TABLE "RegistrationRequest"
ADD CONSTRAINT "RegistrationRequest_province_not_blank"
CHECK (btrim("province") <> '');
