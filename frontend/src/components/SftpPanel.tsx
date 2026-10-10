import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Folder, File, ArrowLeft, ArrowRight, RefreshCw, Upload, Download, 
  Trash2, Edit3, Loader2, FolderPlus, Key, Eye, X, Star, ChevronDown, Check,
  ExternalLink, CheckCircle2, Columns, Archive, ShieldCheck, Terminal as TermIcon, Compass,
  GitBranch, GitCommit, SplitSquareVertical, Code, Info
} from 'lucide-react';
import { 
  SftpListDir, SftpDelete, SftpMkdir, SftpRename, SftpChmod, 
  LocalListDir, GetLocalHomeDir, LocalDelete, LocalMkdir, LocalRename, LocalReadFile, LocalWriteFile,
  SftpUploadPaths, SftpDownloadPaths, OpenRemoteFileWithEditor
} from '../../wailsjs/go/app/App';
import { app, models } from '../../wailsjs/go/models';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FolderDiffModal } from './FolderDiffModal';
import { SftpPreviewModal } from './SftpPreviewModal';
import { MonacoEditorModal } from './MonacoEditorModal';

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
  toggleSelect: (set: Set<string>, setFn: any, name: string, multi: boolean) => void;
  onContextMenu?: (e: React.MouseEvent, file: app.SftpFileInfo) => void;
  isGitRepo?: boolean;
  gitStatusMap?: Record<string, { status: string; staged: boolean; untracked: boolean }>;
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

const SftpListPanel: React.FC<SftpListPanelProps> = ({
  title, path, setPath, files, loading, loadDir, selected, setSelected, handleDbClick, isRemote, bookmarks, toggleBookmark, formatSize, toggleSelect, onContextMenu,
  isGitRepo, gitStatusMap
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const sortedFiles = React.useMemo(() => {
    return [...files].sort((a,b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : (a.isDir ? -1 : 1)));
  }, [files]);

  const rowVirtualizer = useVirtualizer({
    count: sortedFiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // approximately 32px per row (py-1.5 = 6px + text size)
    overscan: 10,
  });

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
          title="返回上一级目录"
        ><ArrowLeft className="w-3.5 h-3.5" /></button>
        <input 
          type="text" 
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') loadDir(path); }}
          className="flex-1 bg-transparent border-none focus:outline-none text-[10px] text-app-text px-1 font-mono"
        />
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto relative bg-app-bg">
        {loading && <div className="absolute inset-0 bg-app-surface flex items-center justify-center z-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>}
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const f = sortedFiles[virtualRow.index];
            return (
              <div 
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={(e) => toggleSelect(selected, setSelected, f.name, e.ctrlKey || e.metaKey)}
                onDoubleClick={() => handleDbClick(f)}
                onContextMenu={(e) => onContextMenu?.(e, f)}
                className={`flex items-center justify-between px-2 py-0 cursor-pointer text-[10px] select-none hover:bg-app-hover ${selected.has(f.name) ? 'bg-blue-900/40' : ''}`}
              >
                <div className="flex items-center gap-2 truncate">
                  {f.isDir ? <Folder className="w-3.5 h-3.5 text-yellow-500 shrink-0" /> : <File className="w-3.5 h-3.5 text-app-text-muted shrink-0" />}
                  <span className="truncate text-app-text">{f.name}</span>
                  {gitStatusMap?.[f.name] && (
                    <span 
                      className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold shrink-0 ${
                        gitStatusMap[f.name].status === 'modified' 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : gitStatusMap[f.name].status === 'added'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : gitStatusMap[f.name].status === 'deleted'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      }`}
                      title={`Git: ${gitStatusMap[f.name].status}${gitStatusMap[f.name].staged ? ' (已暂存)' : ''}`}
                    >
                      {gitStatusMap[f.name].status === 'modified' ? 'M' : gitStatusMap[f.name].status === 'added' ? 'A' : gitStatusMap[f.name].status === 'deleted' ? 'D' : '?'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-app-text-muted font-mono scale-90">{f.mode}</span>
                  {!f.isDir && <span className="text-app-text-muted w-12 text-right">{formatSize(f.size)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface SftpPanelProps {
  sessionId: string;
  onClose: () => void;
  onCdToTerminal?: (path: string) => void;
  currentTerminalDir?: string;
}

export const SftpPanel: React.FC<SftpPanelProps> = ({ sessionId, onClose, onCdToTerminal, currentTerminalDir }) => {
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

  // 终端工作目录联动跟随 (OSC 7 / cd)
  useEffect(() => {
    if (directoryFollow && currentTerminalDir && currentTerminalDir !== '.' && currentTerminalDir !== remotePath) {
      setRemotePath(currentTerminalDir);
      loadRemoteDir(currentTerminalDir);
    }
  }, [currentTerminalDir, directoryFollow]);

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
        setBusyAction(`正在批量上传 ${paths.length} 个项目...`);
        SftpUploadPaths(sessionId, paths, remotePath).then(() => {
          setTimeout(() => {
            setBusyAction(null);
            loadRemoteDir(remotePath);
          }, 1000);
        }).catch(err => {
          setBusyAction(null);
          alert("拖拽上传失败: " + err);
        });
      }
    };

    EventsOn('wails:file-drop', dropHandler);

    // Phase 3: 监听外部编辑器保存回传通知
    const cleanupSync = EventsOn('file-synced', (data: any) => {
      if (data && data.sessionId === sessionId) {
        setSyncNotice({ fileName: data.fileName, time: data.syncedAt });
        setTimeout(() => setSyncNotice(null), 3500);
        loadRemoteDir(remotePath);
      }
    });

    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);

    return () => {
      EventsOff('wails:file-drop');
      cleanupSync();
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [sessionId, remotePath]);

  const handleOpenExternalEditor = (file: app.SftpFileInfo) => {
    const full = remotePath.endsWith('/') ? remotePath + file.name : remotePath + '/' + file.name;
    setBusyAction(`正在使用外部编辑器打开 ${file.name}...`);
    OpenRemoteFileWithEditor(sessionId, full, '')
      .then(() => {
        setBusyAction(null);
      })
      .catch((err: any) => {
        setBusyAction(null);
        alert("调用外部编辑器失败: " + err);
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
      .catch(err => alert("无法读取远程目录: " + err))
      .finally(() => setRemoteLoading(false));
  };

  const loadLocalDir = (path: string) => {
    setLocalLoading(true);
    LocalListDir(path)
      .then(files => setLocalFiles(files || []))
      .catch(err => alert("无法读取本地目录: " + err))
      .finally(() => setLocalLoading(false));
  };

  // Selection
  const toggleSelect = (set: Set<string>, setFn: any, name: string, multi: boolean) => {
    setFn((prev: Set<string>) => {
      const newSet = multi ? new Set(prev) : new Set<string>();
      if (newSet.has(name)) newSet.delete(name);
      else newSet.add(name);
      return newSet;
    });
  };

  // Actions
  const handleUpload = () => {
    if (selectedLocal.size === 0) return;
    const paths = Array.from(selectedLocal).map(name => joinFilePath(localPath, name));
    setBusyAction(`正在上传 ${paths.length} 个项目...`);
    SftpUploadPaths(sessionId, paths, remotePath)
      .then(() => {
        setTimeout(() => { setBusyAction(null); loadRemoteDir(remotePath); }, 1000);
      })
      .catch(err => { setBusyAction(null); alert("上传失败: " + err); });
  };

  const handleDownload = () => {
    if (selectedRemote.size === 0) return;
    const paths = Array.from(selectedRemote).map(name => remotePath + (remotePath.endsWith('/') ? '' : '/') + name);
    setBusyAction(`正在下载 ${paths.length} 个项目...`);
    SftpDownloadPaths(sessionId, paths, localPath)
      .then(() => {
        setTimeout(() => { setBusyAction(null); loadLocalDir(localPath); }, 1000);
      })
      .catch(err => { setBusyAction(null); alert("下载失败: " + err); });
  };

  const handleRemoteDbClick = (file: app.SftpFileInfo) => {
    const full = remotePath.endsWith('/') ? remotePath + file.name : remotePath + '/' + file.name;
    if (file.isDir) {
      setRemotePath(full);
      loadRemoteDir(full);
    } else {
      // 双击远程文件，使用内置 Monaco 富文本代码编辑器打开
      setEditorModalFile({ path: full, name: file.name });
    }
  };

  const handleLocalDbClick = (file: app.SftpFileInfo) => {
    const full = joinFilePath(localPath, file.name);
    if (file.isDir) {
      setLocalPath(full);
      loadLocalDir(full);
    } else {
      setBusyAction("读取本地文件...");
      LocalReadFile(full).then(content => {
        setBusyAction(null);
        setEditingFile({ name: file.name, path: full, content });
      }).catch(err => {
        setBusyAction(null);
        alert(err);
      });
    }
  };

  const saveLocalEdit = () => {
    if (!editingFile) return;
    setBusyAction("保存本地文件...");
    LocalWriteFile(editingFile.path, editingFile.content).then(() => {
      setBusyAction(null);
      setEditingFile(null);
      loadLocalDir(localPath);
    }).catch(err => {
      setBusyAction(null);
      alert(err);
    });
  };

  const toggleBookmark = () => {
    const newBks = bookmarks.includes(remotePath) ? bookmarks.filter(p => p !== remotePath) : [...bookmarks, remotePath];
    setBookmarks(newBks);
    localStorage.setItem('sftp_bookmarks', JSON.stringify(newBks));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  // 压缩打包执行
  const handleExecuteCompress = async () => {
    if (!compressTargetName.trim() || compressItems.length === 0) return;
    setBusyAction(`正在压缩 ${compressItems.length} 个项目为 ${compressTargetName}...`);
    try {
      if ((window as any).go?.app?.App?.SftpCompress) {
        await (window as any).go.app.App.SftpCompress(sessionId, compressItems, compressTargetName.trim(), compressFormat);
        loadRemoteDir(remotePath);
        setCompressModalOpen(false);
      }
    } catch (err: any) {
      alert("压缩打包失败: " + (err?.message || err));
    } finally {
      setBusyAction(null);
    }
  };

  // 在线解压执行
  const handleExecuteExtract = async (archivePath: string, destDir?: string) => {
    setBusyAction(`正在解压 ${archivePath}...`);
    try {
      if ((window as any).go?.app?.App?.SftpExtract) {
        await (window as any).go.app.App.SftpExtract(sessionId, archivePath, destDir || remotePath);
        loadRemoteDir(remotePath);
      }
    } catch (err: any) {
      alert("在线解压失败: " + (err?.message || err));
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
      alert("哈希校验计算失败: " + (err?.message || err));
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

  return (
    <div className="w-[600px] bg-app-bg border-l border-app-border flex flex-col h-full text-xs text-app-text shadow-md relative">
      <div className="p-1 border-b border-app-border flex items-center justify-between shrink-0 bg-app-surface">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-blue-400">SFTP 双面板传输 (拖拽支持)</span>
          <button
            onClick={() => setDirectoryFollow(!directoryFollow)}
            className={`px-1.5 py-0.5 border text-[10px] flex items-center space-x-1 transition-colors ${
              directoryFollow
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/60'
                : 'bg-[#2d2d30] text-slate-400 border-[#3e3e42] hover:text-slate-200'
            }`}
            title="终端工作目录自动追踪与跟随 (OSC 7 / cd)"
          >
            <Compass className={`w-3 h-3 ${directoryFollow ? 'text-blue-400' : ''}`} />
            <span>目录跟随 {directoryFollow ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => setIsDiffModalOpen(true)}
            className="px-1.5 py-0.5 bg-[#2d2d30] hover:bg-blue-600 border border-[#3e3e42] text-slate-200 text-[10px] flex items-center space-x-1 transition-colors"
            title="双向目录差异对比与同步"
          >
            <Columns className="w-3 h-3" />
            <span>目录比对 (Diff)</span>
          </button>
        </div>
        <button onClick={onClose} className="text-app-text-muted hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        {/* Local Panel */}
        <SftpListPanel
          title="本地 (Local)"
          path={localPath}
          setPath={setLocalPath}
          files={localFiles}
          loading={localLoading}
          loadDir={loadLocalDir}
          selected={selectedLocal}
          setSelected={setSelectedLocal}
          handleDbClick={handleLocalDbClick}
          onContextMenu={(e, f) => handleContextMenu(e, f, false)}
          isRemote={false}
          bookmarks={bookmarks}
          toggleBookmark={toggleBookmark}
          formatSize={formatSize}
          toggleSelect={toggleSelect}
        />
        
        {/* Center Action Buttons */}
        <div className="w-12 bg-app-surface flex flex-col items-center justify-center gap-2 shrink-0 z-10 border-x border-app-border shadow-inner">
          <button onClick={handleUpload} disabled={selectedLocal.size===0} className="p-2 bg-blue-600/20 hover:bg-blue-600 rounded-none text-blue-400 hover:text-white transition-colors disabled:opacity-30" title="上传到远端">
            <ArrowRight className="h-5 w-5" />
          </button>
          <button onClick={handleDownload} disabled={selectedRemote.size===0} className="p-2 bg-green-600/20 hover:bg-green-600 rounded-none text-green-400 hover:text-white transition-colors disabled:opacity-30" title="下载到本地">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Remote Panel */}
        <SftpListPanel
          title="远程 (Remote)"
          path={remotePath}
          setPath={setRemotePath}
          files={remoteFiles}
          loading={remoteLoading}
          loadDir={loadRemoteDir}
          selected={selectedRemote}
          setSelected={setSelectedRemote}
          handleDbClick={handleRemoteDbClick}
          onContextMenu={(e, f) => handleContextMenu(e, f, true)}
          isRemote={true}
          bookmarks={bookmarks}
          toggleBookmark={toggleBookmark}
          formatSize={formatSize}
          toggleSelect={toggleSelect}
          isGitRepo={isGitRepo}
          gitStatusMap={gitStatusMap}
        />
      </div>

      {/* 同步成功提示 Toast */}
      {syncNotice && (
        <div className="absolute top-10 right-3 z-50 bg-[#1e1e1e] border border-green-600 text-green-400 px-3 py-1.5 shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <div className="text-[11px]">
            <span className="font-bold">{syncNotice.fileName}</span> 已自动静默回传同步 ({syncNotice.time})
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
              <span>在活动终端打开 (cd Here)</span>
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
                <span>内置 Monaco 编辑器 (Edit)</span>
              </button>

              {isGitRepo && (
                <button
                  onClick={async () => {
                    const relPath = contextMenu.file.name;
                    const wailsApp = (window as any).go?.app?.App;
                    if (wailsApp?.SftpGitDiff) {
                      setBusyAction("正在计算 Git Diff...");
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
                        alert("获取 Git Diff 失败: " + err);
                      } finally {
                        setBusyAction(null);
                      }
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-emerald-400 font-medium"
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  <span>查看 Git Diff 对比</span>
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
                <span>快速预览 (Preview)</span>
              </button>
              <button
                onClick={() => {
                  handleOpenExternalEditor(contextMenu.file);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#cccccc]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>外部编辑器打开 (External)</span>
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
                      alert("下载目录失败: " + (err?.message || err));
                    });
                  }
                } else {
                  if (wailsApp?.SftpDownloadFile) {
                    wailsApp.SftpDownloadFile(sessionId, fullRemote).catch((err: any) => {
                      alert("下载文件失败: " + (err?.message || err));
                    });
                  }
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#3794ff] font-medium"
            >
              <Download className="w-3.5 h-3.5 text-[#3794ff]" />
              <span>下载到指定路径... (Download)</span>
            </button>
          )}

          {/* 远端文件一键下载到左侧本地当前目录 */}
          {contextMenu.isRemote && (
            <button
              onClick={() => {
                const fullRemote = remotePath.endsWith('/') ? remotePath + contextMenu.file.name : remotePath + '/' + contextMenu.file.name;
                setBusyAction(`正在传输 ${contextMenu.file.name} 到本地面板 [${localPath}]...`);
                SftpDownloadPaths(sessionId, [fullRemote], localPath)
                  .then(() => {
                    setTimeout(() => {
                      setBusyAction(null);
                      loadLocalDir(localPath);
                    }, 1200);
                  })
                  .catch((err: any) => {
                    setBusyAction(null);
                    alert("传输失败: " + (err?.message || err));
                  });
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-[#cccccc]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>快速传输到左侧面板 (To Panel)</span>
            </button>
          )}

          {/* 本地文件一键上传到右侧远端当前目录 */}
          {!contextMenu.isRemote && (
            <button
              onClick={() => {
                const fullLocal = joinFilePath(localPath, contextMenu.file.name);
                setBusyAction(`正在上传 ${contextMenu.file.name} 到远端...`);
                SftpUploadPaths(sessionId, [fullLocal], remotePath)
                  .then(() => {
                    setTimeout(() => {
                      setBusyAction(null);
                      loadRemoteDir(remotePath);
                    }, 1200);
                  })
                  .catch((err: any) => {
                    setBusyAction(null);
                    alert("上传失败: " + (err?.message || err));
                  });
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2 transition-colors text-emerald-400"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>上传到远程 (Upload)</span>
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
              <span>🗜️ 压缩打包为... (Compress)</span>
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
              <span>📦 解压到当前目录 (Extract)</span>
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
              <span>🔍 校验文件哈希 (Verify Checksum)</span>
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
            <span>查看属性 (Properties)</span>
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
              远程压缩打包 (Remote Compress)
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#858585] block mb-1">压缩文件名:</label>
                <input
                  type="text"
                  value={compressTargetName}
                  onChange={e => setCompressTargetName(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[#858585] block mb-1">压缩格式:</label>
                <select
                  value={compressFormat}
                  onChange={e => {
                    setCompressFormat(e.target.value);
                    const base = compressTargetName.replace(/\.(tar\.gz|tgz|tar\.bz2|tbz2|tar\.xz|txz|zip|7z)$/i, '');
                    setCompressTargetName(`${base}.${e.target.value}`);
                  }}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] outline-none"
                >
                  <option value="tar.gz">.tar.gz (Gzip - 推荐通用)</option>
                  <option value="zip">.zip (标准 Zip)</option>
                  <option value="tar.bz2">.tar.bz2 (Bzip2 高压缩)</option>
                  <option value="tar.xz">.tar.xz (XZ 极高压缩)</option>
                  <option value="7z">.7z (7-Zip 归档)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#2b2b2b]">
              <button onClick={() => setCompressModalOpen(false)} className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded font-medium">取消</button>
              <button onClick={handleExecuteCompress} className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium rounded shadow-sm">开始压缩</button>
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
              文件哈希完整性校验 (Checksum Verification)
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
                <div className="text-[#858585]">文件名称: <span className="text-[#cccccc] font-medium">{verifyFile.name}</span></div>
                <div className="text-[#858585]">文件大小: <span className="font-mono text-[#cccccc]">{formatSize(verifyFile.size)}</span></div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[#858585] shrink-0">哈希算法:</label>
                <select
                  value={verifyAlgo}
                  onChange={e => setVerifyAlgo(e.target.value as any)}
                  className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded px-3 py-1.5 text-[#cccccc] font-mono outline-none"
                >
                  <option value="sha256">SHA-256 (推荐安全标准)</option>
                  <option value="md5">MD5 (传统校验)</option>
                  <option value="sha1">SHA-1</option>
                </select>
                <button
                  onClick={handleExecuteVerifyHash}
                  disabled={isVerifying}
                  className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white font-medium rounded disabled:opacity-50"
                >
                  {isVerifying ? '计算中...' : '开始计算'}
                </button>
              </div>

              {verifyResult && (
                <div className="space-y-2 p-3 bg-[#1e1e1e] rounded border border-[#3c3c3c] font-mono text-[11px]">
                  <div>
                    <div className="text-[#858585] text-[10px]">远端文件哈希 ({verifyResult.algorithm}):</div>
                    <div className="text-[#3794ff] break-all select-all">{verifyResult.remoteHash || '无输出'}</div>
                  </div>
                  {verifyResult.localHash && (
                    <div>
                      <div className="text-[#858585] text-[10px]">本地同名文件哈希:</div>
                      <div className="text-amber-300 break-all select-all">{verifyResult.localHash}</div>
                      <div className="mt-2">
                        {verifyResult.match ? (
                          <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-700 text-emerald-400 rounded text-xs font-semibold">
                            ✓ 哈希完全一致 (文件无损坏)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-950/80 border border-rose-700 text-rose-400 rounded text-xs font-semibold">
                            ✗ 哈希不匹配 (文件存在差异)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-[#2b2b2b]">
              <button onClick={() => setVerifyModalOpen(false)} className="px-3.5 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded font-medium">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Modal */}
      {editingFile && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#252526] w-full h-full max-w-3xl max-h-[80vh] border border-[#2b2b2b] shadow-2xl rounded-md flex flex-col overflow-hidden text-[#cccccc]">
            <div className="px-4 py-2.5 border-b border-[#2b2b2b] flex justify-between items-center bg-[#1f1f1f]">
              <span className="font-semibold text-xs text-[#cccccc]">编辑本地文件: {editingFile.name}</span>
              <button onClick={() => setEditingFile(null)} className="text-[#858585] hover:text-white p-1 rounded hover:bg-white/10 transition-colors"><X className="w-4 h-4"/></button>
            </div>
            <textarea 
              value={editingFile.content}
              onChange={(e) => setEditingFile({...editingFile, content: e.target.value})}
              className="flex-1 w-full bg-[#1e1e1e] p-4 text-[#cccccc] font-mono text-xs resize-none outline-none leading-relaxed"
              spellCheck={false}
            />
            <div className="px-4 py-2.5 border-t border-[#2b2b2b] flex justify-end gap-2.5 bg-[#1f1f1f]">
              <button onClick={() => setEditingFile(null)} className="px-3 py-1.5 text-xs font-medium text-[#cccccc] bg-[#3c3c3c] hover:bg-[#484848] rounded transition-colors">取消</button>
              <button onClick={saveLocalEdit} className="px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-medium rounded shadow-sm transition-colors">保存到本地</button>
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
                文件属性 (Properties)
              </h3>
              <div className="space-y-2 text-xs bg-[#1e1e1e] border border-[#3c3c3c] p-3 rounded">
                <p><span className="text-[#858585] w-16 inline-block">名称:</span> <span className="text-[#cccccc] font-medium break-all">{propFile.name}</span></p>
                <p><span className="text-[#858585] w-16 inline-block">类型:</span> {propFile.isDir ? '文件夹 (Directory)' : '文件'}</p>
                {propFile.isDir ? (
                  <div className="flex items-start justify-between">
                    <span className="text-[#858585] w-16 inline-block flex-shrink-0">大小:</span>
                    <div className="flex-1 text-right">
                      {folderSizeMap[propFilePath]?.loading ? (
                        <div className="flex items-center justify-end gap-1.5 text-[#0078d4]">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>
                            {formatSize(folderSizeMap[propFilePath]?.totalSize || 0)}
                            {' · '}
                            {folderSizeMap[propFilePath]?.fileCount || 0} 文件
                          </span>
                          <button
                            onClick={() => handleCancelCalcSize(propFilePath)}
                            className="text-[10px] text-[#858585] hover:text-rose-300 ml-1 underline"
                          >
                            取消
                          </button>
                        </div>
                      ) : folderSizeMap[propFilePath]?.done ? (
                        <span className="text-emerald-400 font-medium">
                          {formatSize(folderSizeMap[propFilePath].totalSize)}
                          <span className="text-[#858585] font-normal text-[11px] ml-1">
                            ({folderSizeMap[propFilePath].fileCount} 文件, {folderSizeMap[propFilePath].dirCount} 目录)
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#858585]">准备统计中...</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p><span className="text-[#858585] w-16 inline-block">大小:</span> {formatSize(propFile.size)} ({propFile.size} Bytes)</p>
                )}
                <p><span className="text-[#858585] w-16 inline-block">权限:</span> <span className="font-mono text-amber-400">{propFile.mode}</span></p>
                <p><span className="text-[#858585] w-16 inline-block">修改时间:</span> <span className="font-mono text-[11px] text-[#858585]">{propFile.modTime}</span></p>
              </div>
              <button onClick={() => setPropFile(null)} className="w-full py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] rounded font-medium text-xs transition-colors">关闭</button>
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
    </div>
  );
};
