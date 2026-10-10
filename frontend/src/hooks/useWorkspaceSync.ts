import { useEffect, useRef } from 'react';
import { GetWorkspaceState, SaveWorkspaceState } from '../../wailsjs/go/app/App';
import { WindowSetTitle } from '../../wailsjs/runtime/runtime';
import { app, models } from '../../wailsjs/go/models';
import { SplitMode } from './useTabManager';

interface UseWorkspaceSyncOptions {
  sessions: app.SessionConfig[];
  isLocked: boolean;
  autoRestoreWorkspace?: boolean;
  openTabs: app.SessionConfig[];
  setOpenTabs: React.Dispatch<React.SetStateAction<app.SessionConfig[]>>;
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  splitMode: SplitMode;
  setSplitMode: (mode: SplitMode) => void;
  secondaryTabId: string | null;
  setSecondaryTabId: (id: string | null) => void;
  customTabNames: Record<string, string>;
  lockedTabs: string[];
  toggleTabLock: (tabId: string) => void;
}

export function useWorkspaceSync({
  sessions,
  isLocked,
  autoRestoreWorkspace,
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
}: UseWorkspaceSyncOptions) {
  const hasRestoredWorkspaceRef = useRef(false);

  // 启动时自动恢复工作区会话
  useEffect(() => {
    if (hasRestoredWorkspaceRef.current || isLocked || sessions.length === 0) return;
    if (autoRestoreWorkspace !== false) {
      GetWorkspaceState().then((wsState) => {
        if (wsState && wsState.tabs && wsState.tabs.length > 0) {
          const restoredTabs: app.SessionConfig[] = [];
          wsState.tabs.forEach((tabState) => {
            const found = sessions.find((s: any) => s.id === tabState.sessionId);
            if (found) {
              const cfg = new app.SessionConfig(found);
              restoredTabs.push(cfg);
              if (tabState.isLocked) {
                toggleTabLock(cfg.id);
              }
            }
          });
          if (restoredTabs.length > 0) {
            setOpenTabs(restoredTabs);
            if (wsState.activeTabId && restoredTabs.some((t) => t.id === wsState.activeTabId)) {
              setActiveTabId(wsState.activeTabId);
            } else {
              setActiveTabId(restoredTabs[0].id);
            }
            if (wsState.splitMode && wsState.splitMode !== 'none') {
              setSplitMode(wsState.splitMode as any);
              setSecondaryTabId(wsState.secondaryTabId);
            }
          }
        }
      }).catch(() => {});
      hasRestoredWorkspaceRef.current = true;
    }
  }, [sessions, isLocked, autoRestoreWorkspace, toggleTabLock, setOpenTabs, setActiveTabId, setSplitMode, setSecondaryTabId]);

  // 工作区状态防抖持久化
  useEffect(() => {
    if (!hasRestoredWorkspaceRef.current || isLocked) return;
    const timer = setTimeout(() => {
      const state = new models.WorkspaceState({
        tabs: openTabs.map((t) => new models.WorkspaceTabState({
          sessionId: t.id,
          customName: customTabNames[t.id] || '',
          isLocked: lockedTabs.includes(t.id),
        })),
        activeTabId: activeTabId || '',
        splitMode: splitMode,
        secondaryTabId: secondaryTabId || '',
        lastSavedAt: '',
      });
      SaveWorkspaceState(state).catch(() => {});
    }, 1200);

    return () => clearTimeout(timer);
  }, [openTabs, activeTabId, splitMode, secondaryTabId, customTabNames, lockedTabs, isLocked]);

  // 窗口标题动态追踪
  useEffect(() => {
    if (activeTabId) {
      const tabName = customTabNames[activeTabId] || openTabs.find(t => t.id === activeTabId)?.name || 'Local Shell';
      WindowSetTitle(`${tabName} - OmniTerminal`);
    } else {
      WindowSetTitle('OmniTerminal');
    }
  }, [activeTabId, customTabNames, openTabs]);
}
