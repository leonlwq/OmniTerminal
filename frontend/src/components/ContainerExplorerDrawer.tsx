import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  Search,
  Terminal,
  FileText,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Box,
  Server,
  ChevronDown,
  Folder,
  File,
  ArrowLeft,
  ChevronRight,
  CheckSquare,
  Square as SquareOutline,
  Edit3,
  ChevronUp,
} from 'lucide-react';
import { MultiLogMatrixModal } from './MultiLogMatrixModal';
import { ContainerFileEditorModal } from './ContainerFileEditorModal';
import { ContainerFileInfo } from '../types';

interface ContainerInfo {
  id: string;
  names: string;
  image: string;
  command: string;
  createdAt: string;
  status: string;
  state: string;
  ports: string;
}

interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  ip: string;
  node: string;
  containers: string[];
}

interface ContainerTarget {
  id: string;
  name: string;
  image?: string;
  type: 'docker' | 'k8s';
  podName?: string;
  namespace?: string;
}

interface ContainerExplorerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions?: any[];
  activeSessions?: any[];
  onOpenContainerTerminal?: (opts: {
    title: string;
    sessionId?: string;
    cmd: string;
  }) => void;
  onOpenTerminal?: (target: {
    type: 'docker' | 'k8s';
    name: string;
    containerId?: string;
    podName?: string;
    namespace?: string;
    hostSessionId?: string;
    shell?: string;
  }) => void;
}

export const ContainerExplorerDrawer: React.FC<ContainerExplorerDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessions,
  onOpenContainerTerminal,
  onOpenTerminal,
}) => {
  const hostSessions = sessions || activeSessions || [];
  const [activeMode, setActiveMode] = useState<'docker' | 'k8s'>('docker');
  const [selectedHost, setSelectedHost] = useState<string>('local');
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [k8sNamespace, setK8sNamespace] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShell, setSelectedShell] = useState<string>('/bin/bash');
  const [logModal, setLogModal] = useState<{
    isOpen: boolean;
    name: string;
    logs: string;
    loading: boolean;
  } | null>(null);

  // 多容器日志矩阵状态
  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set());
  const [isMultiLogMatrixOpen, setIsMultiLogMatrixOpen] = useState(false);

  // 容器内联文件浏览状态
  const [activeContainerForFiles, setActiveContainerForFiles] = useState<{
    id: string;
    name: string;
    type: 'docker' | 'k8s';
    podName?: string;
    namespace?: string;
    containerName?: string;
  } | null>(null);
  const [containerPath, setContainerPath] = useState<string>('/');
  const [containerFiles, setContainerFiles] = useState<ContainerFileInfo[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileFilter, setFileFilter] = useState('');
  const [fileEditorState, setFileEditorState] = useState<{
    isOpen: boolean;
    filePath: string;
    fileName: string;
    content: string;
    loading: boolean;
  } | null>(null);

  // Wails Go IPC 方法调用
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const wailsApp = (window as any).go?.app?.App;
      if (!wailsApp) {
        setLoading(false);
        return;
      }

      if (activeMode === 'docker') {
        const list = await wailsApp.ListDockerContainers(selectedHost === 'local' ? '' : selectedHost);
        setContainers(list || []);
      } else {
        const list = await wailsApp.ListK8sPods(
          selectedHost === 'local' ? '' : selectedHost,
          k8sNamespace,
          ''
        );
        setPods(list || []);
      }
    } catch (err: any) {
      console.warn('Load containers error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeMode, selectedHost, k8sNamespace]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  // 过滤
  const filteredContainers = containers.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.names?.toLowerCase().includes(term) ||
      c.image?.toLowerCase().includes(term) ||
      c.id?.toLowerCase().includes(term)
    );
  });

  const filteredPods = pods.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.namespace?.toLowerCase().includes(term) ||
      p.ip?.toLowerCase().includes(term)
    );
  });

  // 双击直连容器 Shell
  const handleConnectDocker = (c: ContainerInfo) => {
    const containerRef = c.names.replace(/^\//, '') || c.id;
    if (onOpenTerminal) {
      onOpenTerminal({
        type: 'docker',
        name: containerRef,
        containerId: c.id,
        hostSessionId: selectedHost === 'local' ? undefined : selectedHost,
        shell: selectedShell,
      });
      return;
    }
    if (onOpenContainerTerminal) {
      const execCmd = `docker exec -it ${containerRef} ${selectedShell} || docker exec -it ${containerRef} /bin/sh`;
      onOpenContainerTerminal({
        title: `🐳 ${containerRef}`,
        sessionId: selectedHost === 'local' ? undefined : selectedHost,
        cmd: execCmd,
      });
    }
  };

  const handleConnectPod = (p: PodInfo, containerName?: string) => {
    const cName = containerName || p.containers?.[0] || '';
    if (onOpenTerminal) {
      onOpenTerminal({
        type: 'k8s',
        name: cName,
        podName: p.name,
        namespace: p.namespace,
        hostSessionId: selectedHost === 'local' ? undefined : selectedHost,
        shell: selectedShell,
      });
      return;
    }
    if (onOpenContainerTerminal) {
      const cArg = cName ? `-c ${cName}` : '';
      const nsArg = p.namespace ? `-n ${p.namespace}` : '';
      const execCmd = `kubectl exec -it ${nsArg} ${p.name} ${cArg} -- ${selectedShell} || kubectl exec -it ${nsArg} ${p.name} ${cArg} -- /bin/sh`;
      onOpenContainerTerminal({
        title: `☸️ ${p.name}`,
        sessionId: selectedHost === 'local' ? undefined : selectedHost,
        cmd: execCmd,
      });
    }
  };

  // 查看日志
  const handleViewLogs = async (containerId: string, name: string) => {
    setLogModal({ isOpen: true, name, logs: '正在拉取日志...', loading: true });
    try {
      const wailsApp = (window as any).go?.app?.App;
      if (wailsApp) {
        const logs = await wailsApp.GetDockerLogs(
          selectedHost === 'local' ? '' : selectedHost,
          containerId,
          200
        );
        setLogModal({ isOpen: true, name, logs: logs || '(无日志输出)', loading: false });
      }
    } catch (err: any) {
      setLogModal({ isOpen: true, name, logs: `读取日志失败: ${err?.message || err}`, loading: false });
    }
  };

  // 重启容器
  const handleRestart = async (containerId: string) => {
    try {
      const wailsApp = (window as any).go?.app?.App;
      if (wailsApp) {
        await wailsApp.RestartDockerContainer(
          selectedHost === 'local' ? '' : selectedHost,
          containerId
        );
        loadData();
      }
    } catch (err) {
      console.warn('Restart error:', err);
    }
  };

  // 停止容器
  const handleStop = async (containerId: string) => {
    try {
      const wailsApp = (window as any).go?.app?.App;
      if (wailsApp) {
        await wailsApp.StopDockerContainer(
          selectedHost === 'local' ? '' : selectedHost,
          containerId
        );
        loadData();
      }
    } catch (err) {
      console.warn('Stop error:', err);
    }
  };

  // 切换多选状态
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedContainerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 加载容器文件目录
  const loadContainerFiles = async (
    targetPath: string,
    targetContainer?: {
      id: string;
      type: 'docker' | 'k8s';
      podName?: string;
      namespace?: string;
      containerName?: string;
    }
  ) => {
    const target = targetContainer || activeContainerForFiles;
    if (!target) return;

    setLoadingFiles(true);
    setFileError(null);
    try {
      const wailsApp = (window as any).go?.app?.App;
      if (!wailsApp || !wailsApp.ListContainerFiles) {
        setFileError('后端未支持 ListContainerFiles 接口');
        return;
      }

      const hostSession = selectedHost === 'local' ? '' : selectedHost;
      const res = await wailsApp.ListContainerFiles(
        hostSession,
        target.type,
        target.id,
        target.podName || '',
        target.namespace || '',
        target.containerName || '',
        targetPath
      );
      setContainerFiles(res || []);
      setContainerPath(targetPath);
    } catch (err: any) {
      console.warn('ListContainerFiles error:', err);
      setFileError(err?.message || String(err));
    } finally {
      setLoadingFiles(false);
    }
  };

  // 打开 Docker 容器文件浏览
  const handleOpenContainerFiles = (c: ContainerInfo) => {
    const cName = c.names?.replace(/^\//, '') || c.id.substring(0, 12);
    const target = {
      id: c.id,
      name: cName,
      type: 'docker' as const,
    };
    setActiveContainerForFiles(target);
    setContainerPath('/');
    loadContainerFiles('/', target);
  };

  // 打开 K8s Pod 文件浏览
  const handleOpenPodFiles = (p: PodInfo, containerName?: string) => {
    const cName = containerName || p.containers?.[0] || '';
    const target = {
      id: p.name,
      name: p.name,
      type: 'k8s' as const,
      podName: p.name,
      namespace: p.namespace,
      containerName: cName,
    };
    setActiveContainerForFiles(target);
    setContainerPath('/');
    loadContainerFiles('/', target);
  };

  // 点击/双击打开文件
  const handleOpenFileItem = async (file: ContainerFileInfo) => {
    if (file.isDir) {
      loadContainerFiles(file.path);
      return;
    }
    if (!activeContainerForFiles) return;

    setFileEditorState({
      isOpen: true,
      filePath: file.path,
      fileName: file.name,
      content: '正在读取文件内容...',
      loading: true,
    });

    try {
      const wailsApp = (window as any).go?.app?.App;
      if (!wailsApp || !wailsApp.ReadContainerFile) {
        setFileEditorState(prev => prev ? { ...prev, content: '后端未支持 ReadContainerFile', loading: false } : null);
        return;
      }

      const hostSession = selectedHost === 'local' ? '' : selectedHost;
      const text = await wailsApp.ReadContainerFile(
        hostSession,
        activeContainerForFiles.type,
        activeContainerForFiles.id,
        activeContainerForFiles.podName || '',
        activeContainerForFiles.namespace || '',
        activeContainerForFiles.containerName || '',
        file.path
      );
      setFileEditorState(prev => prev ? { ...prev, content: text ?? '', loading: false } : null);
    } catch (err: any) {
      setFileEditorState(prev => prev ? { ...prev, content: `[读取失败]: ${err?.message || err}`, loading: false } : null);
    }
  };

  // 保存写回容器文件
  const handleSaveContainerFile = async (newContent: string): Promise<boolean> => {
    if (!activeContainerForFiles || !fileEditorState) return false;

    try {
      const wailsApp = (window as any).go?.app?.App;
      if (!wailsApp || !wailsApp.WriteContainerFile) return false;

      const hostSession = selectedHost === 'local' ? '' : selectedHost;
      await wailsApp.WriteContainerFile(
        hostSession,
        activeContainerForFiles.type,
        activeContainerForFiles.id,
        activeContainerForFiles.podName || '',
        activeContainerForFiles.namespace || '',
        activeContainerForFiles.containerName || '',
        fileEditorState.filePath,
        newContent
      );
      return true;
    } catch (err) {
      console.warn('WriteContainerFile error:', err);
      return false;
    }
  };

  // 返回上一级目录
  const handleGoUpDir = () => {
    if (containerPath === '/' || !containerPath) return;
    const parts = containerPath.split('/').filter(Boolean);
    if (parts.length <= 1) {
      loadContainerFiles('/');
    } else {
      parts.pop();
      loadContainerFiles('/' + parts.join('/'));
    }
  };

  // 计算多容器日志矩阵选中的目标
  const selectedTargets: ContainerTarget[] = activeMode === 'docker'
    ? containers
        .filter(c => selectedContainerIds.has(c.id))
        .map(c => ({
          id: c.id,
          name: c.names?.replace(/^\//, '') || c.id.substring(0, 12),
          image: c.image,
          type: 'docker' as const,
        }))
    : pods
        .filter(p => selectedContainerIds.has(p.name))
        .map(p => ({
          id: p.name,
          name: p.name,
          image: p.ready,
          type: 'k8s' as const,
          podName: p.name,
          namespace: p.namespace,
        }));

  // 文件过滤与排序
  const sortedFiles = [...containerFiles]
    .filter(f => !fileFilter || f.name.toLowerCase().includes(fileFilter.toLowerCase()))
    .sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className={`absolute inset-y-0 left-12 ${activeContainerForFiles ? 'w-[520px]' : 'w-96'} bg-[#181818] border-r border-[#2b2b2b] z-30 flex flex-col text-[#cccccc] shadow-2xl transition-all duration-200 select-none`}>
      {/* 视图 1: 容器内联虚拟文件浏览器 */}
      {activeContainerForFiles ? (
        <>
          {/* File Explorer Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2b2b2b] bg-[#1f1f1f]">
            <div className="flex items-center gap-2 overflow-hidden">
              <button
                onClick={() => setActiveContainerForFiles(null)}
                className="flex items-center gap-1 text-xs text-[#cccccc] hover:text-white bg-[#252526] hover:bg-[#333333] px-2 py-1 rounded border border-[#3c3c3c] transition-colors shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                返回容器
              </button>
              <div className="flex items-center gap-1.5 overflow-hidden">
                {activeContainerForFiles.type === 'docker' ? (
                  <Box className="w-3.5 h-3.5 text-[#3794ff] flex-shrink-0" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-[#3794ff] flex-shrink-0" />
                )}
                <span className="font-semibold text-xs text-white truncate" title={activeContainerForFiles.name}>
                  {activeContainerForFiles.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadContainerFiles(containerPath)}
                disabled={loadingFiles}
                className="p-1 rounded hover:bg-white/10 text-[#858585] hover:text-white transition-colors"
                title="刷新目录"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin text-[#3794ff]' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-white/10 text-[#858585] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Path Navigation & Filter Bar */}
          <div className="p-2.5 border-b border-[#2b2b2b] bg-[#1f1f1f] space-y-2 text-xs">
            {/* Breadcrumbs & Up button */}
            <div className="flex items-center gap-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 overflow-x-auto text-xs">
              <button
                onClick={handleGoUpDir}
                disabled={containerPath === '/'}
                className="p-1 rounded hover:bg-white/10 text-[#858585] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent mr-1"
                title="上一级目录"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => loadContainerFiles('/')}
                className={`hover:text-white px-1 py-0.5 rounded transition-colors ${
                  containerPath === '/' ? 'text-[#3794ff] font-semibold' : 'text-[#858585]'
                }`}
              >
                /
              </button>
              {containerPath
                .split('/')
                .filter(Boolean)
                .map((segment, idx, arr) => {
                  const segPath = '/' + arr.slice(0, idx + 1).join('/');
                  const isLast = idx === arr.length - 1;
                  return (
                    <React.Fragment key={segPath}>
                      <span className="text-[#555555]">/</span>
                      <button
                        onClick={() => loadContainerFiles(segPath)}
                        className={`hover:text-white px-1 py-0.5 rounded transition-colors truncate max-w-[120px] ${
                          isLast ? 'text-[#3794ff] font-semibold' : 'text-[#858585]'
                        }`}
                        title={segPath}
                      >
                        {segment}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            {/* Search Filter inside current directory */}
            <div className="flex items-center gap-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus-within:border-[#0078d4] rounded px-2 py-1">
              <Search className="w-3 h-3 text-[#858585]" />
              <input
                type="text"
                placeholder="过滤当前目录文件..."
                value={fileFilter}
                onChange={e => setFileFilter(e.target.value)}
                className="bg-transparent text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none w-full"
              />
              {fileFilter && (
                <button
                  onClick={() => setFileFilter('')}
                  className="text-[#858585] hover:text-white text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* File List Table */}
          <div className="flex-1 overflow-y-auto p-2">
            {loadingFiles ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#858585] text-xs gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#0078d4]" />
                <span>正在读取容器虚拟文件系统...</span>
              </div>
            ) : fileError ? (
              <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded text-rose-300 text-xs space-y-2 m-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>读取目录失败</span>
                </div>
                <p className="font-mono text-[11px] break-all">{fileError}</p>
                <button
                  onClick={() => loadContainerFiles(containerPath)}
                  className="px-2.5 py-1 bg-rose-900/40 hover:bg-rose-900/60 rounded text-xs text-white transition-colors"
                >
                  重试
                </button>
              </div>
            ) : sortedFiles.length === 0 ? (
              <div className="text-center py-20 text-[#858585] text-xs">
                {fileFilter ? '未找到匹配的文件' : '此目录为空'}
              </div>
            ) : (
              <div className="divide-y divide-[#252526]">
                {sortedFiles.map(f => (
                  <div
                    key={f.path}
                    onDoubleClick={() => handleOpenFileItem(f)}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#252526] group cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                      {f.isDir ? (
                        <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      ) : (
                        <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span
                        className={`truncate ${f.isDir ? 'font-medium text-white hover:underline' : 'text-[#cccccc]'}`}
                        title={f.name}
                      >
                        {f.name}
                      </span>
                      {f.isSymlink && (
                        <span className="text-[10px] text-cyan-400 truncate max-w-[120px]">
                          → {f.linkTarget}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#858585] font-mono flex-shrink-0">
                      <span className="w-16 text-right">{f.isDir ? '-' : formatFileSize(f.size)}</span>
                      <span className="w-20 text-center hidden sm:inline-block text-[10px]">{f.mode}</span>
                      {!f.isDir && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenFileItem(f);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded bg-[#0078d4]/15 hover:bg-[#0078d4] text-blue-300 hover:text-white transition-all"
                          title="查看与编辑"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* 视图 2: 容器 / Pod 列表与操作 */
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2b2b2b] bg-[#1f1f1f]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#0078d4]/15 flex items-center justify-center text-[#3794ff]">
                {activeMode === 'docker' ? <Box className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              </div>
              <span className="font-semibold text-xs text-white">
                {activeMode === 'docker' ? 'Docker 容器直连' : 'Kubernetes Pod 直连'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={loadData}
                disabled={loading}
                className="p-1 rounded hover:bg-white/10 text-[#858585] hover:text-white transition-colors"
                title="刷新"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3794ff]' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-white/10 text-[#858585] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Switcher & Host Selector */}
          <div className="p-3 border-b border-[#2b2b2b] bg-[#1f1f1f] space-y-2 text-xs">
            {/* Docker / K8s Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-[#1e1e1e] p-0.5 rounded border border-[#3c3c3c]">
              <button
                onClick={() => {
                  setActiveMode('docker');
                  setSelectedContainerIds(new Set());
                }}
                className={`flex items-center justify-center gap-1.5 py-1 rounded-[3px] text-xs font-medium transition-colors ${
                  activeMode === 'docker' ? 'bg-[#0078d4] text-white shadow-sm' : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                Docker 容器
              </button>
              <button
                onClick={() => {
                  setActiveMode('k8s');
                  setSelectedContainerIds(new Set());
                }}
                className={`flex items-center justify-center gap-1.5 py-1 rounded-[3px] text-xs font-medium transition-colors ${
                  activeMode === 'k8s' ? 'bg-[#0078d4] text-white shadow-sm' : 'text-[#858585] hover:text-[#cccccc]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                K8s Pods
              </button>
            </div>

            {/* Target Host Dropdown */}
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-[#858585] flex-shrink-0" />
              <select
                value={selectedHost}
                onChange={e => {
                  setSelectedHost(e.target.value);
                  setSelectedContainerIds(new Set());
                }}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-2 py-1 text-xs text-[#cccccc] focus:outline-none"
              >
                <option value="local">💻 本地守护进程 (Local Docker/K8s)</option>
                {hostSessions
                  .filter(s => !s.isFolder && (s.protocol === 'ssh' || !s.protocol))
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      🌐 {s.name} ({s.host})
                    </option>
                  ))}
              </select>
            </div>

            {/* K8s Namespace filter */}
            {activeMode === 'k8s' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="命名空间 (留空为全部 -A)..."
                  value={k8sNamespace}
                  onChange={e => setK8sNamespace(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadData()}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-2 py-1 text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none"
                />
              </div>
            )}

            {/* Search & Shell Selector */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus-within:border-[#0078d4] rounded px-2 py-1 flex-1">
                <Search className="w-3 h-3 text-[#858585]" />
                <input
                  type="text"
                  placeholder="搜索名称 / 镜像..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-transparent text-xs text-[#cccccc] placeholder-[#858585] focus:outline-none w-full"
                />
              </div>
              <select
                value={selectedShell}
                onChange={e => setSelectedShell(e.target.value)}
                className="bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-1.5 py-1 text-[11px] text-[#cccccc] focus:outline-none"
                title="直连终端所用 Shell"
              >
                <option value="/bin/bash">bash</option>
                <option value="/bin/sh">sh</option>
                <option value="/bin/ash">ash</option>
                <option value="/bin/zsh">zsh</option>
              </select>
            </div>
          </div>

          {/* List Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#2b2b2b] p-2">
            {activeMode === 'docker' &&
              filteredContainers.map(c => {
                const isRunning = c.state === 'running' || c.status.toLowerCase().includes('up');
                const cName = c.names?.replace(/^\//, '') || c.id.substring(0, 12);
                const isSelected = selectedContainerIds.has(c.id);

                return (
                  <div
                    key={c.id}
                    onDoubleClick={() => handleConnectDocker(c)}
                    className={`p-2.5 rounded-md transition-colors cursor-pointer group space-y-1.5 border ${
                      isSelected
                        ? 'bg-[#264f78]/20 border-[#0078d4]/50'
                        : 'hover:bg-[#252526] border-transparent hover:border-[#2b2b2b]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <button
                          onClick={e => handleToggleSelect(c.id, e)}
                          className="text-[#858585] hover:text-[#0078d4] transition-colors p-0.5"
                          title={isSelected ? '取消勾选' : '勾选加入日志流矩阵'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#0078d4]" />
                          ) : (
                            <SquareOutline className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isRunning ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-semibold text-xs text-white truncate" title={cName}>
                          {cName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#858585] bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#3c3c3c]">
                        {c.id.substring(0, 8)}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#858585] flex items-center justify-between">
                      <span className="truncate max-w-[200px]" title={c.image}>
                        {c.image}
                      </span>
                      <span className="text-[10px] text-[#858585]">{c.status}</span>
                    </div>

                    {/* Action Buttons on Hover */}
                    <div className="flex items-center gap-1.5 pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleConnectDocker(c)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0078d4]/15 hover:bg-[#0078d4] border border-[#0078d4]/30 hover:border-[#0078d4] text-blue-300 hover:text-white text-[11px] font-medium transition-colors"
                      >
                        <Terminal className="w-3 h-3" />
                        终端
                      </button>
                      <button
                        onClick={() => handleViewLogs(c.id, cName)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#252526] hover:bg-[#3c3c3c] border border-[#3c3c3c] text-[#cccccc] hover:text-white text-[11px] transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        日志
                      </button>
                      <button
                        onClick={() => handleOpenContainerFiles(c)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#252526] hover:bg-[#3c3c3c] border border-[#3c3c3c] text-[#cccccc] hover:text-white text-[11px] transition-colors"
                        title="浏览容器内虚拟文件"
                      >
                        <Folder className="w-3 h-3 text-amber-400" />
                        文件
                      </button>
                      <button
                        onClick={() => handleRestart(c.id)}
                        className="p-1 rounded bg-[#252526] hover:bg-[#3c3c3c] border border-[#3c3c3c] text-[#cccccc] hover:text-amber-300 transition-colors"
                        title="重启容器"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      {isRunning && (
                        <button
                          onClick={() => handleStop(c.id)}
                          className="p-1 rounded bg-[#252526] hover:bg-[#3c3c3c] border border-[#3c3c3c] text-[#cccccc] hover:text-rose-400 transition-colors"
                          title="停止容器"
                        >
                          <Square className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            {activeMode === 'k8s' &&
              filteredPods.map(p => {
                const isRunning = p.status === 'Running';
                const isSelected = selectedContainerIds.has(p.name);

                return (
                  <div
                    key={`${p.namespace}-${p.name}`}
                    onDoubleClick={() => handleConnectPod(p)}
                    className={`p-2.5 rounded-md transition-colors cursor-pointer group space-y-1.5 border ${
                      isSelected
                        ? 'bg-[#264f78]/20 border-[#0078d4]/50'
                        : 'hover:bg-[#252526] border-transparent hover:border-[#2b2b2b]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <button
                          onClick={e => handleToggleSelect(p.name, e)}
                          className="text-[#858585] hover:text-[#0078d4] transition-colors p-0.5"
                          title={isSelected ? '取消勾选' : '勾选加入日志流矩阵'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#0078d4]" />
                          ) : (
                            <SquareOutline className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isRunning
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-semibold text-xs text-white truncate" title={p.name}>
                          {p.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#3794ff] bg-[#0078d4]/10 px-1.5 py-0.5 rounded border border-[#0078d4]/20">
                        {p.ready}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#858585] flex items-center justify-between">
                      <span className="text-[#cccccc] bg-[#1e1e1e] border border-[#3c3c3c] px-1.5 py-0.5 rounded">
                        ns: {p.namespace}
                      </span>
                      <span className="text-[10px] text-[#858585] font-mono">IP: {p.ip || '-'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleConnectPod(p)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0078d4]/15 hover:bg-[#0078d4] border border-[#0078d4]/30 hover:border-[#0078d4] text-blue-300 hover:text-white text-[11px] font-medium transition-colors"
                      >
                        <Terminal className="w-3 h-3" />
                        直连 Shell
                      </button>
                      <button
                        onClick={() => handleOpenPodFiles(p)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#252526] hover:bg-[#3c3c3c] border border-[#3c3c3c] text-[#cccccc] hover:text-white text-[11px] transition-colors"
                        title="浏览 Pod 内虚拟文件"
                      >
                        <Folder className="w-3 h-3 text-amber-400" />
                        文件
                      </button>
                      {p.containers?.length > 1 && (
                        <span className="text-[10px] text-[#858585]">
                          ({p.containers.length} 容器)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

            {((activeMode === 'docker' && filteredContainers.length === 0) ||
              (activeMode === 'k8s' && filteredPods.length === 0)) && (
              <div className="text-center py-16 text-[#858585] text-xs">
                {loading ? '正在检索容器数据...' : '未找到运行中的容器或 Pod'}
              </div>
            )}
          </div>

          {/* Floating Action Bar for Multi-Log Matrix */}
          {selectedContainerIds.size >= 2 && (
            <div className="p-2.5 bg-[#1f1f1f] border-t border-[#2b2b2b] flex items-center justify-between gap-2 shadow-lg animate-in slide-in-from-bottom duration-150 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-[#cccccc]">
                <span className="w-5 h-5 rounded-full bg-[#0078d4] text-white flex items-center justify-center font-bold text-[10px]">
                  {selectedContainerIds.size}
                </span>
                <span>已选 {selectedContainerIds.size} 个容器</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedContainerIds(new Set())}
                  className="px-2 py-1 text-xs text-[#858585] hover:text-[#cccccc] transition-colors"
                >
                  清空
                </button>
                <button
                  onClick={() => setIsMultiLogMatrixOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0078d4] hover:bg-[#0062ab] text-white text-xs font-medium shadow-sm transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  启动日志矩阵
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Multi-Log Matrix Modal */}
      <MultiLogMatrixModal
        isOpen={isMultiLogMatrixOpen}
        onClose={() => setIsMultiLogMatrixOpen(false)}
        selectedContainers={selectedTargets}
        selectedHost={selectedHost}
      />

      {/* Container File Editor Modal */}
      {fileEditorState && (
        <ContainerFileEditorModal
          isOpen={fileEditorState.isOpen}
          onClose={() => setFileEditorState(null)}
          containerName={activeContainerForFiles?.name || ''}
          filePath={fileEditorState.filePath}
          initialContent={fileEditorState.content}
          onSave={handleSaveContainerFile}
        />
      )}

      {/* Single Log Modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 select-text">
          <div className="bg-[#1e1e1e] w-full max-w-2xl h-[70%] border border-[#2b2b2b] rounded-md shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1f1f1f] border-b border-[#2b2b2b]">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#3794ff]" />
                容器日志: {logModal.name}
              </span>
              <button
                onClick={() => setLogModal(null)}
                className="p-1 rounded text-[#858585] hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-4 bg-[#181818] overflow-auto font-mono text-xs text-[#cccccc] whitespace-pre">
              {logModal.logs}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
