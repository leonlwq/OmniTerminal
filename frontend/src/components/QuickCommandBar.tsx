import { useI18n } from '../i18n/I18nContext';
import React from 'react';
import { models, app } from '../../wailsjs/go/models';

interface QuickCommandBarProps {
  settings: models.AppSettings;
  setSettings: (settings: models.AppSettings) => void;
  SaveSettings: (settings: models.AppSettings) => Promise<any>;
  renderCmdSetOptions: (parentId: string, depth: number) => React.ReactNode;
  activeCommands: { label: string; cmd: string }[];
  handleSendQuickCmd: (cmd: string) => void;
  activeTabId: string | null;
  isBroadcast: boolean;
  setIsBroadcast: (isBroadcast: boolean) => void;
  openTabsCount: number;
  quickCmd: string;
  setQuickCmd: (cmd: string) => void;
  isRecording: boolean;
  stopRecordingMacro: () => void;
  macroSeconds: number;
  formatMacroTime: (seconds: number) => string;
}

export function QuickCommandBar({
  settings,
  setSettings,
  SaveSettings,
  renderCmdSetOptions,
  activeCommands,
  handleSendQuickCmd,
  activeTabId,
  isBroadcast,
  setIsBroadcast,
  openTabsCount,
  quickCmd,
  setQuickCmd,
  isRecording,
  stopRecordingMacro,
  macroSeconds,
  formatMacroTime
}: QuickCommandBarProps) {
  const { t } = useI18n();
  return (
    <>
      {/* 快捷命令栏 (Quick Command Bar) */}
      <div className="flex items-center px-2 py-1 bg-app-surface border-t border-app-border shrink-0 overflow-x-auto scrollbar-none space-x-2">
        <select 
          value={settings.activeCommandSetID || ''}
          onChange={(e) => {
            const newSettings = new models.AppSettings({
              ...settings,
              activeCommandSetID: e.target.value
            });
            setSettings(newSettings);
            SaveSettings(newSettings).catch(() => {});
          }}
          className="px-1 py-0.5 bg-app-toolbar border border-app-border text-[10px] text-app-text font-medium rounded-none outline-none max-w-[150px] truncate"
        >
          <option value="">{t("quickCmd.noGroup")}</option>
          {renderCmdSetOptions('', 0)}
        </select>
        
        {activeCommands.length === 0 ? (
          <span className="text-[10px] text-app-text-muted italic px-2">{t("quickCmd.dblClickAdd")}</span>
        ) : (
          activeCommands.map((btn, idx) => (
            <button 
              key={idx}
              onClick={() => handleSendQuickCmd(btn.cmd)}
              disabled={!activeTabId && !isBroadcast}
              className="px-3 py-0.5 bg-app-toolbar hover:bg-app-hover border border-app-border hover:border-slate-500 disabled:opacity-40 text-[10px] text-app-text font-medium rounded-none shadow-sm transition-colors whitespace-nowrap"
              title={btn.cmd}
            >
              {btn.label}
            </button>
          ))
        )}
      </div>

      {/* 快速文本发送栏 (带广播控制) */}
      <div className="flex items-center px-2 py-1 bg-app-toolbar border-t border-app-border shrink-0 space-x-2">
        <div className="flex items-center space-x-1 shrink-0 bg-app-surface border border-app-border p-px">
          <button 
            onClick={() => setIsBroadcast(false)}
            className={`px-2 py-0.5 text-[10px] ${!isBroadcast ? 'bg-app-toolbar text-app-text' : 'text-app-text-muted hover:bg-app-hover'}`}
          >
            {t("quickCmd.currSession")}
          </button>
          <button 
            onClick={() => setIsBroadcast(true)}
            className={`px-2 py-0.5 text-[10px] ${isBroadcast ? 'bg-red-900/50 text-red-400' : 'text-app-text-muted hover:bg-app-hover'}`}
          >
            {t("quickCmd.allSessions")}
          </button>
        </div>
        
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder={
              isBroadcast 
                ? t("quickCmd.broadcasting").replace("{count}", String(openTabsCount)) 
                : (activeTabId ? t("quickCmd.inputSend") : t("quickCmd.noActiveTerm"))
            }
            value={quickCmd}
            onChange={(e) => setQuickCmd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendQuickCmd(quickCmd);
              }
            }}
            disabled={!activeTabId && !isBroadcast}
            className="w-full px-2 py-0.5 text-[11px] bg-app-input border border-app-border rounded-none focus:outline-none focus:border-blue-500/50 disabled:opacity-50 text-app-text font-mono"
          />
        </div>
      </div>

      {/* 宏管理控制条 */}
      {isRecording && (
        <div className="flex items-center justify-between px-2 py-1 bg-red-950/20 border-t border-app-border shrink-0">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-none bg-red-500 animate-ping shrink-0" />
            <span className="text-[10px] font-bold text-red-500 font-mono">REC {formatMacroTime(macroSeconds)}</span>
          </div>
          <button onClick={stopRecordingMacro} className="px-2 py-0.5 bg-red-900 hover:bg-red-800 text-[10px] text-white rounded">
            {t("quickCmd.stopRecord")}
          </button>
        </div>
      )}
    </>
  );
}
