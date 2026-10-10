import React from 'react';
import { app, models } from '../../wailsjs/go/models';

interface SessionTreeContextMenuProps {
  sessionContextMenu: { x: number; y: number; session: app.SessionConfig } | null;
  setSessionContextMenu: (menu: { x: number; y: number; session: app.SessionConfig } | null) => void;
  sidebarBlankContextMenu: { x: number; y: number } | null;
  setSidebarBlankContextMenu: (menu: { x: number; y: number } | null) => void;
  selectedSessionIds: string[];
  setSelectedSessionIds: (ids: string[]) => void;
  sessions: app.SessionConfig[];
  expandedFolders: string[];
  settings: models.AppSettings;
  t: (key: any) => string;
  handleConnect: (session: app.SessionConfig) => void;
  handleConnectFolder: (folderId: string) => void;
  handleCloneSessionConfig: (session: app.SessionConfig) => void;
  handleEditSession: (session: app.SessionConfig, e?: React.MouseEvent) => void;
  handleDeleteSession: (sessionId: string, e?: React.MouseEvent) => void;
  toggleFavoriteSession: (sessionId: string) => void;
  resetSessionFormData: (parentId?: string) => void;
  resetFolderFormData: (parentId?: string) => void;
  setModalMode: (mode: 'create' | 'edit') => void;
  setIsModalOpen: (open: boolean) => void;
  setIsBatchModalOpen: (open: boolean) => void;
  toggleFolder: (folderId: string) => void;
  handleExpandAllFolders: () => void;
  handleCollapseAllFolders: () => void;
  triggerBatchProbeReachability: () => void;
}

export const SessionTreeContextMenu: React.FC<SessionTreeContextMenuProps> = ({
  sessionContextMenu,
  setSessionContextMenu,
  sidebarBlankContextMenu,
  setSidebarBlankContextMenu,
  selectedSessionIds,
  setSelectedSessionIds,
  sessions,
  expandedFolders,
  settings,
  t,
  handleConnect,
  handleConnectFolder,
  handleCloneSessionConfig,
  handleEditSession,
  handleDeleteSession,
  toggleFavoriteSession,
  resetSessionFormData,
  resetFolderFormData,
  setModalMode,
  setIsModalOpen,
  setIsBatchModalOpen,
  toggleFolder,
  handleExpandAllFolders,
  handleCollapseAllFolders,
  triggerBatchProbeReachability,
}) => {
  return (
    <>
      {/* 会话管理器树节点右键菜单 (Xshell Style Session Context Menu) */}
      {sessionContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setSessionContextMenu(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSessionContextMenu(null);
            }}
          />
          <div
            className="fixed bg-app-surface border border-app-border rounded-none shadow-md py-1 z-50 w-44 text-[11px] text-app-text select-none animate-in fade-in zoom-in-95 duration-100 font-sans"
            style={{ top: `${sessionContextMenu.y}px`, left: `${sessionContextMenu.x}px` }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {selectedSessionIds.length > 1 && selectedSessionIds.includes(sessionContextMenu.session.id) ? (
              <>
                <div className="px-3 py-1 text-[10px] text-blue-400 font-bold border-b border-app-border">
                  已选中 {selectedSessionIds.length} 个会话
                </div>
                <button
                  onClick={() => {
                    const toConnect = sessions.filter((s: any) => selectedSessionIds.includes(s.id) && !s.isFolder);
                    toConnect.forEach((s: any) => handleConnect(s));
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors font-bold text-blue-400"
                >
                  ⚡ 批量连接 ({selectedSessionIds.length})
                </button>
                <button
                  onClick={() => {
                    setIsBatchModalOpen(true);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors font-bold text-yellow-400"
                >
                  📝 批量编辑属性...
                </button>
                <div className="h-px bg-[#2d2d30] mx-2 my-1" />
                <button
                  onClick={() => {
                    if (confirm(`确认批量删除选中的 ${selectedSessionIds.length} 个会话？`)) {
                      selectedSessionIds.forEach(id => handleDeleteSession(id));
                      setSelectedSessionIds([]);
                    }
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-red-400 transition-colors"
                >
                  ❌ 批量删除 ({selectedSessionIds.length})
                </button>
              </>
            ) : !sessionContextMenu.session.isFolder ? (
              <>
                <button
                  onClick={() => {
                    handleConnect(sessionContextMenu.session);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors"
                >
                  {t('menu.connect')}
                </button>
                <button
                  onClick={() => {
                    handleCloneSessionConfig(sessionContextMenu.session);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors"
                >
                  👥 克隆会话配置副本
                </button>
                <button
                  onClick={(e) => {
                    handleEditSession(sessionContextMenu.session, e);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors"
                >
                  ✏️ 修改会话属性...
                </button>
                <div className="h-px bg-[#2d2d30] mx-2 my-1" />
                <button
                  onClick={(e) => {
                    handleDeleteSession(sessionContextMenu.session.id, e);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-red-400 transition-colors"
                >
                  ❌ 删除此会话配置
                </button>
                <button
                  onClick={() => {
                    toggleFavoriteSession(sessionContextMenu.session.id);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors border-t border-app-border"
                >
                  {settings.favoriteSessionIds?.includes(sessionContextMenu.session.id) ? t('menu.unpin') : t('menu.pin')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    handleConnectFolder(sessionContextMenu.session.id);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors font-bold text-blue-400 flex items-center space-x-2"
                >
                  <span>⚡ 分组批量连接 (并发)</span>
                </button>
                <div className="h-px bg-app-border mx-2 my-1" />
                <button
                  onClick={() => {
                    resetSessionFormData(sessionContextMenu.session.id);
                    setModalMode('create');
                    setIsModalOpen(true);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors flex items-center space-x-2"
                >
                  <span>➕ 在此目录下新建会话...</span>
                </button>
                <button
                  onClick={() => {
                    resetFolderFormData(sessionContextMenu.session.id);
                    setModalMode('create');
                    setIsModalOpen(true);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors flex items-center space-x-2"
                >
                  <span>📁 在此目录下新建子目录...</span>
                </button>
                <button
                  onClick={() => {
                    toggleFolder(sessionContextMenu.session.id);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors flex items-center space-x-2"
                >
                  <span>{expandedFolders.includes(sessionContextMenu.session.id) ? '📂 折叠此目录' : '📂 展开此目录'}</span>
                </button>
                <div className="h-px bg-app-border mx-2 my-1" />
                <button
                  onClick={(e) => {
                    handleEditSession(sessionContextMenu.session, e);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors flex items-center space-x-2"
                >
                  <span>✏️ 重命名 / 级联模板...</span>
                </button>
                <button
                  onClick={(e) => {
                    handleDeleteSession(sessionContextMenu.session.id, e);
                    setSessionContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-red-400 transition-colors flex items-center space-x-2"
                >
                  <span>❌ 删除分类目录</span>
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* 会话导航空白区域右键菜单 (Session Sidebar Blank Area Context Menu) */}
      {sidebarBlankContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setSidebarBlankContextMenu(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSidebarBlankContextMenu(null);
            }}
          />
          <div
            className="fixed bg-app-surface border border-app-border rounded-lg shadow-2xl py-1 z-50 w-48 text-[11px] text-app-text select-none animate-in fade-in zoom-in-95 duration-100 font-sans backdrop-blur-md"
            style={{ top: `${sidebarBlankContextMenu.y}px`, left: `${sidebarBlankContextMenu.x}px` }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="px-3 py-1 text-[10px] text-app-text-muted font-semibold border-b border-app-border">
              会话导航操作
            </div>
            <button
              onClick={() => {
                resetSessionFormData('');
                setModalMode('create');
                setIsModalOpen(true);
                setSidebarBlankContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors flex items-center space-x-2"
            >
              <span>➕ 新建根会话...</span>
            </button>
            <button
              onClick={() => {
                resetFolderFormData('');
                setModalMode('create');
                setIsModalOpen(true);
                setSidebarBlankContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors flex items-center space-x-2"
            >
              <span>📁 新建根目录...</span>
            </button>
            <div className="h-px bg-app-border mx-2 my-1" />
            <button
              onClick={() => {
                handleExpandAllFolders();
                setSidebarBlankContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors flex items-center space-x-2"
            >
              <span>📂 展开所有目录</span>
            </button>
            <button
              onClick={() => {
                handleCollapseAllFolders();
                setSidebarBlankContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors flex items-center space-x-2"
            >
              <span>📁 折叠所有目录</span>
            </button>
            <div className="h-px bg-app-border mx-2 my-1" />
            <button
              onClick={() => {
                triggerBatchProbeReachability();
                setSidebarBlankContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-app-hover hover:text-white transition-colors flex items-center space-x-2"
            >
              <span>🔄 探测所有主机连通性</span>
            </button>
          </div>
        </>
      )}
    </>
  );
};
