import { useState, useMemo } from 'react';
import MetricCard from '../Dashboard/MetricCard';
import OriginBadge from '../Lead/OriginBadge';
import { getOrigin } from '../../lib/leadOrigins';
import { useLeads } from '../../hooks/useLeads';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type PeriodoFiltro = 'semana' | 'mes' | 'ano' | 'customizado';

const STATUS_COLORS: Record<string, string> = {
  'Novo': '#3b82f6',
  'Em atendimento': '#f59e0b',
  'Agendado': '#8b5cf6',
  'Em negociação': '#f97316',
  'Vendido': '#10b981',
  'Perdido': '#ef4444',
};

function periodoCutoff(
  periodo: PeriodoFiltro,
  dataInicio: string,
  dataFim: string,
): [Date | null, Date | null] {
  const now = new Date();
  if (periodo === 'semana') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return [d, null];
  }
  if (periodo === 'mes') return [new Date(now.getFullYear(), now.getMonth(), 1), null];
  if (periodo === 'ano') return [new Date(now.getFullYear(), 0, 1), null];
  return [
    dataInicio ? new Date(dataInicio) : null,
    dataFim ? new Date(dataFim + 'T23:59:59') : null,
  ];
}

export default function DashboardGerenteLoja() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { leads, loading } = useLeads();

  const filtered = useMemo(() => {
    const [from, to] = periodoCutoff(periodo, dataInicio, dataFim);
    return leads.filter((l) => {
      const d = new Date(l.createdAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [leads, periodo, dataInicio, dataFim]);

  const total = filtered.length;
  const quentes = filtered.filter((l) => l.importance === 'quente').length;
  const mornas = filtered.filter((l) => l.importance === 'morno').length;
  const frios = filtered.filter((l) => l.importance === 'frio').length;
  const vendidos = filtered.filter((l) => l.status === 'Vendido').length;
  const taxa = total > 0 ? ((vendidos / total) * 100).toFixed(1) : '0.0';

  const originPie = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of filtered) counts[l.origin] = (counts[l.origin] || 0) + 1;
    return Object.entries(counts).map(([key, value]) => {
      const origin = getOrigin(key);
      return { key, name: origin.label, value, color: origin.color };
    });
  }, [filtered]);

  const mensalBar = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      const value = leads.filter((l) => {
        const ld = new Date(l.createdAt);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
      }).length;
      return { name: label, leads: value };
    });
  }, [leads]);

  const statusBar = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of filtered) counts[l.status] = (counts[l.status] || 0) + 1;
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [filtered]);

  const atendentes = useMemo(() => {
    const map: Record<string, { nome: string; total: number; vendas: number }> = {};
    for (const l of filtered) {
      if (!map[l.attendantId]) map[l.attendantId] = { nome: l.attendantName, total: 0, vendas: 0 };
      map[l.attendantId].total++;
      if (l.status === 'Vendido') map[l.attendantId].vendas++;
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 text-slate-800">

      {/* Cabeçalho e Filtros */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard da Loja</h1>
          <p className="text-sm text-slate-500 mt-1">Indicadores de leads e conversões da sua unidade em tempo real.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          {(['semana', 'mes', 'ano'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
                periodo === p ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p === 'semana' ? 'Esta Semana' : p === 'mes' ? 'Este Mês' : 'Este Ano'}
            </button>
          ))}
          <button
            onClick={() => setPeriodo('customizado')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              periodo === 'customizado' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Customizado
          </button>
          {periodo === 'customizado' && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <span className="text-xs text-slate-400">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          )}
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Total de Leads"
          value={total}
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <MetricCard
          title="Leads Quentes"
          value={quentes}
          color="red"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>}
        />
        <MetricCard
          title="Vendas Finalizadas"
          value={vendidos}
          color="green"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${taxa}%`}
          color="yellow"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
      </section>

      {/* Gráficos principais */}
      <section className="grid gap-6 lg:grid-cols-3 mb-8">

        {/* PieChart — Origens */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Leads por Origem</h2>
          {originPie.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sem dados no período</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={originPie} dataKey="value" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                    {originPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} leads`, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1.5">
                {originPie.map((item) => (
                  <li key={item.key} className="flex items-center justify-between text-xs text-slate-600">
                    <OriginBadge value={item.key} />
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* BarChart — Leads por mês */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Leads por Mês</h2>
          <p className="text-xs text-slate-400 mb-4">Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mensalBar} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v} leads`, 'Leads']} />
              <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Temperatura */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Temperatura dos Leads</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block">Quente</span>
                <span className="text-2xl font-bold text-rose-900 block mt-1">{quentes}</span>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">Morno</span>
                <span className="text-2xl font-bold text-amber-900 block mt-1">{mornas}</span>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">Frio</span>
                <span className="text-2xl font-bold text-blue-900 block mt-1">{frios}</span>
              </div>
            </div>
          </div>

          {/* Status bar chart compacto */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Distribuição por Status</h3>
            <div className="space-y-2">
              {statusBar.map((item) => (
                <div key={item.status} className="space-y-0.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600">{item.status}</span>
                    <span className="text-slate-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${total > 0 ? (item.count / total) * 100 : 0}%`,
                        backgroundColor: STATUS_COLORS[item.status] ?? '#94a3b8',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BarChart de status + tabela de atendentes */}
      <section className="grid gap-8 lg:grid-cols-2">

        {/* BarChart — Leads por status (coluna) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Volume por Status</h2>
          <p className="text-xs text-slate-400 mb-4">Período selecionado</p>
          {statusBar.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusBar} margin={{ top: 5, right: 10, bottom: 30, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v} leads`, 'Quantidade']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusBar.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] ?? '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tabela — Desempenho por atendente */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Taxa de Conversão por Atendente</h2>
          {atendentes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum atendente no período</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-3">Nome</th>
                    <th className="pb-3 text-center">Leads</th>
                    <th className="pb-3 text-center">Vendas</th>
                    <th className="pb-3 text-right">Taxa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atendentes.map((a, idx) => {
                    const t = a.total > 0 ? ((a.vendas / a.total) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 font-medium text-slate-900">{a.nome}</td>
                        <td className="py-3 text-center text-slate-600">{a.total}</td>
                        <td className="py-3 text-center text-slate-600">{a.vendas}</td>
                        <td className="py-3 text-right font-semibold text-emerald-600">{t}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
