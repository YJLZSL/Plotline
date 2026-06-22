import { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Timer } from 'lucide-react';

import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { HistoryControls } from './HistoryControls';
import { AiAssistantPanel } from './AiAssistantPanel';
import { PomodoroTimer } from '@/components/ui';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';
import { useUIStore } from '@/stores/ui';

export function WorkspaceLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [pomoOpen, setPomoOpen] = useState(false);
  const { aiPanelOpen, setAiPanelOpen } = useUIStore();
  if (!workspaceId) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base">
      <Sidebar workspaceId={workspaceId} />
      <div className="flex flex-1 flex-col min-w-0">
        <Outlet />
        <StatusBar
          left={<HistoryControls />}
          right={
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPomoOpen((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors',
                  pomoOpen && 'text-accent',
                )}
                title="番茄钟"
              >
                <Timer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">番茄钟</span>
              </button>
              <span>v{APP_VERSION}</span>
            </div>
          }
        />
        <PomodoroTimer open={pomoOpen} onClose={() => setPomoOpen(false)} />
        <AiAssistantPanel
          open={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  );
}
