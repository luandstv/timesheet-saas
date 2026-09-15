ALTER TABLE "time_entries" ADD COLUMN "request_id" TEXT;

CREATE UNIQUE INDEX "time_entries_request_id_key" ON "time_entries"("request_id");
