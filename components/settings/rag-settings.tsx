'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Trash2, CheckCircle2, Loader2, XCircle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/lib/hooks/use-i18n';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RagDocument {
  id: string;
  name: string;
  size: number;
  status: 'processing' | 'ready' | 'failed';
  chunks: number;
  uploadedAt: number;
}

const RAG_STORAGE_KEY = 'rag-documents';
const RAG_ENABLED_KEY = 'rag-enabled';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RAGSettings() {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [ragEnabled, setRagEnabled] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RAG_STORAGE_KEY);
      if (saved) setDocuments(JSON.parse(saved));
      const enabled = localStorage.getItem(RAG_ENABLED_KEY);
      if (enabled === 'true') setRagEnabled(true);
    } catch {
      /* ignore */
    }
  }, []);

  const saveDocuments = (docs: RagDocument[]) => {
    setDocuments(docs);
    try {
      localStorage.setItem(RAG_STORAGE_KEY, JSON.stringify(docs));
    } catch {
      /* ignore */
    }
  };

  const handleToggleRag = (enabled: boolean) => {
    setRagEnabled(enabled);
    try {
      localStorage.setItem(RAG_ENABLED_KEY, String(enabled));
    } catch {
      /* ignore */
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Validate file type
    const validTypes = ['.pdf', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      toast.error(t('settings.ragUploadHint'));
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('settings.ragUploadHint'));
      return;
    }

    const newDoc: RagDocument = {
      id: `rag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      status: 'processing',
      chunks: 0,
      uploadedAt: Date.now(),
    };

    const updated = [...documents, newDoc];
    saveDocuments(updated);
    toast.success(t('settings.ragUploadSuccess'));

    // Simulate processing (in production, this would call an API to chunk/embed the document)
    setTimeout(() => {
      setDocuments((prev) => {
        const docs = prev.map((d) =>
          d.id === newDoc.id
            ? { ...d, status: 'ready' as const, chunks: Math.floor(file.size / 500) + 1 }
            : d,
        );
        try {
          localStorage.setItem(RAG_STORAGE_KEY, JSON.stringify(docs));
        } catch {
          /* ignore */
        }
        return docs;
      });
    }, 2000);
  };

  const handleDelete = (id: string) => {
    const updated = documents.filter((d) => d.id !== id);
    saveDocuments(updated);
    toast.success(t('settings.ragDeleteSuccess'));
  };

  const handleClearAll = () => {
    if (!confirm(t('settings.ragClearConfirm'))) return;
    saveDocuments([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">{t('settings.ragTitle')}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t('settings.ragDescription')}</p>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">{t('settings.ragEnabled')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('settings.ragEnabledDesc')}</p>
        </div>
        <Switch checked={ragEnabled} onCheckedChange={handleToggleRag} />
      </div>

      {/* Upload button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="outline"
          className="w-full h-24 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">{t('settings.ragUploadButton')}</span>
            <span className="text-xs text-muted-foreground">{t('settings.ragUploadHint')}</span>
          </div>
        </Button>
      </div>

      {/* File list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">{t('settings.ragFileList')}</h4>
          {documents.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleClearAll}>
              {t('settings.ragClearAll')}
            </Button>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
            {t('settings.ragNoFiles')}
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</span>
                    {doc.status === 'ready' && (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('settings.ragProcessed')} · {doc.chunks} {t('settings.ragChunks')}
                      </span>
                    )}
                    {doc.status === 'processing' && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t('settings.ragProcessing')}
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <XCircle className="h-3 w-3" />
                        {t('settings.ragFailed')}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
