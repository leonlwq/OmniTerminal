import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Zap, 
  Terminal, 
  FolderSync, 
  Activity, 
  Globe, 
  ShieldCheck, 
  RefreshCw, 
  X,
  Layers,
  Server
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { SessionMultiplexInfo } from '../../types';

interface MultiplexBadgeProps {
  sessionId: string;
  sessionName: string;
  isActive?: boolean;
  isLocal?: boolean;
  className?: string;
}

export const MultiplexBadge: React.FC<MultiplexBadgeProps> = ({
  sessionId,
  sessionName,
  isActive = true,
  isLocal = false,
  className = '',
}) => {
  const { t } = useI18n();
  const [info, setInfo] = useState<SessionMultiplexInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  const fetchMultiplexInfo = useCallback(async () => {
    if (!sessionId || isLocal) return;
    const getFn = (window as any).go?.app?.App?.GetSessionMultiplexInfo;
    if (!getFn) return;

    setLoading(true);
    try {
      const data: SessionMultiplexInfo = await getFn(sessionId);
      if (isMountedRef.current && data) {
        setInfo(data);
      }
    } catch {
      // 容错兜底
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionId, isLocal]);

  useEffect(() => {
    isMountedRef.current = true;
    if (isActive && !isLocal && sessionId) {
      fetchMultiplexInfo();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [sessionId, isActive, isLocal, fetchMultiplexInfo]);

  // 点击外部关闭弹窗
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

  // 本地终端会话无需展示多路复用胶囊
  if (isLocal || !sessionId) {
    return null;
  }

  const channelCount = info?.activeChannelsCount || 1;
  const isMulti = channelCount > 1;

  // 根据通道类型分配图标与色彩
  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'pty':
        return <Terminal className="w-3.5 h-3.5 text-sky-400" />;
      case 'sftp':
        return <FolderSync className="w-3.5 h-3.5 text-emerald-400" />;
      case 'telemetry':
        return <Activity className="w-3.5 h-3.5 text-amber-400" />;
      case 'tunnel':
        return <Globe className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative select-none font-sans ${className}`}>
      {/* 极简磨砂胶囊徽标 */}
      <button
        onClick={() => {
          setIsPopoverOpen(!isPopoverOpen);
          if (!isPopoverOpen) fetchMultiplexInfo();
        }}
        className={`group flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-mono transition-all duration-200 border shadow-lg backdrop-blur-md cursor-pointer ${
          isPopoverOpen
            ? 'bg-[#252526] border-amber-500 text-amber-300 shadow-amber-500/10'
            : isMulti
            ? 'bg-[#181818]/80 hover:bg-[#1f1f1f]/95 border-amber-500/30 hover:border-amber-500/60 text-amber-400 hover:text-amber-300'
            : 'bg-[#181818]/80 hover:bg-[#1f1f1f]/95 border-[#2e2e2e] hover:border-[#3c3c3c] text-[#cccccc] hover:text-white'
        }`}
        title={t('multiplex.title')}
      >
        <Zap className={`w-3 h-3 ${isMulti ? 'text-amber-400 animate-pulse' : 'text-zinc-400'}`} />
        <span>
          {isMulti
            ? t('multiplex.badge').replace('{count}', String(channelCount))
            : t('multiplex.singleConn')}
        </span>
      </button>

      {/* 展开的单通道多路复用全景卡片 */}
      {isPopoverOpen && (
        <div className="absolute top-9 right-0 w-[350px] bg-[#1e1e1e]/98 backdrop-blur-xl border border-[#3c3c3c] rounded-xl shadow-2xl p-3.5 z-40 animate-in fade-in zoom-in-95 duration-150 text-[#cccccc]">
          {/* 标题栏 */}
          <div className="flex items-center justify-between pb-2 border-b border-[#2b2b2b] mb-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-5 h-5 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Zap className="w-3 h-3" />
              </div>
              <span className="text-xs font-semibold text-white truncate">
                {t('multiplex.title')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchMultiplexInfo}
                disabled={loading}
                className="p-1 rounded hover:bg-[#2e2e2e] text-[#858585] hover:text-[#cccccc] transition-colors"
                title={t('multiplex.refresh')}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsPopoverOpen(false)}
                className="p-1 rounded hover:bg-[#2e2e2e] text-[#858585] hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 物理连接概览卡片 */}
          <div className="bg-[#141414]/80 p-2.5 rounded-lg border border-[#2b2b2b] mb-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#858585] flex items-center gap-1">
                <Server className="w-3 h-3 text-sky-400" />
                {t('multiplex.physicalConn')}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                1 TCP Socket
              </span>
            </div>
            <div className="text-[12px] font-mono text-white truncate">
              {info ? `${info.user}@${info.host}:${info.port}` : sessionName}
            </div>

            {info && info.estimatedRttSavedMs > 0 && (
              <div className="flex items-center justify-between text-[10px] text-[#9cdcfe] pt-1 border-t border-[#222]">
                <span>{t('multiplex.rttSaved')}</span>
                <span className="font-semibold text-emerald-400">~{info.estimatedRttSavedMs} ms</span>
              </div>
            )}
          </div>

          {/* 零感知安全无痕审计说明 */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-2 mb-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-emerald-300/90 leading-relaxed">
              {t('multiplex.stealthNote')}
            </div>
          </div>

          {/* 活跃复用通道列表 */}
          <div className="space-y-1 mb-2">
            <div className="text-[10px] font-semibold text-[#858585] uppercase tracking-wider mb-1.5">
              {t('multiplex.activeChannels')} ({info?.channelDetails?.length || channelCount})
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {info?.channelDetails && info.channelDetails.length > 0 ? (
                info.channelDetails.map((ch, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-[#252526]/60 border border-[#2e2e2e] hover:border-[#3c3c3c] text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded bg-[#181818] border border-[#333] shrink-0">
                        {getChannelIcon(ch.type)}
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-white truncate">{ch.name}</div>
                        <div className="text-[10px] text-[#858585] truncate">{ch.description}</div>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                      {ch.active ? 'Active' : 'Idle'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-3 text-xs text-[#858585]">
                  {t('multiplex.noMultiplex')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
