import React from 'react';
import { Circle, Link, X, Plus, Terminal, Server, Folder, Monitor, Radio } from 'lucide-react';
import { app } from '../../wailsjs/go/models';

interface TabBarProps {
  openTabs: app.SessionConfig[];
  tabStatus: { [id: string]: string };
  currentActiveForPane: string | null;
  setActiveForPane: (id: string) => void;
  customTabNames: { [id: string]: string };
  linkedTabIds: string[];
  lockedTabs: string[];
  handleTabContextMenu: (e: React.MouseEvent, id: string) => void;
  setDraggedTabId: (id: string | null) => void;
  handleTabDrop: (id: string) => void;
  handleCloseTab: (id: string, e?: React.MouseEvent) => void;
  handleDetachTab?: (id: string) => void;
  resetSessionFormData: () => void;
  setModalMode: (mode: 'create' | 'edit') => void;
  setIsModalOpen: (isOpen: boolean) => void;
  handleTabAreaDoubleClick: (e: React.MouseEvent) => void;
  sharedSessionIds?: { [id: string]: { isSharing: boolean; viewerCount: number } };
  onOpenShareModal?: (sessionId: string) => void;
}

function getSessionIcon(t: app.SessionConfig) {
  const isLocal = Boolean(
    (t as any).isLocal || 
    t.protocol === 'local' || 
    t.name?.includes('本地 Shell') || 
    t.name === 'Local Shell'
  );
  if (isLocal) {
    return <Terminal className="w-4 h-4 text-sky-400 shrink-0" />;
  }
  if (t.protocol === 'sftp' || (t as any).sessionMode === 'sftp-only') {
    return <Folder className="w-4 h-4 text-amber-400 shrink-0" />;
  }
  if (t.protocol === 'rdp' || t.protocol === 'vnc') {
    return <Monitor className="w-4 h-4 text-purple-400 shrink-0" />;
  }
  if (t.protocol === 'telnet' || t.protocol === 'serial') {
    return <Radio className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  if (t.protocol === 'mosh') {
    return <span className="text-[13px] shrink-0" title="Mosh">🚀</span>;
  }
  if (t.protocol === 'rlogin') {
    return <span className="text-[13px] shrink-0" title="Rlogin">📟</span>;
  }
  // 默认 SSH
  return <Server className="w-4 h-4 text-blue-400 shrink-0" />;
}

export function TabBar({
  openTabs,
  tabStatus,
  currentActiveForPane,
  setActiveForPane,
  customTabNames,
  linkedTabIds,
  lockedTabs,
  handleTabContextMenu,
  setDraggedTabId,
  handleTabDrop,
  handleCloseTab,
  handleDetachTab,
  resetSessionFormData,
  setModalMode,
  setIsModalOpen,
  handleTabAreaDoubleClick,
  sharedSessionIds,
  onOpenShareModal,
}: TabBarProps) {
  return (
    <div 
      onDoubleClick={handleTabAreaDoubleClick}
      onDragOver={(e) => e.preventDefault()}
      className="flex items-center bg-app-surface border-b border-app-border px-0 overflow-x-auto scrollbar-none select-none shrink-0 min-h-[35px] h-[35px]"
    >
      {openTabs.map((t, index) => {
        const status = tabStatus[t.id] || 'connecting';
        let statusDotClass = 'bg-app-text-muted';
        if (status === 'connected') statusDotClass = 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]';
        else if (status === 'connecting' || status === 'reconnecting') statusDotClass = 'bg-amber-400 animate-pulse';
        else if (status === 'disconnected') statusDotClass = 'bg-rose-500';

        const isActive = currentActiveForPane === t.id;
        const rawName = customTabNames[t.id] || t.name;

        const isLocal = Boolean(
          (t as any).isLocal || 
          t.protocol === 'local' || 
          t.name?.includes('本地 Shell') || 
          t.name === 'Local Shell'
        );
        let displayName = rawName;
        if (isLocal && displayName.startsWith('💻')) {
          displayName = displayName.replace(/^💻\s*/, '');
        }

        return (
          <div 
            key={t.id}
            onClick={() => setActiveForPane(t.id)}
            onDoubleClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => handleTabContextMenu(e, t.id)}
            draggable={true}
            onDragStart={(e) => {
              if (e) e.stopPropagation();
              setDraggedTabId(t.id);
              e.dataTransfer.setData('text/plain', t.id);
            }}
            onDragEnd={(e) => {
              if (
                e.clientX < 0 || e.clientX > window.innerWidth ||
                e.clientY < 0 || e.clientY > window.innerHeight
              ) {
                handleDetachTab?.(t.id);
              }
              setDraggedTabId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (e) e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (e) e.stopPropagation();
              handleTabDrop(t.id);
            }}
            className={`group relative flex items-center gap-2 h-[35px] px-3.5 text-[13px] cursor-pointer transition-colors border-r border-app-border shrink-0 select-none ${
              isActive 
                ? 'bg-app-bg text-white font-medium' 
                : 'bg-transparent text-app-text-muted hover:text-app-text hover:bg-[#1f1f1f]'
            }`}
            title={`${rawName}${index < 9 ? ` (⌘${index + 1} / Ctrl+${index + 1})` : ''}`}
          >
            {/* 活动高亮指示 - VS Code 原生顶部湛蓝条 */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#0078d4]" />
            )}

            {/* 状态呼吸灯与颜色标签 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass}`} />
              {t.colorLabel && (
                <span 
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    t.colorLabel === 'red' ? 'bg-rose-500' :
                    t.colorLabel === 'orange' ? 'bg-orange-500' :
                    t.colorLabel === 'yellow' ? 'bg-amber-400' :
                    t.colorLabel === 'green' ? 'bg-emerald-400' :
                    t.colorLabel === 'cyan' ? 'bg-cyan-400' :
                    t.colorLabel === 'blue' ? 'bg-blue-500' :
                    t.colorLabel === 'purple' ? 'bg-purple-500' :
                    t.colorLabel === 'pink' ? 'bg-pink-400' : 'bg-slate-400'
                  }`}
                  title={`颜色标签: ${t.colorLabel}`}
                />
              )}
            </div>

            {/* 会话类型与协议图标 (VS Code 风格) */}
            {getSessionIcon(t)}

            <span className="truncate max-w-[160px] leading-tight font-medium">{displayName}</span>

            {linkedTabIds.includes(t.id) && (
              <span title="此会话已加入同步输入组">
                <Link className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              </span>
            )}

            {lockedTabs.includes(t.id) && (
              <span className="text-[11px] text-app-text-muted shrink-0">🔒</span>
            )}

            {sharedSessionIds && sharedSessionIds[t.id]?.isSharing && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenShareModal?.(t.id);
                }}
                className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono shrink-0 hover:bg-emerald-500/30 transition-colors"
                title={`此终端正在实时共享中 (${sharedSessionIds[t.id].viewerCount}人观看)，点击查看详情`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>📡 {sharedSessionIds[t.id].viewerCount}</span>
              </span>
            )}

            {/* 关闭按钮 - VS Code 原生紧凑小叉号 */}
            <button 
              onClick={(e) => handleCloseTab(t.id, e)}
              className={`w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 text-app-text-muted hover:text-white transition-all ml-1 active:scale-95 shrink-0 ${
                isActive ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-75 group-hover:hover:opacity-100'
              }`}
              title="关闭标签页"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {/* 新建标签按钮 - VS Code 平铺连贯微纽 */}
      <button 
        className="flex items-center justify-center h-[35px] w-9 text-app-text-muted hover:text-white hover:bg-[#1f1f1f] border-r border-app-border transition-colors active:scale-95 shrink-0"
        onClick={() => {
          resetSessionFormData();
          setModalMode('create');
          setIsModalOpen(true);
        }}
        title="新建会话标签"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
