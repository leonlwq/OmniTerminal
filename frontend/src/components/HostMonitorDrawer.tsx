import React, { useState, useEffect } from 'react';
import { 
  Activity, Cpu, HardDrive, Database, Clock, 
  RefreshCw, X, Play, Pause, AlertCircle 
} from 'lucide-react';
import { HostResourceMetrics } from '../types';

interface HostMonitorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId: string;
  sessionName: string;
}

export const HostMonitorDrawer: React.FC<HostMonitorDrawerProps> = ({
  isOpen,
  onClose,
  activeSessionId,
  sessionName,
}) => {
  const [metrics, setMetrics] = useState<HostResourceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3000); // 3 seconds
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);

  const fetchMetrics = () => {
    if (!activeSessionId) return;
    setLoading(true);
    const getFn = (window as any).go?.app?.App?.GetHostMetrics;
    if (!getFn) {
      setLoading(false);
      return;
    }

    getFn(activeSessionId)
      .then((data: HostResourceMetrics) => {
        setMetrics(data);
        setErrorMsg('');
        if (data && data.cpuUsage !== undefined) {
          setCpuHistory((prev) => [...prev.slice(-20), data.cpuUsage]);
        }
        if (data && data.memUsage !== undefined) {
          setMemHistory((prev) => [...prev.slice(-20), data.memUsage]);
        }
      })
      .catch((err: any) => {
        const msg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
        setErrorMsg(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isOpen || !activeSessionId) return;
    fetchMetrics();

    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [isOpen, activeSessionId, autoRefresh, refreshInterval]);

  if (!isOpen) return null;

  // Simple SVG sparkline
  const renderSparkline = (data: number[], color: string) => {
    if (data.length < 2) return null;
    const max = 100;
    const width = 180;
    const height = 36;
    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - (val / max) * height;
        return `${x},${Math.max(2, Math.min(height - 2, y))}`;
      })
      .join(' ');

    return (
      <svg className="w-full h-9 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="fixed bottom-7 right-4 z-40 w-96 bg-[#1e1e1e] border border-[#2b2b2b] shadow-2xl rounded-md overflow-hidden animate-in slide-in-from-bottom-5 duration-200 text-[#cccccc]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded bg-[#0078d4]/15 border border-[#0078d4]/30 flex items-center justify-center text-[#3794ff]">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
              主机状态监控
              <span className="text-[10px] px-1.5 py-0.5 bg-[#0078d4]/10 text-[#3794ff] border border-[#0078d4]/20 rounded font-mono font-normal">
                {sessionName || 'Active Session'}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-1.5 rounded transition-colors text-xs ${
              autoRefresh ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-[#858585] hover:bg-white/10'
            }`}
            title={autoRefresh ? '暂停自动刷新' : '开启自动刷新'}
          >
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-1.5 text-[#858585] hover:text-white rounded hover:bg-white/10 transition-colors disabled:opacity-50"
            title="手动刷新"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[#858585] hover:text-white rounded hover:bg-white/10 transition-colors"
            title="关闭监控"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2.5 max-h-[460px] overflow-y-auto font-sans">
        {errorMsg && (
          <div className="p-3 bg-red-950/30 border border-red-500/40 text-red-300 text-xs rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 overflow-hidden break-all">{errorMsg}</div>
          </div>
        )}

        {/* CPU & Memory Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* CPU Card */}
          <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#858585] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#3794ff]" />
                CPU 使用率
              </span>
              <span className="text-xs font-bold font-mono text-white">
                {metrics?.cpuUsage !== undefined ? `${metrics.cpuUsage}%` : '--'}
              </span>
            </div>
            <div className="mt-2 h-9 flex items-center justify-center">
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

          {/* Memory Card */}
          <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#858585] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                内存占用
              </span>
              <span className="text-xs font-bold font-mono text-white">
                {metrics?.memUsage !== undefined ? `${metrics.memUsage}%` : '--'}
              </span>
            </div>
            <div className="mt-2 h-9 flex items-center justify-center">
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
              <div className="text-[10px] text-[#858585] text-right mt-1 font-mono">
                {(metrics.memUsedMB / 1024).toFixed(1)} / {(metrics.memTotalMB / 1024).toFixed(1)} GB
              </div>
            ) : null}
          </div>
        </div>

        {/* Disk Card */}
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-[#858585] flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              根分区磁盘使用 (/)
            </span>
            <span className="text-xs font-bold font-mono text-white">
              {metrics?.diskUsage !== undefined ? `${metrics.diskUsage}%` : '--'}
            </span>
          </div>
          <div className="w-full bg-[#181818] h-2 rounded-full overflow-hidden border border-[#2b2b2b]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                (metrics?.diskUsage || 0) > 85 ? 'bg-red-500' : 'bg-purple-500'
              }`}
              style={{ width: `${metrics?.diskUsage || 0}%` }}
            />
          </div>
          {metrics?.diskTotalGB ? (
            <div className="flex justify-between items-center text-[10px] text-[#858585] mt-1 font-mono">
              <span>已用: {metrics.diskUsedGB} GB</span>
              <span>总量: {metrics.diskTotalGB} GB</span>
            </div>
          ) : null}
        </div>

        {/* Uptime & Timestamp Info */}
        <div className="bg-[#252526] border border-[#2b2b2b] rounded-md p-2.5 flex items-center justify-between text-xs text-[#858585]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#858585]" />
            <span className="text-[11px]">系统运行时间:</span>
          </div>
          <span className="text-[#cccccc] font-mono text-[11px]">{metrics?.uptimeStr || '未知'}</span>
        </div>
      </div>
    </div>
  );
};
