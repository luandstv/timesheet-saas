BEGIN;

CREATE TYPE "HoursBudgetStatus" AS ENUM ('OPEN', 'CLOSED');

ALTER TABLE "workspaces"
  ADD COLUMN "hours_control_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "adjustments_require_approval" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hours_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "hours_alerts_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "workspace_hours_budgets" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "month" DATE NOT NULL,
  "contracted_minutes" INTEGER NOT NULL,
  "status" "HoursBudgetStatus" NOT NULL DEFAULT 'OPEN',
  "closed_at" TIMESTAMP(3),
  "closed_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspace_hours_budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_hours_allocations" (
  "id" UUID NOT NULL,
  "budget_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "allocated_minutes" INTEGER NOT NULL,
  "is_manual" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspace_hours_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_allocation_rules" (
  "id" UUID NOT NULL,
  "budget_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "weekdays" INTEGER[] NOT NULL,
  "daily_minutes" INTEGER NOT NULL,
  "shift_label" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspace_allocation_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_hours_budgets_workspace_id_month_key"
  ON "workspace_hours_budgets"("workspace_id", "month");
CREATE INDEX "workspace_hours_budgets_workspace_id_status_month_idx"
  ON "workspace_hours_budgets"("workspace_id", "status", "month");
CREATE UNIQUE INDEX "workspace_hours_allocations_budget_id_member_id_key"
  ON "workspace_hours_allocations"("budget_id", "member_id");
CREATE INDEX "workspace_hours_allocations_member_id_budget_id_idx"
  ON "workspace_hours_allocations"("member_id", "budget_id");
CREATE INDEX "workspace_allocation_rules_budget_id_member_id_active_start_date_end_date_idx"
  ON "workspace_allocation_rules"("budget_id", "member_id", "active", "start_date", "end_date");

ALTER TABLE "workspace_hours_budgets"
  ADD CONSTRAINT "workspace_hours_budgets_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_hours_allocations"
  ADD CONSTRAINT "workspace_hours_allocations_budget_id_fkey"
  FOREIGN KEY ("budget_id") REFERENCES "workspace_hours_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "workspace_hours_allocations_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_allocation_rules"
  ADD CONSTRAINT "workspace_allocation_rules_budget_id_fkey"
  FOREIGN KEY ("budget_id") REFERENCES "workspace_hours_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "workspace_allocation_rules_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "workspace_allocation_rules_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_hours_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_hours_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_allocation_rules" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "workspace_hours_budgets" FROM anon, authenticated;
REVOKE ALL ON TABLE "workspace_hours_allocations" FROM anon, authenticated;
REVOKE ALL ON TABLE "workspace_allocation_rules" FROM anon, authenticated;

COMMIT;
