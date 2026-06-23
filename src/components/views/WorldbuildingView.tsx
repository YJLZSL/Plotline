import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Plus,
  Globe,
  Trash2,
  History,
  Sparkles,
  Users,
  Mountain,
  Palette,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

import { AppIcon, Button, Card, CardContent, EmptyState, Input, Textarea } from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';

import {
  useCreateNote,
  useDeleteNote,
  useNotesQuery,
  useUpdateNote,
} from '@/features/notebook/hooks';
import type { Note } from '@/types';

interface WorldbuildingViewProps {
  workspaceId: string;
  workspaceName?: string;
}

const CATEGORIES: Array<{ key: string; labelKey: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'history', labelKey: 'worldbuilding.history', icon: History },
  { key: 'magic', labelKey: 'worldbuilding.magic', icon: Sparkles },
  { key: 'factions', labelKey: 'worldbuilding.factions', icon: Users },
  { key: 'geography', labelKey: 'worldbuilding.geography', icon: Mountain },
  { key: 'culture', labelKey: 'worldbuilding.culture', icon: Palette },
  { key: 'other', labelKey: 'worldbuilding.other', icon: HelpCircle },
];

const CATEGORY_TAG_PREFIX = 'world:';

function getNoteCategory(note: Note): string {
  const tag = note.tags.find((t) => t.startsWith(CATEGORY_TAG_PREFIX));
  if (!tag) return 'other';
  const cat = tag.slice(CATEGORY_TAG_PREFIX.length);
  return CATEGORIES.some((c) => c.key === cat) ? cat : 'other';
}

export function WorldbuildingView({ workspaceId, workspaceName }: WorldbuildingViewProps) {
  const { t } = useI18n();
  const { data: notes = [], isLoading } = useNotesQuery(workspaceId);
  const createNote = useCreateNote(workspaceId);
  const updateNote = useUpdateNote(workspaceId);
  const deleteNote = useDeleteNote(workspaceId);
  const worldNotes = useMemo(
    () => notes.filter((n) => !n.isFolder && n.tags.some((tag) => tag.startsWith(CATEGORY_TAG_PREFIX))),
    [notes],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const note of worldNotes) {
      const cat = getNoteCategory(note);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(note);
    }
    return map;
  }, [worldNotes]);

  const handleAdd = async (category: string) => {
    const title = t('worldbuilding.newEntry', { category: t(`worldbuilding.${category}`) });
    await createNote.mutateAsync({
      workspaceId,
      title,
      content: '',
      tags: [`${CATEGORY_TAG_PREFIX}${category}`],
    });
  };

  return (
    <>
      <Toolbar
        title={t('nav.worldbuilding')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <div className="relative">
            <select
              value=""
              onChange={(e) => {
                const cat = e.target.value;
                if (cat) void handleAdd(cat);
                e.target.value = '';
              }}
              className="h-8 pl-3 pr-8 text-xs rounded-[6px] border border-border bg-bg-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none cursor-pointer"
            >
              <option value="">{t('worldbuilding.add')}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {t(cat.labelKey)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-48 rounded-[8px]" />
            ))}
          </div>
        ) : worldNotes.length === 0 ? (
          <div className="h-full grid place-items-center">
            <EmptyState
              icon={
                <AppIcon size="lg" tone="accent">
                  <Globe />
                </AppIcon>
              }
              title={t('worldbuilding.empty.title')}
              description={t('worldbuilding.empty.description')}
              action={
                <Button onClick={() => void handleAdd('other')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('worldbuilding.add')}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-8 max-w-6xl mx-auto">
            {CATEGORIES.map((cat) => {
              const items = byCategory.get(cat.key) ?? [];
              if (items.length === 0) return null;
              const Icon = cat.icon;
              return (
                <section key={cat.key}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Icon className="h-4 w-4 text-accent" />
                      {t(cat.labelKey)}
                      <span className="text-xs text-text-secondary font-normal">({items.length})</span>
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleAdd(cat.key)}
                      className="gap-1.5 h-7"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('worldbuilding.add')}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((note) => (
                      <LoreCard
                        key={note.id}
                        note={note}
                        onUpdate={(patch) =>
                          updateNote.mutateAsync({ id: note.id, ...patch })
                        }
                        onDelete={() => deleteNote.mutateAsync(note.id)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function LoreCard({
  note,
  onUpdate,
  onDelete,
}: {
  note: Note;
  onUpdate: (patch: Partial<Note>) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const onUpdateRef = useRef(onUpdate);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const dirtyRef = useRef(false);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
    if (title !== note.title || content !== note.content) {
      dirtyRef.current = true;
    }
  }, [title, content, note.title, note.content]);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    dirtyRef.current = false;
  }, [note.id, note.title, note.content, note.updatedAt]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        onUpdateRef.current({ title: titleRef.current, content: contentRef.current });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [title, content]);

  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        onUpdateRef.current({ title: titleRef.current, content: contentRef.current });
      }
    };
  }, []);

  return (
    <Card className="group flex flex-col">
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex items-start gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="lore-title-input"
            className="flex-1 text-sm font-semibold h-8 px-2 border-transparent bg-transparent focus:bg-bg-elevated"
          />
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 p-1 rounded transition-all"
            title={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('worldbuilding.placeholder')}
          className="flex-1 min-h-[100px] mt-2 text-sm resize-none border-transparent bg-transparent focus:bg-bg-elevated"
        />
        <div className="flex flex-wrap gap-1 mt-3">
          {note.tags
            .filter((t) => !t.startsWith(CATEGORY_TAG_PREFIX))
            .map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-secondary"
              >
                {tag}
              </span>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
