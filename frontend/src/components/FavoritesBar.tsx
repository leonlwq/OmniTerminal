import React from 'react';
import { Terminal as TermIcon } from 'lucide-react';
import { app } from '../../wailsjs/go/models';

export interface FavoritesBarProps {
  favoriteSessionIds?: string[];
  sessions: app.SessionConfig[];
  handleConnect: (sess: app.SessionConfig) => void;
  t: (key: any) => string;
}

export const FavoritesBar: React.FC<FavoritesBarProps> = ({
  favoriteSessionIds,
  sessions,
  handleConnect,
  t,
}) => {
  if (!favoriteSessionIds || favoriteSessionIds.length === 0) return null;

  const colorClassMap: Record<string, string> = {
    'red': 'bg-red-500', 'blue': 'bg-blue-500', 'green': 'bg-green-500',
    'yellow': 'bg-yellow-500', 'purple': 'bg-purple-500', 'cyan': 'bg-cyan-500',
    'pink': 'bg-pink-400', 'orange': 'bg-orange-500', 'indigo': 'bg-indigo-500',
    'teal': 'bg-teal-500', 'gray': 'bg-gray-500', '': 'bg-slate-500'
  };

  return (
    <div className="flex items-center px-2 py-1.5 bg-[#161e2d] border-b border-app-border shrink-0 overflow-x-auto custom-scrollbar space-x-2 shadow-inner">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center pr-2 border-r border-app-border/50 shrink-0">
        <TermIcon className="h-3 w-3 mr-1 opacity-70" />
        {t('nav.quick_launch')}
      </span>
      {favoriteSessionIds.map(fid => {
        const sess = sessions.find((s: any) => s.id === fid);
        if (!sess) return null;

        const labelClass = colorClassMap[sess.colorLabel] || 'bg-slate-500';

        return (
          <button
            key={fid}
            onClick={() => handleConnect(sess)}
            className="flex items-center space-x-1.5 px-2 py-0.5 bg-app-surface border border-transparent hover:border-app-border rounded-none flex-shrink-0 text-[11px] font-medium transition-all group shadow-none text-app-text hover:bg-app-hover"
            title={`${sess.user}@${sess.host}:${sess.port}`}
          >
            <div className={`w-2 h-2 ${labelClass} rounded-none group-hover:animate-pulse`} />
            <span className="truncate max-w-[120px]">{sess.name}</span>
          </button>
        );
      })}
    </div>
  );
};
