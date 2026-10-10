import { useState, useCallback } from 'react';
import { app } from '../../wailsjs/go/models';

export type SplitMode = 'none' | 'vertical' | 'horizontal' | 'grid2x2' | 'grid1plus2';

export function useTabManager() {
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>('none');
  const [secondaryTabId, setSecondaryTabId] = useState<string | null>(null);
  const [linkedTabIds, setLinkedTabIds] = useState<string[]>([]);
  const [openTabs, setOpenTabs] = useState<app.SessionConfig[]>([]);
  const [lockedTabs, setLockedTabs] = useState<string[]>([]);
  const [customTabNames, setCustomTabNames] = useState<{ [id: string]: string }>({});
  const [connectEpochs, setConnectEpochs] = useState<{ [id: string]: number }>({});
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTabId, setRenameTabId] = useState('');
  const [renameInput, setRenameInput] = useState('');
  const [tabStatus, setTabStatus] = useState<{ [id: string]: string }>({});
  const [tabPendingClose, setTabPendingClose] = useState<{ id: string; name: string; isConnected: boolean } | null>(null);

  const executeCloseTab = useCallback((id: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        if (newTabs.length > 0) {
          const idx = prev.findIndex(t => t.id === id);
          const nextIdx = idx >= newTabs.length ? newTabs.length - 1 : idx;
          setActiveTabId(newTabs[nextIdx].id);
        } else {
          setActiveTabId(null);
        }
      }
      return newTabs;
    });

    if (secondaryTabId === id) {
      setSecondaryTabId(null);
      setSplitMode('none');
    }
  }, [activeTabId, secondaryTabId]);

  const handleCloseTab = useCallback((
    id: string, 
    e?: React.MouseEvent, 
    force?: boolean, 
    confirmOptions?: { confirmCloseConnectedTab?: boolean; confirmCloseAnyTab?: boolean }
  ) => {
    if (e) {
      e.stopPropagation();
    }
    if (lockedTabs.includes(id)) {
      return; // Locked tabs cannot be closed
    }

    if (!force) {
      const isConnected = tabStatus[id] === 'connected';
      const needConfirmConnected = Boolean(confirmOptions?.confirmCloseConnectedTab && isConnected);
      const needConfirmAny = Boolean(confirmOptions?.confirmCloseAnyTab);

      if (needConfirmConnected || needConfirmAny) {
        const tab = openTabs.find(t => t.id === id);
        const name = customTabNames[id] || tab?.name || '终端会话';
        setTabPendingClose({
          id,
          name,
          isConnected
        });
        return;
      }
    }

    executeCloseTab(id);
  }, [lockedTabs, tabStatus, openTabs, customTabNames, executeCloseTab]);

  const confirmCloseTab = useCallback((doNotAskAgain?: boolean, onDoNotAskAgain?: () => void) => {
    if (tabPendingClose) {
      executeCloseTab(tabPendingClose.id);
      setTabPendingClose(null);
      if (doNotAskAgain && onDoNotAskAgain) {
        onDoNotAskAgain();
      }
    }
  }, [tabPendingClose, executeCloseTab]);

  const cancelCloseTab = useCallback(() => {
    setTabPendingClose(null);
  }, []);

  const handleCloseOtherTabs = useCallback((currentId: string) => {
    const tab = openTabs.find(t => t.id === currentId);
    if (tab) {
      const lockedOthers = openTabs.filter(t => t.id !== currentId && lockedTabs.includes(t.id));
      setOpenTabs([...lockedOthers, tab]);
      setActiveTabId(currentId);
      if (secondaryTabId !== currentId && !lockedOthers.find(t => t.id === secondaryTabId)) {
        setSecondaryTabId(null);
        setSplitMode('none');
      }
    }
    setTabContextMenu(null);
  }, [openTabs, lockedTabs, secondaryTabId]);

  const handleCloseRightTabs = useCallback((currentId: string) => {
    const idx = openTabs.findIndex(t => t.id === currentId);
    if (idx !== -1) {
      const rightTabs = openTabs.slice(idx + 1);
      const rightTabsToKeep = rightTabs.filter(t => lockedTabs.includes(t.id));
      const newTabs = [...openTabs.slice(0, idx + 1), ...rightTabsToKeep];
      setOpenTabs(newTabs);
      if (secondaryTabId && !newTabs.find(t => t.id === secondaryTabId)) {
        setSecondaryTabId(null);
        setSplitMode('none');
      }
    }
    setTabContextMenu(null);
  }, [openTabs, lockedTabs, secondaryTabId]);

  const handleCloneTab = useCallback((tab: app.SessionConfig) => {
    const clone = new app.SessionConfig(tab);
    clone.id = 'clone_' + Date.now();
    clone.name = clone.name + ' (Clone)';
    setOpenTabs(prev => [...prev, clone]);
    setActiveTabId(clone.id);
    setTabContextMenu(null);
  }, []);

  const handleDetachTab = useCallback((tabId: string) => {
    const tab = openTabs.find(t => t.id === tabId);
    if (!tab) return;
    
    setTabContextMenu(null);

    const isLocal = Boolean(tab.isLocal || tab.protocol === 'local' || tab.name?.includes('本地 Shell') || tab.name === 'Local Shell');
    const sessionName = tab.name || '';

    const appRpc = (window as any).go?.app?.App;
    if (appRpc?.DetachToNewWindow) {
      appRpc.DetachToNewWindow(sessionName, isLocal)
        .then(() => {
          handleCloseTab(tabId);
        })
        .catch((err: any) => {
          console.error("DetachToNewWindow error:", err);
          alert("拆离独立窗口失败: " + err);
        });
    } else {
      const url = `${window.location.origin}${window.location.pathname}?detached=true&sessionId=${encodeURIComponent(tabId)}&name=${encodeURIComponent(tab.name)}`;
      const popup = window.open(
        url,
        `omniterminal_detached_${tabId}`,
        'width=960,height=640,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
      );

      if (popup) {
        handleCloseTab(tabId);
      } else {
        alert("无法打开独立子窗口，请检查系统的弹窗拦截设置！");
      }
    }
  }, [openTabs, handleCloseTab]);

  const handleTabContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTabContextMenu({
      x: e.clientX,
      y: e.clientY,
      tabId
    });
  }, []);

  const handleReconnectTab = useCallback((tabId: string) => {
    setConnectEpochs(prev => ({
      ...prev,
      [tabId]: (prev[tabId] || 0) + 1
    }));
    setTabContextMenu(null);
  }, []);

  const toggleTabLock = useCallback((tabId: string) => {
    setLockedTabs(prev => {
      if (prev.includes(tabId)) {
        return prev.filter(id => id !== tabId);
      }
      return [...prev, tabId];
    });
    setTabContextMenu(null);
  }, []);

  const handleRenameTabSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const newName = renameInput.trim();
    if (newName) {
      setCustomTabNames(prev => ({ ...prev, [renameTabId]: newName }));
      setOpenTabs(prev => prev.map(t => {
        if (t.id === renameTabId) {
          const updated = new app.SessionConfig(t);
          updated.name = newName;
          return updated;
        }
        return t;
      }));
    } else {
      setCustomTabNames(prev => {
        const next = { ...prev };
        delete next[renameTabId];
        return next;
      });
    }
    setIsRenameModalOpen(false);
    setRenameTabId('');
    setRenameInput('');
  }, [renameInput, renameTabId, setOpenTabs]);

  const closeTabMenu = useCallback(() => setTabContextMenu(null), []);

  const handleTabAreaDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      const defaultSess = new app.SessionConfig();
      defaultSess.id = 'local_' + Date.now();
      defaultSess.name = 'Local Shell';
      defaultSess.host = 'localhost';
      (defaultSess as any).protocol = 'local';
      setOpenTabs(prev => [...prev, defaultSess]);
      setActiveTabId(defaultSess.id);
    }
  }, []);

  const handleTabDrop = useCallback((targetTabId: string) => {
    if (!draggedTabId || draggedTabId === targetTabId) return;
    const newTabs = [...openTabs];
    const draggedIdx = newTabs.findIndex(t => t.id === draggedTabId);
    const targetIdx = newTabs.findIndex(t => t.id === targetTabId);
    if (draggedIdx !== -1 && targetIdx !== -1) {
      const [draggedItem] = newTabs.splice(draggedIdx, 1);
      newTabs.splice(targetIdx, 0, draggedItem);
      setOpenTabs(newTabs);
    }
    setDraggedTabId(null);
  }, [draggedTabId, openTabs]);

  return {
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
  };
}
