import { useMemo, useState } from 'react';
import { Eye, History, Trash2, Undo2 } from 'lucide-react';

import { Button, Dialog, DialogContent, EmptyState } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { useAiOutputHistory, type AiOutputVersion } from '@/stores/aiOutputHistory';

interface AiOutputHistoryPanelProps {
  sessionId: string | null;
  workspaceId?: string;
  onRestore: (content: string) => void;
}

function previewContent(content: string, max = 120): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

export function AiOutputHistoryPanel({
  sessionId,
  onRestore,
}: AiOutputHistoryPanelProps) {
  const { t } = useI18n();
  const versions = useAiOutputHistory((s) => s.versions);
  const deleteVersion = useAiOutputHistory((s) => s.deleteVersion);
  const [viewing, setViewing] = useState<AiOutputVersion | null>(null);

  const sessionVersions = useMemo(() => {
    if (!sessionId) return [];
    return versions
      .filter((v) => v.sessionId === sessionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [sessionId, versions]);

  if (!sessionId) return null;

  return (
    <div
      data-testid="ai-output-history-panel"
      className="border-t border-border bg-bg-base px-3 py-2"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
        <History className="h-3.5 w-3.5 text-accent" />
        {t('ai.outputHistoryTitle')}
      </div>

      {sessionVersions.length === 0 ? (
        <EmptyState
          icon={<History className="h-5 w-5" />}
          title={t('ai.outputHistoryEmpty')}
          transition={{ duration: 0 }}
        />
      ) : (
        <ul className="mt-1.5 space-y-1.5 max-h-52 overflow-y-auto">
          {sessionVersions.map((version) => (
            <li
              key={version.id}
              data-testid="ai-output-history-item"
              className="rounded-[6px] border border-border bg-bg-elevated px-2 py-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary">
                <span>{new Date(version.createdAt).toLocaleString()}</span>
                {version.label && <span className="truncate">{version.label}</span>}
              </div>
              <p className="mt-0.5 text-xs text-text-primary line-clamp-2">
                {previewContent(version.content)}
              </p>
              <div className="mt-1 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="ai-output-history-view"
                  onClick={() => setViewing(version)}
                  className="gap-1 h-7 px-2 text-xs"
                >
                  <Eye className="h-3 w-3" />
                  {t('ai.outputHistoryView')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="ai-output-history-restore"
                  onClick={() => onRestore(version.content)}
                  className="gap-1 h-7 px-2 text-xs"
                >
                  <Undo2 className="h-3 w-3" />
                  {t('ai.outputHistoryRestore')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="ai-output-history-delete"
                  onClick={() => deleteVersion(version.id)}
                  className="gap-1 h-7 px-2 text-xs hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                  {t('ai.outputHistoryDelete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={viewing !== null} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent title={t('ai.outputHistoryView')} className="max-w-xl">
          <div
            data-testid="ai-output-history-detail"
            className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-text-primary"
          >
            {viewing?.content ?? ''}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
