import {
  Lightbulb,
  MessageSquare,
  Palette,
  PenLine,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';
import type { AiAgentId } from '@/types';

import { AI_AGENTS } from '../prompts';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  PenLine,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Users,
  Palette,
};

interface AgentSelectorProps {
  currentAgentId: AiAgentId;
  onSelect: (id: AiAgentId) => void;
}

export function AgentSelector({ currentAgentId, onSelect }: AgentSelectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-1 p-2" data-testid="ai-agent-selector">
      {AI_AGENTS.map((agent) => {
        const Icon = ICON_MAP[agent.icon] ?? MessageSquare;
        const active = agent.id === currentAgentId;
        return (
          <button
            key={agent.id}
            type="button"
            data-testid={`ai-agent-${agent.id}`}
            onClick={() => onSelect(agent.id)}
            className={cn(
              'w-full flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-xs transition-colors',
              active
                ? 'bg-accent/10 text-accent border border-accent/30'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary border border-transparent',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium truncate">{t(agent.labelKey)}</div>
              <div className="text-[10px] text-text-secondary/80 truncate">
                {t(agent.descriptionKey)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
