import { Link, useNavigate } from 'react-router-dom';
import { Bot, Home, Search } from 'lucide-react';

import { Input } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { useUIStore } from '@/stores/ui';

interface ToolbarProps {
  title: string;
  workspaceId: string;
  workspaceName?: string;
  right?: React.ReactNode;
}

export function Toolbar({ title, workspaceId, workspaceName, right }: ToolbarProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <header
      className="h-12 flex items-center gap-3 px-4 border-b border-border bg-bg-surface flex-shrink-0"
      data-tauri-drag-region
    >
      <button
        onClick={() => navigate('/')}
        className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
        title={t('nav.workspaces')}
      >
        <Home className="h-4 w-4" />
      </button>
      <div className="flex items-baseline gap-2 min-w-0">
        <Link
          to={`/workspaces/${workspaceId}/timeline`}
          className="text-sm font-semibold text-text-primary hover:text-accent transition-colors truncate"
        >
          {workspaceName ?? '工作区'}
        </Link>
        <span className="text-text-secondary/60">/</span>
        <h1 className="text-sm font-medium text-text-secondary truncate">{title}</h1>
      </div>

      <div className="flex-1 min-w-0" />

      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
        <AiButton />
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
          <Input
            placeholder={t('common.search')}
            className="pl-8 h-8 w-56 text-xs bg-bg-elevated border-transparent focus:border-border"
          />
        </div>

        {right}
      </div>
    </header>
  );
}

function AiButton() {
  const { t } = useI18n();
  const { aiPanelOpen, toggleAiPanel } = useUIStore();
  return (
    <button
      onClick={() => toggleAiPanel()}
      className={
        'flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors px-1.5 py-1 rounded-[5px] ' +
        (aiPanelOpen ? 'text-accent bg-accent/10' : '')
      }
      title={t('ai.title')}
    >
      <Bot className="h-4 w-4" />
      <span className="hidden sm:inline">{t('ai.title')}</span>
    </button>
  );
}
