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
        {/* 1. 会话管理器 (Indigo / Blue) */}
        <button
          onClick={() => setActiveDockPanel(activeDockPanel === 'sessions' ? 'none' : 'sessions')}
          className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all cursor-pointer ${
            activeDockPanel === 'sessions'
              ? 'text-indigo-400 bg-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/40'
              : 'text-indigo-400/80 hover:text-indigo-300 hover:bg-indigo-500/15'
          }`}
          title={t('activity.sessions') || "会话管理器 (Ctrl+Alt+S)"}
        >
          <Server className="h-[19px] w-[19px]" />
          {activeDockPanel === 'sessions' && (
            <div className="absolute left-0 top-2 bottom-2 w-[2.5px] bg-indigo-500 rounded-r shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          )}
        </button>

        {/* 2. Docker / K8s 容器 (Cyan) */}
        <button
          onClick={() => setActiveDockPanel(activeDockPanel === 'containers' ? 'none' : 'containers')}
          className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all cursor-pointer ${
            activeDockPanel === 'containers'
              ? 'text-cyan-400 bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/40'
              : 'text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-500/15'
          }`}
          title={t('activity.containers') || "Docker / K8s 容器资源管理器 (Ctrl+Shift+C)"}
        >
          <Box className="h-[19px] w-[19px]" />
          {activeDockPanel === 'containers' && (
            <div className="absolute left-0 top-2 bottom-2 w-[2.5px] bg-cyan-400 rounded-r shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          )}
        </button>

        {/* 3. SFTP 文件传输 (Mint / Emerald) */}
        <button
          onClick={toggleSftpPanel}
          className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all cursor-pointer ${
            activeTabId && openSftpTabs.includes(activeTabId)
              ? 'text-emerald-400 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40'
              : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/15'
          }`}
          title={t('activity.sftp') || "SFTP 文件传输面板"}
        >
          <HardDrive className="h-[19px] w-[19px]" />
          {activeTabId && openSftpTabs.includes(activeTabId) && (
            <div className="absolute left-0 top-2 bottom-2 w-[2.5px] bg-emerald-400 rounded-r shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          )}
        </button>

        {/* 4. SSH 隧道与端口转发 (Lime / Green) */}
        <button
          onClick={() => setIsTunnelMonitorOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-green-400/80 hover:text-green-300 hover:bg-green-500/15 transition-all cursor-pointer"
          title={t('activity.tunnels') || "SSH 隧道与端口转发监控"}
        >
          <Network className="h-[19px] w-[19px]" />
        </button>

        {/* 5. 密钥管理 (Amber / Gold) */}
        <button
          onClick={() => setIsKeyManagerOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/15 transition-all cursor-pointer"
          title={t('activity.keys') || "SSH 密钥与凭据管理器"}
        >
          <KeyRound className="h-[19px] w-[19px]" />
        </button>

        {/* 6. 传输任务队列 (Coral / Rose) */}
        <button
          onClick={() => setIsTasksOpen(!isTasksOpen)}
          className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all cursor-pointer ${
            isTasksOpen
              ? 'text-rose-400 bg-rose-500/20 ring-1 ring-rose-500/40'
              : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/15'
          }`}
          title={t('activity.tasks') || "传输任务队列"}
        >
          <ArrowDown className="h-[19px] w-[19px]" />
          {sftpTasks.filter((t: SftpTask) => t.status === 'transferring' || t.status === 'started').length > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
          )}
        </button>

        {/* 7. 审计日志查看器 (Magenta / Pink) */}
        <button
          onClick={() => setIsLogViewerOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-pink-400/80 hover:text-pink-300 hover:bg-pink-500/15 transition-all cursor-pointer"
          title={t('activity.logs') || "审计日志查看器"}
        >
          <FileText className="h-[19px] w-[19px]" />
        </button>

        {/* 8. OmniAI 智能运维对话 (Violet / Purple) */}
        {setIsAIChatDrawerOpen && (
          <button
            onClick={() => setIsAIChatDrawerOpen(prev => !prev)}
            className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all cursor-pointer ${
              isAIChatDrawerOpen
                ? 'text-purple-300 bg-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.3)] ring-1 ring-purple-500/40'
                : 'text-purple-400/80 hover:text-purple-300 hover:bg-purple-500/15'
            }`}
            title={t('activity.copilot') || "OmniAI 智能运维对话 (Cmd+L / Ctrl+L)"}
          >
            <Sparkles className="h-[19px] w-[19px]" />
            {isAIChatDrawerOpen && (
              <div className="absolute left-0 top-2 bottom-2 w-[2.5px] bg-purple-400 rounded-r shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            )}
          </button>
        )}
      </div>

      {/* 下半部分：系统状态与设置 */}
      <div className="flex flex-col items-center space-y-1 w-full">
        <button
          onClick={handleLockWorkspace}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/15 transition-all cursor-pointer"
          title={t('activity.lock') || "立即锁定工作区"}
        >
          <Lock className="h-[19px] w-[19px]" />
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 transition-all cursor-pointer"
          title={t('activity.settings') || "偏好设置 (Alt+O)"}
        >
          <Settings className="h-[19px] w-[19px]" />
        </button>
      </div>
    </div>
  );
};
