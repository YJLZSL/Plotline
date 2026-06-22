import { useMemo, useState, useEffect } from 'react';
import {
  Plus,
  Search,
  StickyNote,
  Trash2,
  FileText,
  X,
  Tag as TagIcon,
} from 'lucide-react';

import {
  Badge,
  Button,
  EmptyState,
  Input,
  Textarea,
  ConfirmDialog,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn, relativeTime, truncate } from '@/lib/utils';
import {
  useCreateNote,
  useDeleteNote,
  useNotesQuery,
  useUpdateNote,
} from '@/features/notebook/hooks';

interface NotebookViewProps {
  workspaceId: string;
  workspaceName?: string;
}

export function NotebookView({ workspaceId, workspaceName }: NotebookViewProps) {
  const { t } = useI18n();
  const { data: notes = [], isLoading } = useNotesQuery(workspaceId);
  const createMutation = useCreateNote(workspaceId);
  const updateMutation = useUpdateNote(workspaceId);
  const deleteMutation = useDeleteNote(workspaceId);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorTags, setEditorTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [dirty, setDirty] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        !n.isFolder &&
        (n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((tag) => tag.toLowerCase().includes(q))),
    );
  }, [notes, search]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  // 同步编辑器内容
  useEffect(() => {
    if (selected) {
      setEditorTitle(selected.title);
      setEditorContent(selected.content);
      setEditorTags(selected.tags);
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.updatedAt]);

  // 自动保存（防抖 800ms）
  useEffect(() => {
    if (!selected || !dirty) return;
    const timer = setTimeout(() => {
      void updateMutation.mutateAsync({
        id: selected.id,
        title: editorTitle,
        content: editorContent,
        tags: editorTags,
      });
      setDirty(false);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorTitle, editorContent, editorTags, dirty]);

  const handleAdd = async () => {
    const n = await createMutation.mutateAsync({
      workspaceId,
      title: '新笔记',
      content: '',
    });
    setSelectedId(n.id);
    setEditorTitle(n.title);
    setEditorContent('');
    setEditorTags([]);
    setDirty(false);
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v || editorTags.includes(v)) return;
    setEditorTags((arr) => [...arr, v]);
    setDirty(true);
    setTagInput('');
  };

  return (
    <>
      <Toolbar
        title={t('nav.notebook')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <Button size="sm" onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">新建笔记</span>
          </Button>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* 笔记列表 */}
        <div className="w-72 flex-shrink-0 border-r border-border bg-bg-surface flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索笔记内容…"
                className="pl-9 h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-16 rounded-[6px]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center">
                <StickyNote className="h-8 w-8 text-text-secondary/40 mx-auto mb-2" />
                <p className="text-xs text-text-secondary">暂无笔记</p>
              </div>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className={cn(
                    'w-full text-left p-3 border-b border-border/40 transition-colors',
                    selectedId === n.id
                      ? 'bg-accent/10 border-l-2 border-l-accent'
                      : 'hover:bg-bg-elevated',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 text-text-secondary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-text-primary truncate">{n.title}</h4>
                      <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">
                        {truncate(n.content || '（空笔记）', 60)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {n.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-text-secondary/60 ml-auto">
                          {relativeTime(n.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 编辑器 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="h-12 flex items-center gap-3 px-4 border-b border-border bg-bg-surface">
                <Input
                  value={editorTitle}
                  onChange={(e) => {
                    setEditorTitle(e.target.value);
                    setDirty(true);
                  }}
                  className="flex-1 h-9 text-sm font-semibold border-transparent hover:border-border focus:border-border bg-transparent"
                />
                <button
                  onClick={() => setConfirmDelete(selected.id)}
                  className="text-text-secondary hover:text-red-500 p-1 rounded transition-colors"
                  title={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
                  title={t('common.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-4 py-2 border-b border-border bg-bg-surface flex items-center gap-2">
                <TagIcon className="h-3.5 w-3.5 text-text-secondary" />
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="按回车添加标签…"
                  className="flex-1 h-7 text-xs border-transparent bg-transparent"
                />
                <div className="flex gap-1">
                  {editorTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer text-[10px]"
                      onClick={() => {
                        setEditorTags((arr) => arr.filter((x) => x !== tag));
                        setDirty(true);
                      }}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                {dirty && (
                  <span className="text-[10px] text-accent flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                    保存中
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-auto p-6 bg-bg-base">
                <Textarea
                  value={editorContent}
                  onChange={(e) => {
                    setEditorContent(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="开始写下你的灵感与笔记…（支持纯文本）"
                  className="min-h-full h-auto border-0 rounded-none bg-transparent resize-none focus-visible:ring-0 text-sm leading-relaxed font-mono p-0"
                  style={{ minHeight: 'calc(100vh - 220px)' }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center">
              <EmptyState
                icon={<StickyNote className="h-10 w-10" />}
                title={t('nav.notebook')}
                description="选择左侧笔记开始编辑，或点击右上角创建新笔记。"
                action={
                  <Button onClick={handleAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    新建笔记
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
        description="确定删除该笔记？"
        destructive
        confirmText={t('common.delete')}
        onConfirm={() => {
          if (confirmDelete) void deleteMutation.mutateAsync(confirmDelete);
          setSelectedId(null);
        }}
      />
    </>
  );
}
