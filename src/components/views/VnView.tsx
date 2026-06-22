import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  X,
  Play,
  ChevronRight,
  Film,
  MessageSquare,
  BookOpen,
  GitBranch,
} from 'lucide-react';

import {
  AppIcon,
  Badge,
  Button,
  EmptyState,
  Input,
  Textarea,
  ConfirmDialog,
} from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { MOTION_BASE, MOTION_FAST } from '@/lib/motion';
import type { Character, VnLine, VnLineType, VnScene } from '@/types';
import {
  useVnScenesQuery,
  useCreateVnScene,
  useDeleteVnScene,
  useUpdateVnScene,
  useVnLinesQuery,
  useCreateVnLine,
  useUpdateVnLine,
  useDeleteVnLine,
} from '@/features/vn/hooks';
import { useCharactersQuery } from '@/features/characters/hooks';

const EMOTIONS: Array<{ value: string; label: string; emoji: string }> = [
  { value: '', label: '默认', emoji: '😐' },
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'sad', label: '悲伤', emoji: '😢' },
  { value: 'angry', label: '愤怒', emoji: '😠' },
  { value: 'surprised', label: '惊讶', emoji: '😲' },
];

const LINE_TYPE_ICONS: Record<VnLineType, React.ComponentType<{ className?: string }>> = {
  dialog: MessageSquare,
  narration: BookOpen,
  choice: GitBranch,
};

interface VnViewProps {
  workspaceId: string;
  workspaceName?: string;
}

export function VnView({ workspaceId, workspaceName }: VnViewProps) {
  const { t } = useI18n();
  const { data: scenes = [], isLoading } = useVnScenesQuery(workspaceId);
  const { data: characters = [] } = useCharactersQuery(workspaceId);
  const createScene = useCreateVnScene(workspaceId);
  const deleteScene = useDeleteVnScene(workspaceId);
  const updateScene = useUpdateVnScene(workspaceId);

  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [confirmDeleteScene, setConfirmDeleteScene] = useState<string | null>(null);

  const selectedScene = scenes.find((s) => s.id === selectedSceneId) ?? null;

  const handleAddScene = async () => {
    const s = await createScene.mutateAsync({
      workspaceId,
      title: t('vn.newScene'),
    });
    setSelectedSceneId(s.id);
  };

  return (
    <>
      <Toolbar
        title={t('vn.title')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <div className="flex items-center gap-2">
            {selectedScene && (
              <Button
                variant={previewMode ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode((v) => !v)}
                className="gap-2"
              >
                <Play className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{previewMode ? t('vn.editMode') : t('vn.previewMode')}</span>
              </Button>
            )}
            <Button size="sm" onClick={handleAddScene} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('vn.addScene')}</span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* 场景列表 */}
        <aside className="w-64 flex-shrink-0 border-r border-border bg-bg-surface overflow-auto">
          <div className="h-11 px-3 flex items-center border-b border-border">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t('vn.scenes')}
            </span>
          </div>
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-9 rounded-[6px]" />
              ))}
            </div>
          ) : scenes.length === 0 ? (
            <div className="p-4">
              <p className="text-xs text-text-secondary/60 text-center">{t('vn.emptyScenes')}</p>
            </div>
          ) : (
            <div className="py-2">
              {scenes.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...MOTION_BASE, delay: Math.min(i * 0.02, 0.1) }}
                  className={cn(
                    'group flex items-center gap-2 px-3 h-10 mx-1 rounded-[6px] cursor-pointer transition-colors',
                    selectedSceneId === s.id
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-primary hover:bg-bg-elevated',
                  )}
                  onClick={() => setSelectedSceneId(s.id)}
                >
                  <Film className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
                  <span className="text-sm truncate flex-1">{s.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteScene(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 p-0.5 rounded transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </aside>

        {/* 编辑器或预览 */}
        {selectedScene ? (
          previewMode ? (
            <VnPreview
              key={selectedScene.id}
              scene={selectedScene}
              characters={characters}
              onExit={() => setPreviewMode(false)}
              onJumpScene={(id) => setSelectedSceneId(id)}
              t={t}
            />
          ) : (
            <VnScriptEditor
              scene={selectedScene}
              characters={characters}
              scenes={scenes}
              onRename={(title) => updateScene.mutateAsync({ id: selectedScene.id, title })}
              t={t}
            />
          )
        ) : (
          <div className="flex-1 grid place-items-center">
            <EmptyState
              icon={
                <AppIcon size="lg" tone="accent">
                  <Film />
                </AppIcon>
              }
              title={t('vn.empty.title')}
              description={t('vn.empty.description')}
              action={
                <Button onClick={handleAddScene} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('vn.addScene')}
                </Button>
              }
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteScene !== null}
        onOpenChange={(v) => !v && setConfirmDeleteScene(null)}
        title={t('common.delete')}
        description={t('vn.scene')}
        destructive
        confirmText={t('common.delete')}
        onConfirm={() => {
          if (confirmDeleteScene) {
            void deleteScene.mutateAsync(confirmDeleteScene);
            if (selectedSceneId === confirmDeleteScene) setSelectedSceneId(null);
          }
        }}
      />
    </>
  );
}

// ===== 剧本编辑器 =====
function VnScriptEditor({
  scene,
  characters,
  scenes,
  onRename,
  t,
}: {
  scene: VnScene;
  characters: Character[];
  scenes: VnScene[];
  onRename: (title: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { data: lines = [], isLoading } = useVnLinesQuery(scene.id);
  const createLine = useCreateVnLine(scene.id);
  const updateLine = useUpdateVnLine(scene.id);
  const deleteLine = useDeleteVnLine(scene.id);

  const [title, setTitle] = useState(scene.title);

  useEffect(() => {
    setTitle(scene.title);
  }, [scene.id, scene.title]);

  const handleAddLine = async (type: VnLineType) => {
    await createLine.mutateAsync({
      sceneId: scene.id,
      lineType: type,
      text: type === 'choice' ? t('vn.newChoice') : '',
      speakerName: type === 'narration' ? '' : '',
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 场景标题栏 */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-border bg-bg-surface">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title !== scene.title) void onRename(title.trim());
          }}
          className="flex-1 max-w-md text-sm font-semibold"
        />
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => handleAddLine('dialog')} className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {t('vn.lineDialog')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddLine('narration')} className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {t('vn.lineNarration')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddLine('choice')} className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            {t('vn.lineChoice')}
          </Button>
        </div>
      </div>

      {/* 台词列表 */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="space-y-2 max-w-2xl mx-auto">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-[8px]" />
            ))}
          </div>
        ) : lines.length === 0 ? (
          <div className="grid place-items-center py-16">
            <p className="text-sm text-text-secondary/60">{t('vn.emptyLines')}</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-2">
            <AnimatePresence initial={false}>
              {lines.map((line, i) => (
                <VnLineRow
                  key={line.id}
                  line={line}
                  index={i}
                  characters={characters}
                  scenes={scenes}
                  currentSceneId={scene.id}
                  onChange={(patch) => updateLine.mutateAsync({ id: line.id, ...patch })}
                  onDelete={() => deleteLine.mutateAsync(line.id)}
                  t={t}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function VnLineRow({
  line,
  index,
  characters,
  scenes,
  currentSceneId,
  onChange,
  onDelete,
  t,
}: {
  line: VnLine;
  index: number;
  characters: Character[];
  scenes: VnScene[];
  currentSceneId: string;
  onChange: (patch: Partial<VnLine>) => void;
  onDelete: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const Icon = LINE_TYPE_ICONS[line.lineType];
  const isChoice = line.lineType === 'choice';
  const isNarration = line.lineType === 'narration';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={MOTION_FAST}
      className={cn(
        'group relative rounded-[8px] border bg-bg-surface p-3 transition-shadow',
        isChoice ? 'border-accent/40' : 'border-border',
        'hover:shadow-[var(--shadow-card)]',
      )}
    >
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 mt-0.5 text-text-secondary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* 说话人 / 旁白 */}
          {!isChoice && (
            <div className="flex items-center gap-2">
              {isNarration ? (
                <span className="text-[11px] text-text-secondary italic">{t('vn.narrationLabel')}</span>
              ) : (
                <>
                  <select
                    value={line.characterId ?? ''}
                    onChange={(e) => onChange({ characterId: e.target.value || null, speakerName: e.target.value ? '' : line.speakerName })}
                    className="h-7 rounded-[4px] border border-border bg-bg-elevated px-2 text-xs"
                  >
                    <option value="">{t('vn.customSpeaker')}</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {!line.characterId && (
                    <Input
                      value={line.speakerName}
                      onChange={(e) => onChange({ speakerName: e.target.value })}
                      placeholder={t('vn.speakerNamePlaceholder')}
                      className="h-7 w-32 text-xs"
                    />
                  )}
                  <select
                    value={line.emotion}
                    onChange={(e) => onChange({ emotion: e.target.value as VnLine['emotion'] })}
                    className="h-7 rounded-[4px] border border-border bg-bg-elevated px-2 text-xs"
                  >
                    {EMOTIONS.map((em) => (
                      <option key={em.value} value={em.value}>{em.emoji} {em.label}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {/* 台词文本 */}
          {isChoice ? (
            <div className="flex items-center gap-2">
              <Input
                value={line.choiceLabel}
                onChange={(e) => onChange({ choiceLabel: e.target.value })}
                placeholder={t('vn.choiceLabelPlaceholder')}
                className="h-8 w-40 text-xs"
              />
              <span className="text-text-secondary">→</span>
              <select
                value={line.choiceTargetSceneId ?? ''}
                onChange={(e) => onChange({ choiceTargetSceneId: e.target.value || null })}
                className="h-8 rounded-[4px] border border-border bg-bg-elevated px-2 text-xs flex-1"
              >
                <option value="">{t('vn.noTarget')}</option>
                {scenes.filter((s) => s.id !== currentSceneId).map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          ) : null}

          <Textarea
            value={line.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder={isChoice ? t('vn.choiceTextPlaceholder') : t('vn.textPlaceholder')}
            className="text-sm min-h-[44px] resize-y"
          />
        </div>

        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-500 p-1 rounded transition-all flex-shrink-0"
          title={t('common.delete')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="absolute top-1 left-1 text-[9px] text-text-secondary/40">{index + 1}</span>
    </motion.div>
  );
}

// ===== VN 预览模式 =====
function VnPreview({
  scene,
  characters,
  onExit,
  onJumpScene,
  t,
}: {
  scene: VnScene;
  characters: Character[];
  onExit: () => void;
  onJumpScene: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { data: lines = [] } = useVnLinesQuery(scene.id);
  const charById = new Map(characters.map((c) => [c.id, c]));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showChoices, setShowChoices] = useState(false);

  const currentLine = lines[currentIdx] ?? null;
  const isLast = currentIdx >= lines.length - 1;

  useEffect(() => {
    setCurrentIdx(0);
    setShowChoices(false);
  }, [scene.id]);

  const advance = () => {
    if (!currentLine) return;
    if (currentLine.lineType === 'choice' && !showChoices) {
      setShowChoices(true);
      return;
    }
    if (isLast) return;
    setCurrentIdx((i) => i + 1);
    setShowChoices(false);
  };

  const handleChoice = (target: string | null) => {
    if (target) {
      onJumpScene(target);
    } else if (!isLast) {
      setCurrentIdx((i) => i + 1);
      setShowChoices(false);
    }
  };

  const speaker = currentLine?.characterId
    ? charById.get(currentLine.characterId) ?? null
    : null;
  const speakerName = speaker?.name ?? currentLine?.speakerName ?? '';
  const emotionEmoji = EMOTIONS.find((e) => e.value === currentLine?.emotion)?.emoji ?? '';

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style={{
        background: scene.background
          ? `linear-gradient(180deg, ${scene.background}20 0%, var(--bg-base) 70%)`
          : 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-base) 70%)',
      }}
      onClick={advance}
    >
      {/* 顶部场景标题 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <Badge variant="outline" className="text-xs">{scene.title}</Badge>
      </div>

      {/* 退出按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        className="absolute top-4 right-4 text-text-secondary hover:text-text-primary p-2 rounded-[6px] hover:bg-bg-surface transition-colors"
        title={t('vn.editMode')}
      >
        <X className="h-4 w-4" />
      </button>

      {/* 对话框区域 */}
      <AnimatePresence mode="wait">
        {currentLine && (
          <motion.div
            key={currentLine.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={MOTION_BASE}
            className="w-full max-w-2xl"
          >
            {currentLine.lineType === 'narration' ? (
              <div className="text-center py-8">
                <p className="text-base text-text-secondary italic leading-relaxed whitespace-pre-wrap">
                  {currentLine.text}
                </p>
              </div>
            ) : currentLine.lineType === 'choice' && showChoices ? (
              <div className="flex flex-col gap-2 py-4" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm text-text-secondary text-center mb-2">{currentLine.choiceLabel || t('vn.choose')}</p>
                <Button
                  variant="outline"
                  onClick={() => handleChoice(currentLine.choiceTargetSceneId)}
                  className="gap-2"
                >
                  {currentLine.text || t('vn.continue')}
                  {currentLine.choiceTargetSceneId && (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="rounded-[12px] bg-bg-surface/95 backdrop-blur-sm border border-border shadow-[var(--shadow-elevated)] p-6">
                {speakerName && (
                  <div className="flex items-center gap-2 mb-3">
                    {speaker && (
                      <span
                        className="h-8 w-8 rounded-full grid place-items-center text-white text-xs font-bold"
                        style={{ backgroundColor: speaker.color }}
                      >
                        {speaker.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-text-primary">
                      {speakerName}
                    </span>
                    {emotionEmoji && <span className="text-base">{emotionEmoji}</span>}
                  </div>
                )}
                <p className="text-base text-text-primary leading-relaxed whitespace-pre-wrap min-h-[2em]">
                  {currentLine.text || '…'}
                </p>
                {!isLast && (
                  <div className="flex justify-end mt-3">
                    <ChevronRight className="h-4 w-4 text-text-secondary animate-pulse" />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部进度 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-text-secondary">
        <span>{currentIdx + 1} / {lines.length}</span>
        {isLast && currentLine && (
          <Badge variant="outline" className="text-[10px]">{t('vn.sceneEnd')}</Badge>
        )}
      </div>
    </div>
  );
}
