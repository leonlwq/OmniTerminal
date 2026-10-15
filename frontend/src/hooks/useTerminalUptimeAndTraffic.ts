import { useState } from 'react';
import { ResizeSSH } from '../../wailsjs/go/app/App';
import { activeTerminals } from '../components/TerminalInstance';
import { app } from '../../wailsjs/go/models';

interface UseTerminalUptimeAndTrafficOptions {
  activeTabId: string | null;
  tabStatus: { [id: string]: string };
  setOpenTabs: React.Dispatch<React.SetStateAction<app.SessionConfig[]>>;
}

export function useTerminalUptimeAndTraffic({
  activeTabId,
  tabStatus,
  setOpenTabs,
}: UseTerminalUptimeAndTrafficOptions) {
  // 终端行列数实时追踪
  const [termDimensions, setTermDimensions] = useState<{ [id: string]: { cols: number; rows: number } }>({});
  // 会话在线时长追踪（惰性保持结构兼容，废除高频根组件轮询定时器）
  const [sessionUptimes, setSessionUptimes] = useState<{ [id: string]: number }>({});
  // 网络流量统计 (rx/tx bytes per second)
  const [trafficSpeeds, setTrafficSpeeds] = useState<{ [id: string]: { rx: number; tx: number } }>({});

  const formatUptime = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds < 0) return '00:00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [hrs, mins, secs].map(v => v.toString().padStart(2, '0')).join(':');
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec >= 1024 * 1024) {
      return (bytesPerSec / (1024 * 1024)).toFixed(2) + ' MB/s';
    } else if (bytesPerSec >= 1024) {
      return (bytesPerSec / 1024).toFixed(2) + ' KB/s';
    }
    return bytesPerSec.toFixed(0) + ' B/s';
  };

  // 状态栏交互式编码即时热切换
  const handleUpdateActiveTabEncoding = (newEnc: string) => {
    if (!activeTabId) return;
    setOpenTabs(prev => prev.map(t => t.id === activeTabId ? new app.SessionConfig({ ...t, encoding: newEnc }) : t));
  };

  // 状态栏交互式终端尺寸即时指定
  const handleResizeActiveTerminal = (cols: number, rows: number) => {
    if (!activeTabId) return;
    const term = activeTerminals[activeTabId];
    if (term) {
      term.resize(cols, rows);
      ResizeSSH(activeTabId, cols, rows).catch(() => {});
    }
  };

  return {
    termDimensions,
    setTermDimensions,
    sessionUptimes,
    setSessionUptimes,
    trafficSpeeds,
    setTrafficSpeeds,
    formatUptime,
    formatSpeed,
    handleUpdateActiveTabEncoding,
    handleResizeActiveTerminal,
  };
}
