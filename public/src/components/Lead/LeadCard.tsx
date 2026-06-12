import OriginBadge from "./OriginBadge";

const IMPORTANCE_STYLE = {
  frio:   { label: "Frio",   bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  morno:  { label: "Morno",  bg: "#fff7ed", color: "#f97316", border: "#fed7aa" },
  quente: { label: "Quente", bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
};

interface LeadCardProps {
  clientName: string;
  subject: string | null;
  origin: string;
  importance: "frio" | "morno" | "quente";
  attendantName: string;
  canDelegate: boolean;
  onEdit?: () => void;
  onDelegate?: () => void;
  onUnarchive?: () => void;
}

export default function LeadCard({
  clientName,
  subject,
  origin,
  importance,
  attendantName,
  canDelegate,
  onEdit,
  onDelegate,
  onUnarchive,
}: LeadCardProps) {
  const imp = IMPORTANCE_STYLE[importance] ?? IMPORTANCE_STYLE.morno;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm select-none cursor-grab active:cursor-grabbing">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{clientName}</p>
          {subject && (
            <p className="truncate text-[11px] text-slate-400 mt-0.5">{subject}</p>
          )}
        </div>
        <GripIcon />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1 px-3 pb-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold border"
          style={{ background: imp.bg, color: imp.color, borderColor: imp.border }}
        >
          {imp.label}
        </span>
        <OriginBadge value={origin} />
      </div>

      {/* Attendant */}
      <div className="flex items-center gap-1 px-3 pb-2">
        <PersonIcon />
        <p className="truncate text-[11px] text-slate-400">{attendantName}</p>
      </div>

      {/* Actions */}
      {onUnarchive && (
        <div className="flex gap-1.5 px-2 pb-2">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onUnarchive(); }}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <UnarchiveIcon />
            Desarquivar
          </button>
        </div>
      )}
      {!onUnarchive && (onEdit || (canDelegate && onDelegate)) && (
        <div className="flex gap-1.5 px-2 pb-2">
          {onEdit && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 py-1.5 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-100"
            >
              <PencilIcon />
              Editar
            </button>
          )}
          {canDelegate && onDelegate && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelegate(); }}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-50 py-1.5 text-[11px] font-semibold text-violet-600 transition hover:bg-violet-100"
            >
              <DelegateIcon />
              Delegar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="#cbd5e1" className="mt-0.5 shrink-0">
      <circle cx="2.5" cy="2.5" r="1.2" />
      <circle cx="7.5" cy="2.5" r="1.2" />
      <circle cx="2.5" cy="7" r="1.2" />
      <circle cx="7.5" cy="7" r="1.2" />
      <circle cx="2.5" cy="11.5" r="1.2" />
      <circle cx="7.5" cy="11.5" r="1.2" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function UnarchiveIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="12" y1="18" x2="12" y2="11" />
      <polyline points="9 14 12 11 15 14" />
    </svg>
  );
}

function DelegateIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
