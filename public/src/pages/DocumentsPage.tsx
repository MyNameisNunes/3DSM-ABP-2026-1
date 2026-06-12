import { useMemo, useState } from "react";
import { useDocuments } from "../hooks/useDocuments";
import type { ApiDocument } from "../hooks/useDocuments";

type DocCategoria = "Contrato" | "Nota Fiscal" | "Identidade" | "CRLV" | "Laudo" | "Outro";
type DocStatus = "Ativo" | "Pendente" | "Expirado" | "Arquivado";

interface Documento {
  id: number;
  nome: string;
  categoria: DocCategoria;
  cliente: string;
  veiculo?: string;
  tamanho: string;
  tipo: string;
  status: DocStatus;
  dataUpload: string;
  dataVencimento?: string;
  descricao?: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tipoFromContentType(ct: string | null, isLink: boolean): string {
  if (isLink) return "Link";
  if (!ct) return "FILE";
  if (ct.includes("pdf")) return "PDF";
  if (ct.includes("jpg") || ct.includes("jpeg")) return "JPG";
  if (ct.includes("png")) return "PNG";
  if (ct.includes("word") || ct.includes("docx")) return "DOCX";
  if (ct.includes("excel") || ct.includes("xlsx")) return "XLSX";
  if (ct.includes("zip")) return "ZIP";
  return "FILE";
}

function sectorToCategoria(sector: string | null): DocCategoria {
  if (!sector) return "Outro";
  const s = sector.toLowerCase();
  if (s.includes("contrat") || s.includes("jurid")) return "Contrato";
  if (s.includes("financ") || s.includes("fiscal")) return "Nota Fiscal";
  if (s.includes("rh") || s.includes("human")) return "Identidade";
  if (s.includes("laudo") || s.includes("vistori")) return "Laudo";
  return "Outro";
}

function toDocumento(d: ApiDocument): Documento {
  return {
    id:              d.id as unknown as number,
    nome:            d.originalFileName ?? d.title,
    categoria:       sectorToCategoria(d.sector),
    cliente:         d.description ?? "—",
    veiculo:         undefined,
    tamanho:         formatBytes(d.sizeBytes),
    tipo:            tipoFromContentType(d.contentType, d.type === "Link"),
    status:          "Ativo" as DocStatus,
    dataUpload:      d.createdAtUtc.slice(0, 10),
    dataVencimento:  undefined,
    descricao:       d.description ?? undefined,
  };
}

const CATEGORIA_CORES: Record<DocCategoria, string> = {
  "Contrato": "bg-blue-100 text-blue-700",
  "Nota Fiscal": "bg-emerald-100 text-emerald-700",
  "Identidade": "bg-purple-100 text-purple-700",
  "CRLV": "bg-orange-100 text-orange-700",
  "Laudo": "bg-indigo-100 text-indigo-700",
  "Outro": "bg-slate-100 text-slate-700",
};

const STATUS_CORES: Record<DocStatus, string> = {
  Ativo: "bg-emerald-100 text-emerald-700",
  Pendente: "bg-amber-100 text-amber-700",
  Expirado: "bg-rose-100 text-rose-700",
  Arquivado: "bg-slate-100 text-slate-500",
};

const TIPO_ICON: Record<string, string> = {
  PDF: "📄",
  JPG: "🖼️",
  PNG: "🖼️",
  DOCX: "📝",
  XLSX: "📊",
  ZIP: "🗜️",
};

type UploadMode = "arquivo" | "link";

interface UploadForm {
  nome: string;
  categoria: DocCategoria;
  url: string;
  descricao: string;
}

const EMPTY_FORM: UploadForm = {
  nome: "",
  categoria: "Contrato",
  url: "",
  descricao: "",
};

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

export default function DocumentsPage() {
  const { documents: apiDocs, loading, error, addLink, addFile, removeDocument } = useDocuments();
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<DocCategoria | "Todos">("Todos");
  const [filterStatus, setFilterStatus] = useState<DocStatus | "Todos">("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("arquivo");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<UploadForm>(EMPTY_FORM);
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const documentos = useMemo(() => apiDocs.map(toDocumento), [apiDocs]);

  const filtered = useMemo(() => {
    return documentos
      .filter((d) => {
        const matchSearch =
          d.nome.toLowerCase().includes(search.toLowerCase()) ||
          d.cliente.toLowerCase().includes(search.toLowerCase()) ||
          (d.veiculo ?? "").toLowerCase().includes(search.toLowerCase());
        const matchCategoria = filterCategoria === "Todos" || d.categoria === filterCategoria;
        const matchStatus = filterStatus === "Todos" || d.status === filterStatus;
        return matchSearch && matchCategoria && matchStatus;
      })
      .sort((a, b) => b.dataUpload.localeCompare(a.dataUpload));
  }, [documentos, search, filterCategoria, filterStatus]);

  function closeUpload() {
    setShowUpload(false);
    setForm(EMPTY_FORM);
    setFile(null);
    setUploadMode("arquivo");
    setFormError(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setFormError(null);
    setSaving(true);
    try {
      if (uploadMode === "link") {
        await addLink({
          title:       form.nome.trim(),
          description: form.descricao || undefined,
          url:         form.url.trim(),
          sector:      form.categoria,
          visibility:  "private",
        });
      } else {
        if (!file) {
          setFormError("Selecione um arquivo para enviar.");
          return;
        }
        await addFile(
          {
            title:       form.nome.trim(),
            description: form.descricao || undefined,
            sector:      form.categoria,
            visibility:  "private",
          },
          file,
        );
      }
      closeUpload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível salvar o documento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doc: Documento) {
    if (!window.confirm(`Excluir o documento "${doc.nome}"?`)) return;
    try {
      await removeDocument(String(doc.id));
      setSelectedDoc(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível excluir o documento.");
    }
  }

  const totalAtivos = documentos.filter((d) => d.status === "Ativo").length;
  const totalPendentes = documentos.filter((d) => d.status === "Pendente").length;
  const totalExpirados = documentos.filter((d) => d.status === "Expirado").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 animate-pulse">Carregando documentos…</p>
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
              <p className="text-sm uppercase tracking-[0.22em] text-slate-400">CRM · Documentos</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Gestão de Documentos</h1>
              <p className="mt-2 text-sm text-slate-500">
                Contratos, notas fiscais, laudos e documentos de clientes e veículos.
              </p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
            >
              <span className="text-lg">+</span> Novo Documento
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Ativos</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{totalAtivos}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Pendentes</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">{totalPendentes}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Expirados</p>
              <p className="mt-2 text-2xl font-bold text-rose-600">{totalExpirados}</p>
            </div>
          </div>
        </header>

        {/* Filters */}
        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-end gap-4">
            <label className="block flex-1 min-w-[160px]">
              <span className="text-sm font-semibold text-slate-600">Pesquisar</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, cliente ou veículo..."
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
            <label className="block min-w-[150px]">
              <span className="text-sm font-semibold text-slate-600">Categoria</span>
              <select
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value as DocCategoria | "Todos")}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Todos">Todas</option>
                <option value="Contrato">Contrato</option>
                <option value="Nota Fiscal">Nota Fiscal</option>
                <option value="Identidade">Identidade</option>
                <option value="CRLV">CRLV</option>
                <option value="Laudo">Laudo</option>
                <option value="Outro">Outro</option>
              </select>
            </label>
            <label className="block min-w-[130px]">
              <span className="text-sm font-semibold text-slate-600">Status</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as DocStatus | "Todos")}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Pendente">Pendente</option>
                <option value="Expirado">Expirado</option>
                <option value="Arquivado">Arquivado</option>
              </select>
            </label>
            <div className="flex gap-2 pb-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${viewMode === "grid" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ⊞ Grid
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${viewMode === "table" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ☰ Lista
              </button>
            </div>
          </div>
        </section>

        {/* Documents Grid / Table */}
        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Documentos · <span className="text-slate-700">{filtered.length}</span>
          </p>

          {viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.length > 0 ? (
                filtered.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:shadow-md hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-3xl">{TIPO_ICON[doc.tipo] ?? "📄"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CORES[doc.status]}`}>
                        {doc.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2 break-all">{doc.nome}</p>
                      <p className="mt-1 text-xs text-slate-500">{doc.cliente}</p>
                      {doc.veiculo && <p className="text-xs text-slate-400">{doc.veiculo}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIA_CORES[doc.categoria]}`}>
                        {doc.categoria}
                      </span>
                      <span className="text-xs text-slate-400">{doc.tamanho}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Upload: {formatDate(doc.dataUpload)}</p>
                  </button>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400">
                  Nenhum documento encontrado.
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600">
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Categoria</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Veículo</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Tamanho</th>
                    <th className="px-4 py-3 font-semibold">Upload</th>
                    <th className="px-4 py-3 font-semibold">Vencimento</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length > 0 ? (
                    filtered.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">
                          {TIPO_ICON[doc.tipo] ?? "📄"} {doc.nome}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIA_CORES[doc.categoria]}`}>
                            {doc.categoria}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{doc.cliente}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{doc.veiculo ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{doc.tipo}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{doc.tamanho}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(doc.dataUpload)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {doc.dataVencimento ? formatDate(doc.dataVencimento) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CORES[doc.status]}`}>
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                        Nenhum documento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Novo Documento</h2>
              <button
                onClick={closeUpload}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              {(["arquivo", "link"] as UploadMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setUploadMode(mode); setFormError(null); }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${uploadMode === mode ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {mode === "arquivo" ? "📎 Arquivo" : "🔗 Link"}
                </button>
              ))}
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Título *</span>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Contrato de compra e venda"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>

              {uploadMode === "arquivo" ? (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Arquivo * <span className="font-normal text-slate-400">(até 10 MB)</span></span>
                  <input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFile(f);
                      if (f && !form.nome.trim()) setForm((prev) => ({ ...prev, nome: f.name }));
                    }}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-500"
                  />
                  {file && <span className="mt-1 block text-xs text-slate-400">{file.name} · {(file.size / 1024).toFixed(0)} KB</span>}
                </label>
              ) : (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">URL *</span>
                  <input
                    type="url"
                    required
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Categoria *</span>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value as DocCategoria }))}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Contrato">Contrato</option>
                  <option value="Nota Fiscal">Nota Fiscal</option>
                  <option value="Identidade">Identidade</option>
                  <option value="CRLV">CRLV</option>
                  <option value="Laudo">Laudo</option>
                  <option value="Outro">Outro</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Descrição / Cliente (opcional)</span>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={2}
                  placeholder="Cliente, observações sobre o documento..."
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </label>

              {formError && (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeUpload}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{TIPO_ICON[selectedDoc.tipo] ?? "📄"}</span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 break-all">{selectedDoc.nome}</h2>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CORES[selectedDoc.status]}`}>
                    {selectedDoc.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 font-medium">Categoria</dt>
                <dd><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIA_CORES[selectedDoc.categoria]}`}>{selectedDoc.categoria}</span></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-medium">Cliente</dt>
                <dd className="text-slate-900 font-semibold">{selectedDoc.cliente}</dd>
              </div>
              {selectedDoc.veiculo && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 font-medium">Veículo</dt>
                  <dd className="text-slate-700">{selectedDoc.veiculo}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500 font-medium">Tipo / Tamanho</dt>
                <dd className="text-slate-700">{selectedDoc.tipo} · {selectedDoc.tamanho}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-medium">Data de upload</dt>
                <dd className="text-slate-700">{formatDate(selectedDoc.dataUpload)}</dd>
              </div>
              {selectedDoc.dataVencimento && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 font-medium">Vencimento</dt>
                  <dd className="text-slate-700">{formatDate(selectedDoc.dataVencimento)}</dd>
                </div>
              )}
              {selectedDoc.descricao && (
                <div>
                  <dt className="text-slate-500 font-medium mb-1">Descrição</dt>
                  <dd className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">{selectedDoc.descricao}</dd>
                </div>
              )}
            </dl>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleDelete(selectedDoc)}
                className="flex-1 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition"
              >
                Excluir
              </button>
              <button
                onClick={() => setSelectedDoc(null)}
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
