import React from 'react';
import { Server, Box, HardDrive, Network, KeyRound, ArrowDown, FileText, Lock, Settings, Sparkles } from 'lucide-react';
import { SftpTask } from './TaskQueueDrawer';
import { useI18n } from '../i18n/I18nContext';

export interface ActivityBarProps {
  activeDockPanel: 'sessions' | 'containers' | 'sftp' | 'none';
  setActiveDockPanel: React.Dispatch<React.SetStateAction<'sessions' | 'containers' | 'sftp' | 'none'>>;
  toggleSftpPanel: () => void;
  activeTabId: string | null;
  openSftpTabs: string[];
  setIsTunnelMonitorOpen: (open: boolean) => void;
  setIsKeyManagerOpen: (open: boolean) => void;
  isTasksOpen: boolean;
  setIsTasksOpen: (open: boolean) => void;
  sftpTasks: SftpTask[];
  setIsLogViewerOpen: (open: boolean) => void;
  handleLockWorkspace: () => void;
  setIsSettingsOpen: (open: boolean) => void;
  isAIChatDrawerOpen?: boolean;
  setIsAIChatDrawerOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeDockPanel,
  setActiveDockPanel,
  toggleSftpPanel,
  activeTabId,
  openSftpTabs,
  setIsTunnelMonitorOpen,
  setIsKeyManagerOpen,
  isTasksOpen,
  setIsTasksOpen,
  sftpTasks,
  setIsLogViewerOpen,
  handleLockWorkspace,
  setIsSettingsOpen,
  isAIChatDrawerOpen,
  setIsAIChatDrawerOpen,
}) => {
  const { t } = useI18n();

  return (
    <div className="w-12 bg-app-surface border-r border-app-border flex flex-col items-center py-2 shrink-0 z-10 justify-between select-none">
      {/* 上半部分：主工作区导航 */}
      <div className="flex flex-col items-center space-y-1 w-full">
        <button
          onClick={() => setActiveDockPanel(activeDockPanel === 'sessions' ? 'none' : 'sessions')}
          className={`relative flex items-center justify-center w-10 h-10 transition-colors ${
            activeDockPanel === 'sessions'
              ? 'text-app-text'
              : 'text-app-text-muted hover:text-app-text'
          }`}
          title={t('activity.sessions') || "会话管理器 (Ctrl+Alt+S)"}
        >
          <Server className="h-5 w-5" />
          {activeDockPanel === 'sessions' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-app-accent" />
          )}
        </button>

        <button
          onClick={() => setActiveDockPanel(activeDockPanel === 'containers' ? 'none' : 'containers')}
          className={`relative flex items-center justify-center w-10 h-10 transition-colors ${
            activeDockPanel === 'containers'
              ? 'text-app-text'
              : 'text-app-text-muted hover:text-app-text'
          }`}
          title={t('activity.containers') || "Docker / K8s 容器资源管理器 (Ctrl+Shift+C)"}
        >
          <Box className="h-5 w-5" />
          {activeDockPanel === 'containers' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-app-accent" />
          )}
        </button>

        <button
          onClick={toggleSftpPanel}
          className={`relative flex items-center justify-center w-10 h-10 transition-colors ${
            activeTabId && openSftpTabs.includes(activeTabId)
              ? 'text-app-text'
              : 'text-app-text-muted hover:text-app-text'
          }`}
          title={t('activity.sftp') || "SFTP 文件传输面板"}
        >
          <HardDrive className="h-5 w-5" />
          {activeTabId && openSftpTabs.includes(activeTabId) && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-app-accent" />
          )}
        </button>

        <button
          onClick={() => setIsTunnelMonitorOpen(true)}
          className="flex items-center justify-center w-10 h-10 text-app-text-muted hover:text-app-text transition-colors"
          title={t('activity.tunnels') || "SSH 隧道与端口转发监控"}
        >
          <Network className="h-5 w-5" />
        </button>

        <button
          onClick={() => setIsKeyManagerOpen(true)}
          className="flex items-center justify-center w-10 h-10 text-app-text-muted hover:text-app-text transition-colors"
          title={t('activity.keys') || "SSH 密钥与凭据管理器"}
        >
          <KeyRound className="h-5 w-5" />
        </button>

        <button
          onClick={() => setIsTasksOpen(!isTasksOpen)}
          className="relative flex items-center justify-center w-10 h-10 text-app-text-muted hover:text-app-text transition-colors"
          title={t('activity.tasks') || "传输任务队列"}
        >
          <ArrowDown className="h-5 w-5" />
          {sftpTasks.filter((t: SftpTask) => t.status === 'transferring' || t.status === 'started').length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-app-accent rounded-full animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setIsLogViewerOpen(true)}
          className="flex items-center justify-center w-10 h-10 text-app-text-muted hover:text-app-text transition-colors"
          title={t('activity.logs') || "审计日志查看器"}
        >
          <FileText className="h-5 w-5" />
        </button>

        {setIsAIChatDrawerOpen && (
          <button
            onClick={() => setIsAIChatDrawerOpen(prev => !prev)}
            className={`relative flex items-center justify-center w-10 h-10 transition-colors ${
              isAIChatDrawerOpen
                ? 'text-purple-400'
                : 'text-app-text-muted hover:text-purple-400'
            }`}
            title={t('activity.copilot') || "OmniAI 智能运维对话 (Cmd+L / Ctrl+L)"}
          >
            <Sparkles className="h-5 w-5" />
            {isAIChatDrawerOpen && (
              <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-purple-500" />
            )}
          </button>
        )}
      </div>

      {/* 下半部分：系统状态与设置 */}
      <div className="flex flex-col items-center space-y-1 w-full">
        <button
          onClick={handleLockWorkspace}
          className="flex items-center justify-center w-10 h-10 text-app-text-muted hover:text-amber-500 transition-colors"
          title={t('activity.lock') || "立即锁定工作区"}
        >
          <Lock className="h-5 w-5" />
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center justify-center w-10 h-10 text-app-text-muted hover:text-app-text transition-colors"
          title={t('activity.settings') || "偏好设置 (Alt+O)"}
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
