import { StickyNote, Plus } from 'lucide-react';

import { Button, EmptyState } from '@/components/ui';
import { Toolbar } from '@/components/layout/Toolbar';
import { useI18n } from '@/hooks/useI18n';

interface NotebookViewProps {
  workspaceId: string;
  workspaceName?: string;
}

export function NotebookView({ workspaceId, workspaceName }: NotebookViewProps) {
  const { t } = useI18n();
  return (
    <>
      <Toolbar
        title={t('notebook' as never) || t('nav.notebook')}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        right={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">新建笔记</span>
          </Button>
        }
      />
      <div className="flex-1 grid place-items-center">
        <EmptyState
          icon={<StickyNote className="h-10 w-10" />}
          title={t('nav.notebook')}
          description="笔记与资料库功能将在后续迭代中完善，目前可在工作区中管理时间线、角色和大纲。"
        />
      </div>
    </>
  );
}
