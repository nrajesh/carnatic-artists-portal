-- CreateEnum
CREATE TYPE "ArtistConnectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ArtistConnection" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "ArtistConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistConnection_requesterId_recipientId_key" ON "ArtistConnection"("requesterId", "recipientId");

-- CreateIndex
CREATE INDEX "ArtistConnection_requesterId_status_createdAt_idx" ON "ArtistConnection"("requesterId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ArtistConnection_recipientId_status_createdAt_idx" ON "ArtistConnection"("recipientId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "ArtistConnection" ADD CONSTRAINT "ArtistConnection_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistConnection" ADD CONSTRAINT "ArtistConnection_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
