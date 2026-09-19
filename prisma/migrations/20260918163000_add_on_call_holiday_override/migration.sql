ALTER TABLE "on_call_schedule"
ADD COLUMN "holiday_override" BOOLEAN;

CREATE INDEX "on_call_schedule_workspace_id_date_idx"
ON "on_call_schedule"("workspace_id", "date");
