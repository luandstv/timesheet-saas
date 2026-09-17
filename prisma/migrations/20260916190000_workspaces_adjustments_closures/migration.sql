BEGIN;

-- CreateEnum
CREATE TYPE "WorkspaceKind" AS ENUM ('PERSONAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MANAGER', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- DropIndex
DROP INDEX "time_sheets_user_id_date_key";

-- AlterTable
ALTER TABLE "time_sheets" ADD COLUMN     "workspace_id" UUID;

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "WorkspaceKind" NOT NULL,
    "personal_user_id" UUID,
    "join_code" TEXT NOT NULL,
    "allow_provisional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'COLLABORATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "manager_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'COLLABORATOR',
    "manager_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_join_requests" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjustment_requests" (
    "id" UUID NOT NULL,
    "time_sheet_id" UUID NOT NULL,
    "target_event_id" UUID,
    "type" "AdjustmentType" NOT NULL,
    "entry_type" "EntryType" NOT NULL,
    "previous_timestamp" TIMESTAMP(3),
    "new_timestamp" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "forgotten" BOOLEAN NOT NULL DEFAULT false,
    "provisional" BOOLEAN NOT NULL DEFAULT false,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" UUID NOT NULL,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMP(3),
    "sequence" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjustment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_closures" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT true,
    "snapshot" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_closures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_audit" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_audit_pkey" PRIMARY KEY ("id")
);

-- Backfill: every existing account keeps its history in its personal space.
INSERT INTO workspaces (id, name, kind, personal_user_id, join_code)
SELECT id, 'Meu espaço', 'PERSONAL', id, gen_random_uuid()::text FROM users;
INSERT INTO workspace_members (id, workspace_id, user_id, role)
SELECT gen_random_uuid(), id, id, 'OWNER' FROM users;
UPDATE time_sheets SET workspace_id = user_id;
ALTER TABLE time_sheets ALTER COLUMN workspace_id SET NOT NULL;

-- Scope the existing auxiliary records as well. They were personal before
-- workspaces existed, so their deterministic backfill is the user's personal
-- workspace; activities linked to a timesheet follow that sheet's workspace.
ALTER TABLE activities ADD COLUMN "workspace_id" UUID;
ALTER TABLE on_call_schedule ADD COLUMN "workspace_id" UUID;
ALTER TABLE absences ADD COLUMN "workspace_id" UUID;
UPDATE activities a SET workspace_id = COALESCE((SELECT workspace_id FROM time_sheets t WHERE t.id = a.timesheet_id), a.user_id);
UPDATE on_call_schedule SET workspace_id = user_id;
UPDATE absences SET workspace_id = user_id;
ALTER TABLE activities ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE on_call_schedule ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE absences ALTER COLUMN workspace_id SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_personal_user_id_key" ON "workspaces"("personal_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_join_code_key" ON "workspaces"("join_code");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_active_idx" ON "workspace_members"("user_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_hash_key" ON "workspace_invitations"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_join_requests_workspace_id_user_id_key" ON "workspace_join_requests"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "adjustment_requests_sequence_key" ON "adjustment_requests"("sequence");

-- CreateIndex
CREATE INDEX "adjustment_requests_time_sheet_id_status_idx" ON "adjustment_requests"("time_sheet_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_closures_workspace_id_user_id_month_key" ON "monthly_closures"("workspace_id", "user_id", "month");

-- CreateIndex
CREATE INDEX "workspace_audit_workspace_id_subject_id_created_at_idx" ON "workspace_audit"("workspace_id", "subject_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "time_sheets_user_id_workspace_id_date_key" ON "time_sheets"("user_id", "workspace_id", "date");

DROP INDEX "on_call_schedule_user_id_date_key";
CREATE UNIQUE INDEX "on_call_schedule_workspace_id_user_id_date_key" ON "on_call_schedule"("workspace_id", "user_id", "date");

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_join_requests" ADD CONSTRAINT "workspace_join_requests_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_requests" ADD CONSTRAINT "adjustment_requests_time_sheet_id_fkey" FOREIGN KEY ("time_sheet_id") REFERENCES "time_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_closures" ADD CONSTRAINT "monthly_closures_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_audit" ADD CONSTRAINT "workspace_audit_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_sheets" ADD CONSTRAINT "time_sheets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "on_call_schedule" ADD CONSTRAINT "on_call_schedule_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "absences" ADD CONSTRAINT "absences_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_member_scope_fkey" FOREIGN KEY ("workspace_id", "user_id") REFERENCES "workspace_members"("workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "on_call_schedule" ADD CONSTRAINT "on_call_member_scope_fkey" FOREIGN KEY ("workspace_id", "user_id") REFERENCES "workspace_members"("workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "absences" ADD CONSTRAINT "absence_member_scope_fkey" FOREIGN KEY ("workspace_id", "user_id") REFERENCES "workspace_members"("workspace_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defence in depth for the Supabase Data API. Access goes through authorized server services.
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_audit ENABLE ROW LEVEL SECURITY;

ALTER TABLE workspaces ADD CONSTRAINT personal_workspace_owner_fk FOREIGN KEY (personal_user_id) REFERENCES users(id);
ALTER TABLE workspaces ADD CONSTRAINT workspace_kind_check CHECK ((kind = 'PERSONAL' AND personal_user_id IS NOT NULL) OR (kind = 'COMPANY' AND personal_user_id IS NULL));
ALTER TABLE workspace_members ADD CONSTRAINT workspace_member_id_space UNIQUE (id, workspace_id);
ALTER TABLE workspace_members ADD CONSTRAINT workspace_manager_same_space FOREIGN KEY (manager_id, workspace_id) REFERENCES workspace_members(id, workspace_id);
ALTER TABLE workspace_members ADD CONSTRAINT workspace_member_not_self_managed CHECK (manager_id IS NULL OR manager_id <> id);
ALTER TABLE workspace_invitations ADD CONSTRAINT invite_manager_same_space FOREIGN KEY (manager_id, workspace_id) REFERENCES workspace_members(id, workspace_id);
ALTER TABLE workspace_invitations ADD CONSTRAINT invite_no_owner CHECK (role <> 'OWNER');
ALTER TABLE workspace_join_requests ADD CONSTRAINT join_user_fk FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE monthly_closures ADD CONSTRAINT closure_member_fk FOREIGN KEY (workspace_id,user_id) REFERENCES workspace_members(workspace_id,user_id);
ALTER TABLE time_sheets ADD CONSTRAINT timesheet_member_fk FOREIGN KEY (workspace_id,user_id) REFERENCES workspace_members(workspace_id,user_id);
ALTER TABLE adjustment_requests ADD CONSTRAINT adjustment_actor_fk FOREIGN KEY (requested_by_id) REFERENCES users(id);
ALTER TABLE adjustment_requests ADD CONSTRAINT adjustment_reviewer_fk FOREIGN KEY (decided_by_id) REFERENCES users(id);
ALTER TABLE workspace_audit ADD CONSTRAINT audit_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id);
ALTER TABLE workspace_audit ADD CONSTRAINT audit_subject_fk FOREIGN KEY (subject_id) REFERENCES users(id);
CREATE UNIQUE INDEX one_pending_request_per_movement ON adjustment_requests(target_event_id) WHERE status = 'PENDING' AND target_event_id IS NOT NULL;
ALTER TABLE adjustment_requests ADD CONSTRAINT adjustment_shape CHECK (
 (type = 'INSERTION' AND target_event_id IS NULL AND new_timestamp IS NOT NULL) OR
 (type = 'MODIFICATION' AND target_event_id IS NOT NULL AND previous_timestamp IS NOT NULL AND new_timestamp IS NOT NULL) OR
 (type = 'DELETION' AND target_event_id IS NOT NULL AND previous_timestamp IS NOT NULL AND new_timestamp IS NULL)
);
ALTER TABLE adjustment_requests ADD CONSTRAINT provisional_modification_only CHECK (NOT provisional OR (type = 'MODIFICATION' AND forgotten));

CREATE FUNCTION jornix_reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Historical records are immutable; use an adjustment request'; END;
$$;
CREATE TRIGGER immutable_time_entries BEFORE UPDATE OR DELETE ON time_entries FOR EACH ROW EXECUTE FUNCTION jornix_reject_history_mutation();
CREATE TRIGGER immutable_workspace_audit BEFORE UPDATE OR DELETE ON workspace_audit FOR EACH ROW EXECUTE FUNCTION jornix_reject_history_mutation();
CREATE TRIGGER immutable_legacy_adjustments BEFORE UPDATE OR DELETE ON time_entry_adjustments FOR EACH ROW EXECUTE FUNCTION jornix_reject_history_mutation();

CREATE FUNCTION jornix_guard_adjustment_decision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Requests must be cancelled, not deleted'; END IF;
  IF OLD.status <> 'PENDING' OR NEW.status = 'PENDING' OR NEW.decided_by_id IS NULL OR NEW.decided_at IS NULL
     OR (to_jsonb(NEW) - ARRAY['status','decided_by_id','decided_at']) IS DISTINCT FROM
        (to_jsonb(OLD) - ARRAY['status','decided_by_id','decided_at']) THEN
    RAISE EXCEPTION 'Only a pending request decision may change';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_adjustment_decision BEFORE UPDATE OR DELETE ON adjustment_requests FOR EACH ROW EXECUTE FUNCTION jornix_guard_adjustment_decision();
COMMIT;
