import { useI18n } from '../i18n/I18nContext';
import React from 'react';
import { app } from '../../wailsjs/go/models';

export interface DetachedWindowHeaderProps {
  isDetachedWindow: boolean;
  openTabs: app.SessionConfig[];
}

export const DetachedWindowHeader: React.FC<DetachedWindowHeaderProps> = ({
  isDetachedWindow,
  openTabs,
}) => {
  const { t } = useI18n();
  if (!isDetachedWindow) return null;

  return (
    <div className="bg-[#1e1e1e] border-b border-[#3e3e42] px-3 py-1.5 flex items-center justify-between text-xs text-slate-200 select-none">
      <div className="flex items-center space-x-2">
        <span className="text-blue-400 font-bold">{t('detached.title')}</span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-300 font-semibold">{openTabs[0]?.name || '会话加载中...'}</span>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => window.close()}
          className="px-2 py-0.5 bg-red-600/80 hover:bg-red-600 text-white rounded-none text-[11px]"
        >
          {t('detached.close')}
        </button>
      </div>
    </div>
  );
};
