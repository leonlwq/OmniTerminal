import { useI18n } from '../../i18n/I18nContext';
import React from 'react';

interface TimerConfig {
  active: boolean;
  cmd: string;
  interval: number;
}

interface TerminalTimerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  timerConfig: TimerConfig;
  setTimerConfig: (config: TimerConfig) => void;
}

export function TerminalTimerPopover({
  isOpen,
  onClose,
  timerConfig,
  setTimerConfig,
}: TerminalTimerPopoverProps) {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div className="absolute top-3 right-3 bg-[#252526] border border-[#2b2b2b] shadow-2xl rounded-md p-3 z-40 w-64 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#cccccc] tracking-wide flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${timerConfig.active ? 'bg-emerald-400 animate-pulse' : 'bg-[#858585]'}`}></span>
          <span>{t('timer.title')}</span>
        </span>
        <button 
          onClick={onClose}
          className="p-1 text-[#858585] hover:text-[#cccccc] rounded hover:bg-[#2a2d2e] transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="flex items-center space-x-2">
        <input 
          type="text"
          placeholder={t('timer.placeholder')}
          value={timerConfig.cmd}
          onChange={(e) => setTimerConfig({ ...timerConfig, cmd: e.target.value })}
          disabled={timerConfig.active}
          className="flex-1 px-2.5 py-1 text-xs bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded outline-none text-[#cccccc] disabled:opacity-50 placeholder-[#858585]"
        />
        <div className="flex items-center space-x-1 shrink-0">
          <input 
            type="number"
            min="1"
            value={timerConfig.interval}
            onChange={(e) => setTimerConfig({ ...timerConfig, interval: parseInt(e.target.value) || 1 })}
            disabled={timerConfig.active}
            className="w-12 px-2 py-1 text-xs bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded outline-none text-[#cccccc] disabled:opacity-50 text-center font-mono"
          />
          <span className="text-xs text-[#858585]">{t("timer.seconds")}</span>
        </div>
      </div>
      <button 
        onClick={() => setTimerConfig({ ...timerConfig, active: !timerConfig.active })}
        disabled={!timerConfig.cmd.trim()}
        className={`w-full py-1.5 text-xs font-medium rounded shadow-sm transition-all disabled:opacity-50 ${timerConfig.active ? 'bg-[#5a1d1d]/40 text-[#f48771] hover:bg-[#5a1d1d]/80 border border-[#be1100]/40' : 'bg-[#0078d4] text-white hover:bg-[#006cbe]'}`}
      >
        {timerConfig.active ? t('timer.stop') : t('timer.start')}
      </button>
    </div>
  );
}
