-- CreateEnum
CREATE TYPE "STRIPE_PAYMENT_STATUS" AS ENUM ('PAID', 'UNPAID');

-- AlterEnum
ALTER TYPE "PAYMENT_STATUS" ADD VALUE 'UNPAID';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "taka" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionId" UUID NOT NULL,
    "stripeEventId" TEXT,
    "status" "STRIPE_PAYMENT_STATUS" NOT NULL DEFAULT 'UNPAID',
    "invoiceUrl" TEXT,
    "paymentGatewayData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_transactionId_key" ON "payments"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeEventId_key" ON "payments"("stripeEventId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_postId_key" ON "payments"("postId");

-- CreateIndex
CREATE INDEX "payments_postId_idx" ON "payments"("postId");

-- CreateIndex
CREATE INDEX "payments_transactionId_idx" ON "payments"("transactionId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
