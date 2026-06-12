import { useEffect, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import MetricCard from "../Dashboard/MetricCard";
import OriginBadge from "./OriginBadge";
import { getOrigin } from "../../lib/leadOrigins";
import type { ApiLead } from "../../hooks/useLeads";

// Dias após os quais um lead perdido é arquivado automaticamente.
const AUTO_ARCHIVE_DAYS = 30;

const IMPORTANCE_META: Record<string, { label: string; color: string }> = {
  quente: { label: "Quente", color: "#ef4444" },
  morno: { label: "Morno", color: "#f59e0b" },
  frio: { label: "Frio", color: "#3b82f6" },
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysSince(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

interface ArchiveLeadsProps {
  /** Leads já arquivados (fora do funil ativo). */
  archivedLeads: ApiLead[];
  /** Leads ativos com status "Perdido" — candidatos ao arquivamento automático. */
  lostLeads: ApiLead[];
  loading: boolean;
  /** Permite resgatar e disparar o arquivamento automático. */
  canManage: boolean;
  /** Devolve um lead arquivado ao funil ativo. */
  onRescue: (lead: ApiLead) => void;
  /** Dispara o arquivamento dos leads perdidos/finalizados. */
  onAutoArchive: () => void;
}

export default function ArchiveLeads({
  archivedLeads,
  lostLeads,
  loading,
  canManage,
  onRescue,
  onAutoArchive,
}: ArchiveLeadsProps) {
  // Leads perdidos que já passaram da janela de 30 dias e devem ser arquivados sozinhos.
  const dueForArchive = useMemo(
    () => lostLeads.filter((l) => daysSince(l.updatedAt) >= AUTO_ARCHIVE_DAYS),
    [lostLeads],
  );

  // Dispara o arquivamento automático uma única vez quando há leads vencidos.
  const autoArchiveFired = useRef(false);
  useEffect(() => {
    if (!canManage) return;
    if (dueForArchive.length > 0 && !autoArchiveFired.current) {
      autoArchiveFired.current = true;
      onAutoArchive();
    }
    if (dueForArchive.length === 0) autoArchiveFired.current = false;
  }, [dueForArchive.length, canManage, onAutoArchive]);

  // KPIs
  const total = archivedLeads.length;
  const perdidos = archivedLeads.filter((l) => l.status === "Perdido").length;
  const vendidos = archivedLeads.filter((l) => l.status === "Vendido").length;
  const pendentes = lostLeads.length;

  // Distribuição por origem.
  const originPie = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of archivedLeads) counts[l.origin] = (counts[l.origin] || 0) + 1;
    return Object.entries(counts)
      .map(([key, value]) => {
        const origin = getOrigin(key);
        return { name: origin.label, value, color: origin.color };
      })
      .sort((a, b) => b.value - a.value);
  }, [archivedLeads]);

  // Arquivados por mês (últimos 6 meses), usando updatedAt como data de arquivamento.
  const mensalBar = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short" });
      const value = archivedLeads.filter((l) => {
        const ld = new Date(l.updatedAt);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
      }).length;
      return { name: label, leads: value };
    });
  }, [archivedLeads]);

  // Temperatura dos leads arquivados.
  const importanceBreakdown = useMemo(() => {
    return (["quente", "morno", "frio"] as const).map((key) => ({
      key,
      ...IMPORTANCE_META[key],
      value: archivedLeads.filter((l) => l.importance === key).length,
    }));
  }, [archivedLeads]);

  // Lista ordenada do mais recente para o mais antigo.
  const sortedArchived = useMemo(
    () => [...archivedLeads].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [archivedLeads],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        Carregando arquivo de leads...
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pb-2">
      {/* Aviso de arquivamento automático em andamento. */}
      {pendentes > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            {pendentes} lead(s) perdido(s) aguardando arquivamento automático.{" "}
            {dueForArchive.length > 0
              ? `${dueForArchive.length} já passou(aram) de ${AUTO_ARCHIVE_DAYS} dias.`
              : `O arquivamento ocorre após ${AUTO_ARCHIVE_DAYS} dias sem atividade.`}
          </span>
          {canManage && dueForArchive.length > 0 && (
            <button
              onClick={onAutoArchive}
              className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Arquivar agora
            </button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Arquivados"
          value={total}
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>}
        />
        <MetricCard
          title="Perdidos"
          value={perdidos}
          color="red"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
        />
        <MetricCard
          title="Vendidos arquivados"
          value={vendidos}
          color="green"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard
          title="Aguardando arquivo"
          value={pendentes}
          color="yellow"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </section>

      {/* Gráficos */}
      <section className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Origem */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Arquivados por Origem</h2>
          {originPie.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sem dados</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={originPie} dataKey="value" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                    {originPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} leads`, "Quantidade"]} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1">
                {originPie.map((item, i) => (
                  <li key={i} className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full inline-block" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Arquivados por mês */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Arquivados por Mês</h2>
          <p className="text-xs text-slate-400 mb-4">Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mensalBar} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v} leads`, "Arquivados"]} />
              <Bar dataKey="leads" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Temperatura */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Temperatura no Arquivo</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {importanceBreakdown.map((item) => (
              <div key={item.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="block text-xs font-semibold uppercase tracking-wider" style={{ color: item.color }}>
                  {item.label}
                </span>
                <span className="mt-1 block text-2xl font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Distribuição da temperatura dos leads no momento do arquivamento.
          </p>
        </div>
      </section>

      {/* Tabela de arquivados com resgate */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Leads Arquivados</h2>
          <span className="text-xs text-slate-400">{total} no total</span>
        </div>

        {sortedArchived.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nenhum lead arquivado por aqui.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Origem</th>
                  <th className="pb-3 text-center">Arquivado há</th>
                  {canManage && <th className="pb-3 text-right">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedArchived.map((lead) => {
                  const dias = daysSince(lead.updatedAt);
                  const isLost = lead.status === "Perdido";
                  return (
                    <tr key={lead.id} className="transition hover:bg-slate-50/50">
                      <td className="py-3">
                        <span className="font-medium text-slate-900">{lead.clientName}</span>
                        {lead.subject && (
                          <span className="block text-xs text-slate-400">{lead.subject}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={
                            isLost
                              ? { background: "#fef2f2", color: "#ef4444" }
                              : { background: "#f0fdf4", color: "#10b981" }
                          }
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3"><OriginBadge value={lead.origin} /></td>
                      <td className="py-3 text-center text-slate-600">
                        {dias === 0 ? "Hoje" : `${dias} dia${dias > 1 ? "s" : ""}`}
                      </td>
                      {canManage && (
                        <td className="py-3 text-right">
                          <button
                            onClick={() => onRescue(lead)}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            ↩ Resgatar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
