ALTER TABLE "activities" ALTER COLUMN "period" DROP NOT NULL;

CREATE INDEX "activities_workspace_id_user_id_start_time_idx"
ON "activities"("workspace_id", "user_id", "start_time");
