/*
  Warnings:

  - The primary key for the `card` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[rfidTag]` on the table `card` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `card` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "card" DROP CONSTRAINT "card_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "card_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "card_rfidTag_key" ON "card"("rfidTag");
