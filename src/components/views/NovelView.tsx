import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Plus,
  Trash2,
  X,
  BookOpen,
  GripVertical,
} from 'lucide-react';

import {
  AppIcon,
  Button,
  EmptyState,
  Input,
  RichEditor,
  ConfirmDialog,
  Badge,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn, stripHtml } from '@/lib/utils';
import type { NovelChapterStatus } from '@/types';
import {
  useNovelChaptersQuery,
  useCreateNovelChapter,
  useUpdateNovelChapter,
  useDeleteNovelChapter,
  useReorderNovelChapters,
} from '@/features/novel/hooks';
import { useOutlineQuery } from '@/features/outline/hooks';
import { AiToolbarButton } from '@/features/ai/components/AiToolbarButton';
import { useAiContextStore } from '@/stores/aiContext';

interface NovelViewProps {
  workspaceId: string;
  workspaceName?: string;
}

const STATUS_COLORS: Record<NovelChapterStatus, string> = {
  draft: 'bg-gray-400',
  done: 'bg-green-500',
  revise: 'bg-amber-500',
};

const STATUS_LABEL_KEYS: Record<NovelChapterStatus, string> = {
  draft: 'novel.statusDraft',
  done: 'novel.statusDone',
  revise: 'novel.statusRevise',
};

function countWords(html: string): number {
  const text = stripHtml(html);
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

export function NovelView({ workspaceId, workspaceName }: NovelViewProps) {
  const { t } = useI18n();
  const { data: chapters = [], isLoading } = useNovelChaptersQuery(workspaceId);
  const { data: outlineNodes = [] } = useOutlineQuery(workspaceId);
  const createMutation = useCreateNovelChapter(workspaceId);
  const updateMutation = useUpdateNovelChapter(workspaceId);
  const deleteMutation = useDeleteNovelChapter(workspaceId);
  const reorderMutation = useReorderNovelChapters(workspaceId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorStatus, setEditorStatus] = useState<NovelChapterStatus>('draft');
  const [editorOutlineNodeId, setEditorOutlineNodeId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const selected = chapters.find((c) => c.id === selectedId) ?? null;
  const setAiContext = useAiContextStore((s) => s.setContext);

  const outlineOptions = useMemo(() => {
    return outlineNodes.filter((n) => n.type === 'chapter' || n.type === 'scene');
  }, [outlineNodes]);

  useEffect(() => {
    setAiContext({
      view: 'novel',
      viewLabel: t('nav.novel'),
      selection: selected
        ? {
            type: 'novel_chapter',
            id: selected.id,
            label: selected.title,
            content: stripHtml(selected.content),
          }
        : null,
      suggestions: [
        { label: t('ai.suggestPolish'), prompt: t('ai.promptPolishNote') },
        { label: t('ai.suggestContinue'), prompt: t('ai.promptContinueNote') },
      ],
    });
  }, [t, selected, setAiContext]);

  useEffect(() => {
    if (selected) {
      setEditorTitle(selected.title);
      setEditorContent(selected.content);
      setEditorStatus(selected.status);
      setEditorOutlineNodeId(selected.outlineNodeId);
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.updatedAt]);

  useEffect(() => {
    if (!selected || !dirty) return;
    const timer = setTimeout(() => {
      void updateMutation.mutateAsync({
        id: selected.id,
        title: editorTitle,
        content: editorContent,
        status: editorStatus,
        outlineNodeId: editorOutlineNodeId,
      });
      setDirty(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [editorTitle, editorContent, editorStatus, editorOutlineNodeId, dirty, selected, updateMutation]);

  const handleAdd = async () => {
    const maxOrder = chapters.length > 0 ? Math.max(...chapters.map((c) => c.sortOrder)) : -1;
    const n = await createMutation.mutateAsync({
      workspaceId,
      title: t('novel.newChapter'),
      content: '',
      status: 'draft',
      sortOrder: maxOrder + 1,
    });
    setSelectedId(n.id);
    setEditorTitle(n.title);
    setEditorContent('');
    setEditorStatus('draft');
    setEditorOutlineNodeId(null);
    setDirty(false);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      void deleteMutation.mutateAsync(confirmDelete);
      if (selectedId === confirmDelete) {
        setSelectedId(null);
      }
      setConfirmDelete(null);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    if (sourceId === targetId) return;

    const currentOrder = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder);
    const sourceIdx = currentOrder.findIndex((c) => c.id === sourceId);
    const targetIdx = currentOrder.findIndex((c) => c.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;

    const reordered = [...currentOrder];
    const [removed] = reordered.splice(sourceIdx, 1);
    if (!removed) return;
    reordered.splice(targetIdx, 0, removed!);

    const newIds = reordered.map((c) => c.id);
    void reorderMutation.mutateAsync({ workspaceId, chapterIds: newIds });
  };

  const liveWordCount = countWords(editorContent);
  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [chapters]);

  return (
    <>
      <Toolbar
        title={t('nav.novel')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('novel.newChapter')}</span>
            </Button>
            <div className="w-px h-5 bg-border" />
            <AiToolbarButton
              view="novel"
              viewLabel={t('nav.novel')}
              selection={
                selected
                  ? {
                      type: 'novel_chapter',
                      id: selected.id,
                      label: selected.title,
                      content: stripHtml(selected.content),
                    }
                  : null
              }
              suggestions={[
                { label: t('ai.suggestPolish'), prompt: t('ai.promptPolishNote') },
                { label: t('ai.suggestContinue'), prompt: t('ai.promptContinueNote') },
              ]}
            />
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* Chapter list sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-border bg-bg-surface flex flex-col">
          <div className="h-11 px-3 flex items-center border-b border-border">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t('novel.chapters')}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-16 rounded-[6px]" />
                ))}
              </div>
            ) : chapters.length === 0 ? (
              <div className="p-6 text-center">
                <BookOpen className="h-8 w-8 text-text-secondary/40 mx-auto mb-2" />
                <p className="text-xs text-text-secondary">{t('novel.emptyChapters')}</p>
              </div>
            ) : (
              sortedChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, chapter.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, chapter.id)}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-2.5 border-b border-border/40 cursor-pointer transition-colors',
                    selectedId === chapter.id
                      ? 'bg-accent/10 border-l-2 border-l-accent'
                      : 'hover:bg-bg-elevated',
                    draggingId === chapter.id && 'opacity-50',
                  )}
                  onClick={() => setSelectedId(chapter.id)}
                  style={{ transition: 'opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1)' } as CSSProperties}
                >
                  <GripVertical className="h-3.5 w-3.5 text-text-secondary/50 flex-shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full flex-shrink-0',
                          STATUS_COLORS[chapter.status],
                        )}
                        title={t(STATUS_LABEL_KEYS[chapter.status])}
                      />
                      <span className="text-sm font-medium text-text-primary truncate">
                        {chapter.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-text-secondary/70">
                        {chapter.wordCount} {t('novel.words')}
                      </span>
                      {chapter.outlineNodeId && (
                        <Badge variant="outline" className="text-[10px]">
                          {t('novel.linked')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(chapter.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 p-0.5 rounded transition-all"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="h-12 flex items-center gap-3 px-4 border-b border-border bg-bg-surface flex-shrink-0">
                <Input
                  value={editorTitle}
                  onChange={(e) => {
                    setEditorTitle(e.target.value);
                    setDirty(true);
                  }}
                  className="flex-1 h-9 text-sm font-semibold border-transparent hover:border-border focus:border-border bg-transparent"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={editorStatus}
                    onChange={(e) => {
                      setEditorStatus(e.target.value as NovelChapterStatus);
                      setDirty(true);
                    }}
                    className="h-8 rounded-[4px] border border-border bg-bg-elevated px-2 text-xs"
                  >
                    <option value="draft">{t('novel.statusDraft')}</option>
                    <option value="done">{t('novel.statusDone')}</option>
                    <option value="revise">{t('novel.statusRevise')}</option>
                  </select>
                  <select
                    value={editorOutlineNodeId ?? ''}
                    onChange={(e) => {
                      setEditorOutlineNodeId(e.target.value || null);
                      setDirty(true);
                    }}
                    className="h-8 rounded-[4px] border border-border bg-bg-elevated px-2 text-xs max-w-[180px]"
                  >
                    <option value="">{t('novel.noOutlineLink')}</option>
                    {outlineOptions.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
                    title={t('common.close')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-4 bg-bg-base">
                <RichEditor
                  value={editorContent}
                  onChange={(v) => {
                    setEditorContent(v);
                    setDirty(true);
                  }}
                  placeholder={t('novel.editorPlaceholder')}
                  minHeight="calc(100vh - 220px)"
                />
              </div>
              <div className="h-8 flex items-center justify-between px-4 border-t border-border bg-bg-surface text-xs text-text-secondary flex-shrink-0">
                <div className="flex items-center gap-2">
                  {dirty && (
                    <span className="text-accent flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      {t('common.saving')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span>
                    {t('novel.wordCount')}: {liveWordCount}
                  </span>
                  <span>
                    {t('novel.chapterStatus')}: {t(STATUS_LABEL_KEYS[editorStatus])}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center">
              <EmptyState
                icon={
                  <AppIcon size="lg" tone="accent">
                    <BookOpen />
                  </AppIcon>
                }
                title={t('nav.novel')}
                description={t('novel.emptyStateDesc')}
                action={
                  <Button onClick={handleAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('novel.newChapter')}
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={t('common.delete')}
        description={t('novel.deleteConfirm')}
        destructive
        confirmText={t('common.delete')}
        onConfirm={handleDelete}
      />
    </>
  );
}
