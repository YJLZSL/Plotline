import { useEffect, useState } from 'react';

import { AppProviders } from './app/AppProviders';
import { AppRoutes } from './app/AppRoutes';
import { SplashOverlay } from './components/layout/SplashOverlay';
import { ConfirmDialog } from './components/ui/Dialog';
import { useI18n } from './hooks/useI18n';
import { checkForUpdates } from './features/settings/updater';
import { toastError, toastInfo } from './stores/toast';

const APP_VERSION = '1.4.0';

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
      <SplashOverlay />
      <UpdatePrompt />
      <AppRoutes />
    </AppProviders>
  );
}
