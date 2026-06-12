-- CreateEnum
CREATE TYPE "AgendaEventType" AS ENUM ('test_drive', 'visit', 'meeting', 'call', 'follow_up', 'delivery');

-- CreateEnum
CREATE TYPE "AgendaEventStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateTable
CREATE TABLE "agenda_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AgendaEventType" NOT NULL,
    "status" "AgendaEventStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "clientName" TEXT NOT NULL,
    "vehicleName" TEXT,
    "assignedTo" TEXT,
    "notes" TEXT,
    "leadId" TEXT,
    "createdAtUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtUtc" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "agenda_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_events_companyId_idx" ON "agenda_events"("companyId");

-- CreateIndex
CREATE INDEX "agenda_events_companyId_scheduledAt_idx" ON "agenda_events"("companyId", "scheduledAt");

-- CreateIndex
CREATE INDEX "agenda_events_companyId_status_idx" ON "agenda_events"("companyId", "status");

-- AddForeignKey
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
