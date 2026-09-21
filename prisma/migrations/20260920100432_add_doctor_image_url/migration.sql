-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "imageUrl" TEXT;

-- CreateIndex
CREATE INDEX "Doctor_departmentId_idx" ON "Doctor"("departmentId");
