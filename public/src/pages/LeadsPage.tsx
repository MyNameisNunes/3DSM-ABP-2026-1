import { useState, useMemo, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

import Navbar from "../components/Layouts/Navbar";
import LeadCard from "../components/Lead/LeadCard";
import LeadForm from "../components/Lead/LeadForm";
import ArchiveLeads from "../components/Lead/ArchiveLeads";
import DelegationManager from "../components/Lead/DelegationManager";
import OriginBadge from "../components/Lead/OriginBadge";
import { LEAD_ORIGINS } from "../lib/leadOrigins";
import type { LeadFormData } from "../components/Lead/LeadForm";
import { useAuth } from "../contexts/useAuth";
import { useLeads } from "../hooks/useLeads";
import { useNotifications } from "../contexts/NotificationContext";
import type { ApiLead, AssignableUser } from "../hooks/useLeads";

export type LeadStatus =
  | "Novo"
  | "Em atendimento"
  | "Agendado"
  | "Em negociação"
  | "Vendido"
  | "Perdido";

const STAGE_META: Record<LeadStatus, { color: string; bg: string }> = {
  "Novo":           { color: "#ef4444", bg: "#fef2f2" },
  "Em atendimento": { color: "#3b82f6", bg: "#eff6ff" },
  "Agendado":       { color: "#f59e0b", bg: "#fffbeb" },
  "Em negociação":  { color: "#f97316", bg: "#fff7ed" },
  "Vendido":        { color: "#10b981", bg: "#f0fdf4" },
  "Perdido":        { color: "#94a3b8", bg: "#f8fafc" },
};

const KANBAN_STAGES: LeadStatus[] = [
  "Novo",
  "Em atendimento",
  "Agendado",
  "Em negociação",
  "Vendido",
  "Perdido",
];

// ── Draggable card wrapper ──────────────────────────────────────────────────
function DraggableCard({
  lead,
  canDrag,
  canDelegate,
  onEdit,
  onDelegate,
  onUnarchive,
}: {
  lead: ApiLead;
  canDrag: boolean;
  canDelegate: boolean;
  onEdit?: () => void;
  onDelegate?: () => void;
  onUnarchive?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      className={`touch-none outline-none ${isDragging ? "opacity-30" : ""} ${!canDrag ? "cursor-default" : ""}`}
    >
      <LeadCard
        clientName={lead.clientName}
        subject={lead.subject}
        origin={lead.origin}
        importance={lead.importance}
        attendantName={lead.attendantName}
        canDelegate={canDelegate}
        onEdit={onEdit}
        onDelegate={onDelegate}
        onUnarchive={onUnarchive}
      />
    </div>
  );
}

// ── Kanban column ───────────────────────────────────────────────────────────
function KanbanColumn({
  stage,
  leads,
  canDelegate,
  currentUserId,
  currentUserRole,
  archivedView,
  onEdit,
  onDelegate,
  onUnarchive,
}: {
  stage: LeadStatus;
  leads: ApiLead[];
  canDelegate: boolean;
  currentUserId: string;
  currentUserRole: string;
  archivedView: boolean;
  onEdit: (lead: ApiLead) => void;
  onDelegate: (lead: ApiLead) => void;
  onUnarchive?: (lead: ApiLead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: archivedView });
  const { color, bg } = STAGE_META[stage];

  function canDragLead(lead: ApiLead): boolean {
    if (archivedView) return false;
    if (currentUserRole !== "ATENDENTE") return true;
    return lead.attendantId === currentUserId;
  }

  return (
    <div
      className="flex h-full min-w-[230px] max-w-[230px] flex-col rounded-2xl overflow-hidden shadow-sm"
      style={{ background: isOver ? bg : "#f1f5f9" }}
    >
      <div
        className="flex items-center justify-between px-3 py-2.5 shrink-0"
        style={{ borderTop: `3px solid ${color}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <h3 className="truncate text-[11px] font-bold uppercase tracking-widest text-slate-500">
            {stage}
          </h3>
        </div>
        <span
          className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: color + "20", color }}
        >
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto p-2 transition-colors duration-150 ${
          isOver ? "ring-2 ring-inset ring-blue-300" : ""
        }`}
      >
        {leads.map((lead) => (
          <DraggableCard
            key={lead.id}
            lead={lead}
            canDrag={canDragLead(lead)}
            canDelegate={archivedView ? false : canDelegate}
            onEdit={archivedView ? undefined : () => onEdit(lead)}
            onDelegate={archivedView ? undefined : () => onDelegate(lead)}
            onUnarchive={archivedView && onUnarchive ? () => onUnarchive(lead) : undefined}
          />
        ))}

        {!archivedView && (
          <div
            className={`mt-auto flex items-center justify-center rounded-xl border-2 border-dashed py-4 text-[11px] transition-colors duration-150 ${
              isOver
                ? "border-blue-300 text-blue-400 bg-blue-50"
                : "border-slate-200 text-slate-300"
            }`}
          >
            {isOver ? "Soltar aqui" : "+ Soltar card"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit modal ──────────────────────────────────────────────────────────────
const EDIT_STAGES = ["Novo", "Em atendimento", "Agendado", "Em negociação", "Vendido", "Perdido"] as const;
const EDIT_IMPORTANCES = [
  { value: "frio",   label: "Frio" },
  { value: "morno",  label: "Morno" },
  { value: "quente", label: "Quente" },
] as const;

const INPUT_CLS = "mt-1 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200";

function EditLeadModal({
  lead,
  onClose,
  onSave,
}: {
  lead: ApiLead;
  onClose: () => void;
  onSave: (data: LeadFormData) => Promise<void>;
}) {
  const [clientName, setClientName]   = useState(lead.clientName);
  const [clientPhone, setClientPhone] = useState(lead.clientPhone ?? "");
  const [clientEmail, setClientEmail] = useState(lead.clientEmail ?? "");
  const [subject, setSubject]         = useState(lead.subject ?? "");
  const [origin, setOrigin]           = useState(lead.origin);
  const [importance, setImportance]   = useState<"frio" | "morno" | "quente">(lead.importance);
  const [status, setStatus]           = useState(lead.status);
  const [saving, setSaving]           = useState(false);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        clientName,
        clientPhone: clientPhone || null,
        clientEmail: clientEmail || null,
        subject: subject || null,
        origin,
        importance,
        status,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-900/30">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Editar Lead</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{lead.clientName}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 transition hover:text-slate-900" aria-label="Fechar modal">✕</button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nome *</label>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} className={INPUT_CLS} placeholder="Nome do cliente" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Telefone</label>
              <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={INPUT_CLS} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">E-mail</label>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={INPUT_CLS} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Interesse / Veículo</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={INPUT_CLS} placeholder="Ex: Honda Civic" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Origem *</label>
              <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={INPUT_CLS}>
                {LEAD_ORIGINS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="mt-2">
                <OriginBadge value={origin} size="md" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Temperatura *</label>
              <select value={importance} onChange={(e) => setImportance(e.target.value as "frio" | "morno" | "quente")} className={INPUT_CLS}>
                {EDIT_IMPORTANCES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Estágio</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT_CLS}>
                {EDIT_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-2xl bg-[#b81414] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#9f1313] disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delegate modal ──────────────────────────────────────────────────────────
function DelegateModal({
  lead,
  assignableUsers,
  currentUserRole,
  onClose,
  onDelegate,
}: {
  lead: ApiLead;
  assignableUsers: AssignableUser[];
  currentUserRole: string;
  onClose: () => void;
  onDelegate: (attendantId: string) => Promise<void>;
}) {
  const [selectedUser, setSelectedUser] = useState<AssignableUser | null>(null);
  const [saving, setSaving]             = useState(false);

  async function handleConfirm() {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await onDelegate(selectedUser.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Delegar lead</p>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">{lead.clientName}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-700">✕</button>
        </div>

        <DelegationManager
          currentUserRole={currentUserRole}
          assignableUsers={assignableUsers}
          selectedUserId={selectedUser?.id}
          onSelect={setSelectedUser}
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedUser || saving}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "Delegando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const { user, logout } = useAuth();

  const [showLeadForm, setShowLeadForm]     = useState(false);
  const [editingLead, setEditingLead]       = useState<ApiLead | null>(null);
  const [delegatingLead, setDelegatingLead] = useState<ApiLead | null>(null);
  const [activeId, setActiveId]             = useState<string | null>(null);
  const [archiving, setArchiving]           = useState(false);
  const [archiveMsg, setArchiveMsg]         = useState<string | null>(null);
  const [viewArchived, setViewArchived]     = useState(false);

  const {
    leads,
    archivedLeads,
    assignableUsers,
    loading,
    loadingArchived,
    error,
    moveLead,
    delegateLead,
    addLead,
    updateLead,
    archiveLeads,
    fetchArchived,
    unarchiveLead,
  } = useLeads({ paused: activeId !== null });
  const { notify } = useNotifications();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const canDelegate = user?.role === "ADMIN" || user?.role === "GERENTE_GERAL" || user?.role === "GERENTE";
  const canCreate   = user?.role !== "GERENTE_GERAL";
  // Mesmos perfis autorizados pelo authorize() da rota POST /leads/archive no backend.
  const canArchive  = user?.role === "ADMIN" || user?.role === "GERENTE_GERAL" || user?.role === "GERENTE";

  // Recarrega o histórico de arquivados sempre que o usuário entra nessa visão.
  useEffect(() => {
    if (viewArchived) fetchArchived();
  }, [viewArchived, fetchArchived]);

  // Aplica a visibilidade por papel a qualquer conjunto de leads.
  const filterByRole = useCallback(
    (list: ApiLead[]) => {
      if (user?.role === "ATENDENTE") {
        return list.filter((l) => l.attendantId === user.id);
      }
      if (user?.role === "GERENTE") {
        const teamIds = new Set(assignableUsers.map((u) => u.id));
        return list.filter((l) => teamIds.has(l.attendantId) || l.attendantId === user.id);
      }
      return list;
    },
    [assignableUsers, user?.role, user?.id],
  );

  const sourceLeads = viewArchived ? archivedLeads : leads;

  const visibleLeads = useMemo(() => filterByRole(sourceLeads), [filterByRole, sourceLeads]);

  // Leads perdidos no funil ativo — candidatos ao arquivamento automático.
  const activeLostLeads = useMemo(
    () => filterByRole(leads).filter((l) => l.status === "Perdido"),
    [filterByRole, leads],
  );

  const leadsByStage = useMemo(() => {
    const grouped = {} as Record<LeadStatus, ApiLead[]>;
    KANBAN_STAGES.forEach((stage) => (grouped[stage] = []));
    visibleLeads.forEach((lead) => {
      const stage = lead.status as LeadStatus;
      if (grouped[stage]) grouped[stage].push(lead);
      else grouped["Novo"].push(lead);
    });
    return grouped;
  }, [visibleLeads]);

  const activeLead = activeId ? visibleLeads.find((l) => l.id === activeId) : null;

  const totalLeads    = visibleLeads.length;
  const newLeads      = leadsByStage["Novo"].length;
  const inFunnelLeads = leadsByStage["Em atendimento"].length + leadsByStage["Agendado"].length + leadsByStage["Em negociação"].length;
  const closedLeads   = leadsByStage["Vendido"].length;

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (viewArchived || !over) return;
    const newStage = over.id as LeadStatus;
    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.status === newStage) return;
    moveLead(lead.id, newStage);
    notify({ title: "Status alterado", message: `Lead ${lead.clientName} movido para ${newStage}.`, level: "info" });
  }

  async function handleSaveLead(data: LeadFormData) {
    await addLead(data);
    notify({ title: "Lead criado", message: "Lead cadastrado com sucesso.", level: "success" });
  }

  async function handleUpdateLead(data: LeadFormData) {
    if (!editingLead) return;
    await updateLead(editingLead.id, data);
    setEditingLead(null);
    notify({ title: "Lead atualizado", message: "Dados do lead atualizados.", level: "success" });
  }

  async function handleDelegate(attendantId: string) {
    if (!delegatingLead) return;
    await delegateLead(delegatingLead.id, attendantId);
    notify({ title: "Lead delegado", message: "Lead foi delegado com sucesso.", level: "success" });
  }

  async function handleUnarchive(lead: ApiLead) {
    const confirmed = window.confirm(`Devolver "${lead.clientName}" ao funil ativo?`);
    if (!confirmed) return;
    try {
      await unarchiveLead(lead.id);
    } catch (e) {
      setArchiveMsg(e instanceof Error ? e.message : "Não foi possível desarquivar o lead.");
    }
  }

  async function handleArchive({ silent = false }: { silent?: boolean } = {}) {
    // Conta sempre a partir do funil ativo, independente da visão atual.
    const finalized = filterByRole(leads).filter(
      (l) => l.status === "Vendido" || l.status === "Perdido",
    ).length;
    if (!silent) {
      const confirmed = window.confirm(
        `Arquivar ${finalized} lead(s) finalizado(s) ou perdido(s)? Eles sairão do funil ativo.`,
      );
      if (!confirmed) return;
    }
    setArchiving(true);
    setArchiveMsg(null);
    try {
      const message = await archiveLeads();
      setArchiveMsg(message);
      // Mantém o dashboard de arquivados em sincronia após mover os leads.
      if (viewArchived) await fetchArchived();
    } catch (e) {
      setArchiveMsg(e instanceof Error ? e.message : "Não foi possível arquivar os leads.");
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <Navbar user={user} onLogout={logout} />
        <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
          Carregando leads...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col bg-slate-100">
        <Navbar user={user} onLogout={logout} />
        <div className="flex flex-1 items-center justify-center text-red-500 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-900">
      <Navbar user={user} onLogout={logout} />

      <main className="flex flex-1 min-h-0 flex-col gap-3 px-5 pb-5 pt-4">
        {/* Header bar */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">CRM de Vendas</p>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                {viewArchived ? "Leads Arquivados" : "Pipeline de Leads"}
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
              <Stat label="Total"    value={totalLeads}    color="#64748b" />
              <Stat label="Novos"    value={newLeads}      color="#ef4444" />
              <Stat label="Funil"    value={inFunnelLeads} color="#f97316" />
              <Stat label="Fechados" value={closedLeads}   color="#10b981" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setViewArchived((v) => !v); setArchiveMsg(null); }}
              title={viewArchived ? "Voltar ao funil ativo" : "Consultar leads arquivados"}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                viewArchived
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {viewArchived ? "← Funil ativo" : "Ver arquivados"}
            </button>
            {!viewArchived && canArchive && (
              <button
                onClick={() => handleArchive()}
                disabled={archiving}
                title="Move leads vendidos ou perdidos para o arquivo"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                {archiving ? "Arquivando..." : "Arquivar finalizados"}
              </button>
            )}
            {!viewArchived && canCreate && (
              <button
                onClick={() => setShowLeadForm(true)}
                className="rounded-xl bg-[#b81414] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9f1313]"
              >
                + Novo Lead
              </button>
            )}
          </div>
        </div>

        {archiveMsg && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 shrink-0">
            <span>{archiveMsg}</span>
            <button onClick={() => setArchiveMsg(null)} className="text-emerald-600 transition hover:text-emerald-900" aria-label="Fechar aviso">✕</button>
          </div>
        )}

        {/* Visão arquivada: dashboard analítico (sem pipeline). */}
        {viewArchived ? (
          <ArchiveLeads
            archivedLeads={visibleLeads}
            lostLeads={activeLostLeads}
            loading={loadingArchived}
            canManage={canArchive}
            onRescue={handleUnarchive}
            onAutoArchive={() => handleArchive({ silent: true })}
          />
        ) : (
          /* Kanban board */
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1 min-h-0 overflow-x-auto">
              <div className="flex h-full gap-3 pb-1">
                {KANBAN_STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    leads={leadsByStage[stage]}
                    canDelegate={canDelegate}
                    currentUserId={user?.id ?? ""}
                    currentUserRole={user?.role ?? ""}
                    archivedView={viewArchived}
                    onEdit={setEditingLead}
                    onDelegate={setDelegatingLead}
                    onUnarchive={canArchive ? handleUnarchive : undefined}
                  />
                ))}
              </div>
            </div>

            <DragOverlay dropAnimation={null}>
              {activeLead ? (
                <div className="w-[230px] rotate-2 shadow-2xl opacity-95">
                  <LeadCard
                    clientName={activeLead.clientName}
                    subject={activeLead.subject}
                    origin={activeLead.origin}
                    importance={activeLead.importance}
                    attendantName={activeLead.attendantName}
                    canDelegate={false}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {showLeadForm && (
        <LeadForm onclose={() => setShowLeadForm(false)} onSave={handleSaveLead} />
      )}

      {editingLead && (
        <EditLeadModal lead={editingLead} onClose={() => setEditingLead(null)} onSave={handleUpdateLead} />
      )}

      {delegatingLead && (
        <DelegateModal
          lead={delegatingLead}
          assignableUsers={assignableUsers}
          currentUserRole={user?.role ?? ""}
          onClose={() => setDelegatingLead(null)}
          onDelegate={handleDelegate}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-slate-400">{label}:</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
