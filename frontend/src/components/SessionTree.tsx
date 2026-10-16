import { useI18n } from '../i18n/I18nContext';
import React from 'react';
import {
  ChevronDown, ChevronRight, Folder, FolderOpen,
  Server, Plus, FolderPlus, Edit, Trash2
} from 'lucide-react';
import { app } from '../../wailsjs/go/models';
import { HostStatusResult } from '../types';

export interface TreeNode {
  config: app.SessionConfig;
  children: TreeNode[];
}

export interface SessionTreeProps {
  sessions: app.SessionConfig[];
  searchQuery: string;
  expandedFolders: string[];
  toggleFolder: (id: string, e?: React.MouseEvent) => void;
  selectedSessionIds: string[];
  setSelectedSessionIds: (ids: string[]) => void;
  handleSessionNodeClick: (config: app.SessionConfig, e: React.MouseEvent) => void;
  handleConnect: (session: app.SessionConfig) => void;
  handleSessionContextMenu: (e: React.MouseEvent, session: app.SessionConfig) => void;
  setDraggedSessionId: (id: string | null) => void;
  handleSessionDrop: (targetFolderId: string) => void;
  resetSessionFormData: (parentId?: string) => void;
  resetFolderFormData: (parentId?: string) => void;
  setModalMode: (mode: 'create' | 'edit') => void;
  setIsModalOpen: (open: boolean) => void;
  handleEditSession: (session: app.SessionConfig, e?: React.MouseEvent) => void;
  handleDeleteSession: (sessionId: string, e?: React.MouseEvent) => void;
  openTabs: app.SessionConfig[];
  activeTabId: string | null;
  hostReachabilityMap: Record<string, HostStatusResult>;
  getColorLabelClass: (colorStr: string | undefined, isConnected: boolean) => string;
  onContextMenuBlank?: (e: React.MouseEvent) => void;
  onNewFolder?: () => void;
}

export const SessionTree: React.FC<SessionTreeProps> = ({
  sessions,
  searchQuery,
  expandedFolders,
  toggleFolder,
  selectedSessionIds,
  setSelectedSessionIds,
  handleSessionNodeClick,
  handleConnect,
  handleSessionContextMenu,
  setDraggedSessionId,
  handleSessionDrop,
  resetSessionFormData,
  resetFolderFormData,
  setModalMode,
  setIsModalOpen,
  handleEditSession,
  handleDeleteSession,
  openTabs,
  activeTabId,
  hostReachabilityMap,
  getColorLabelClass,
  onContextMenuBlank,
  onNewFolder,
}) => {
  const { t } = useI18n();
  // 构造树形数据
  const buildTree = (configs: app.SessionConfig[]): TreeNode[] => {
    const nodeMap: { [id: string]: TreeNode } = {};
    const roots: TreeNode[] = [];

    configs.forEach(c => {
      nodeMap[c.id] = { config: c, children: [] };
    });

    configs.forEach(c => {
      const node = nodeMap[c.id];
      if (c.parentId && nodeMap[c.parentId]) {
        nodeMap[c.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  // 高级多维度搜索过滤 (Multi-criteria Search: tag:, ip:, host:, port:, user:, proto:)
  const getFilteredConfigs = (): app.SessionConfig[] => {
    if (!searchQuery.trim()) return sessions;

    const rawQuery = searchQuery.trim().toLowerCase();
    const tokens = rawQuery.split(/\s+/);

    const tagFilters: string[] = [];
    const hostFilters: string[] = [];
    const portFilters: string[] = [];
    const userFilters: string[] = [];
    const protoFilters: string[] = [];
    const textTokens: string[] = [];

    tokens.forEach((tok: string) => {
      if (tok.startsWith('tag:')) {
        tagFilters.push(tok.slice(4));
      } else if (tok.startsWith('ip:') || tok.startsWith('host:')) {
        hostFilters.push(tok.split(':')[1]);
      } else if (tok.startsWith('port:')) {
        portFilters.push(tok.slice(5));
      } else if (tok.startsWith('user:')) {
        userFilters.push(tok.slice(5));
      } else if (tok.startsWith('proto:')) {
        protoFilters.push(tok.slice(6));
      } else {
        textTokens.push(tok);
      }
    });

    const matchedIds = new Set<string>();
    const matchedConfigs = sessions.filter((s: any) => {
      if (s.isFolder) {
        if (textTokens.length > 0 && textTokens.every((t: string) => s.name?.toLowerCase().includes(t))) {
          return true;
        }
        return false;
      }

      if (tagFilters.length > 0) {
        const sessionTags = ((s.tags || []) as string[]).map((t: string) => t.toLowerCase());
        const hasMatch = tagFilters.some(t => sessionTags.some(st => st.includes(t)));
        if (!hasMatch) return false;
      }
      if (hostFilters.length > 0) {
        const hasMatch = hostFilters.some(h => s.host?.toLowerCase().includes(h));
        if (!hasMatch) return false;
      }
      if (portFilters.length > 0) {
        const portStr = String(s.port || 22);
        const matchPort = portFilters.every(pf => portStr.includes(pf));
        if (!matchPort) return false;
      }

      // 用户过滤
      if (userFilters.length > 0) {
        const userStr = (s.user || '').toLowerCase();
        const matchUser = userFilters.every(uf => userStr.includes(uf));
        if (!matchUser) return false;
      }

      // 协议过滤
      if (protoFilters.length > 0) {
        const protoStr = (s.protocol || (s.isLocal ? 'local' : 'ssh')).toLowerCase();
        const matchProto = protoFilters.every(pf => protoStr.includes(pf));
        if (!matchProto) return false;
      }

      // 普通文本过滤
      if (textTokens.length > 0) {
        const sessionTags = ((s.tags || []) as string[]).join(' ').toLowerCase();
        const matchText = textTokens.every(t =>
          (s.name || '').toLowerCase().includes(t) ||
          (s.host || '').toLowerCase().includes(t) ||
          (s.user || '').toLowerCase().includes(t) ||
          sessionTags.includes(t)
        );
        if (!matchText) return false;
      }

      return true;
    });

    matchedConfigs.forEach(c => {
      matchedIds.add(c.id);
      let parentId = c.parentId;
      while (parentId) {
        const parent = sessions.find((s: any) => s.id === parentId);
        if (parent) {
          matchedIds.add(parent.id);
          parentId = parent.parentId;
        } else {
          break;
        }
      }
    });

    return sessions.filter((s: any) => matchedIds.has(s.id));
  };

  const treeData = buildTree(getFilteredConfigs());

  // 递归渲染树节点
  const renderTreeNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const { config, children } = node;
    const isFolder = config.isFolder;
    const isExpanded = expandedFolders.includes(config.id);

    if (isFolder) {
      // 递归获取该文件夹下所有可探测的叶子会话配置
      const getFolderLeafSessions = (tn: TreeNode): app.SessionConfig[] => {
        let list: app.SessionConfig[] = [];
        for (const child of tn.children) {
          if (child.config.isFolder) {
            list = list.concat(getFolderLeafSessions(child));
          } else {
            list.push(child.config);
          }
        }
        return list;
      };

      const folderLeaves = getFolderLeafSessions(node);
      const remoteLeaves = folderLeaves.filter(s => !s.isFolder && !s.isLocal && s.host);
      const totalRemoteInFolder = remoteLeaves.length;

      let onlineCount = 0;
      let offlineCount = 0;
      let probedCount = 0;
      let totalLatency = 0;

      for (const s of remoteLeaves) {
        const reach = hostReachabilityMap[s.id];
        if (reach) {
          probedCount++;
          if (reach.online) {
            onlineCount++;
            totalLatency += reach.latencyMs;
          } else {
            offlineCount++;
          }
        }
      }
      const avgLatency = onlineCount > 0 ? Math.round(totalLatency / onlineCount) : 0;

      return (
        <div key={config.id} className="w-full">
          <div
            onClick={(e) => toggleFolder(config.id, e)}
            onContextMenu={(e) => handleSessionContextMenu(e, config)}
            draggable={true}
            onDragStart={(e) => {
              if (e) e.stopPropagation();
              setDraggedSessionId(config.id);
              e.dataTransfer.setData('text/plain', config.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (e) e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (e) e.stopPropagation();
              handleSessionDrop(config.id);
            }}
            className="group flex items-center justify-between px-2 py-1.5 rounded-md mx-1 cursor-pointer hover:bg-app-hover text-app-text transition-colors select-none"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <div className="flex items-center space-x-2 min-w-0 flex-1 mr-1">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#858585]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#858585]" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-[#dcb67a] shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-[#dcb67a] shrink-0" />
              )}
              <span className="text-[13px] font-medium truncate text-app-text">{config.name}</span>

              {/* 文件夹连通性聚合感知状态指示灯与在线计数 */}
              {totalRemoteInFolder > 0 && (
                <div className="flex items-center gap-1.5 ml-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      probedCount === 0
                        ? 'bg-slate-600'
                        : offlineCount === 0
                          ? (avgLatency < 200 ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]')
                          : (onlineCount > 0
                              ? 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]'
                              : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]')
                    }`}
                    title={
                      probedCount === 0
                        ? `${config.name}: ${totalRemoteInFolder} ${t('sessionTree.unprobedHosts') || '台主机未探测'}`
                        : offlineCount === 0
                          ? `${config.name}: ${t('sessionTree.allOnline') || '全部在线'} (${onlineCount}/${totalRemoteInFolder}) · ${avgLatency}ms`
                          : `${config.name}: ${onlineCount}/${totalRemoteInFolder} ${t('sessionTree.online') || '在线'} (${offlineCount} ${t('sessionTree.offline') || '离线'})`
                    }
                  />
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-mono border leading-none ${
                      probedCount === 0
                        ? 'bg-app-surface text-app-text-muted border-app-border/40'
                        : offlineCount === 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : (onlineCount > 0
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20')
                    }`}
                    title={`${config.name}: ${onlineCount}/${totalRemoteInFolder} ${t('sessionTree.online') || '在线'}`}
                  >
                    {onlineCount}/{totalRemoteInFolder}
                  </span>
                </div>
              )}
            </div>

            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 shrink-0 transition-opacity">
              <button
                onClick={(e) => {
                  if (e) e.stopPropagation();
                  resetSessionFormData(config.id);
                  setModalMode('create');
                  setIsModalOpen(true);
                }}
                className="p-0.5 hover:text-blue-400 rounded hover:bg-app-hover text-slate-400 transition-colors"
                title={t('sessionTree.newSubSession')}
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  if (e) e.stopPropagation();
                  resetFolderFormData(config.id);
                  setModalMode('create');
                  setIsModalOpen(true);
                }}
                className="p-0.5 hover:text-amber-400 rounded hover:bg-app-hover text-slate-400 transition-colors"
                title={t('sessionTree.newSubFolder')}
              >
                <FolderPlus className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => handleEditSession(config, e)}
                className="p-0.5 hover:text-blue-400 rounded hover:bg-app-hover text-slate-400 transition-colors"
                title={t('sessionTree.renameFolder')}
              >
                <Edit className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => handleDeleteSession(config.id, e)}
                className="p-0.5 hover:text-red-400 rounded hover:bg-app-hover text-slate-400 transition-colors"
                title={t('sessionTree.deleteFolder')}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="w-full">
              {children.length === 0 ? (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    resetSessionFormData(config.id);
                    setModalMode('create');
                    setIsModalOpen(true);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSessionContextMenu(e, config);
                  }}
                  className="py-1 text-slate-500 hover:text-slate-300 text-[10px] cursor-pointer flex items-center gap-1 group/empty transition-colors" 
                  style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
                  title={t('sessionTree.newUnderFolder')}
                >
                  <Plus className="w-2.5 h-2.5 opacity-40 group-hover/empty:opacity-100 text-blue-400" />
                  <span>{t('sessionTree.emptyFolderHint')}</span>
                </div>
              ) : (
                children.map(child => renderTreeNode(child, depth + 1))
              )}
            </div>
          )}
        </div>
      );
    } else {
      const isConnected = openTabs.some((t: any) => t.id === config.id || (t.id && t.id.startsWith(config.id + '_')));
      const isHostActive = activeTabId === config.id || (activeTabId !== null && activeTabId.startsWith(config.id + '_'));
      const reachability = hostReachabilityMap[config.id];

      return (
        <div
          key={config.id}
          onClick={(e) => handleSessionNodeClick(config, e)}
          onDoubleClick={() => handleConnect(config)}
          onContextMenu={(e) => {
            if (!selectedSessionIds.includes(config.id)) {
              setSelectedSessionIds([config.id]);
            }
            handleSessionContextMenu(e, config);
          }}
          draggable={true}
          onDragStart={(e) => {
            if (e) e.stopPropagation();
            setDraggedSessionId(config.id);
            e.dataTransfer.setData('text/plain', config.id);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (e) e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (e) e.stopPropagation();
            handleSessionDrop(config.id);
          }}
          className={`group flex items-center justify-between px-2 py-1.5 rounded-md mx-1 my-0.5 cursor-pointer transition-colors select-none ${
            selectedSessionIds.includes(config.id)
              ? 'bg-[#04395e] text-white font-medium'
              : (isHostActive ? 'bg-[#04395e]/60 text-white' : 'text-app-text hover:bg-app-hover')
          }`}
          style={{ paddingLeft: `${depth * 16 + 24}px` }}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1 mr-1">
            {/* 19.3: 主机连通性状态指示灯 */}
            {!config.isFolder && !config.isLocal && config.host ? (
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  reachability
                    ? (reachability.online
                        ? (reachability.latencyMs < 200 ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]')
                        : 'bg-red-500')
                    : 'bg-slate-600'
                }`}
                title={
                  reachability
                    ? (reachability.online
                        ? t('sessionTree.onlineLatency').replace('{ms}', String(reachability.latencyMs)).replace('{time}', reachability.checkedAt)
                        : t('sessionTree.offlineError').replace('{err}', reachability.error || t('common.timeout') || '连接超时'))
                    : t('sessionTree.reachNotProbed')
                }
              />
            ) : null}

            <Server className={`h-4 w-4 shrink-0 ${getColorLabelClass(config.colorLabel, isConnected)}`} />
            <div className="truncate flex-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-[13px] font-medium truncate leading-tight">{config.name}</span>
                {/* 19.3: 会话标签徽标 */}
                {((config as any).tags || []).slice(0, 2).map((tag: string, tidx: number) => (
                  <span 
                    key={tidx} 
                    className="px-1.5 py-0.5 bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] rounded-full leading-tight shrink-0 font-normal"
                  >
                    #{tag}
                  </span>
                ))}
                {((config as any).tags || []).length > 2 && (
                  <span className="text-[10px] text-slate-500 shrink-0 font-normal">
                    +{((config as any).tags || []).length - 2}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {config.isLocal ? t('sessionTree.localTerm') : `${config.user || 'root'}@${config.host}:${config.port || 22}`}
              </p>
            </div>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 shrink-0 transition-opacity">
            <button
              onClick={(e) => handleEditSession(config, e)}
              className="p-0.5 hover:text-blue-400 hover:bg-app-hover rounded"
              title={t('sessionTree.editConfig')}
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => handleDeleteSession(config.id, e)}
              className="p-0.5 hover:text-red-400 hover:bg-app-hover rounded"
              title={t('sessionTree.deleteSession')}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }
  };

  if (treeData.length === 0) {
    return (
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
        <span>{t('sessionTree.emptyTreeHint')}</span>
        <div className="text-[10px] text-slate-500 mt-1">{t("sessionTree.emptyTreeSub")}</div>
      </div>
    );
  }

  return (
    <>
      {treeData.map(node => renderTreeNode(node))}
    </>
  );
};
