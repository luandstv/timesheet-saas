/*
  Warnings:

  - You are about to drop the column `normal_fhc_minutes` on the `time_sheets` table. All the data in the column will be lost.
  - You are about to drop the column `normal_fhcn_minutes` on the `time_sheets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "time_sheets" DROP COLUMN "normal_fhc_minutes",
DROP COLUMN "normal_fhcn_minutes",
ADD COLUMN     "normal_minutes" INTEGER NOT NULL DEFAULT 0;
