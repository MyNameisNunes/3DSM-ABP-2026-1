import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import MetricCard from '../Dashboard/MetricCard';
import DynamicIcon from '../UI/DynamicIcon';
import OriginBadge from '../Lead/OriginBadge';
import { getOrigin } from '../../lib/leadOrigins';
import { useLeads } from '../../hooks/useLeads';

type PeriodoFiltro = 'semana' | 'mes' | 'ano' | 'customizado';
type VisaoAtiva = 'comercial' | 'analitico';

const STATUS_COLORS: Record<string, string> = {
  'Novo': '#3b82f6',
  'Em atendimento': '#f59e0b',
  'Agendado': '#8b5cf6',
  'Em negociação': '#f97316',
  'Vendido': '#10b981',
  'Perdido': '#ef4444',
};

function periodoCutoff(periodo: PeriodoFiltro, inicio: string, fim: string): (d: string) => boolean {
  const now = new Date();
  if (periodo === 'semana') {
    const cut = new Date(now); cut.setDate(cut.getDate() - 7);
    return (d) => new Date(d) >= cut;
  }
  if (periodo === 'mes') {
    const cut = new Date(now); cut.setMonth(cut.getMonth() - 1);
    return (d) => new Date(d) >= cut;
  }
  if (periodo === 'ano') {
    const cut = new Date(now); cut.setFullYear(cut.getFullYear() - 1);
    return (d) => new Date(d) >= cut;
  }
  if (periodo === 'customizado' && inicio && fim) {
    return (d) => new Date(d) >= new Date(inicio) && new Date(d) <= new Date(fim + 'T23:59:59');
  }
  return () => true;
}

export default function DashboardGerenteGeral() {
  const [visao, setVisao] = useState<VisaoAtiva>('comercial');
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const { leads, loading } = useLeads();

  const filtered = useMemo(() => {
    const inRange = periodoCutoff(periodo, dataInicio, dataFim);
    return leads.filter((l) => inRange(l.createdAt));
  }, [leads, periodo, dataInicio, dataFim]);

  const total      = filtered.length;
  const quentes    = filtered.filter((l) => l.importance === 'quente').length;
  const vendidos   = filtered.filter((l) => l.status === 'Vendido').length;
  const taxa       = total > 0 ? ((vendidos / total) * 100).toFixed(1) : '0.0';

  // Pie: origens
  const origemPie = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of filtered) counts[l.origin] = (counts[l.origin] || 0) + 1;
    return Object.entries(counts).map(([key, value]) => {
      const origin = getOrigin(key);
      return { key, name: origin.label, value, color: origin.color };
    });
  }, [filtered]);

  // Bar: leads por status
  const statusBar = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of filtered) counts[l.status] = (counts[l.status] || 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Bar: mensal (últimos 6 meses)
  const mensalBar = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      const value = filtered.filter((l) => {
        const ld = new Date(l.createdAt);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
      }).length;
      return { name: label, value };
    });
  }, [filtered]);

  // Origens para barra horizontal
  const origensBar = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of filtered) counts[l.origin] = (counts[l.origin] || 0) + 1;
    return Object.entries(counts)
      .map(([key, count]) => {
        const origin = getOrigin(key);
        return { key, name: origin.label, color: origin.color, count, pct: total > 0 ? `${((count / total) * 100).toFixed(0)}%` : '0%' };
      })
      .sort((a, b) => b.count - a.count);
  }, [filtered, total]);

  // Leads por importância
  const importancia = useMemo(() => ({
    quente: filtered.filter((l) => l.importance === 'quente').length,
    morno:  filtered.filter((l) => l.importance === 'morno').length,
    frio:   filtered.filter((l) => l.importance === 'frio').length,
  }), [filtered]);

  // Atendentes
  const atendentes = useMemo(() => {
    const map: Record<string, { nome: string; leads: number; vendas: number }> = {};
    for (const l of filtered) {
      if (!map[l.attendantId]) map[l.attendantId] = { nome: l.attendantName, leads: 0, vendas: 0 };
      map[l.attendantId].leads++;
      if (l.status === 'Vendido') map[l.attendantId].vendas++;
    }
    return Object.values(map)
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 8)
      .map((a) => ({ ...a, taxa: a.leads > 0 ? `${((a.vendas / a.leads) * 100).toFixed(1)}%` : '0%' }));
  }, [filtered]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-slate-500 text-sm">Carregando dashboard...</p></div>;
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen text-slate-800 p-6 md:p-10">

      {/* Cabeçalho */}
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Gerente Geral</h1>
          <p className="text-sm text-slate-500 mt-1">Visão consolidada de todas as equipes — {total} leads no período.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm self-start lg:self-center">
          {(['semana', 'mes', 'ano'] as const).map((p) => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${periodo === p ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              {p === 'mes' ? 'Mês' : p}
            </button>
          ))}
          <button onClick={() => setPeriodo('customizado')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${periodo === 'customizado' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
            Customizado
          </button>
          {periodo === 'customizado' && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-slate-400" />
              <span className="text-xs text-slate-400">até</span>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
          )}
        </div>
      </header>

      {/* Sub-abas */}
      <div className="flex border-b border-slate-200 mb-8 gap-6">
        {(['comercial', 'analitico'] as const).map((v) => (
          <button key={v} onClick={() => setVisao(v)}
            className={`pb-4 text-base font-semibold transition-all relative ${visao === v ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
            {v === 'comercial' ? 'Dashboard Comercial' : 'Dashboard Analítico'}
            {visao === v && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b81414] rounded-full" />}
          </button>
        ))}
      </div>

      {/* ── COMERCIAL ── */}
      {visao === 'comercial' && (
        <div className="space-y-8">
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total de Leads"       value={total}              color="blue"   icon={<DynamicIcon name="total"      className="h-6 w-6" />} />
            <MetricCard title="Leads Quentes"        value={quentes}            color="red"    icon={<DynamicIcon name="fire"       className="h-6 w-6" />} />
            <MetricCard title="Vendas Consolidadas"  value={vendidos}           color="green"  icon={<DynamicIcon name="money"      className="h-6 w-6" />} />
            <MetricCard title="Taxa de Conversão"    value={`${taxa}%`}         color="yellow" icon={<DynamicIcon name="meta"       className="h-6 w-6" />} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico Pizza — Origens */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Leads por Origem</h3>
              <p className="text-xs text-slate-400 mb-4">Distribuição percentual das fontes de captação.</p>
              {origemPie.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">Nenhum lead no período.</p>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={origemPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {origemPie.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
                      </Pie>
                      <RTooltip formatter={(v) => [`${v} leads`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                    {origemPie.map((item) => (
                      <div key={item.key} className="flex items-center gap-1.5 text-xs">
                        <OriginBadge value={item.key} />
                        <span className="font-semibold text-slate-900">({item.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico Coluna — Leads por Mês */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Leads por Mês</h3>
              <p className="text-xs text-slate-400 mb-4">Volume de leads captados nos últimos 6 meses.</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={mensalBar} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RTooltip formatter={(v) => [`${v} leads`, 'Leads']} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Barra origens + Importância */}
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Volume por Canal de Captação</h3>
              <div className="space-y-3.5">
                {origensBar.map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <OriginBadge value={item.key} size="md" />
                      <span className="font-bold text-slate-900">{item.count} <span className="text-xs font-normal text-slate-400">({item.pct})</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: item.pct, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Temperatura dos Leads</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Quente</span>
                  <span className="text-2xl font-bold text-rose-900">{importancia.quente}</span>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Morno</span>
                  <span className="text-2xl font-bold text-amber-900">{importancia.morno}</span>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Frio</span>
                  <span className="text-2xl font-bold text-blue-900">{importancia.frio}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── ANALÍTICO ── */}
      {visao === 'analitico' && (
        <div className="space-y-8">
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DynamicIcon name="conversion" className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taxa de Conversão Global</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{taxa}%</p>
                <span className="text-[10px] text-slate-400">Convertidos / Total de leads</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <DynamicIcon name="total" className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total no Período</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{total}</p>
                <span className="text-[10px] text-slate-400">Leads processados</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <DynamicIcon name="fire" className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leads Perdidos</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{filtered.filter((l) => l.status === 'Perdido').length}</p>
                <span className="text-[10px] text-slate-400">Arquivados como perdido</span>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico Pizza — Importância */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Distribuição por Temperatura</h3>
              <p className="text-xs text-slate-400 mb-4">Proporção de leads quentes, mornos e frios.</p>
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Quente', value: importancia.quente },
                        { name: 'Morno',  value: importancia.morno },
                        { name: 'Frio',   value: importancia.frio },
                      ]}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#3b82f6" />
                    </Pie>
                    <RTooltip formatter={(v) => [`${v} leads`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-5">
                  {[{ label: 'Quente', color: '#ef4444' }, { label: 'Morno', color: '#f59e0b' }, { label: 'Frio', color: '#3b82f6' }].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráfico Coluna — Leads por Status */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Leads por Status</h3>
              <p className="text-xs text-slate-400 mb-4">Distribuição atual no funil de vendas.</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusBar} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <RTooltip formatter={(v) => [`${v} leads`, 'Leads']} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {statusBar.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Convertidos x Não Convertidos */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Convertidos × Não Convertidos</h3>
              <p className="text-xs text-slate-400 mb-6">Proporção direta de conversão de leads.</p>
              {total === 0 ? <p className="text-sm text-slate-400">Nenhum dado.</p> : (
                <div className="space-y-5">
                  <div>
                    <div className="flex mb-3 items-center justify-between text-xs font-semibold">
                      <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md uppercase">Convertidos ({taxa}%)</span>
                      <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md uppercase">Não Convertidos ({(100 - Number(taxa)).toFixed(1)}%)</span>
                    </div>
                    <div className="overflow-hidden h-6 flex rounded-2xl bg-slate-100 shadow-inner">
                      <div style={{ width: `${taxa}%` }} className="bg-emerald-500 transition-all duration-500" />
                      <div style={{ width: `${100 - Number(taxa)}%` }} className="bg-rose-400 transition-all duration-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center pt-2">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-500 block mb-0.5">Vendas</span>
                      <span className="block text-lg font-bold text-slate-800">{vendidos}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-500 block mb-0.5">Perdidos</span>
                      <span className="block text-lg font-bold text-slate-800">{filtered.filter((l) => l.status === 'Perdido').length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabela atendentes */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Performance por Atendente</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400">
                      <th className="pb-3">Atendente</th>
                      <th className="pb-3 text-center">Leads</th>
                      <th className="pb-3 text-center">Vendas</th>
                      <th className="pb-3 text-right">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {atendentes.map((a, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition">
                        <td className="py-2.5 font-medium text-slate-900">{a.nome}</td>
                        <td className="py-2.5 text-center text-slate-600">{a.leads}</td>
                        <td className="py-2.5 text-center text-slate-600">{a.vendas}</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-600">{a.taxa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
