import React from 'react';
import { X, Layers, Lock, Unlock, Trash2 } from 'lucide-react';
import { app } from '../../wailsjs/go/models';
import { useI18n } from '../i18n/I18nContext';

interface TabManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  openTabs: app.SessionConfig[];
  activeTabId: string | null;
  setActiveTabId: (id: string) => void;
  handleCloseTab: (id: string) => void;
  lockedTabs: string[];
  toggleTabLock: (id: string) => void;
  tabStatus: { [id: string]: string };
  customTabNames?: { [id: string]: string };
}

export function TabManagerModal({
  isOpen,
  onClose,
  openTabs,
  activeTabId,
  setActiveTabId,
  handleCloseTab,
  lockedTabs,
  toggleTabLock,
  tabStatus,
  customTabNames = {}
}: TabManagerModalProps) {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-[640px] flex flex-col text-[#cccccc] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">{t('tabManager.modalTitle') || '活动选项卡管理器'}</h2>
              <span className="text-[11px] text-[#858585] font-normal">Active Session Tabs Management & Grouping</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#858585] hover:text-[#cccccc] rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#1e1e1e] custom-scrollbar">
          {openTabs.length === 0 ? (
             <div className="p-8 text-center text-xs text-[#858585]">{t('tabManager.empty') || '当前没有打开的终端选项卡'}</div>
          ) : (
            <div className="border border-[#2b2b2b] rounded overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#252526] border-b border-[#2b2b2b] text-[#858585] text-[11px] font-medium">
                  <tr>
                    <th className="px-3.5 py-2 w-12 text-center">{t('tabManager.colStatus') || '状态'}</th>
                    <th className="px-3.5 py-2">{t('tabManager.colName') || '会话名称'}</th>
                    <th className="px-3.5 py-2">{t('tabManager.colTarget') || '目标地址'}</th>
                    <th className="px-3.5 py-2 text-right">{t('tabManager.colActions') || '操作'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2b2b] bg-[#1e1e1e]">
                  {openTabs.map((tab, idx) => {
                     const isLocked = lockedTabs.includes(tab.id);
                     const status = tabStatus[tab.id];
                     let statusColor = 'bg-[#858585]';
                     if (status === 'connected') statusColor = 'bg-[#4ec9b0]';
                     else if (status === 'connecting') statusColor = 'bg-[#cca700] animate-pulse';
                     else if (status === 'error') statusColor = 'bg-[#f14c4c]';
                     
                     const isActive = activeTabId === tab.id;

                     return (
                      <tr 
                        key={tab.id} 
                        className={`hover:bg-[#2a2d2e] transition-colors cursor-pointer ${isActive ? 'bg-[#04395e]/30' : ''}`}
                        onClick={() => {
                          setActiveTabId(tab.id);
                          onClose();
                        }}
                      >
                        <td className="px-3.5 py-2 text-center">
                          <div className={`w-2 h-2 rounded-full ${statusColor} mx-auto`} title={status} />
                        </td>
                        <td className="px-3.5 py-2">
                          <span className={`font-medium ${isActive ? 'text-[#0078d4]' : 'text-[#e0e0e0]'}`}>
                            {idx + 1}. {customTabNames[tab.id] || tab.name}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-[#858585] font-mono text-[11px]">
                          {tab.isLocal ? (t('tabManager.localShell') || '本地终端 (Local Shell)') : `${tab.user || 'root'}@${tab.host}:${tab.port || 22}`}
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          <div className="flex items-center justify-end space-x-1" onClick={e => e.stopPropagation()}>
                             <button 
                               onClick={() => toggleTabLock(tab.id)}
                               className={`p-1 rounded hover:bg-[#333333] transition-colors ${isLocked ? 'text-[#cca700] bg-[#cca700]/10' : 'text-[#858585] hover:text-[#cccccc]'}`}
                               title={isLocked ? (t('tabManager.unlockTip') || "解锁标签页") : (t('tabManager.lockTip') || "锁定标签页")}
                             >
                               {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                             </button>
                             <button 
                               onClick={() => handleCloseTab(tab.id)}
                               disabled={isLocked}
                               className="p-1 rounded text-[#858585] hover:text-[#f14c4c] hover:bg-[#f14c4c]/10 disabled:opacity-20 disabled:hover:text-[#858585] disabled:hover:bg-transparent transition-colors"
                               title={t('tabManager.closeTip') || "关闭标签页"}
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                          </div>
                        </td>
                      </tr>
                     );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] text-xs text-[#858585]">
          <span>{(t('tabManager.totalTabs') || '总共打开 {count} 个选项卡').replace('{count}', String(openTabs.length))}</span>
          <button 
            onClick={onClose} 
            className="px-3 py-1 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            {t('common.close') || '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}

