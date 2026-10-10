import React, { useState, useEffect, useRef } from 'react';
import {
  X, RefreshCw, Search, Play, Pause, Trash2, Copy, Download,
  Maximize2, Minimize2, Box, Layers, AlertCircle, FileText
} from 'lucide-react';

interface ContainerTarget {
  id: string;
  name: string;
  image?: string;
  type: 'docker' | 'k8s';
  podName?: string;
  namespace?: string;
}

interface MultiLogMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContainers: ContainerTarget[];
  selectedHost: string;
}

export const MultiLogMatrixModal: React.FC<MultiLogMatrixModalProps> = ({
  isOpen,
  onClose,
  selectedContainers,
  selectedHost,
}) => {
  const [logs, setLogs] = useState<Record<string, string>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState<Record<string, boolean>>({});
  const logScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 轮询拉取日志
  const fetchLogs = async () => {
    if (isPaused || selectedContainers.length === 0) return;
    try {
      const appRpc = (window as any).go?.app?.App;
      if (!appRpc) return;

      const containerIds = selectedContainers.map(c => c.id);
      if (appRpc.GetMultiContainerLogs) {
        const res = await appRpc.GetMultiContainerLogs(
          selectedHost === 'local' ? '' : selectedHost,
          containerIds,
          150
        );
        if (res) {
          setLogs(prev => ({ ...prev, ...res }));
        }
      } else if (appRpc.GetDockerLogs) {
        // 降级单容器并发拉取
        const results: Record<string, string> = {};
        await Promise.all(
          selectedContainers.map(async (c) => {
            try {
              const out = await appRpc.GetDockerLogs(
                selectedHost === 'local' ? '' : selectedHost,
                c.id,
                150
              );
              results[c.id] = out || '';
            } catch (e: any) {
              results[c.id] = `[获取失败]: ${e?.message || e}`;
            }
          })
        );
        setLogs(prev => ({ ...prev, ...results }));
      }
    } catch (err) {
      console.warn('Fetch multi logs error:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchLogs();
    const timer = setInterval(fetchLogs, 2500);
    return () => clearInterval(timer);
  }, [isOpen, isPaused, selectedContainers, selectedHost]);

  // 自动滚屏处理
  useEffect(() => {
    selectedContainers.forEach(c => {
      if (autoScroll[c.id] !== false) {
        const el = logScrollRefs.current[c.id];
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }
    });
  }, [logs, autoScroll, selectedContainers]);

  if (!isOpen) return null;

  const displayList = maximizedId
    ? selectedContainers.filter(c => c.id === maximizedId)
    : selectedContainers;

  const gridColsClass = displayList.length === 1
    ? 'grid-cols-1'
    : displayList.length === 2
    ? 'grid-cols-2'
    : 'grid-cols-2';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150 select-text">
      <div className="bg-[#181818] border border-[#2b2b2b] rounded-lg w-full h-[92vh] max-w-7xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-[#cccccc]">

        {/* Modal Header */}
        <div className="px-5 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-white flex items-center gap-2">
                多容器实时日志流矩阵 (Multi-Container Log Matrix)
                <span className="text-[10px] bg-[#0078d4]/20 text-[#3794ff] px-1.5 py-0.2 rounded font-normal">
                  {selectedContainers.length} 个容器同屏跟踪
                </span>
              </h3>
              <p className="text-[10px] text-[#858585]">
                宿主: {selectedHost === 'local' ? '本地 (Local Host)' : selectedHost} | 自动刷新间隔: 2.5s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 border transition-colors ${
                isPaused
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3c3c3c] text-[#cccccc]'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? '继续流式跟踪' : '暂停流式跟踪'}</span>
            </button>
            <button
              onClick={fetchLogs}
              className="p-1.5 rounded hover:bg-[#333333] text-[#858585] hover:text-white transition-colors"
              title="立即刷新"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#333333] text-[#858585] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Matrix Grid Panels */}
        <div className={`flex-1 p-3 grid ${gridColsClass} gap-3 overflow-hidden bg-[#141414]`}>
          {displayList.map(c => {
            const rawLog = logs[c.id] || '等待捕获容器日志流...';
            const term = (searchTerms[c.id] || '').toLowerCase();
            const logLines = rawLog.split('\n');
            const filteredLines = term
              ? logLines.filter(l => l.toLowerCase().includes(term))
              : logLines;

            return (
              <div
                key={c.id}
                className="bg-[#181818] border border-[#2b2b2b] rounded flex flex-col overflow-hidden shadow-inner"
              >
                {/* Panel Sub-header */}
                <div className="px-3 py-1.5 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-semibold text-white truncate max-w-[180px]" title={c.name}>
                      {c.name}
                    </span>
                    <span className="text-[10px] text-[#858585] font-mono bg-[#141414] px-1.5 py-0.2 rounded border border-[#2b2b2b]">
                      {c.id.substring(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Search in this log */}
                    <div className="flex items-center gap-1 bg-[#141414] px-1.5 py-0.5 rounded border border-[#333333]">
                      <Search className="w-3 h-3 text-[#858585]" />
                      <input
                        type="text"
                        value={searchTerms[c.id] || ''}
                        onChange={e => setSearchTerms({ ...searchTerms, [c.id]: e.target.value })}
                        placeholder="过滤行..."
                        className="bg-transparent text-[10px] text-[#cccccc] placeholder-[#666666] outline-none w-16 focus:w-28 transition-all font-mono"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setAutoScroll(prev => ({ ...prev, [c.id]: prev[c.id] === false ? true : false }));
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                        autoScroll[c.id] !== false
                          ? 'bg-[#0078d4]/20 border-[#0078d4]/40 text-[#3794ff]'
                          : 'bg-[#252526] border-[#3c3c3c] text-[#858585]'
                      }`}
                      title="自动滚屏到底部"
                    >
                      滚屏
                    </button>

                    <button
                      onClick={() => navigator.clipboard.writeText(rawLog)}
                      className="p-1 text-[#858585] hover:text-white hover:bg-[#333333] rounded transition-colors"
                      title="复制全部日志"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => setLogs(prev => ({ ...prev, [c.id]: '' }))}
                      className="p-1 text-[#858585] hover:text-rose-400 hover:bg-[#333333] rounded transition-colors"
                      title="清屏"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => setMaximizedId(maximizedId === c.id ? null : c.id)}
                      className="p-1 text-[#858585] hover:text-white hover:bg-[#333333] rounded transition-colors"
                      title={maximizedId === c.id ? '还原网格' : '最大化此视口'}
                    >
                      {maximizedId === c.id ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Log Stream Viewport */}
                <div
                  ref={el => {
                    logScrollRefs.current[c.id] = el;
                  }}
                  className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed text-[#d4d4d4] bg-[#121212] select-text whitespace-pre-wrap divide-y divide-white/[0.02]"
                >
                  {filteredLines.map((line, idx) => {
                    const isErr = /error|fail|fatal|exception/i.test(line);
                    const isWarn = /warn|warning/i.test(line);
                    return (
                      <div
                        key={idx}
                        className={`py-0.5 hover:bg-white/[0.04] px-1 rounded ${
                          isErr ? 'text-rose-400 font-semibold' : isWarn ? 'text-amber-300' : ''
                        }`}
                      >
                        {line}
                      </div>
                    );
                  })}
                  {filteredLines.length === 0 && (
                    <div className="text-center py-10 text-[#666666]">无匹配的日志行</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
