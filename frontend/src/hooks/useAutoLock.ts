import { useState, useRef, useCallback, useEffect } from 'react';
import { LockApp } from '../../wailsjs/go/app/App';
import { models } from '../../wailsjs/go/models';
import { useI18n } from '../i18n/I18nContext';

interface UseAutoLockOptions {
  settings: models.AppSettings;
  setIsSettingsOpen: (open: boolean) => void;
  setSettingsInitialTab: (tab: 'appearance' | 'security' | 'quickCmds' | 'interaction' | 'statusBar' | 'template' | 'os' | 'about') => void;
}

export function useAutoLock({
  settings,
  setIsSettingsOpen,
  setSettingsInitialTab,
}: UseAutoLockOptions) {
  const { t } = useI18n();
  const [isLocked, setIsLocked] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }
    if (settings.hasMasterPassword && settings.autoLockTimeoutMinutes && settings.autoLockTimeoutMinutes > 0 && !isLocked) {
      idleTimerRef.current = window.setTimeout(() => {
        LockApp().then(() => {
          setIsLocked(true);
        }).catch(() => {});
      }, settings.autoLockTimeoutMinutes * 60000);
    }
  }, [settings.hasMasterPassword, settings.autoLockTimeoutMinutes, isLocked]);

  useEffect(() => {
    const handleActivity = () => resetIdleTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const handleLockWorkspace = useCallback(async () => {
    if (!settings.hasMasterPassword) {
      if (window.confirm(t('autoLock.noMasterPwdConfirm'))) {
        setSettingsInitialTab('security');
        setIsSettingsOpen(true);
      }
      return;
    }
    try {
      await LockApp();
    } catch (err: any) {
      console.warn("LockApp:", err);
    }
    setIsLocked(true);
  }, [settings.hasMasterPassword, setSettingsInitialTab, setIsSettingsOpen]);

  return {
    isLocked,
    setIsLocked,
    handleLockWorkspace,
  };
}
