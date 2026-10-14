import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Columns, X, Send, Radio, Gauge, Clock, Zap, Loader2 } from 'lucide-react';
import { app } from '../../wailsjs/go/models';
import { WriteSSH } from '../../wailsjs/go/app/App';

interface ComposePaneProps {
  isComposeOpen: boolean;
  setIsComposeOpen: (open: boolean) => void;
  composeText: string;
  setComposeText: (text: string) => void;
  composeTargetTabs: string[];
  setComposeTargetTabs: (tabs: string[]) => void;
  openTabs: app.SessionConfig[];
  activeTabId: string | null;
  isBroadcast: boolean;
  handleSendQuickCmd: (cmd: string) => void;
  customTabNames?: { [id: string]: string };
}

export function ComposePane({
  isComposeOpen,
  setIsComposeOpen,
  composeText,
  setComposeText,
  composeTargetTabs,
  setComposeTargetTabs,
  openTabs,
  activeTabId,
  isBroadcast,
  handleSendQuickCmd,
  customTabNames = {},
}: ComposePaneProps) {
  const { t } = useI18n();
  const [enableFlowControl, setEnableFlowControl] = useState(false);
  const [charDelayMs, setCharDelayMs] = useState(5);
  const [lineDelayMs, setLineDelayMs] = useState(100);
  const [sending, setSending] = useState(false);

  if (!isComposeOpen) return null;

  const sendWithPacing = async (targetTabIds: string[], text: string) => {
    setSending(true);
    const encoder = new TextEncoder();
    const lines = text.split('\n');

    try {
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const isLastLine = lineIdx === lines.length - 1;
        const lineWithEnd = isLastLine ? line + '\n' : line + '\n';

        if (enableFlowControl && charDelayMs > 0) {
          for (let charIdx = 0; charIdx < lineWithEnd.length; charIdx++) {
            const char = lineWithEnd[charIdx];
            const bytes = encoder.encode(char);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64Str = window.btoa(binary);
            await Promise.all(targetTabIds.map((id) => WriteSSH(id, base64Str)));
            await new Promise((r) => setTimeout(r, charDelayMs));
          }
        } else {
          const bytes = encoder.encode(lineWithEnd);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Str = window.btoa(binary);
          await Promise.all(targetTabIds.map((id) => WriteSSH(id, base64Str)));
        }

        if (enableFlowControl && lineDelayMs > 0 && !isLastLine) {
          await new Promise((r) => setTimeout(r, lineDelayMs));
        }
      }
      setComposeText('');
    } catch (e) {
      console.error('Paced send failed:', e);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (composeTargetTabs.length > 0) {
      await sendWithPacing(composeTargetTabs, composeText);
    } else if (activeTabId) {
      await sendWithPacing([activeTabId], composeText);
    }
  };

  const handleBroadcast = async () => {
    if (openTabs.length === 0) return;
    const allIds = openTabs.map((t) => t.id);
    await sendWithPacing(allIds, composeText);
  };

  return (
    <div className="bg-[#1f1f1f] border-t border-[#2b2b2b] p-3 shrink-0 flex flex-col space-y-2 z-10 text-[#cccccc]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold text-[#cccccc] flex items-center space-x-2">
            <Columns className="h-3.5 w-3.5 text-[#0078d4]" />
            <span>{t('compose.title')}</span>
          </span>

          {/* SecureCRT 延时流控开关 */}
          <label className="flex items-center space-x-1.5 cursor-pointer bg-[#252526] px-2 py-0.5 rounded border border-[#2b2b2b] hover:border-[#3c3c3c] text-[11px] text-[#cccccc]">
            <input
              type="checkbox"
              checked={enableFlowControl}
              onChange={(e) => setEnableFlowControl(e.target.checked)}
              className="rounded accent-[#0078d4] w-3 h-3"
            />
            <span className="flex items-center gap-1 text-purple-300 font-medium">
              <Gauge className="w-3 h-3 text-purple-400" />
              {t('compose.flowControl')}
            </span>
          </label>

          {enableFlowControl && (
            <div className="flex items-center space-x-2 text-[10px] text-[#858585] font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-[#3794ff]" />
                {t('compose.charDelay')}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={charDelayMs}
                  onChange={(e) => setCharDelayMs(Math.max(0, Number(e.target.value)))}
                  className="w-8 px-1 py-0.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-[#3794ff] text-right outline-none"
                />
                ms
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                {t('compose.lineDelay')}
                <input
                  type="number"
                  min={0}
                  max={2000}
                  step={50}
                  value={lineDelayMs}
                  onChange={(e) => setLineDelayMs(Math.max(0, Number(e.target.value)))}
                  className="w-10 px-1 py-0.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-amber-300 text-right outline-none"
                />
                ms
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsComposeOpen(false)}
          className="text-[#858585] hover:text-[#cccccc] p-1 rounded hover:bg-[#2a2d2e] transition-colors"
          title={t('compose.hideTip')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col space-y-2">
        <div className="flex space-x-2">
          <textarea
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            placeholder={t('compose.placeholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !sending) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 h-16 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded p-2 text-xs text-[#cccccc] font-mono resize-none outline-none leading-relaxed placeholder-[#858585]"
          />
          <div className="flex flex-col space-y-2 justify-center shrink-0">
            <button
              onClick={handleSend}
              disabled={
                sending ||
                !composeText.trim() ||
                (!activeTabId && composeTargetTabs.length === 0 && !isBroadcast)
              }
              className="px-3.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] active:scale-[0.99] disabled:opacity-40 text-xs font-medium rounded text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              <span>
                {sending
                  ? t('compose.sending')
                  : composeTargetTabs.length > 0
                  ? `${t('compose.sendToTargets')} (${composeTargetTabs.length})`
                  : t('compose.sendToCurrent')}
              </span>
            </button>
            <button
              onClick={handleBroadcast}
              disabled={sending || !composeText.trim() || openTabs.length === 0}
              className="px-3.5 py-1.5 bg-[#5a1d1d]/40 hover:bg-[#5a1d1d]/80 border border-[#be1100]/40 active:scale-[0.99] disabled:opacity-40 text-xs font-medium rounded text-[#f48771] shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Radio className="w-3 h-3" />
              <span>{t('compose.broadcast')} ({openTabs.length})</span>
            </button>
          </div>
        </div>

        {openTabs.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="text-[11px] font-medium text-[#858585] shrink-0">{t('compose.targetLabel')}</span>
            <div className="flex items-center space-x-2">
              {openTabs.map((tab) => (
                <label
                  key={tab.id}
                  className="flex items-center space-x-1.5 text-xs text-[#cccccc] bg-[#252526] border border-[#2b2b2b] hover:border-[#3c3c3c] px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={composeTargetTabs.includes(tab.id)}
                    onChange={(e) => {
                      if (e.target.checked) setComposeTargetTabs([...composeTargetTabs, tab.id]);
                      else setComposeTargetTabs(composeTargetTabs.filter((id) => id !== tab.id));
                    }}
                    className="w-3.5 h-3.5 rounded border-[#3c3c3c] bg-[#1e1e1e] accent-[#0078d4]"
                  />
                  <span className="truncate max-w-[120px] font-medium" title={customTabNames[tab.id] || tab.name}>
                    {customTabNames[tab.id] || tab.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
