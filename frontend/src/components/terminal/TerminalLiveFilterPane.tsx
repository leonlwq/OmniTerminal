import React from 'react';
import { Filter, Play, Pause, Copy, Check, Trash2, X } from 'lucide-react';

interface TerminalLiveFilterPaneProps {
  isOpen: boolean;
  onClose: () => void;
  filterMatches: any[];
  setFilterMatches: (matches: any[]) => void;
  filterIsPaused: boolean;
  setFilterIsPaused: (val: boolean) => void;
  copyNotice: boolean;
  setCopyNotice: (val: boolean) => void;
  filterPattern: string;
  setFilterPattern: (val: string) => void;
  filterIsRegex: boolean;
  setFilterIsRegex: (val: boolean) => void;
  filterAutoScroll: boolean;
  setFilterAutoScroll: (val: boolean) => void;
  filterScrollRef: React.RefObject<HTMLDivElement | null>;
  highlightMatchText: (text: string, pattern: string, isRegex: boolean) => React.ReactNode;
  onCopyAll: (text: string) => void;
}

export function TerminalLiveFilterPane({
  isOpen,
  onClose,
  filterMatches,
  setFilterMatches,
  filterIsPaused,
  setFilterIsPaused,
  copyNotice,
  filterPattern,
  setFilterPattern,
  filterIsRegex,
  setFilterIsRegex,
  filterAutoScroll,
  setFilterAutoScroll,
  filterScrollRef,
  highlightMatchText,
  onCopyAll,
}: TerminalLiveFilterPaneProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-8 right-3 w-[500px] max-w-[92%] bg-[#1e1e1e] border border-[#2b2b2b] shadow-2xl rounded-md overflow-hidden z-40 flex flex-col text-[#cccccc] animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Filter Header */}
      <div className="px-3.5 py-2 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#cccccc]">
          <Filter className="w-3.5 h-3.5 text-[#0078d4]" />
          <span>实时日志过滤器 (Live Filter)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#0078d4]/20 text-[#3794ff] border border-[#0078d4]/30 font-mono">
            {filterMatches.length} 命中
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterIsPaused(!filterIsPaused)}
            className={`p-1 rounded text-xs transition-colors ${filterIsPaused ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-[#2a2d2e] text-[#858585] hover:text-[#cccccc]'}`}
            title={filterIsPaused ? "恢复实时捕获" : "暂停捕获"}
          >
            {filterIsPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              const allText = filterMatches.map(m => `[${m.time}] #${m.lineNum} ${m.text}`).join('\n');
              onCopyAll(allText);
            }}
            className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] text-xs transition-colors"
            title="复制所有匹配行"
          >
            {copyNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setFilterMatches([])}
            className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] text-xs transition-colors"
            title="清空命中记录"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] text-xs transition-colors"
            title="关闭 (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Input Bar */}
      <div className="p-2.5 bg-[#181818] border-b border-[#2b2b2b] flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <input 
            type="text"
            placeholder="输入过滤关键词或正则 (如 ERROR|WARN|Exception)..."
            value={filterPattern}
            onChange={(e) => setFilterPattern(e.target.value)}
            className="w-full pl-2.5 pr-10 py-1 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none font-mono placeholder-[#858585]"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setFilterIsRegex(!filterIsRegex)}
            className={`absolute right-1.5 px-1.5 py-0.5 text-[10px] font-mono rounded font-semibold transition-colors ${
              filterIsRegex ? 'bg-[#0078d4] text-white' : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
            title="使用正则表达式匹配"
          >
            .*
          </button>
        </div>
        <label className="flex items-center space-x-1.5 text-[11px] text-[#858585] cursor-pointer select-none">
          <input 
            type="checkbox"
            checked={filterAutoScroll}
            onChange={(e) => setFilterAutoScroll(e.target.checked)}
            className="rounded border-[#3c3c3c] bg-[#1e1e1e] accent-[#0078d4] w-3.5 h-3.5"
          />
          <span>滚屏锁定</span>
        </label>
      </div>

      {/* Filter Results List */}
      <div ref={filterScrollRef as any} className="h-56 overflow-y-auto p-2 space-y-1 font-mono text-[11px] bg-[#181818] select-text">
        {filterMatches.length === 0 ? (
          <div className="text-center py-10 text-[#858585] text-xs">
            {filterPattern ? '暂无匹配的日志行，等待终端输出流...' : '请输入关键词或正则表达式以开启实时捕获'}
          </div>
        ) : (
          filterMatches.map((m) => (
            <div key={m.id} className="p-1 rounded hover:bg-[#2a2d2e] transition-colors flex items-start space-x-2 leading-relaxed break-all border-b border-[#2b2b2b]/40">
              <span className="text-[#3794ff]/80 select-none text-[10px] shrink-0">{m.time}</span>
              <span className="text-[#858585] select-none text-[10px] shrink-0 font-mono">#{m.lineNum}</span>
              <span className="text-[#cccccc] flex-1">{highlightMatchText(m.text, filterPattern, filterIsRegex)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
