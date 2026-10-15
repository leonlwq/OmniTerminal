import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import appIcon from '../../assets/images/appicon.png';

export function SettingsAboutTab() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="w-full max-w-md bg-[#252526] border border-[#2b2b2b] rounded-lg p-8 text-center space-y-4 shadow-sm">
        <div className="flex justify-center mb-2 relative group">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full scale-90 pointer-events-none" />
          <img 
            src={appIcon} 
            alt="OmniTerminal Logo" 
            className="w-16 h-16 object-contain drop-shadow-[0_8px_24px_rgba(0,120,212,0.35)] relative z-10 select-none pointer-events-none hover:scale-105 transition-transform duration-200" 
          />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#e0e0e0] tracking-tight">OmniTerminal</h3>
          <div className="inline-block mt-2 px-2.5 py-0.5 bg-[#04395e] text-white border border-[#0078d4]/40 rounded text-[11px] font-mono font-medium">
            v1.2.0 Pro Edition
          </div>
        </div>
        <p className="text-xs text-[#858585] max-w-sm mx-auto leading-relaxed pt-1">
          {t('settings.about.desc') || '现代跨平台高性能 SSH / Telnet / 串口与 SFTP 终端工作台。'}
        </p>
        <div className="text-[11px] text-[#6e7681] pt-5 border-t border-[#2b2b2b] max-w-xs mx-auto">
          MIT License • Built with Security, Elegance and High Performance
        </div>
      </div>
    </div>
  );
}
