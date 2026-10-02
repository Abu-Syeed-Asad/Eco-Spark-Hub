DROP INDEX "payments_postId_key";

CREATE UNIQUE INDEX "payments_userId_postId_key" ON "payments"("userId", "postId");