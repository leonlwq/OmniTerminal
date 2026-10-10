import React, { useState, useEffect, useRef } from 'react';
import { FileText, Play, Square, Trash2, Copy, Search, X, Check, RefreshCw, ArrowDownCircle } from 'lucide-react';
import { EventsOn } from '../../wailsjs/runtime/runtime';

interface RealtimeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionName?: string;
  theme?: string;
}

const COMMON_LOG_PATHS = [
  { label: '系统日志 (syslog)', path: '/var/log/syslog' },
  { label: '消息日志 (messages)', path: '/var/log/messages' },
  { label: '认证与登录 (auth.log)', path: '/var/log/auth.log' },
  { label: 'Nginx 访问日志', path: '/var/log/nginx/access.log' },
  { label: 'Nginx 错误日志', path: '/var/log/nginx/error.log' },
  { label: '内核环形缓冲 (dmesg)', path: '/var/log/dmesg' },
  { label: 'Docker 守护进程', path: '/var/log/docker.log' },
  { label: '安全日志 (secure)', path: '/var/log/secure' },
];

export const RealtimeLogModal: React.FC<RealtimeLogModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  sessionName,
  theme = 'tokyo-night',
}) => {
  const [logPath, setLogPath] = useState('/var/log/syslog');
  const [initialLines, setInitialLines] = useState(100);
  const [isStreaming, setIsStreaming] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const maxLines = 2000;

  // 监听后端日志推送
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const unoffData = EventsOn('remote-log-tail-data', (data: any) => {
      if (data.sessionId === sessionId && data.logPath === logPath) {
        setLogs(prev => {
          const next = [...prev, data.line];
          if (next.length > maxLines) {
            return next.slice(next.length - maxLines);
          }
          return next;
        });
      }
    });

    const unoffError = EventsOn('remote-log-tail-error', (data: any) => {
      if (data.sessionId === sessionId && data.logPath === logPath) {
        setErrorMsg(data.error || '日志流异常中断');
        setIsStreaming(false);
      }
    });

    return () => {
      if (typeof unoffData === 'function') unoffData();
      if (typeof unoffError === 'function') unoffError();
    };
  }, [isOpen, sessionId, logPath]);

  // 自动滚屏
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // 关闭模态框时停止追踪
  useEffect(() => {
    if (!isOpen && isStreaming) {
      handleStop();
    }
  }, [isOpen]);

  const handleStart = async () => {
    if (!logPath.trim()) return;
    setErrorMsg(null);
    setLogs([]);
    try {
      if ((window as any).go?.app?.App?.StartRemoteLogTail) {
        await (window as any).go.app.App.StartRemoteLogTail(sessionId, logPath.trim(), initialLines);
        setIsStreaming(true);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || String(err));
      setIsStreaming(false);
    }
  };

  const handleStop = async () => {
    try {
      if ((window as any).go?.app?.App?.StopRemoteLogTail) {
        await (window as any).go.app.App.StopRemoteLogTail(sessionId, logPath.trim());
      }
    } catch (_) {}
    setIsStreaming(false);
  };

  const handleCopy = () => {
    const text = filteredLogs.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLogs([]);
  };

  // 日志过滤
  const filteredLogs = logs.filter(line => {
    if (!filterText.trim()) return true;
    if (isRegex) {
      try {
        const reg = new RegExp(filterText, 'i');
        return reg.test(line);
      } catch {
        return line.toLowerCase().includes(filterText.toLowerCase());
      }
    }
    return line.toLowerCase().includes(filterText.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-5xl h-[85vh] bg-[#252526] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] overflow-hidden text-[#cccccc]">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm text-[#e0e0e0]">远程实时日志追踪器 (Realtime Log Tailer)</span>
            {sessionName && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#2d2d2d] text-[#0078d4] border border-[#3c3c3c] font-mono">
                {sessionName}
              </span>
            )}
            {isStreaming && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#89d185] bg-[#388a34]/20 border border-[#388a34]/40 px-2 py-0.5 rounded">
                <span className="w-2 h-2 rounded-full bg-[#89d185] animate-pulse" />
                正在流式接收 (tail -f)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#858585] hover:text-[#e0e0e0] hover:bg-[#333333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 控制参数栏 */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-[#181818] border-b border-[#2b2b2b] text-xs shrink-0">
          {/* 日志路径选择与输入 */}
          <div className="flex items-center gap-2 flex-1 min-w-[320px]">
            <span className="text-[#858585] shrink-0">日志路径:</span>
            <input
              type="text"
              value={logPath}
              disabled={isStreaming}
              onChange={e => setLogPath(e.target.value)}
              placeholder="/var/log/syslog"
              className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-2.5 py-1 text-[#cccccc] focus:outline-none font-mono disabled:opacity-50 text-xs"
            />
            <select
              disabled={isStreaming}
              onChange={e => {
                if (e.target.value) setLogPath(e.target.value);
              }}
              className="bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-2 py-1 text-[#cccccc] focus:outline-none disabled:opacity-50 text-xs"
              defaultValue=""
            >
              <option value="" disabled>快速预设...</option>
              {COMMON_LOG_PATHS.map(p => (
                <option key={p.path} value={p.path}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* 初始行数 */}
          <div className="flex items-center gap-2">
            <span className="text-[#858585] shrink-0">回溯行数:</span>
            <input
              type="number"
              min="10"
              max="1000"
              value={initialLines}
              disabled={isStreaming}
              onChange={e => setInitialLines(parseInt(e.target.value) || 100)}
              className="w-18 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded px-2 py-1 text-[#cccccc] focus:outline-none disabled:opacity-50 text-xs"
            />
          </div>

          {/* 启动 / 停止按钮 */}
          {!isStreaming ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium rounded transition-colors text-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              开始追踪
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#a1260d] hover:bg-[#b82a0e] text-white font-medium rounded transition-colors text-xs"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              停止追踪
            </button>
          )}
        </div>

        {/* 二级工具栏：过滤、滚动、清屏、复制 */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#1f1f1f] border-b border-[#2b2b2b] text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#858585] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                placeholder="正则/关键字即时过滤..."
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded pl-8 pr-2 py-1 text-[#cccccc] focus:outline-none text-xs"
              />
            </div>
            <button
              onClick={() => setIsRegex(!isRegex)}
              className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
                isRegex
                  ? 'bg-[#04395e] text-[#ffffff] border-[#0078d4]'
                  : 'bg-[#2d2d2d] text-[#858585] border-[#3c3c3c] hover:text-[#cccccc]'
              }`}
            >
              .* Regex
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#858585] text-[11px]">
              总行数: {logs.length} / 显示: {filteredLogs.length}
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-[#858585] hover:text-[#cccccc] select-none text-xs">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="rounded accent-[#0078d4]"
              />
              <ArrowDownCircle className="w-3.5 h-3.5" />
              滚屏锁定
            </label>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清屏
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] transition-colors text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#89d185]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制日志'}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <div className="px-4 py-2 bg-[#a1260d]/15 border-b border-[#a1260d]/40 text-[#f48771] text-xs flex items-center justify-between shrink-0">
            <span>错误: {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-[#f48771] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 日志内容视口 */}
        <div
          ref={logContainerRef}
          className="flex-1 p-3 bg-[#181818] font-mono text-[12px] leading-5 overflow-y-auto select-text text-[#cccccc]"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#858585] gap-2">
              <FileText className="w-8 h-8 opacity-40" />
              <span>{isStreaming ? '等待远程日志输出...' : '点击「开始追踪」以流式监控远程日志'}</span>
            </div>
          ) : (
            filteredLogs.map((line, idx) => {
              // 关键告警高亮
              const isError = /error|fail|exception|fatal|panic/i.test(line);
              const isWarn = /warn|warning/i.test(line);
              const isInfo = /info|notice/i.test(line);

              let lineClass = 'hover:bg-[#2a2d2e] px-1 py-0.5 rounded transition-colors whitespace-pre-wrap break-all';
              if (isError) {
                lineClass += ' text-[#f48771] bg-[#a1260d]/15';
              } else if (isWarn) {
                lineClass += ' text-[#cca700] bg-[#cca700]/10';
              } else if (isInfo) {
                lineClass += ' text-[#75beff]';
              }

              return (
                <div key={idx} className={lineClass}>
                  <span className="text-[#555555] select-none mr-3 inline-block w-8 text-right text-[10px]">
                    {idx + 1}
                  </span>
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
