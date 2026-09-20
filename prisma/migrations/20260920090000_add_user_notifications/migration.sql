-- Notifications are user-facing records; keep them separate from the immutable audit log.
CREATE TABLE "user_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_notifications_user_id_created_at_idx"
ON "user_notifications"("user_id", "created_at");

CREATE INDEX "user_notifications_user_id_read_at_created_at_idx"
ON "user_notifications"("user_id", "read_at", "created_at");

ALTER TABLE "user_notifications"
ADD CONSTRAINT "user_notifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_notifications"
ADD CONSTRAINT "user_notifications_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The application accesses this table through authorized server-side Prisma calls.
ALTER TABLE "user_notifications" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "user_notifications" FROM anon, authenticated;
