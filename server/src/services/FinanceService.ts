import { z } from "zod";

import type { FinanceEntry } from "../domain/entities/FinanceEntry";
import type { PaginatedResult } from "../domain/entities/Document";
import type { FinanceEntryRepository } from "../domain/repositories/FinanceEntryRepository";
import { AppError } from "../errors/AppError";
import type { AuthenticatedUser } from "./AuthService";
import { resolveCompanyId } from "./tenant";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  type: z.enum(["income", "expense"]).optional(),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

const createFinanceSchema = z.object({
  type: z.enum(["income", "expense"]),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
  category: z.string().trim().min(2, "Informe a categoria."),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  currency: z.string().trim().length(3, "Informe uma moeda valida.").default("BRL"),
  dueDate: z.coerce.date({ error: "Informe a data de vencimento." }),
  occurredAtUtc: z.coerce.date().optional(),
  paidDate: z.coerce.date().optional().nullable(),
  costCenter: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  attachmentFileName: z.string().trim().optional().nullable(),
  leadId: z.string().trim().optional().nullable(),
});

export class FinanceService {
  constructor(private readonly financeRepository: FinanceEntryRepository) {}

  async list(actor: AuthenticatedUser, query: unknown): Promise<PaginatedResult<FinanceEntry>> {
    const parsed = paginationSchema.parse(query);
    const filters: any = {
      companyId: resolveCompanyId(actor),
      page: parsed.page,
      pageSize: parsed.pageSize,
    };
    if (parsed.type) filters.type = parsed.type;
    if (parsed.status) filters.status = parsed.status;
    if (parsed.dateFrom) filters.dateFrom = parsed.dateFrom;
    if (parsed.dateTo) filters.dateTo = parsed.dateTo;

    return this.financeRepository.findMany(filters);
  }

  async create(actor: AuthenticatedUser, input: unknown): Promise<FinanceEntry> {
    const parsed = createFinanceSchema.parse(input);
    const data: any = {
      companyId: resolveCompanyId(actor),
      type: parsed.type,
      status: parsed.status,
      category: parsed.category,
      amount: parsed.amount.toFixed(2),
      currency: parsed.currency.toUpperCase(),
      dueDate: parsed.dueDate,
      paidDate: parsed.paidDate ?? null,
      costCenter: parsed.costCenter ?? null,
      notes: parsed.notes ?? null,
      attachmentFileName: parsed.attachmentFileName ?? null,
      leadId: parsed.leadId ?? null,
    };
    if (parsed.occurredAtUtc) data.occurredAtUtc = parsed.occurredAtUtc;

    return this.financeRepository.create(data);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const entry = await this.financeRepository.findById(resolveCompanyId(actor), id);
    if (!entry) throw new AppError("Lancamento financeiro nao encontrado.", 404);
    await this.financeRepository.delete(resolveCompanyId(actor), id);
  }
}
