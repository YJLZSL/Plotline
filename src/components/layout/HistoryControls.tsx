import { useEffect, useCallback } from 'react';
import { Undo2, Redo2 } from 'lucide-react';

import { Button } from '@/components/ui';
import { useHistoryStore } from '@/stores/historyStore';
import { useHistoryDispatcher } from '@/hooks/useHistoryDispatcher';
import { useI18n } from '@/hooks/useI18n';

export function HistoryControls() {
  const { t } = useI18n();
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const dispatch = useHistoryDispatcher();

  const handleUndo = useCallback(async () => {
    const action = undo();
    if (action) await dispatch(action);
  }, [undo, dispatch]);

  const handleRedo = useCallback(async () => {
    const action = redo();
    if (action) await dispatch(action);
  }, [redo, dispatch]);

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          await handleRedo();
        } else {
          await handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        await handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleUndo}
        disabled={!canUndo}
        className="h-7 px-2 text-text-secondary"
        title={`${t('common.undo')} (Ctrl+Z)`}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRedo}
        disabled={!canRedo}
        className="h-7 px-2 text-text-secondary"
        title={`${t('common.redo')} (Ctrl+Y / Ctrl+Shift+Z)`}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
