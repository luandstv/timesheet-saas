-- CreateTable
CREATE TABLE "test_connection" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_connection_pkey" PRIMARY KEY ("id")
);
