import React, { useState } from 'react';
import { Search, X, Terminal } from 'lucide-react';
import { terminalBuffers } from './TerminalInstance';
import { app } from '../../wailsjs/go/models';
import { useI18n } from '../i18n/I18nContext';

interface GlobalSearchModalProps {
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;
  openTabs: app.SessionConfig[];
  setActiveTabId: (id: string) => void;
}

export function GlobalSearchModal({
  isGlobalSearchOpen,
  setIsGlobalSearchOpen,
  openTabs,
  setActiveTabId
}: GlobalSearchModalProps) {
  const { t } = useI18n();
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<{ tabId: string, line: string, index: number }[]>([]);

  if (!isGlobalSearchOpen) return null;

  const performSearch = () => {
    const results: { tabId: string, line: string, index: number }[] = [];
    for (const [tabId, getLines] of Object.entries(terminalBuffers)) {
      const lines = getLines();
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(globalSearchQuery.toLowerCase())) {
          results.push({ tabId, line, index });
        }
      });
    }
    setGlobalSearchResults(results);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="bg-[#252526] w-[640px] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] flex flex-col max-h-[80vh] overflow-hidden text-[#cccccc]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">{t('globalSearch.modalTitle') || '全局终端缓冲区搜索'}</h2>
              <span className="text-[11px] text-[#858585] font-normal">Cross-Tab Terminal Scrollback Search</span>
            </div>
          </div>
          <button
            onClick={() => setIsGlobalSearchOpen(false)}
            className="text-[#858585] hover:text-[#cccccc] rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search input area */}
        <div className="p-4 border-b border-[#2b2b2b] bg-[#1e1e1e]">
          <div className="flex space-x-2">
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder={t('globalSearch.inputPlaceholder') || '输入要在所有活动终端中检索的文本或正则...'}
              className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#484848] focus:border-[#0078d4] rounded px-3 py-1.5 text-xs text-[#cccccc] outline-none transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  performSearch();
                }
              }}
              autoFocus
            />
            <button
              onClick={performSearch}
              className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] rounded text-xs font-medium text-white transition-colors"
            >
              {t('globalSearch.searchBtn') || '检索全部'}
            </button>
          </div>
          <p className="text-[11px] text-[#858585] mt-2">{t('globalSearch.hint') || '支持在当前所有打开会话的滚动历史缓冲区中快速全文匹配定位。'}</p>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#1e1e1e] space-y-2 custom-scrollbar">
          {globalSearchResults.length > 0 ? (
            <div className="space-y-2">
              {globalSearchResults.map((res, i) => {
                const curTab = openTabs.find(tab => tab.id === res.tabId);
                return (
                  <div
                    key={i}
                    onClick={() => {
                      setActiveTabId(res.tabId);
                      setIsGlobalSearchOpen(false);
                    }}
                    className="p-3 rounded bg-[#252526] border border-[#2b2b2b] hover:border-[#0078d4]/60 hover:bg-[#2a2d2e] cursor-pointer transition-colors flex flex-col shadow-sm"
                  >
                    <div className="text-[11px] text-[#0078d4] font-medium mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        Tab: {curTab?.name || 'Session'}
                      </span>
                      <span className="text-[10px] text-[#858585] font-mono">{(t('globalSearch.lineAt') || '第 {line} 行').replace('{line}', String(res.index + 1))}</span>
                    </div>
                    <div className="text-xs text-[#cccccc] font-mono break-all whitespace-pre-wrap line-clamp-2">
                      {res.line.length > 300 ? res.line.substring(0, 300) + '...' : res.line}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-xs text-[#858585] space-y-2">
              <Search className="w-8 h-8 opacity-20" />
              <span>{globalSearchQuery ? (t('globalSearch.noMatch') || '未找到匹配结果') : (t('globalSearch.promptInput') || '输入关键字并回车开始全局检索')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

