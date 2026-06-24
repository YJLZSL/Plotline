import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Upload,
  Settings as SettingsIcon,
  Clock4,
  Users,
  Layers,
  FileText,
  Pencil,
  Check,
} from 'lucide-react';

import { AppIcon, BrandMark, Button, Card, CardContent, EmptyState, Input } from '@/components/ui';
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useExportWorkspace,
  useExportWorkspaceMarkdown,
  useExportWorkspacePdf,
  useExportWorkspaceWord,
  useExportWorkspaceEpub,
  useImportWorkspace,
  useUpdateWorkspace,
  useWorkspacesQuery,
} from '@/features/workspace/hooks';
import { ConfirmDialog, Dialog, DialogContent, DialogTrigger } from '@/components/ui/Dialog';
import { useI18n } from '@/hooks/useI18n';
import { relativeTime, truncate, downloadJSON, downloadText, downloadBlob, cn } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import { useHistoryStore, makeUpdateWorkspaceAction } from '@/stores/historyStore';
import type { Workspace, WorkspaceTemplate, WorkspaceBundle } from '@/types';

const TRANSITION = MOTION_BASE;

const TEMPLATES: Array<{ value: WorkspaceTemplate; labelKey: string; descKey: string }> = [
  { value: 'blank', labelKey: 'workspace.form.templateBlank', descKey: 'workspace.form.templateBlankDesc' },
  { value: 'hero-journey', labelKey: 'workspace.form.templateHeroJourney', descKey: 'workspace.form.templateHeroJourneyDesc' },
  { value: 'three-act', labelKey: 'workspace.form.templateThreeAct', descKey: 'workspace.form.templateThreeActDesc' },
  { value: 'chronicle', labelKey: 'workspace.form.templateChronicle', descKey: 'workspace.form.templateChronicleDesc' },
  { value: 'biography', labelKey: 'workspace.form.templateBiography', descKey: 'workspace.form.templateBiographyDesc' },
];

const COVER_PALETTE = [
  '#C68A3E',
  '#A86A2C',
  '#B85537',
  '#7B5E3C',
  '#D4A574',
  '#9C6B3E',
  '#F4B6C2',
  '#B6D4F4',
  '#B6F4C8',
  '#F4E4B6',
  '#D8B6F4',
  '#F4CBB6',
];

export function WorkspaceSelector() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: workspaces, isLoading } = useWorkspacesQuery();
  const createMutation = useCreateWorkspace();
  const updateMutation = useUpdateWorkspace();
  const deleteMutation = useDeleteWorkspace();
  const pushHistory = useHistoryStore((s) => s.push);
  const exportMutation = useExportWorkspace();
  const exportMdMutation = useExportWorkspaceMarkdown();
  const exportPdfMutation = useExportWorkspacePdf();
  const exportWordMutation = useExportWorkspaceWord();
  const exportEpubMutation = useExportWorkspaceEpub();
  const importMutation = useImportWorkspace();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Workspace | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', coverColor: '' });
  const [form, setForm] = useState({
    name: '',
    description: '',
    template: 'blank' as WorkspaceTemplate,
  });

  const filtered = (workspaces ?? []).filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const ws = await createMutation.mutateAsync({
      name: form.name.trim(),
      description: form.description.trim(),
      template: form.template,
    });
    setCreateOpen(false);
    setForm({ name: '', description: '', template: 'blank' });
    navigate(`/workspaces/${ws.id}/timeline`);
  };

  const handleEditSave = async () => {
    if (!editTarget || !editForm.name.trim()) return;
    const previous = editTarget;
    const next: Workspace = {
      ...previous,
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      coverColor: editForm.coverColor,
    };
    await updateMutation.mutateAsync({
      id: next.id,
      name: next.name,
      description: next.description,
      coverColor: next.coverColor,
    });
    pushHistory(makeUpdateWorkspaceAction(next.id, previous, next));
    setEditTarget(null);
  };

  const handleExport = async (id: string) => {
    const bundle = await exportMutation.mutateAsync(id);
    downloadJSON(`plotline-${id}.json`, bundle);
  };

  const handleExportMarkdown = async (id: string, name: string) => {
    const md = await exportMdMutation.mutateAsync(id);
    downloadText(`${name}.md`, md);
  };

  const handleExportPdf = async (id: string, name: string) => {
    const bytes = await exportPdfMutation.mutateAsync(id);
    downloadBlob(`${name}.pdf`, bytes, 'application/pdf');
  };

  const handleExportWord = async (id: string, name: string) => {
    const bytes = await exportWordMutation.mutateAsync(id);
    downloadBlob(`${name}.docx`, bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  };

  const handleExportEpub = async (id: string, name: string) => {
    const bytes = await exportEpubMutation.mutateAsync(id);
    downloadBlob(`${name}.epub`, bytes, 'application/epub+zip');
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    try {
      const bundle = JSON.parse(text) as WorkspaceBundle;
      await importMutation.mutateAsync(bundle);
    } catch {
      // toast 错误由 onError 处理
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-bg-base">
      <header
        className="h-14 flex items-center justify-between px-6 border-b border-border bg-bg-surface"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-[8px] bg-accent/15 grid place-items-center shadow-sm">
            <BrandMark size={22} title={t('app.name')} />
          </span>
          <div>
            <h1 className="text-base font-semibold text-text-primary leading-tight">
              {t('app.name')}
            </h1>
            <p className="text-[11px] text-text-secondary leading-tight">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.settings')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent
              title={t('settings.title')}
              className="max-w-2xl"
            >
              <SettingsQuickPanel />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 p-6 overflow-auto">
        <section className="flex flex-col gap-4 min-w-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-text-primary">{t('workspace.title')}</h2>
              <p className="text-sm text-text-secondary mt-0.5">{t('workspace.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('workspace.search')}
                  className="pl-9 w-56"
                />
              </div>
              <label className="inline-flex">
                <Button variant="outline" size="md" className="gap-2 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('workspace.import')}</span>
                </Button>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImport(f);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              <Button
                onClick={() => setCreateOpen(true)}
                className="gap-2"
                data-testid="create-workspace-btn"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('workspace.create')}</span>
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-44 rounded-[8px]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={
                <AppIcon size="lg" tone="accent">
                  <BrandMark size={28} />
                </AppIcon>
              }
              title={t('workspace.empty.title')}
              description={t('workspace.empty.description')}
              action={
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('workspace.empty.cta')}
                </Button>
              }
            />
          ) : (
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {filtered.map((w) => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={TRANSITION}
                  >
                    <Card hover className="group cursor-pointer overflow-hidden" onClick={() => navigate(`/workspaces/${w.id}/timeline`)}>
                      <div
                        className="h-16 w-full"
                        style={{
                          background: `linear-gradient(135deg, ${w.coverColor} 0%, ${w.coverColor}80 100%)`,
                        }}
                      />
                      <CardContent className="pt-4">
                        <h3 className="text-base font-semibold text-text-primary truncate">
                          {w.name}
                        </h3>
                        <p className="text-xs text-text-secondary mt-1 min-h-[2.5em] line-clamp-2">
                          {truncate(w.description || t('workspace.subtitle'), 60)}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-[11px] text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Clock4 className="h-3 w-3" />
                            {relativeTime(w.updatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[11px] text-text-secondary">
                            {t('workspace.createdAt', { date: relativeTime(w.createdAt) })}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTarget(w);
                                setEditForm({
                                  name: w.name,
                                  description: w.description,
                                  coverColor: w.coverColor,
                                });
                              }}
                              className="text-text-secondary hover:text-accent p-1 rounded transition-colors"
                              title={t('workspace.edit')}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleExportMarkdown(w.id, w.name);
                              }}
                              className="text-text-secondary hover:text-accent p-1 rounded transition-colors"
                              title="导出 Markdown"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleExport(w.id);
                              }}
                              className="text-text-secondary hover:text-accent p-1 rounded transition-colors"
                              title={t('workspace.export')}
                            >
                              <Upload className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(w.id);
                              }}
                              className="text-text-secondary hover:text-red-500 p-1 rounded transition-colors"
                              title={t('workspace.delete')}
                            >
                              <Plus className="h-3.5 w-3.5 rotate-45" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        <aside className="hidden lg:flex flex-col gap-3">
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <BrandMark size={16} className="text-accent" />
                {t('workspace.quickActions')}
              </h3>
                <div className="flex flex-col gap-2 mt-3">
                  <Button
                    variant="secondary"
                    className="justify-start"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    {t('workspace.create')}
                  </Button>
                  <label className="inline-flex">
                    <Button variant="secondary" className="justify-start cursor-pointer w-full">
                      <Upload className="h-4 w-4" />
                      {t('workspace.import')}
                    </Button>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleImport(f);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <Button
                    variant="secondary"
                    className="justify-start"
                    onClick={() => {
                      const ws = (workspaces ?? [])[0];
                      if (ws) void handleExportMarkdown(ws.id, ws.name);
                    }}
                    disabled={(workspaces ?? []).length === 0}
                  >
                    <FileText className="h-4 w-4" />
                    {t('workspace.exportMarkdown')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="justify-start"
                    onClick={() => {
                      const ws = (workspaces ?? [])[0];
                      if (ws) void handleExportPdf(ws.id, ws.name);
                    }}
                    disabled={(workspaces ?? []).length === 0}
                  >
                    <FileText className="h-4 w-4" />
                    {t('workspace.exportPdf')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="justify-start"
                    onClick={() => {
                      const ws = (workspaces ?? [])[0];
                      if (ws) void handleExportWord(ws.id, ws.name);
                    }}
                    disabled={(workspaces ?? []).length === 0}
                  >
                    <FileText className="h-4 w-4" />
                    {t('workspace.exportWord')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="justify-start"
                    onClick={() => {
                      const ws = (workspaces ?? [])[0];
                      if (ws) void handleExportEpub(ws.id, ws.name);
                    }}
                    disabled={(workspaces ?? []).length === 0}
                  >
                    <FileText className="h-4 w-4" />
                    {t('workspace.exportEpub')}
                  </Button>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent" />
                {t('nav.workspaces')}
              </h3>
              <div className="flex flex-col gap-1 mt-3">
                {(workspaces ?? []).slice(0, 5).map((w) => (
                  <button
                    key={w.id}
                    onClick={() => navigate(`/workspaces/${w.id}/timeline`)}
                    className="text-left text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded px-2 py-1.5 transition-colors truncate"
                  >
                    {w.name}
                  </button>
                ))}
                {(workspaces ?? []).length === 0 && (
                  <p className="text-xs text-text-secondary/60 px-2 py-1.5">
                    {t('workspace.empty.title')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                {t('workspace.coreFeatures')}
              </h3>
              <ul className="text-xs text-text-secondary mt-3 space-y-1.5">
                <li>• 时间轴、轨道、事件</li>
                <li>• 角色档案与关系</li>
                <li>• 大纲、统计、笔记</li>
                <li>• 三套暖色主题</li>
                <li>• JSON / Markdown 导入/导出</li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title={t('workspace.create')} className="max-w-xl">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.form.name')}
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('workspace.form.namePlaceholder')}
                className="mt-1.5"
                autoFocus
                data-testid="workspace-name-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.form.description')}{' '}
                <span className="text-text-secondary text-xs">({t('common.optional')})</span>
              </label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t('workspace.form.descriptionPlaceholder')}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.form.template')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.value}
                    onClick={() => setForm((f) => ({ ...f, template: tpl.value }))}
                    className={`text-left p-3 rounded-[6px] border transition-all ${
                      form.template === tpl.value
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:bg-bg-elevated'
                    }`}
                  >
                    <div className="text-sm font-medium text-text-primary">
                      {t(tpl.labelKey)}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {t(tpl.descKey)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleCreate}
                loading={createMutation.isPending}
                disabled={!form.name.trim()}
                data-testid="workspace-submit"
              >
                {t('common.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t('workspace.delete')}
        description={t('workspace.deleteConfirm', {
          name: workspaces?.find((w) => w.id === deleteTarget)?.name ?? '',
        })}
        confirmText={t('common.delete')}
        destructive
        onConfirm={() => {
          if (deleteTarget) void deleteMutation.mutateAsync(deleteTarget);
        }}
      />

      <Dialog open={editTarget !== null} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent title={t('workspace.editTitle')} className="max-w-xl">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.form.name')}
              </label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('workspace.form.namePlaceholder')}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.form.description')}{' '}
                <span className="text-text-secondary text-xs">({t('common.optional')})</span>
              </label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t('workspace.form.descriptionPlaceholder')}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                {t('workspace.coverColor')}
              </label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COVER_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditForm((f) => ({ ...f, coverColor: c }))}
                    className={cn(
                      'h-8 w-8 rounded-full transition-transform flex items-center justify-center',
                      editForm.coverColor === c
                        ? 'ring-2 ring-offset-2 ring-text-primary/40 scale-110'
                        : 'hover:scale-110',
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  >
                    {editForm.coverColor === c && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleEditSave}
                loading={updateMutation.isPending}
                disabled={!editForm.name.trim()}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 设置快速面板：用于工作区选择器内的临时设置入口。 */
function SettingsQuickPanel() {
  const { t } = useI18n();
  return (
    <div className="text-sm text-text-secondary">
      <p>{t('settings.title')} - 完整设置请进入工作区后访问。</p>
    </div>
  );
}
