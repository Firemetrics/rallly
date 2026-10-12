-- CreateTable
CREATE TABLE "calendar_feeds" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMP(3),

    CONSTRAINT "calendar_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_feeds_user_id_key" ON "calendar_feeds"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_feeds_token_key" ON "calendar_feeds"("token");

-- AddForeignKey
ALTER TABLE "calendar_feeds" ADD CONSTRAINT "calendar_feeds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
