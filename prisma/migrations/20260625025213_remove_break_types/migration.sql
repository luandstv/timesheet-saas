/*
  Warnings:

  - The values [BREAK_START,BREAK_END] on the enum `EntryType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EntryType_new" AS ENUM ('CLOCK_IN', 'CLOCK_OUT');
ALTER TABLE "time_entries" ALTER COLUMN "type" TYPE "EntryType_new" USING ("type"::text::"EntryType_new");
ALTER TYPE "EntryType" RENAME TO "EntryType_old";
ALTER TYPE "EntryType_new" RENAME TO "EntryType";
DROP TYPE "public"."EntryType_old";
COMMIT;
