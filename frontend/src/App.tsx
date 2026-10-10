import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from './hooks/useSettings';
import { useSessionManager } from './hooks/useSessionManager';
import { useTabManager } from './hooks/useTabManager';
import {
  SaveSession,
  SaveSettings,
  IsAppLocked,
  GetStartupArgs,
  GetAuthProfiles,
} from '../wailsjs/go/app/App';
import { activeTerminals, terminalCastRecordings } from './components/TerminalInstance';
import { NetworkPrompts } from './components/NetworkPrompts';
import { KeyManagerModal } from './components/KeyManagerModal';
import { AuthProfileManagerModal } from './components/AuthProfileManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { TaskQueueDrawer, SftpTask } from './components/TaskQueueDrawer';
import { StatusBar } from './components/StatusBar';
import { QuickCommandBar } from './components/QuickCommandBar';
import { Toolbar } from './components/Toolbar';
import { SessionSidebar } from './components/SessionSidebar';
import { AppModalsContainer } from './components/AppModalsContainer';
import { SessionTreeContextMenu } from './components/SessionTreeContextMenu';
import { TabContextMenu, RenameTabModal } from './components/TabContextMenu';
import { DetachedWindowHeader } from './components/DetachedWindowHeader';
import { FavoritesBar } from './components/FavoritesBar';
import { ActivityBar } from './components/ActivityBar';
import { TerminalWorkspacePanes } from './components/TerminalWorkspacePanes';
import { useMacroManager } from './hooks/useMacroManager';
import { useHostReachability } from './hooks/useHostReachability';
import { useCommandPaletteActions } from './hooks/useCommandPaletteActions';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useAppThemeEffect } from './hooks/useAppThemeEffect';
import { useAutoLock } from './hooks/useAutoLock';
import { useWorkspaceSync } from './hooks/useWorkspaceSync';
import { useQuakeHotkey } from './hooks/useQuakeHotkey';
import { useTerminalUptimeAndTraffic } from './hooks/useTerminalUptimeAndTraffic';
import { useSessionSharing } from './hooks/useSessionSharing';
import { useQuickConnect } from './hooks/useQuickConnect';
import { useSessionConnection } from './hooks/useSessionConnection';
import { ComposePane } from './components/ComposePane';
import { QuickStartPage } from './components/QuickStartPage';
import { ContainerExplorerDrawer } from './components/ContainerExplorerDrawer';
import { useKeybindingManager } from './hooks/useKeybindingManager';
import { LockScreen } from './components/LockScreen';
import { SessionModal } from './components/SessionModal';
import { OmniAIChatDrawer } from './components/OmniAIChatDrawer';
import { terminalBuffers } from './components/TerminalInstance';
import { WriteSSH } from '../wailsjs/go/app/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { app, models } from '../wailsjs/go/models';
import { useI18n } from './i18n/I18nContext';

function App() {
  const { t, lang, setLang } = useI18n();

  // 颜色标签映射
  const getColorLabelClass = (colorStr: string | undefined, isConnected: boolean) => {
    if (isConnected) return 'text-green-505';
    switch (colorStr) {
      case 'red': return 'text-red-500';
      case 'orange': return 'text-orange-500';
      case 'yellow': return 'text-yellow-500';
      case 'green': return 'text-green-500';
      case 'blue': return 'text-blue-500';
      case 'purple': return 'text-purple-500';
      case 'cyan': return 'text-cyan-500';
      default: return 'text-app-text-muted group-hover:text-slate-450';
    }
  };

  const hasProcessedStartupArgs = useRef(false);
  const {
    sessions,
    setSessions,
    searchQuery,
    setSearchQuery,
    expandedFolders,
    setExpandedFolders,
    isModalOpen,
    setIsModalOpen,
    modalMode,
    setModalMode,
    sessionModalTab,
    setSessionModalTab,
    formData,
    setFormData,
    deleteConfirmId,
    setDeleteConfirmId,
    sessionContextMenu,
    setSessionContextMenu,
    draggedSessionId,
    setDraggedSessionId,
    loadSessions,
    handleCloneSessionConfig,
    handleSessionDrop,
    resetSessionFormData,
    resetFolderFormData,
    handleSaveSession,
    handleEditSession,
    handleDeleteSession,
    confirmDeleteSession
  } = useSessionManager(useCallback((res: app.SessionConfig[]) => {
    if (!hasProcessedStartupArgs.current) {
      hasProcessedStartupArgs.current = true;
      GetStartupArgs().then((args: string[]) => {
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--session' && i + 1 < args.length) {
            const sessName = args[i + 1];
            const s = res.find((x: app.SessionConfig) => x.name === sessName && !x.isFolder);
            if (s) {
              setOpenTabs(prev => {
                if (!prev.find(t => t.id === s.id)) return [...prev, s];
                return prev;
              });
              setActiveTabId(s.id);
            } else if (sessName.includes('本地 Shell') || sessName === 'Local Shell') {
              const tempId = 'local_' + Date.now();
              const tempSession = new app.SessionConfig({
                id: tempId,
                name: `💻 本地 Shell`,
                isFolder: false,
                parentId: '',
                host: 'Local',
                port: 0,
                user: '',
                password: '',
                privateKey: '',
                isLocal: true,
                loginScripts: [],
                triggers: [],
                overrideTheme: '',
                overrideFontSize: 0,
                logConfig: { enable: false, format: 'TEXT', pathTemplate: '', maxBytes: 0 },
                tunnels: []
              });
              setOpenTabs(prev => [...prev, tempSession]);
              setActiveTabId(tempId);
            }
          } else if (args[i] === '--local') {
            const tempId = 'local_' + Date.now();
            const tempSession = new app.SessionConfig({
              id: tempId,
              name: `💻 本地 Shell`,
              isFolder: false,
              parentId: '',
              host: 'Local',
              port: 0,
              user: '',
              password: '',
              privateKey: '',
              isLocal: true,
              loginScripts: [],
              triggers: [],
              overrideTheme: '',
              overrideFontSize: 0,
              logConfig: { enable: false, format: 'TEXT', pathTemplate: '', maxBytes: 0 },
              tunnels: []
            });
            setOpenTabs(prev => [...prev, tempSession]);
            setActiveTabId(tempId);
          }
        }
      }).catch(() => { });
    }
  }, []));

  // 会话链接组 (Session Link Group)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeDockPanel, setActiveDockPanel] = useState<'sessions' | 'containers' | 'sftp' | 'none'>('sessions');
  const [dockSide, setDockSide] = useState<'left' | 'right'>('left');
  const [isKeybindingModalOpen, setIsKeybindingModalOpen] = useState(false);

  const {
    activeTabId, setActiveTabId,
    splitMode, setSplitMode,
    secondaryTabId, setSecondaryTabId,
    linkedTabIds, setLinkedTabIds,
    openTabs, setOpenTabs,
    lockedTabs, setLockedTabs,
    customTabNames, setCustomTabNames,
    connectEpochs, setConnectEpochs,
    tabContextMenu, setTabContextMenu,
    draggedTabId, setDraggedTabId,
    isRenameModalOpen, setIsRenameModalOpen,
    renameTabId, setRenameTabId,
    renameInput, setRenameInput,
    tabStatus, setTabStatus,
    tabPendingClose,
    confirmCloseTab,
    cancelCloseTab,
    handleCloseTab,
    handleCloseOtherTabs,
    handleCloseRightTabs,
    handleCloneTab,
    handleDetachTab,
    handleTabContextMenu,
    handleReconnectTab,
    toggleTabLock,
    handleRenameTabSubmit,
    closeTabMenu,
    handleTabAreaDoubleClick,
    handleTabDrop
  } = useTabManager();

  // 监听第二实例启动传递的命令行参数 (如 omniterminal --session xxx 或 omniterminal --local)
  useEffect(() => {
    const unlisten = EventsOn('cli-arguments', (args: string[]) => {
      if (!Array.isArray(args)) return;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--session' && i + 1 < args.length) {
          const sessName = args[i + 1];
          const s = sessions.find((x: app.SessionConfig) => x.name === sessName && !x.isFolder);
          if (s) {
            setOpenTabs(prev => {
              if (!prev.find(t => t.id === s.id)) return [...prev, s];
              return prev;
            });
            setActiveTabId(s.id);
          }
        } else if (args[i] === '--local') {
          const tempId = 'local_' + Date.now();
          const tempSession = new app.SessionConfig({
            id: tempId,
            name: `💻 本地 Shell`,
            isFolder: false,
            parentId: '',
            host: 'Local',
            port: 0,
            user: '',
            password: '',
            privateKey: '',
            isLocal: true,
            loginScripts: [],
            triggers: [],
            overrideTheme: '',
            overrideFontSize: 0,
            logConfig: { enable: false, format: 'TEXT', pathTemplate: '', maxBytes: 0 },
            tunnels: []
          });
          setOpenTabs(prev => [...prev, tempSession]);
          setActiveTabId(tempId);
        }
      }
    });
    return () => {
      if (typeof unlisten === 'function') unlisten();
    };
  }, [sessions, setOpenTabs, setActiveTabId]);


  const [openSftpTabs, setOpenSftpTabs] = useState<string[]>([]);
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composeTargetTabs, setComposeTargetTabs] = useState<string[]>([]);
  const [quickCmd, setQuickCmd] = useState('');

  // 偏好设置
  const {
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
  } = useSettings();
  const { matchesAction } = useKeybindingManager((settings as any).customKeybindings);

  // 拦截 Tab 关闭并应用二次确认策略 (Stage 1)
  const onRequestCloseTab = useCallback((id: string, e?: React.MouseEvent) => {
    handleCloseTab(id, e, false, {
      confirmCloseConnectedTab: (settings as any).confirmCloseConnectedTab !== false,
      confirmCloseAnyTab: Boolean((settings as any).confirmCloseAnyTab),
    });
  }, [handleCloseTab, settings]);

  const onConfirmCloseTab = useCallback((doNotAskAgain: boolean) => {
    confirmCloseTab(doNotAskAgain, () => {
      const newSettings = new models.AppSettings({
        ...settings,
        confirmCloseConnectedTab: false,
        confirmCloseAnyTab: false,
      } as any);
      setSettings(newSettings);
      SaveSettings(newSettings).catch(() => {});
    });
  }, [confirmCloseTab, settings, setSettings]);

  // 主窗口关闭事件拦截与弹窗确认 (Stage 1)
  const [isCloseAppModalOpen, setIsCloseAppModalOpen] = useState(false);

  useEffect(() => {
    const unlisten = EventsOn('app-request-close', () => {
      setIsCloseAppModalOpen(true);
    });
    return () => {
      unlisten();
    };
  }, []);

  const handleConfirmCloseApp = useCallback((action: 'tray' | 'quit', doNotAskAgain: boolean) => {
    setIsCloseAppModalOpen(false);

    const newSettings = new models.AppSettings({
      ...settings,
      closeAction: action,
      closeDoNotAskAgain: doNotAskAgain,
    } as any);
    setSettings(newSettings);
    SaveSettings(newSettings).catch(() => {});

    const appRpc = (window as any).go?.app?.App;
    if (action === 'quit') {
      if (appRpc?.ForceQuit) {
        appRpc.ForceQuit().catch(() => {});
      }
    } else {
      if (appRpc?.HideWindow) {
        appRpc.HideWindow().catch(() => {});
      }
    }
  }, [settings, setSettings]);

  const handleCancelCloseApp = useCallback(() => {
    setIsCloseAppModalOpen(false);
  }, []);

  // 窗口尺寸与屏幕位置变动防抖持久化 (Stage 1)
  useEffect(() => {
    if ((settings as any).rememberWindowPosition === false) return;
    let timer: any = null;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const appRpc = (window as any).go?.app?.App;
        if (appRpc?.SaveCurrentWindowPosition) {
          appRpc.SaveCurrentWindowPosition().catch(() => {});
        }
      }, 600);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [settings]);

  const [settingsInitialTab, setSettingsInitialTab] = useState<'appearance' | 'security' | 'quickCmds' | 'interaction' | 'statusBar' | 'template' | 'os' | 'about'>('appearance');

  // 锁屏与空闲超时
  const { isLocked, setIsLocked, handleLockWorkspace } = useAutoLock({
    settings,
    setIsSettingsOpen,
    setSettingsInitialTab,
  });

  // 快速连接与临时 Tab 管理
  const {
    quickConnectInput,
    setQuickConnectInput,
    quickConnectHistory,
    setQuickConnectHistory,
    handleQuickConnect,
    handleLocalShell,
  } = useQuickConnect({
    setOpenTabs,
    setActiveTabId,
  });

  // 会话连接调度器 (普通/文件夹/容器/动态参数/指令发送/跨Tab联动)
  const {
    folderToConnect,
    setFolderToConnect,
    isParamModalOpen,
    setIsParamModalOpen,
    paramTemplateCmd,
    setParamTemplateCmd,
    handleConnect,
    handleConnectFolder,
    confirmConnectFolder,
    handleConnectContainer,
    handleLinkedInput,
    sendCmdDirect,
    handleSendQuickCmd,
  } = useSessionConnection({
    sessions,
    authProfiles,
    openTabs,
    setOpenTabs,
    activeTabId,
    setActiveTabId,
    linkedTabIds,
    isBroadcast,
    setQuickCmd,
  });

  // 终端在线状态与流量统计
  const {
    termDimensions,
    setTermDimensions,
    sessionUptimes,
    setSessionUptimes,
    trafficSpeeds,
    setTrafficSpeeds,
    formatUptime,
    formatSpeed,
    handleUpdateActiveTabEncoding,
    handleResizeActiveTerminal,
  } = useTerminalUptimeAndTraffic({
    activeTabId,
    tabStatus,
    setOpenTabs,
  });

  // Quake 模式热键
  const {
    isQuakeDropdownOpen,
    setIsQuakeDropdownOpen,
    hasOpenedQuake,
    setHasOpenedQuake,
  } = useQuakeHotkey({ settings });

  // 实时协同共享状态与事件
  const {
    shareSessionModalData,
    setShareSessionModalData,
    sharedTerminalViewerUrl,
    setSharedTerminalViewerUrl,
    sharedSessionStates,
    setSharedSessionStates,
  } = useSessionSharing({ openTabs });

  // 工作区状态恢复与自动持久化
  useWorkspaceSync({
    sessions,
    isLocked,
    autoRestoreWorkspace: settings.autoRestoreWorkspace,
    openTabs,
    setOpenTabs,
    activeTabId,
    setActiveTabId,
    splitMode,
    setSplitMode,
    secondaryTabId,
    setSecondaryTabId,
    customTabNames,
    lockedTabs,
    toggleTabLock,
  });

  // 主题与毛玻璃/透明度动态样式
  const { isTranslucentMode } = useAppThemeEffect({
    settings,
    openTabs,
  });

  // 传输任务面板状态
  const [sftpTasks, setSftpTasks] = useState<SftpTask[]>([]);
  const activeTasksCount = sftpTasks.filter(t => t.status === 'started' || t.status === 'transferring').length;
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isShortcutRefOpen, setIsShortcutRefOpen] = useState(false);
  const [isTabManagerOpen, setIsTabManagerOpen] = useState(false);
  const [isTriggerManagerOpen, setIsTriggerManagerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCommandHistoryOpen, setIsCommandHistoryOpen] = useState(false);
  const [aiExplainText, setAiExplainText] = useState('');

  // 日志查看器
  const [isLogViewerOpen, setIsLogViewerOpen] = useState<boolean>(false);

  // 批量编辑与外部会话导入弹窗状态
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  const handleSessionNodeClick = (config: app.SessionConfig, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedSessionIds(prev => 
        prev.includes(config.id) ? prev.filter(id => id !== config.id) : [...prev, config.id]
      );
    } else if (e.shiftKey && selectedSessionIds.length > 0) {
      const allList = sessions.filter((s: any) => !s.isFolder);
      const lastIndex = allList.findIndex((s: any) => s.id === selectedSessionIds[selectedSessionIds.length - 1]);
      const currIndex = allList.findIndex((s: any) => s.id === config.id);
      if (lastIndex !== -1 && currIndex !== -1) {
        const start = Math.min(lastIndex, currIndex);
        const end = Math.max(lastIndex, currIndex);
        const rangeIds = allList.slice(start, end + 1).map((s: any) => s.id);
        setSelectedSessionIds(Array.from(new Set([...selectedSessionIds, ...rangeIds])));
      }
    } else {
      setSelectedSessionIds([config.id]);
    }
  };

  // 全局搜索
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<{ tabId: string, line: string, index: number }[]>([]);

  // 终端分屏同步滚动与 Asciinema 会话录像状态
  const [isSyncScroll, setIsSyncScroll] = useState(false);
  const [isCastPlayerOpen, setIsCastPlayerOpen] = useState(false);
  const [activeCastContent, setActiveCastContent] = useState('');

  // 宏录制与执行状态机
  const {
    isRecording,
    macroSeconds,
    selectedMacroId,
    setSelectedMacroId,
    isSaveMacroModalOpen,
    setIsSaveMacroModalOpen,
    macroNameInput,
    setMacroNameInput,
    macroToDelete,
    setMacroToDelete,
    startRecordingMacro,
    stopRecordingMacro,
    saveRecordedMacro,
    playMacro,
    confirmDeleteMacro,
    formatMacroTime,
    tempMacroActionCount,
  } = useMacroManager({
    settings,
    setSettings,
    activeTabId,
    terminalCastRecordings,
    setActiveCastContent,
    setIsCastPlayerOpen,
  });

  // 19.3: 主机连通性在线感知状态与探测调度
  const {
    hostReachabilityMap,
    isProbingReachability,
    triggerBatchProbeReachability,
  } = useHostReachability({
    sessions,
    isLocked,
  });

  // Phase 4: 端口转发隧道监控与自动化脚本
  const [isTunnelMonitorOpen, setIsTunnelMonitorOpen] = useState(false);
  const [isScriptRunnerOpen, setIsScriptRunnerOpen] = useState(false);

  // Phase 5B: 主机监控与远程运维
  const [isHostMonitorOpen, setIsHostMonitorOpen] = useState(false);
  const [isRemoteOpsOpen, setIsRemoteOpsOpen] = useState(false);

  // Phase 5C/D: 实时日志追踪与工作目录联动
  const [isRealtimeLogOpen, setIsRealtimeLogOpen] = useState(false);
  const [terminalDirs, setTerminalDirs] = useState<Record<string, string>>({});

  // Phase 5D: OmniAI 智能 Copilot 与端到端加密云同步
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  const [isAIChatDrawerOpen, setIsAIChatDrawerOpen] = useState(false);
  const [isAIConfigModalOpen, setIsAIConfigModalOpen] = useState(false);
  const [aiCopilotMode, setAiCopilotMode] = useState<'command' | 'diagnose' | 'script' | 'explain'>('command');
  const [aiCopilotErrorText, setAiCopilotErrorText] = useState('');
  const [aiCopilotLastCmd, setAiCopilotLastCmd] = useState('');
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isRunbookOpen, setIsRunbookOpen] = useState(false);

  // 24.2.3: 网络拓扑与批量命令对比
  const [isTopologyOpen, setIsTopologyOpen] = useState(false);
  const [isMultiExecDiffOpen, setIsMultiExecDiffOpen] = useState(false);

  // 24.3: TOTP 令牌管理与批量主机巡检
  const [isTotpManagerOpen, setIsTotpManagerOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);

  // 24.2.1: Warp 结构化命令块模式状态 (按 Tab 会话隔离)
  const [commandBlockModes, setCommandBlockModes] = useState<Record<string, boolean>>({});
  const handleToggleCommandBlockMode = useCallback(() => {
    if (activeTabId) {
      setCommandBlockModes(prev => ({ ...prev, [activeTabId]: !prev[activeTabId] }));
    }
  }, [activeTabId]);

  const handleExportSSHConfig = async () => {
    try {
      if ((window as any).go?.app?.App?.ExportToSSHConfig) {
        const res = await (window as any).go.app.App.ExportToSSHConfig();
        await navigator.clipboard.writeText(res);
        alert("已成功反向导出标准 OpenSSH 配置到剪贴板！\n您可以将其直接追加或粘贴至 ~/.ssh/config 中。");
      }
    } catch (err: any) {
      alert("导出失败: " + (err?.message || err));
    }
  };

  // 19.5: 独立子窗口状态识别
  const isDetachedWindow = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('detached') === 'true';
  const detachedSessionId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('sessionId') : null;

  // 独立子窗口自动打开目标会话
  useEffect(() => {
    if (isDetachedWindow && detachedSessionId && sessions.length > 0 && openTabs.length === 0) {
      const target = sessions.find((s: any) => s.id === detachedSessionId);
      if (target) {
        setOpenTabs([new app.SessionConfig(target)]);
        setActiveTabId(target.id);
      }
    }
  }, [isDetachedWindow, detachedSessionId, sessions, openTabs.length]);

  // 1. 加载配置数据


  useEffect(() => {
    IsAppLocked().then((locked) => {
      setIsLocked(locked);
      if (!locked) {
        loadSessions();
        loadSettings();
        GetAuthProfiles().then(p => setAuthProfiles(p || []));
      }
    });

    const unlistenProgress = EventsOn('sftp-progress', (data: SftpTask) => {
      setSftpTasks((prev) => {
        const exists = prev.some(t => t.taskId === data.taskId);
        if (exists) {
          return prev.map(t => t.taskId === data.taskId ? { ...t, ...data } : t);
        } else {
          return [...prev, data as SftpTask];
        }
      });
    });

    return () => {
      unlistenProgress();
    };
  }, []);

  const [sidebarBlankContextMenu, setSidebarBlankContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tabContextMenu) setTabContextMenu(null);
        if (sessionContextMenu) setSessionContextMenu(null);
        if (sidebarBlankContextMenu) setSidebarBlankContextMenu(null);
      }
    };
    if (tabContextMenu || sessionContextMenu || sidebarBlankContextMenu) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabContextMenu, sessionContextMenu, sidebarBlankContextMenu]);

  // Tab 区域双击空白快速新建会话
  // Tab 拖拽重排释放
  // 会话管理器右键菜单触发
  const handleSessionContextMenu = (e: React.MouseEvent, session: app.SessionConfig) => {
    e.preventDefault();
    if (e) e.stopPropagation();
    setSidebarBlankContextMenu(null);
    setSessionContextMenu({
      x: e.clientX,
      y: e.clientY,
      session
    });
  };

  // 会话导航空白区域右键菜单触发
  const handleSidebarBlankContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setSessionContextMenu(null);
    setSidebarBlankContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };

  // 展开所有目录
  const handleExpandAllFolders = () => {
    const allFolderIds = sessions.filter((s: any) => s.isFolder).map((s: any) => s.id);
    setExpandedFolders(allFolderIds);
  };

  // 折叠所有目录
  const handleCollapseAllFolders = () => {
    setExpandedFolders([]);
  };

  // 一键克隆复制会话配置副本


  // 6. 保存全局终端设置
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    SaveSettings(settings)
      .then(() => {
        setIsSettingsOpen(false);
      })
      .catch(err => {
        alert("保存全局设置失败: " + err);
      });
  };



  // 12.1 分屏同步滚动调度
  const isSyncingScrollRef = useRef(false);
  const handleScrollSync = useCallback((ratio: number, sourceTabId: string) => {
    if (!isSyncScroll || isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;

    openTabs.forEach((t: any) => {
      if (t.id !== sourceTabId) {
        const otherTerm = activeTerminals[t.id];
        if (otherTerm) {
          const otherBuffer = otherTerm.buffer.active;
          const targetLine = Math.round(ratio * otherBuffer.baseY);
          otherTerm.scrollToLine(targetLine);
        }
      }
    });

    setTimeout(() => {
      isSyncingScrollRef.current = false;
    }, 50);
  }, [isSyncScroll, openTabs]);

  const handleDisconnectTab = useCallback(() => {
    if (activeTabId) {
      setTabStatus(prev => ({ ...prev, [activeTabId]: 'disconnected' }));
    }
  }, [activeTabId, setTabStatus]);

  const handlePrevTab = useCallback(() => {
    if (openTabs.length > 1 && activeTabId) {
      const idx = openTabs.findIndex(t => t.id === activeTabId);
      const prevIdx = idx > 0 ? idx - 1 : openTabs.length - 1;
      setActiveTabId(openTabs[prevIdx].id);
    }
  }, [openTabs, activeTabId, setActiveTabId]);

  const handleNextTab = useCallback(() => {
    if (openTabs.length > 1 && activeTabId) {
      const idx = openTabs.findIndex(t => t.id === activeTabId);
      const nextIdx = idx < openTabs.length - 1 ? idx + 1 : 0;
      setActiveTabId(openTabs[nextIdx].id);
    }
  }, [openTabs, activeTabId, setActiveTabId]);

  const handleRenameTabFromMenu = useCallback((id: string) => {
    setRenameTabId(id);
    setRenameInput(customTabNames[id] || openTabs.find(t => t.id === id)?.name || '');
    setIsRenameModalOpen(true);
  }, [customTabNames, openTabs, setRenameTabId, setRenameInput, setIsRenameModalOpen]);



  // 切换文件夹展开状态
  const toggleFolder = (folderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (expandedFolders.includes(folderId)) {
      setExpandedFolders(expandedFolders.filter((id: string) => id !== folderId));
    } else {
      setExpandedFolders([...expandedFolders, folderId]);
    }
  };

  // 切换当前 Tab 的 SFTP 面板显示
  const toggleSftpPanel = () => {
    if (!activeTabId) return;
    if (openSftpTabs.includes(activeTabId)) {
      setOpenSftpTabs(openSftpTabs.filter(id => id !== activeTabId));
    } else {
      setOpenSftpTabs([...openSftpTabs, activeTabId]);
    }
  };

  const foldersOnly = sessions.filter((s: any) => s.isFolder);

  // 得到当前激活的快捷命令

  const renderCmdSetOptions = (parentId: string, depth: number): React.JSX.Element[] => {
    return (settings.quickCommandSets || [])
      .filter(s => (s.parentId || '') === parentId)
      .flatMap(set => {
        const prefix = "  ".repeat(depth);
        const elements = [
          <option key={set.id} value={set.id} disabled={set.isFolder}>
            {prefix}{set.isFolder ? '📁 ' : '📄 '}{set.setName}
          </option>
        ];
        if (set.isFolder) {
          elements.push(...renderCmdSetOptions(set.id, depth + 1));
        }
        return elements;
      });
  };
  const activeCmdSet = (settings.quickCommandSets || []).find((s: any) => s.id === settings.activeCommandSetID);
  const activeCommands = activeCmdSet ? ((activeCmdSet as any).commands || []) : [];

  // 字体字号缩放处理
  const handleZoomIn = () => {
    setSettings(prev => new models.AppSettings({ ...prev, fontSize: Math.min((prev.fontSize || 13) + 1, 36) }));
  };
  const handleZoomOut = () => {
    setSettings(prev => new models.AppSettings({ ...prev, fontSize: Math.max((prev.fontSize || 13) - 1, 8) }));
  };
  const handleZoomReset = () => {
    setSettings(prev => new models.AppSettings({ ...prev, fontSize: 13 }));
  };

  const handleToggleSftp = () => {
    if (!activeTabId) return;
    if (openSftpTabs.includes(activeTabId)) {
      setOpenSftpTabs(prev => prev.filter(id => id !== activeTabId));
    } else {
      setOpenSftpTabs(prev => [...prev, activeTabId]);
    }
  };

  // 命令面板快捷动作路由调度
  const { handlePaletteAction } = useCommandPaletteActions({
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
  });

  // 全局键盘快捷键
  useGlobalShortcuts({
    activeTabId,
    openTabs,
    openSftpTabs,
    matchesAction,
    setIsKeybindingModalOpen,
    setActiveDockPanel,
    resetSessionFormData,
    setModalMode,
    setIsModalOpen,
    handleLocalShell,
    handleCloseTab: onRequestCloseTab,
    handleNextTab,
    handlePrevTab,
    handleToggleSftp,
    setIsComposeOpen,
    setIsBroadcast,
    setSplitMode,
    setIsCommandPaletteOpen,
    setIsGlobalSearchOpen,
    setIsSettingsOpen,
    setAiCopilotMode,
    setIsAICopilotOpen,
    setIsAIChatDrawerOpen,
    setIsCommandHistoryOpen,
    setIsShortcutRefOpen,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    setActiveTabId,
    setIsTunnelMonitorOpen,
    setIsHostMonitorOpen,
    setIsRemoteOpsOpen,
    setIsRealtimeLogOpen,
    setIsRunbookOpen,
    onToggleCommandBlockMode: handleToggleCommandBlockMode,
  });

  return (
    <div
      className="flex flex-col h-screen w-screen text-app-text font-sans select-none overflow-hidden"
      style={{ backgroundColor: isTranslucentMode ? 'transparent' : 'var(--app-bg)' }}
    >



      {/* 独立子窗口专用顶栏 */}
      <DetachedWindowHeader
        isDetachedWindow={isDetachedWindow}
        openTabs={openTabs}
      />

      {/* 顶部菜单栏与工具栏 (Desktop Style) */}
      <Toolbar
        t={t}
        resetSessionFormData={resetSessionFormData}
        setModalMode={setModalMode}
        setIsModalOpen={setIsModalOpen}
        resetFolderFormData={resetFolderFormData}
        loadSessions={loadSessions}
        handleLocalShell={handleLocalShell}
        activeDockPanel={activeDockPanel}
        setActiveDockPanel={setActiveDockPanel}
        toggleSftpPanel={toggleSftpPanel}
        activeTabId={activeTabId}
        openSftpTabs={openSftpTabs}
        isTasksOpen={isTasksOpen}
        setIsTasksOpen={setIsTasksOpen}
        activeTasksCount={activeTasksCount}
        isComposeOpen={isComposeOpen}
        setIsComposeOpen={setIsComposeOpen}
        setIsGlobalSearchOpen={setIsGlobalSearchOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        setIsKeyManagerOpen={setIsKeyManagerOpen}
        setIsAuthManagerOpen={setIsAuthManagerOpen}
        setIsImportModalOpen={setIsImportModalOpen}
        handleQuickConnect={handleQuickConnect}
        quickConnectInput={quickConnectInput}
        setQuickConnectInput={setQuickConnectInput}
        tabs={openTabs}
        setActiveTabId={setActiveTabId}
        removeTab={onRequestCloseTab}
        handleCloseOtherTabs={handleCloseOtherTabs}
        handleCloseRightTabs={handleCloseRightTabs}
        handleCloneTab={handleCloneTab}
        handleDetachTab={handleDetachTab}
        toggleTabLock={toggleTabLock}
        splitMode={splitMode}
        setSplitMode={setSplitMode}
        setIsBroadcast={setIsBroadcast}
        settings={settings}
        setSettings={setSettings}
        lang={lang}
        setLang={setLang}
        setIsLogViewerOpen={setIsLogViewerOpen}
        handlePrevTab={handlePrevTab}
        handleNextTab={handleNextTab}
        handleDisconnect={handleDisconnectTab}
        handleReconnect={() => activeTabId && handleReconnectTab(activeTabId)}
        startRecordingMacro={startRecordingMacro}
        stopRecordingMacro={stopRecordingMacro}
        isRecordingMacro={isRecording}
        handleRenameTab={handleRenameTabFromMenu}
        isTabManagerOpen={isTabManagerOpen}
        setIsTabManagerOpen={setIsTabManagerOpen}
        isShortcutRefOpen={isShortcutRefOpen}
        setIsShortcutRefOpen={setIsShortcutRefOpen}
        isTriggerManagerOpen={isTriggerManagerOpen}
        setIsTriggerManagerOpen={setIsTriggerManagerOpen}
        isTunnelMonitorOpen={isTunnelMonitorOpen}
        setIsTunnelMonitorOpen={setIsTunnelMonitorOpen}
        isScriptRunnerOpen={isScriptRunnerOpen}
        setIsScriptRunnerOpen={setIsScriptRunnerOpen}
        isHostMonitorOpen={isHostMonitorOpen}
        setIsHostMonitorOpen={setIsHostMonitorOpen}
        isRemoteOpsOpen={isRemoteOpsOpen}
        setIsRemoteOpsOpen={setIsRemoteOpsOpen}
        isRealtimeLogOpen={isRealtimeLogOpen}
        setIsRealtimeLogOpen={setIsRealtimeLogOpen}
        handleExportSSHConfig={handleExportSSHConfig}
        isAICopilotOpen={isAICopilotOpen}
        setIsAICopilotOpen={setIsAICopilotOpen}
        isAIChatDrawerOpen={isAIChatDrawerOpen}
        setIsAIChatDrawerOpen={setIsAIChatDrawerOpen}
        isCloudSyncOpen={isCloudSyncOpen}
        setIsCloudSyncOpen={setIsCloudSyncOpen}
        isRunbookOpen={isRunbookOpen}
        setIsRunbookOpen={setIsRunbookOpen}
        isTopologyOpen={isTopologyOpen}
        setIsTopologyOpen={setIsTopologyOpen}
        isMultiExecDiffOpen={isMultiExecDiffOpen}
        setIsMultiExecDiffOpen={setIsMultiExecDiffOpen}
        isTotpManagerOpen={isTotpManagerOpen}
        setIsTotpManagerOpen={setIsTotpManagerOpen}
        isInspectionModalOpen={isInspectionModalOpen}
        setIsInspectionModalOpen={setIsInspectionModalOpen}
        onLockWorkspace={handleLockWorkspace}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenCommandHistory={() => setIsCommandHistoryOpen(true)}
      />

      {/* 收藏夹/快速启动栏 */}
      <FavoritesBar
        favoriteSessionIds={settings.favoriteSessionIds}
        sessions={sessions}
        handleConnect={handleConnect}
        t={t}
      />

      {/* 主体区 */}
      <div 
        className="flex flex-1 w-full overflow-hidden relative border-t border-app-border"
        style={{ backgroundColor: isTranslucentMode ? 'transparent' : 'var(--app-bg)' }}
      >

        {/* 现代 Activity Bar 侧边活动栏 */}
        <ActivityBar
          activeDockPanel={activeDockPanel}
          setActiveDockPanel={setActiveDockPanel}
          toggleSftpPanel={toggleSftpPanel}
          activeTabId={activeTabId}
          openSftpTabs={openSftpTabs}
          setIsTunnelMonitorOpen={setIsTunnelMonitorOpen}
          setIsKeyManagerOpen={setIsKeyManagerOpen}
          isTasksOpen={isTasksOpen}
          setIsTasksOpen={setIsTasksOpen}
          sftpTasks={sftpTasks}
          setIsLogViewerOpen={setIsLogViewerOpen}
          handleLockWorkspace={handleLockWorkspace}
          setIsSettingsOpen={setIsSettingsOpen}
          isAIChatDrawerOpen={isAIChatDrawerOpen}
          setIsAIChatDrawerOpen={setIsAIChatDrawerOpen}
        />

        {/* 侧边栏 (支持左侧 / 右侧拖拽停靠) */}
        {dockSide === 'left' && activeDockPanel === 'sessions' && (
          <SessionSidebar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            draggedSessionId={draggedSessionId}
            setDraggedSessionId={setDraggedSessionId}
            sessions={sessions}
            SaveSession={SaveSession}
            loadSessions={loadSessions}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            selectedSessionIds={selectedSessionIds}
            setSelectedSessionIds={setSelectedSessionIds}
            handleSessionNodeClick={handleSessionNodeClick}
            handleConnect={handleConnect}
            handleSessionContextMenu={handleSessionContextMenu}
            handleSessionDrop={handleSessionDrop}
            resetSessionFormData={resetSessionFormData}
            resetFolderFormData={resetFolderFormData}
            setModalMode={setModalMode}
            setIsModalOpen={setIsModalOpen}
            handleEditSession={handleEditSession}
            handleDeleteSession={handleDeleteSession}
            hostReachabilityMap={hostReachabilityMap}
            getColorLabelClass={getColorLabelClass}
            openTabs={openTabs}
            setOpenTabs={setOpenTabs}
            customTabNames={customTabNames}
            lockedTabs={lockedTabs}
            activeTabId={activeTabId}
            setActiveTabId={setActiveTabId}
            secondaryTabId={secondaryTabId}
            setSecondaryTabId={setSecondaryTabId}
            splitMode={splitMode}
            openSftpTabs={openSftpTabs}
            setOpenSftpTabs={setOpenSftpTabs}
            tabStatus={tabStatus}
            handleCloseTab={onRequestCloseTab}
            onProbeReachability={() => triggerBatchProbeReachability()}
            isProbingReachability={isProbingReachability}
            dockSide={dockSide}
            onToggleSide={() => setDockSide(prev => prev === 'left' ? 'right' : 'left')}
            onContextMenuBlank={handleSidebarBlankContextMenu}
            onNewSession={() => {
              resetSessionFormData('');
              setModalMode('create');
              setIsModalOpen(true);
            }}
            onNewFolder={() => {
              resetFolderFormData('');
              setModalMode('create');
              setIsModalOpen(true);
            }}
          />
        )}

        {dockSide === 'left' && activeDockPanel === 'containers' && (
          <ContainerExplorerDrawer
            isOpen={true}
            onClose={() => setActiveDockPanel('none')}
            activeSessions={openTabs.map(t => ({ id: t.id, name: t.name, host: t.host }))}
            onOpenTerminal={handleConnectContainer}
          />
        )}

        {/* 终端工作区 */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: isTranslucentMode ? 'transparent' : 'var(--app-bg)' }}>
          {openTabs.length === 0 ? (
            <QuickStartPage
              sessions={sessions}
              resetSessionFormData={resetSessionFormData}
              setModalMode={setModalMode as (mode: 'create' | 'edit') => void}
              setIsModalOpen={setIsModalOpen}
              handleConnect={handleConnect}
              getColorLabelClass={getColorLabelClass}
              onOpenLocalShell={() => handleLocalShell()}
            />
          ) : (
            <>
              <TerminalWorkspacePanes
                openTabs={openTabs}
                activeTabId={activeTabId}
                setActiveTabId={setActiveTabId}
                secondaryTabId={secondaryTabId}
                setSecondaryTabId={setSecondaryTabId}
                splitMode={splitMode}
                setSplitMode={setSplitMode}
                tabStatus={tabStatus}
                setTabStatus={setTabStatus}
                customTabNames={customTabNames}
                linkedTabIds={linkedTabIds}
                lockedTabs={lockedTabs}
                handleTabContextMenu={handleTabContextMenu}
                setDraggedTabId={setDraggedTabId}
                handleTabDrop={handleTabDrop}
                handleCloseTab={onRequestCloseTab}
                handleDetachTab={handleDetachTab}
                resetSessionFormData={resetSessionFormData}
                setModalMode={setModalMode}
                setIsModalOpen={setIsModalOpen}
                handleTabAreaDoubleClick={handleTabAreaDoubleClick}
                sharedSessionStates={sharedSessionStates}
                setShareSessionModalData={setShareSessionModalData}
                connectEpochs={connectEpochs}
                handleLinkedInput={handleLinkedInput}
                isRecording={isRecording}
                settings={settings}
                setIsSettingsOpen={setIsSettingsOpen}
                isSyncScroll={isSyncScroll}
                handleScrollSync={handleScrollSync}
                setTrafficSpeeds={setTrafficSpeeds}
                setTermDimensions={setTermDimensions}
                setAiCopilotMode={setAiCopilotMode}
                setIsAICopilotOpen={setIsAICopilotOpen}
                handleZoomIn={handleZoomIn}
                handleZoomOut={handleZoomOut}
                handleZoomReset={handleZoomReset}
                setActiveDockPanel={setActiveDockPanel}
                setIsComposeOpen={setIsComposeOpen}
                handleToggleSftp={handleToggleSftp}
                setIsGlobalSearchOpen={setIsGlobalSearchOpen}
                setIsShortcutRefOpen={setIsShortcutRefOpen}
                setIsBroadcast={setIsBroadcast}
                terminalDirs={terminalDirs}
                setTerminalDirs={setTerminalDirs}
                setAiCopilotErrorText={setAiCopilotErrorText}
                setAiCopilotLastCmd={setAiCopilotLastCmd}
                openSftpTabs={openSftpTabs}
                setOpenSftpTabs={setOpenSftpTabs}
                commandBlockModes={commandBlockModes}
                setCommandBlockModes={setCommandBlockModes}
                setIsTunnelMonitorOpen={setIsTunnelMonitorOpen}
                setIsHostMonitorOpen={setIsHostMonitorOpen}
                setIsRemoteOpsOpen={setIsRemoteOpsOpen}
                setIsRealtimeLogOpen={setIsRealtimeLogOpen}
              />

              {/* 多行指令撰写窗口 (Compose Pane) */}
              <ComposePane
                isComposeOpen={isComposeOpen}
                setIsComposeOpen={setIsComposeOpen}
                composeText={composeText}
                setComposeText={setComposeText}
                composeTargetTabs={composeTargetTabs}
                setComposeTargetTabs={setComposeTargetTabs}
                openTabs={openTabs}
                activeTabId={activeTabId}
                isBroadcast={isBroadcast}
                handleSendQuickCmd={handleSendQuickCmd}
                customTabNames={customTabNames}
              />


              <QuickCommandBar
                settings={settings}
                setSettings={setSettings}
                SaveSettings={SaveSettings}
                renderCmdSetOptions={renderCmdSetOptions}
                activeCommands={activeCommands}
                handleSendQuickCmd={handleSendQuickCmd}
                activeTabId={activeTabId}
                isBroadcast={isBroadcast}
                setIsBroadcast={setIsBroadcast}
                openTabsCount={openTabs.length}
                quickCmd={quickCmd}
                setQuickCmd={setQuickCmd}
                isRecording={isRecording}
                stopRecordingMacro={stopRecordingMacro}
                macroSeconds={macroSeconds}
                formatMacroTime={formatMacroTime}
              />
            </>
          )}
        </main>

        {/* OmniAI 右侧智能运维对话侧边栏 */}
        <OmniAIChatDrawer
          isOpen={isAIChatDrawerOpen}
          onClose={() => setIsAIChatDrawerOpen(false)}
          activeSessionId={activeTabId}
          activeSessionName={openTabs.find(t => t.id === activeTabId)?.name || ''}
          terminalContextDir={activeTabId ? terminalDirs[activeTabId] : ''}
          getTerminalBufferLines={() => activeTabId && terminalBuffers[activeTabId] ? terminalBuffers[activeTabId]() : []}
          onOpenAIConfigModal={() => setIsAIConfigModalOpen(true)}
          aiConfig={(settings as any).aiConfig || {
            provider: 'deepseek',
            apiKey: '',
            baseUrl: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat',
            temperature: 0.2,
            maxTokens: 2048,
            systemPrompt: '',
          }}
          onSaveAIConfig={(cfg) => {
            const updated = { ...settings, aiConfig: cfg };
            const newSettings = new models.AppSettings(updated);
            setSettings(newSettings);
            SaveSettings(newSettings).catch(e => console.error("保存AI设置失败", e));
          }}
          onInsertToTerminal={(cmd) => {
            if (activeTabId) {
              const encoder = new TextEncoder();
              const rawBytes = encoder.encode(cmd);
              let binary = '';
              for (let i = 0; i < rawBytes.byteLength; i++) {
                binary += String.fromCharCode(rawBytes[i]);
              }
              WriteSSH(activeTabId, window.btoa(binary)).catch(e => console.error(e));
            }
          }}
          onRunInTerminal={(cmd) => {
            if (activeTabId) {
              const encoder = new TextEncoder();
              const rawBytes = encoder.encode(cmd.endsWith('\n') ? cmd : cmd + '\n');
              let binary = '';
              for (let i = 0; i < rawBytes.byteLength; i++) {
                binary += String.fromCharCode(rawBytes[i]);
              }
              WriteSSH(activeTabId, window.btoa(binary)).catch(e => console.error(e));
            }
          }}
          onSaveQuickCommand={(label, cmd) => {
            const updated = { ...settings };
            if (!updated.quickCommandSets || updated.quickCommandSets.length === 0) {
              updated.quickCommandSets = [new models.QuickCommandSet({
                id: 'default',
                parentId: '',
                isFolder: false,
                setName: '默认快捷命令',
                commands: [{ label, cmd }]
              })];
            } else {
              updated.quickCommandSets[0].commands.push({ label, cmd });
            }
            setSettings(new models.AppSettings(updated));
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* 侧边栏 (右侧拖拽停靠模式) */}
        {dockSide === 'right' && activeDockPanel === 'sessions' && (
          <SessionSidebar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            draggedSessionId={draggedSessionId}
            setDraggedSessionId={setDraggedSessionId}
            sessions={sessions}
            SaveSession={SaveSession}
            loadSessions={loadSessions}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            selectedSessionIds={selectedSessionIds}
            setSelectedSessionIds={setSelectedSessionIds}
            handleSessionNodeClick={handleSessionNodeClick}
            handleConnect={handleConnect}
            handleSessionContextMenu={handleSessionContextMenu}
            handleSessionDrop={handleSessionDrop}
            resetSessionFormData={resetSessionFormData}
            resetFolderFormData={resetFolderFormData}
            setModalMode={setModalMode}
            setIsModalOpen={setIsModalOpen}
            handleEditSession={handleEditSession}
            handleDeleteSession={handleDeleteSession}
            hostReachabilityMap={hostReachabilityMap}
            getColorLabelClass={getColorLabelClass}
            openTabs={openTabs}
            setOpenTabs={setOpenTabs}
            customTabNames={customTabNames}
            lockedTabs={lockedTabs}
            activeTabId={activeTabId}
            setActiveTabId={setActiveTabId}
            secondaryTabId={secondaryTabId}
            setSecondaryTabId={setSecondaryTabId}
            splitMode={splitMode}
            openSftpTabs={openSftpTabs}
            setOpenSftpTabs={setOpenSftpTabs}
            tabStatus={tabStatus}
            handleCloseTab={onRequestCloseTab}
            onProbeReachability={() => triggerBatchProbeReachability()}
            isProbingReachability={isProbingReachability}
            dockSide={dockSide}
            onToggleSide={() => setDockSide(prev => prev === 'left' ? 'right' : 'left')}
            onContextMenuBlank={handleSidebarBlankContextMenu}
            onNewSession={() => {
              resetSessionFormData('');
              setModalMode('create');
              setIsModalOpen(true);
            }}
            onNewFolder={() => {
              resetFolderFormData('');
              setModalMode('create');
              setIsModalOpen(true);
            }}
          />
        )}

        {dockSide === 'right' && activeDockPanel === 'containers' && (
          <ContainerExplorerDrawer
            isOpen={true}
            onClose={() => setActiveDockPanel('none')}
            activeSessions={openTabs.map(t => ({ id: t.id, name: t.name, host: t.host }))}
            onOpenTerminal={handleConnectContainer}
          />
        )}

        {/* 传输队列组件 */}
        <TaskQueueDrawer
          tasks={sftpTasks}
          isOpen={isTasksOpen}
          onClose={() => setIsTasksOpen(false)}
          onClearCompleted={() => setSftpTasks(sftpTasks.filter(t => t.status === 'transferring' || t.status === 'started'))}
          activeTasksCount={activeTasksCount}
        />

      </div>

      {/* 新建/修改会话及文件夹弹窗 */}
      {/* 新建/修改会话及文件夹弹窗 */}
      <SessionModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        modalMode={modalMode as 'create' | 'edit'}
        formData={formData}
        setFormData={setFormData}
        foldersOnly={foldersOnly}
        sessions={sessions}
        handleSaveSession={handleSaveSession}
        sessionModalTab={sessionModalTab}
        setSessionModalTab={setSessionModalTab}
        getColorLabelClass={getColorLabelClass}
        customThemes={settings.customThemes || []}
      />



      {/* 系统配置弹窗受控组件 */}
      <NetworkPrompts />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
        onSaveSettings={handleSaveSettings}
        onEnableMasterPassword={handleEnableMasterPassword}
        onDisableMasterPassword={handleDisableMasterPassword}
        initialTab={settingsInitialTab}
        onOpenKeybindingManager={() => setIsKeybindingModalOpen(true)}
      />
      {isKeyManagerOpen && <KeyManagerModal onClose={() => setIsKeyManagerOpen(false)} />}
      {isAuthManagerOpen && (
        <AuthProfileManagerModal
          onClose={() => {
            setIsAuthManagerOpen(false);
            loadAuthProfiles();
          }}
        />
      )}

      {/* 底部交互状态栏 (Interactive Status Bar) */}
      <StatusBar
        activeTabId={activeTabId}
        activeTab={openTabs.find(t => t.id === activeTabId) || null}
        trafficSpeeds={trafficSpeeds}
        termDimensions={termDimensions}
        isBroadcast={isBroadcast}
        onToggleBroadcast={() => setIsBroadcast(prev => !prev)}
        isSyncScroll={isSyncScroll}
        onToggleSyncScroll={() => setIsSyncScroll(prev => !prev)}
        isRecording={isRecording}
        startRecordingMacro={startRecordingMacro}
        stopRecordingMacro={stopRecordingMacro}
        onOpenCastPlayer={() => setIsCastPlayerOpen(true)}
        selectedMacroId={selectedMacroId}
        playMacro={playMacro}
        protocol={openTabs.find(t => t.id === activeTabId)?.protocol || (openTabs.find(t => t.id === activeTabId)?.isLocal ? 'local' : 'ssh')}
        encoding={openTabs.find(t => t.id === activeTabId)?.encoding || 'utf-8'}
        onUpdateEncoding={handleUpdateActiveTabEncoding}
        onResizeTerminal={handleResizeActiveTerminal}
        isCommandBlockMode={Boolean(activeTabId && commandBlockModes[activeTabId])}
        onToggleCommandBlockMode={handleToggleCommandBlockMode}
      />

      {/* Tab 右键自定义上下文气泡菜单 */}
      <TabContextMenu
        tabContextMenu={tabContextMenu}
        setTabContextMenu={setTabContextMenu}
        openTabs={openTabs}
        setOpenTabs={setOpenTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        secondaryTabId={secondaryTabId}
        setSecondaryTabId={setSecondaryTabId}
        splitMode={splitMode}
        setSplitMode={setSplitMode}
        lockedTabs={lockedTabs}
        toggleTabLock={toggleTabLock}
        customTabNames={customTabNames}
        setRenameTabId={setRenameTabId}
        setRenameInput={setRenameInput}
        setIsRenameModalOpen={setIsRenameModalOpen}
        handleReconnectTab={handleReconnectTab}
        handleCloneTab={handleCloneTab}
        handleDetachTab={handleDetachTab}
        handleCloseOtherTabs={handleCloseOtherTabs}
        handleCloseRightTabs={handleCloseRightTabs}
        linkedTabIds={linkedTabIds}
        setLinkedTabIds={setLinkedTabIds}
        setShareSessionModalData={setShareSessionModalData}
        t={t}
      />

      {/* 临时重命名标签页弹窗 */}
      <RenameTabModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        renameInput={renameInput}
        setRenameInput={setRenameInput}
        onSubmit={handleRenameTabSubmit}
      />

      {/* 会话管理器树节点与空白区右键菜单 */}
      <SessionTreeContextMenu
        sessionContextMenu={sessionContextMenu}
        setSessionContextMenu={setSessionContextMenu}
        sidebarBlankContextMenu={sidebarBlankContextMenu}
        setSidebarBlankContextMenu={setSidebarBlankContextMenu}
        selectedSessionIds={selectedSessionIds}
        setSelectedSessionIds={setSelectedSessionIds}
        sessions={sessions}
        expandedFolders={expandedFolders}
        settings={settings}
        t={t}
        handleConnect={handleConnect}
        handleConnectFolder={handleConnectFolder}
        handleCloneSessionConfig={handleCloneSessionConfig}
        handleEditSession={handleEditSession}
        handleDeleteSession={handleDeleteSession}
        toggleFavoriteSession={toggleFavoriteSession}
        resetSessionFormData={resetSessionFormData}
        resetFolderFormData={resetFolderFormData}
        setModalMode={setModalMode}
        setIsModalOpen={setIsModalOpen}
        setIsBatchModalOpen={setIsBatchModalOpen}
        toggleFolder={toggleFolder}
        handleExpandAllFolders={handleExpandAllFolders}
        handleCollapseAllFolders={handleCollapseAllFolders}
        triggerBatchProbeReachability={triggerBatchProbeReachability}
      />

      {/* 全局辅助与运维类弹窗聚合容器 */}
      <AppModalsContainer
        isGlobalSearchOpen={isGlobalSearchOpen}
        setIsGlobalSearchOpen={setIsGlobalSearchOpen}
        openTabs={openTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        deleteConfirmId={deleteConfirmId}
        setDeleteConfirmId={setDeleteConfirmId}
        confirmDeleteSession={confirmDeleteSession}
        folderToConnect={folderToConnect}
        setFolderToConnect={setFolderToConnect}
        confirmConnectFolder={confirmConnectFolder}
        macroToDelete={macroToDelete}
        setMacroToDelete={setMacroToDelete}
        confirmDeleteMacro={confirmDeleteMacro}
        isSaveMacroModalOpen={isSaveMacroModalOpen}
        setIsSaveMacroModalOpen={setIsSaveMacroModalOpen}
        saveRecordedMacro={saveRecordedMacro}
        macroNameInput={macroNameInput}
        setMacroNameInput={setMacroNameInput}
        tempMacroActionCount={tempMacroActionCount}
        isShortcutRefOpen={isShortcutRefOpen}
        setIsShortcutRefOpen={setIsShortcutRefOpen}
        isKeybindingModalOpen={isKeybindingModalOpen}
        setIsKeybindingModalOpen={setIsKeybindingModalOpen}
        isTriggerManagerOpen={isTriggerManagerOpen}
        setIsTriggerManagerOpen={setIsTriggerManagerOpen}
        settings={settings}
        setSettings={setSettings}
        isTabManagerOpen={isTabManagerOpen}
        setIsTabManagerOpen={setIsTabManagerOpen}
        handleCloseTab={onRequestCloseTab}
        lockedTabs={lockedTabs}
        toggleTabLock={toggleTabLock}
        tabStatus={tabStatus}
        tabPendingClose={tabPendingClose}
        onConfirmCloseTab={onConfirmCloseTab}
        onCancelCloseTab={cancelCloseTab}
        isCloseAppModalOpen={isCloseAppModalOpen}
        closeAppAction={(settings as any).closeAction || 'tray'}
        disableSystemTray={Boolean((settings as any).disableSystemTray)}
        onConfirmCloseApp={handleConfirmCloseApp}
        onCancelCloseApp={handleCancelCloseApp}
        isBatchModalOpen={isBatchModalOpen}
        setIsBatchModalOpen={setIsBatchModalOpen}
        sessions={sessions}
        selectedSessionIds={selectedSessionIds}
        loadSessions={loadSessions}
        isImportModalOpen={isImportModalOpen}
        setIsImportModalOpen={setIsImportModalOpen}
        isParamModalOpen={isParamModalOpen}
        setIsParamModalOpen={setIsParamModalOpen}
        paramTemplateCmd={paramTemplateCmd}
        sendCmdDirect={sendCmdDirect}
        isTunnelMonitorOpen={isTunnelMonitorOpen}
        setIsTunnelMonitorOpen={setIsTunnelMonitorOpen}
        isScriptRunnerOpen={isScriptRunnerOpen}
        setIsScriptRunnerOpen={setIsScriptRunnerOpen}
        isCastPlayerOpen={isCastPlayerOpen}
        setIsCastPlayerOpen={setIsCastPlayerOpen}
        activeCastContent={activeCastContent}
        isHostMonitorOpen={isHostMonitorOpen}
        setIsHostMonitorOpen={setIsHostMonitorOpen}
        isRemoteOpsOpen={isRemoteOpsOpen}
        setIsRemoteOpsOpen={setIsRemoteOpsOpen}
        isRealtimeLogOpen={isRealtimeLogOpen}
        setIsRealtimeLogOpen={setIsRealtimeLogOpen}
        isTopologyOpen={isTopologyOpen}
        setIsTopologyOpen={setIsTopologyOpen}
        toggleSftpPanel={toggleSftpPanel}
        isMultiExecDiffOpen={isMultiExecDiffOpen}
        setIsMultiExecDiffOpen={setIsMultiExecDiffOpen}
        isQuakeDropdownOpen={isQuakeDropdownOpen}
        setIsQuakeDropdownOpen={setIsQuakeDropdownOpen}
        hasOpenedQuake={hasOpenedQuake}
        isTotpManagerOpen={isTotpManagerOpen}
        setIsTotpManagerOpen={setIsTotpManagerOpen}
        isInspectionModalOpen={isInspectionModalOpen}
        setIsInspectionModalOpen={setIsInspectionModalOpen}
        customTabNames={customTabNames}
        shareSessionModalData={shareSessionModalData}
        setShareSessionModalData={setShareSessionModalData}
        sharedTerminalViewerUrl={sharedTerminalViewerUrl}
        setSharedTerminalViewerUrl={setSharedTerminalViewerUrl}
        isAICopilotOpen={isAICopilotOpen}
        setIsAICopilotOpen={setIsAICopilotOpen}
        isAIConfigModalOpen={isAIConfigModalOpen}
        setIsAIConfigModalOpen={setIsAIConfigModalOpen}
        setIsAIChatDrawerOpen={setIsAIChatDrawerOpen}
        terminalDirs={terminalDirs}
        aiCopilotMode={aiCopilotMode}
        aiCopilotErrorText={aiCopilotErrorText}
        aiCopilotLastCmd={aiCopilotLastCmd}
        isCloudSyncOpen={isCloudSyncOpen}
        setIsCloudSyncOpen={setIsCloudSyncOpen}
        isRunbookOpen={isRunbookOpen}
        setIsRunbookOpen={setIsRunbookOpen}
        isCommandPaletteOpen={isCommandPaletteOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        isCommandHistoryOpen={isCommandHistoryOpen}
        setIsCommandHistoryOpen={setIsCommandHistoryOpen}
        handleConnect={handleConnect}
        handlePaletteAction={handlePaletteAction}
      />

      {/* 全屏主密码锁定界面 (LockScreen Overlay) */}
      {isLocked && (
        <LockScreen
          isLocked={isLocked}
          setIsLocked={setIsLocked}
          loadSessions={loadSessions}
          loadSettings={loadSettings}
          setAuthProfiles={setAuthProfiles}
          t={t}
        />
      )}
    </div>
  );
}

export default App;


