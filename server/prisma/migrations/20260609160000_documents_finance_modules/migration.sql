CREATE TYPE "DocumentType" AS ENUM ('File', 'Link');
CREATE TYPE "DocumentVisibility" AS ENUM ('private', 'public');
CREATE TYPE "FinanceEntryType" AS ENUM ('income', 'expense');
CREATE TYPE "FinanceEntryStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "DocumentType" NOT NULL,
    "url" TEXT,
    "storedFileName" TEXT,
    "originalFileName" TEXT,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "sector" TEXT,
    "category" TEXT,
    "tagsJson" JSONB,
    "isOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'private',
    "ownerId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "FinanceEntryType" NOT NULL,
    "status" "FinanceEntryStatus" NOT NULL DEFAULT 'PENDING',
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "notes" TEXT,
    "attachmentFileName" TEXT,
    "costCenter" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "occurredAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "documents_companyId_idx" ON "documents"("companyId");
CREATE INDEX "documents_companyId_visibility_idx" ON "documents"("companyId", "visibility");
CREATE INDEX "documents_companyId_sector_idx" ON "documents"("companyId", "sector");
CREATE INDEX "finance_entries_companyId_idx" ON "finance_entries"("companyId");
CREATE INDEX "finance_entries_companyId_type_idx" ON "finance_entries"("companyId", "type");
CREATE INDEX "finance_entries_companyId_status_idx" ON "finance_entries"("companyId", "status");
CREATE INDEX "finance_entries_companyId_dueDate_idx" ON "finance_entries"("companyId", "dueDate");

-- ForeignKey: link finance entries to leads
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
