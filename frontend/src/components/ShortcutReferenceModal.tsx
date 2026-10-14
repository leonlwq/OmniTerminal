import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { X, Keyboard } from 'lucide-react';

interface ShortcutReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutReferenceModal({ isOpen, onClose }: ShortcutReferenceModalProps) {
  const { t } = useI18n();
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: t('shortcuts.groupTabs'),
      shortcuts: [
        { key: 'Ctrl+Tab / ⌘⇧] / ⌥⌘→', desc: t('shortcuts.nextTab') },
        { key: 'Ctrl+Shift+Tab / ⌘⇧[ / ⌥⌘←', desc: t('shortcuts.prevTab') },
        { key: 'Ctrl+1~9 / ⌘1~9 / Alt+1~9', desc: t('shortcuts.gotoTab') },
        { key: 'Ctrl+T / ⌘T', desc: t('shortcuts.newLocalTab') },
        { key: 'Ctrl+W / ⌘W', desc: t('shortcuts.closeTab') },
        { key: 'Ctrl+K / ⌘K', desc: t('shortcuts.quickCopilot') },
        { key: 'Ctrl+L / ⌘L', desc: t('shortcuts.toggleAiDrawer') }
      ]
    },
    {
      title: t('shortcuts.groupTerminal'),
      shortcuts: [
        { key: 'Ctrl+C / ⌘C', desc: t('shortcuts.smartCopy') },
        { key: 'Ctrl+V / ⌘V / ⇧Insert', desc: t('shortcuts.quickPaste') },
        { key: 'Ctrl+Shift+A / ⌘A', desc: t('shortcuts.selectAll') },
        { key: 'Ctrl+Shift+L / ⌘L', desc: t('shortcuts.clearBuffer') },
        { key: 'Ctrl+F / ⌘F', desc: t('shortcuts.findInTerm') },
        { key: 'Ctrl+Shift+F / ⌘⇧F', desc: t('shortcuts.liveFilter') },
        { key: 'Ctrl+= / ⌘+', desc: t('shortcuts.zoomIn') },
        { key: 'Ctrl+- / ⌘-', desc: t('shortcuts.zoomOut') },
        { key: 'Ctrl+0 / ⌘0', desc: t('shortcuts.zoomReset') },
        { key: 'Shift+PgUp / Shift+PgDn', desc: t('shortcuts.pageScroll') }
      ]
    },
    {
      title: t('shortcuts.groupWorkspace'),
      shortcuts: [
        { key: 'Ctrl+P / ⌘P', desc: t('shortcuts.cmdPalette') },
        { key: 'Ctrl+Shift+H / ⌘⇧H', desc: t('shortcuts.cmdHistory') },
        { key: 'Ctrl+N / ⌘N', desc: t('shortcuts.newSession') },
        { key: 'Ctrl+I / ⌘I', desc: t('shortcuts.importConfig') },
        { key: 'Ctrl+B / ⌘B', desc: t('shortcuts.toggleSidebar') },
        { key: 'Ctrl+, / ⌘, / Alt+O', desc: t('shortcuts.openSettings') },
        { key: 'Ctrl+Shift+P / ⌘⇧P', desc: t('shortcuts.toggleCompose') },
        { key: 'Ctrl+Shift+S / ⌘⇧S', desc: t('shortcuts.toggleSftp') },
        { key: 'Ctrl+Alt+F / ⌥⌘F', desc: t('shortcuts.globalSearch') },
        { key: 'Alt+B / ⌥⌘B', desc: t('shortcuts.toggleBroadcast') },
        { key: 'Ctrl+Shift+D / ⌘⇧D', desc: t('shortcuts.splitVertical') },
        { key: 'Ctrl+Shift+E / ⌘⇧E', desc: t('shortcuts.splitHorizontal') },
        { key: 'Ctrl+Shift+U / ⌘⇧U', desc: t('shortcuts.tunnelMonitor') },
        { key: 'Ctrl+Shift+M / ⌘⇧M', desc: t('shortcuts.hostMonitor') },
        { key: 'Ctrl+Shift+O / ⌘⇧O', desc: t('shortcuts.remoteOps') },
        { key: 'Ctrl+Shift+L / ⌘⇧L', desc: t('shortcuts.realtimeLog') },
        { key: 'F11 / ⌃⌘F', desc: t('shortcuts.fullscreen') },
        { key: 'Ctrl+/ / ⌘/ / F1', desc: t('shortcuts.openGuide') }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-[520px] flex flex-col text-[#cccccc] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">{t('shortcutRef.title')}</h2>
              <span className="text-[11px] text-[#858585] font-normal">Keyboard Shortcuts & Hotkeys</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#858585] hover:text-[#cccccc] rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 bg-[#1e1e1e] custom-scrollbar">
          {shortcutGroups.map((group, idx) => (
            <div key={idx} className="bg-[#252526] border border-[#2b2b2b] rounded p-3.5 space-y-2">
              <h3 className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0078d4]" />
                {group.title}
              </h3>
              <div className="space-y-1 pt-0.5">
                {group.shortcuts.map((shortcut, sIdx) => (
                  <div key={sIdx} className="flex justify-between items-center py-1 px-2 rounded hover:bg-[#2a2d2e] transition-colors">
                    <span className="text-xs text-[#cccccc] font-medium">{shortcut.desc}</span>
                    <kbd className="text-[11px] font-mono bg-[#181818] border border-[#3c3c3c] px-2 py-0.5 text-[#0078d4] rounded">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b]">
          <button 
            onClick={onClose} 
            className="px-3 py-1 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

