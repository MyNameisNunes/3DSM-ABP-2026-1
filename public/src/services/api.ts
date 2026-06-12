import type { LoginResponse } from "../types/auth";
import { buildDefaultPermissoes, type Collaborator } from "../components/Collaborators/types";
import type { UserRole } from "../types/auth";
import * as mockApi from "./mockApi";

type ApiCollaboratorRaw = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId?: string | null;
};

function mapCollaborator(raw: ApiCollaboratorRaw): Collaborator {
  return {
    id: raw.id,
    nome: raw.name,
    email: raw.email,
    telefone: "",
    role: raw.role,
    teamId: raw.teamId ?? null,
    teamName: null,
    ativo: true,
    lastLoginAt: null,
    permissoes: buildDefaultPermissoes(raw.role),
  };
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export interface ApiLead {
  id: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  subject: string | null;
  origin: string;
  importance: "frio" | "morno" | "quente";
  status: string;
  attendantId: string;
  attendantName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignableUser {
  id: string;
  nome: string;
  role: string;
}

/** Tipos de ação registrados na auditoria. */
export type AuditAction =
  | "lead_created"          // captação de lead
  | "lead_status_changed"   // mudança de status
  | "lead_assigned"         // delegação de lead
  | "collaborator_created"  // novo colaborador
  | "collaborator_updated"  // edição de colaborador
  | "collaborator_deleted"  // exclusão de colaborador
  | "role_changed"          // alteração de cargo
  | "permission_changed"    // alteração de permissão
  | "login";                // acesso ao sistema

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorRole: string;
  /** Alvo da ação (nome do lead, colaborador etc.). */
  target: string;
  /** Descrição legível do que aconteceu. */
  description: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const statusAliasesToApi: Record<string, string> = {
  novo: "novo",
  "nao atendido": "novo",
  "em atendimento": "em_atendimento",
  agendado: "agendado",
  "em negociacao": "em_negociacao",
  vendido: "convertido",
  convertido: "convertido",
  perdido: "perdido",
};

const statusAliasesToUi: Record<string, string> = {
  novo: "Novo",
  "em atendimento": "Em atendimento",
  agendado: "Agendado",
  "em negociacao": "Em negociação",
  convertido: "Vendido",
  vendido: "Vendido",
  perdido: "Perdido",
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function toApiStatus(value: string): string {
  const key = normalizeText(value);
  return statusAliasesToApi[key] ?? "novo";
}

function toUiStatus(value: string): string {
  const key = normalizeText(value);
  return statusAliasesToUi[key] ?? value;
}

function mapLeadFromApi(lead: ApiLead): ApiLead {
  return {
    ...lead,
    status: toUiStatus(lead.status),
  };
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/** Extrai a mensagem do payload de erro, incluindo os detalhes de validação (zod `issues`) quando houver. */
function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null) return fallback;
  const obj = payload as { message?: unknown; issues?: unknown };
  const base = "message" in obj && obj.message ? String(obj.message) : fallback;
  if (obj.issues && typeof obj.issues === "object") {
    const fields = Object.entries(obj.issues as Record<string, unknown>)
      .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(", ") : String(errs)}`)
      .filter(Boolean);
    if (fields.length > 0) return `${base} (${fields.join("; ")})`;
  }
  return base;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    const message = extractErrorMessage(payload, "Nao foi possivel concluir a requisicao.");

    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** Upload multipart/form-data — não força Content-Type para o browser anexar o boundary. */
async function uploadRequest<T>(path: string, token: string, body: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    const message = extractErrorMessage(payload, "Nao foi possivel concluir o upload.");
    throw new ApiError(message, response.status, payload);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function login(email: string, senha: string) {
  if (USE_MOCK) return mockApi.login(email, senha);
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });
}

export function register(nome: string, email: string, senha: string) {
  if (USE_MOCK) return mockApi.register(nome, email, senha);
  return request<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ nome, email, senha }),
  });
}

export function getCurrentUser(token: string) {
  if (USE_MOCK) return mockApi.getCurrentUser(token);
  return request<{ user: LoginResponse["user"] }>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function listCollaborators(token: string): Promise<{ collaborators: Collaborator[] }> {
  if (USE_MOCK) return mockApi.listCollaborators(token);
  const raw = await request<{ collaborators: ApiCollaboratorRaw[] }>("/collaborators", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return { collaborators: raw.collaborators.map(mapCollaborator) };
}

export async function createCollaborator(
  token: string,
  input: { nome: string; email: string; telefone: string; role: UserRole; senha: string; teamId?: string | null },
): Promise<{ collaborator: Collaborator }> {
  if (USE_MOCK) return mockApi.createCollaborator(token, input);
  const raw = await request<{ collaborator: ApiCollaboratorRaw }>("/collaborators", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: input.nome,
      email: input.email,
      password: input.senha,
      role: input.role,
      teamId: input.teamId,
    }),
  });
  return { collaborator: mapCollaborator(raw.collaborator) };
}

export async function updateCollaborator(
  token: string,
  id: string,
  input: Partial<Pick<Collaborator, "nome" | "telefone" | "role" | "ativo" | "permissoes" | "teamId" | "teamName">>,
): Promise<{ collaborator: Collaborator }> {
  if (USE_MOCK) return mockApi.updateCollaborator(token, id, input);
  const raw = await request<{ collaborator: ApiCollaboratorRaw }>(`/collaborators/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      ...(input.nome !== undefined && { name: input.nome }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.teamId !== undefined && { teamId: input.teamId }),
    }),
  });
  return { collaborator: mapCollaborator(raw.collaborator) };
}

export function deleteCollaborator(token: string, id: string) {
  if (USE_MOCK) return mockApi.deleteCollaborator(token, id);
  return request<{ success: boolean }>(`/collaborators/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function listLeads(token: string) {
  if (USE_MOCK) return mockApi.listLeads(token);
  return request<{ leads: ApiLead[] }>("/leads", {
    headers: { Authorization: `Bearer ${token}` },
  }).then(({ leads }) => ({ leads: leads.map(mapLeadFromApi) }));
}

export function createLead(
  token: string,
  input: {
    clientName: string;
    clientPhone?: string | null;
    clientEmail?: string | null;
    subject?: string | null;
    origin: string;
    importance: "frio" | "morno" | "quente";
    status: string;
  },
) {
  if (USE_MOCK) return mockApi.createLead(token, input);
  const payload = {
    ...input,
    status: toApiStatus(input.status),
  };
  return request<{ lead: ApiLead }>("/leads", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }).then(({ lead }) => ({ lead: mapLeadFromApi(lead) }));
}

export function updateLeadStatus(token: string, leadId: string, status: string) {
  if (USE_MOCK) return mockApi.updateLeadStatus(token, leadId, status);
  return request<{ lead: ApiLead }>(`/leads/${leadId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: toApiStatus(status) }),
  }).then(({ lead }) => ({ lead: mapLeadFromApi(lead) }));
}

export function updateLead(
  token: string,
  leadId: string,
  input: Partial<Pick<ApiLead, "clientName" | "clientPhone" | "clientEmail" | "subject" | "origin" | "importance" | "status">>,
) {
  if (USE_MOCK) return mockApi.updateLead(token, leadId, input);
  const payload = { ...input } as typeof input;
  if (payload.status !== undefined) {
    payload.status = toApiStatus(payload.status);
  }
  return request<{ lead: ApiLead }>(`/leads/${leadId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }).then(({ lead }) => ({ lead: mapLeadFromApi(lead) }));
}

export function assignLead(token: string, leadId: string, attendantId: string) {
  if (USE_MOCK) return mockApi.assignLead(token, leadId, attendantId);
  return request<{ lead: ApiLead }>(`/leads/${leadId}/assign`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ attendantId }),
  }).then(({ lead }) => ({ lead: mapLeadFromApi(lead) }));
}

export function listAssignable(token: string) {
  if (USE_MOCK) return mockApi.listAssignable(token);
  return request<{ users: AssignableUser[] }>("/leads/assignable", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Arquivamento de leads ─────────────────────────────────────────────────────
// Espelha as rotas POST /leads/archive, GET /leads/archived e PATCH /leads/:id/unarchive.

export function archiveLeads(token: string) {
  if (USE_MOCK) return mockApi.archiveLeads(token);
  return request<{ message: string }>("/leads/archive", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function listArchivedLeads(token: string) {
  if (USE_MOCK) return mockApi.listArchivedLeads(token);
  return request<{ leads: ApiLead[] }>("/leads/archived", {
    headers: { Authorization: `Bearer ${token}` },
  }).then(({ leads }) => ({ leads: leads.map(mapLeadFromApi) }));
}

export function unarchiveLead(token: string, leadId: string) {
  if (USE_MOCK) return mockApi.unarchiveLead(token, leadId);
  return request<{ lead: ApiLead }>(`/leads/${leadId}/unarchive`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  }).then(({ lead }) => ({ lead: mapLeadFromApi(lead) }));
}

// ── Logs de auditoria ─────────────────────────────────────────────────────────
// O backend real (GET /audit) devolve registros do Prisma com um shape diferente
// do AuditLogEntry usado na UI; este adaptador converte para o formato esperado.

type ApiAuditRaw = {
  id: string;
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  changes: unknown;
  createdAt: string;
  user?: { name?: string; role?: { name?: string } | string | null } | null;
};

const auditActionMap: Record<string, AuditAction> = {
  create: "lead_created",
  update: "lead_status_changed",
  update_status: "lead_status_changed",
  assign: "lead_assigned",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getCollaboratorFromAuditChanges(changes: unknown): Partial<ApiCollaboratorRaw> | null {
  if (!isRecord(changes)) return null;
  const collaborator = changes.collaborator;
  return isRecord(collaborator) ? collaborator : null;
}

function mapAuditAction(raw: ApiAuditRaw): AuditAction {
  if (raw.entityType === "collaborator") {
    if (raw.action === "create") return "collaborator_created";
    if (raw.action === "update") return "collaborator_updated";
    if (raw.action === "delete") return "collaborator_deleted";
  }

  return auditActionMap[raw.action] ?? (raw.action as AuditAction);
}

function buildAuditTarget(raw: ApiAuditRaw): string {
  const collaborator = getCollaboratorFromAuditChanges(raw.changes);
  if (collaborator?.name) return String(collaborator.name);
  if (collaborator?.email) return String(collaborator.email);
  return raw.entityId;
}

function buildAuditDescription(raw: ApiAuditRaw, action: AuditAction): string {
  const target = buildAuditTarget(raw);

  if (raw.entityType === "collaborator") {
    if (action === "collaborator_created") return `Criou o colaborador ${target}.`;
    if (action === "collaborator_updated") return `Alterou os dados do colaborador ${target}.`;
    if (action === "collaborator_deleted") return `Excluiu o colaborador ${target}.`;
  }

  return `${raw.action} em ${raw.entityType} ${raw.entityId}`;
}

function mapAuditFromApi(raw: ApiAuditRaw): AuditLogEntry {
  const roleName =
    typeof raw.user?.role === "string" ? raw.user?.role : raw.user?.role?.name ?? "—";
  const action = mapAuditAction(raw);
  return {
    id: raw.id,
    action,
    actorId: raw.userId ?? "system",
    actorName: raw.user?.name ?? "Sistema",
    actorRole: roleName,
    target: buildAuditTarget(raw),
    description: buildAuditDescription(raw, action),
    createdAt: raw.createdAt,
  };
}

export function listAuditLogs(token: string): Promise<{ logs: AuditLogEntry[] }> {
  if (USE_MOCK) return mockApi.listAuditLogs(token);
  return request<{ logs: ApiAuditRaw[] }>("/audit", {
    headers: { Authorization: `Bearer ${token}` },
  }).then(({ logs }) => ({ logs: logs.map(mapAuditFromApi) }));
}

// ── Documentos ────────────────────────────────────────────────────────────────

export interface ApiDocument {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  type: "File" | "Link";
  url: string | null;
  storedFileName: string | null;
  originalFileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  sector: string | null;
  tags: string[];
  isOnboarding: boolean;
  visibility: "private" | "public";
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface ApiPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreateDocumentLinkInput {
  title: string;
  description?: string;
  url: string;
  sector?: string;
  tags?: string[];
  visibility?: "private" | "public";
}

export function listDocuments(
  token: string,
  params?: { search?: string; sector?: string; page?: number; pageSize?: number },
): Promise<{ documents: ApiDocument[]; pagination: ApiPagination }> {
  if (USE_MOCK) return mockApi.listDocuments(token, params);
  const qs = new URLSearchParams();
  if (params?.search)   qs.set("search",   params.search);
  if (params?.sector)   qs.set("sector",   params.sector);
  if (params?.page)     qs.set("page",     String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return request<{ documents: ApiDocument[]; pagination: ApiPagination }>(
    `/documentos?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export function createDocumentLink(token: string, input: CreateDocumentLinkInput): Promise<{ document: ApiDocument }> {
  if (USE_MOCK) return mockApi.createDocumentLink(token, input);
  return request<{ document: ApiDocument }>("/documentos/links", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export interface CreateDocumentFileInput {
  title: string;
  description?: string;
  sector?: string;
  tags?: string[];
  visibility?: "private" | "public";
}

export function createDocumentFile(
  token: string,
  input: CreateDocumentFileInput,
  file: File,
): Promise<{ document: ApiDocument }> {
  if (USE_MOCK) return mockApi.createDocumentFile(token, input, file);
  const form = new FormData();
  form.append("file", file);
  form.append("title", input.title);
  if (input.description) form.append("description", input.description);
  if (input.sector)      form.append("sector", input.sector);
  if (input.tags)        form.append("tags", JSON.stringify(input.tags));
  if (input.visibility)  form.append("visibility", input.visibility);
  return uploadRequest<{ document: ApiDocument }>("/documentos/arquivos", token, form);
}

export function deleteDocument(token: string, id: string): Promise<void> {
  if (USE_MOCK) return mockApi.deleteDocument(token, id);
  return request<void>(`/documentos/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Financeiro ────────────────────────────────────────────────────────────────

export interface ApiFinanceEntry {
  id: string;
  companyId: string;
  type: "income" | "expense";
  status: "pending" | "paid" | "overdue" | "cancelled";
  category: string;
  amount: string;
  currency: string;
  dueDate: string;
  occurredAtUtc: string;
  paidDate: string | null;
  costCenter: string | null;
  notes: string | null;
  leadId: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreateFinanceEntryInput {
  type: "income" | "expense";
  category: string;
  amount: number;
  dueDate: string;
  currency?: string;
  notes?: string;
  status?: "pending" | "paid" | "overdue" | "cancelled";
}

export function listFinanceEntries(
  token: string,
  params?: { page?: number; pageSize?: number; type?: "income" | "expense"; status?: string },
): Promise<{ entries: ApiFinanceEntry[]; pagination: ApiPagination }> {
  if (USE_MOCK) return mockApi.listFinanceEntries(token, params);
  const qs = new URLSearchParams();
  if (params?.page)     qs.set("page",     String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.type)     qs.set("type",     params.type);
  if (params?.status)   qs.set("status",   params.status);
  return request<{ entries: ApiFinanceEntry[]; pagination: ApiPagination }>(`/finance?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createFinanceEntry(token: string, input: CreateFinanceEntryInput): Promise<{ entry: ApiFinanceEntry }> {
  if (USE_MOCK) return mockApi.createFinanceEntry(token, input);
  return request<{ entry: ApiFinanceEntry }>("/finance", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export function deleteFinanceEntry(token: string, id: string): Promise<void> {
  if (USE_MOCK) return mockApi.deleteFinanceEntry(token, id);
  return request<void>(`/finance/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Agenda ────────────────────────────────────────────────────────────────────

export interface ApiAgendaEvent {
  id: string;
  companyId: string;
  title: string;
  type: "test_drive" | "visit" | "meeting" | "call" | "follow_up" | "delivery";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  scheduledAt: string;
  clientName: string;
  vehicleName: string | null;
  assignedTo: string | null;
  notes: string | null;
  leadId: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreateAgendaEventInput {
  title: string;
  type: "test_drive" | "visit" | "meeting" | "call" | "follow_up" | "delivery";
  scheduledAt: string;
  clientName: string;
  vehicleName?: string;
  assignedTo?: string;
  notes?: string;
  leadId?: string;
}

export function listAgendaEvents(
  token: string,
  params?: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; status?: string; type?: string },
): Promise<{ events: ApiAgendaEvent[]; pagination: ApiPagination }> {
  if (USE_MOCK) return mockApi.listAgendaEvents(token, params);
  const qs = new URLSearchParams();
  if (params?.page)     qs.set("page",     String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params?.dateTo)   qs.set("dateTo",   params.dateTo);
  if (params?.status)   qs.set("status",   params.status);
  if (params?.type)     qs.set("type",     params.type);
  return request<{ events: ApiAgendaEvent[]; pagination: ApiPagination }>(`/agenda?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createAgendaEvent(token: string, input: CreateAgendaEventInput): Promise<{ event: ApiAgendaEvent }> {
  if (USE_MOCK) return mockApi.createAgendaEvent(token, input);
  return request<{ event: ApiAgendaEvent }>("/agenda", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export function updateAgendaEventStatus(
  token: string,
  id: string,
  status: ApiAgendaEvent["status"],
): Promise<{ event: ApiAgendaEvent }> {
  if (USE_MOCK) return mockApi.updateAgendaEventStatus(token, id, status);
  return request<{ event: ApiAgendaEvent }>(`/agenda/${id}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
}

export function deleteAgendaEvent(token: string, id: string): Promise<void> {
  if (USE_MOCK) return mockApi.deleteAgendaEvent(token, id);
  return request<void>(`/agenda/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
