import React from 'react';
import { ExternalLink, X, Radio } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface SharedTerminalViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export const SharedTerminalViewerModal: React.FC<SharedTerminalViewerModalProps> = ({
  isOpen,
  onClose,
  url
}) => {
  const { t } = useI18n();
  if (!isOpen || !url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] w-full max-w-5xl flex flex-col h-[85vh] overflow-hidden text-[#cccccc]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#2b2b2b] flex items-center justify-between bg-[#1f1f1f] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#89d185]">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e0e0e0]">{t('shareSession.viewerTitle')}</h3>
              <p className="text-xs text-[#858585] font-mono truncate max-w-lg">{url}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 px-3 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded text-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('shareSession.openExternal')}</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-[#858585] hover:text-[#e0e0e0] rounded hover:bg-[#333333] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Webview / Iframe container */}
        <div className="flex-1 bg-[#181818] overflow-hidden">
          <iframe
            src={url}
            title="Shared Terminal Stream"
            className="w-full h-full border-none"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </div>
  );
};
