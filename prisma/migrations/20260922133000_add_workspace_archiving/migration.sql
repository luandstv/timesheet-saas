BEGIN;

ALTER TABLE "workspaces"
  ADD COLUMN "archived_at" TIMESTAMP(3);

COMMIT;
