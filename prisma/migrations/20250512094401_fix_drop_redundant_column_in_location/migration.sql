/*
  Warnings:

  - You are about to drop the column `creatorId` on the `CreatorGeographicLocation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CreatorGeographicLocation_creatorId_key";

-- AlterTable
ALTER TABLE "CreatorGeographicLocation" DROP COLUMN "creatorId";
