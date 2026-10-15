import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { 
  Folder, File, ArrowLeft, ArrowRight, RefreshCw, Upload, Download, 
  Trash2, Edit3, Loader2, FolderPlus, Key, Eye, X, Star, ChevronDown, Check,
  ExternalLink, CheckCircle2, Columns, Archive, ShieldCheck, Terminal as TermIcon, Compass,
  GitBranch, GitCommit, SplitSquareVertical, Code, Info, AlertCircle
} from 'lucide-react';
import { 
  SftpListDir, SftpDelete, SftpMkdir, SftpRename, SftpChmod, 
  LocalListDir, GetLocalHomeDir, LocalDelete, LocalMkdir, LocalRename, LocalReadFile, LocalWriteFile,
  SftpUploadPaths, SftpDownloadPaths, OpenRemoteFileWithEditor,
  SftpUploadPathsWithResume, SftpDownloadPathsWithResume, SftpTransferBetweenSessions, SftpCheckFileResume, CancelSftpTransfer
} from '../../wailsjs/go/app/App';
import { app, models } from '../../wailsjs/go/models';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FolderDiffModal } from './FolderDiffModal';
import { SftpPreviewModal } from './SftpPreviewModal';
import { MonacoEditorModal } from './MonacoEditorModal';

// 模块级自然文件名排序器（带数字自然排序与基础敏感度，大幅超越反复初始化的 localeCompare）
const sftpFileCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// 纯函数文件大小格式化单例（消除组件渲染重复定义）
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return bytes + ' B';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface SftpListPanelProps {
  title: string;
  path: string;
  setPath: (val: string) => void;
  files: app.SftpFileInfo[];
  loading: boolean;
  loadDir: (val: string) => void;
  selected: Set<string>;
  setSelected: any;
  handleDbClick: (file: app.SftpFileInfo) => void;
  isRemote: boolean;
  bookmarks: string[];
  toggleBookmark: () => void;
  formatSize: (bytes: number) => string;
  toggleSelect: (setFn: any, name: string, multi: boolean) => void;
  onContextMenu?: (e: React.MouseEvent, file: app.SftpFileInfo) => void;
  isGitRepo?: boolean;
  gitStatusMap?: Record<string, { status: string; staged: boolean; untracked: boolean }>;
  sessionId?: string;
  onDropItems?: (sourceData: { sessionId: string; isRemote: boolean; sourcePath: string; files: string[] }, targetDir: string) => void;
  onDropNativeFiles?: (fileList: FileList, targetDir: string) => void;
}

// 跨平台目录上级路径解析 (兼容 Unix '/' 与 Windows 'C:\' 盘符及正反斜杠)
function getParentPath(p: string): string {
  if (!p) return '/';
  const clean = p.replace(/[/\\]+$/, '');
  const lastSlash = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
  if (lastSlash === -1) {
    if (/^[a-zA-Z]:$/.test(clean)) {
      return clean + '\\';
    }
    return clean || '/';
  }
  const parent = clean.substring(0, lastSlash);
  if (/^[a-zA-Z]:$/.test(parent)) {
    return parent + (clean.includes('/') ? '/' : '\\');
  }
  return parent || (clean.startsWith('\\') ? '\\' : '/');
}

// 检查是否已位于根目录（Unix '/' 或 Windows 'C:\'、'D:\' 等）
function isPathRoot(p: string): boolean {
  if (!p || p === '/' || p === '\\') return true;
  if (/^[a-zA-Z]:[/\\]?$/.test(p)) return true;
  return false;
}

// 跨平台路径拼接（保留平台目录分隔符）
function joinFilePath(baseDir: string, fileName: string): string {
  if (baseDir.endsWith('/') || baseDir.endsWith('\\')) {
    return baseDir + fileName;
  }
  const sep = baseDir.includes('\\') ? '\\' : '/';
  return baseDir + sep + fileName;
}

interface SftpFileItemProps {
  file: app.SftpFileInfo;
  isSelected: boolean;
  isDragOver: boolean;
  sessionId?: string;
  isRemote: boolean;
  path: string;
  gitStatus?: { status: string; staged: boolean; untracked: boolean };
  formatSize: (bytes: number) => string;
  onItemSelect: (fileName: string, multi: boolean) => void;
  onItemDragStart: (e: React.DragEvent, fileName: string) => void;
  handleDbClick: (file: app.SftpFileInfo) => void;
  onContextMenu?: (e: React.MouseEvent, file: app.SftpFileInfo) => void;
  setDragOverFolder: (folder: string | null) => void;
  setIsDragOver: (over: boolean) => void;
  handleDroppedData: (e: React.DragEvent, targetDir: string) => void;
  style?: React.CSSProperties;
}

const SftpFileItem = React.memo<SftpFileItemProps>(({
  file: f,
  isSelected,
  isDragOver,
  sessionId,
  isRemote,
  path,
  gitStatus,
  formatSize,
  onItemSelect,
  onItemDragStart,
  handleDbClick,
  onContextMenu,
  setDragOverFolder,
  setIsDragOver,
  handleDroppedData,
  style,
}) => {
  const { t } = useI18n();

  return (
    <div 
      draggable={true}
      onDragStart={(e) => onItemDragStart(e, f.name)}
      onDragOver={(e) => {
        if (f.isDir) {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
          setDragOverFolder(f.name);
        }
      }}
      onDragLeave={(e) => {
        if (f.isDir) {
          setDragOverFolder(null);
        }
      }}
      onDrop={(e) => {
        if (f.isDir) {
          e.preventDefault();
          e.stopPropagation();
          setDragOverFolder(null);
          setIsDragOver(false);
          const targetDir = joinFilePath(path, f.name);
          handleDroppedData(e, targetDir);
        }
      }}
      style={style}
      onClick={(e) => onItemSelect(f.name, e.ctrlKey || e.metaKey)}
      onDoubleClick={() => handleDbClick(f)}
      onContextMenu={(e) => onContextMenu?.(e, f)}
      className={`flex items-center justify-between px-2 py-1 h-8 cursor-pointer text-[10px] select-none hover:bg-app-hover transition-colors ${isSelected ? 'bg-blue-900/40' : ''} ${isDragOver ? 'bg-blue-500/25 ring-1 ring-blue-400' : ''}`}
    >
      <div className="flex items-center gap-2 truncate">
        {f.isDir ? <Folder className="w-3.5 h-3.5 text-yellow-500 shrink-0" /> : <File className="w-3.5 h-3.5 text-app-text-muted shrink-0" />}
        <span className="truncate text-app-text">{f.name}</span>
        {gitStatus && (
          <span 
            className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 ${
              gitStatus.status === 'modified' 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : gitStatus.status === 'added'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : gitStatus.status === 'deleted'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
            }`}
            title={`Git: ${gitStatus.status}${gitStatus.staged ? (t('sftp.gitStaged') || ' (已暂存)') : ''}`}
          >
            {gitStatus.status === 'modified' ? 'M' : gitStatus.status === 'added' ? 'A' : gitStatus.status === 'deleted' ? 'D' : '?'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-app-text-muted font-mono scale-90">{f.mode}</span>
        {!f.isDir && <span className="text-app-text-muted w-12 text-right">{formatSize(f.size)}</span>}
      </div>
    </div>
  );
});

const SftpListPanelComponent: React.FC<SftpListPanelProps & { isActive?: boolean }> = ({
  title, path, setPath, files, loading, loadDir, selected, setSelected, handleDbClick, isRemote, bookmarks, toggleBookmark, formatSize, toggleSelect, onContextMenu,
  isGitRepo, gitStatusMap, sessionId, onDropItems, onDropNativeFiles, isActive = true
}) => {
  const { t } = useI18n();
  const parentRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // 保持当前选中的不可变引用快照，彻底解除 SftpFileItem 对外部 selected Set 的直接依赖
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const handleItemSelect = useCallback((fileName: string, multi: boolean) => {
    toggleSelect(setSelected, fileName, multi);
  }, [toggleSelect, setSelected]);

  const handleItemDragStart = useCallback((e: React.DragEvent, fileName: string) => {
    const cur = selectedRef.current;
    const items = cur.has(fileName) ? Array.from(cur) : [fileName];
    const dragData = {
      sessionId: sessionId || '',
      isRemote,
      sourcePath: path,
      files: items,
    };
    e.dataTransfer.setData('application/omni-sftp', JSON.stringify(dragData));
    e.dataTransfer.setData('text/plain', items.join('\n'));
    e.dataTransfer.effectAllowed = 'copyMove';
  }, [sessionId, isRemote, path]);
  
  // 基于自然数字序与目录优先的高性能排序，彻底根除 localeCompare 瓶颈
  const sortedFiles = React.useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return sftpFileCollator.compare(a.name, b.name);
    });
  }, [files]);

  // 当文件量适中 (<=300 项) 时采用原生高性能 CSS 滚动，彻底消除虚拟列表在 React 19 与隐藏 Tab 下的调度循环
  const isLargeList = sortedFiles.length > 300;
  const getScrollElement = useCallback(() => parentRef.current, []);

  const rowVirtualizer = useVirtualizer({
    count: isLargeList ? sortedFiles.length : 0,
    getScrollElement,
    estimateSize: () => 32,
    overscan: 10,
    useFlushSync: false,
  });

  const handleDroppedData = useCallback((e: React.DragEvent, targetDir: string) => {
    const rawData = e.dataTransfer.getData('application/omni-sftp');
    if (rawData) {
      try {
        const sourceData = JSON.parse(rawData);
        onDropItems?.(sourceData, targetDir);
        return;
      } catch (err) {
        console.warn('Failed to parse SFTP drag data:', err);
      }
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropNativeFiles?.(e.dataTransfer.files, targetDir);
    }
  }, [onDropItems, onDropNativeFiles]);

  return (
    <div className="flex-1 flex flex-col min-w-0 border-app-border border-r last:border-r-0">
      <div className="p-2 border-b border-app-border flex items-center justify-between bg-app-surface">
        <span className="font-bold text-app-text text-[11px] uppercase tracking-wide flex items-center gap-2">
          {title}
          {isRemote && isGitRepo && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60 font-mono normal-case">
              <GitBranch className="w-3 h-3 text-blue-400" />
              <span>Git</span>
            </span>
          )}
          {isRemote && (
            <button onClick={toggleBookmark} className={`hover:scale-110 transition-transform ${bookmarks.includes(path) ? 'text-yellow-400' : 'text-app-text-muted'}`}>
              <Star className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
        </span>
        <button onClick={() => loadDir(path)} className="text-app-text-muted hover:text-white"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>
      
      <div className="p-1.5 bg-app-input flex items-center gap-1 shrink-0 border-b border-app-border">
        <button 
          onClick={() => {
            const up = getParentPath(path);
            setPath(up);
            loadDir(up);
          }}
          disabled={isPathRoot(path)}
          className="p-1 text-app-text-muted hover:bg-app-hover disabled:opacity-30 rounded"
          title={t('sftp.upOneLevel')}
        ><ArrowLeft className="w-3.5 h-3.5" /></button>
        <input 
          type="text" 
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') loadDir(path); }}
          className="flex-1 bg-transparent border-none focus:outline-none text-[10px] text-app-text px-1 font-mono"
        />
      </div>

      <div 
        ref={parentRef} 
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragOver(false);
          setDragOverFolder(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          setDragOverFolder(null);
          handleDroppedData(e, path);
        }}
        className={`flex-1 overflow-y-auto relative bg-app-bg transition-colors ${
          isDragOver ? 'ring-2 ring-inset ring-blue-500/50 bg-blue-500/5' : ''
        }`}
      >
        {loading && <div className="absolute inset-0 bg-app-surface flex items-center justify-center z-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>}
        
        {isLargeList ? (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const f = sortedFiles[virtualRow.index];
              return (
                <SftpFileItem
                  key={f.name}
                  file={f}
                  isSelected={selected.has(f.name)}
                  isDragOver={dragOverFolder === f.name}
                  sessionId={sessionId}
                  isRemote={isRemote}
                  path={path}
                  gitStatus={gitStatusMap?.[f.name]}
                  formatSize={formatSize}
                  onItemSelect={handleItemSelect}
                  onItemDragStart={handleItemDragStart}
                  handleDbClick={handleDbClick}
                  onContextMenu={onContextMenu}
                  setDragOverFolder={setDragOverFolder}
                  setIsDragOver={setIsDragOver}
                  handleDroppedData={handleDroppedData}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="w-full flex flex-col">
            {sortedFiles.map(f => (
              <SftpFileItem
                key={f.name}
                file={f}
                isSelected={selected.has(f.name)}
                isDragOver={dragOverFolder === f.name}
                sessionId={sessionId}
                isRemote={isRemote}
                path={path}
                gitStatus={gitStatusMap?.[f.name]}
                formatSize={formatSize}
                onItemSelect={handleItemSelect}
                onItemDragStart={handleItemDragStart}
                handleDbClick={handleDbClick}
                onContextMenu={onContextMenu}
                setDragOverFolder={setDragOverFolder}
                setIsDragOver={setIsDragOver}
                handleDroppedData={handleDroppedData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SftpListPanel = React.memo(SftpListPanelComponent);

interface SftpPanelProps {
  sessionId: string;
  onClose: () => void;
  onCdToTerminal?: (path: string) => void;
  currentTerminalDir?: string;
  openTabs?: { id: string; title: string; host?: string; isLocal?: boolean }[];
  isActive?: boolean;
}

const SftpPanelComponent: React.FC<SftpPanelProps> = ({ sessionId, onClose, onCdToTerminal, currentTerminalDir, openTabs = [], isActive = true }) => {
  const { t } = useI18n();

  // 零磁盘服务器直传状态 (Server-to-Server Direct Transfer)
  const [serverTransferModalOpen, setServerTransferModalOpen] = useState(false);
  const [serverTransferPaths, setServerTransferPaths] = useState<string[]>([]);
  const [serverTransferTargetSession, setServerTransferTargetSession] = useState<string>('');
  const [serverTransferTargetDir, setServerTransferTargetDir] = useState<string>('.');
  const [serverTransferResume, setServerTransferResume] = useState<boolean>(true);

  // 断点续传智能询问弹窗状态 (Resumable Transfer Prompt)
  const [resumePrompt, setResumePrompt] = useState<{
    open: boolean;
    isUpload: boolean;
    paths: string[];
    targetDir: string;
    fileName: string;
    resumedBytes: number;
    totalBytes: number;
    percentage: number;
  } | null>(null);

  // 过滤出可用的其他目标会话（排除当前会话与纯本地会话）
  const availableTargetSessions = React.useMemo(() => {
    return openTabs.filter(t => t.id !== sessionId && !t.isLocal);
  }, [openTabs, sessionId]);

  const handleOpenServerTransfer = (paths: string[]) => {
    setServerTransferPaths(paths);
    if (availableTargetSessions.length > 0) {
      setServerTransferTargetSession(availableTargetSessions[0].id);
    }
    setServerTransferTargetDir('.');
    setServerTransferResume(true);
    setServerTransferModalOpen(true);
  };

  const handleExecuteServerTransfer = () => {
    if (!serverTransferTargetSession || serverTransferPaths.length === 0) return;
    setServerTransferModalOpen(false);
    setBusyAction(t('sftp.transferStartedToast'));
    setTimeout(() => setBusyAction(null), 2500);

    SftpTransferBetweenSessions(
      sessionId,
      serverTransferPaths,
      serverTransferTargetSession,
      serverTransferTargetDir || '.',
      serverTransferResume
    ).catch((err: any) => {
      alert(t('sftp.errorTransfer') + (err?.message || err));
    });
  };
  const [remotePath, setRemotePath] = useState<string>('.');
  const [localPath, setLocalPath] = useState<string>('/');
  
  const [remoteFiles, setRemoteFiles] = useState<app.SftpFileInfo[]>([]);
  const [localFiles, setLocalFiles] = useState<app.SftpFileInfo[]>([]);
  
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  
  const [selectedRemote, setSelectedRemote] = useState<Set<string>>(new Set());
  const [selectedLocal, setSelectedLocal] = useState<Set<string>>(new Set());
  
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  // 目录跟随状态 (Directory Follow)
  const [directoryFollow, setDirectoryFollow] = useState<boolean>(true);

  // 压缩打包弹窗状态 (Remote Compress)
  const [compressModalOpen, setCompressModalOpen] = useState<boolean>(false);
  const [compressTargetName, setCompressTargetName] = useState<string>('archive.tar.gz');
  const [compressFormat, setCompressFormat] = useState<string>('tar.gz');
  const [compressItems, setCompressItems] = useState<string[]>([]);

  // 哈希完整性校验弹窗状态 (File Hash Verification)
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);
  const [verifyFile, setVerifyFile] = useState<app.SftpFileInfo | null>(null);
  const [verifyAlgo, setVerifyAlgo] = useState<'sha256' | 'md5' | 'sha1'>('sha256');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Editor Modal State
  const [editingFile, setEditingFile] = useState<{name: string, content: string, path: string} | null>(null);

  // Properties Modal State
  const [propFile, setPropFile] = useState<app.SftpFileInfo | null>(null);

  // Monaco & Git Diff States
  const [editorModalFile, setEditorModalFile] = useState<{ path: string; name: string } | null>(null);
  const [editorDiffData, setEditorDiffData] = useState<{ path: string; original: string; modified: string; repoPath?: string } | null>(null);
  const [isGitRepo, setIsGitRepo] = useState<boolean>(false);
  const [gitStatusMap, setGitStatusMap] = useState<Record<string, { status: string; staged: boolean; untracked: boolean }>>({});

  // Phase 3: External editor and context menu state
  const [syncNotice, setSyncNotice] = useState<{ fileName: string; time: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: app.SftpFileInfo; isRemote: boolean } | null>(null);
  const [previewFile, setPreviewFile] = useState<{ path: string; name: string; size: number } | null>(null);

  // 文件夹大小异步计算状态与缓存
  const [folderSizeMap, setFolderSizeMap] = useState<Record<string, { totalSize: number; fileCount: number; dirCount: number; done: boolean; loading: boolean }>>({});

  // 当打开属性模态框且对象为目录时，触发异步大小计算
  useEffect(() => {
    if (!propFile || !propFile.isDir) return;

    const path = remotePath === '/' ? `/${propFile.name}` : `${remotePath}/${propFile.name}`;
    if (folderSizeMap[path]?.done) return;

    setFolderSizeMap(prev => ({
      ...prev,
      [path]: { totalSize: 0, fileCount: 0, dirCount: 0, done: false, loading: true }
    }));

    const wailsApp = (window as any).go?.app?.App;
    if (wailsApp?.SftpCalculateFolderSize) {
      wailsApp.SftpCalculateFolderSize(sessionId, path).catch((err: any) => {
        console.warn('Calc folder size error:', err);
      });
    }

    const unsub = EventsOn(`sftp-folder-size-progress:${sessionId}`, (progress: any) => {
      if (progress && progress.path === path) {
        setFolderSizeMap(prev => ({
          ...prev,
          [path]: {
            totalSize: progress.totalSize || 0,
            fileCount: progress.fileCount || 0,
            dirCount: progress.dirCount || 0,
            done: Boolean(progress.done),
            loading: !progress.done,
          }
        }));
      }
    });

    return () => {
      if (typeof unsub === 'function') {
        unsub();
      }
    };
  }, [propFile, remotePath, sessionId]);

  const handleCancelCalcSize = (path: string) => {
    const wailsApp = (window as any).go?.app?.App;
    if (wailsApp?.SftpCancelFolderSize) {
      wailsApp.SftpCancelFolderSize(sessionId);
    }
    setFolderSizeMap(prev => ({
      ...prev,
      [path]: { ...prev[path], done: true, loading: false }
    }));
  };

  // 终端工作目录联动跟随 (OSC 7 / cd，增加活跃态与路径归一化判断，阻断频繁触发)
  useEffect(() => {
    if (!isActive || !directoryFollow || !currentTerminalDir || currentTerminalDir === '.') return;
    const cleanTermDir = currentTerminalDir.replace(/[/\\]+$/, '');
    const cleanRemote = remotePath.replace(/[/\\]+$/, '');
    if (cleanTermDir && cleanTermDir !== cleanRemote) {
      setRemotePath(currentTerminalDir);
      loadRemoteDir(currentTerminalDir);
    }
  }, [currentTerminalDir, directoryFollow, remotePath, isActive]);

  const remotePathRef = useRef(remotePath);
  remotePathRef.current = remotePath;

  useEffect(() => {
    // 优先通过后端 SftpGetwd 获取真实的远程初始绝对路径（如 /home/opc）
    const appRpc = (window as any).go?.app?.App;
    if (appRpc?.SftpGetwd) {
      appRpc.SftpGetwd(sessionId).then((wd: string) => {
        const initialRemote = wd || '/';
        setRemotePath(initialRemote);
        loadRemoteDir(initialRemote);
      }).catch(() => {
        loadRemoteDir('.');
      });
    } else {
      loadRemoteDir('.');
    }

    GetLocalHomeDir().then(home => {
      setLocalPath(home);
      loadLocalDir(home);
    }).catch(() => loadLocalDir('/'));

    // Load bookmarks
    try {
      const bks = JSON.parse(localStorage.getItem('sftp_bookmarks') || '[]');
      setBookmarks(bks);
    } catch {}

    const dropHandler = (x: number, y: number, paths: string[]) => {
      if (paths && paths.length > 0) {
        setBusyAction(t('sftp.busyBatchUpload').replace('{count}', String(paths.length)));
        SftpUploadPaths(sessionId, paths, remotePathRef.current).then(() => {
          setTimeout(() => {
            setBusyAction(null);
            loadRemoteDir(remotePathRef.current);
          }, 1000);
        }).catch(err => {
          setBusyAction(null);
          alert(t('sftp.errorDragUpload') + err);
        });
      }
    };

    const unlistenDrop = EventsOn('wails:file-drop', dropHandler);

    // Phase 3: 监听外部编辑器保存回传通知
    const cleanupSync = EventsOn('file-synced', (data: any) => {
      if (data && data.sessionId === sessionId) {
        setSyncNotice({ fileName: data.fileName, time: data.syncedAt });
        setTimeout(() => setSyncNotice(null), 3500);
        loadRemoteDir(remotePathRef.current);
      }
    });

    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);

    return () => {
      if (typeof unlistenDrop === 'function') unlistenDrop();
      if (typeof cleanupSync === 'function') cleanupSync();
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [sessionId]);

  const handleOpenExternalEditor = (file: app.SftpFileInfo) => {
    const full = remotePath.endsWith('/') ? remotePath + file.name : remotePath + '/' + file.name;
    setBusyAction(t('sftp.busyOpenExternal').replace('{name}', file.name));
    OpenRemoteFileWithEditor(sessionId, full, '')
      .then(() => {
        setBusyAction(null);
      })
      .catch((err: any) => {
        setBusyAction(null);
        alert(t('sftp.errorExternalEditor') + err);
      });
  };

  const handleContextMenu = (e: React.MouseEvent, file: app.SftpFileInfo, isRemote: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file,
      isRemote
    });
  };

  const loadRemoteDir = async (path: string) => {
    setRemoteLoading(true);
    const appRpc = (window as any).go?.app?.App;

    let targetPath = path;
    // 如果传入的是 '.'、'~' 或空，通过后端 SftpGetwd / SftpRealPath 换取真实绝对路径
    if (targetPath === '.' || targetPath === '' || targetPath.startsWith('~')) {
      try {
        if (targetPath.startsWith('~') && appRpc?.SftpRealPath) {
          targetPath = await appRpc.SftpRealPath(sessionId, targetPath);
        } else if (appRpc?.SftpGetwd) {
          targetPath = await appRpc.SftpGetwd(sessionId);
        }
      } catch (e) {
        console.warn('获取真实远端工作目录失败:', e);
      }
      if (!targetPath || targetPath === '.') {
        targetPath = '/';
      }
      setRemotePath(targetPath);
    }

    SftpListDir(sessionId, targetPath)
      .then(files => {
        setRemoteFiles(files || []);
        
        // 探测 Git 仓库及状态
        const wailsApp = (window as any).go?.app?.App;
        if (wailsApp?.SftpIsGitRepo) {
          wailsApp.SftpIsGitRepo(sessionId, targetPath).then((isGit: boolean) => {
            setIsGitRepo(isGit);
            if (isGit && wailsApp.SftpGitStatus) {
              wailsApp.SftpGitStatus(sessionId, targetPath).then((statuses: any[]) => {
                const map: Record<string, { status: string; staged: boolean; untracked: boolean }> = {};
                if (Array.isArray(statuses)) {
                  statuses.forEach(st => {
                    const fn = st.path.split('/').pop() || st.path;
                    map[fn] = st;
                    map[st.path] = st;
                  });
                }
                setGitStatusMap(map);
              }).catch(() => setGitStatusMap({}));
            } else {
              setGitStatusMap({});
            }
          }).catch(() => {
            setIsGitRepo(false);
            setGitStatusMap({});
          });
        }
      })
      .catch(err => alert(t('sftp.errorReadRemoteDir') + err))
      .finally(() => setRemoteLoading(false));
  };

  const loadLocalDir = (path: string) => {
    setLocalLoading(true);
    LocalListDir(path)
      .then(files => setLocalFiles(files || []))
      .catch(err => alert(t('sftp.errorReadLocalDir') + err))
      .finally(() => setLocalLoading(false));
  };

  // Selection
  const toggleSelect = useCallback((setFn: any, name: string, multi: boolean) => {
    setFn((prev: Set<string>) => {
      const newSet = multi ? new Set(prev) : new Set<string>();
      if (newSet.has(name)) newSet.delete(name);
      else newSet.add(name);
      return newSet;
    });
  }, []);

  // Actions
  const executeUpload = (paths: string[], resume: boolean, targetDir?: string) => {
    const dst = targetDir || remotePath;
    setBusyAction(t('sftp.busyUpload').replace('{count}', String(paths.length)));
    SftpUploadPathsWithResume(sessionId, paths, dst, resume)
      .then(() => {
        setTimeout(() => { setBusyAction(null); loadRemoteDir(remotePath); }, 1000);
      })
      .catch((err: any) => { setBusyAction(null); alert(t('sftp.errorUpload') + (err?.message || err)); });
  };

  const handleUpload = async () => {
    if (selectedLocal.size === 0) return;
    const paths = Array.from(selectedLocal).map(name => joinFilePath(localPath, name));

    // 如果选中的是单个普通文件，检测远端是否已存在部分数据可供续传
    if (paths.length === 1) {
      const fileName = Array.from(selectedLocal)[0];
      const localItem = localFiles.find(f => f.name === fileName);
      if (localItem && !localItem.isDir) {
        const targetRemote = remotePath.endsWith('/') ? remotePath + fileName : remotePath + '/' + fileName;
        try {
          const check = await SftpCheckFileResume(sessionId, paths[0], true, sessionId, targetRemote, false);
          if (check && check.canResume) {
            const pct = check.srcSize > 0 ? Math.floor((check.dstSize / check.srcSize) * 100) : 0;
            setResumePrompt({
              open: true,
              isUpload: true,
              paths,
              targetDir: remotePath,
              fileName,
              resumedBytes: check.dstSize,
              totalBytes: check.srcSize,
              percentage: pct,
            });
            return;
          }
        } catch (e) {
          console.warn('Check resume upload error:', e);
        }
      }
    }

    // 默认执行上传（断点续传使能）
    executeUpload(paths, true);
  };

  const executeDownload = (paths: string[], resume: boolean, targetDir?: string) => {
    const dst = targetDir || localPath;
    setBusyAction(t('sftp.busyDownload').replace('{count}', String(paths.length)));
    SftpDownloadPathsWithResume(sessionId, paths, dst, resume)
      .then(() => {
        setTimeout(() => { setBusyAction(null); loadLocalDir(localPath); }, 1000);
      })
      .catch((err: any) => { setBusyAction(null); alert(t('sftp.errorDownload') + (err?.message || err)); });
  };

  const handleDropOnPanel = async (
    targetIsRemote: boolean,
    sourceData: { sessionId: string; isRemote: boolean; sourcePath: string; files: string[] },
    targetDir: string
  ) => {
    const isSameSession = sourceData.sessionId === sessionId;

    // 场景 1：跨服务器直接拖拽直传 (Server-to-Server Direct Stream Transfer)
    if (sourceData.isRemote && targetIsRemote && !isSameSession) {
      const fullPaths = sourceData.files.map(f => joinFilePath(sourceData.sourcePath, f));
      setBusyAction(t('sftp.transferStartedToast') || '跨机直传任务已启动...');
      setTimeout(() => setBusyAction(null), 3000);

      SftpTransferBetweenSessions(
        sourceData.sessionId,
        fullPaths,
        sessionId,
        targetDir,
        true
      ).then(() => {
        setTimeout(() => loadRemoteDir(remotePath), 1200);
      }).catch((err: any) => {
        setBusyAction(null);
        alert((t('sftp.errorTransfer') || '跨机直传失败: ') + (err?.message || err));
      });
      return;
    }

    // 场景 2：从本地面板拖拽到远端面板 (Upload)
    if (!sourceData.isRemote && targetIsRemote) {
      const fullPaths = sourceData.files.map(f => joinFilePath(sourceData.sourcePath, f));
      executeUpload(fullPaths, true, targetDir);
      return;
    }

    // 场景 3：从远端面板拖拽到本地面板 (Download)
    if (sourceData.isRemote && !targetIsRemote) {
      const fullPaths = sourceData.files.map(f => joinFilePath(sourceData.sourcePath, f));
      executeDownload(fullPaths, true, targetDir);
      return;
    }
  };

  const handleDropNativeFiles = (targetIsRemote: boolean, files: FileList, targetDir: string) => {
    const filePaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const p = (f as any).path;
      if (p) {
        filePaths.push(p);
      }
    }
    if (filePaths.length === 0) return;

    if (targetIsRemote) {
      executeUpload(filePaths, true, targetDir);
    }
  };

  const handleDownload = async () => {
    if (selectedRemote.size === 0) return;
    const paths = Array.from(selectedRemote).map(name => remotePath + (remotePath.endsWith('/') ? '' : '/') + name);

    // 如果选中的是单个普通文件，检测本地是否已存在部分数据可供续传
    if (paths.length === 1) {
      const fileName = Array.from(selectedRemote)[0];
      const remoteItem = remoteFiles.find(f => f.name === fileName);
      if (remoteItem && !remoteItem.isDir) {
        const targetLocal = joinFilePath(localPath, fileName);
        try {
          const check = await SftpCheckFileResume(sessionId, paths[0], false, sessionId, targetLocal, true);
          if (check && check.canResume) {
            const pct = check.srcSize > 0 ? Math.floor((check.dstSize / check.srcSize) * 100) : 0;
            setResumePrompt({
              open: true,
              isUpload: false,
              paths,
              targetDir: localPath,
              fileName,
              resumedBytes: check.dstSize,
              totalBytes: check.srcSize,
              percentage: pct,
            });
            return;
          }
        } catch (e) {
          console.warn('Check resume download error:', e);
        }
      }
    }

    // 默认执行下载（断点续传使能）
    executeDownload(paths, true);
  };

  const handleRemoteDbClick = useCallback((file: app.SftpFileInfo) => {
    const full = remotePath.endsWith('/') ? remotePath + file.name : remotePath + '/' + file.name;
    if (file.isDir) {
      setRemotePath(full);
      loadRemoteDir(full);
    } else {
      // 双击远程文件，使用内置 Monaco 富文本代码编辑器打开
      setEditorModalFile({ path: full, name: file.name });
    }
  }, [remotePath]);

  const handleLocalDbClick = useCallback((file: app.SftpFileInfo) => {
    const full = joinFilePath(localPath, file.name);
    if (file.isDir) {
      setLocalPath(full);
      loadLocalDir(full);
    } else {
      setBusyAction(t('sftp.busyReadingLocal'));
      LocalReadFile(full).then(content => {
        setBusyAction(null);
        setEditingFile({ name: file.name, path: full, content });
      }).catch(err => {
        setBusyAction(null);
        alert(err);
      });
    }
  }, [localPath, t]);

  const saveLocalEdit = () => {
    if (!editingFile) return;
    setBusyAction(t('sftp.busySavingLocal'));
    LocalWriteFile(editingFile.path, editingFile.content).then(() => {
      setBusyAction(null);
      setEditingFile(null);
      loadLocalDir(localPath);
    }).catch(err => {
      setBusyAction(null);
      alert(err);
    });
  };

  const toggleBookmark = useCallback(() => {
    setBookmarks(prev => {
      const newBks = prev.includes(remotePath) ? prev.filter(p => p !== remotePath) : [...prev, remotePath];
      localStorage.setItem('sftp_bookmarks', JSON.stringify(newBks));
      return newBks;
    });
  }, [remotePath]);

  const formatSize = formatFileSize;

  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // 压缩打包执行
  const handleExecuteCompress = async () => {
    if (!compressTargetName.trim() || compressItems.length === 0) return;
    setBusyAction(t('sftp.busyCompressing').replace('{count}', String(compressItems.length)).replace('{name}', compressTargetName));
    try {
      if ((window as any).go?.app?.App?.SftpCompress) {
        await (window as any).go.app.App.SftpCompress(sessionId, compressItems, compressTargetName.trim(), compressFormat);
        loadRemoteDir(remotePath);
        setCompressModalOpen(false);
      }
    } catch (err: any) {
      alert(t('sftp.errorCompress') + (err?.message || err));
    } finally {
      setBusyAction(null);
    }
  };

  // 在线解压执行
  const handleExecuteExtract = async (archivePath: string, destDir?: string) => {
    setBusyAction(t('sftp.busyExtracting').replace('{path}', archivePath));
    try {
      if ((window as any).go?.app?.App?.SftpExtract) {
        await (window as any).go.app.App.SftpExtract(sessionId, archivePath, destDir || remotePath);
        loadRemoteDir(remotePath);
      }
    } catch (err: any) {
      alert(t('sftp.errorExtract') + (err?.message || err));
    } finally {
      setBusyAction(null);
    }
  };

  // 哈希校验执行
  const handleExecuteVerifyHash = async () => {
    if (!verifyFile) return;
    setIsVerifying(true);
    setVerifyResult(null);
    const full = remotePath.endsWith('/') ? remotePath + verifyFile.name : remotePath + '/' + verifyFile.name;
    const localMatch = joinFilePath(localPath, verifyFile.name);
    try {
      if ((window as any).go?.app?.App?.SftpVerifyHash) {
        const res = await (window as any).go.app.App.SftpVerifyHash(sessionId, localMatch, full, verifyAlgo);
        setVerifyResult(res);
      }
    } catch (err: any) {
      alert(t('sftp.errorChecksum') + (err?.message || err));
    } finally {
      setIsVerifying(false);
    }
  };

  const isArchiveFile = (name: string) => {
    const lower = name.toLowerCase();
    return lower.endsWith('.tar.gz') || lower.endsWith('.tgz') || lower.endsWith('.tar.bz2') || 
           lower.endsWith('.tbz2') || lower.endsWith('.tar.xz') || lower.endsWith('.txz') || 
           lower.endsWith('.tar') || lower.endsWith('.zip') || lower.endsWith('.7z') || lower.endsWith('.rar');
  };

  const handleLocalContextMenu = useCallback((e: React.MouseEvent, f: app.SftpFileInfo) => handleContextMenu(e, f, false), [handleContextMenu]);
  const handleRemoteContextMenu = useCallback((e: React.MouseEvent, f: app.SftpFileInfo) => handleContextMenu(e, f, true), [handleContextMenu]);
  const handleLocalDropItems = useCallback((src: any, dst: string) => handleDropOnPanel(false, src, dst), [handleDropOnPanel]);
  const handleRemoteDropItems = useCallback((src: any, dst: string) => handleDropOnPanel(true, src, dst), [handleDropOnPanel]);
  const handleLocalDropNativeFiles = useCallback((files: FileList, dst: string) => handleDropNativeFiles(false, files, dst), [handleDropNativeFiles]);
  const handleRemoteDropNativeFiles = useCallback((files: FileList, dst: string) => handleDropNativeFiles(true, files, dst), [handleDropNativeFiles]);

  return (
    <div className="w-[600px] bg-app-bg border-l border-app-border flex flex-col h-full text-xs text-app-text shadow-md relative">
      <div className="p-1 border-b border-app-border flex items-center justify-between shrink-0 bg-app-surface">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-blue-400">{t('sftp.dualPaneTitle')}</span>
          <button
            onClick={() => setDirectoryFollow(!directoryFollow)}
            className={`px-1.5 py-0.5 border text-[10px] flex items-center space-x-1 transition-colors ${
              directoryFollow
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/60'
                : 'bg-[#2d2d30] text-slate-400 border-[#3e3e42] hover:text-slate-200'
            }`}
            title={t('sftp.dirFollowTooltip')}
          >
            <Compass className={`w-3 h-3 ${directoryFollow ? 'text-blue-400' : ''}`} />
            <span>{t('sftp.dirFollow')} {directoryFollow ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => setIsDiffModalOpen(true)}
            className="px-1.5 py-0.5 bg-[#2d2d30] hover:bg-blue-600 border border-[#3e3e42] text-slate-200 text-[10px] flex items-center space-x-1 transition-colors"
            title={t('sftp.dirDiffTooltip')}
          >
            <Columns className="w-3 h-3" />
            <span>{t('sftp.dirDiff')}</span>
          </button>
        </div>
        <button onClick={onClose} className="text-app-text-muted hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        {/* Local Panel */}
        <SftpListPanel
          sessionId={sessionId}
          title={t('sftp.localPanel')}
          path={localPath}
          setPath={setLocalPath}
          files={localFiles}
          loading={localLoading}
          loadDir={loadLocalDir}
          selected={selectedLocal}
          setSelected={setSelectedLocal}
          handleDbClick={handleLocalDbClick}
          onContextMenu={handleLocalContextMenu}
          isRemote={false}
          bookmarks={bookmarks}
          toggleBookmark={toggleBookmark}
          formatSize={formatSize}
          toggleSelect={toggleSelect}
          onDropItems={handleLocalDropItems}
          onDropNativeFiles={handleLocalDropNativeFiles}
          isActive={isActive}
        />
        
        {/* Center Action Buttons */}
        <div className="w-12 bg-app-surface flex flex-col items-center justify-center gap-2 shrink-0 z-10 border-x border-app-border shadow-inner">
          <button onClick={handleUpload} disabled={selectedLocal.size===0} className="p-2 bg-blue-600/20 hover:bg-blue-600 rounded-none text-blue-400 hover:text-white transition-colors disabled:opacity-30" title={t('sftp.uploadToRemote') || '上传到远端'}>
            <ArrowRight className="h-5 w-5" />
          </button>
          <button onClick={handleDownload} disabled={selectedRemote.size===0} className="p-2 bg-green-600/20 hover:bg-green-600 rounded-none text-green-400 hover:text-white transition-colors disabled:opacity-30" title={t('sftp.downloadToLocal') || '下载到本地'}>
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Remote Panel */}
        <SftpListPanel
          sessionId={sessionId}
          title={t('sftp.remotePanel')}
          path={remotePath}
          setPath={setRemotePath}
          files={remoteFiles}
          loading={remoteLoading}
          loadDir={loadRemoteDir}
          selected={selectedRemote}
          setSelected={setSelectedRemote}
          handleDbClick={handleRemoteDbClick}
          onContextMenu={handleRemoteContextMenu}
          isRemote={true}
          bookmarks={bookmarks}
          toggleBookmark={toggleBookmark}
          formatSize={formatSize}
          toggleSelect={toggleSelect}
          isGitRepo={isGitRepo}
          gitStatusMap={gitStatusMap}
          onDropItems={handleRemoteDropItems}
          onDropNativeFiles={handleRemoteDropNativeFiles}
          isActive={isActive}
        />
      </div>

      {/* 同步成功提示 Toast */}
      {syncNotice && (
        <div className="absolute top-10 right-3 z-50 bg-[#1e1e1e] border border-green-600 text-green-400 px-3 py-1.5 shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <div className="text-[11px]">
            <span className="font-bold">{syncNotice.fileName}</span> {(t('sftp.autoSyncNotice') || '{fileName} 已自动静默回传同步 ({time})').replace('{fileName}', '').replace('{time}', syncNotice.time)}
          </div>
        </div>
      )}

      {/* 右键气泡菜单 */}
      {contextMenu && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-[#252526] border border-[#2b2b2b] shadow-2xl rounded-md py-1 min-w-[210px] text-[#cccccc] text-xs overflow-hidden"
        >
          {/* 在活动终端打开 cd */}
          {contextMenu.isRemote && contextMenu.file.isDir && onCdToTerminal && (
            <button
              onClick={() => {
                const full = remotePath.endsWith('/') ? remotePath + contextMenu.file.name : remotePath + '/' + contextMenu.file.name;
                onCdToTerminal(full);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#3794ff]"
            >
              <TermIcon className="w-3.5 h-3.5" />
              <span>{t('sftp.cdHere')}</span>
            </button>
          )}

          {contextMenu.isRemote && !contextMenu.file.isDir && (
            <>
              <button
                onClick={() => {
                  const full = remotePath.endsWith('/') ? remotePath + contextMenu.file.name : remotePath + '/' + contextMenu.file.name;
                  setEditorModalFile({ path: full, name: contextMenu.file.name });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#3794ff] font-medium"
              >
                <Code className="w-3.5 h-3.5" />
                <span>{t('sftp.monacoEdit')}</span>
              </button>

              {isGitRepo && (
                <button
                  onClick={async () => {
                    const relPath = contextMenu.file.name;
                    const wailsApp = (window as any).go?.app?.App;
                    if (wailsApp?.SftpGitDiff) {
                      setBusyAction(t('sftp.calcGitDiff') || "正在计算 Git Diff...");
                      try {
                        const diffRes = await wailsApp.SftpGitDiff(sessionId, remotePath, relPath);
                        if (diffRes) {
                          setEditorDiffData({
                            path: diffRes.path || relPath,
                            original: diffRes.original || '',
                            modified: diffRes.modified || '',
                            repoPath: remotePath,
                          });
                        }
                      } catch (err: any) {
                        alert(t('sftp.errorGitDiff') + err);
                      } finally {
                        setBusyAction(null);
                      }
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-emerald-400 font-medium"
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  <span>{t('sftp.gitDiff')}</span>
                </button>
              )}

              <button
                onClick={() => {
                  const full = remotePath.endsWith('/') ? remotePath + contextMenu.file.name : remotePath + '/' + contextMenu.file.name;
                  setPreviewFile({ path: full, name: contextMenu.file.name, size: contextMenu.file.size });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#cccccc]"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t('sftp.preview')}</span>
              </button>
              <button
                onClick={() => {
                  handleOpenExternalEditor(contextMenu.file);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#cccccc]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('sftp.externalEdit')}</span>
              </button>
            </>
          )}

          {/* 远端文件/目录下载：弹出系统文件/目录选择器让用户自由选择保存路径 */}
          {contextMenu.isRemote && (
            <button
              onClick={() => {
                const fullRemote = remotePath.endsWith('/') ? remotePath + contextMenu.file.name : remotePath + '/' + contextMenu.file.name;
                const wailsApp = (window as any).go?.app?.App;
                if (contextMenu.file.isDir) {
                  if (wailsApp?.SftpDownloadDirectory) {
                    wailsApp.SftpDownloadDirectory(sessionId, fullRemote).catch((err: any) => {
                      alert(t('sftp.errorDownloadDir') + (err?.message || err));
                    });
                  }
                } else {
                  if (wailsApp?.SftpDownloadFile) {
                    wailsApp.SftpDownloadFile(sessionId, fullRemote).catch((err: any) => {
                      alert(t('sftp.errorDownloadFile') + (err?.message || err));
                    });
                  }
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#3794ff] font-medium"
            >
              <Download className="w-3.5 h-3.5 text-[#3794ff]" />
              <span>{t('sftp.downloadCustom')}</span>
            </button>
          )}

          {/* 远端文件一键下载到左侧本地当前目录 */}
          {contextMenu.isRemote && (
            <button
              onClick={() => {
                const fullRemote = remotePath.endsWith('/') ? remotePath + contextMenu.file.name : remotePath + '/' + contextMenu.file.name;
                setBusyAction(t('sftp.busyTransferToLocal').replace('{name}', contextMenu.file.name).replace('{path}', localPath));
                SftpDownloadPaths(sessionId, [fullRemote], localPath)
                  .then(() => {
                    setTimeout(() => {
                      setBusyAction(null);
                      loadLocalDir(localPath);
                    }, 1200);
                  })
                  .catch((err: any) => {
                    setBusyAction(null);
                    alert(t('sftp.errorTransfer') + (err?.message || err));
                  });
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#cccccc]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('sftp.downloadToPanel')}</span>
            </button>
          )}

          {/* 远端文件/目录：发送到其他在线服务器 (Server-to-Server Zero-Disk Transfer) */}
          {contextMenu.isRemote && (
            <button
              onClick={() => {
                const paths = selectedRemote.size > 1 && selectedRemote.has(contextMenu.file.name)
                  ? Array.from(selectedRemote).map(n => remotePath + (remotePath.endsWith('/') ? '' : '/') + n)
                  : [remotePath.endsWith('/') ? remotePath + contextMenu.file.name : remotePath + '/' + contextMenu.file.name];
                handleOpenServerTransfer(paths);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-purple-300"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
              <span>{t('sftp.serverToServer')}</span>
            </button>
          )}

          {/* 本地文件一键上传到右侧远端当前目录 */}
          {!contextMenu.isRemote && (
            <button
              onClick={() => {
                const fullLocal = joinFilePath(localPath, contextMenu.file.name);
                setBusyAction(t('sftp.busyUploadToRemote').replace('{name}', contextMenu.file.name));
                SftpUploadPaths(sessionId, [fullLocal], remotePath)
                  .then(() => {
                    setTimeout(() => {
                      setBusyAction(null);
                      loadRemoteDir(remotePath);
                    }, 1200);
                  })
                  .catch((err: any) => {
                    setBusyAction(null);
                    alert(t('sftp.errorUpload') + (err?.message || err));
                  });
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-emerald-400"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('sftp.uploadToRemote')}</span>
            </button>
          )}

          {/* 远程压缩打包 */}
          {contextMenu.isRemote && (
            <button
              onClick={() => {
                const full = remotePath.endsWith('/') ? remotePath + contextMenu.file.name : remotePath + '/' + contextMenu.file.name;
                setCompressItems([full]);
                setCompressTargetName(`${contextMenu.file.name}.tar.gz`);
                setCompressFormat('tar.gz');
                setCompressModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#cccccc]"
            >
              <Archive className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('sftp.compress')}</span>
            </button>
          )}

          {/* 远程解压缩 */}
          {contextMenu.isRemote && !contextMenu.file.isDir && isArchiveFile(contextMenu.file.name) && (
            <button
              onClick={() => {
                const full = remotePath.endsWith('/') ? remotePath + contextMenu.file.name : remotePath + '/' + contextMenu.file.name;
                handleExecuteExtract(full, remotePath);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-emerald-300"
            >
              <Archive className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('sftp.extract')}</span>
            </button>
          )}

          {/* 文件哈希校验 */}
          {contextMenu.isRemote && !contextMenu.file.isDir && (
            <button
              onClick={() => {
                setVerifyFile(contextMenu.file);
                setVerifyResult(null);
                setVerifyModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#cccccc]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>{t('sftp.verifyChecksum')}</span>
            </button>
          )}

          <button
            onClick={() => {
              setPropFile(contextMenu.file);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#cccccc]"
          >
            <Info className="w-3.5 h-3.5 text-[#3794ff]" />
            <span>{t('sftp.properties')}</span>
          </button>
        </div>
      )}

      {busyAction && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 flex items-center justify-center">
          <div className="bg-[#252526] p-4 rounded-md border border-[#2b2b2b] shadow-2xl flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#0078d4]" />
            <span className="font-semibold text-xs text-[#cccccc]">{busyAction}</span>
          </div>
        </div>
      )}

      {/* 压缩打包弹窗 */}  
      {compressModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#252526] p-5 rounded-md border border-[#2b2b2b] shadow-2xl w-96 text-[#cccccc] space-y-4">
            <h3 className="font-semibold text-xs text-[#cccccc] border-b border-[#2b2b2b] pb-2 flex items-center gap-2">
              <Archive className="w-4 h-4 text-[#0078d4]" />
              {t('sftp.compressTitle')}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#858585] block mb-1">{t('sftp.compressFileName')}</label>
                <input
                  type="text"
                  value={compressTargetName}
                  onChange={e => setCompressTargetName(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[#858585] block mb-1">{t('sftp.compressFormat')}</label>
                <select
                  value={compressFormat}
                  onChange={e => {
                    setCompressFormat(e.target.value);
                    const base = compressTargetName.replace(/\.(tar\.gz|tgz|tar\.bz2|tbz2|tar\.xz|txz|zip|7z)$/i, '');
                    setCompressTargetName(`${base}.${e.target.value}`);
                  }}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] outline-none"
                >
                  <option value="tar.gz">{t('sftp.optTarGz') || '.tar.gz (Gzip - 推荐通用)'}</option>
                  <option value="zip">{t('sftp.optZip') || '.zip (标准 Zip)'}</option>
                  <option value="tar.bz2">{t('sftp.optTarBz2') || '.tar.bz2 (Bzip2 高压缩)'}</option>
                  <option value="tar.xz">{t('sftp.optTarXz') || '.tar.xz (XZ 极高压缩)'}</option>
                  <option value="7z">{t('sftp.opt7z') || '.7z (7-Zip 归档)'}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#2b2b2b]">
              <button onClick={() => setCompressModalOpen(false)} className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded font-medium">{t('common.cancel')}</button>
              <button onClick={handleExecuteCompress} className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium rounded shadow-sm">{t('sftp.startCompress') || '开始压缩'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 哈希校验完整性弹窗 */}
      {verifyModalOpen && verifyFile && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#252526] p-5 rounded-md border border-[#2b2b2b] shadow-2xl w-[440px] text-[#cccccc] space-y-4">
            <h3 className="font-semibold text-xs text-[#cccccc] border-b border-[#2b2b2b] pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0078d4]" />
              {t('sftp.checksumTitle')}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
                <div className="text-[#858585]">{t('sftp.fileNameLabel') || '文件名称: '}<span className="text-[#cccccc] font-medium">{verifyFile.name}</span></div>
                <div className="text-[#858585]">{t('sftp.fileSizeLabel') || '文件大小: '}<span className="font-mono text-[#cccccc]">{formatSize(verifyFile.size)}</span></div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[#858585] shrink-0">{t('sftp.checksumAlgo')}</label>
                <select
                  value={verifyAlgo}
                  onChange={e => setVerifyAlgo(e.target.value as any)}
                  className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono outline-none"
                >
                  <option value="sha256">{t('sftp.sha256Recommended') || 'SHA-256 (推荐安全标准)'}</option>
                  <option value="md5">{t('sftp.md5Legacy') || 'MD5 (传统校验)'}</option>
                  <option value="sha1">SHA-1</option>
                </select>
                <button
                  onClick={handleExecuteVerifyHash}
                  disabled={isVerifying}
                  className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium rounded disabled:opacity-50"
                >
                  {isVerifying ? t('sftp.checksumCalculating') : t('sftp.checksumStart')}
                </button>
              </div>

              {verifyResult && (
                <div className="space-y-2 p-3 bg-[#1e1e1e] rounded border border-[#3c3c3c] font-mono text-[11px]">
                  <div>
                    <div className="text-[#858585] text-[10px]">{(t('sftp.remoteHashLabel') || '远端文件哈希 ({algo}):').replace('{algo}', verifyResult.algorithm)}</div>
                    <div className="text-[#3794ff] break-all select-all">{verifyResult.remoteHash || '无输出'}</div>
                  </div>
                  {verifyResult.localHash && (
                    <div>
                      <div className="text-[#858585] text-[10px]">{t('sftp.localHashLabel') || '本地同名文件哈希:'}</div>
                      <div className="text-amber-300 break-all select-all">{verifyResult.localHash}</div>
                      <div className="mt-2">
                        {verifyResult.match ? (
                          <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-700 text-emerald-400 rounded text-xs font-semibold">
                            {t('sftp.checksumMatch')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-950/80 border border-rose-700 text-rose-400 rounded text-xs font-semibold">
                            {t('sftp.checksumMismatch')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-[#2b2b2b]">
              <button onClick={() => setVerifyModalOpen(false)} className="px-3.5 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded font-medium">{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Modal */}
      {editingFile && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#252526] w-full h-full max-w-3xl max-h-[80vh] border border-[#2b2b2b] shadow-2xl rounded-md flex flex-col overflow-hidden text-[#cccccc]">
            <div className="px-4 py-2.5 border-b border-[#2b2b2b] flex justify-between items-center bg-[#1f1f1f]">
              <span className="font-semibold text-xs text-[#cccccc]">{t('sftp.editLocalFile') || '编辑本地文件: '}{editingFile.name}</span>
              <button onClick={() => setEditingFile(null)} className="text-[#858585] hover:text-white p-1 rounded hover:bg-white/10 transition-colors"><X className="w-4 h-4"/></button>
            </div>
            <textarea 
              value={editingFile.content}
              onChange={(e) => setEditingFile({...editingFile, content: e.target.value})}
              className="flex-1 w-full bg-[#1e1e1e] p-4 text-[#cccccc] font-mono text-xs resize-none outline-none leading-relaxed"
              spellCheck={false}
            />
            <div className="px-4 py-2.5 border-t border-[#2b2b2b] flex justify-end gap-2.5 bg-[#1f1f1f]">
              <button onClick={() => setEditingFile(null)} className="px-3 py-1.5 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors">{t('common.cancel')}</button>
              <button onClick={saveLocalEdit} className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-medium rounded shadow-sm transition-colors">{t('sftp.saveToLocal') || '保存到本地'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Properties Modal */}
      {propFile && (() => {
        const propFilePath = remotePath === '/' ? `/${propFile.name}` : `${remotePath}/${propFile.name}`;
        return (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#252526] p-5 rounded-md border border-[#2b2b2b] shadow-2xl w-84 text-[#cccccc] space-y-4">
              <h3 className="font-semibold text-xs text-[#cccccc] border-b border-[#2b2b2b] pb-2.5 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#0078d4]" />
                {t('sftp.propTitle')}
              </h3>
              <div className="space-y-2 text-xs bg-[#1e1e1e] border border-[#3c3c3c] p-3 rounded">
                <p><span className="text-[#858585] w-16 inline-block">{t('sftp.propName')}</span> <span className="text-[#cccccc] font-medium break-all">{propFile.name}</span></p>
                <p><span className="text-[#858585] w-16 inline-block">{t('sftp.propType')}</span> {propFile.isDir ? (t('sftp.typeDir') || '文件夹 (Directory)') : (t('sftp.typeFile') || '文件')}</p>
                {propFile.isDir ? (
                  <div className="flex items-start justify-between">
                    <span className="text-[#858585] w-16 inline-block flex-shrink-0">{t('sftp.propSize')}</span>
                    <div className="flex-1 text-right">
                      {folderSizeMap[propFilePath]?.loading ? (
                        <div className="flex items-center justify-end gap-1.5 text-[#0078d4]">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>
                            {formatSize(folderSizeMap[propFilePath]?.totalSize || 0)}
                            {' · '}
                            {(t('sftp.filesCount') || '{count} 文件').replace('{count}', String(folderSizeMap[propFilePath]?.fileCount || 0))}
                          </span>
                          <button
                            onClick={() => handleCancelCalcSize(propFilePath)}
                            className="text-[10px] text-[#858585] hover:text-rose-300 ml-1 underline"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : folderSizeMap[propFilePath]?.done ? (
                        <span className="text-emerald-400 font-medium">
                          {formatSize(folderSizeMap[propFilePath].totalSize)}
                          <span className="text-[#858585] font-normal text-[11px] ml-1">
                            ({(t('sftp.filesCount') || '{count} 文件').replace('{count}', String(folderSizeMap[propFilePath].fileCount))}, {(t('sftp.dirsCount') || '{count} 目录').replace('{count}', String(folderSizeMap[propFilePath].dirCount))})
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#858585]">{t('sftp.readyStats') || '准备统计中...'}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p><span className="text-[#858585] w-16 inline-block">{t('sftp.propSize')}</span> {formatSize(propFile.size)} ({propFile.size} Bytes)</p>
                )}
                <p><span className="text-[#858585] w-16 inline-block">{t('sftp.propPerm')}</span> <span className="font-mono text-amber-400">{propFile.mode}</span></p>
                <p><span className="text-[#858585] w-16 inline-block">{t('sftp.propMtime')}</span> <span className="font-mono text-[11px] text-[#858585]">{propFile.modTime}</span></p>
              </div>
              <button onClick={() => setPropFile(null)} className="w-full py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded font-medium text-xs transition-colors">{t('common.close')}</button>
            </div>
          </div>
        );
      })()}

      {/* 目录差异比对与同步弹窗 (Folder Diff & Sync) */}
      <FolderDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        sessionId={sessionId}
        remoteDir={remotePath}
        localDir={localPath}
        onSyncComplete={() => {
          loadRemoteDir(remotePath);
          loadLocalDir(localPath);
        }}
      />

      {/* 快速文件预览弹窗 (File Preview Modal) */}
      {previewFile && (
        <SftpPreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          sessionId={sessionId}
          filePath={previewFile.path}
          fileName={previewFile.name}
          fileSize={previewFile.size}
        />
      )}

      {/* 远程文件 Monaco 富文本代码编辑器 / Git Diff 对比弹窗 */}
      {(editorModalFile || editorDiffData) && (
        <MonacoEditorModal
          isOpen={!!(editorModalFile || editorDiffData)}
          onClose={() => {
            setEditorModalFile(null);
            setEditorDiffData(null);
            loadRemoteDir(remotePath);
          }}
          sessionId={sessionId}
          initialFile={editorModalFile}
          diffData={editorDiffData}
        />
      )}

      {/* 零磁盘服务器直传弹窗 (Server-to-Server Zero-Disk Transfer) */}
      {serverTransferModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#252526] p-5 rounded-md border border-[#2b2b2b] shadow-2xl w-[420px] text-[#cccccc] space-y-4">
            <h3 className="font-semibold text-xs text-[#cccccc] border-b border-[#2b2b2b] pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-purple-400" />
                {t('sftp.serverTransferTitle')}
              </span>
              <button onClick={() => setServerTransferModalOpen(false)} className="text-[#858585] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </h3>

            <div className="bg-purple-950/30 border border-purple-800/40 rounded p-2.5 text-[11px] text-purple-200 flex items-start gap-2">
              <span className="text-base leading-none">⚡</span>
              <span className="leading-tight">{t('sftp.serverTransferDesc')}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#858585] block mb-1 font-semibold">{t('sftp.sourceFiles')}</label>
                <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2.5 py-1.5 text-[11px] font-mono text-[#cccccc] max-h-20 overflow-y-auto">
                  {serverTransferPaths.map((p, idx) => (
                    <div key={idx} className="truncate" title={p}>• {p.split('/').pop() || p}</div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[#858585] block mb-1 font-semibold">{t('sftp.targetServer')}</label>
                {availableTargetSessions.length === 0 ? (
                  <div className="text-[11px] text-amber-400/90 bg-amber-950/20 border border-amber-800/30 p-2 rounded">
                    {t('sftp.noActiveServers')}
                  </div>
                ) : (
                  <select
                    value={serverTransferTargetSession}
                    onChange={e => setServerTransferTargetSession(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] outline-none"
                  >
                    {availableTargetSessions.map(tTab => (
                      <option key={tTab.id} value={tTab.id}>
                        {tTab.title} {tTab.host ? `(${tTab.host})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[#858585] block mb-1 font-semibold">{t('sftp.targetPath')}</label>
                <input
                  type="text"
                  value={serverTransferTargetDir}
                  onChange={e => setServerTransferTargetDir(e.target.value)}
                  placeholder="."
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono outline-none"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#cccccc] select-none hover:text-white">
                  <input
                    type="checkbox"
                    checked={serverTransferResume}
                    onChange={e => setServerTransferResume(e.target.checked)}
                    className="rounded border-[#3c3c3c] text-purple-600 focus:ring-0 bg-[#1e1e1e]"
                  />
                  <span>{t('sftp.resumeTransfer')}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2b2b2b]">
              <button
                onClick={() => setServerTransferModalOpen(false)}
                className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                disabled={availableTargetSessions.length === 0 || !serverTransferTargetSession}
                onClick={handleExecuteServerTransfer}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-medium rounded shadow-sm flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t('sftp.startTransferBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 断点续传智能询问弹窗 (Resumable Transfer Mode Prompt) */}
      {resumePrompt && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#252526] p-5 rounded-md border border-[#2b2b2b] shadow-2xl w-[420px] text-[#cccccc] space-y-4">
            <h3 className="font-semibold text-xs text-amber-400 border-b border-[#2b2b2b] pb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              {t('sftp.resumePromptTitle')}
            </h3>

            <p className="text-xs text-[#cccccc] leading-relaxed">
              {t('sftp.resumePromptDesc')
                .replace('{name}', resumePrompt.fileName)
                .replace('{resumed}', formatSize(resumePrompt.resumedBytes))
                .replace('{total}', formatSize(resumePrompt.totalBytes))
                .replace('{pct}', String(resumePrompt.percentage))}
            </p>

            <div className="bg-[#1e1e1e] p-3 rounded border border-[#2b2b2b] space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-[#858585]">
                <span>{resumePrompt.fileName}</span>
                <span className="text-amber-400 font-semibold">{resumePrompt.percentage}%</span>
              </div>
              <div className="w-full bg-[#181818] rounded-full h-1.5 overflow-hidden border border-[#2b2b2b]">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${resumePrompt.percentage}%` }} />
              </div>
              <div className="flex justify-between text-[#858585] text-[10px]">
                <span>{formatSize(resumePrompt.resumedBytes)}</span>
                <span>{formatSize(resumePrompt.totalBytes)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1 border-t border-[#2b2b2b]">
              <button
                onClick={() => {
                  const { paths, isUpload } = resumePrompt;
                  setResumePrompt(null);
                  if (isUpload) {
                    executeUpload(paths, true);
                  } else {
                    executeDownload(paths, true);
                  }
                }}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-medium rounded text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t('sftp.resumeBtn')}</span>
              </button>

              <button
                onClick={() => {
                  const { paths, isUpload } = resumePrompt;
                  setResumePrompt(null);
                  if (isUpload) {
                    executeUpload(paths, false);
                  } else {
                    executeDownload(paths, false);
                  }
                }}
                className="w-full py-2 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] hover:text-white font-medium rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t('sftp.overwriteBtn')}</span>
              </button>

              <button
                onClick={() => setResumePrompt(null)}
                className="w-full py-1.5 text-center text-[#858585] hover:text-[#cccccc] text-xs transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SftpPanel = React.memo(SftpPanelComponent);

