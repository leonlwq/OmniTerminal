import React from 'react';
import { Search, ChevronRight, Columns, Lock, X, Terminal as TermIcon, Activity, RefreshCw, ArrowLeftRight, FolderPlus, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { app } from '../../wailsjs/go/models';
import { SessionTree } from './SessionTree';
import { HostStatusResult, ProbeFeedback } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface SessionSidebarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  draggedSessionId: string | null;
  setDraggedSessionId: (id: string | null) => void;
  sessions: app.SessionConfig[];
  SaveSession: (config: app.SessionConfig) => Promise<any>;
  loadSessions: () => void;
  treeData?: any[];
  renderTreeNode?: (node: any) => React.ReactNode;
  openTabs: app.SessionConfig[];
  setOpenTabs: (tabs: app.SessionConfig[]) => void;
  lockedTabs: string[];
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  secondaryTabId: string | null;
  setSecondaryTabId: (id: string | null) => void;
  splitMode: 'none' | 'vertical' | 'horizontal' | 'grid2x2' | 'grid1plus2';
  openSftpTabs: string[];
  setOpenSftpTabs: (tabs: string[]) => void;
  tabStatus: { [id: string]: string };
  handleCloseTab: (id: string, e?: React.MouseEvent) => void;
  onProbeReachability?: () => void;
  isProbingReachability?: boolean;
  probeFeedback?: ProbeFeedback | null;
  clearProbeFeedback?: () => void;
  onExpandAll?: () => void;
  dockSide?: 'left' | 'right';
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
  onToggleSide?: () => void;
  onContextMenuBlank?: (e: React.MouseEvent) => void;
  onNewSession?: () => void;
  onNewFolder?: () => void;
  // Direct tree props
  expandedFolders?: string[];
  toggleFolder?: (id: string, e?: React.MouseEvent) => void;
  selectedSessionIds?: string[];
  setSelectedSessionIds?: (ids: string[]) => void;
  handleSessionNodeClick?: (config: app.SessionConfig, e: React.MouseEvent) => void;
  handleConnect?: (session: app.SessionConfig) => void;
  handleSessionContextMenu?: (e: React.MouseEvent, session: app.SessionConfig) => void;
  handleSessionDrop?: (targetFolderId: string) => void;
  resetSessionFormData?: (parentId?: string) => void;
  resetFolderFormData?: (parentId?: string) => void;
  setModalMode?: (mode: 'create' | 'edit') => void;
  setIsModalOpen?: (open: boolean) => void;
  handleEditSession?: (session: app.SessionConfig, e?: React.MouseEvent) => void;
  handleDeleteSession?: (sessionId: string, e?: React.MouseEvent) => void;
  hostReachabilityMap?: Record<string, HostStatusResult>;
  getColorLabelClass?: (colorStr: string | undefined, isConnected: boolean) => string;
  customTabNames?: { [id: string]: string };
  handleDuplicateTab?: (tab: app.SessionConfig) => void;
}

export function SessionSidebar({
  searchQuery,
  setSearchQuery,
  draggedSessionId,
  setDraggedSessionId,
  sessions,
  SaveSession,
  loadSessions,
  treeData,
  renderTreeNode,
  openTabs,
  setOpenTabs,
  lockedTabs,
  activeTabId,
  setActiveTabId,
  secondaryTabId,
  setSecondaryTabId,
  splitMode,
  openSftpTabs,
  setOpenSftpTabs,
  tabStatus,
  handleCloseTab,
  handleDuplicateTab,
  onProbeReachability,
  isProbingReachability,
  probeFeedback,
  clearProbeFeedback,
  onExpandAll,
  dockSide = 'left',
  sidebarWidth,
  onSidebarWidthChange,
  onToggleSide,
  onContextMenuBlank,
  onNewSession,
  onNewFolder,
  expandedFolders,
  toggleFolder,
  selectedSessionIds,
  setSelectedSessionIds,
  handleSessionNodeClick,
  handleConnect,
  handleSessionContextMenu,
  handleSessionDrop,
  resetSessionFormData,
  resetFolderFormData,
  setModalMode,
  setIsModalOpen,
  handleEditSession,
  handleDeleteSession,
  hostReachabilityMap,
  getColorLabelClass,
  customTabNames = {},
}: SessionSidebarProps) {
  const { t } = useI18n();

  // 侧栏宽度可调节（支持 LocalStorage 持久化与左右停靠自由伸缩）
  const [internalWidth, setInternalWidth] = React.useState<number>(() => {
    try {
      const saved = localStorage.getItem('omniterminal_sidebar_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 800) {
          return parsed;
        }
      }
    } catch (_) {}
    return 272; // 默认 272px (w-68)
  });

  const width = sidebarWidth ?? internalWidth;
  const setWidth = React.useCallback((newWidth: number) => {
    setInternalWidth(newWidth);
    onSidebarWidthChange?.(newWidth);
  }, [onSidebarWidthChange]);

  const [isDragging, setIsDragging] = React.useState(false);
  const isDraggingRef = React.useRef(false);
  const widthRef = React.useRef(width);
  widthRef.current = width;

  // 组件卸载时安全重置拖拽状态与鼠标样式
  React.useEffect(() => {
    return () => {
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  // 左右拖拽调整宽度
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    setIsDragging(true);

    const startX = e.clientX;
    const startWidth = widthRef.current;

    // 拖拽期间全局禁用文字选区与修改鼠标样式
    const origUserSelect = document.body.style.userSelect;
    const origCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = (dockSide === 'left')
        ? moveEvent.clientX - startX
        : startX - moveEvent.clientX;
      const minW = 180;
      const maxW = Math.max(minW, Math.min(Math.floor(window.innerWidth * 0.6), 750));
      const nextWidth = Math.max(minW, Math.min(maxW, startWidth + delta));
      setWidth(nextWidth);
    };

    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      document.body.style.userSelect = origUserSelect || '';
      document.body.style.cursor = origCursor || '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp, true);
      window.removeEventListener('blur', onMouseUp);
      try {
        localStorage.setItem('omniterminal_sidebar_width', widthRef.current.toString());
      } catch (_) {}
    };

    // 使用捕获阶段 (capture: true) 避免因 iframe/xterm 内部 stopPropagation 导致 mouseup 丢失
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('blur', onMouseUp);
  }, [dockSide, setWidth]);

  // 双击把手恢复默认宽度 272px
  const handleDoubleClickReset = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWidth(272);
    try {
      localStorage.setItem('omniterminal_sidebar_width', '272');
    } catch (_) {}
  }, [setWidth]);

  const availableTags = React.useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.tags && Array.isArray(s.tags)) {
        s.tags.forEach(t => t && set.add(t));
      }
      if (s.colorLabel) {
        set.add(s.colorLabel);
      }
    });
    return Array.from(set);
  }, [sessions]);

  return (
    <aside
      style={{ width: `${width}px` }}
      className={`relative bg-app-surface ${dockSide === 'left' ? 'border-r' : 'border-l'} border-app-border flex flex-col shrink-0 select-none`}
    >
      {/* 左右拖拽调整宽度把手 (Draggable Resizer Handle) */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClickReset}
        className={`absolute top-0 bottom-0 ${
          dockSide === 'left' ? '-right-1' : '-left-1'
        } w-2 z-20 group cursor-col-resize flex items-center justify-center select-none`}
        title={t('sidebar.dragResizeTooltip', '拖拽调整侧栏宽度，双击恢复默认')}
      >
        <div
          className={`h-full w-[2px] transition-colors duration-150 ${
            isDragging
              ? 'bg-[#0078d4]'
              : 'group-hover:bg-[#0078d4]/40'
          }`}
        />
      </div>
      {/* 搜索栏区 - VS Code 侧栏搜索框风格 */}
      <div className="p-2 border-b border-app-border flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-app-text-muted" />
          <input 
            type="text" 
            placeholder={t('sidebar.searchPlaceholder') || "搜索会话 (支持标签、IP...)"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            className="w-full pl-8.5 pr-3 py-1.5 text-[12.5px] bg-app-input hover:bg-app-hover/50 border border-app-border hover:border-app-border-subtle rounded-lg focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent text-app-text transition-all placeholder:text-app-text-muted"
            title="支持普通搜索与高级语法: tag:标签名, ip:主机, port:端口, user:用户, proto:协议"
          />
        </div>
        {onToggleSide && (
          <button
            type="button"
            onClick={onToggleSide}
            className="p-1.5 text-app-text-muted hover:text-app-text hover:bg-app-hover rounded transition-colors active:scale-95"
            title={dockSide === 'left' ? "停靠至右侧 (Dock Right)" : "停靠至左侧 (Dock Left)"}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 快捷标签过滤胶囊 */}
      {availableTags.length > 0 && (
        <div className="px-2 py-1 bg-app-surface/90 border-b border-app-border flex items-center gap-1 overflow-x-auto scrollbar-none text-[10px]">
          <button
            onClick={() => setSearchQuery('')}
            className={`px-2 py-0.5 rounded-full transition-all shrink-0 font-medium ${
              !searchQuery
                ? 'bg-blue-600 text-white'
                : 'bg-app-input text-app-text-muted hover:text-app-text border border-app-border'
            }`}
          >
            {t('sidebar.allTags') || '全部'}
          </button>
          {availableTags.map(tag => {
            const isSelected = searchQuery === `tag:${tag}` || searchQuery === tag;
            return (
              <button
                key={tag}
                onClick={() => setSearchQuery(isSelected ? '' : `tag:${tag}`)}
                className={`px-2 py-0.5 rounded-full transition-all shrink-0 font-medium flex items-center gap-1 ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-app-input text-app-text-muted hover:text-app-text border border-app-border'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>{tag}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 会话树区 */}
      <div 
        onContextMenu={(e) => {
          // If right clicking on tree background (not captured by child nodes)
          onContextMenuBlank?.(e);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedSessionId) {
            const draggedConfig = sessions.find(s => s.id === draggedSessionId);
            if (draggedConfig && draggedConfig.parentId !== '') {
              const updated = new app.SessionConfig({
                ...draggedConfig,
                parentId: ''
              });
              SaveSession(updated)
                .then(() => loadSessions())
                .catch(() => {});
            }
            setDraggedSessionId(null);
          }
        }}
        className="flex-1 overflow-y-auto p-2 space-y-1"
      >
        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-app-text-muted uppercase tracking-wider select-none gap-1">
          <div className="flex items-center space-x-1.5 shrink-0 whitespace-nowrap min-w-0">
            <span className="truncate">{t('sidebar.sessionNav') || '会话导航'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-app-surface border border-app-border rounded text-app-text-muted shrink-0">
              {sessions.filter(s => !s.isFolder).length}
            </span>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {onNewFolder && (
              <button
                type="button"
                onClick={onNewFolder}
                className="p-1 text-app-text-muted hover:text-app-text hover:bg-app-hover rounded transition-colors active:scale-95"
                title={t('sidebar.newFolderTooltip') || "新建分类目录"}
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            )}
            {onProbeReachability && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onProbeReachability();
                }}
                disabled={isProbingReachability}
                className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 bg-app-surface hover:bg-app-hover text-app-accent border border-app-border rounded transition-colors active:scale-95 disabled:opacity-60 cursor-pointer"
                title={t('sidebar.probeTooltip') || "一键探测所有主机的在线连通性与网络延迟"}
              >
                <Activity className={`w-3 h-3 ${isProbingReachability ? 'animate-spin text-app-accent' : ''}`} />
                <span>{isProbingReachability ? (t('sidebar.probing') || '探测中') : (t('sidebar.probe') || '探测')}</span>
              </button>
            )}
          </div>
        </div>

        {/* 探测完成状态轻量通知条 */}
        {probeFeedback && (
          <div className={`mx-1 my-1 px-2.5 py-1.5 rounded-md text-[11px] flex items-center justify-between border shadow-sm transition-all animate-fade-in ${
            probeFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : probeFeedback.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : probeFeedback.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-app-surface border-app-border text-app-text-muted'
          }`}>
            <div className="flex items-center gap-1.5 truncate">
              {probeFeedback.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
              {probeFeedback.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
              {probeFeedback.type === 'error' && <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />}
              {probeFeedback.type === 'info' && <Info className="w-3.5 h-3.5 shrink-0 text-blue-400" />}
              <span className="truncate">{probeFeedback.message}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              {onExpandAll && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpandAll();
                  }}
                  className="text-[10px] text-app-accent hover:underline px-1 py-0.5 rounded hover:bg-app-hover cursor-pointer"
                  title={t('sessionTreeContext.expandAll') || '展开全部目录'}
                >
                  {t('sidebar.expandAll') || '展开全部'}
                </button>
              )}
              {clearProbeFeedback && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearProbeFeedback();
                  }}
                  className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-app-hover transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
        
        {treeData && renderTreeNode ? (
          treeData.length === 0 ? (
            <div 
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenuBlank?.(e);
              }}
              className="p-8 text-center text-xs text-app-text-muted cursor-pointer hover:text-slate-300"
              onClick={onNewFolder}
            >
              <FolderPlus className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <span>暂无会话或目录</span>
              <div className="text-[10px] text-slate-500 mt-1">右键或点击此处快速创建目录</div>
            </div>
          ) : (
            treeData.map(node => renderTreeNode(node))
          )
        ) : (
          <SessionTree
            sessions={sessions}
            searchQuery={searchQuery}
            expandedFolders={expandedFolders || []}
            toggleFolder={toggleFolder || (() => {})}
            selectedSessionIds={selectedSessionIds || []}
            setSelectedSessionIds={setSelectedSessionIds || (() => {})}
            handleSessionNodeClick={handleSessionNodeClick || (() => {})}
            handleConnect={handleConnect || (() => {})}
            handleSessionContextMenu={handleSessionContextMenu || (() => {})}
            setDraggedSessionId={setDraggedSessionId}
            handleSessionDrop={handleSessionDrop || (() => {})}
            resetSessionFormData={resetSessionFormData || (() => {})}
            resetFolderFormData={resetFolderFormData || (() => {})}
            setModalMode={setModalMode || (() => {})}
            setIsModalOpen={setIsModalOpen || (() => {})}
            handleEditSession={handleEditSession || (() => {})}
            handleDeleteSession={handleDeleteSession || (() => {})}
            openTabs={openTabs}
            activeTabId={activeTabId}
            hostReachabilityMap={hostReachabilityMap || {}}
            getColorLabelClass={getColorLabelClass || (() => '')}
            onContextMenuBlank={onContextMenuBlank}
            onNewFolder={onNewFolder}
          />
        )}
      </div>

      {/* Tab Manager (活动的会话列表) */}
      <div className="h-1/3 min-h-[140px] flex flex-col border-t border-app-border bg-app-bg/50">
        <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-app-border">
           <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-app-text-muted uppercase tracking-wider">
             <Columns className="h-3 w-3" />
             <span>{t('sidebar.activeTabs') || '活动标签'} ({openTabs.length})</span>
           </div>
           {openTabs.length > 0 && (
             <button 
               onClick={() => {
                  setOpenTabs(openTabs.filter(t => lockedTabs.includes(t.id)));
                  const remaining = openTabs.filter(t => lockedTabs.includes(t.id));
                  setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
                  setOpenSftpTabs(openSftpTabs.filter(id => remaining.some(r => r.id === id)));
               }}
               className="text-[10px] font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-0.5 rounded-full transition-colors active:scale-95"
               title={t('sidebar.closeAllTooltip') || "关闭所有未锁定的标签"}
             >
               {t('sidebar.closeAll') || '全部关闭'}
             </button>
           )}
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {openTabs.length === 0 ? (
            <div className="text-center text-[11px] text-app-text-muted/60 py-3">{t('sidebar.noActiveTabs') || '无活动的标签页'}</div>
          ) : (
            openTabs.map(tab => {
              let dotClass = 'bg-app-text-muted';
              if (tabStatus[tab.id] === 'connected') dotClass = 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]';
              else if (tabStatus[tab.id] === 'disconnected' || tabStatus[tab.id] === 'error') dotClass = 'bg-rose-500';
              else if (tabStatus[tab.id] === 'connecting' || tabStatus[tab.id] === 'reconnecting') dotClass = 'bg-amber-400 animate-pulse';

              const isActive = activeTabId === tab.id;

              return (
                <div 
                  key={tab.id}
                  onClick={() => {
                    if (splitMode !== 'none' && tab.id === secondaryTabId) {
                      setSecondaryTabId(activeTabId);
                      setActiveTabId(tab.id);
                    } else {
                      setActiveTabId(tab.id);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateTab?.(tab);
                  }}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all active:scale-[0.98] ${
                    isActive 
                      ? 'bg-blue-600/15 text-blue-400 font-medium ring-1 ring-blue-500/25 shadow-sm' 
                      : 'text-app-text hover:bg-app-hover'
                  }`}
                >
                   <div className="flex items-center space-x-2 truncate">
                     <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                     <span className={`text-xs truncate ${lockedTabs.includes(tab.id) ? 'italic' : ''}`} title={customTabNames[tab.id] || tab.name}>
                       {customTabNames[tab.id] || tab.name}
                     </span>
                     {lockedTabs.includes(tab.id) && <Lock className="h-2.5 w-2.5 shrink-0 text-app-text-muted" />}
                   </div>
                   <button 
                     onDoubleClick={(e) => e.stopPropagation()}
                     onClick={(e) => {
                       if (e) e.stopPropagation();
                       if (lockedTabs.includes(tab.id)) {
                         alert("该标签页已锁定，请先解锁！");
                         return;
                       }
                       handleCloseTab(tab.id);
                     }}
                     className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-full transition-all"
                   >
                     <X className="h-3 w-3" />
                   </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
