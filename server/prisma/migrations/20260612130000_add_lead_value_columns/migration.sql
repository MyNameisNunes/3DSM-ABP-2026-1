-- AlterTable: add commercial value tracking columns to leads
ALTER TABLE "leads" ADD COLUMN     "estimatedValue" DECIMAL(12,2),
ADD COLUMN     "potentialRevenue" DECIMAL(12,2),
ADD COLUMN     "winProbability" INTEGER;
