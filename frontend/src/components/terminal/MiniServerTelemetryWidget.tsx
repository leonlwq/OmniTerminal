import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Cpu, 
  Database, 
  Activity, 
  ArrowDown, 
  ArrowUp, 
  HardDrive, 
  Clock, 
  RefreshCw, 
  ExternalLink, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { HostResourceMetrics } from '../../types';

interface MiniServerTelemetryWidgetProps {
  sessionId: string;
  sessionName: string;
  isLocal?: boolean;
  enableMiniTelemetry?: boolean;
  intervalSec?: number;
  onOpenFullMonitor?: () => void;
}

export const MiniServerTelemetryWidget: React.FC<MiniServerTelemetryWidgetProps> = ({
  sessionId,
  sessionName,
  isLocal = false,
  enableMiniTelemetry = true,
  intervalSec = 3,
  onOpenFullMonitor,
}) => {
  const [metrics, setMetrics] = useState<HostResourceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const consecutiveErrorsRef = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // 格式化速率
  const formatNetRate = (kbps: number | undefined): string => {
    if (!kbps || kbps <= 0) return '0 KB/s';
    if (kbps >= 1024) {
      return `${(kbps / 1024).toFixed(1)} MB/s`;
    }
    return `${kbps.toFixed(0)} KB/s`;
  };

  // 格式化容量
  const formatGB = (totalGB: number | undefined, usedGB: number | undefined): string => {
    if (!totalGB) return '--';
    return `${(usedGB || 0).toFixed(1)} / ${totalGB.toFixed(1)} GB`;
  };

  // 采样主机指标
  const fetchMetrics = useCallback(async () => {
    if (!sessionId || isLocal) return;

    const getFn = (window as any).go?.app?.App?.GetHostMetrics;
    if (!getFn) return;

    setLoading(true);
    try {
      const data: HostResourceMetrics = await getFn(sessionId);
      if (!isMountedRef.current) return;

      if (data && !data.error) {
        setMetrics(data);
        consecutiveErrorsRef.current = 0;
        if (data.cpuUsage !== undefined) {
          setCpuHistory((prev) => [...prev.slice(-15), data.cpuUsage]);
        }
        if (data.memUsage !== undefined) {
          setMemHistory((prev) => [...prev.slice(-15), data.memUsage]);
        }
      } else {
        consecutiveErrorsRef.current += 1;
      }
    } catch {
      if (isMountedRef.current) {
        consecutiveErrorsRef.current += 1;
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionId, isLocal]);

  // 定时采样循环（带页面可见性监听）
  useEffect(() => {
    isMountedRef.current = true;
    if (!enableMiniTelemetry || isLocal || !sessionId) {
      return;
    }

    // 首次挂载立即采样一次
    fetchMetrics();

    const intervalMs = Math.max(2, intervalSec) * 1000;
    const timerId = setInterval(() => {
      // 若连续错误过多（例如远端机器非 Linux 或无 /proc），每 3 个周期采样一次节约资源
      if (consecutiveErrorsRef.current >= 4 && consecutiveErrorsRef.current % 3 !== 0) {
        return;
      }
      if (!document.hidden && isMountedRef.current) {
        fetchMetrics();
      }
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (!document.hidden && isMountedRef.current) {
        fetchMetrics();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, isLocal, enableMiniTelemetry, intervalSec, fetchMetrics]);

  // 点击外部关闭弹层
  useEffect(() => {
    if (!isPopoverOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isPopoverOpen]);

  // 若关闭了遥测或属于本地会话，则不予渲染
  if (!enableMiniTelemetry || isLocal || !sessionId) {
    return null;
  }

  // 健康呼吸状态评级
  const cpu = metrics?.cpuUsage ?? 0;
  const mem = metrics?.memUsage ?? 0;
  let healthColor = 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
  let healthTitle = '系统运行平稳健康';

  if (cpu >= 90 || mem >= 92) {
    healthColor = 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse';
    healthTitle = '高负荷预警 (CPU/RAM > 90%)';
  } else if (cpu >= 70 || mem >= 80) {
    healthColor = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]';
    healthTitle = '中度负载 (CPU > 70% 或 RAM > 80%)';
  } else if (!metrics) {
    healthColor = 'bg-[#858585]';
    healthTitle = '连接就绪，等待指标采集';
  }

  // 简易 SVG 趋势线
  const renderSparkline = (data: number[], strokeColor: string) => {
    if (data.length < 2) return null;
    const width = 120;
    const height = 24;
    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - (Math.min(100, Math.max(0, val)) / 100) * height;
        return `${x},${Math.max(1, Math.min(height - 1, y))}`;
      })
      .join(' ');

    return (
      <svg className="w-full h-6 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div ref={containerRef} className="absolute top-2.5 right-4 z-30 pointer-events-auto select-none font-sans">
      {/* 极简磨砂胶囊徽标 (Micro Capsule) */}
      <button
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        className={`group flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono transition-all duration-200 border shadow-lg backdrop-blur-md ${
          isPopoverOpen
            ? 'bg-[#252526] border-[#0078d4] text-white shadow-[#0078d4]/10'
            : 'bg-[#181818]/80 hover:bg-[#1f1f1f]/95 border-[#2e2e2e] hover:border-[#3c3c3c] text-[#cccccc] hover:text-white'
        }`}
        title={`服务器实时硬件遥测 (${sessionName}) - 点击查看详情`}
      >
        {/* 健康呼吸灯 */}
        <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${healthColor}`} title={healthTitle} />

        {/* CPU 指标 */}
        <div className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-[#3794ff] shrink-0" />
          <span className="font-semibold">{metrics ? `${metrics.cpuUsage.toFixed(0)}%` : '--'}</span>
        </div>

        <span className="text-[#3c3c3c] text-xs">|</span>

        {/* 内存指标 */}
        <div className="flex items-center gap-1">
          <Database className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="font-semibold">{metrics ? `${metrics.memUsage.toFixed(0)}%` : '--'}</span>
        </div>

        {/* 实时网络下行指示（有吞吐时灵动展示） */}
        {metrics && (metrics.netRxRateKBps > 0.5 || metrics.netTxRateKBps > 0.5) && (
          <>
            <span className="text-[#3c3c3c] text-xs">|</span>
            <div className="hidden sm:flex items-center gap-0.5 text-[10px] text-[#9cdcfe]">
              <ArrowDown className="w-2.5 h-2.5 text-sky-400 shrink-0" />
              <span>{formatNetRate(metrics.netRxRateKBps)}</span>
            </div>
          </>
        )}
      </button>

      {/* 展开的紧凑微图表浮层卡片 (Mini Popover Card) */}
      {isPopoverOpen && (
        <div className="absolute top-9 right-0 w-80 bg-[#1e1e1e]/98 backdrop-blur-xl border border-[#3c3c3c] rounded-xl shadow-2xl p-3.5 z-30 animate-in fade-in zoom-in-95 duration-150 text-[#cccccc]">
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#2b2b2b] mb-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-5 h-5 rounded bg-[#0078d4]/15 border border-[#0078d4]/30 flex items-center justify-center text-[#3794ff] shrink-0">
                <Activity className="w-3 h-3" />
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">{sessionName || 'Remote Host'}</div>
                <div className="text-[10px] text-[#858585] font-mono">
                  采样: {metrics?.sampledAt || '刚刚'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchMetrics();
                }}
                disabled={loading}
                className="p-1 rounded text-[#858585] hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                title="立即刷新指标"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3794ff]' : ''}`} />
              </button>
            </div>
          </div>

          {/* 报错提醒 */}
          {metrics?.error && (
            <div className="mb-2.5 p-2 bg-red-950/40 border border-red-500/30 rounded text-red-300 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{metrics.error}</span>
            </div>
          )}

          {/* 核心指标双格卡片 */}
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {/* CPU 卡片 */}
            <div className="bg-[#252526] border border-[#2e2e2e] rounded-lg p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#858585] flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-[#3794ff]" />
                  CPU
                </span>
                <span className="text-xs font-bold font-mono text-white">
                  {metrics ? `${metrics.cpuUsage.toFixed(1)}%` : '--'}
                </span>
              </div>
              <div className="mt-2 h-6 flex items-center">
                {cpuHistory.length >= 2 ? (
                  renderSparkline(cpuHistory, '#0078d4')
                ) : (
                  <div className="w-full bg-[#181818] h-1.5 rounded-full overflow-hidden border border-[#2b2b2b]">
                    <div
                      className="bg-[#0078d4] h-full rounded-full transition-all duration-300"
                      style={{ width: `${metrics?.cpuUsage || 0}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 内存卡片 */}
            <div className="bg-[#252526] border border-[#2e2e2e] rounded-lg p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#858585] flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-400" />
                  内存
                </span>
                <span className="text-xs font-bold font-mono text-white">
                  {metrics ? `${metrics.memUsage.toFixed(1)}%` : '--'}
                </span>
              </div>
              <div className="mt-2 h-6 flex items-center">
                {memHistory.length >= 2 ? (
                  renderSparkline(memHistory, '#10b981')
                ) : (
                  <div className="w-full bg-[#181818] h-1.5 rounded-full overflow-hidden border border-[#2b2b2b]">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${metrics?.memUsage || 0}%` }}
                    />
                  </div>
                )}
              </div>
              {metrics?.memTotalMB ? (
                <div className="text-[9px] text-[#858585] font-mono text-right mt-1">
                  {(metrics.memUsedMB / 1024).toFixed(1)} / {(metrics.memTotalMB / 1024).toFixed(1)} GB
                </div>
              ) : null}
            </div>
          </div>

          {/* 磁盘与网络指标行 */}
          <div className="space-y-2 mb-3 text-xs">
            {/* 磁盘根分区使用 */}
            <div className="bg-[#252526] border border-[#2e2e2e] rounded-lg p-2">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[#858585] flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-purple-400" />
                  根分区 (/)
                </span>
                <span className="font-mono text-white">
                  {metrics?.diskUsage !== undefined ? `${metrics.diskUsage}%` : '--'}
                </span>
              </div>
              <div className="w-full bg-[#181818] h-1.5 rounded-full overflow-hidden border border-[#2b2b2b]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    (metrics?.diskUsage || 0) > 85 ? 'bg-rose-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${metrics?.diskUsage || 0}%` }}
                />
              </div>
              {metrics?.diskTotalGB ? (
                <div className="flex justify-between text-[9px] text-[#858585] font-mono mt-1">
                  <span>已用: {metrics.diskUsedGB} GB</span>
                  <span>总量: {metrics.diskTotalGB} GB</span>
                </div>
              ) : null}
            </div>

            {/* 网络吞吐速率 */}
            <div className="bg-[#252526] border border-[#2e2e2e] rounded-lg p-2 flex items-center justify-between font-mono text-[11px]">
              <div className="flex items-center gap-1.5">
                <ArrowDown className="w-3 h-3 text-sky-400" />
                <span className="text-[#858585]">下行:</span>
                <span className="text-white font-medium">{formatNetRate(metrics?.netRxRateKBps)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowUp className="w-3 h-3 text-emerald-400" />
                <span className="text-[#858585]">上行:</span>
                <span className="text-white font-medium">{formatNetRate(metrics?.netTxRateKBps)}</span>
              </div>
            </div>

            {/* 系统 Uptime */}
            {metrics?.uptimeStr && (
              <div className="flex items-center justify-between px-1 text-[10px] text-[#858585] font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  系统运行时间:
                </span>
                <span className="text-[#cccccc]">{metrics.uptimeStr}</span>
              </div>
            )}
          </div>

          {/* 底部直达按钮 */}
          <div className="pt-2 border-t border-[#2b2b2b] flex items-center justify-between">
            <span className="text-[10px] text-[#666666]">采样周期: {intervalSec}s</span>
            <button
              onClick={() => {
                setIsPopoverOpen(false);
                onOpenFullMonitor?.();
              }}
              className="px-2.5 py-1 bg-[#0078d4] hover:bg-[#0078d4]/85 text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors shadow-sm"
            >
              <span>打开完整监控中心</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
