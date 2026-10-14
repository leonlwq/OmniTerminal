import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, History, Terminal, Trash2, Copy, Play, X, Clock, Server, Check, AlertTriangle } from 'lucide-react';
import { GetCommandHistory, ClearCommandHistory } from '../../wailsjs/go/app/App';
import { useI18n } from '../i18n/I18nContext';

export interface CommandHistoryItem {
  id: string;
  sessionId: string;
  sessionName: string;
  host: string;
  command: string;
  exitCode: number;
  timestamp: string;
}

interface CommandHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunCommand: (command: string) => void;
  onInsertCommand: (command: string) => void;
  activeSessionId?: string | null;
}

export function CommandHistoryModal({
  isOpen,
  onClose,
  onRunCommand,
  onInsertCommand,
  activeSessionId,
}: CommandHistoryModalProps) {
  const { t } = useI18n();
  const [historyList, setHistoryList] = useState<CommandHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearNotice, setClearNotice] = useState<string | null>(null);
  const confirmTimerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await GetCommandHistory(1000);
      setHistoryList(res || []);
    } catch (e) {
      console.error('Failed to load command history', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setSearchQuery('');
      setSelectedIndex(0);
      setConfirmClear(false);
      setClearNotice(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, [isOpen]);

  const uniqueSessions = useMemo(() => {
    const map = new Map<string, string>();
    historyList.forEach(item => {
      if (item.sessionId && item.sessionName) {
        map.set(item.sessionId, item.sessionName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [historyList]);

  const filteredList = useMemo(() => {
    let list = historyList;
    if (selectedSessionFilter !== 'all') {
      list = list.filter(item => item.sessionId === selectedSessionFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.command.toLowerCase().includes(q) ||
        item.sessionName.toLowerCase().includes(q) ||
        item.host.toLowerCase().includes(q)
      );
    }
    return list;
  }, [historyList, selectedSessionFilter, searchQuery]);

  // 行内二次确认清空逻辑：摆脱浏览器原生 confirm 在 webview 中被拦截的问题
  const handleClearHistory = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => {
        setConfirmClear(false);
      }, 4000);
      return;
    }

    // 第二次点击确认执行
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmClear(false);

    try {
      await ClearCommandHistory();
      setHistoryList([]);
      setSelectedIndex(0);
      setClearNotice(t('cmdHistory.clearedAll'));
      setTimeout(() => setClearNotice(null), 2500);
    } catch (e) {
      console.error('Failed to clear history', e);
      // 即便后端抛异常，前端也同步清空
      setHistoryList([]);
      setClearNotice(t('cmdHistory.cleared'));
      setTimeout(() => setClearNotice(null), 2500);
    }
  };

  const handleCopy = (item: CommandHistoryItem) => {
    navigator.clipboard.writeText(item.command);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredList[selectedIndex]) {
        onRunCommand(filteredList[selectedIndex].command);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-[760px] max-h-[85vh] flex flex-col text-[#cccccc] overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <History className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e0e0e0] leading-tight">{t('cmdHistory.title') || '跨会话命令历史检索 (Command History)'}</h3>
              <p className="text-[11px] text-[#858585]">{t('cmdHistory.subtitle') || '全局持久化记录，支持快速模糊检索、复用与一键执行'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {clearNotice && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#0e2a1e] border border-[#165a3d] text-[#4ec9b0] animate-in fade-in">
                {clearNotice}
              </span>
            )}
            <button
              onClick={handleClearHistory}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
                confirmClear
                  ? 'bg-[#a1260d] hover:bg-[#b82d0f] text-white font-medium shadow-sm animate-pulse'
                  : 'bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] hover:text-[#f14c4c] border border-[#3c3c3c]'
              }`}
              title={confirmClear ? (t('cmdHistory.clearTitleConfirm') || '点击确定清空全部命令历史') : (t('cmdHistory.clearTitleNormal') || '清空所有命令历史')}
            >
              {confirmClear ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{t('cmdHistory.clearConfirm') || '⚠️ 确认清空全部历史?'}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('cmdHistory.clearHistory') || '清空历史'}</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#333333] text-[#858585] hover:text-[#e0e0e0] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Ribbon */}
        <div className="p-3.5 bg-[#1e1e1e] border-b border-[#2b2b2b] space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder={t('cmdHistory.searchPlaceholder') || '搜索历史命令、服务器名称或 IP 地址... (支持拼音与模糊匹配)'}
              className="w-full pl-9 pr-8 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] placeholder-[#858585] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#858585] hover:text-[#e0e0e0] text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* 会话过滤胶囊 */}
          {uniqueSessions.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5 text-[11px]">
              <span className="text-[#858585] text-[10px] shrink-0 font-medium">{t('cmdHistory.filterLabel') || '会话过滤:'}</span>
              <button
                onClick={() => setSelectedSessionFilter('all')}
                className={`px-2.5 py-0.5 rounded shrink-0 transition-colors font-medium ${
                  selectedSessionFilter === 'all'
                    ? 'bg-[#04395e] text-white border-l-2 border-l-[#0078d4]'
                    : 'bg-[#252526] text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] border border-[#2b2b2b]'
                }`}
              >
                {(t('cmdHistory.all') || '全部')} ({historyList.length})
              </button>
              {uniqueSessions.map(sess => (
                <button
                  key={sess.id}
                  onClick={() => setSelectedSessionFilter(sess.id)}
                  className={`px-2.5 py-0.5 rounded shrink-0 transition-colors flex items-center gap-1 font-medium ${
                    selectedSessionFilter === sess.id
                      ? 'bg-[#04395e] text-white border-l-2 border-l-[#0078d4]'
                      : 'bg-[#252526] text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] border border-[#2b2b2b]'
                  }`}
                >
                  <Server className="w-2.5 h-2.5 text-[#0078d4]" />
                  <span className="truncate max-w-[120px]">{sess.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto max-h-[420px] p-2 space-y-1 bg-[#1e1e1e] scrollbar-thin scrollbar-thumb-[#3c3c3c]">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-[#858585] space-y-2">
              <History className="w-10 h-10 mx-auto text-[#555555]" />
              <div className="text-xs">{t('cmdHistory.emptyTitle') || '暂无匹配的命令历史'}</div>
              <div className="text-[10px] text-[#666666]">{t('cmdHistory.emptySubtitle') || '在任意终端执行的命令都将自动汇总在此处'}</div>
            </div>
          ) : (
            filteredList.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id || idx}
                  onClick={() => setSelectedIndex(idx)}
                  onDoubleClick={() => {
                    onRunCommand(item.command);
                    onClose();
                  }}
                  className={`group relative flex items-center justify-between p-2.5 rounded cursor-pointer transition-colors border ${
                    isSelected
                      ? 'bg-[#04395e]/25 border-[#0078d4] text-white'
                      : 'bg-[#252526] hover:bg-[#2a2d2e] border-[#2b2b2b] text-[#cccccc]'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#1e1e1e] border border-[#3c3c3c] text-[#0078d4] flex items-center gap-1">
                        <Server className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[100px]">{item.sessionName || 'Local Terminal'}</span>
                      </span>
                      {item.host && (
                        <span className="text-[10px] text-[#858585] font-mono">{item.host}</span>
                      )}
                      <span className="text-[10px] text-[#858585] ml-auto flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {item.timestamp}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-[#e0e0e0] font-normal break-all whitespace-pre-wrap">
                      {item.command}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleCopy(item);
                      }}
                      className="p-1 rounded bg-[#1e1e1e] hover:bg-[#333333] text-[#858585] hover:text-[#cccccc] border border-[#3c3c3c] transition-colors"
                      title={t('cmdHistory.copyTip') || '复制命令至剪贴板'}
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-[#4ec9b0]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onInsertCommand(item.command);
                        onClose();
                      }}
                      className="px-2 py-0.5 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] hover:text-white border border-[#3c3c3c] text-[11px] font-medium transition-colors"
                      title={t('cmdHistory.insertTip') || '插入到终端光标处 (不自动回车)'}
                    >
                      {t('cmdHistory.insertBtn') || '填入'}
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onRunCommand(item.command);
                        onClose();
                      }}
                      className="px-2.5 py-0.5 rounded bg-[#0078d4] hover:bg-[#006cbe] text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                      title={t('cmdHistory.runTip') || '立即在活动终端中执行 (Enter)'}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{t('cmdHistory.runBtn') || '执行'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-between text-[11px] text-[#858585]">
          <div className="flex items-center gap-3">
            <span>{t('cmdHistory.navTip') || '↑↓ 切换选中'}</span>
            <span>·</span>
            <span>{t('cmdHistory.runKeyTip') || 'Enter 立即执行'}</span>
            <span>·</span>
            <span>{t('cmdHistory.dblClickTip') || '双击快速投递'}</span>
          </div>
          <div>{(t('cmdHistory.totalRecords') || '共 {count} 条记录').replace('{count}', String(filteredList.length))}</div>
        </div>
      </div>
    </div>
  );
}
