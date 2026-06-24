/*
  Warnings:

  - You are about to drop the column `timesheet_id` on the `time_entries` table. All the data in the column will be lost.
  - Added the required column `time_sheet_id` to the `time_entries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "time_entries" DROP CONSTRAINT "time_entries_timesheet_id_fkey";

-- AlterTable
ALTER TABLE "time_entries" DROP COLUMN "timesheet_id",
ADD COLUMN     "time_sheet_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_time_sheet_id_fkey" FOREIGN KEY ("time_sheet_id") REFERENCES "time_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
