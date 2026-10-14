import React from 'react';
import { X, Activity } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface TriggerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TriggerManagerModal({ isOpen, onClose }: TriggerManagerModalProps) {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-[500px] flex flex-col text-[#cccccc] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b]">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#cca700]">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">{t('trigger.title')}</h2>
              <span className="text-[11px] text-[#858585] font-normal">Terminal Event & Text Action Triggers</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#858585] hover:text-[#e0e0e0] rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 bg-[#1e1e1e] h-56">
          <div className="w-10 h-10 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#cca700] mb-1">
            <Activity className="w-5 h-5" />
          </div>
          <div className="text-xs text-[#e0e0e0] font-medium">
            {t('trigger.sessionLevel')}
          </div>
          <p className="text-[11px] text-[#858585] max-w-xs leading-relaxed">
            {t('trigger.desc')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b]">
          <button 
            onClick={onClose} 
            className="px-4 py-1.5 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

