import React, { useCallback, useMemo, useEffect } from 'react';
import { app, models } from '../../wailsjs/go/models';
import { SplitMode } from '../hooks/useTabManager';
import { TabBar } from './TabBar';
import { RdpInstance } from './RdpInstance';
import { VncInstance } from './VncInstance';
import { TerminalInstance } from './TerminalInstance';
import { SftpPanel } from './SftpPanel';
import { WriteSSH, SaveSettings } from '../../wailsjs/go/app/App';

const EMPTY_ARRAY: any[] = [];
const NOOP = () => {};

export interface TerminalWorkspacePanesProps {
  openTabs: app.SessionConfig[];
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  secondaryTabId: string | null;
  setSecondaryTabId: (id: string | null) => void;
  splitMode: SplitMode;
  setSplitMode: React.Dispatch<React.SetStateAction<SplitMode>>;
  tabStatus: { [id: string]: string };
  setTabStatus: React.Dispatch<React.SetStateAction<{ [id: string]: string }>>;
  customTabNames: { [id: string]: string };
  linkedTabIds: string[];
  lockedTabs: string[];
  handleTabContextMenu: (e: React.MouseEvent, id: string) => void;
  setDraggedTabId: (id: string | null) => void;
  handleTabDrop: (id: string) => void;
  handleCloseTab: (id: string, e?: React.MouseEvent) => void;
  handleDetachTab?: (id: string) => void;
  handleDuplicateTab?: (tab: app.SessionConfig, targetPaneSetter?: (id: string) => void) => void;
  resetSessionFormData: (parentId?: string) => void;
  setModalMode: (mode: 'create' | 'edit') => void;
  setIsModalOpen: (open: boolean) => void;
  handleTabAreaDoubleClick: (e: React.MouseEvent) => void;
  sharedSessionStates?: { [id: string]: { isSharing: boolean; viewerCount: number } };
  setShareSessionModalData: (data: { isOpen: boolean; sessionId: string; sessionName: string }) => void;
  connectEpochs: { [id: string]: number };
  handleLinkedInput: (data: string, tabId: string) => void;
  isRecording: boolean;
  settings: models.AppSettings;
  setSettings?: (settings: models.AppSettings) => void;
  setIsSettingsOpen: (open: boolean) => void;
  isSyncScroll: boolean;
  handleScrollSync: (ratio: number, sessionId: string) => void;
  setTrafficSpeeds: React.Dispatch<React.SetStateAction<Record<string, { rx: number; tx: number }>>>;
  setTermDimensions: React.Dispatch<React.SetStateAction<Record<string, { cols: number; rows: number }>>>;
  setAiCopilotMode: (mode: 'command' | 'diagnose' | 'script' | 'explain') => void;
  setIsAICopilotOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  setActiveDockPanel: React.Dispatch<React.SetStateAction<'sessions' | 'containers' | 'sftp' | 'none'>>;
  setIsComposeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleSftp: () => void;
  setIsGlobalSearchOpen: (open: boolean) => void;
  setIsShortcutRefOpen: (open: boolean) => void;
  setIsBroadcast: React.Dispatch<React.SetStateAction<boolean>>;
  terminalDirs: Record<string, string>;
  setTerminalDirs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setAiCopilotErrorText: (text: string) => void;
  setAiCopilotLastCmd: (cmd: string) => void;
  openSftpTabs: string[];
  setOpenSftpTabs: React.Dispatch<React.SetStateAction<string[]>>;
  setIsTunnelMonitorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHostMonitorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRemoteOpsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRealtimeLogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  commandBlockModes?: Record<string, boolean>;
  setCommandBlockModes?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const TerminalWorkspacePanesComponent: React.FC<TerminalWorkspacePanesProps> = ({
  openTabs,
  commandBlockModes,
  setCommandBlockModes,
  activeTabId,
  setActiveTabId,
  secondaryTabId,
  setSecondaryTabId,
  splitMode,
  setSplitMode,
  tabStatus,
  setTabStatus,
  customTabNames,
  linkedTabIds,
  lockedTabs,
  handleTabContextMenu,
  setDraggedTabId,
  handleTabDrop,
  handleCloseTab,
  handleDetachTab,
  handleDuplicateTab,
  resetSessionFormData,
  setModalMode,
  setIsModalOpen,
  handleTabAreaDoubleClick,
  sharedSessionStates,
  setShareSessionModalData,
  connectEpochs,
  handleLinkedInput,
  isRecording,
  settings,
  setSettings,
  setIsSettingsOpen,
  isSyncScroll,
  handleScrollSync,
  setTrafficSpeeds,
  setTermDimensions,
  setAiCopilotMode,
  setIsAICopilotOpen,
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  setActiveDockPanel,
  setIsComposeOpen,
  handleToggleSftp,
  setIsGlobalSearchOpen,
  setIsShortcutRefOpen,
  setIsBroadcast,
  terminalDirs,
  setTerminalDirs,
  setAiCopilotErrorText,
  setAiCopilotLastCmd,
  openSftpTabs,
  setOpenSftpTabs,
  setIsTunnelMonitorOpen,
  setIsHostMonitorOpen,
  setIsRemoteOpsOpen,
  setIsRealtimeLogOpen,
}) => {
  const handleStatusChange = useCallback((sessId: string, status: string) => {
    setTabStatus(prev => prev[sessId] === status ? prev : ({ ...prev, [sessId]: status }));
  }, [setTabStatus]);

  const handleTrafficUpdate = useCallback((sessId: string, rx: number, tx: number) => {
    setTrafficSpeeds(prev => {
      if (prev[sessId]?.rx === rx && prev[sessId]?.tx === tx) return prev;
      return { ...prev, [sessId]: { rx, tx } };
    });
  }, [setTrafficSpeeds]);

  const handleAddHighlightRule = useCallback((rule: any) => {
    const existingRules = settings.highlightRules || [];
    const updated = [...existingRules, rule];
    const newSettings = new models.AppSettings({ ...settings, highlightRules: updated });
    setSettings?.(newSettings);
    SaveSettings(newSettings).catch(console.error);
  }, [settings, setSettings]);

  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), [setIsSettingsOpen]);
  const handleToggleSidebar = useCallback(() => setActiveDockPanel(prev => prev === 'sessions' ? 'none' : 'sessions'), [setActiveDockPanel]);
  const handleToggleCompose = useCallback(() => setIsComposeOpen(prev => !prev), [setIsComposeOpen]);
  const handleOpenGlobalSearch = useCallback(() => setIsGlobalSearchOpen(true), [setIsGlobalSearchOpen]);
  const handleOpenShortcuts = useCallback(() => setIsShortcutRefOpen(true), [setIsShortcutRefOpen]);
  const handleToggleBroadcast = useCallback(() => setIsBroadcast(prev => !prev), [setIsBroadcast]);
  const handleToggleSplitVertical = useCallback(() => setSplitMode(prev => prev === 'vertical' ? 'none' : 'vertical'), [setSplitMode]);
  const handleToggleSplitHorizontal = useCallback(() => setSplitMode(prev => prev === 'horizontal' ? 'none' : 'horizontal'), [setSplitMode]);
  const handleToggleTunnelMonitor = useCallback(() => setIsTunnelMonitorOpen(prev => !prev), [setIsTunnelMonitorOpen]);
  const handleToggleHostMonitor = useCallback(() => setIsHostMonitorOpen(prev => !prev), [setIsHostMonitorOpen]);
  const handleToggleRemoteOps = useCallback(() => setIsRemoteOpsOpen(prev => !prev), [setIsRemoteOpsOpen]);
  const handleToggleRealtimeLog = useCallback(() => setIsRealtimeLogOpen(prev => !prev), [setIsRealtimeLogOpen]);

  // 确保在双分屏模式（vertical / horizontal）下，如果 secondaryTabId 为空或等于 activeTabId，自动安全分配另一可用 Tab
  const effectiveSecondaryTabId = useMemo(() => {
    if (splitMode === 'none' || splitMode === 'grid2x2' || splitMode === 'grid1plus2') return null;
    if (secondaryTabId && secondaryTabId !== activeTabId && openTabs.some(t => t.id === secondaryTabId)) {
      return secondaryTabId;
    }
    const fallback = openTabs.find(t => t.id !== activeTabId);
    return fallback ? fallback.id : null;
  }, [splitMode, secondaryTabId, activeTabId, openTabs]);

  // 记忆化 SFTP 标签页列表引用，基于结构指纹阻断 Tab 内部不相关变更时的全量 re-render
  const sftpOpenTabsFingerprint = useMemo(() => {
    return openTabs.map(t => `${t.id}:${t.name || t.id}:${t.host}:${Boolean(t.isLocal)}`).join(';');
  }, [openTabs]);

  const sftpOpenTabs = useMemo(() => {
    return openTabs.map(t => ({ id: t.id, title: t.name || t.id, host: t.host, isLocal: t.isLocal }));
  }, [sftpOpenTabsFingerprint]);

  const handleCdToTerminal = useCallback((tabId: string, dir: string) => {
    const cmd = `cd ${JSON.stringify(dir)}\n`;
    const encoder = new TextEncoder();
    const rawBytes = encoder.encode(cmd);
    let binary = '';
    for (let i = 0; i < rawBytes.byteLength; i++) {
      binary += String.fromCharCode(rawBytes[i]);
    }
    WriteSSH(tabId, window.btoa(binary));
  }, []);

  // 稳定快捷命令列表，避免无变更时反复分配新数组打破 memo
  const activeQuickCommands = useMemo(() => {
    return settings.quickCommandSets?.find((s: any) => s.id === settings.activeCommandSetID)?.commands || EMPTY_ARRAY;
  }, [settings.quickCommandSets, settings.activeCommandSetID]);

  // 命令块模式切换回调（具备会话标识透传）
  const handleToggleCommandBlockMode = useCallback((sessId?: string) => {
    if (!sessId) return;
    setCommandBlockModes?.(prev => ({ ...prev, [sessId]: !prev[sessId] }));
  }, [setCommandBlockModes]);

  // 终端尺寸稳定报告，严格按值比较，消除向根组件扩散的重绘风暴
  const handleTerminalReadyStable = useCallback((cols: number, rows: number, tabId?: string) => {
    if (!tabId) return;
    setTermDimensions(prev => {
      const existing = prev[tabId];
      if (existing && existing.cols === cols && existing.rows === rows) return prev;
      return { ...prev, [tabId]: { cols, rows } };
    });
  }, [setTermDimensions]);

  // AI Copilot 呼出与诊断稳定回调
  const handleToggleAICopilot = useCallback(() => {
    setAiCopilotMode('command');
    setIsAICopilotOpen(prev => !prev);
  }, [setAiCopilotMode, setIsAICopilotOpen]);

  const handleDirectoryChange = useCallback((sid: string, dir: string) => {
    setTerminalDirs(prev => prev[sid] === dir ? prev : ({ ...prev, [sid]: dir }));
  }, [setTerminalDirs]);

  const handleTriggerAIDiagnose = useCallback((errText: string, lastCmd: string) => {
    setAiCopilotMode('diagnose');
    setAiCopilotErrorText(errText);
    setAiCopilotLastCmd(lastCmd);
    setIsAICopilotOpen(true);
  }, [setAiCopilotMode, setAiCopilotErrorText, setAiCopilotLastCmd, setIsAICopilotOpen]);

  // 自动将计算出的 effectiveSecondaryTabId 同步回父级状态
  useEffect(() => {
    if ((splitMode === 'vertical' || splitMode === 'horizontal') && effectiveSecondaryTabId && secondaryTabId !== effectiveSecondaryTabId) {
      setSecondaryTabId(effectiveSecondaryTabId);
    }
  }, [splitMode, effectiveSecondaryTabId, secondaryTabId, setSecondaryTabId]);

  return (
    <div className={`flex-1 flex overflow-hidden relative ${
      splitMode === 'grid2x2' ? 'grid grid-cols-2 grid-rows-2 gap-px bg-[#1a1a1a]' :
      splitMode === 'grid1plus2' ? 'grid grid-cols-2 grid-rows-2 gap-px bg-[#1a1a1a]' :
      splitMode === 'horizontal' ? 'flex-col' : 'flex-row'
    }`}>
      {openTabs.map((tab, tabIdx) => {
        const isPrimary = activeTabId === tab.id;
        const isSecondary = splitMode !== 'none' && splitMode !== 'grid2x2' && splitMode !== 'grid1plus2' && effectiveSecondaryTabId === tab.id;
        const isGridVisible = (splitMode === 'grid2x2' && tabIdx < 4) || (splitMode === 'grid1plus2' && tabIdx < 3);
        const isVisible = (splitMode === 'grid2x2' || splitMode === 'grid1plus2') ? isGridVisible : (isPrimary || isSecondary);

        const currentActiveForPane = isPrimary ? activeTabId : (isSecondary ? effectiveSecondaryTabId : tab.id);
        const setActiveForPane = (id: string) => isPrimary ? setActiveTabId(id) : setSecondaryTabId(id);

        // 判断当前 tab 是否为首个可见面板（用于在两面板之间渲染 1px 分割线）
        const isFirstVisible = (splitMode === 'vertical' || splitMode === 'horizontal') && (
          tab.id === openTabs.find(t => t.id === activeTabId || t.id === effectiveSecondaryTabId)?.id
        );

        return (
          <div
            key={tab.id}
            className={`flex flex-col min-w-0 min-h-0 border-app-border ${splitMode === 'grid1plus2' && tabIdx === 0 ? 'row-span-2' : ''}`}
            style={{
              display: isVisible ? 'flex' : 'none',
              flex: (splitMode === 'vertical' || splitMode === 'horizontal') ? '1 1 50%' : (splitMode === 'none' ? '1 1 100%' : undefined),
              borderRightWidth: splitMode === 'vertical' && isFirstVisible && effectiveSecondaryTabId ? '1px' : '0',
              borderBottomWidth: splitMode === 'horizontal' && isFirstVisible && effectiveSecondaryTabId ? '1px' : '0'
            }}
          >
            {/* 独立 Tab 栏 (仅在显示此容器时渲染) */}
            {isVisible && (
              <TabBar
                openTabs={openTabs}
                tabStatus={tabStatus}
                currentActiveForPane={currentActiveForPane}
                setActiveForPane={setActiveForPane}
                customTabNames={customTabNames}
                linkedTabIds={linkedTabIds}
                lockedTabs={lockedTabs}
                handleTabContextMenu={handleTabContextMenu}
                setDraggedTabId={setDraggedTabId}
                handleTabDrop={handleTabDrop}
                handleCloseTab={handleCloseTab}
                handleDetachTab={handleDetachTab}
                handleDuplicateTab={(targetTab) => handleDuplicateTab ? handleDuplicateTab(targetTab, setActiveForPane) : undefined}
                resetSessionFormData={resetSessionFormData}
                setModalMode={setModalMode}
                setIsModalOpen={setIsModalOpen}
                handleTabAreaDoubleClick={handleTabAreaDoubleClick}
                sharedSessionIds={sharedSessionStates}
                onOpenShareModal={(sessId) => {
                  const tabItem = openTabs.find(t => t.id === sessId);
                  setShareSessionModalData({
                    isOpen: true,
                    sessionId: sessId,
                    sessionName: customTabNames[sessId] || tabItem?.name || sessId
                  });
                }}
              />
            )}
            <div className="flex-1 min-h-0 min-w-0 flex">
              {tab.sessionMode !== 'sftp-only' && (
                <div className="flex-1 min-h-0 min-w-0 flex flex-col">
                  {tab.protocol === 'rdp' ? (
                    <RdpInstance
                      key={tab.id + "_" + (connectEpochs[tab.id] || 0)}
                      tab={tab}
                      isActive={activeTabId === tab.id}
                      onStatusChange={handleStatusChange}
                    />
                  ) : tab.protocol === 'vnc' ? (
                    <VncInstance
                      key={tab.id + "_" + (connectEpochs[tab.id] || 0)}
                      tab={tab}
                      isActive={activeTabId === tab.id}
                      onStatusChange={handleStatusChange}
                    />
                  ) : (
                    <TerminalInstance
                      onUserInput={handleLinkedInput}
                      key={tab.id + "_" + (connectEpochs[tab.id] || 0)}
                      sessionId={tab.id}
                      name={tab.name}
                      host={tab.host}
                      port={tab.port}
                      user={tab.user}
                      password={tab.password}
                      privateKey={tab.privateKey}
                      identityKeyId={tab.identityKeyId}
                      loginScripts={tab.loginScripts || EMPTY_ARRAY}
                      triggers={tab.triggers || EMPTY_ARRAY}
                      overrideTheme={tab.overrideTheme || ''}
                      overrideFontSize={tab.overrideFontSize || 0}
                      logConfig={tab.logConfig}
                      tunnels={tab.tunnels || EMPTY_ARRAY}
                      isRecordingMacro={isRecording && activeTabId === tab.id}
                      isActive={activeTabId === tab.id}
                      themeName={settings.themeName}
                      fontFamily={settings.fontFamily}
                      nonAsciiFontFamily={settings.nonAsciiFontFamily}
                      fontSize={settings.fontSize}
                      lineHeight={settings.lineHeight}
                      overrideLineHeight={(tab as any).overrideLineHeight}
                      terminalPadding={settings.terminalPadding}
                      overrideTerminalPadding={(tab as any).overrideTerminalPadding}
                      backgroundBlur={(tab as any).backgroundBlur}
                      backgroundFit={(tab as any).backgroundFit}
                      enableLigatures={settings.enableLigatures ?? true}
                      overrideEnableLigatures={(tab as any).overrideEnableLigatures || 0}
                      customThemes={settings.customThemes || EMPTY_ARRAY}
                      quickCommands={activeQuickCommands}
                      onOpenQuickCommandManager={handleOpenSettings}
                      syncScroll={isSyncScroll}
                      onScrollSync={handleScrollSync}
                      charSendDelayMs={settings.charSendDelayMs || 0}
                      lineSendDelayMs={settings.lineSendDelayMs || 0}
                      overrideCharSendDelayMs={(tab as any).overrideCharSendDelayMs || 0}
                      overrideLineSendDelayMs={(tab as any).overrideLineSendDelayMs || 0}
                      terminalOpacity={settings.terminalOpacity}
                      overrideTerminalOpacity={tab.overrideTerminalOpacity}
                      enableBlur={settings.enableBlur || false}
                      backgroundImage={tab.backgroundImage}
                      backgroundOpacity={tab.backgroundOpacity}
                      fontWeight={(settings as any).fontWeight || 'normal'}
                      fontWeightBold={(settings as any).fontWeightBold || 'bold'}
                      letterSpacing={(settings as any).letterSpacing ?? 0}
                      minimumContrastRatio={(settings as any).minimumContrastRatio ?? 1}
                      globalBackgroundImage={(settings as any).globalBackgroundImage || ''}
                      globalBackgroundOpacity={(settings as any).globalBackgroundOpacity ?? 0.3}
                      globalBackgroundBlur={(settings as any).globalBackgroundBlur ?? 0}
                      globalBackgroundFit={(settings as any).globalBackgroundFit || 'cover'}
                      customGlyphs={(settings as any).customGlyphs !== false}
                      unicodeVersion={(settings as any).unicodeVersion || '11'}
                      drawBoldTextInBrightColors={(settings as any).drawBoldTextInBrightColors !== false}
                      cursorColor={(settings as any).cursorColor || ''}
                      cursorAccentColor={(settings as any).cursorAccentColor || ''}
                      selectionBackground={(settings as any).selectionBackground || ''}
                      selectionForeground={(settings as any).selectionForeground || ''}
                      rendererType={(settings as any).rendererType || 'auto'}
                      fontSmoothing={(settings as any).fontSmoothing || 'antialiased'}
                      enableTerminalImages={(settings as any).enableTerminalImages !== false}
                      imageStorageLimitMB={(settings as any).imageStorageLimitMB || 128}
                      aiConfig={settings.aiConfig}
                      onClosed={NOOP}
                      onStatusChange={handleStatusChange}
                      isCommandBlockMode={Boolean(commandBlockModes && commandBlockModes[tab.id])}
                      onToggleCommandBlockMode={handleToggleCommandBlockMode}
                      onTrafficUpdate={handleTrafficUpdate}
                      onTerminalReady={handleTerminalReadyStable}
                      scrollbackLines={settings.scrollbackLines}
                      copyOnSelect={settings.copyOnSelect}
                      enableHighlightRules={(settings as any).enableHighlightRules !== false}
                      highlightRules={settings.highlightRules || EMPTY_ARRAY}
                      onAddHighlightRule={handleAddHighlightRule}
                      keyMappings={settings.keyMappings || EMPTY_ARRAY}
                      rightClickAction={settings.rightClickAction || 'contextMenu'}
                      doubleClickAction={settings.doubleClickAction || 'selectWord'}
                      cursorStyle={settings.cursorStyle as 'block' | 'underline' | 'bar'}
                      cursorBlink={settings.cursorBlink}
                      enableBell={settings.enableBell}
                      overrideScrollback={tab.overrideScrollback}
                      overrideCursorStyle={tab.overrideCursorStyle}
                      overrideCursorBlink={tab.overrideCursorBlink}
                      overrideEnableBell={tab.overrideEnableBell}
                      overrideCopyOnSelect={tab.overrideCopyOnSelect}
                      onToggleAICopilot={handleToggleAICopilot}
                      onZoomIn={handleZoomIn}
                      onZoomOut={handleZoomOut}
                      onZoomReset={handleZoomReset}
                      onOpenSettings={handleOpenSettings}
                      onToggleSidebar={handleToggleSidebar}
                      onToggleCompose={handleToggleCompose}
                      onToggleSftp={handleToggleSftp}
                      onOpenGlobalSearch={handleOpenGlobalSearch}
                      onOpenShortcuts={handleOpenShortcuts}
                      onToggleBroadcast={handleToggleBroadcast}
                      onToggleSplitVertical={handleToggleSplitVertical}
                      onToggleSplitHorizontal={handleToggleSplitHorizontal}
                      onToggleTunnelMonitor={handleToggleTunnelMonitor}
                      onToggleHostMonitor={handleToggleHostMonitor}
                      onToggleRemoteOps={handleToggleRemoteOps}
                      onToggleRealtimeLog={handleToggleRealtimeLog}
                      encoding={tab.encoding || 'utf-8'}
                      jumpHostSessionId={tab.jumpHostSessionId || ''}
                      termType={tab.termType || 'xterm-256color'}
                      isLocal={tab.isLocal || false}
                      protocol={tab.protocol || (tab.isLocal ? 'local' : 'ssh')}
                      serialConfig={tab.serialConfig}
                      lineEnding={tab.lineEnding || 'CRLF'}
                      wslDistro={tab.wslDistro || ''}
                      shellPath={tab.shellPath || ''}
                      moshServerPath={(tab as any).moshServerPath || 'mosh-server'}
                      moshPortRange={(tab as any).moshPortRange || '60000:61000'}
                      enableSafePaste={settings.enableSafePaste ?? true}
                      enableDangerousGuard={settings.enableDangerousGuard ?? true}
                      dangerousRules={settings.dangerousRules || EMPTY_ARRAY}
                      useAltAsMeta={settings.useAltAsMeta ?? true}
                      wordSeparators={settings.wordSeparators}
                      openLinksOnClick={settings.openLinksOnClick}
                      enableMiniTelemetry={(settings as any).enableMiniTelemetry !== false}
                      miniTelemetryIntervalSec={(settings as any).miniTelemetryIntervalSec || 3}
                      onDirectoryChange={handleDirectoryChange}
                      onTriggerAIDiagnose={handleTriggerAIDiagnose}
                    />
                  )}
                </div>
              )}

              {(openSftpTabs.includes(tab.id) || tab.sessionMode === 'sftp-only') && (
                <SftpPanel
                  sessionId={tab.id}
                  isActive={tab.id === activeTabId || tab.id === effectiveSecondaryTabId}
                  onClose={() => setOpenSftpTabs(prev => prev.filter(id => id !== tab.id))}
                  currentTerminalDir={terminalDirs[tab.id]}
                  openTabs={sftpOpenTabs}
                  onCdToTerminal={(dir) => handleCdToTerminal(tab.id, dir)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const TerminalWorkspacePanes = React.memo(TerminalWorkspacePanesComponent);
