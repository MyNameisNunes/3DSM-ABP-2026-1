import { useState, useMemo } from "react";
import DashboardHeader from "./DashboardHeader";
import MetricsCards from "./MetricsCards";
import RevenueChart from "./RevenueChart";
import CategoryBarChart from "./CategoryBarChart";
import MetricsTable from "./MetricsTable";
import LeadDistributionPie from "./LeadDistributionPie";
import type { MetricSummary, ChartDataPoint, TransactionData, PieDataPoint } from "./index";
import { useLeads } from "../hooks/useLeads";
import { getOrigin } from "../lib/leadOrigins";

function leadStatusToTransaction(status: string): TransactionData["status"] {
  if (status === "Vendido") return "Completed";
  if (status === "Perdido") return "Canceled";
  return "Pending";
}

function importanceLabel(v: string) {
  if (v === "quente") return "Quente";
  if (v === "morno") return "Morno";
  return "Frio";
}

export default function MetricsPage() {
  const [status, setStatus] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const { leads, loading } = useLeads();

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (status === "completed" && lead.status !== "Vendido") return false;
      if (status === "canceled" && lead.status !== "Perdido") return false;
      if (status === "pending" && (lead.status === "Vendido" || lead.status === "Perdido")) return false;
      if (start && new Date(lead.createdAt) < new Date(start)) return false;
      if (end && new Date(lead.createdAt) > new Date(end + "T23:59:59")) return false;
      return true;
    });
  }, [leads, status, start, end]);

  const total = filtered.length;
  const convertidos = filtered.filter((l) => l.status === "Vendido").length;
  const perdidos = filtered.filter((l) => l.status === "Perdido").length;
  const emAberto = total - convertidos - perdidos;
  const taxa = total > 0 ? ((convertidos / total) * 100).toFixed(1) : "0.0";

  const metrics: MetricSummary[] = [
    { id: "1", label: "Total de Leads", value: String(total), trend: "neutral", trendValue: `${total} leads`, icon: "leads" },
    { id: "2", label: "Convertidos", value: String(convertidos), trend: convertidos > 0 ? "up" : "neutral", trendValue: `${convertidos} vendas`, icon: "money" },
    { id: "3", label: "Taxa de Conversão", value: `${taxa}%`, trend: Number(taxa) >= 20 ? "up" : "down", trendValue: `${taxa}%`, icon: "meta" },
    { id: "4", label: "Em Aberto", value: String(emAberto), trend: "neutral", trendValue: `${perdidos} perdidos`, icon: "premium" },
  ];

  const monthlyData = useMemo((): ChartDataPoint[] => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short" });
      const value = filtered.filter((l) => {
        const ld = new Date(l.createdAt);
        return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
      }).length;
      return { label, value };
    });
  }, [filtered]);

  const originData = useMemo((): PieDataPoint[] => {
    const counts: Record<string, number> = {};
    for (const lead of filtered) {
      counts[lead.origin] = (counts[lead.origin] || 0) + 1;
    }
    return Object.entries(counts).map(([key, value]) => {
      const origin = getOrigin(key);
      return { label: origin.label, value, color: origin.color };
    });
  }, [filtered]);

  const importanceData = useMemo((): ChartDataPoint[] => [
    { label: "Quente", value: filtered.filter((l) => l.importance === "quente").length },
    { label: "Morno",  value: filtered.filter((l) => l.importance === "morno").length },
    { label: "Frio",   value: filtered.filter((l) => l.importance === "frio").length },
  ], [filtered]);

  const transactions = useMemo((): TransactionData[] =>
    filtered.slice(0, 10).map((lead) => ({
      id: lead.id,
      customer: lead.clientName,
      status: leadStatusToTransaction(lead.status),
      date: new Date(lead.createdAt).toLocaleDateString("pt-BR"),
      amount: importanceLabel(lead.importance),
    })),
  [filtered]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-sm text-slate-400">Carregando relatório...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 lg:p-10">
      <DashboardHeader
        statusFilter={status}
        onStatusChange={setStatus}
        startDate={start}
        onStartDateChange={setStart}
        endDate={end}
        onEndDateChange={setEnd}
      />

      <div className="space-y-8">
        <MetricsCards data={metrics} />

        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart
            data={monthlyData}
            title="Leads por Mês"
            subtitle="Últimos 6 meses"
            tooltipLabel={(v) => `${v} leads`}
            legendLabel="Leads criados"
          />
          <LeadDistributionPie data={originData} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MetricsTable transactions={transactions} />
          </div>
          <div>
            <CategoryBarChart
              data={importanceData}
              title="Temperatura dos Leads"
              unit="leads"
            />
          </div>
        </div>
      </div>

      <footer className="mt-12 border-t border-slate-900 pt-6 text-center text-xs text-slate-600">
        © 2026 1000 Valle Multimarcas — Sistema de Gestão Interna
      </footer>
    </main>
  );
}
