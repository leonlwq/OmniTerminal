import { useCallback } from 'react';

interface UseCommandPaletteActionsOptions {
  resetSessionFormData: (parentId?: string) => void;
  setModalMode: (mode: 'create' | 'edit') => void;
  setIsModalOpen: (open: boolean) => void;
  handleLocalShell: () => void;
  setAiCopilotMode: (mode: 'command' | 'diagnose' | 'script' | 'explain') => void;
  setIsAICopilotOpen: (open: boolean) => void;
  handleToggleSftp: () => void;
  setSplitMode: (mode: 'none' | 'vertical' | 'horizontal' | 'grid2x2') => void;
  setIsBroadcast: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLocked: (locked: boolean) => void;
  activeTabId: string | null;
  setIsImportModalOpen: (open: boolean) => void;
  handleExportSSHConfig: () => void;
  setIsHostMonitorOpen: (open: boolean) => void;
  setIsRemoteOpsOpen: (open: boolean) => void;
  setIsRealtimeLogOpen: (open: boolean) => void;
  setIsTunnelMonitorOpen: (open: boolean) => void;
  setIsCloudSyncOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
}

export function useCommandPaletteActions({
  resetSessionFormData,
  setModalMode,
  setIsModalOpen,
  handleLocalShell,
  setAiCopilotMode,
  setIsAICopilotOpen,
  handleToggleSftp,
  setSplitMode,
  setIsBroadcast,
  setIsLocked,
  activeTabId,
  setIsImportModalOpen,
  handleExportSSHConfig,
  setIsHostMonitorOpen,
  setIsRemoteOpsOpen,
  setIsRealtimeLogOpen,
  setIsTunnelMonitorOpen,
  setIsCloudSyncOpen,
  setIsSettingsOpen,
}: UseCommandPaletteActionsOptions) {
  const handlePaletteAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'new_session':
        resetSessionFormData();
        setModalMode('create');
        setIsModalOpen(true);
        break;
      case 'new_local_shell':
        handleLocalShell();
        break;
      case 'open_ai':
        setAiCopilotMode('command');
        setIsAICopilotOpen(true);
        break;
      case 'toggle_sftp':
        handleToggleSftp();
        break;
      case 'split_vertical':
        setSplitMode('vertical');
        break;
      case 'split_horizontal':
        setSplitMode('horizontal');
        break;
      case 'split_grid':
        setSplitMode('grid2x2');
        break;
      case 'close_split':
        setSplitMode('none');
        break;
      case 'toggle_broadcast':
        setIsBroadcast(prev => !prev);
        break;
      case 'lock_workspace':
        setIsLocked(true);
        break;
      case 'screenshot':
        if (activeTabId) {
          const canvas = document.querySelector(`[data-tab-id="${activeTabId}"] canvas`) as HTMLCanvasElement;
          if (canvas) {
            const a = document.createElement('a');
            a.download = `terminal_${Date.now()}.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
          }
        }
        break;
      case 'import_openssh':
        setIsImportModalOpen(true);
        break;
      case 'export_openssh':
        handleExportSSHConfig();
        break;
      case 'open_host_monitor':
        setIsHostMonitorOpen(true);
        break;
      case 'open_remote_ops':
        setIsRemoteOpsOpen(true);
        break;
      case 'open_realtime_log':
        setIsRealtimeLogOpen(true);
        break;
      case 'open_tunnels':
        setIsTunnelMonitorOpen(true);
        break;
      case 'open_cloud_sync':
        setIsCloudSyncOpen(true);
        break;
      case 'open_settings':
        setIsSettingsOpen(true);
        break;
      default:
        break;
    }
  }, [
    resetSessionFormData,
    setModalMode,
    setIsModalOpen,
    handleLocalShell,
    setAiCopilotMode,
    setIsAICopilotOpen,
    handleToggleSftp,
    setSplitMode,
    setIsBroadcast,
    setIsLocked,
    activeTabId,
    setIsImportModalOpen,
    handleExportSSHConfig,
    setIsHostMonitorOpen,
    setIsRemoteOpsOpen,
    setIsRealtimeLogOpen,
    setIsTunnelMonitorOpen,
    setIsCloudSyncOpen,
    setIsSettingsOpen,
  ]);

  return { handlePaletteAction };
}
