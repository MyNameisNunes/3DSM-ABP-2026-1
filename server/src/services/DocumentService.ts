import fs from "fs/promises";
import path from "path";
import { z } from "zod";

import type { DocumentListFilters, DocumentMaterial, DocumentVisibility, PaginatedResult } from "../domain/entities/Document";
import type { DocumentRepository } from "../domain/repositories/DocumentRepository";
import { AppError } from "../errors/AppError";
import type { AuthenticatedUser } from "./AuthService";
import { resolveCompanyId } from "./tenant";

const visibilitySchema = z.enum(["private", "public"]);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  visibility: visibilitySchema.optional(),
});

const baseDocumentSchema = z.object({
  title: z.string().trim().min(2, "Informe o titulo do material."),
  description: z.string().trim().optional().nullable(),
  sector: z.string().trim().optional().nullable(),
  tags: z.preprocess((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(",");
      }
    }
    return [];
  }, z.array(z.string().trim().min(1)).default([])),
  isOnboarding: z.coerce.boolean().default(false),
  visibility: visibilitySchema.default("private"),
});

const linkSchema = baseDocumentSchema.extend({
  url: z.string().trim().url("Informe uma URL valida."),
});

export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly uploadsDir: string,
  ) {}

  async list(actor: AuthenticatedUser, query: unknown): Promise<PaginatedResult<DocumentMaterial>> {
    const parsed = paginationSchema.parse(query);
    const filters: DocumentListFilters = {
      companyId: resolveCompanyId(actor),
      page: parsed.page,
      pageSize: parsed.pageSize,
    };

    if (parsed.search) filters.search = parsed.search;
    if (parsed.sector) filters.sector = parsed.sector;
    if (parsed.tag) filters.tag = parsed.tag;
    if (parsed.visibility) filters.visibility = parsed.visibility;

    return this.documentRepository.findMany(filters);
  }

  async get(actor: AuthenticatedUser, id: string): Promise<DocumentMaterial> {
    const document = await this.documentRepository.findById(resolveCompanyId(actor), id);
    if (!document) throw new AppError("Material nao encontrado.", 404);
    return document;
  }

  async createLink(actor: AuthenticatedUser, input: unknown): Promise<DocumentMaterial> {
    const parsed = linkSchema.parse(input);
    return this.documentRepository.create({
      companyId: resolveCompanyId(actor),
      title: parsed.title,
      description: parsed.description ?? null,
      type: "Link",
      url: parsed.url,
      sector: parsed.sector ?? null,
      tags: parsed.tags,
      isOnboarding: parsed.isOnboarding,
      visibility: parsed.visibility,
    });
  }

  async createFile(actor: AuthenticatedUser, input: unknown, file?: Express.Multer.File): Promise<DocumentMaterial> {
    if (!file) throw new AppError("Envie um arquivo para cadastrar o material.", 400);
    if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) throw new AppError("O arquivo excede o limite de 10 MB.", 400);

    const parsed = baseDocumentSchema.parse(input);
    return this.documentRepository.create({
      companyId: resolveCompanyId(actor),
      title: parsed.title,
      description: parsed.description ?? null,
      type: "File",
      storedFileName: file.filename,
      originalFileName: file.originalname,
      contentType: file.mimetype,
      sizeBytes: file.size,
      sector: parsed.sector ?? null,
      tags: parsed.tags,
      isOnboarding: parsed.isOnboarding,
      visibility: parsed.visibility,
    });
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const document = await this.get(actor, id);
    await this.documentRepository.delete(resolveCompanyId(actor), id);

    if (document.storedFileName) {
      await fs.unlink(path.join(this.uploadsDir, document.storedFileName)).catch(() => undefined);
    }
  }

  getFilePath(document: DocumentMaterial): string {
    if (document.type !== "File" || !document.storedFileName) {
      throw new AppError("Este material nao possui arquivo para download.", 400);
    }

    return path.join(this.uploadsDir, document.storedFileName);
  }
}
