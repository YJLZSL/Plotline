import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { useUIStore } from '@/stores/ui';
import { useAiContextStore, type AiPromptSuggestion, type AiSelection } from '@/stores/aiContext';

interface AiToolbarButtonProps {
  /** 当前功能视图标识，如 timeline / characters */
  view: string;
  /** 视图的显示名称 */
  viewLabel: string;
  /** 当前选中的创作对象 */
  selection?: AiSelection | null;
  /** 该功能下的 AI 建议提示词 */
  suggestions?: AiPromptSuggestion[];
}

export function AiToolbarButton({
  view,
  viewLabel,
  selection,
  suggestions,
}: AiToolbarButtonProps) {
  const { t } = useI18n();
  const setAiPanelOpen = useUIStore((s) => s.setAiPanelOpen);
  const setContext = useAiContextStore((s) => s.setContext);

  const handleClick = () => {
    setContext({
      view,
      viewLabel,
      selection: selection ?? null,
      suggestions: suggestions ?? [],
    });
    setAiPanelOpen(true);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      title={t('ai.ask')}
      className="gap-1.5"
      data-testid="ai-toolbar-btn"
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t('ai.ask')}</span>
    </Button>
  );
}
