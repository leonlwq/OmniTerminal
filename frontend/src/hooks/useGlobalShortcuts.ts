import React, { useEffect } from 'react';
import { ToggleFullscreen } from '../../wailsjs/go/app/App';
import { app } from '../../wailsjs/go/models';
import { SplitMode } from './useTabManager';

export interface UseGlobalShortcutsOptions {
  activeTabId: string | null;
  openTabs: app.SessionConfig[];
  openSftpTabs: string[];
  matchesAction: (e: KeyboardEvent, actionId: string) => boolean;
  setIsKeybindingModalOpen: (open: boolean) => void;
  setActiveDockPanel: React.Dispatch<React.SetStateAction<'sessions' | 'containers' | 'sftp' | 'none'>>;
  resetSessionFormData: (parentId?: string) => void;
  setModalMode: (mode: 'create' | 'edit') => void;
  setIsModalOpen: (open: boolean) => void;
  handleLocalShell: () => void;
  handleCloseTab: (id: string, e?: React.MouseEvent) => void;
  handleNextTab: () => void;
  handlePrevTab: () => void;
  handleToggleSftp: () => void;
  setIsComposeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsBroadcast: React.Dispatch<React.SetStateAction<boolean>>;
  setSplitMode: React.Dispatch<React.SetStateAction<SplitMode>>;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsGlobalSearchOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setAiCopilotMode: (mode: 'command' | 'diagnose' | 'script' | 'explain') => void;
  setIsAICopilotOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAIChatDrawerOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCommandHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsShortcutRefOpen: (open: boolean) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  setActiveTabId: (id: string | null) => void;
  setIsTunnelMonitorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHostMonitorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRemoteOpsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRealtimeLogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRunbookOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleCommandBlockMode?: () => void;
}

export function useGlobalShortcuts({
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
  handleCloseTab,
  handleNextTab,
  handlePrevTab,
  handleToggleSftp,
  setIsComposeOpen,
  setIsBroadcast,
  setSplitMode,
  setIsCommandPaletteOpen,
  onToggleCommandBlockMode,
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
}: UseGlobalShortcutsOptions) {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 0. 自定义快捷键优先分发 (Custom Keybindings & Action Matcher)
      if (matchesAction(e, 'keybinding_manager')) {
        e.preventDefault();
        setIsKeybindingModalOpen(true);
        return;
      }
      if (matchesAction(e, 'container_explorer')) {
        e.preventDefault();
        setActiveDockPanel(prev => prev === 'containers' ? 'none' : 'containers');
        return;
      }
      if (matchesAction(e, 'new_session')) {
        e.preventDefault();
        resetSessionFormData();
        setModalMode('create');
        setIsModalOpen(true);
        return;
      }
      if (matchesAction(e, 'local_shell')) {
        e.preventDefault();
        handleLocalShell();
        return;
      }
      if (matchesAction(e, 'close_tab')) {
        e.preventDefault();
        if (activeTabId) handleCloseTab(activeTabId);
        return;
      }
      if (matchesAction(e, 'next_tab')) {
        e.preventDefault();
        handleNextTab();
        return;
      }
      if (matchesAction(e, 'prev_tab')) {
        e.preventDefault();
        handlePrevTab();
        return;
      }
      if (matchesAction(e, 'toggle_sidebar')) {
        e.preventDefault();
        setActiveDockPanel(prev => prev === 'sessions' ? 'none' : 'sessions');
        return;
      }
      if (matchesAction(e, 'toggle_command_blocks')) {
        e.preventDefault();
        onToggleCommandBlockMode?.();
        return;
      }
      if (matchesAction(e, 'toggle_sftp')) {
        e.preventDefault();
        handleToggleSftp();
        return;
      }
      if (matchesAction(e, 'compose_pane')) {
        e.preventDefault();
        setIsComposeOpen(prev => !prev);
        return;
      }
      if (matchesAction(e, 'broadcast')) {
        e.preventDefault();
        setIsBroadcast(prev => !prev);
        return;
      }
      if (matchesAction(e, 'split_vertical')) {
        e.preventDefault();
        setSplitMode(prev => prev === 'vertical' ? 'none' : 'vertical');
        return;
      }
      if (matchesAction(e, 'split_horizontal')) {
        e.preventDefault();
        setSplitMode(prev => prev === 'horizontal' ? 'none' : 'horizontal');
        return;
      }
      if (matchesAction(e, 'command_palette')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }
      if (matchesAction(e, 'global_search')) {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
        return;
      }
      if (matchesAction(e, 'settings')) {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }
      if (matchesAction(e, 'ai_copilot')) {
        e.preventDefault();
        setAiCopilotMode('command');
        setIsAICopilotOpen(prev => !prev);
        return;
      }
      if (matchesAction(e, 'command_history')) {
        e.preventDefault();
        setIsCommandHistoryOpen(prev => !prev);
        return;
      }
      if (matchesAction(e, 'shortcut_help')) {
        e.preventDefault();
        setIsShortcutRefOpen(true);
        return;
      }
      if (matchesAction(e, 'fullscreen')) {
        e.preventDefault();
        ToggleFullscreen();
        return;
      }
      if (matchesAction(e, 'zoom_in')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }
      if (matchesAction(e, 'zoom_out')) {
        e.preventDefault();
        handleZoomOut();
        return;
      }
      if (matchesAction(e, 'zoom_reset')) {
        e.preventDefault();
        handleZoomReset();
        return;
      }

      // 1. 新建远程会话 (Cmd+N / Ctrl+N)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        resetSessionFormData();
        setModalMode('create');
        setIsModalOpen(true);
        return;
      }
      // 2. 新建本地终端标签 (Cmd+T / Ctrl+T)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleLocalShell();
        return;
      }
      // 3. 关闭当前标签 (Cmd+W / Ctrl+Shift+W / Ctrl+W)
      if (((e.metaKey && e.key.toLowerCase() === 'w') || 
           (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'w') ||
           (e.ctrlKey && e.key.toLowerCase() === 'w')) && !e.altKey) {
        e.preventDefault();
        if (activeTabId) handleCloseTab(activeTabId);
        return;
      }
      // 4. F11 全屏
      if (e.key === 'F11') {
        e.preventDefault();
        ToggleFullscreen();
        return;
      }
      // 5. 下一个标签页 (Ctrl+Tab, Ctrl+PageDown, ⌘⇧], ⌃⇧], ⌥⌘→, ⌃⌥→, Alt+→)
      const isNext = (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) ||
                     (e.ctrlKey && e.key === 'PageDown') ||
                     ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === ']' || e.key === '}')) ||
                     ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'ArrowRight') ||
                     (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowRight');
      if (isNext) {
        e.preventDefault();
        handleNextTab();
        return;
      }

      // 6. 上一个标签页 (Ctrl+Shift+Tab, Ctrl+PageUp, ⌘⇧[, ⌃⇧[, ⌥⌘←, ⌃⌥←, Alt+←)
      const isPrev = (e.ctrlKey && e.shiftKey && e.key === 'Tab') ||
                     (e.ctrlKey && e.key === 'PageUp') ||
                     ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '[' || e.key === '{')) ||
                     ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'ArrowLeft') ||
                     (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowLeft');
      if (isPrev) {
        e.preventDefault();
        handlePrevTab();
        return;
      }

      // 7. 数字键 1~9 切换指定标签 (Cmd+1~9 / Ctrl+1~9 / Alt+1~9)
      if ((e.metaKey || e.ctrlKey || (e.altKey && !e.metaKey && !e.ctrlKey)) && !e.shiftKey) {
        if (e.key >= '1' && e.key <= '9') {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < openTabs.length) {
            e.preventDefault();
            setActiveTabId(openTabs[idx].id);
            return;
          }
        }
      }

      // 8. Cmd+K / Ctrl+K 快速唤起 OmniAI 快速命令弹窗
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setAiCopilotMode('command');
        setIsAICopilotOpen(prev => !prev);
        return;
      }

      // 8.1 Cmd+L / Ctrl+L 快速唤起/折叠 OmniAI 右侧智能运维对话侧边栏
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setIsAIChatDrawerOpen?.(prev => !prev);
        return;
      }

      // 9. 字体缩放 (Cmd+= / Cmd+- / Cmd+0 / Ctrl+= / Ctrl+- / Ctrl+0)
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
        return;
      }

      // 10. 偏好设置中心 (Cmd+, / Ctrl+, / Alt+O)
      if (((e.metaKey || e.ctrlKey) && e.key === ',') || 
          (e.altKey && (e.key === 'o' || e.key === 'O') && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      // 11. 切换会话树侧边栏 (Cmd+B / Ctrl+B)
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setActiveDockPanel(prev => prev === 'sessions' ? 'none' : 'sessions');
        return;
      }

      // 11b. 切换 Warp 命令块模式 (Cmd+Shift+B / Ctrl+Shift+B)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleCommandBlockMode?.();
        return;
      }

      // 12. 多行撰写窗格 (Cmd+Shift+P / Ctrl+Shift+P)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsComposeOpen(prev => !prev);
        return;
      }

      // 13. SFTP 文件管理 (Cmd+Shift+S / Ctrl+Shift+S)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleToggleSftp();
        return;
      }

      // 14. 全局搜索 (Cmd+Alt+F / Ctrl+Alt+F)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
        return;
      }

      // 15. 快捷键指南 (Cmd+/ / Cmd+? / Ctrl+/ / F1)
      if (((e.metaKey || e.ctrlKey) && (e.key === '/' || e.key === '?')) || e.key === 'F1') {
        e.preventDefault();
        setIsShortcutRefOpen(true);
        return;
      }

      // 16. 多终端输入广播 (Alt+B / Cmd+Alt+B)
      if ((e.altKey && e.key.toLowerCase() === 'b' && !e.metaKey && !e.ctrlKey) ||
          ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        setIsBroadcast(prev => !prev);
        return;
      }

      // 17. 终端分屏 (Cmd+Shift+D 垂直分屏 / Cmd+Shift+E 水平分屏)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setSplitMode(prev => prev === 'vertical' ? 'none' : 'vertical');
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setSplitMode(prev => prev === 'horizontal' ? 'none' : 'horizontal');
        return;
      }

      // 18. 端口转发 (Cmd+Shift+U) / 主机监控 (Cmd+Shift+M) / 远程运维 (Cmd+Shift+O) / 实时日志 (Cmd+Shift+L)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setIsTunnelMonitorOpen(prev => !prev);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsHostMonitorOpen(prev => !prev);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setIsRemoteOpsOpen(prev => !prev);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsRealtimeLogOpen(prev => !prev);
        return;
      }

      // 19. 全局命令调色板 (Cmd+P / Ctrl+P)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // 20. 跨会话命令历史检索 (Cmd+Shift+H / Ctrl+Shift+H)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsCommandHistoryOpen(prev => !prev);
        return;
      }

      // 21. SOP 运维手册与交互式执行流 (Cmd+Shift+R / Ctrl+Shift+R)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setIsRunbookOpen?.(prev => !prev);
        return;
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    activeTabId,
    openTabs,
    openSftpTabs,
    handleCloseTab,
    handleNextTab,
    handlePrevTab,
    handleLocalShell,
    matchesAction,
    setIsKeybindingModalOpen,
    setActiveDockPanel,
    resetSessionFormData,
    setModalMode,
    setIsModalOpen,
    handleToggleSftp,
    setIsComposeOpen,
    setIsBroadcast,
    setSplitMode,
    setIsCommandPaletteOpen,
    setIsGlobalSearchOpen,
    setIsSettingsOpen,
    setAiCopilotMode,
    setIsAICopilotOpen,
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
  ]);
}
