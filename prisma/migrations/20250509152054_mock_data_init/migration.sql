-- CreateEnum
CREATE TYPE "SuperCategory" AS ENUM ('KNOWLEDGE_LEARNING', 'BUSINESS_FINANCE', 'COMPUTER_SCIENCE_TECH', 'ARTS_CREATIVITY', 'ENTERTAINMENT_MEDIA', 'GAMING_INTERACTIVE', 'MUSIC_AUDIO', 'HEALTH_WELLNESS', 'LIFESTYLE_PERSONAL', 'SOCIETY_CULTURE', 'REVIEWS_PRODUCTS');

-- CreateEnum
CREATE TYPE "LifecycleStage" AS ENUM ('NEW', 'GROWTH', 'STABLE', 'DECLINE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Creator" ADD COLUMN     "contentCategory" "SuperCategory" NOT NULL DEFAULT 'COMPUTER_SCIENCE_TECH',
ADD COLUMN     "geographicLocationId" TEXT,
ADD COLUMN     "lifecycleStage" "LifecycleStage" NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "CreatorGeographicLocation" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "region" TEXT,
    "currency" TEXT NOT NULL,
    "averageCpmUsd" DOUBLE PRECISION NOT NULL,
    "language" TEXT,
    "timezone" TEXT,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "CreatorGeographicLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorGeographicLocation_countryCode_key" ON "CreatorGeographicLocation"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorGeographicLocation_creatorId_key" ON "CreatorGeographicLocation"("creatorId");

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_geographicLocationId_fkey" FOREIGN KEY ("geographicLocationId") REFERENCES "CreatorGeographicLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
