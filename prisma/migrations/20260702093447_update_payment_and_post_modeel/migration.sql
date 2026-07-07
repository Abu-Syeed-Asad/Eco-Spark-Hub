/*
  Warnings:

  - You are about to drop the column `paymentStatus` on the `Post` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "POST_TYPE" AS ENUM ('FREE', 'PAID', 'UNPAID');

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "paymentStatus",
ADD COLUMN     "postType" "POST_TYPE" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "userId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "PAYMENT_STATUS";

-- CreateIndex
CREATE UNIQUE INDEX "payments_userId_key" ON "payments"("userId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
