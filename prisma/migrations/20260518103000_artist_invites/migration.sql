CREATE TABLE "ArtistInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "inviterArtistId" TEXT NOT NULL,
    "selectedLinkType" TEXT NOT NULL,
    "selectedLinkUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistInvite_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RegistrationRequest"
ADD COLUMN "inviteId" TEXT,
ADD COLUMN "inviteAutoConnectOptIn" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "ArtistInvite_token_key" ON "ArtistInvite"("token");
CREATE INDEX "ArtistInvite_inviterArtistId_createdAt_idx" ON "ArtistInvite"("inviterArtistId", "createdAt");
CREATE INDEX "RegistrationRequest_inviteId_status_submittedAt_idx" ON "RegistrationRequest"("inviteId", "status", "submittedAt");

ALTER TABLE "ArtistInvite"
ADD CONSTRAINT "ArtistInvite_inviterArtistId_fkey"
FOREIGN KEY ("inviterArtistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationRequest"
ADD CONSTRAINT "RegistrationRequest_inviteId_fkey"
FOREIGN KEY ("inviteId") REFERENCES "ArtistInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
