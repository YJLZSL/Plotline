import { BookOpen, Calendar, FileText, Globe, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';
import type { AiAssistantContextMode } from '@/types';

interface ContextOption {
  mode: AiAssistantContextMode;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CONTEXT_OPTIONS: ContextOption[] = [
  { mode: 'current_event', labelKey: 'aiAssistant.contextEvent', icon: Calendar },
  { mode: 'current_character', labelKey: 'aiAssistant.contextCharacter', icon: FileText },
  { mode: 'current_outline', labelKey: 'aiAssistant.contextOutline', icon: BookOpen },
  { mode: 'whole_workspace', labelKey: 'aiAssistant.contextWhole', icon: Globe },
  { mode: 'none', labelKey: 'aiAssistant.contextNone', icon: X },
];

interface ContextSelectorProps {
  currentMode: AiAssistantContextMode;
  onSelect: (mode: AiAssistantContextMode) => void;
}

export function ContextSelector({ currentMode, onSelect }: ContextSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1" data-testid="ai-context-selector">
      {CONTEXT_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.mode === currentMode;
        return (
          <button
            key={option.mode}
            type="button"
            data-testid={`ai-context-${option.mode}`}
            onClick={() => onSelect(option.mode)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[10px] transition-colors border',
              active
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-bg-elevated text-text-secondary border-border hover:text-text-primary hover:border-accent/30',
            )}
          >
            <Icon className="h-3 w-3" />
            {t(option.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
