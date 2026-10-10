import { useState, useCallback } from 'react';
import { models } from '../../wailsjs/go/models';
import { 
  GetSettings, 
  EnableMasterPassword,
  DisableMasterPassword,
  GetAuthProfiles,
  SaveSettings
} from '../../wailsjs/go/app/App';

export function useSettings() {
  const [settings, setSettings] = useState<models.AppSettings>(new models.AppSettings({
    themeName: 'VS Code Dark Modern',
    fontFamily: 'Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    hasMasterPassword: false,
    masterPasswordSalt: '',
    validationBlock: '',
    quickCommandSets: [],
    activeCommandSetID: '',
    macros: [],
    enableMiniTelemetry: true,
    miniTelemetryIntervalSec: 3,
  } as any));

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isKeyManagerOpen, setIsKeyManagerOpen] = useState(false);
  const [isAuthManagerOpen, setIsAuthManagerOpen] = useState(false);
  const [authProfiles, setAuthProfiles] = useState<models.AuthProfile[]>([]);

  const loadSettings = useCallback(() => {
    GetSettings()
      .then((res) => {
        if (res) {
          setSettings(res);
        }
      })
      .catch((err) => {
        console.error("加载设置失败:", err);
      });
  }, []);

  const loadAuthProfiles = useCallback(() => {
    GetAuthProfiles()
      .then(p => setAuthProfiles(p || []))
      .catch(err => console.error("加载认证配置失败:", err));
  }, []);

  const handleEnableMasterPassword = useCallback((pwd: string): Promise<void> => {
    return EnableMasterPassword(pwd).then(() => {
      loadSettings();
      loadAuthProfiles();
    });
  }, [loadSettings, loadAuthProfiles]);

  const toggleFavoriteSession = useCallback((sessionId: string) => {
    const favs = settings.favoriteSessionIds || [];
    const newFavs = favs.includes(sessionId) ? favs.filter(id => id !== sessionId) : [...favs, sessionId];
    const newSettings = new models.AppSettings({ ...settings, favoriteSessionIds: newFavs });
    setSettings(newSettings);
    SaveSettings(newSettings).catch(e => console.error("保存收藏失败", e));
  }, [settings]);

  const handleDisableMasterPassword = useCallback((pwd: string): Promise<void> => {

    return DisableMasterPassword(pwd).then(() => {
      loadSettings();
      loadAuthProfiles();
    });
  }, [loadSettings, loadAuthProfiles]);

  return {
    settings,
    setSettings,
    loadSettings,
    isSettingsOpen,
    setIsSettingsOpen,
    isKeyManagerOpen,
    setIsKeyManagerOpen,
    isAuthManagerOpen,
    setIsAuthManagerOpen,
    authProfiles,
    setAuthProfiles,
    loadAuthProfiles,
    handleEnableMasterPassword,
    handleDisableMasterPassword,
    toggleFavoriteSession
  };
}
