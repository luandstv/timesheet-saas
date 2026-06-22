-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COLLABORATOR', 'MANAGER');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('OPEN', 'SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END');

-- CreateEnum
CREATE TYPE "EntryMode" AS ENUM ('REGULAR', 'ON_CALL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "Period" AS ENUM ('FHC', 'FHCN');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('NATIONAL', 'STATE', 'MUNICIPAL');

-- CreateEnum
CREATE TYPE "OnCallType" AS ENUM ('WEEKDAY', 'WEEKEND', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('INSERTION', 'MODIFICATION', 'DELETION');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('MEDICAL_LEAVE', 'VACATION', 'COMPENSATORY_OFF', 'DAY_OFF', 'JUSTIFIED_ABSENCE', 'UNJUSTIFIED_ABSENCE', 'BEREAVEMENT', 'MATERNITY', 'PATERNITY', 'OTHER');

-- CreateEnum
CREATE TYPE "AbsenceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COLLABORATOR',
    "daily_hours" INTEGER NOT NULL DEFAULT 8,
    "weekly_hours" INTEGER NOT NULL DEFAULT 40,
    "manager_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_sheets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'OPEN',
    "is_holiday" BOOLEAN NOT NULL DEFAULT false,
    "is_weekend" BOOLEAN NOT NULL DEFAULT false,
    "total_worked_minutes" INTEGER NOT NULL DEFAULT 0,
    "normal_fhc_minutes" INTEGER NOT NULL DEFAULT 0,
    "normal_fhcn_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_75_fhc_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_75_fhcn_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_100_fhc_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_100_fhcn_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" UUID NOT NULL,
    "timesheet_id" UUID NOT NULL,
    "type" "EntryType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "entry_mode" "EntryMode" NOT NULL DEFAULT 'REGULAR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entry_adjustments" (
    "id" UUID NOT NULL,
    "time_entry_id" UUID NOT NULL,
    "adjustment_type" "AdjustmentType" NOT NULL,
    "previous_timestamp" TIMESTAMP(3),
    "new_timestamp" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "adjusted_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entry_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "timesheet_id" UUID,
    "description" TEXT NOT NULL,
    "incident_code" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "period" "Period" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "on_call_schedule" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_on_call_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "on_call_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_salary_configs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "base_salary" DECIMAL(10,2) NOT NULL,
    "monthly_hours" INTEGER NOT NULL DEFAULT 220,
    "valid_from" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_salary_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HolidayType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "reason" TEXT NOT NULL,
    "document_url" TEXT,
    "status" "AbsenceStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "time_sheets_user_id_date_key" ON "time_sheets"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "on_call_schedule_user_id_date_key" ON "on_call_schedule"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_sheets" ADD CONSTRAINT "time_sheets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "time_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry_adjustments" ADD CONSTRAINT "time_entry_adjustments_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry_adjustments" ADD CONSTRAINT "time_entry_adjustments_adjusted_by_id_fkey" FOREIGN KEY ("adjusted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "time_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "on_call_schedule" ADD CONSTRAINT "on_call_schedule_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_salary_configs" ADD CONSTRAINT "user_salary_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absences" ADD CONSTRAINT "absences_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
