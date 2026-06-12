import React, { useState } from "react";
import { LEAD_ORIGINS } from "../../lib/leadOrigins";
import OriginBadge from "./OriginBadge";

const STAGES = [
  "Novo",
  "Em atendimento",
  "Agendado",
  "Em negociação",
  "Vendido",
  "Perdido",
] as const;

const IMPORTANCES = [
  { value: "frio",   label: "Frio" },
  { value: "morno",  label: "Morno" },
  { value: "quente", label: "Quente" },
] as const;

export interface LeadFormData {
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  subject: string | null;
  origin: string;
  importance: "frio" | "morno" | "quente";
  status: string;
}

interface LeadFormProps {
  onclose: () => void;
  onSave: (lead: LeadFormData) => Promise<void>;
}

export default function LeadForm({ onclose, onSave }: LeadFormProps) {
  const [clientName, setClientName]   = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [subject, setSubject]         = useState("");
  const [origin, setOrigin]           = useState("loja_fisica");
  const [importance, setImportance]   = useState<"frio" | "morno" | "quente">("morno");
  const [status, setStatus]           = useState<string>("Novo");
  const [saving, setSaving]           = useState(false);

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
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
      onclose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-900/30">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Novo Lead</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Adicionar lead</h2>
          </div>
          <button onClick={onclose} className="text-slate-500 transition hover:text-slate-900" aria-label="Fechar modal">
            ✕
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nome *</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="Nome do cliente"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Telefone</label>
              <input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">E-mail</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Interesse / Veículo</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="Ex: Honda Civic"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Origem *</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                {LEAD_ORIGINS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="mt-2">
                <OriginBadge value={origin} size="md" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Temperatura *</label>
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value as "frio" | "morno" | "quente")}
                className="mt-1 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                {IMPORTANCES.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Estágio</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onclose}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-[#b81414] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#9f1313] disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
