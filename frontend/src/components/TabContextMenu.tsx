import React from 'react';
import { X } from 'lucide-react';
import { app } from '../../wailsjs/go/models';
import { SplitMode } from '../hooks/useTabManager';

export interface TabContextMenuProps {
  tabContextMenu: { x: number; y: number; tabId: string } | null;
  setTabContextMenu: (val: { x: number; y: number; tabId: string } | null) => void;
  openTabs: app.SessionConfig[];
  setOpenTabs: React.Dispatch<React.SetStateAction<app.SessionConfig[]>>;
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  secondaryTabId: string | null;
  setSecondaryTabId: (id: string | null) => void;
  splitMode: SplitMode;
  setSplitMode: (mode: SplitMode) => void;
  lockedTabs: string[];
  toggleTabLock: (id: string) => void;
  customTabNames: { [id: string]: string };
  setRenameTabId: (id: string) => void;
  setRenameInput: (name: string) => void;
  setIsRenameModalOpen: (open: boolean) => void;
  handleReconnectTab: (id: string) => void;
  handleCloneTab: (tab: app.SessionConfig) => void;
  handleDetachTab: (id: string) => void;
  handleCloseOtherTabs: (id: string) => void;
  handleCloseRightTabs: (id: string) => void;
  linkedTabIds: string[];
  setLinkedTabIds: React.Dispatch<React.SetStateAction<string[]>>;
  setShareSessionModalData: (data: { isOpen: boolean; sessionId: string; sessionName: string }) => void;
  t: (key: any) => string;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  tabContextMenu,
  setTabContextMenu,
  openTabs,
  setOpenTabs,
  activeTabId,
  setActiveTabId,
  secondaryTabId,
  setSecondaryTabId,
  splitMode,
  setSplitMode,
  lockedTabs,
  toggleTabLock,
  customTabNames,
  setRenameTabId,
  setRenameInput,
  setIsRenameModalOpen,
  handleReconnectTab,
  handleCloneTab,
  handleDetachTab,
  handleCloseOtherTabs,
  handleCloseRightTabs,
  linkedTabIds,
  setLinkedTabIds,
  setShareSessionModalData,
  t,
}) => {
  if (!tabContextMenu) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation();
          setTabContextMenu(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setTabContextMenu(null);
        }}
      />
      <div
        className="fixed bg-app-surface border border-app-border rounded-none shadow-md py-1 z-50 w-36 text-[11px] text-app-text select-none animate-in fade-in zoom-in-95 duration-100"
        style={{ top: `${tabContextMenu.y}px`, left: `${tabContextMenu.x}px` }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <button
          onClick={() => {
            handleReconnectTab(tabContextMenu.tabId);
            setTabContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors"
        >
          🔌 重新连接会话
        </button>
        <button
          onClick={() => {
            const tab = openTabs.find(t => t.id === tabContextMenu.tabId);
            if (tab) {
              handleCloneTab(tab);
            }
            setTabContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors"
        >
          👥 克隆会话标签
        </button>
        <button
          onClick={() => {
            toggleTabLock(tabContextMenu.tabId);
            setTabContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors flex items-center justify-between"
        >
          <span>{lockedTabs.includes(tabContextMenu.tabId) ? '🔓 解锁标签页' : '🔒 锁定标签页'}</span>
        </button>
        <button
          onClick={() => {
            setRenameTabId(tabContextMenu.tabId);
            const tab = openTabs.find(t => t.id === tabContextMenu.tabId);
            setRenameInput(customTabNames[tabContextMenu.tabId] || tab?.name || '');
            setIsRenameModalOpen(true);
            setTabContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors"
        >
          ✏️ 重命名标签页
        </button>
        <button
          onClick={() => {
            handleDetachTab(tabContextMenu.tabId);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-blue-600/30 text-blue-400 transition-colors"
        >
          🪟 拆离到独立窗口 (Detach)
        </button>
        <button
          onClick={() => {
            const tab = openTabs.find(t => t.id === tabContextMenu.tabId);
            setShareSessionModalData({
              isOpen: true,
              sessionId: tabContextMenu.tabId,
              sessionName: customTabNames[tabContextMenu.tabId] || tab?.name || tabContextMenu.tabId
            });
            setTabContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-emerald-600/20 text-emerald-400 transition-colors"
        >
          📡 协同共享此会话...
        </button>
        <div className="h-px bg-[#2d2d30] mx-2 my-1" />
        <button
          onClick={() => {
            const clickedId = tabContextMenu.tabId;
            if (activeTabId && activeTabId !== clickedId) {
              setSecondaryTabId(activeTabId);
              setActiveTabId(clickedId);
              setSplitMode('vertical');
            } else {
              const other = openTabs.find(t => t.id !== clickedId);
              if (other) {
                setSecondaryTabId(other.id);
                setSplitMode('vertical');
              } else {
                alert("无其他可用于分屏的标签页，请先打开一个新标签页！");
              }
            }
            setTabContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-blue-400 transition-colors"
        >
          ◫ 向右拆分(同屏)
        </button>
        <button
          onClick={() => {
            const clickedId = tabContextMenu.tabId;
            if (activeTabId && activeTabId !== clickedId) {
              setSecondaryTabId(activeTabId);
              setActiveTabId(clickedId);
              setSplitMode('horizontal');
            } else {
              const other = openTabs.find(t => t.id !== clickedId);
              if (other) {
                setSecondaryTabId(other.id);
                setSplitMode('horizontal');
              } else {
                alert("无其他可用于分屏的标签页，请先打开一个新标签页！");
              }
            }
            setTabContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-blue-400 transition-colors"
        >
          ⊟ 向下拆分(同屏)
        </button>
        {splitMode !== 'none' && (
          <button
            onClick={() => {
              setSplitMode('none');
              setSecondaryTabId(null);
              setTabContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-orange-400 transition-colors"
          >
            {t('menu.cancelSplit')}
          </button>
        )}
        <div className="h-px bg-[#2d2d30] mx-2 my-1" />
        <button
          onClick={() => {
            setLinkedTabIds(prev =>
              prev.includes(tabContextMenu.tabId)
                ? prev.filter(id => id !== tabContextMenu.tabId)
                : [...prev, tabContextMenu.tabId]
            );
            setTabContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-blue-600/20 text-blue-400 transition-colors border-b border-app-border"
        >
          {linkedTabIds.includes(tabContextMenu.tabId) ? '🔗 退出同步链接组 (Unlink)' : '🔗 加入同步链接组 (Session Link)'}
        </button>
        <button
          onClick={() => {
            handleCloseOtherTabs(tabContextMenu.tabId);
            setTabContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-red-400 transition-colors"
        >
          {t('menu.closeOthers')}
        </button>
        <button
          onClick={() => {
            handleCloseRightTabs(tabContextMenu.tabId);
            setTabContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-red-400 transition-colors"
        >
          {t('menu.closeRight')}
        </button>
        
        {/* 🎨 颜色标签 (Color Tag) */}
        <div className="px-3 py-1.5 border-t border-app-border bg-[#11141a]">
          <span className="text-[10px] text-app-text-muted block mb-1 font-semibold">🎨 标签颜色:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'red', bg: 'bg-rose-500', name: '红色' },
              { id: 'orange', bg: 'bg-orange-500', name: '橙色' },
              { id: 'yellow', bg: 'bg-amber-400', name: '黄色' },
              { id: 'green', bg: 'bg-emerald-400', name: '绿色' },
              { id: 'cyan', bg: 'bg-cyan-400', name: '青色' },
              { id: 'blue', bg: 'bg-blue-500', name: '蓝色' },
              { id: 'purple', bg: 'bg-purple-500', name: '紫色' },
              { id: 'pink', bg: 'bg-pink-400', name: '粉色' },
            ].map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setOpenTabs(prev => prev.map(t => t.id === tabContextMenu.tabId ? ({ ...t, colorLabel: c.id } as app.SessionConfig) : t));
                  setTabContextMenu(null);
                }}
                className={`w-3.5 h-3.5 rounded-full ${c.bg} hover:scale-125 transition-transform ring-1 ring-white/20`}
                title={c.name}
              />
            ))}
            <button
              onClick={() => {
                setOpenTabs(prev => prev.map(t => t.id === tabContextMenu.tabId ? ({ ...t, colorLabel: '' } as app.SessionConfig) : t));
                setTabContextMenu(null);
              }}
              className="text-[9px] px-1 py-0.5 text-slate-400 hover:text-white rounded bg-white/10 ml-auto"
              title="清除颜色标签"
            >
              清除
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export interface RenameTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  renameInput: string;
  setRenameInput: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RenameTabModal: React.FC<RenameTabModalProps> = ({
  isOpen,
  onClose,
  renameInput,
  setRenameInput,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs z-50 p-2">
      <div className="bg-[#1e1e1e] border border-app-border rounded-none shadow-md max-w-xs w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
        <div className="flex items-center justify-between px-2 py-1 bg-[#2d2d30] border-b border-app-border shrink-0">
          <h3 className="text-xs font-bold text-app-text">重命名标签页</h3>
          <button
            onClick={onClose}
            className="text-slate-450 hover:text-app-text rounded p-1 hover:bg-app-hover transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-2 space-y-4">
          <div className="space-y-1 text-xs">
            <label className="text-[10px] font-bold text-app-text-muted uppercase tracking-wide">临时新名称 *</label>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              className="w-full px-3 py-2 bg-app-surface border border-app-border rounded-none focus:outline-none focus:border-blue-500/50 text-app-text"
              required
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-app-border shrink-0 text-xs font-semibold">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-app-border hover:bg-app-hover rounded-none text-slate-350 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-none text-white transition-colors shadow-md font-bold"
            >
              确认修改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
