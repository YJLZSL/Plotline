import { useEffect, useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';

import { AppProviders } from './app/AppProviders';
import { AppRoutes } from './app/AppRoutes';
import { SplashOverlay } from './components/layout/SplashOverlay';
import { ConfirmDialog } from './components/ui/Dialog';
import { useI18n } from './hooks/useI18n';
import { checkForUpdates } from './features/settings/updater';
import { toastError, toastInfo } from './stores/toast';
import { useUIStore } from './stores/ui';
import { APP_VERSION } from './lib/version';

function EnhancedAnimationSync() {
  const enhancedAnimations = useUIStore((s) => s.enhancedAnimations);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute(
      'data-enhanced-animations',
      enhancedAnimations ? 'true' : 'false',
    );
  }, [enhancedAnimations]);
  return null;
}

function BeforeUnloadGuard() {
  const isMutating = useIsMutating();
  useEffect(() => {
    if (isMutating === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isMutating]);
  return null;
}

function UpdatePrompt() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<{ version?: string; install?: () => Promise<void> }>({});

  useEffect(() => {
    let mounted = true;
    checkForUpdates(APP_VERSION)
      .then(({ info: updateInfo, install }) => {
        if (!mounted || !updateInfo.available || !install) return;
        setInfo({ version: updateInfo.latestVersion, install });
        setOpen(true);
      })
      .catch(() => {
        // 静默忽略启动时的离线/网络错误，避免打扰用户
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleInstall = async () => {
    if (!info.install) return;
    try {
      toastInfo(t('settings.updateInstalling'));
      await info.install();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={t('settings.updatePromptTitle')}
      description={t('settings.updatePromptDesc', { version: info.version ?? '?' })}
      confirmText={t('settings.updatePromptInstall')}
      cancelText={t('settings.updatePromptLater')}
      onConfirm={handleInstall}
      destructive={false}
    />
  );
}

export default function App() {
  return (
    <AppProviders>
      <EnhancedAnimationSync />
      <BeforeUnloadGuard />
      <SplashOverlay />
      <UpdatePrompt />
      <AppRoutes />
    </AppProviders>
  );
}
