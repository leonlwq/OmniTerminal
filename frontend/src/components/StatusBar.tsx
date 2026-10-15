import React, { useState, useEffect, useRef } from 'react';
import { 
  Circle, TerminalSquare, Play, Square, Film, 
  Activity, Globe, Maximize2, Link2, Check, ChevronUp, ChevronDown, Link, Sparkles
} from 'lucide-react';
import { app } from '../../wailsjs/go/models';
import { useI18n } from '../i18n/I18nContext';

interface StatusBarProps {
  activeTabId: string | null;
  activeTab?: app.SessionConfig | null;
  trafficSpeeds: { [id: string]: { rx: number; tx: number } };
  termDimensions: { [id: string]: { cols: number; rows: number } };
  isBroadcast: boolean;
  onToggleBroadcast?: () => void;
  isSyncScroll?: boolean;
  onToggleSyncScroll?: () => void;
  isRecording: boolean;
  startRecordingMacro: () => void;
  stopRecordingMacro?: () => void;
  onOpenCastPlayer?: () => void;
  selectedMacroId: string | null;
  playMacro: () => void;
  protocol?: string;
  encoding?: string;
  onUpdateEncoding?: (newEncoding: string) => void;
  onResizeTerminal?: (cols: number, rows: number) => void;
  isCommandBlockMode?: boolean;
  onToggleCommandBlockMode?: () => void;
}

export function StatusBar({
  activeTabId,
  activeTab,
  trafficSpeeds,
  termDimensions,
  isBroadcast,
  onToggleBroadcast,
  isSyncScroll = false,
  onToggleSyncScroll,
  isRecording,
  startRecordingMacro,
  stopRecordingMacro,
  onOpenCastPlayer,
  selectedMacroId,
  playMacro,
  protocol = 'ssh',
  encoding = 'utf-8',
  onUpdateEncoding,
  onResizeTerminal,
  isCommandBlockMode = false,
  onToggleCommandBlockMode,
}: StatusBarProps) {
  const { t } = useI18n();

  const ENCODINGS = [
    { label: t('statusbar.enc.utf8'), value: 'utf-8' },
    { label: t('statusbar.enc.gbk'), value: 'gbk' },
    { label: t('statusbar.enc.gb2312'), value: 'gb2312' },
    { label: t('statusbar.enc.big5'), value: 'big5' },
    { label: t('statusbar.enc.euckr'), value: 'euc-kr' },
    { label: t('statusbar.enc.shiftjis'), value: 'shift-jis' },
    { label: t('statusbar.enc.iso'), value: 'iso-8859-1' },
  ];

  const PRESET_DIMENSIONS = [
    { label: t('statusbar.size.vt100'), cols: 80, rows: 24 },
    { label: t('statusbar.size.wide'), cols: 120, rows: 36 },
    { label: t('statusbar.size.large'), cols: 160, rows: 48 },
    { label: t('statusbar.size.ultra'), cols: 200, rows: 60 },
  ];
  const [activePopover, setActivePopover] = useState<'encoding' | 'dimensions' | 'traffic' | 'pool' | null>(null);
  const [customCols, setCustomCols] = useState(80);
  const [customRows, setCustomRows] = useState(24);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [poolStats, setPoolStats] = useState<any[]>([]);

  const containerRef = useRef<HTMLElement>(null);

  // 轮询 SSH 连接池状态
  useEffect(() => {
    const fetchPool = async () => {
      try {
        const wailsApp = (window as any).go?.app?.App;
        if (wailsApp?.GetSSHPoolStats) {
          const stats = await wailsApp.GetSSHPoolStats();
          setPoolStats(stats || []);
        }
      } catch (_) {}
    };
    fetchPool();
    const timer = setInterval(fetchPool, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleClosePoolConn = async (key: string) => {
    try {
      const wailsApp = (window as any).go?.app?.App;
      if (wailsApp?.ClosePooledConnection) {
        await wailsApp.ClosePooledConnection(key);
        const stats = await wailsApp.GetSSHPoolStats();
        setPoolStats(stats || []);
      }
    } catch (_) {}
  };

  // 录像秒数计时器
  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      setRecordingSeconds(0);
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  // 点击外部关闭弹窗
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const currentDim = (activeTabId && termDimensions[activeTabId]) || { cols: 80, rows: 24 };
  const currentSpeed = (activeTabId && trafficSpeeds[activeTabId]) || { rx: 0, tx: 0 };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {activePopover && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActivePopover(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setActivePopover(null);
          }}
        />
      )}
      <footer 
        ref={containerRef}
        className="relative flex items-center justify-between px-3 h-6 bg-app-toolbar border-t border-app-border shrink-0 select-none text-[11px] text-[#858585] z-30"
      >
        {/* 左侧：就绪状态、协议 Badge、编码胶囊、网络流量胶囊、分辨率胶囊 */}
        <div className="flex items-center space-x-2.5">
          <span className="flex items-center space-x-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-app-text">{t('statusbar.ready') || '就绪'}</span>
          </span>

          {activeTabId && (
            <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/25 text-blue-400 font-mono text-[9px] rounded-full tracking-wide font-semibold shadow-sm">
              {protocol === 'serial' ? 'SERIAL' : (protocol === 'telnet' ? 'TELNET' : (protocol === 'rlogin' ? 'RLOGIN' : (protocol === 'mosh' ? 'MOSH (UDP)' : (protocol === 'raw_tcp' ? 'RAW TCP' : (protocol === 'local' ? 'LOCAL SHELL' : 'SSH2')))))}
            </span>
          )}

          {/* 1. 字符编码交互胶囊 */}
          {activeTabId && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePopover(activePopover === 'encoding' ? null : 'encoding');
                }}
                className="flex items-center space-x-1 px-2 py-0.5 rounded-md hover:bg-app-hover text-app-text transition-all uppercase font-mono text-[10px] border border-transparent hover:border-app-border active:scale-95"
                title={t('statusbar.encodingTip')}
              >
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>{encoding || 'UTF-8'}</span>
                <ChevronUp className="w-2.5 h-2.5 text-app-text-muted" />
              </button>

              {activePopover === 'encoding' && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-7 left-0 bg-app-surface/95 backdrop-blur-xl border border-app-border shadow-[0_12px_40px_rgba(0,0,0,0.3)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-black/5 dark:ring-white/10 rounded-2xl p-1.5 w-52 text-app-text z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold text-app-text-muted border-b border-app-border flex items-center justify-between">
                    <span>{t('statusbar.encodingTitle')}</span>
                    <span className="text-cyan-400 font-mono">{encoding.toUpperCase()}</span>
                  </div>
                <div className="py-1 max-h-48 overflow-y-auto space-y-0.5">
                  {ENCODINGS.map((enc) => (
                    <button
                      key={enc.value}
                      onClick={() => {
                        onUpdateEncoding?.(enc.value);
                        setActivePopover(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${
                        (encoding || 'utf-8').toLowerCase() === enc.value
                          ? 'bg-blue-600/20 text-blue-300 font-semibold'
                          : 'hover:bg-app-hover text-app-text'
                      }`}
                    >
                      <span>{enc.label}</span>
                      {(encoding || 'utf-8').toLowerCase() === enc.value && (
                        <Check className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. 实时网络流量诊断胶囊 */}
        {activeTabId && (
          <div className="relative border-l border-app-border pl-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePopover(activePopover === 'traffic' ? null : 'traffic');
              }}
              className="flex items-center space-x-2 px-2 py-0.5 rounded-md hover:bg-app-hover font-mono text-[10px] border border-transparent hover:border-app-border transition-all active:scale-95"
              title={t('statusbar.netDiagTip')}
            >
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400/90">↓ {(currentSpeed.rx / 1024).toFixed(1)} KB/s</span>
              <span className="text-blue-400/90">↑ {(currentSpeed.tx / 1024).toFixed(1)} KB/s</span>
            </button>

            {activePopover === 'traffic' && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-7 left-0 bg-app-surface/95 backdrop-blur-xl border border-app-border shadow-[0_12px_40px_rgba(0,0,0,0.3)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-black/5 dark:ring-white/10 rounded-2xl p-3 w-60 text-app-text z-50 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <div className="flex items-center justify-between border-b border-app-border pb-1.5">
                  <span className="font-semibold text-xs text-app-text flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    {t('statusbar.netDiag')}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
                </div>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-app-text-muted">{t('statusbar.downloadSpeed')}</span>
                    <span className="text-emerald-400 font-bold">{(currentSpeed.rx / 1024).toFixed(2)} KB/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-app-text-muted">{t('statusbar.uploadSpeed')}</span>
                    <span className="text-blue-400 font-bold">{(currentSpeed.tx / 1024).toFixed(2)} KB/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-app-text-muted">{t('statusbar.linkProto')}</span>
                    <span className="text-app-text uppercase">{protocol}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. 终端行列尺寸交互胶囊 */}
        {activeTabId && (
          <div className="relative border-l border-app-border pl-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCustomCols(currentDim.cols);
                setCustomRows(currentDim.rows);
                setActivePopover(activePopover === 'dimensions' ? null : 'dimensions');
              }}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-md hover:bg-app-hover font-mono text-[10px] text-app-text border border-transparent hover:border-app-border transition-all active:scale-95"
              title={t('statusbar.resizeTip')}
            >
              <Maximize2 className="w-3 h-3 text-purple-400" />
              <span>{currentDim.cols} × {currentDim.rows}</span>
            </button>

            {activePopover === 'dimensions' && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-7 left-0 bg-app-surface/95 backdrop-blur-xl border border-app-border shadow-[0_12px_40px_rgba(0,0,0,0.3)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.85)] ring-1 ring-black/5 dark:ring-white/10 rounded-2xl p-3 w-64 text-app-text z-50 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <div className="flex items-center justify-between border-b border-app-border pb-1.5">
                  <span className="font-semibold text-xs text-app-text flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                    {t('statusbar.adjustRes')}
                  </span>
                  <span className="text-[10px] text-app-text-muted font-mono">
                    {t('statusbar.currentSize')} {currentDim.cols}×{currentDim.rows}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-app-text-muted">{t('statusbar.presetSize')}</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESET_DIMENSIONS.map((dim) => (
                      <button
                        key={dim.label}
                        onClick={() => {
                          onResizeTerminal?.(dim.cols, dim.rows);
                          setActivePopover(null);
                        }}
                        className="px-2 py-1 bg-app-surface-secondary hover:bg-purple-600 hover:text-white rounded-lg text-[10px] font-mono transition-colors border border-app-border text-left"
                      >
                        {dim.cols} × {dim.rows}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-app-border">
                  <span className="text-[10px] text-app-text-muted">{t('statusbar.customSize')}</span>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="number"
                      value={customCols}
                      onChange={(e) => setCustomCols(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-app-input border border-app-border rounded-lg font-mono text-xs text-app-text outline-none focus:border-purple-500"
                      placeholder={t('statusbar.cols')}
                    />
                    <span className="text-app-text-muted">×</span>
                    <input 
                      type="number"
                      value={customRows}
                      onChange={(e) => setCustomRows(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-app-input border border-app-border rounded-lg font-mono text-xs text-app-text outline-none focus:border-purple-500"
                      placeholder={t('statusbar.rows')}
                    />
                    <button
                      onClick={() => {
                        onResizeTerminal?.(customCols, customRows);
                        setActivePopover(null);
                      }}
                      className="flex-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white rounded-lg font-medium text-xs transition-all active:scale-95"
                    >
                      {t('common.apply')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 右侧：同步滚动、广播模式、Asciinema 录像回放、交互宏 */}
      <div className="flex items-center space-x-2">
        {/* SSH 连接池复用指示器 */}
        {poolStats.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setActivePopover(activePopover === 'pool' ? null : 'pool')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-md transition-all active:scale-95 ${
                activePopover === 'pool'
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30'
                  : 'hover:bg-app-hover text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'
              }`}
              title={t('statusbar.poolTip')}
            >
              <Link className="w-3 h-3 text-emerald-400" />
              <span>
                {t('statusbar.reuseCount').replace('{count}', String(poolStats.reduce((acc, s) => acc + (s.refCount || 0), 0))).replace('{total}', String(poolStats.length))}
              </span>
            </button>

            {activePopover === 'pool' && (
              <div className="absolute bottom-8 right-0 w-84 bg-app-surface/95 backdrop-blur-xl border border-app-border rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.85)] ring-1 ring-black/5 dark:ring-white/10 p-3.5 z-50 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between border-b border-app-border pb-2 mb-2 font-semibold text-app-text">
                  <span className="flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-emerald-400" />
                    {t('statusbar.poolTitle')}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {t('statusbar.sessTcpCount').replace('{sess}', String(poolStats.reduce((acc, s) => acc + (s.refCount || 0), 0))).replace('{tcp}', String(poolStats.length))}
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {poolStats.map((stat, idx) => (
                    <div key={idx} className="bg-app-surface-secondary/70 p-2.5 rounded-xl border border-app-border space-y-1.5">
                      <div className="flex items-center justify-between text-app-text font-mono text-[11px]">
                        <span className="truncate max-w-[170px]" title={stat.key}>
                          {stat.user}@{stat.host}:{stat.port}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            stat.refCount > 0
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {stat.refCount > 0 
                            ? `${stat.activeChannelsCount || stat.refCount} ${t('multiplex.channels')}` 
                            : t('statusbar.idleSecs').replace('{sec}', String(stat.idleSeconds))}
                        </span>
                      </div>
                      {stat.channelsBreakdown && (
                        <div className="flex items-center gap-2 text-[10px] text-app-text-muted font-mono bg-[#141414]/60 px-2 py-0.5 rounded">
                          <span className="text-sky-400">PTY: {stat.channelsBreakdown.pty || 0}</span>
                          <span className="text-emerald-400">SFTP: {stat.channelsBreakdown.sftp || 0}</span>
                          <span className="text-amber-400">Tel: {stat.channelsBreakdown.telemetry || 0}</span>
                          {stat.channelsBreakdown.tunnel ? <span className="text-purple-400">Tun: {stat.channelsBreakdown.tunnel}</span> : null}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-app-text-muted pt-0.5">
                        <span>{t('statusbar.activeSince').replace('{time}', stat.activeSince)}</span>
                        <button
                          onClick={() => handleClosePoolConn(stat.key)}
                          className="text-rose-400 hover:text-rose-300 hover:underline"
                        >
                          {t('common.disconnect')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {poolStats.length > 0 && <div className="h-3 w-px bg-app-border" />}

        {/* 分屏同步滚动开关 */}
        <button
          onClick={onToggleSyncScroll}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-md transition-all active:scale-95 ${
            isSyncScroll 
              ? 'bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30 shadow-sm' 
              : 'hover:bg-app-hover text-app-text-muted hover:text-app-text'
          }`}
          title={t('statusbar.syncScrollTooltip') || "多终端分屏同步滚动"}
        >
          <Link2 className={`w-3 h-3 ${isSyncScroll ? 'text-blue-400' : 'text-app-text-muted'}`} />
          <span>{isSyncScroll ? (t('statusbar.syncScrollOn') || '🔗 同步滚动: 开') : (t('statusbar.syncScroll') || '同步滚动')}</span>
        </button>

        <div className="h-3 w-px bg-app-border" />

        {/* 🧬 Warp 结构化命令块模式开关 */}
        <button
          onClick={onToggleCommandBlockMode}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-md transition-all active:scale-95 ${
            isCommandBlockMode 
              ? 'bg-blue-500/25 text-blue-400 font-semibold border border-blue-500/40 shadow-sm' 
              : 'hover:bg-app-hover text-app-text-muted hover:text-app-text'
          }`}
          title={t('statusbar.commandBlockTooltip') || "切换 Warp 结构化命令块交互模式 (⌘⇧B / Ctrl+Shift+B)"}
        >
          <Sparkles className={`w-3 h-3 ${isCommandBlockMode ? 'text-blue-400' : 'text-app-text-muted'}`} />
          <span>{isCommandBlockMode ? (t('statusbar.commandBlockOn') || '🧬 命令块: 开') : (t('statusbar.commandBlock') || '命令块')}</span>
        </button>

        <div className="h-3 w-px bg-app-border" />

        {/* 广播模式 */}
        <button
          onClick={onToggleBroadcast}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-md transition-all active:scale-95 ${
            isBroadcast ? 'bg-amber-500/20 text-amber-500 font-medium border border-amber-500/30 shadow-sm' : 'text-app-text-muted hover:text-app-text hover:bg-app-hover'
          }`}
          title={t('statusbar.broadcastTooltip') || "多终端输入广播模式"}
        >
          <TerminalSquare className="w-3 h-3 text-amber-500" />
          <span>{isBroadcast ? (t('statusbar.broadcast') || '📡 广播模式') : (t('statusbar.singleSend') || 'Single Tab')}</span>
        </button>

        <div className="h-3 w-px bg-app-border" />

        {/* Asciinema 终端录像与回放器 */}
        {isRecording ? (
          <button
            onClick={stopRecordingMacro}
            className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-600/25 text-rose-500 border border-rose-500/40 font-semibold animate-pulse transition-all hover:bg-rose-600 hover:text-white active:scale-95 shadow-sm"
            title={t('statusbar.stopRecordingTooltip')}
          >
            <Square className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span>{(t('statusbar.recording') || '录制中')} {formatSec(recordingSeconds)}</span>
          </button>
        ) : (
          <div className="flex items-center space-x-1">
            <button
              onClick={startRecordingMacro}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-md hover:bg-app-hover text-app-text-muted hover:text-rose-500 transition-all active:scale-95"
              title={t('statusbar.recordSessionTooltip')}
            >
              <Circle className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
              <span>{t('statusbar.record') || '录像'}</span>
            </button>
            <button
              onClick={onOpenCastPlayer}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-md hover:bg-app-hover text-app-text-muted hover:text-purple-500 transition-all active:scale-95"
              title={t('statusbar.openCastPlayerTooltip')}
            >
              <Film className="w-3 h-3 text-purple-400" />
              <span>{t('statusbar.player') || '播放器'}</span>
            </button>
          </div>
        )}

        <div className="h-3 w-px bg-app-border" />

        {selectedMacroId && !isRecording && (
          <button
            className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 font-medium transition-all active:scale-95"
            onClick={playMacro}
          >
            <Play className="w-3 h-3" />
            <span>{t('statusbar.replayMacro')}</span>
          </button>
        )}
      </div>
    </footer>
    </>
  );
}
