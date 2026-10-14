import { useI18n } from '../../i18n/I18nContext';
import React from 'react';
import { Sparkles, X, Clock, Lightbulb } from 'lucide-react';

interface TerminalStatusOverlaysProps {
  connecting: boolean;
  isLocal?: boolean;
  reconnecting: boolean;
  retryCount: number;
  countdown: number | null;
  errorMsg: string | null;
  onRetrySSH: () => void;
  pacingProgress?: {
    isActive: boolean;
    currentLine: number;
    totalLines: number;
    currentChar: number;
    totalChars: number;
  } | null;
  onAbortPacing?: () => void;
  ghostSuggestion: string | null;
  currentInputBuffer: string;
  isActive: boolean;
  detectedError: { errorText: string; lastCmd: string } | null;
  onTriggerAIDiagnose?: (errorText: string, lastCmd: string) => void;
  onClearDetectedError: () => void;
  showCommandDuration?: boolean;
  commandDurationInfo: { duration: string; timestamp: string } | null;
  oscToast: string | null;
  showLiveHex: boolean;
  onCloseLiveHex: () => void;
  hexContent: string;
}

export const TerminalStatusOverlays: React.FC<TerminalStatusOverlaysProps> = ({
  connecting,
  isLocal,
  reconnecting,
  retryCount,
  countdown,
  errorMsg,
  onRetrySSH,
  pacingProgress,
  onAbortPacing,
  ghostSuggestion,
  currentInputBuffer,
  isActive,
  detectedError,
  onTriggerAIDiagnose,
  onClearDetectedError,
  showCommandDuration,
  commandDurationInfo,
  oscToast,
  showLiveHex,
  onCloseLiveHex,
  hexContent,
}) => {
  const { t } = useI18n();
  return (
    <>
      {/* 正在连接遮罩 */}
      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs text-[#0078d4] z-30">
          <div className="flex flex-col items-center space-y-3 bg-[#252526] border border-[#2b2b2b] px-6 py-4 rounded-md shadow-2xl">
            <svg className="animate-spin h-8 w-8 text-[#0078d4]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs font-semibold text-[#cccccc] tracking-wider">
              {isLocal ? t('statusOverlay.connectingLocal') : t('statusOverlay.connectingSSH')}
            </span>
          </div>
        </div>
      )}

      {/* 正在重连遮罩 */}
      {reconnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs text-amber-400 z-30">
          <div className="flex flex-col items-center space-y-3 bg-[#252526] border border-amber-500/40 px-6 py-4 rounded-md shadow-2xl">
            <svg className="animate-spin h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs font-semibold text-[#cccccc] tracking-wide">
              {t('statusOverlay.reconnecting').replace('{retry}', String(retryCount))}
            </span>
            {countdown !== null && (
              <span className="text-xs text-amber-300/80">{t("statusOverlay.countdown").replace("{sec}", String(countdown))}</span>
            )}
          </div>
        </div>
      )}

      {/* 错误提示与重试卡片 */}
      {errorMsg && !reconnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs text-[#f48771] p-4 z-30">
          <div className="text-center max-w-sm space-y-3 bg-[#252526] border border-[#be1100]/40 p-5 rounded-md shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#f48771]">{t('statusOverlay.errorTitle')}</p>
            <p className="text-xs text-[#cccccc] font-mono bg-[#1e1e1e] p-2.5 rounded border border-[#3c3c3c] break-all">{errorMsg}</p>
            <button
              onClick={onRetrySSH}
              className="mt-2 px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] active:scale-[0.99] rounded text-xs font-medium text-white tracking-wide transition-all shadow-sm"
            >
              {t('statusOverlay.retryBtn')}
            </button>
          </div>
        </div>
      )}

      {/* 延时流控发送状态胶囊指示器 */}
      {pacingProgress?.isActive && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-40 bg-[#252526] border border-purple-500/40 text-[#cccccc] px-3.5 py-1.5 rounded-md shadow-2xl flex items-center space-x-3 text-xs animate-in fade-in zoom-in-95">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          <span className="font-semibold text-purple-300">{t("statusOverlay.pacingSending")}</span>
          <span className="font-mono text-[#3794ff]">
            {pacingProgress.currentLine} / {pacingProgress.totalLines} ({Math.round((pacingProgress.currentChar / Math.max(1, pacingProgress.totalChars)) * 100)}%)
          </span>
          {onAbortPacing && (
            <button
              onClick={onAbortPacing}
              className="px-2 py-0.5 rounded bg-[#5a1d1d] hover:bg-[#7a2828] text-white font-medium text-[11px] transition-colors shadow-sm"
            >
              {t('statusOverlay.stopSending')}
            </button>
          )}
        </div>
      )}

      {/* IntelliSense 智能补全幽灵提示气泡 */}
      {ghostSuggestion && isActive && (
        <div className="absolute bottom-10 right-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded bg-[#252526] border border-[#0078d4]/40 text-xs text-[#cccccc] shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <span className="text-[#858585]">{t("statusOverlay.aiAdvice")}</span>
          <span className="font-mono text-[#3794ff] font-medium">{currentInputBuffer}<span className="text-[#858585] font-normal">{ghostSuggestion}</span></span>
          <span className="ml-1 px-1.5 py-0.5 rounded bg-[#0078d4]/30 text-[#3794ff] border border-[#0078d4]/40 text-[10px] font-mono font-semibold">Tab / →</span>
        </div>
      )}

      {/* 💡 AI 智能诊断报错悬浮气泡 */}
      {detectedError && isActive && (
        <div
          onClick={() => {
            if (onTriggerAIDiagnose) {
              onTriggerAIDiagnose(detectedError.errorText, detectedError.lastCmd);
            }
            onClearDetectedError();
          }}
          className="absolute top-3 right-5 z-30 flex items-center gap-1.5 bg-[#252526] hover:bg-[#2a2d2e] border border-purple-500/50 shadow-xl px-3 py-1 rounded text-purple-200 text-xs font-medium cursor-pointer animate-in fade-in slide-in-from-top-2 duration-200 transition-all select-none"
          title={t('statusOverlay.aiDiagnoseTooltip')}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
          <span>{t('statusOverlay.aiDiagnose')}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearDetectedError();
            }}
            className="ml-1.5 p-0.5 rounded hover:bg-purple-800 text-purple-400 hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ⏱️ 命令执行耗时与时间戳微标注 */}
      {showCommandDuration && commandDurationInfo && isActive && (
        <div className="absolute bottom-2 right-4 z-20 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#252526] border border-[#2b2b2b] text-[10px] font-mono text-[#858585] shadow-sm animate-in fade-in duration-150">
          <Clock className="w-2.5 h-2.5 text-[#0078d4]" />
          <span className="text-[#cccccc] font-semibold">{commandDurationInfo.duration}</span>
          <span className="text-[#858585]">[{commandDurationInfo.timestamp}]</span>
        </div>
      )}

      {/* 📋 OSC 52 远程剪贴板同步极淡 Toast */}
      {oscToast && (
        <div className="absolute top-3 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded bg-[#252526] border border-[#2b2b2b] text-xs font-medium text-[#3794ff] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <span>{oscToast}</span>
        </div>
      )}

      {/* 实时十六进制数据流 (Live Hex) */}
      {showLiveHex && (
        <div className="w-80 h-full border-l border-[#2b2b2b] bg-[#181818] flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-200">
          <div className="px-4 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b] text-xs font-semibold text-[#cccccc] flex items-center justify-between">
            <span>{t('statusOverlay.liveHex')}</span>
            <button
              onClick={onCloseLiveHex}
              className="text-[#858585] hover:text-[#cccccc] p-1 rounded hover:bg-[#2a2d2e] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <pre className="text-[11px] font-mono text-[#cccccc] whitespace-pre-wrap word-break-all leading-snug">
              {hexContent}
            </pre>
          </div>
        </div>
      )}
    </>
  );
};
