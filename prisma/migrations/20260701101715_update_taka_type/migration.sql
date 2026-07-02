/*
  Warnings:

  - You are about to alter the column `taka` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "taka" SET DATA TYPE DOUBLE PRECISION;
