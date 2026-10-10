import React, { useState, useEffect } from 'react';
import { Columns, RefreshCw, X, ArrowRight, ArrowLeft, Check, AlertCircle, Folder, File, CheckCircle2 } from 'lucide-react';
import { SftpUploadPaths, SftpDownloadPaths } from '../../wailsjs/go/app/App';

export interface DirDiffItem {
  relativePath: string;
  name: string;
  isDir: boolean;
  status: 'only_local' | 'only_remote' | 'modified' | 'same' | string;
  localSize: number;
  remoteSize: number;
  localModTime: string;
  remoteModTime: string;
}

export interface DirDiffResult {
  totalFiles: number;
  diffCount: number;
  items: DirDiffItem[];
}

interface FolderDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  remoteDir: string;
  localDir: string;
  onSyncComplete?: () => void;
}

export function FolderDiffModal({
  isOpen,
  onClose,
  sessionId,
  remoteDir,
  localDir,
  onSyncComplete,
}: FolderDiffModalProps) {
  const [loading, setLoading] = useState(false);
  const [diffResult, setDiffResult] = useState<DirDiffResult | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'diff_only'>('diff_only');
  const [syncing, setSyncing] = useState(false);

  const fetchDiff = () => {
    if (!sessionId || !remoteDir || !localDir) return;
    setLoading(true);
    const compareFn = (window as any).go?.app?.App?.CompareDirectories;
    if (!compareFn) {
      setLoading(false);
      return;
    }
    compareFn(sessionId, remoteDir, localDir)
      .then((res: DirDiffResult) => {
        setDiffResult(res);
        const initialSelected = new Set<string>();
        (res.items || []).forEach((item: DirDiffItem) => {
          if (item.status !== 'same') {
            initialSelected.add(item.relativePath);
          }
        });
        setSelectedPaths(initialSelected);
      })
      .catch((err: any) => {
        alert("比对目录差异失败: " + err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiff();
    }
  }, [isOpen, sessionId, remoteDir, localDir]);

  const items = diffResult?.items || [];
  const filteredItems = filter === 'diff_only' ? items.filter((i: DirDiffItem) => i.status !== 'same') : items;

  const toggleSelectAll = () => {
    if (!diffResult) return;
    if (selectedPaths.size === filteredItems.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(filteredItems.map((i: DirDiffItem) => i.relativePath)));
    }
  };

  const handleSyncSelected = (direction: 'upload' | 'download') => {
    if (selectedPaths.size === 0) return;
    setSyncing(true);

    const uploadLocalPaths: string[] = [];
    const downloadRemotePaths: string[] = [];

    selectedPaths.forEach((rel) => {
      uploadLocalPaths.push(localDir + (localDir.endsWith('/') ? '' : '/') + rel);
      downloadRemotePaths.push(remoteDir + (remoteDir.endsWith('/') ? '' : '/') + rel);
    });

    const promise = direction === 'upload' 
      ? SftpUploadPaths(sessionId, uploadLocalPaths, remoteDir)
      : SftpDownloadPaths(sessionId, downloadRemotePaths, localDir);

    promise
      .then(() => {
        alert(`🎉 ${direction === 'upload' ? '上传同步' : '下载同步'}任务已提交至传输队列！`);
        onSyncComplete?.();
        fetchDiff();
      })
      .catch((err: any) => {
        alert("同步失败: " + err);
      })
      .finally(() => setSyncing(false));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-full max-w-4xl flex flex-col text-[#cccccc] text-xs overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Columns className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">SFTP 目录结构与文件双向比对</h2>
              <span className="text-[11px] text-[#858585] font-normal">Directory Structure & File Content Diff Sync</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#858585] hover:text-[#e0e0e0] rounded p-1.5 hover:bg-[#333333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paths and filter bar */}
        <div className="p-3 bg-[#181818] border-b border-[#2b2b2b] flex items-center justify-between gap-4 shrink-0">
          <div className="flex-1 space-y-1.5 text-xs font-mono">
            <div className="truncate text-[#cccccc] flex items-center gap-2">
              <span className="text-[#858585]">💻 本地路径:</span> 
              <span className="text-[#cca700] bg-[#1e1e1e] px-2 py-0.5 rounded border border-[#3c3c3c]">{localDir}</span>
            </div>
            <div className="truncate text-[#cccccc] flex items-center gap-2">
              <span className="text-[#858585]">🌐 远端路径:</span> 
              <span className="text-[#0078d4] bg-[#1e1e1e] px-2 py-0.5 rounded border border-[#3c3c3c]">{remoteDir}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setFilter(filter === 'diff_only' ? 'all' : 'diff_only')}
              className={`px-3 py-1 text-xs font-medium rounded border transition-all ${filter === 'diff_only' ? 'bg-[#04395e] border-[#0078d4] text-white' : 'bg-[#3c3c3c] border-[#3c3c3c] text-[#cccccc]'}`}
            >
              {filter === 'diff_only' ? '仅显示差异项' : '显示全部文件'}
            </button>
            <button
              onClick={fetchDiff}
              disabled={loading}
              className="px-3 py-1 bg-[#3c3c3c] hover:bg-[#484848] border border-[#3c3c3c] text-[#cccccc] text-xs font-medium rounded flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>重新比对</span>
            </button>
          </div>
        </div>

        {/* Table content */}
        <div className="p-4 max-h-[55vh] overflow-y-auto bg-[#1e1e1e]">
          {loading ? (
            <div className="py-16 text-center text-[#858585] flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#0078d4]" />
              <span className="text-xs">正在递归扫描比对两端目录结构与文件哈希大小...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-[#858585] flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-[#89d185]" />
              <span className="text-xs font-medium text-[#e0e0e0]">两端目录内容完全一致，未发现任何文件差异！</span>
            </div>
          ) : (
            <div className="border border-[#2b2b2b] rounded overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-[#1f1f1f] border-b border-[#2b2b2b] text-[#858585] text-[11px] font-sans font-medium">
                    <th className="py-2 px-3 w-10 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedPaths.size > 0 && selectedPaths.size === filteredItems.length}
                        onChange={toggleSelectAll}
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                      />
                    </th>
                    <th className="py-2 px-3">相对路径</th>
                    <th className="py-2 px-3">比对状态</th>
                    <th className="py-2 px-3">本地大小</th>
                    <th className="py-2 px-3">远端大小</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2b2b] bg-[#252526]">
                  {filteredItems.map((item) => {
                    const isSelected = selectedPaths.has(item.relativePath);
                    return (
                      <tr 
                        key={item.relativePath}
                        onClick={() => {
                          const next = new Set(selectedPaths);
                          if (next.has(item.relativePath)) next.delete(item.relativePath);
                          else next.add(item.relativePath);
                          setSelectedPaths(next);
                        }}
                        className={`cursor-pointer hover:bg-[#2a2d2e] transition-colors ${isSelected ? 'bg-[#04395e]/30' : ''}`}
                      >
                        <td className="py-1.5 px-3 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-[#cccccc] flex items-center space-x-2">
                          {item.isDir ? <Folder className="w-3.5 h-3.5 text-[#cca700] shrink-0" /> : <File className="w-3.5 h-3.5 text-[#858585] shrink-0" />}
                          <span className="truncate">{item.relativePath}</span>
                        </td>
                        <td className="py-1.5 px-3 font-sans">
                          {item.status === 'only_local' && <span className="px-2 py-0.5 bg-[#388a34]/20 text-[#89d185] border border-[#388a34]/40 rounded text-[10px] font-semibold">🟢 仅本地存在</span>}
                          {item.status === 'only_remote' && <span className="px-2 py-0.5 bg-[#0078d4]/20 text-[#75beff] border border-[#0078d4]/40 rounded text-[10px] font-semibold">🔵 仅远端存在</span>}
                          {item.status === 'modified' && <span className="px-2 py-0.5 bg-[#cca700]/20 text-[#cca700] border border-[#cca700]/40 rounded text-[10px] font-semibold">🟡 内容/大小不一致</span>}
                          {item.status === 'same' && <span className="px-2 py-0.5 bg-[#3c3c3c]/50 text-[#858585] rounded text-[10px]">⚪ 一致</span>}
                        </td>
                        <td className="py-1.5 px-3 text-[#858585] text-[11px]">{item.status === 'only_remote' ? '—' : `${item.localSize} B`}</td>
                        <td className="py-1.5 px-3 text-[#858585] text-[11px]">{item.status === 'only_local' ? '—' : `${item.remoteSize} B`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-t border-[#2b2b2b] shrink-0">
          <div className="text-xs text-[#858585]">
            已勾选 <strong className="text-[#0078d4] font-bold">{selectedPaths.size}</strong> 项
            {diffResult && ` (共扫描发现 ${diffResult.diffCount} 处差异)`}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSyncSelected('upload')}
              disabled={selectedPaths.size === 0 || syncing}
              className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbe] disabled:opacity-40 text-white font-medium text-xs rounded flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>上传覆盖远端</span>
            </button>
            <button
              onClick={() => handleSyncSelected('download')}
              disabled={selectedPaths.size === 0 || syncing}
              className="px-3 py-1 bg-[#252526] hover:bg-[#2a2d2e] border border-[#3c3c3c] disabled:opacity-40 text-[#cccccc] hover:text-white font-medium text-xs rounded flex items-center space-x-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>下载覆盖本地</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] font-medium text-xs rounded transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
