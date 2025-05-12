/*
  Warnings:

  - You are about to drop the column `cpmUsd` on the `Metric` table. All the data in the column will be lost.
  - You are about to drop the column `growthStage` on the `Metric` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Metric` table. All the data in the column will be lost.
  - You are about to drop the column `seasonalityBoost` on the `Metric` table. All the data in the column will be lost.
  - You are about to drop the column `subscribersGained` on the `Metric` table. All the data in the column will be lost.
  - You are about to drop the column `trendMultiplier` on the `Metric` table. All the data in the column will be lost.
  - Added the required column `audienceSize` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postCount` to the `Metric` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Metric" DROP COLUMN "cpmUsd",
DROP COLUMN "growthStage",
DROP COLUMN "location",
DROP COLUMN "seasonalityBoost",
DROP COLUMN "subscribersGained",
DROP COLUMN "trendMultiplier",
ADD COLUMN     "audienceSize" INTEGER NOT NULL,
ADD COLUMN     "postCount" INTEGER NOT NULL;
