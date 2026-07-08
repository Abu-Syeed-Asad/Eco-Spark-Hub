-- DropForeignKey
ALTER TABLE "FinanceLog" DROP CONSTRAINT "FinanceLog_paymentId_fkey";

-- AlterTable
ALTER TABLE "FinanceLog" ALTER COLUMN "paymentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "FinanceLog" ADD CONSTRAINT "FinanceLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
