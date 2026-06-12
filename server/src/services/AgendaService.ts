import { z } from "zod";

import type { AgendaEvent } from "../domain/entities/AgendaEvent";
import type { PaginatedResult } from "../domain/entities/Document";
import type { AgendaEventRepository } from "../domain/repositories/AgendaEventRepository";
import { AppError } from "../errors/AppError";
import type { AuthenticatedUser } from "./AuthService";
import { resolveCompanyId } from "./tenant";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
  type: z.enum(["test_drive", "visit", "meeting", "call", "follow_up", "delivery"]).optional(),
});

const createEventSchema = z.object({
  title: z.string().trim().min(2, "Informe o título do evento."),
  type: z.enum(["test_drive", "visit", "meeting", "call", "follow_up", "delivery"]),
  scheduledAt: z.coerce.date({ error: "Informe a data e hora do evento." }),
  clientName: z.string().trim().min(1, "Informe o nome do cliente."),
  vehicleName: z.string().trim().optional().nullable(),
  assignedTo: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  leadId: z.string().trim().optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});

export class AgendaService {
  constructor(private readonly repo: AgendaEventRepository) {}

  async list(actor: AuthenticatedUser, query: unknown): Promise<PaginatedResult<AgendaEvent>> {
    const parsed = paginationSchema.parse(query);
    const filters: any = {
      companyId: resolveCompanyId(actor),
      page: parsed.page,
      pageSize: parsed.pageSize,
    };
    if (parsed.dateFrom) filters.dateFrom = parsed.dateFrom;
    if (parsed.dateTo) filters.dateTo = parsed.dateTo;
    if (parsed.status) filters.status = parsed.status;
    if (parsed.type) filters.type = parsed.type;

    return this.repo.findMany(filters);
  }

  async create(actor: AuthenticatedUser, input: unknown): Promise<AgendaEvent> {
    const parsed = createEventSchema.parse(input);
    return this.repo.create({
      companyId: resolveCompanyId(actor),
      title: parsed.title,
      type: parsed.type,
      scheduledAt: parsed.scheduledAt,
      clientName: parsed.clientName,
      vehicleName: parsed.vehicleName ?? null,
      assignedTo: parsed.assignedTo ?? null,
      notes: parsed.notes ?? null,
      leadId: parsed.leadId ?? null,
    });
  }

  async updateStatus(actor: AuthenticatedUser, id: string, input: unknown): Promise<AgendaEvent> {
    const event = await this.repo.findById(resolveCompanyId(actor), id);
    if (!event) throw new AppError("Evento não encontrado.", 404);
    const parsed = updateStatusSchema.parse(input);
    return this.repo.updateStatus(resolveCompanyId(actor), id, { status: parsed.status });
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const event = await this.repo.findById(resolveCompanyId(actor), id);
    if (!event) throw new AppError("Evento não encontrado.", 404);
    await this.repo.delete(resolveCompanyId(actor), id);
  }
}
