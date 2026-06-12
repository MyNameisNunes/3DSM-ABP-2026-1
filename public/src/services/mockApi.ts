/**
 * localStorage-backed mock of api.ts — toggle with VITE_USE_MOCK=true.
 * All function signatures match api.ts exactly so callers need no changes.
 */
import type { LoginResponse, AuthUser } from "../types/auth";
import type {
  ApiLead,
  AssignableUser,
  AuditLogEntry,
  ApiDocument,
  ApiFinanceEntry,
  ApiAgendaEvent,
  ApiPagination,
  CreateDocumentLinkInput,
  CreateDocumentFileInput,
  CreateFinanceEntryInput,
  CreateAgendaEventInput,
} from "./api";
import type { Collaborator } from "../components/Collaborators/types";
import { buildDefaultPermissoes, canDeleteCollaborator, TEAMS as TEAM_DEFS } from "../components/Collaborators/types";
import csvRaw from "../data/leads.csv?raw";

// ── Teams ────────────────────────────────────────────────────────────────────

const TEAMS: Record<string, { id: string; name: string }> = {
  PA:             { id: "team-pa",             name: "Equipe PA" },
  CACAPAVA:       { id: "team-cacapava",        name: "Equipe Caçapava" },
  SJC_CASSIOPEIA: { id: "team-sjc-cassiopeia",  name: "SJC - Cassiopeia" },
  SJC_BASE:       { id: "team-sjc-base",        name: "SJC - Base" },
};

// ── Static user catalogue ────────────────────────────────────────────────────

interface MockUser extends AuthUser {
  senha: string;
}

const MOCK_USERS: MockUser[] = [
  { id: "user-admin",       nome: "Admin",              email: "admin@empresa.com.br",          senha: "admin123",   role: "ADMIN",         teamId: null },
  { id: "user-gg",          nome: "Gerente Geral",      email: "gg@empresa.com.br",             senha: "gg123",      role: "GERENTE_GERAL", teamId: null },
  // Gerentes
  { id: "gerente-pa",       nome: "Gerente PA",         email: "gerente.pa@empresa.com.br",     senha: "gerente123", role: "GERENTE",       teamId: TEAMS.PA.id },
  { id: "gerente-cacapava", nome: "Gerente Caçapava",   email: "gerente.cacapava@empresa.com.br", senha: "gerente123", role: "GERENTE",    teamId: TEAMS.CACAPAVA.id },
  { id: "gerente-sjc-cassiopeia", nome: "Gerente SJC Cassiopeia", email: "gerente.sjc.cassiopeia@empresa.com.br", senha: "gerente123", role: "GERENTE", teamId: TEAMS.SJC_CASSIOPEIA.id },
  { id: "gerente-sjc-base",      nome: "Gerente SJC Base",       email: "gerente.sjc.base@empresa.com.br",      senha: "gerente123", role: "GERENTE", teamId: TEAMS.SJC_BASE.id },
  // Equipe PA (6 atendentes)
  { id: "consultor-01",  nome: "Consultor 01",  email: "consultor1@empresa.com.br",  senha: "consul123", role: "ATENDENTE", teamId: TEAMS.PA.id },
  { id: "consultor-02",  nome: "Consultor 02",  email: "consultor2@empresa.com.br",  senha: "consul123", role: "ATENDENTE", teamId: TEAMS.PA.id },
  { id: "consultor-04",  nome: "Consultor 04",  email: "consultor4@empresa.com.br",  senha: "consul123", role: "ATENDENTE", teamId: TEAMS.PA.id },
  { id: "consultor-10",  nome: "Consultor 10",  email: "consultor10@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.PA.id },
  { id: "consultor-17",  nome: "Consultor 17",  email: "consultor17@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.PA.id },
  { id: "consultor-18",  nome: "Consultor 18",  email: "consultor18@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.PA.id },
  // Equipe Caçapava (10 atendentes)
  { id: "consultor-03",  nome: "Consultor 03",  email: "consultor3@empresa.com.br",  senha: "consul123", role: "ATENDENTE", teamId: TEAMS.CACAPAVA.id },
  { id: "consultor-06",  nome: "Consultor 06",  email: "consultor6@empresa.com.br",  senha: "consul123", role: "ATENDENTE", teamId: TEAMS.CACAPAVA.id },
  { id: "consultor-07",  nome: "Consultor 07",  email: "consultor7@empresa.com.br",  senha: "consul123", role: "ATENDENTE", teamId: TEAMS.CACAPAVA.id },
  { id: "consultor-08",  nome: "Consultor 08",  email: "consultor8@empresa.com.br",  senha: "consul123", role: "ATENDENTE", teamId: TEAMS.CACAPAVA.id },
  { id: "consultor-09",  nome: "Consultor 09",  email: "consultor9@empresa.com.br",  senha: "consul123", role: "ATENDENTE", teamId: TEAMS.CACAPAVA.id },
  { id: "consultor-12",  nome: "Consultor 12",  email: "consultor12@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.CACAPAVA.id },
  { id: "consultor-13",  nome: "Consultor 13",  email: "consultor13@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.CACAPAVA.id },
  { id: "consultor-15",  nome: "Consultor 15",  email: "consultor15@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.CACAPAVA.id },
  { id: "consultor-19",  nome: "Consultor 19",  email: "consultor19@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.CACAPAVA.id },
  { id: "consultor-20",  nome: "Consultor 20",  email: "consultor20@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.CACAPAVA.id },
  // SJC - Cassiopeia (2 atendentes)
  { id: "consultor-05",  nome: "Consultor 05",  email: "consultor5@empresa.com.br",  senha: "consul123", role: "ATENDENTE", teamId: TEAMS.SJC_CASSIOPEIA.id },
  { id: "consultor-11",  nome: "Consultor 11",  email: "consultor11@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.SJC_CASSIOPEIA.id },
  // SJC - Base (2 atendentes)
  { id: "consultor-14",  nome: "Consultor 14",  email: "consultor14@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.SJC_BASE.id },
  { id: "consultor-16",  nome: "Consultor 16",  email: "consultor16@empresa.com.br", senha: "consul123", role: "ATENDENTE", teamId: TEAMS.SJC_BASE.id },
];

// ── CSV → ApiLead conversion ──────────────────────────────────────────────────

function csvEmailToAttendantId(email: string): string {
  const u = MOCK_USERS.find((m) => m.email === email);
  return u?.id ?? `unknown-${email}`;
}

function csvEmailToAttendantName(email: string): string {
  const u = MOCK_USERS.find((m) => m.email === email);
  return u?.nome ?? email;
}

function mapCsvStatus(csvStatus: string, csvStage: string): string {
  switch (csvStatus) {
    case "Em negociação":
      return csvStage === "Aguardando pagamento" ? "Agendado" : "Em negociação";
    case "Finalizado com venda":
      return "Vendido";
    case "Finalizado sem venda":
      return "Perdido";
    case "Aberto":
    default:
      return csvStage === "Contato inicial" ? "Em atendimento" : "Novo";
  }
}

function parseCsv(raw: string): ApiLead[] {
  const lines = raw.trim().split("\n");
  const header = lines[0].split(",");

  const col = (row: string[], name: string) => {
    const idx = header.indexOf(name);
    return idx >= 0 ? (row[idx] ?? "").trim() : "";
  };

  return lines.slice(1).map((line, i) => {
    // Handle commas inside quoted fields (simple split is enough here — no quoted commas in this CSV)
    const row = line.split(",");
    const csvStatus = col(row, "negotiation_status");
    const csvStage  = col(row, "negotiation_stage");
    const userEmail = col(row, "user_email");

    return {
      id:            `lead-${col(row, "lead_id") || String(i + 1)}`,
      clientName:    col(row, "customer_name"),
      clientPhone:   col(row, "customer_phone") || null,
      clientEmail:   col(row, "customer_email") || null,
      subject:       col(row, "subject") || null,
      origin:        col(row, "source"),
      importance:    (col(row, "negotiation_importance") as "frio" | "morno" | "quente") || "frio",
      status:        mapCsvStatus(csvStatus, csvStage),
      attendantId:   csvEmailToAttendantId(userEmail),
      attendantName: csvEmailToAttendantName(userEmail),
      createdAt:     col(row, "lead_created_at"),
      updatedAt:     col(row, "negotiation_updated_at"),
    } satisfies ApiLead;
  });
}

// ── localStorage store ────────────────────────────────────────────────────────

const LS_LEADS_KEY = "mock_leads_v1";

function getLeads(): ApiLead[] {
  try {
    const raw = localStorage.getItem(LS_LEADS_KEY);
    if (raw) return JSON.parse(raw) as ApiLead[];
  } catch {
    // fall through to seed
  }
  const seeded = parseCsv(csvRaw);
  localStorage.setItem(LS_LEADS_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveLeads(leads: ApiLead[]): void {
  localStorage.setItem(LS_LEADS_KEY, JSON.stringify(leads));
}

// ── Dynamic user password store ───────────────────────────────────────────────
// Persists credentials for users created via register() or createCollaborator().

const LS_PASSWORDS_KEY = "mock_passwords_v1";

interface DynamicUser extends MockUser {}

function getDynamicUsers(): DynamicUser[] {
  try {
    const raw = localStorage.getItem(LS_PASSWORDS_KEY);
    return raw ? (JSON.parse(raw) as DynamicUser[]) : [];
  } catch {
    return [];
  }
}

function saveDynamicUser(u: DynamicUser): void {
  const existing = getDynamicUsers().filter((x) => x.id !== u.id && x.email !== u.email);
  const next = [...existing, u];
  try {
    localStorage.setItem(LS_PASSWORDS_KEY, JSON.stringify(next));
  } catch (err) {
    console.error("[mockApi] falha ao salvar credencial em mock_passwords_v1:", err);
    throw new Error("Não foi possível salvar as credenciais no armazenamento local.");
  }
}

function findUser(email: string, senha?: string): MockUser | null {
  const normalizedEmail = email.trim().toLowerCase();

  const staticMatch = MOCK_USERS.find(
    (u) => u.email === normalizedEmail && (senha === undefined || u.senha === senha),
  );
  if (staticMatch) return staticMatch;

  const dynamic = getDynamicUsers();
  return dynamic.find(
    (u) => u.email === normalizedEmail && (senha === undefined || u.senha === senha),
  ) ?? null;
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function makeToken(userId: string): string {
  return btoa(`mock:${userId}`);
}

function resolveToken(token: string): MockUser | null {
  try {
    const decoded = atob(token);
    if (!decoded.startsWith("mock:")) return null;
    const userId = decoded.slice(5);
    // Check static users
    const staticUser = MOCK_USERS.find((u) => u.id === userId);
    if (staticUser) return staticUser;
    // Check dynamic users
    return getDynamicUsers().find((u) => u.id === userId) ?? null;
  } catch {
    return null;
  }
}

// ── Mock delay ────────────────────────────────────────────────────────────────

function delay(ms = 120): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Public API (same signatures as api.ts) ────────────────────────────────────

export async function login(email: string, senha: string): Promise<LoginResponse> {
  await delay();
  const user = findUser(email.trim().toLowerCase(), senha);
  if (!user) throw new Error("Credenciais inválidas.");
  return {
    token: makeToken(user.id),
    expiresIn: "8h",
    user: { id: user.id, nome: user.nome, email: user.email, role: user.role, teamId: user.teamId },
  };
}

export async function register(nome: string, email: string, senha: string): Promise<LoginResponse> {
  await delay();
  const normalizedEmail = email.trim().toLowerCase();
  if (findUser(normalizedEmail)) throw new Error("E-mail já cadastrado.");
  const id = `user-reg-${Date.now()}`;
  const newUser: DynamicUser = { id, nome, email: normalizedEmail, senha, role: "ATENDENTE", teamId: null };
  saveDynamicUser(newUser);
  // Also add to collaborators store
  const cols = getMockCollaborators();
  cols.unshift({
    id,
    nome,
    email,
    telefone: "",
    role: "ATENDENTE",
    teamId: null,
    teamName: null,
    ativo: true,
    lastLoginAt: null,
    permissoes: buildDefaultPermissoes("ATENDENTE"),
  });
  saveMockCollaborators(cols);
  return {
    token: makeToken(id),
    expiresIn: "8h",
    user: { id, nome, email, role: "ATENDENTE", teamId: null },
  };
}

export async function getCurrentUser(token: string): Promise<{ user: LoginResponse["user"] }> {
  await delay();
  const user = resolveToken(token);
  if (!user) throw new Error("Token inválido.");
  return { user: { id: user.id, nome: user.nome, email: user.email, role: user.role, teamId: user.teamId } };
}

// Leads arquivados (status finalizado/perdido movidos para o arquivo) ficam fora do funil ativo.
type MockLead = ApiLead & { archive?: boolean };

const ARCHIVABLE_STATUSES = new Set(["Vendido", "Perdido"]);

export async function listLeads(_token: string): Promise<{ leads: ApiLead[] }> {
  await delay(80);
  const leads = getLeads().filter((l) => !(l as MockLead).archive);
  return { leads };
}

export async function archiveLeads(token: string): Promise<{ message: string }> {
  await delay();
  if (!resolveToken(token)) throw new Error("Token inválido.");
  const leads = getLeads() as MockLead[];
  let count = 0;
  const now = new Date().toISOString();
  for (const lead of leads) {
    if (!lead.archive && ARCHIVABLE_STATUSES.has(lead.status)) {
      lead.archive = true;
      lead.updatedAt = now; // marca a data de arquivamento p/ "arquivado há X dias".
      count += 1;
    }
  }
  saveLeads(leads);
  return { message: `${count} leads foram movidos para o arquivo.` };
}

export async function listArchivedLeads(_token: string): Promise<{ leads: ApiLead[] }> {
  await delay(80);
  const leads = (getLeads() as MockLead[]).filter((l) => l.archive);
  return { leads };
}

export async function unarchiveLead(_token: string, leadId: string): Promise<{ lead: ApiLead }> {
  await delay();
  const leads = getLeads() as MockLead[];
  const idx = leads.findIndex((l) => l.id === leadId);
  if (idx === -1) throw new Error("Lead não encontrado.");
  const lead = { ...leads[idx], archive: false, updatedAt: new Date().toISOString() };
  leads[idx] = lead;
  saveLeads(leads);
  return { lead };
}

export async function createLead(
  _token: string,
  input: {
    clientName: string;
    clientPhone?: string | null;
    clientEmail?: string | null;
    subject?: string | null;
    origin: string;
    importance: "frio" | "morno" | "quente";
    status: string;
  },
): Promise<{ lead: ApiLead }> {
  await delay();
  const token = _token;
  const user  = resolveToken(token);
  const now   = new Date().toISOString();
  const lead: ApiLead = {
    id:            `lead-new-${Date.now()}`,
    clientName:    input.clientName,
    clientPhone:   input.clientPhone ?? null,
    clientEmail:   input.clientEmail ?? null,
    subject:       input.subject ?? null,
    origin:        input.origin,
    importance:    input.importance,
    status:        input.status,
    attendantId:   user?.id ?? "user-admin",
    attendantName: user?.nome ?? "Admin",
    createdAt:     now,
    updatedAt:     now,
  };
  const leads = getLeads();
  leads.unshift(lead);
  saveLeads(leads);
  return { lead };
}

export async function updateLeadStatus(
  _token: string,
  leadId: string,
  status: string,
): Promise<{ lead: ApiLead }> {
  await delay();
  const leads = getLeads();
  const idx   = leads.findIndex((l) => l.id === leadId);
  if (idx === -1) throw new Error("Lead não encontrado.");
  const lead = { ...leads[idx], status, updatedAt: new Date().toISOString() } as ApiLead;
  leads[idx] = lead;
  saveLeads(leads);
  return { lead };
}

export async function updateLead(
  _token: string,
  leadId: string,
  input: Partial<Pick<ApiLead, "clientName" | "clientPhone" | "clientEmail" | "subject" | "origin" | "importance" | "status">>,
): Promise<{ lead: ApiLead }> {
  await delay();
  const leads = getLeads();
  const idx   = leads.findIndex((l) => l.id === leadId);
  if (idx === -1) throw new Error("Lead não encontrado.");
  const lead = { ...leads[idx], ...input, updatedAt: new Date().toISOString() } as ApiLead;
  leads[idx] = lead;
  saveLeads(leads);
  return { lead };
}

export async function assignLead(
  _token: string,
  leadId: string,
  attendantId: string,
): Promise<{ lead: ApiLead }> {
  await delay();
  const leads     = getLeads();
  const idx       = leads.findIndex((l) => l.id === leadId);
  if (idx === -1) throw new Error("Lead não encontrado.");
  const attendant =
    getMockCollaborators().find((c) => c.id === attendantId) ??
    MOCK_USERS.find((u) => u.id === attendantId);
  const lead = {
    ...leads[idx],
    attendantId,
    attendantName: attendant?.nome ?? attendantId,
    updatedAt: new Date().toISOString(),
  } as ApiLead;
  leads[idx] = lead;
  saveLeads(leads);
  return { lead };
}

export async function listAssignable(token: string): Promise<{ users: AssignableUser[] }> {
  await delay(60);
  const requester = resolveToken(token);
  const all = getMockCollaborators();
  const filtered = requester?.role === "GERENTE"
    ? all.filter((c) => c.role === "ATENDENTE" && c.ativo && c.teamId === requester.teamId)
    : all.filter((c) => c.role !== "ADMIN" && c.ativo);
  return { users: filtered.map((c) => ({ id: c.id, nome: c.nome, role: c.role })) };
}

/** Wipe localStorage so the seed data is reloaded on next call. */
export function resetMockDb(): void {
  localStorage.removeItem(LS_LEADS_KEY);
  localStorage.removeItem(LS_COLLABORATORS_KEY);
  localStorage.removeItem(LS_PASSWORDS_KEY);
  localStorage.removeItem(LS_AUDIT_KEY);
}

// ── Audit log store ───────────────────────────────────────────────────────────

const LS_AUDIT_KEY = "mock_audit_logs_v2";

const ROLE_LABEL: Record<string, string> = {
  ADMIN:         "Administrador",
  GERENTE_GERAL: "Gerente Geral",
  GERENTE:       "Gerente",
  ATENDENTE:     "Vendedor",
};

/** Gera entradas de auditoria realistas a partir dos leads e colaboradores mock. */
function seedAuditLogs(): AuditLogEntry[] {
  const logs: AuditLogEntry[] = [];
  const leads = getLeads();
  const cols  = getMockCollaborators();
  const admin = cols.find((c) => c.role === "ADMIN") ?? cols[0];
  const gg    = cols.find((c) => c.role === "GERENTE_GERAL");

  const push = (
    action: AuditLogEntry["action"],
    actor: { id: string; nome: string; role: string },
    target: string,
    description: string,
    when: string,
  ) => {
    logs.push({
      id:        `audit-${logs.length + 1}`,
      action,
      actorId:   actor.id,
      actorName: actor.nome,
      actorRole: ROLE_LABEL[actor.role] ?? actor.role,
      target,
      description,
      createdAt: when,
    });
  };

  // A partir dos leads: captação e mudança de status
  leads.slice(0, 40).forEach((lead, i) => {
    const actor = cols.find((c) => c.id === lead.attendantId) ?? { id: lead.attendantId, nome: lead.attendantName, role: "ATENDENTE" };
    push(
      "lead_created",
      actor,
      lead.clientName,
      `Captou o lead "${lead.clientName}" (origem: ${lead.origin || "—"}).`,
      lead.createdAt || new Date(Date.now() - 1000 * 60 * 60 * (i + 2)).toISOString(),
    );
    if (lead.status && lead.status !== "Novo") {
      push(
        "lead_status_changed",
        actor,
        lead.clientName,
        `Alterou o status do lead "${lead.clientName}" para "${lead.status}".`,
        lead.updatedAt || new Date(Date.now() - 1000 * 60 * 30 * (i + 1)).toISOString(),
      );
    }
  });

  // Ações administrativas
  if (gg) {
    push("login", gg, gg.nome, "Acessou o sistema.", new Date(Date.now() - 1000 * 60 * 90).toISOString());
  }
  cols.filter((c) => c.role === "ATENDENTE").slice(0, 4).forEach((c, i) => {
    push(
      "collaborator_created",
      admin,
      c.nome,
      `Cadastrou o colaborador "${c.nome}" como ${ROLE_LABEL[c.role] ?? c.role}.`,
      new Date(Date.now() - 1000 * 60 * 60 * 24 * (i + 1)).toISOString(),
    );
    push(
      "permission_changed",
      admin,
      c.nome,
      `Atualizou as permissões de acesso de "${c.nome}".`,
      new Date(Date.now() - 1000 * 60 * 60 * 12 * (i + 1)).toISOString(),
    );
  });
  const someManager = cols.find((c) => c.role === "GERENTE");
  if (someManager) {
    push("role_changed", admin, someManager.nome, `Promoveu "${someManager.nome}" para ${ROLE_LABEL.GERENTE}.`, new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString());
  }

  // Mais recentes primeiro
  logs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return logs;
}

function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(LS_AUDIT_KEY);
    if (raw) return JSON.parse(raw) as AuditLogEntry[];
  } catch {
    // fall through to seed
  }
  const seeded = seedAuditLogs();
  localStorage.setItem(LS_AUDIT_KEY, JSON.stringify(seeded));
  return seeded;
}

/** Registra uma nova ação no log de auditoria (mais recente no topo). */
function appendAuditLog(
  actor: { id: string; nome: string; role: string } | null,
  action: AuditLogEntry["action"],
  target: string,
  description: string,
): void {
  const logs: AuditLogEntry[] = getAuditLogs();
  logs.unshift({
    id:        `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    actorId:   actor?.id ?? "system",
    actorName: actor?.nome ?? "Sistema",
    actorRole: actor ? (ROLE_LABEL[actor.role] ?? actor.role) : "Sistema",
    target,
    description,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(LS_AUDIT_KEY, JSON.stringify(logs));
}

export async function listAuditLogs(token: string): Promise<{ logs: AuditLogEntry[] }> {
  await delay(120);
  const requester = resolveToken(token);
  if (!requester) throw new Error("Token inválido.");
  if (requester.role !== "ADMIN") throw new Error("Acesso restrito ao Administrador.");
  return { logs: getAuditLogs() };
}

// ── Collaborators store ───────────────────────────────────────────────────────

const LS_COLLABORATORS_KEY = "mock_collaborators_v1";

function mockUserToCollaborator(u: MockUser): Collaborator {
  const team = TEAM_DEFS.find((t) => t.id === u.teamId);
  return {
    id:          u.id,
    nome:        u.nome,
    email:       u.email,
    telefone:    "",
    role:        u.role,
    teamId:      u.teamId,
    teamName:    team?.name ?? null,
    ativo:       true,
    lastLoginAt: null,
    permissoes:  buildDefaultPermissoes(u.role),
  };
}

function getMockCollaborators(): Collaborator[] {
  try {
    const raw = localStorage.getItem(LS_COLLABORATORS_KEY);
    if (raw) return JSON.parse(raw) as Collaborator[];
  } catch {
    // fall through to seed
  }
  const seeded = MOCK_USERS.map(mockUserToCollaborator);
  localStorage.setItem(LS_COLLABORATORS_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveMockCollaborators(cols: Collaborator[]): void {
  localStorage.setItem(LS_COLLABORATORS_KEY, JSON.stringify(cols));
}

// ── Collaborator API (same signatures as api.ts) ──────────────────────────────

export async function listCollaborators(_token: string): Promise<{ collaborators: Collaborator[] }> {
  await delay(100);
  return { collaborators: getMockCollaborators() };
}

export async function createCollaborator(
  _token: string,
  input: {
    nome: string;
    email: string;
    telefone: string;
    role: import("../types/auth").UserRole;
    senha: string;
    teamId?: string | null;
  },
): Promise<{ collaborator: Collaborator }> {
  await delay();
  const actor = resolveToken(_token);
  if (!actor) throw new Error("Token inválido.");
  if (actor.role !== "ADMIN") throw new Error("Apenas o Administrador pode cadastrar colaboradores.");
  const cols  = getMockCollaborators();
  const team  = TEAM_DEFS.find((t) => t.id === input.teamId);
  const collaborator: Collaborator = {
    id:          `col-${Date.now()}`,
    nome:        input.nome,
    email:       input.email,
    telefone:    input.telefone,
    role:        input.role,
    teamId:      input.teamId ?? null,
    teamName:    team?.name ?? null,
    ativo:       true,
    lastLoginAt: null,
    permissoes:  buildDefaultPermissoes(input.role),
  };
  cols.unshift(collaborator);
  saveMockCollaborators(cols);
  // Save credentials so this user can log in
  saveDynamicUser({ ...collaborator, senha: input.senha });
  appendAuditLog(
    { id: actor.id, nome: actor.nome, role: actor.role },
    "collaborator_created",
    collaborator.nome,
    `Cadastrou o colaborador "${collaborator.nome}" como ${ROLE_LABEL[collaborator.role] ?? collaborator.role}.`,
  );
  return { collaborator };
}

export async function deleteCollaborator(
  token: string,
  id: string,
): Promise<{ success: boolean }> {
  await delay();
  const actor = resolveToken(token);
  if (!actor) throw new Error("Token inválido.");

  const cols   = getMockCollaborators();
  const target = cols.find((c) => c.id === id);
  if (!target) throw new Error("Colaborador não encontrado.");

  if (!canDeleteCollaborator({ role: actor.role, id: actor.id, teamId: actor.teamId }, target)) {
    throw new Error("Você não tem permissão para excluir este colaborador.");
  }

  saveMockCollaborators(cols.filter((c) => c.id !== id));
  // Remove credenciais associadas
  const remaining = getDynamicUsers().filter((u) => u.id !== id);
  localStorage.setItem(LS_PASSWORDS_KEY, JSON.stringify(remaining));

  appendAuditLog(
    { id: actor.id, nome: actor.nome, role: actor.role },
    "collaborator_deleted",
    target.nome,
    `Excluiu o colaborador "${target.nome}" (${ROLE_LABEL[target.role] ?? target.role}).`,
  );
  return { success: true };
}

export async function updateCollaborator(
  _token: string,
  id: string,
  input: Partial<Pick<Collaborator, "nome" | "telefone" | "role" | "ativo" | "permissoes" | "teamId" | "teamName">>,
): Promise<{ collaborator: Collaborator }> {
  await delay();
  const cols = getMockCollaborators();
  const idx  = cols.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Colaborador não encontrado.");

  const previous = cols[idx];
  const patch = { ...input } as Partial<Collaborator>;
  if (input.teamId !== undefined) {
    patch.teamName = TEAM_DEFS.find((t) => t.id === input.teamId)?.name ?? null;
  }

  const collaborator = { ...previous, ...patch } as Collaborator;
  cols[idx] = collaborator;
  saveMockCollaborators(cols);

  // Registrar alterações relevantes no log de auditoria
  const resolved = resolveToken(_token);
  const actor = resolved && { id: resolved.id, nome: resolved.nome, role: resolved.role };
  if (input.role !== undefined && input.role !== previous.role) {
    appendAuditLog(actor, "role_changed", collaborator.nome,
      `Alterou o cargo de "${collaborator.nome}" para ${ROLE_LABEL[collaborator.role] ?? collaborator.role}.`);
  }
  if (input.permissoes !== undefined &&
      JSON.stringify(input.permissoes) !== JSON.stringify(previous.permissoes)) {
    appendAuditLog(actor, "permission_changed", collaborator.nome,
      `Atualizou as permissões de acesso de "${collaborator.nome}".`);
  }
  return { collaborator };
}

// ── Documentos ────────────────────────────────────────────────────────────────

const LS_DOCUMENTS_KEY = "mock_documents_v1";

function getDocuments(): ApiDocument[] {
  try {
    const raw = localStorage.getItem(LS_DOCUMENTS_KEY);
    if (raw) return JSON.parse(raw) as ApiDocument[];
  } catch { /* fall through */ }
  const seed: ApiDocument[] = [
    { id: "doc-1", companyId: "default-company", title: "Manual do Honda Civic 2023", description: "Manual completo do proprietário", type: "File", url: null, storedFileName: "manual_civic_2023.pdf", originalFileName: "manual_civic_2023.pdf", contentType: "application/pdf", sizeBytes: 4096000, sector: "Vendas", tags: ["manual", "honda"], isOnboarding: false, visibility: "private", createdAtUtc: "2026-05-10T10:00:00Z", updatedAtUtc: "2026-05-10T10:00:00Z" },
    { id: "doc-2", companyId: "default-company", title: "Tabela FIPE - Junho 2026", description: "Tabela de preços veículos usados", type: "Link", url: "https://www.fipe.org.br", storedFileName: null, originalFileName: null, contentType: null, sizeBytes: null, sector: "Precificação", tags: ["fipe", "preço"], isOnboarding: false, visibility: "public", createdAtUtc: "2026-06-01T08:00:00Z", updatedAtUtc: "2026-06-01T08:00:00Z" },
    { id: "doc-3", companyId: "default-company", title: "Contrato Padrão de Compra e Venda", description: "Modelo de contrato para clientes", type: "File", url: null, storedFileName: "contrato_padrao.docx", originalFileName: "contrato_padrao.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", sizeBytes: 102400, sector: "Jurídico", tags: ["contrato", "venda"], isOnboarding: true, visibility: "private", createdAtUtc: "2026-04-15T14:00:00Z", updatedAtUtc: "2026-04-20T09:00:00Z" },
    { id: "doc-4", companyId: "default-company", title: "Política de Financiamento BV", description: "Condições e taxas de financiamento", type: "File", url: null, storedFileName: "politica_bv.pdf", originalFileName: "politica_bv.pdf", contentType: "application/pdf", sizeBytes: 2048000, sector: "Financeiro", tags: ["financiamento", "bv"], isOnboarding: true, visibility: "private", createdAtUtc: "2026-03-20T11:30:00Z", updatedAtUtc: "2026-03-20T11:30:00Z" },
    { id: "doc-5", companyId: "default-company", title: "Guia de Onboarding - Vendedores", description: "Processo de integração para novos vendedores", type: "File", url: null, storedFileName: "onboarding_vendedores.pdf", originalFileName: "onboarding_vendedores.pdf", contentType: "application/pdf", sizeBytes: 1536000, sector: "RH", tags: ["onboarding", "rh"], isOnboarding: true, visibility: "private", createdAtUtc: "2026-02-01T09:00:00Z", updatedAtUtc: "2026-02-01T09:00:00Z" },
  ];
  localStorage.setItem(LS_DOCUMENTS_KEY, JSON.stringify(seed));
  return seed;
}

function saveDocuments(docs: ApiDocument[]): void {
  localStorage.setItem(LS_DOCUMENTS_KEY, JSON.stringify(docs));
}

export async function listDocuments(
  _token: string,
  params?: { search?: string; sector?: string; page?: number; pageSize?: number },
): Promise<{ documents: ApiDocument[]; pagination: ApiPagination }> {
  await delay();
  let docs = getDocuments();
  if (params?.search) {
    const q = params.search.toLowerCase();
    docs = docs.filter((d) => d.title.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q));
  }
  if (params?.sector) {
    docs = docs.filter((d) => d.sector === params.sector);
  }
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const total = docs.length;
  const paginated = docs.slice((page - 1) * pageSize, page * pageSize);
  return {
    documents: paginated,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function createDocumentLink(
  _token: string,
  input: CreateDocumentLinkInput,
): Promise<{ document: ApiDocument }> {
  await delay();
  const doc: ApiDocument = {
    id: `doc-${Date.now()}`,
    companyId: "default-company",
    title: input.title,
    description: input.description ?? null,
    type: "Link",
    url: input.url,
    storedFileName: null,
    originalFileName: null,
    contentType: null,
    sizeBytes: null,
    sector: input.sector ?? null,
    tags: input.tags ?? [],
    isOnboarding: false,
    visibility: input.visibility ?? "private",
    createdAtUtc: new Date().toISOString(),
    updatedAtUtc: new Date().toISOString(),
  };
  const docs = getDocuments();
  docs.unshift(doc);
  saveDocuments(docs);
  return { document: doc };
}

export async function createDocumentFile(
  _token: string,
  input: CreateDocumentFileInput,
  file: File,
): Promise<{ document: ApiDocument }> {
  await delay();
  const now = new Date().toISOString();
  const doc: ApiDocument = {
    id: `doc-${Date.now()}`,
    companyId: "default-company",
    title: input.title,
    description: input.description ?? null,
    type: "File",
    url: null,
    storedFileName: file.name,
    originalFileName: file.name,
    contentType: file.type || null,
    sizeBytes: file.size,
    sector: input.sector ?? null,
    tags: input.tags ?? [],
    isOnboarding: false,
    visibility: input.visibility ?? "private",
    createdAtUtc: now,
    updatedAtUtc: now,
  };
  const docs = getDocuments();
  docs.unshift(doc);
  saveDocuments(docs);
  return { document: doc };
}

export async function deleteDocument(_token: string, id: string): Promise<void> {
  await delay();
  const docs = getDocuments().filter((d) => d.id !== id);
  saveDocuments(docs);
}

// ── Financeiro ────────────────────────────────────────────────────────────────

const LS_FINANCE_KEY = "mock_finance_v1";

function getFinanceEntries(): ApiFinanceEntry[] {
  try {
    const raw = localStorage.getItem(LS_FINANCE_KEY);
    if (raw) return JSON.parse(raw) as ApiFinanceEntry[];
  } catch { /* fall through */ }
  const seed: ApiFinanceEntry[] = [
    { id: "fin-1", companyId: "default-company", type: "income", status: "paid", category: "Venda", amount: "52990.00", currency: "BRL", dueDate: "2026-05-11T00:00:00Z", occurredAtUtc: "2026-05-11T14:35:00Z", paidDate: "2026-05-11T14:35:00Z", costCenter: null, notes: "Venda Honda Civic 2023 - Marcio Silva", leadId: null, createdAtUtc: "2026-05-11T14:35:00Z", updatedAtUtc: "2026-05-11T14:35:00Z" },
    { id: "fin-2", companyId: "default-company", type: "income", status: "paid", category: "Venda", amount: "39990.00", currency: "BRL", dueDate: "2026-05-10T00:00:00Z", occurredAtUtc: "2026-05-10T10:15:00Z", paidDate: "2026-05-10T10:15:00Z", costCenter: null, notes: "Venda Toyota Corolla 2024 - Vanessa Souza", leadId: null, createdAtUtc: "2026-05-10T10:15:00Z", updatedAtUtc: "2026-05-10T10:15:00Z" },
    { id: "fin-3", companyId: "default-company", type: "income", status: "pending", category: "Entrada", amount: "23990.00", currency: "BRL", dueDate: "2026-06-15T00:00:00Z", occurredAtUtc: "2026-05-09T18:45:00Z", paidDate: null, costCenter: null, notes: "Entrada Jeep Renegade - Carlos Pereira", leadId: null, createdAtUtc: "2026-05-09T18:45:00Z", updatedAtUtc: "2026-05-09T18:45:00Z" },
    { id: "fin-4", companyId: "default-company", type: "income", status: "paid", category: "Venda", amount: "84990.00", currency: "BRL", dueDate: "2026-05-07T00:00:00Z", occurredAtUtc: "2026-05-07T12:05:00Z", paidDate: "2026-05-07T12:05:00Z", costCenter: null, notes: "Venda Hyundai HB20 2024 - Letícia Andrade", leadId: null, createdAtUtc: "2026-05-07T12:05:00Z", updatedAtUtc: "2026-05-07T12:05:00Z" },
    { id: "fin-5", companyId: "default-company", type: "expense", status: "paid", category: "Manutenção", amount: "3500.00", currency: "BRL", dueDate: "2026-05-05T00:00:00Z", occurredAtUtc: "2026-05-05T09:00:00Z", paidDate: "2026-05-05T09:00:00Z", costCenter: "Operações", notes: "Manutenção pátio e limpeza veículos", leadId: null, createdAtUtc: "2026-05-05T09:00:00Z", updatedAtUtc: "2026-05-05T09:00:00Z" },
    { id: "fin-6", companyId: "default-company", type: "income", status: "paid", category: "Venda", amount: "67290.00", currency: "BRL", dueDate: "2026-05-04T00:00:00Z", occurredAtUtc: "2026-05-04T09:50:00Z", paidDate: "2026-05-04T09:50:00Z", costCenter: null, notes: "Venda Ford Ranger 2023 - Ana Carolina", leadId: null, createdAtUtc: "2026-05-04T09:50:00Z", updatedAtUtc: "2026-05-04T09:50:00Z" },
    { id: "fin-7", companyId: "default-company", type: "expense", status: "pending", category: "Marketing", amount: "8000.00", currency: "BRL", dueDate: "2026-06-20T00:00:00Z", occurredAtUtc: "2026-06-01T00:00:00Z", paidDate: null, costCenter: "Marketing", notes: "Campanha digital junho 2026", leadId: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z" },
    { id: "fin-8", companyId: "default-company", type: "income", status: "overdue", category: "Comissão", amount: "5299.00", currency: "BRL", dueDate: "2026-05-31T00:00:00Z", occurredAtUtc: "2026-05-31T00:00:00Z", paidDate: null, costCenter: null, notes: "Comissão pendente - vendedor João", leadId: null, createdAtUtc: "2026-05-31T00:00:00Z", updatedAtUtc: "2026-05-31T00:00:00Z" },
  ];
  localStorage.setItem(LS_FINANCE_KEY, JSON.stringify(seed));
  return seed;
}

function saveFinanceEntries(entries: ApiFinanceEntry[]): void {
  localStorage.setItem(LS_FINANCE_KEY, JSON.stringify(entries));
}

export async function listFinanceEntries(
  _token: string,
  params?: { page?: number; pageSize?: number; type?: "income" | "expense"; status?: string },
): Promise<{ entries: ApiFinanceEntry[]; pagination: ApiPagination }> {
  await delay();
  let entries = getFinanceEntries();
  if (params?.type)   entries = entries.filter((e) => e.type === params.type);
  if (params?.status) entries = entries.filter((e) => e.status === params.status);
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const total = entries.length;
  const paginated = entries.slice((page - 1) * pageSize, page * pageSize);
  return {
    entries: paginated,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function createFinanceEntry(
  _token: string,
  input: CreateFinanceEntryInput,
): Promise<{ entry: ApiFinanceEntry }> {
  await delay();
  const now = new Date().toISOString();
  const entry: ApiFinanceEntry = {
    id: `fin-${Date.now()}`,
    companyId: "default-company",
    type: input.type,
    status: input.status ?? "pending",
    category: input.category,
    amount: Number(input.amount).toFixed(2),
    currency: input.currency ?? "BRL",
    dueDate: input.dueDate,
    occurredAtUtc: now,
    paidDate: null,
    costCenter: null,
    notes: input.notes ?? null,
    leadId: null,
    createdAtUtc: now,
    updatedAtUtc: now,
  };
  const entries = getFinanceEntries();
  entries.unshift(entry);
  saveFinanceEntries(entries);
  return { entry };
}

export async function deleteFinanceEntry(_token: string, id: string): Promise<void> {
  await delay();
  saveFinanceEntries(getFinanceEntries().filter((e) => e.id !== id));
}

// ── Agenda ────────────────────────────────────────────────────────────────────

const LS_AGENDA_KEY = "mock_agenda_v1";

function getAgendaEvents(): ApiAgendaEvent[] {
  try {
    const raw = localStorage.getItem(LS_AGENDA_KEY);
    if (raw) return JSON.parse(raw) as ApiAgendaEvent[];
  } catch { /* fall through */ }
  const seed: ApiAgendaEvent[] = [
    { id: "evt-1",  companyId: "default-company", title: "Test drive — Honda Civic",         type: "test_drive", status: "confirmed",  scheduledAt: "2026-06-10T09:00:00Z", clientName: "Marcio Silva",     vehicleName: "Honda Civic 2023",     assignedTo: "João Vendedor",   notes: null,                               leadId: null, createdAtUtc: "2026-06-05T10:00:00Z", updatedAtUtc: "2026-06-05T10:00:00Z" },
    { id: "evt-2",  companyId: "default-company", title: "Visita agendada — Letícia",        type: "visit",      status: "confirmed",  scheduledAt: "2026-06-10T14:30:00Z", clientName: "Letícia Andrade",  vehicleName: "Hyundai HB20 2024",    assignedTo: "Maria Atendente", notes: null,                               leadId: null, createdAtUtc: "2026-06-05T11:00:00Z", updatedAtUtc: "2026-06-05T11:00:00Z" },
    { id: "evt-3",  companyId: "default-company", title: "Ligação de retorno — Carlos",      type: "call",       status: "pending",    scheduledAt: "2026-06-10T11:00:00Z", clientName: "Carlos Pereira",   vehicleName: null,                   assignedTo: "João Vendedor",   notes: null,                               leadId: null, createdAtUtc: "2026-06-06T08:00:00Z", updatedAtUtc: "2026-06-06T08:00:00Z" },
    { id: "evt-4",  companyId: "default-company", title: "Reunião de equipe",                type: "meeting",    status: "confirmed",  scheduledAt: "2026-06-11T08:30:00Z", clientName: "Equipe",           vehicleName: null,                   assignedTo: "Gerente Geral",   notes: "Reunião semanal de alinhamento",   leadId: null, createdAtUtc: "2026-06-06T09:00:00Z", updatedAtUtc: "2026-06-06T09:00:00Z" },
    { id: "evt-5",  companyId: "default-company", title: "Follow-up — Vanessa",              type: "follow_up",  status: "pending",    scheduledAt: "2026-06-11T15:00:00Z", clientName: "Vanessa Souza",    vehicleName: "Toyota Corolla 2024",  assignedTo: "Maria Atendente", notes: null,                               leadId: null, createdAtUtc: "2026-06-07T08:00:00Z", updatedAtUtc: "2026-06-07T08:00:00Z" },
    { id: "evt-6",  companyId: "default-company", title: "Entrega do veículo — André",       type: "delivery",   status: "confirmed",  scheduledAt: "2026-06-12T10:00:00Z", clientName: "André Lima",       vehicleName: "VW Gol 2021",          assignedTo: "João Vendedor",   notes: "Documentação já assinada",         leadId: null, createdAtUtc: "2026-06-07T09:00:00Z", updatedAtUtc: "2026-06-07T09:00:00Z" },
    { id: "evt-7",  companyId: "default-company", title: "Test drive — BMW 320i",            type: "test_drive", status: "confirmed",  scheduledAt: "2026-06-13T09:30:00Z", clientName: "Eduardo Alves",    vehicleName: "BMW 320i 2022",        assignedTo: "Maria Atendente", notes: null,                               leadId: null, createdAtUtc: "2026-06-07T10:00:00Z", updatedAtUtc: "2026-06-07T10:00:00Z" },
    { id: "evt-8",  companyId: "default-company", title: "Visita — Camila Rocha",            type: "visit",      status: "pending",    scheduledAt: "2026-06-14T16:00:00Z", clientName: "Camila Rocha",     vehicleName: null,                   assignedTo: "João Vendedor",   notes: null,                               leadId: null, createdAtUtc: "2026-06-08T08:00:00Z", updatedAtUtc: "2026-06-08T08:00:00Z" },
    { id: "evt-9",  companyId: "default-company", title: "Reunião — Financiamento BV",       type: "meeting",    status: "confirmed",  scheduledAt: "2026-06-16T14:00:00Z", clientName: "Roberto Santos",   vehicleName: "Fiat Pulse 2024",      assignedTo: "Gerente Geral",   notes: null,                               leadId: null, createdAtUtc: "2026-06-08T09:00:00Z", updatedAtUtc: "2026-06-08T09:00:00Z" },
    { id: "evt-10", companyId: "default-company", title: "Follow-up — Patricia",             type: "follow_up",  status: "cancelled",  scheduledAt: "2026-06-05T11:30:00Z", clientName: "Patricia Ferreira", vehicleName: null,                  assignedTo: "Maria Atendente", notes: null,                               leadId: null, createdAtUtc: "2026-06-01T08:00:00Z", updatedAtUtc: "2026-06-05T12:00:00Z" },
    { id: "evt-11", companyId: "default-company", title: "Entrega — Ana Carolina",           type: "delivery",   status: "completed",  scheduledAt: "2026-06-04T09:00:00Z", clientName: "Ana Carolina",     vehicleName: "Ford Ranger 2023",     assignedTo: "João Vendedor",   notes: null,                               leadId: null, createdAtUtc: "2026-06-01T10:00:00Z", updatedAtUtc: "2026-06-04T10:00:00Z" },
    { id: "evt-12", companyId: "default-company", title: "Test drive — Kicks",               type: "test_drive", status: "pending",    scheduledAt: "2026-06-18T13:00:00Z", clientName: "Patricia Ferreira", vehicleName: "Nissan Kicks 2023",   assignedTo: "João Vendedor",   notes: null,                               leadId: null, createdAtUtc: "2026-06-08T11:00:00Z", updatedAtUtc: "2026-06-08T11:00:00Z" },
  ];
  localStorage.setItem(LS_AGENDA_KEY, JSON.stringify(seed));
  return seed;
}

function saveAgendaEvents(events: ApiAgendaEvent[]): void {
  localStorage.setItem(LS_AGENDA_KEY, JSON.stringify(events));
}

export async function listAgendaEvents(
  _token: string,
  params?: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; status?: string; type?: string },
): Promise<{ events: ApiAgendaEvent[]; pagination: ApiPagination }> {
  await delay();
  let events = getAgendaEvents();
  if (params?.status)   events = events.filter((e) => e.status === params.status);
  if (params?.type)     events = events.filter((e) => e.type === params.type);
  if (params?.dateFrom) events = events.filter((e) => e.scheduledAt >= params.dateFrom!);
  if (params?.dateTo)   events = events.filter((e) => e.scheduledAt <= params.dateTo!);
  events.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 100;
  const total = events.length;
  const paginated = events.slice((page - 1) * pageSize, page * pageSize);
  return {
    events: paginated,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function createAgendaEvent(
  _token: string,
  input: CreateAgendaEventInput,
): Promise<{ event: ApiAgendaEvent }> {
  await delay();
  const now = new Date().toISOString();
  const event: ApiAgendaEvent = {
    id: `evt-${Date.now()}`,
    companyId: "default-company",
    title: input.title,
    type: input.type,
    status: "pending",
    scheduledAt: input.scheduledAt,
    clientName: input.clientName,
    vehicleName: input.vehicleName ?? null,
    assignedTo: input.assignedTo ?? null,
    notes: input.notes ?? null,
    leadId: input.leadId ?? null,
    createdAtUtc: now,
    updatedAtUtc: now,
  };
  const events = getAgendaEvents();
  events.push(event);
  saveAgendaEvents(events);
  return { event };
}

export async function updateAgendaEventStatus(
  _token: string,
  id: string,
  status: ApiAgendaEvent["status"],
): Promise<{ event: ApiAgendaEvent }> {
  await delay();
  const events = getAgendaEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Evento não encontrado.");
  events[idx] = { ...events[idx], status, updatedAtUtc: new Date().toISOString() };
  saveAgendaEvents(events);
  return { event: events[idx] };
}

export async function deleteAgendaEvent(_token: string, id: string): Promise<void> {
  await delay();
  saveAgendaEvents(getAgendaEvents().filter((e) => e.id !== id));
}
