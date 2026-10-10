import React from 'react';
import { app, models } from '../../wailsjs/go/models';
import { WriteSSH, SaveSettings } from '../../wailsjs/go/app/App';
import { TerminalInstance, terminalBuffers } from './TerminalInstance';
import { ShortcutReferenceModal } from './ShortcutReferenceModal';
import { KeybindingManagerModal } from './KeybindingManagerModal';
import { TriggerManagerModal } from './TriggerManagerModal';
import { TabManagerModal } from './TabManagerModal';
import { BatchSessionModal } from './BatchSessionModal';
import { ImportSessionsModal } from './ImportSessionsModal';
import { ParamTemplateModal } from './ParamTemplateModal';
import { TunnelMonitorModal } from './TunnelMonitorModal';
import { ScriptRunnerModal } from './ScriptRunnerModal';
import { SessionCastPlayerModal } from './SessionCastPlayerModal';
import { HostMonitorDrawer } from './HostMonitorDrawer';
import { NetworkTopologyModal } from './NetworkTopologyModal';
import { MultiExecDiffModal } from './MultiExecDiffModal';
import { QuakeDropdownTerminal } from './QuakeDropdownTerminal';
import { TOTPManagerModal } from './TOTPManagerModal';
import { InspectionReportModal } from './InspectionReportModal';
import { ShareSessionModal } from './ShareSessionModal';
import { SharedTerminalViewerModal } from './SharedTerminalViewerModal';
import { RemoteOpsModal } from './RemoteOpsModal';
import { RealtimeLogModal } from './RealtimeLogModal';
import { OmniAICopilotModal } from './OmniAICopilotModal';
import { AIConfigModal } from './AIConfigModal';
import { CloudSyncModal } from './CloudSyncModal';
import { RunbookManagerModal } from './RunbookManagerModal';
import { CommandPaletteModal } from './CommandPaletteModal';
import { CommandHistoryModal } from './CommandHistoryModal';
import { GlobalSearchModal } from './GlobalSearchModal';
import { 
  DeleteConfirmModal, 
  ConnectFolderModal, 
  DeleteMacroModal, 
  SaveMacroModal,
  ConfirmCloseTabModal,
  CloseAppConfirmModal
} from './ConfirmModals';

export interface AppModalsContainerProps {
  // Global Search
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;
  openTabs: app.SessionConfig[];
  activeTabId: string | null;
  setActiveTabId: (id: string) => void;

  // Confirm Modals
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  confirmDeleteSession: () => void;
  folderToConnect: app.SessionConfig[] | null;
  setFolderToConnect: (folder: app.SessionConfig[] | null) => void;
  confirmConnectFolder: () => void;
  macroToDelete: models.AppMacro | null;
  setMacroToDelete: (macro: models.AppMacro | null) => void;
  confirmDeleteMacro: () => void;
  isSaveMacroModalOpen: boolean;
  setIsSaveMacroModalOpen: (open: boolean) => void;
  saveRecordedMacro: (e: React.FormEvent) => void;
  macroNameInput: string;
  setMacroNameInput: (val: string) => void;
  tempMacroActionCount: number;

  // Shortcut & Keybinding & Trigger
  isShortcutRefOpen: boolean;
  setIsShortcutRefOpen: (open: boolean) => void;
  isKeybindingModalOpen: boolean;
  setIsKeybindingModalOpen: (open: boolean) => void;
  isTriggerManagerOpen: boolean;
  setIsTriggerManagerOpen: (open: boolean) => void;
  settings: models.AppSettings;
  setSettings: (settings: models.AppSettings) => void;

  // Tab Manager
  isTabManagerOpen: boolean;
  setIsTabManagerOpen: (open: boolean) => void;
  handleCloseTab: (id: string) => void;
  lockedTabs: string[];
  toggleTabLock: (id: string) => void;
  tabStatus: Record<string, string>;

  // Batch Session & Import
  isBatchModalOpen: boolean;
  setIsBatchModalOpen: (open: boolean) => void;
  sessions: app.SessionConfig[];
  selectedSessionIds: string[];
  loadSessions: () => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;

  // Param Template
  isParamModalOpen: boolean;
  setIsParamModalOpen: (open: boolean) => void;
  paramTemplateCmd: string;
  sendCmdDirect: (cmd: string) => void;

  // Tunnel & Script & Cast
  isTunnelMonitorOpen: boolean;
  setIsTunnelMonitorOpen: (open: boolean) => void;
  isScriptRunnerOpen: boolean;
  setIsScriptRunnerOpen: (open: boolean) => void;
  isCastPlayerOpen: boolean;
  setIsCastPlayerOpen: (open: boolean) => void;
  activeCastContent: string;

  // Host Monitor & Ops
  isHostMonitorOpen: boolean;
  setIsHostMonitorOpen: (open: boolean) => void;
  isRemoteOpsOpen: boolean;
  setIsRemoteOpsOpen: (open: boolean) => void;
  isRealtimeLogOpen: boolean;
  setIsRealtimeLogOpen: (open: boolean) => void;

  // Network Topology & MultiExec
  isTopologyOpen: boolean;
  setIsTopologyOpen: (open: boolean) => void;
  toggleSftpPanel: () => void;
  isMultiExecDiffOpen: boolean;
  setIsMultiExecDiffOpen: (open: boolean) => void;

  // Quake
  isQuakeDropdownOpen: boolean;
  setIsQuakeDropdownOpen: (open: boolean) => void;
  hasOpenedQuake: boolean;

  // TOTP & Inspection
  isTotpManagerOpen: boolean;
  setIsTotpManagerOpen: (open: boolean) => void;
  isInspectionModalOpen: boolean;
  setIsInspectionModalOpen: (open: boolean) => void;
  customTabNames: Record<string, string>;

  // Share Session
  shareSessionModalData: { isOpen: boolean; sessionId: string; sessionName: string };
  setShareSessionModalData: React.Dispatch<React.SetStateAction<{ isOpen: boolean; sessionId: string; sessionName: string }>>;
  sharedTerminalViewerUrl: string | null;
  setSharedTerminalViewerUrl: (url: string | null) => void;

  // AI Copilot & AI Config Modal
  isAICopilotOpen: boolean;
  setIsAICopilotOpen: (open: boolean) => void;
  isAIConfigModalOpen: boolean;
  setIsAIConfigModalOpen: (open: boolean) => void;
  setIsAIChatDrawerOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  terminalDirs: Record<string, string>;
  aiCopilotMode: 'command' | 'diagnose' | 'script' | 'explain';
  aiCopilotErrorText: string;
  aiCopilotLastCmd: string;

  // Cloud Sync
  isCloudSyncOpen: boolean;
  setIsCloudSyncOpen: (open: boolean) => void;

  // SOP Runbooks
  isRunbookOpen?: boolean;
  setIsRunbookOpen?: (open: boolean) => void;

  // Command Palette & History
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isCommandHistoryOpen: boolean;
  setIsCommandHistoryOpen: (open: boolean) => void;
  handleConnect: (session: app.SessionConfig) => void;
  handlePaletteAction: (actionId: string) => void;

  // Close Confirmation Modals (Stage 1)
  tabPendingClose?: { id: string; name: string; isConnected: boolean } | null;
  onConfirmCloseTab?: (doNotAskAgain: boolean) => void;
  onCancelCloseTab?: () => void;
  isCloseAppModalOpen?: boolean;
  closeAppAction?: string;
  disableSystemTray?: boolean;
  onConfirmCloseApp?: (action: 'tray' | 'quit', doNotAskAgain: boolean) => void;
  onCancelCloseApp?: () => void;
}

export const AppModalsContainer: React.FC<AppModalsContainerProps> = ({
  isGlobalSearchOpen,
  setIsGlobalSearchOpen,
  openTabs,
  activeTabId,
  setActiveTabId,
  deleteConfirmId,
  setDeleteConfirmId,
  confirmDeleteSession,
  folderToConnect,
  setFolderToConnect,
  confirmConnectFolder,
  macroToDelete,
  setMacroToDelete,
  confirmDeleteMacro,
  isSaveMacroModalOpen,
  setIsSaveMacroModalOpen,
  saveRecordedMacro,
  macroNameInput,
  setMacroNameInput,
  tempMacroActionCount,
  isShortcutRefOpen,
  setIsShortcutRefOpen,
  isKeybindingModalOpen,
  setIsKeybindingModalOpen,
  isTriggerManagerOpen,
  setIsTriggerManagerOpen,
  settings,
  setSettings,
  isTabManagerOpen,
  setIsTabManagerOpen,
  handleCloseTab,
  lockedTabs,
  toggleTabLock,
  tabStatus,
  isBatchModalOpen,
  setIsBatchModalOpen,
  sessions,
  selectedSessionIds,
  loadSessions,
  isImportModalOpen,
  setIsImportModalOpen,
  isParamModalOpen,
  setIsParamModalOpen,
  paramTemplateCmd,
  sendCmdDirect,
  isTunnelMonitorOpen,
  setIsTunnelMonitorOpen,
  isScriptRunnerOpen,
  setIsScriptRunnerOpen,
  isCastPlayerOpen,
  setIsCastPlayerOpen,
  activeCastContent,
  isHostMonitorOpen,
  setIsHostMonitorOpen,
  isRemoteOpsOpen,
  setIsRemoteOpsOpen,
  isRealtimeLogOpen,
  setIsRealtimeLogOpen,
  isTopologyOpen,
  setIsTopologyOpen,
  toggleSftpPanel,
  isMultiExecDiffOpen,
  setIsMultiExecDiffOpen,
  isQuakeDropdownOpen,
  setIsQuakeDropdownOpen,
  hasOpenedQuake,
  isTotpManagerOpen,
  setIsTotpManagerOpen,
  isInspectionModalOpen,
  setIsInspectionModalOpen,
  customTabNames,
  shareSessionModalData,
  setShareSessionModalData,
  sharedTerminalViewerUrl,
  setSharedTerminalViewerUrl,
  isAICopilotOpen,
  setIsAICopilotOpen,
  isAIConfigModalOpen,
  setIsAIConfigModalOpen,
  setIsAIChatDrawerOpen,
  terminalDirs,
  aiCopilotMode,
  aiCopilotErrorText,
  aiCopilotLastCmd,
  isCloudSyncOpen,
  setIsCloudSyncOpen,
  isRunbookOpen,
  setIsRunbookOpen,
  isCommandPaletteOpen,
  setIsCommandPaletteOpen,
  isCommandHistoryOpen,
  setIsCommandHistoryOpen,
  handleConnect,
  handlePaletteAction,
  tabPendingClose,
  onConfirmCloseTab,
  onCancelCloseTab,
  isCloseAppModalOpen,
  closeAppAction,
  disableSystemTray,
  onConfirmCloseApp,
  onCancelCloseApp,
}) => {
  return (
    <>
      {/* 标签页关闭二次确认弹窗 */}
      <ConfirmCloseTabModal
        tabPendingClose={tabPendingClose || null}
        onConfirm={onConfirmCloseTab || (() => {})}
        onCancel={onCancelCloseTab || (() => {})}
      />

      {/* 主窗口关闭行为确认弹窗 */}
      <CloseAppConfirmModal
        isOpen={Boolean(isCloseAppModalOpen)}
        defaultAction={closeAppAction || 'tray'}
        disableTray={Boolean(disableSystemTray)}
        onConfirm={onConfirmCloseApp || (() => {})}
        onCancel={onCancelCloseApp || (() => {})}
      />

      {/* 全局搜索面板 */}
      <GlobalSearchModal 
        isGlobalSearchOpen={isGlobalSearchOpen} 
        setIsGlobalSearchOpen={setIsGlobalSearchOpen}
        openTabs={openTabs}
        setActiveTabId={setActiveTabId}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal 
        deleteConfirmId={deleteConfirmId}
        setDeleteConfirmId={setDeleteConfirmId}
        confirmDeleteSession={confirmDeleteSession}
      />

      {/* 文件夹批量连接确认弹窗 */}
      <ConnectFolderModal 
        folderToConnect={folderToConnect}
        setFolderToConnect={setFolderToConnect}
        confirmConnectFolder={confirmConnectFolder}
      />

      {/* 宏方案删除确认弹窗 */}
      <DeleteMacroModal 
        macroToDelete={macroToDelete}
        setMacroToDelete={setMacroToDelete}
        confirmDeleteMacro={confirmDeleteMacro}
      />

      {/* 宏录制结束后的命名保存弹窗 */}
      <SaveMacroModal
        isOpen={isSaveMacroModalOpen}
        onClose={() => setIsSaveMacroModalOpen(false)}
        onSave={saveRecordedMacro}
        macroNameInput={macroNameInput}
        setMacroNameInput={setMacroNameInput}
        actionCount={tempMacroActionCount}
      />

      {/* Shortcut Reference Modal */}
      <ShortcutReferenceModal 
        isOpen={isShortcutRefOpen} 
        onClose={() => setIsShortcutRefOpen(false)} 
      />

      {/* Keybinding Manager Modal (自定义快捷键与冲突检测) */}
      <KeybindingManagerModal
        isOpen={isKeybindingModalOpen}
        onClose={() => setIsKeybindingModalOpen(false)}
        customKeybindings={(settings as any).customKeybindings || {}}
        onSaveKeybindings={(newBindings) => {
          const updated = new models.AppSettings({ ...settings, customKeybindings: newBindings });
          setSettings(updated);
          SaveSettings(updated).catch(err => console.error("保存自定义快捷键失败:", err));
        }}
      />

      {/* Trigger Manager Modal */}
      <TriggerManagerModal 
        isOpen={isTriggerManagerOpen} 
        onClose={() => setIsTriggerManagerOpen(false)} 
      />

      {/* Tab Manager Modal */}
      <TabManagerModal
        isOpen={isTabManagerOpen}
        onClose={() => setIsTabManagerOpen(false)}
        openTabs={openTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        handleCloseTab={handleCloseTab}
        lockedTabs={lockedTabs}
        toggleTabLock={toggleTabLock}
        tabStatus={tabStatus}
        customTabNames={customTabNames}
      />

      {/* 批量会话属性编辑弹窗 (Batch Edit Sessions) */}
      <BatchSessionModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        selectedSessions={sessions.filter((s: any) => selectedSessionIds.includes(s.id) && !s.isFolder)}
        customThemes={settings.customThemes || []}
        onSaved={() => {
          loadSessions();
          setIsBatchModalOpen(false);
        }}
      />

      {/* 第三方会话导入向导 (Import Sessions) */}
      <ImportSessionsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          loadSessions();
          setIsImportModalOpen(false);
        }}
      />

      {/* 参数化快捷指令动态输入浮窗 (Param Template Modal) */}
      <ParamTemplateModal
        isOpen={isParamModalOpen}
        onClose={() => setIsParamModalOpen(false)}
        rawTemplate={paramTemplateCmd}
        onExecute={(finalCmd) => sendCmdDirect(finalCmd)}
      />

      {/* 端口转发与隧道实时监控 (Tunnel Monitor Modal) */}
      <TunnelMonitorModal
        isOpen={isTunnelMonitorOpen}
        onClose={() => setIsTunnelMonitorOpen(false)}
        activeSessionId={activeTabId}
        openTabs={openTabs.map(t => ({ id: t.id, name: customTabNames[t.id] || t.name }))}
      />

      {/* 自动化脚本执行器 (Script Runner Modal) */}
      <ScriptRunnerModal
        isOpen={isScriptRunnerOpen}
        onClose={() => setIsScriptRunnerOpen(false)}
        activeTabId={activeTabId}
        activeTabName={customTabNames[activeTabId || ''] || openTabs.find(t => t.id === activeTabId)?.name || ''}
        openTabs={openTabs}
      />

      {/* 终端会话录像回放 (Session Cast Player Modal) */}
      <SessionCastPlayerModal
        isOpen={isCastPlayerOpen}
        onClose={() => setIsCastPlayerOpen(false)}
        initialCastContent={activeCastContent}
      />

      {/* 主机性能实时监控 (Host Monitor Drawer) */}
      <HostMonitorDrawer
        isOpen={isHostMonitorOpen}
        onClose={() => setIsHostMonitorOpen(false)}
        activeSessionId={activeTabId || ''}
        sessionName={openTabs.find(t => t.id === activeTabId)?.name || ''}
      />

      {/* 24.2.3: SSH 隧道链路网络拓扑可视化弹窗 */}
      <NetworkTopologyModal
        isOpen={isTopologyOpen}
        onClose={() => setIsTopologyOpen(false)}
        onSelectSession={(sessId) => {
          setActiveTabId(sessId);
        }}
        onOpenSftp={(sessId) => {
          setActiveTabId(sessId);
          toggleSftpPanel();
        }}
      />

      {/* 24.2.5: 批量命令多主机并发执行与输出差异对比 */}
      <MultiExecDiffModal
        isOpen={isMultiExecDiffOpen}
        onClose={() => setIsMultiExecDiffOpen(false)}
        availableSessions={openTabs.map(t => ({
          id: t.id,
          name: customTabNames[t.id] || t.name,
          host: t.host || 'localhost',
          isConnected: tabStatus[t.id] === 'connected',
        }))}
      />

      {/* 24.2.8: 终端 Quake 下拉模式动画增强视口 */}
      <QuakeDropdownTerminal
        isOpen={isQuakeDropdownOpen}
        onClose={() => setIsQuakeDropdownOpen(false)}
        animationDurationMs={(settings as any).quakeAnimationDurationMs || 250}
      >
        <div className="w-full h-full p-2">
          {hasOpenedQuake ? (
            <TerminalInstance
              sessionId="quake_dropdown_session"
              name="Quake Dropdown Shell"
              host="Local"
              port={0}
              isLocal={true}
              protocol="local"
              user=""
              isActive={isQuakeDropdownOpen}
              themeName={settings.themeName}
              fontFamily={settings.fontFamily}
              fontSize={settings.fontSize}
              lineHeight={settings.lineHeight}
              rendererType={(settings as any).rendererType || 'auto'}
              fontSmoothing={(settings as any).fontSmoothing || 'antialiased'}
              enableTerminalImages={(settings as any).enableTerminalImages !== false}
              imageStorageLimitMB={(settings as any).imageStorageLimitMB || 128}
              aiConfig={settings.aiConfig}
              copyOnSelect={settings.copyOnSelect}
              rightClickAction={settings.rightClickAction || 'contextMenu'}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 font-mono text-xs">
              <span>按 F12 / Ctrl+` 激活 Quake 下拉终端</span>
            </div>
          )}
        </div>
      </QuakeDropdownTerminal>

      {/* 24.3.1: 内置 TOTP/MFA 令牌管理器 */}
      <TOTPManagerModal
        isOpen={isTotpManagerOpen}
        onClose={() => setIsTotpManagerOpen(false)}
      />

      {/* 24.3.2: 批量主机健康巡检报告中心 */}
      <InspectionReportModal
        isOpen={isInspectionModalOpen}
        onClose={() => setIsInspectionModalOpen(false)}
        openTabs={openTabs.map(t => ({ id: t.id, title: customTabNames[t.id] || t.name, sessionId: t.id }))}
      />

      {/* 24.3.3: 终端会话实时共享与协同 */}
      <ShareSessionModal
        isOpen={shareSessionModalData.isOpen}
        onClose={() => setShareSessionModalData(prev => ({ ...prev, isOpen: false }))}
        sessionId={shareSessionModalData.sessionId}
        sessionName={shareSessionModalData.sessionName}
        onOpenLocalViewer={(url) => setSharedTerminalViewerUrl(url)}
      />

      {/* 24.3.3: 内置共享观察窗口 */}
      <SharedTerminalViewerModal
        isOpen={!!sharedTerminalViewerUrl}
        onClose={() => setSharedTerminalViewerUrl(null)}
        url={sharedTerminalViewerUrl || ''}
      />

      {/* 远程主机运维管理 (Remote Ops Modal) */}
      <RemoteOpsModal
        isOpen={isRemoteOpsOpen}
        onClose={() => setIsRemoteOpsOpen(false)}
        activeSessionId={activeTabId || ''}
        sessionName={openTabs.find(t => t.id === activeTabId)?.name || ''}
      />

      {/* 远程实时日志追踪器 (Realtime Log Tailer Modal) */}
      <RealtimeLogModal
        isOpen={isRealtimeLogOpen}
        onClose={() => setIsRealtimeLogOpen(false)}
        sessionId={activeTabId || ''}
        sessionName={openTabs.find(t => t.id === activeTabId)?.name || ''}
        theme={settings.themeName}
      />

      {/* OmniAI 智能运维 Copilot (OmniAI Copilot Modal) */}
      <AIConfigModal
        isOpen={isAIConfigModalOpen}
        onClose={() => setIsAIConfigModalOpen(false)}
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
      />

      {/* OmniAI 智能运维 Copilot (OmniAI Copilot Modal) */}
      <OmniAICopilotModal
        isOpen={isAICopilotOpen}
        onClose={() => setIsAICopilotOpen(false)}
        activeSessionId={activeTabId}
        activeSessionName={openTabs.find(t => t.id === activeTabId)?.name || ''}
        terminalContextDir={activeTabId ? terminalDirs[activeTabId] : ''}
        initialMode={aiCopilotMode}
        initialErrorText={aiCopilotErrorText}
        initialLastCommand={aiCopilotLastCmd}
        getTerminalBufferLines={() => activeTabId && terminalBuffers[activeTabId] ? terminalBuffers[activeTabId]() : []}
        onSwitchToChatDrawer={() => setIsAIChatDrawerOpen?.(true)}
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
            WriteSSH(activeTabId, window.btoa(binary));
          }
        }}
        onRunInTerminal={(cmd) => {
          if (activeTabId) {
            const finalCmd = cmd.endsWith('\n') ? cmd : cmd + '\n';
            const encoder = new TextEncoder();
            const rawBytes = encoder.encode(finalCmd);
            let binary = '';
            for (let i = 0; i < rawBytes.byteLength; i++) {
              binary += String.fromCharCode(rawBytes[i]);
            }
            WriteSSH(activeTabId, window.btoa(binary));
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
      />

      {/* 端到端加密云同步与团队资产脱敏 (Cloud Sync Modal) */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        syncConfig={(settings as any).cloudSyncConfig || {
          provider: 'webdav',
          serverUrl: '',
          username: '',
          password: '',
          remotePath: '/OmniTerminal/backup.omnisync',
          gistToken: '',
          gistId: '',
          autoSyncOnStartup: false,
          autoSyncIntervalMinutes: 0,
          lastSyncTime: '',
        }}
        onSaveSyncConfig={(cfg) => {
          const updated = { ...settings, cloudSyncConfig: cfg };
          setSettings(new models.AppSettings(updated));
        }}
        onRefreshData={() => {
          loadSessions();
        }}
      />

      {/* 📘 参数化 SOP Runbook 运维手册与交互式执行流 */}
      <RunbookManagerModal
        isOpen={!!isRunbookOpen}
        onClose={() => setIsRunbookOpen?.(false)}
        activeSessionId={activeTabId || undefined}
        activeSessionName={openTabs.find(t => t.id === activeTabId)?.name}
        sessions={sessions}
        onSendCommand={(cmd) => {
          if (activeTabId) {
            const finalCmd = cmd.endsWith('\n') ? cmd : cmd + '\n';
            const encoder = new TextEncoder();
            const rawBytes = encoder.encode(finalCmd);
            let binary = '';
            for (let i = 0; i < rawBytes.byteLength; i++) {
              binary += String.fromCharCode(rawBytes[i]);
            }
            WriteSSH(activeTabId, window.btoa(binary));
          }
        }}
      />

      {/* 🚀 命令调色板 (Command Palette - Ctrl+P / Cmd+P) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        sessions={sessions}
        quickCommandSets={settings.quickCommandSets || []}
        onConnectSession={(session) => {
          handleConnect(session);
        }}
        onRunCommand={(cmd) => {
          if (activeTabId) {
            const finalCmd = cmd.endsWith('\n') ? cmd : cmd + '\n';
            const encoder = new TextEncoder();
            const rawBytes = encoder.encode(finalCmd);
            let binary = '';
            for (let i = 0; i < rawBytes.byteLength; i++) {
              binary += String.fromCharCode(rawBytes[i]);
            }
            WriteSSH(activeTabId, window.btoa(binary));
          }
        }}
        onAction={handlePaletteAction}
      />

      {/* 📜 跨会话命令历史检索 (Command History Modal) */}
      <CommandHistoryModal
        isOpen={isCommandHistoryOpen}
        onClose={() => setIsCommandHistoryOpen(false)}
        activeSessionId={activeTabId}
        onRunCommand={(cmd) => {
          if (activeTabId) {
            const finalCmd = cmd.endsWith('\n') ? cmd : cmd + '\n';
            const encoder = new TextEncoder();
            const rawBytes = encoder.encode(finalCmd);
            let binary = '';
            for (let i = 0; i < rawBytes.byteLength; i++) {
              binary += String.fromCharCode(rawBytes[i]);
            }
            WriteSSH(activeTabId, window.btoa(binary));
          }
        }}
        onInsertCommand={(cmd) => {
          if (activeTabId) {
            const encoder = new TextEncoder();
            const rawBytes = encoder.encode(cmd);
            let binary = '';
            for (let i = 0; i < rawBytes.byteLength; i++) {
              binary += String.fromCharCode(rawBytes[i]);
            }
            WriteSSH(activeTabId, window.btoa(binary));
          }
        }}
      />
    </>
  );
};
