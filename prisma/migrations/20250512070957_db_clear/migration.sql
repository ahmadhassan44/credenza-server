/*
  Warnings:

  - You are about to drop the column `timestamp` on the `Metric` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Metric` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `Metric` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Platform` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Platform` table. All the data in the column will be lost.
  - Added the required column `avgViewDurationSec` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cpmUsd` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `engagementRatePct` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estimatedRevenueUsd` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `growthStage` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seasonalityBoost` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscribersGained` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trendMultiplier` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `views` to the `Metric` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Metric" DROP COLUMN "timestamp",
DROP COLUMN "type",
DROP COLUMN "value",
ADD COLUMN     "adRevenueUsd" DOUBLE PRECISION,
ADD COLUMN     "avgViewDurationSec" INTEGER NOT NULL,
ADD COLUMN     "cpmUsd" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "engagementRatePct" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "estimatedRevenueUsd" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "growthStage" "LifecycleStage" NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "otherRevenueUsd" DOUBLE PRECISION,
ADD COLUMN     "seasonalityBoost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "subscribersGained" INTEGER NOT NULL,
ADD COLUMN     "trendMultiplier" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "views" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Platform" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CREATOR';

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
