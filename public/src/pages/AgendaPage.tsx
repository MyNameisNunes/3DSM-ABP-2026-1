import { useMemo, useState } from "react";
import { useAgenda } from "../hooks/useAgenda";
import type { ApiAgendaEvent } from "../hooks/useAgenda";

type EventoTipo = "Test Drive" | "Visita" | "Reunião" | "Ligação" | "Follow-up" | "Entrega";
type EventoStatus = "Confirmado" | "Pendente" | "Cancelado" | "Concluído";

interface Evento {
  id: number;
  titulo: string;
  tipo: EventoTipo;
  status: EventoStatus;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  cliente: string;
  veiculo?: string;
  responsavel: string;
  observacoes?: string;
}

const TIPO_CORES: Record<EventoTipo, { bg: string; text: string; dot: string }> = {
  "Test Drive": { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  "Visita": { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  "Reunião": { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  "Ligação": { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Follow-up": { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  "Entrega": { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" },
};

const STATUS_CORES: Record<EventoStatus, string> = {
  Confirmado: "bg-emerald-100 text-emerald-700",
  Pendente: "bg-amber-100 text-amber-700",
  Cancelado: "bg-slate-100 text-slate-500",
  Concluído: "bg-blue-100 text-blue-700",
};

const TIPO_API_MAP: Record<ApiAgendaEvent["type"], EventoTipo> = {
  test_drive: "Test Drive",
  visit:      "Visita",
  meeting:    "Reunião",
  call:       "Ligação",
  follow_up:  "Follow-up",
  delivery:   "Entrega",
};

const STATUS_API_MAP: Record<ApiAgendaEvent["status"], EventoStatus> = {
  pending:   "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

const TIPO_TO_API: Record<EventoTipo, ApiAgendaEvent["type"]> = {
  "Test Drive": "test_drive",
  "Visita":     "visit",
  "Reunião":    "meeting",
  "Ligação":    "call",
  "Follow-up":  "follow_up",
  "Entrega":    "delivery",
};

function toEvento(e: ApiAgendaEvent): Evento {
  const dt = new Date(e.scheduledAt);
  const data = dt.toISOString().slice(0, 10);
  const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return {
    id:          e.id as unknown as number,
    titulo:      e.title,
    tipo:        TIPO_API_MAP[e.type] ?? "Reunião",
    status:      STATUS_API_MAP[e.status] ?? "Pendente",
    data,
    hora,
    cliente:     e.clientName,
    veiculo:     e.vehicleName ?? undefined,
    responsavel: e.assignedTo ?? "—",
    observacoes: e.notes ?? undefined,
  };
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface NovoEventoForm {
  titulo: string;
  tipo: EventoTipo;
  data: string;
  hora: string;
  cliente: string;
  veiculo: string;
  responsavel: string;
  observacoes: string;
}

const EMPTY_FORM: NovoEventoForm = {
  titulo: "",
  tipo: "Test Drive",
  data: "",
  hora: "",
  cliente: "",
  veiculo: "",
  responsavel: "",
  observacoes: "",
};

const STATUS_TO_API: Record<EventoStatus, ApiAgendaEvent["status"]> = {
  Pendente:   "pending",
  Confirmado: "confirmed",
  Cancelado:  "cancelled",
  Concluído:  "completed",
};

export default function AgendaPage() {
  const { events: apiEvents, loading, error, addEvent, updateStatus, removeEvent } = useAgenda();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NovoEventoForm>(EMPTY_FORM);
  const [filterTipo, setFilterTipo] = useState<EventoTipo | "Todos">("Todos");
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);

  const eventos = useMemo(() => apiEvents.map(toEvento), [apiEvents]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, day: d });
    }
    return days;
  }, [viewYear, viewMonth]);

  const eventosByDate = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    eventos.forEach((e) => {
      if (!map[e.data]) map[e.data] = [];
      map[e.data].push(e);
    });
    return map;
  }, [eventos]);

  const selectedDateEventos = useMemo(() => {
    return (eventosByDate[selectedDate] ?? [])
      .filter((e) => filterTipo === "Todos" || e.tipo === filterTipo)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [eventosByDate, selectedDate, filterTipo]);

  const todayStr = today.toISOString().slice(0, 10);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo || !form.data || !form.hora || !form.cliente) return;
    const scheduledAt = new Date(`${form.data}T${form.hora}:00`).toISOString();
    try {
      await addEvent({
        title:       form.titulo,
        type:        TIPO_TO_API[form.tipo],
        scheduledAt,
        clientName:  form.cliente,
        vehicleName: form.veiculo || undefined,
        assignedTo:  form.responsavel || undefined,
        notes:       form.observacoes || undefined,
      });
      setSelectedDate(form.data);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível agendar o evento.");
    }
  }

  async function handleStatusChange(ev: Evento, status: EventoStatus) {
    try {
      await updateStatus(String(ev.id), STATUS_TO_API[status]);
      setSelectedEvento((prev) => (prev && prev.id === ev.id ? { ...prev, status } : prev));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível atualizar o evento.");
    }
  }

  async function handleDeleteEvent(ev: Evento) {
    if (!window.confirm(`Excluir o evento "${ev.titulo}"?`)) return;
    try {
      await removeEvent(String(ev.id));
      setSelectedEvento(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível excluir o evento.");
    }
  }

  const upcomingEventos = useMemo(() => {
    return eventos
      .filter((e) => e.data >= todayStr && e.status !== "Cancelado" && e.status !== "Concluído")
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
      .slice(0, 5);
  }, [eventos, todayStr]);

  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 animate-pulse">Carregando agenda…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400">CRM · Agenda</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Agenda</h1>
              <p className="mt-2 text-sm text-slate-500">
                Gerencie test drives, visitas, reuniões e entregas de veículos.
              </p>
            </div>
            <button
              onClick={() => { setForm({ ...EMPTY_FORM, data: selectedDate }); setShowForm(true); }}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
            >
              <span className="text-lg">+</span> Novo Evento
            </button>
          </div>
          {error && (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}
        </header>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          {/* Left: Calendar + Day Events */}
          <div className="space-y-6">
            {/* Calendar */}
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <button
                  onClick={prevMonth}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"
                >
                  ‹
                </button>
                <h2 className="text-lg font-bold text-slate-900">
                  {MESES[viewMonth]} {viewYear}
                </h2>
                <button
                  onClick={nextMonth}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, i) => {
                  if (!cell.date) {
                    return <div key={`empty-${i}`} className="aspect-square" />;
                  }
                  const hasEvents = (eventosByDate[cell.date] ?? []).length > 0;
                  const isToday = cell.date === todayStr;
                  const isSelected = cell.date === selectedDate;
                  const dayEvents = eventosByDate[cell.date] ?? [];
                  return (
                    <button
                      key={cell.date}
                      onClick={() => setSelectedDate(cell.date!)}
                      className={[
                        "relative flex flex-col items-center justify-start rounded-xl p-1 text-sm transition hover:bg-slate-100",
                        isSelected ? "bg-blue-600 text-white hover:bg-blue-500" : "",
                        isToday && !isSelected ? "ring-2 ring-blue-500 ring-offset-1" : "",
                      ].join(" ")}
                    >
                      <span className={`font-semibold leading-none ${isSelected ? "text-white" : isToday ? "text-blue-600" : "text-slate-700"}`}>
                        {cell.day}
                      </span>
                      {hasEvents && (
                        <div className="mt-1 flex gap-0.5 flex-wrap justify-center max-w-[32px]">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <span
                              key={ev.id}
                              className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/80" : TIPO_CORES[ev.tipo].dot}`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Events */}
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Eventos do dia</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900 capitalize">
                    {formatDisplayDate(selectedDate)}
                  </h3>
                </div>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value as EventoTipo | "Todos")}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="Todos">Todos os tipos</option>
                  <option value="Test Drive">Test Drive</option>
                  <option value="Visita">Visita</option>
                  <option value="Reunião">Reunião</option>
                  <option value="Ligação">Ligação</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Entrega">Entrega</option>
                </select>
              </div>

              {selectedDateEventos.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEventos.map((ev) => {
                    const cores = TIPO_CORES[ev.tipo];
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvento(ev)}
                        className="group w-full flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-slate-200 hover:bg-white hover:shadow-sm"
                      >
                        <div className={`mt-0.5 h-3 w-3 rounded-full shrink-0 ${cores.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-slate-900">{ev.titulo}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cores.bg} ${cores.text}`}>{ev.tipo}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CORES[ev.status]}`}>{ev.status}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                            <span>⏰ {ev.hora}</span>
                            <span>👤 {ev.cliente}</span>
                            {ev.veiculo && <span>🚗 {ev.veiculo}</span>}
                            <span>📋 {ev.responsavel}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <span className="text-4xl mb-3">📅</span>
                  <p className="text-sm">Nenhum evento para este dia.</p>
                  <button
                    onClick={() => { setForm({ ...EMPTY_FORM, data: selectedDate }); setShowForm(true); }}
                    className="mt-3 text-sm font-semibold text-blue-600 hover:underline"
                  >
                    + Agendar evento
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Upcoming + Legend */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-4">Próximos eventos</p>
              {upcomingEventos.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEventos.map((ev) => {
                    const cores = TIPO_CORES[ev.tipo];
                    const [year, month, day] = ev.data.split("-").map(Number);
                    const dateLabel = new Date(year, month - 1, day).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
                    return (
                      <button
                        key={ev.id}
                        onClick={() => { setSelectedDate(ev.data); setSelectedEvento(ev); setViewMonth(month - 1); setViewYear(year); }}
                        className="w-full flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-white"
                      >
                        <div className={`shrink-0 rounded-xl ${cores.bg} p-2`}>
                          <div className={`h-2 w-2 rounded-full ${cores.dot}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{ev.titulo}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{dateLabel} · {ev.hora} · {ev.cliente}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CORES[ev.status]}`}>
                          {ev.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">Nenhum evento próximo.</p>
              )}
            </div>

            {/* Legend */}
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-4">Tipos de evento</p>
              <div className="space-y-2.5">
                {(Object.keys(TIPO_CORES) as EventoTipo[]).map((tipo) => {
                  const cores = TIPO_CORES[tipo];
                  const count = eventos.filter((e) => e.tipo === tipo && e.status !== "Cancelado").length;
                  return (
                    <div key={tipo} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${cores.dot}`} />
                        <span className="text-sm text-slate-700">{tipo}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cores.bg} ${cores.text}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-4">Resumo do mês</p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { status: "Confirmado" as EventoStatus, bg: "bg-emerald-50", text: "text-emerald-600" },
                    { status: "Pendente"   as EventoStatus, bg: "bg-amber-50",   text: "text-amber-600" },
                    { status: "Concluído"  as EventoStatus, bg: "bg-blue-50",    text: "text-blue-600" },
                    { status: "Cancelado"  as EventoStatus, bg: "bg-slate-50",   text: "text-slate-500" },
                  ]
                ).map(({ status, bg, text }) => {
                  const count = eventos.filter((e) => {
                    const [year, month] = e.data.split("-").map(Number);
                    return e.status === status && year === viewYear && month - 1 === viewMonth;
                  }).length;
                  return (
                    <div key={status} className={`rounded-2xl px-3 py-3 ${bg}`}>
                      <p className="text-xs text-slate-500">{status}</p>
                      <p className={`mt-1 text-2xl font-bold ${text}`}>{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Novo Evento</h2>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Título *</span>
                <input
                  type="text"
                  required
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Test drive — Honda Civic"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Tipo *</span>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as EventoTipo }))}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Test Drive">Test Drive</option>
                    <option value="Visita">Visita</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Ligação">Ligação</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Entrega">Entrega</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Responsável</span>
                  <input
                    type="text"
                    value={form.responsavel}
                    onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                    placeholder="Nome"
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Data *</span>
                  <input
                    type="date"
                    required
                    value={form.data}
                    onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Hora *</span>
                  <input
                    type="time"
                    required
                    value={form.hora}
                    onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Cliente *</span>
                <input
                  type="text"
                  required
                  value={form.cliente}
                  onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                  placeholder="Nome do cliente"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Veículo (opcional)</span>
                <input
                  type="text"
                  value={form.veiculo}
                  onChange={(e) => setForm((f) => ({ ...f, veiculo: e.target.value }))}
                  placeholder="Ex: Honda Civic 2023"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Observações (opcional)</span>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={2}
                  placeholder="Detalhes adicionais..."
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition"
                >
                  Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_CORES[selectedEvento.tipo].bg} ${TIPO_CORES[selectedEvento.tipo].text}`}>
                    {selectedEvento.tipo}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CORES[selectedEvento.status]}`}>
                    {selectedEvento.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">{selectedEvento.titulo}</h2>
              </div>
              <button
                onClick={() => setSelectedEvento(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 font-medium">Data e hora</dt>
                <dd className="text-slate-900 font-semibold">
                  {formatDisplayDate(selectedEvento.data).split(",").slice(0, 2).join(",")} · {selectedEvento.hora}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-medium">Cliente</dt>
                <dd className="text-slate-900 font-semibold">{selectedEvento.cliente}</dd>
              </div>
              {selectedEvento.veiculo && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 font-medium">Veículo</dt>
                  <dd className="text-slate-700">{selectedEvento.veiculo}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500 font-medium">Responsável</dt>
                <dd className="text-slate-700">{selectedEvento.responsavel}</dd>
              </div>
              {selectedEvento.observacoes && (
                <div>
                  <dt className="text-slate-500 font-medium mb-1">Observações</dt>
                  <dd className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">{selectedEvento.observacoes}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Alterar status</p>
              <div className="flex flex-wrap gap-2">
                {(["Confirmado", "Concluído", "Pendente", "Cancelado"] as EventoStatus[])
                  .filter((s) => s !== selectedEvento.status)
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selectedEvento, s)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80 ${STATUS_CORES[s]}`}
                    >
                      {s}
                    </button>
                  ))}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => handleDeleteEvent(selectedEvento)}
                className="flex-1 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition"
              >
                Excluir
              </button>
              <button
                onClick={() => setSelectedEvento(null)}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
