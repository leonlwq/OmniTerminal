import React from 'react';
import { app, models } from '../../wailsjs/go/models';
import { SplitMode } from '../hooks/useTabManager';
import { TabBar } from './TabBar';
import { RdpInstance } from './RdpInstance';
import { VncInstance } from './VncInstance';
import { TerminalInstance } from './TerminalInstance';
import { SftpPanel } from './SftpPanel';
import { WriteSSH } from '../../wailsjs/go/app/App';

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

export const TerminalWorkspacePanes: React.FC<TerminalWorkspacePanesProps> = ({
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
  return (
    <div className={`flex-1 flex overflow-hidden relative ${
      splitMode === 'grid2x2' ? 'grid grid-cols-2 grid-rows-2 gap-px bg-[#1a1a1a]' :
      splitMode === 'grid1plus2' ? 'grid grid-cols-2 grid-rows-2 gap-px bg-[#1a1a1a]' :
      splitMode === 'horizontal' ? 'flex-col' : 'flex-row'
    }`}>
      {openTabs.map((tab, tabIdx) => {
        const isPrimary = activeTabId === tab.id;
        const isSecondary = splitMode !== 'none' && splitMode !== 'grid2x2' && splitMode !== 'grid1plus2' && secondaryTabId === tab.id;
        const isGridVisible = (splitMode === 'grid2x2' && tabIdx < 4) || (splitMode === 'grid1plus2' && tabIdx < 3);
        const isVisible = (splitMode === 'grid2x2' || splitMode === 'grid1plus2') ? isGridVisible : (isPrimary || isSecondary);

        const currentActiveForPane = isPrimary ? activeTabId : (isSecondary ? secondaryTabId : tab.id);
        const setActiveForPane = (id: string) => isPrimary ? setActiveTabId(id) : setSecondaryTabId(id);

        return (
          <div
            key={tab.id}
            className={`flex flex-col min-w-0 min-h-0 border-app-border ${splitMode === 'grid1plus2' && tabIdx === 0 ? 'row-span-2' : ''}`}
            style={{
              display: isVisible ? 'flex' : 'none',
              flex: (splitMode === 'vertical' || splitMode === 'horizontal') ? '1 1 50%' : (splitMode === 'none' ? '1 1 100%' : undefined),
              borderRightWidth: splitMode === 'vertical' && isPrimary && secondaryTabId ? '1px' : '0',
              borderBottomWidth: splitMode === 'horizontal' && isPrimary && secondaryTabId ? '1px' : '0'
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
            <div className="flex-1 h-full min-w-0 flex">
              {tab.sessionMode !== 'sftp-only' && (
                <div className="flex-1 h-full min-w-0">
                  {tab.protocol === 'rdp' ? (
                    <RdpInstance
                      key={tab.id + "_" + (connectEpochs[tab.id] || 0)}
                      tab={tab}
                      isActive={activeTabId === tab.id}
                      onStatusChange={(sessId, status) => setTabStatus(prev => ({ ...prev, [sessId]: status }))}
                    />
                  ) : tab.protocol === 'vnc' ? (
                    <VncInstance
                      key={tab.id + "_" + (connectEpochs[tab.id] || 0)}
                      tab={tab}
                      isActive={activeTabId === tab.id}
                      onStatusChange={(sessId, status) => setTabStatus(prev => ({ ...prev, [sessId]: status }))}
                    />
                  ) : (
                    <TerminalInstance
                      onUserInput={(data) => handleLinkedInput(data, tab.id)}
                      key={tab.id + "_" + (connectEpochs[tab.id] || 0)}
                      sessionId={tab.id}
                      name={tab.name}
                      host={tab.host}
                      port={tab.port}
                      user={tab.user}
                      password={tab.password}
                      privateKey={tab.privateKey}
                      identityKeyId={tab.identityKeyId}
                      loginScripts={tab.loginScripts || []}
                      triggers={tab.triggers || []}
                      overrideTheme={tab.overrideTheme || ''}
                      overrideFontSize={tab.overrideFontSize || 0}
                      logConfig={tab.logConfig}
                      tunnels={tab.tunnels || []}
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
                      customThemes={settings.customThemes || []}
                      quickCommands={settings.quickCommandSets?.find((s: any) => s.id === settings.activeCommandSetID)?.commands || []}
                      onOpenQuickCommandManager={() => setIsSettingsOpen(true)}
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
                      onClosed={() => { }}
                      onStatusChange={(sessId, status) => setTabStatus(prev => ({ ...prev, [sessId]: status }))}
                      isCommandBlockMode={Boolean(commandBlockModes && commandBlockModes[tab.id])}
                      onToggleCommandBlockMode={() => setCommandBlockModes?.(prev => ({ ...prev, [tab.id]: !prev[tab.id] }))}
                      onTrafficUpdate={(sessId, rx, tx) => setTrafficSpeeds(prev => ({ ...prev, [sessId]: { rx, tx } }))}
                      onTerminalReady={(cols, rows) => setTermDimensions(prev => ({ ...prev, [tab.id]: { cols, rows } }))}
                      scrollbackLines={settings.scrollbackLines}
                      copyOnSelect={settings.copyOnSelect}
                      highlightRules={settings.highlightRules || []}
                      keyMappings={settings.keyMappings || []}
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
                      onToggleAICopilot={() => {
                        setAiCopilotMode('command');
                        setIsAICopilotOpen(prev => !prev);
                      }}
                      onZoomIn={handleZoomIn}
                      onZoomOut={handleZoomOut}
                      onZoomReset={handleZoomReset}
                      onOpenSettings={() => setIsSettingsOpen(true)}
                      onToggleSidebar={() => setActiveDockPanel(prev => prev === 'sessions' ? 'none' : 'sessions')}
                      onToggleCompose={() => setIsComposeOpen(prev => !prev)}
                      onToggleSftp={handleToggleSftp}
                      onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
                      onOpenShortcuts={() => setIsShortcutRefOpen(true)}
                      onToggleBroadcast={() => setIsBroadcast(prev => !prev)}
                      onToggleSplitVertical={() => setSplitMode(prev => prev === 'vertical' ? 'none' : 'vertical')}
                      onToggleSplitHorizontal={() => setSplitMode(prev => prev === 'horizontal' ? 'none' : 'horizontal')}
                      onToggleTunnelMonitor={() => setIsTunnelMonitorOpen(prev => !prev)}
                      onToggleHostMonitor={() => setIsHostMonitorOpen(prev => !prev)}
                      onToggleRemoteOps={() => setIsRemoteOpsOpen(prev => !prev)}
                      onToggleRealtimeLog={() => setIsRealtimeLogOpen(prev => !prev)}
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
                      dangerousRules={settings.dangerousRules || []}
                      useAltAsMeta={settings.useAltAsMeta ?? true}
                      wordSeparators={settings.wordSeparators}
                      openLinksOnClick={settings.openLinksOnClick}
                      enableMiniTelemetry={(settings as any).enableMiniTelemetry !== false}
                      miniTelemetryIntervalSec={(settings as any).miniTelemetryIntervalSec || 3}
                      onDirectoryChange={(sid, dir) => setTerminalDirs(prev => ({ ...prev, [sid]: dir }))}
                      onTriggerAIDiagnose={(errText, lastCmd) => {
                        setAiCopilotMode('diagnose');
                        setAiCopilotErrorText(errText);
                        setAiCopilotLastCmd(lastCmd);
                        setIsAICopilotOpen(true);
                      }}
                    />
                  )}
                </div>
              )}

              {(openSftpTabs.includes(tab.id) || tab.sessionMode === 'sftp-only') && (
                <SftpPanel
                  sessionId={tab.id}
                  onClose={() => setOpenSftpTabs(openSftpTabs.filter(id => id !== tab.id))}
                  currentTerminalDir={terminalDirs[tab.id]}
                  onCdToTerminal={(dir) => {
                    const cmd = `cd ${JSON.stringify(dir)}\n`;
                    const encoder = new TextEncoder();
                    const rawBytes = encoder.encode(cmd);
                    let binary = '';
                    for (let i = 0; i < rawBytes.byteLength; i++) {
                      binary += String.fromCharCode(rawBytes[i]);
                    }
                    WriteSSH(tab.id, window.btoa(binary));
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
