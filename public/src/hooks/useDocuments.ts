import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/useAuth";
import * as api from "../services/api";
import type { ApiDocument, CreateDocumentLinkInput, CreateDocumentFileInput } from "../services/api";

export type { ApiDocument };

export function useDocuments(params?: { search?: string; sector?: string }) {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.listDocuments(token, { ...params, pageSize: 200 });
      setDocuments(data.documents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar documentos.");
    }
  }, [token, params?.search, params?.sector]);

  useEffect(() => {
    setLoading(true);
    fetchDocuments().finally(() => setLoading(false));
  }, [fetchDocuments]);

  const addLink = useCallback(
    async (input: CreateDocumentLinkInput): Promise<void> => {
      if (!token) return;
      const { document } = await api.createDocumentLink(token, input);
      setDocuments((prev) => [document, ...prev]);
    },
    [token],
  );

  const addFile = useCallback(
    async (input: CreateDocumentFileInput, file: File): Promise<void> => {
      if (!token) return;
      const { document } = await api.createDocumentFile(token, input, file);
      setDocuments((prev) => [document, ...prev]);
    },
    [token],
  );

  const removeDocument = useCallback(
    async (id: string): Promise<void> => {
      if (!token) return;
      await api.deleteDocument(token, id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    },
    [token],
  );

  return { documents, loading, error, addLink, addFile, removeDocument, refresh: fetchDocuments };
}
