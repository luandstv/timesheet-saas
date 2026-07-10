-- AlterTable
ALTER TABLE "users" ADD COLUMN     "work_end_hour" INTEGER NOT NULL DEFAULT 17,
ADD COLUMN     "work_end_minute" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "work_start_hour" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "work_start_minute" INTEGER NOT NULL DEFAULT 0;
