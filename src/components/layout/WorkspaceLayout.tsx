import { useEffect, useState } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Timer } from 'lucide-react';

import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { HistoryControls } from './HistoryControls';
import { SaveStatus } from './SaveStatus';
import { AiAssistantPanel } from './AiAssistantPanel';
import { PomodoroTimer } from '@/components/ui';
import { FirstVisitGuide } from '@/components/onboarding/FirstVisitGuide';
import { cn } from '@/lib/utils';
import { MOTION_BASE, MOTION_SPRING } from '@/lib/motion';
import { APP_VERSION } from '@/lib/version';
import { useUIStore } from '@/stores/ui';
import { useWorkspacesQuery } from '@/features/workspace/hooks';

export function WorkspaceLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();
  const [pomoOpen, setPomoOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { aiPanelOpen, setAiPanelOpen, firstWorkspaceVisit, setFirstWorkspaceVisit, enhancedAnimations } = useUIStore();
  const reduced = useReducedMotion();
  const viewTransition = reduced ? { duration: 0 } : enhancedAnimations ? MOTION_SPRING : MOTION_BASE;
  const { data: workspaces = [] } = useWorkspacesQuery();
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);

  useEffect(() => {
    if (workspaceId && firstWorkspaceVisit) {
      setGuideOpen(true);
      setFirstWorkspaceVisit(false);
    }
  }, [workspaceId, firstWorkspaceVisit, setFirstWorkspaceVisit]);

  if (!workspaceId) return null;

  const handleGuideClose = () => {
    setGuideOpen(false);
    setFirstWorkspaceVisit(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base">
      <Sidebar workspaceId={workspaceId} />
      <div className="flex flex-1 flex-col min-w-0">
        <motion.div
          key={location.pathname}
          initial={reduced ? { opacity: 1 } : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={viewTransition}
          className="flex-1 min-h-0 flex flex-col"
        >
          <Outlet />
        </motion.div>
        <StatusBar
          left={
            <div className="flex items-center gap-3">
              <HistoryControls />
              <SaveStatus />
            </div>
          }
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
        <PomodoroTimer open={pomoOpen} onClose={() => setPomoOpen(false)} workspaceName={currentWorkspace?.name} />
        <AiAssistantPanel
          open={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          workspaceId={workspaceId}
        />
        <FirstVisitGuide open={guideOpen} onClose={handleGuideClose} />
      </div>
    </div>
  );
}
