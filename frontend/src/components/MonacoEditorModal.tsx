import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { 
  X, Save, FileCode, Check, AlertCircle, RefreshCw, 
  Lock, Unlock, SplitSquareVertical, Search, Copy, Download,
  CornerDownLeft, FileText, ChevronRight
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export interface EditorTab {
  id: string;
  sessionId: string;
  filePath: string;
  fileName: string;
  originalContent: string;
  currentContent: string;
  originalModTime: number;
  isDirty: boolean;
  isReadOnly: boolean;
  encoding: 'UTF-8' | 'GBK';
  lineEnding: 'LF' | 'CRLF';
  cursorPos: { line: number; col: number };
}

interface MonacoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  initialFile?: { path: string; name: string } | null;
  // Optional diff mode with preloaded diff data
  diffData?: {
    path: string;
    original: string;
    modified: string;
    repoPath?: string;
  } | null;
}

const EXT_TO_LANG: Record<string, string> = {
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  go: 'go',
  py: 'python',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  sql: 'sql',
  md: 'markdown',
  dockerfile: 'dockerfile',
  xml: 'xml',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  rs: 'rust',
  ini: 'ini',
  conf: 'ini',
  env: 'ini',
  java: 'java',
  php: 'php',
  rb: 'ruby',
  toml: 'ini',
  lua: 'lua',
};

function getLanguage(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower === 'dockerfile') return 'dockerfile';
  if (lower.startsWith('.env')) return 'ini';
  const ext = lower.split('.').pop() || '';
  return EXT_TO_LANG[ext] || 'plaintext';
}

export const MonacoEditorModal: React.FC<MonacoEditorModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  initialFile,
  diffData
}) => {
  const { t } = useI18n();
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    tabId: string;
    errorText: string;
  }>({ isOpen: false, tabId: '', errorText: '' });
  const [isDiffMode, setIsDiffMode] = useState<boolean>(!!diffData);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string>('');

  const appRpc = typeof window !== 'undefined' ? (window as any).go?.app?.App : null;

  // 加载文件到新 Tab 或切换到已有 Tab
  const loadFile = useCallback(async (path: string, name: string) => {
    const existing = tabs.find(t => t.sessionId === sessionId && t.filePath === path);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      let content = '';
      let modTime = 0;

      if (appRpc?.SftpReadFileDetail) {
        const detail = await appRpc.SftpReadFileDetail(sessionId, path);
        if (detail) {
          content = detail.content || '';
          modTime = detail.modTime || 0;
        }
      } else if (appRpc?.SftpReadFile) {
        content = await appRpc.SftpReadFile(sessionId, path);
      }

      const isCrlf = content.includes('\r\n');
      const newTab: EditorTab = {
        id: `${sessionId}_${path}_${Date.now()}`,
        sessionId,
        filePath: path,
        fileName: name,
        originalContent: content,
        currentContent: content,
        originalModTime: modTime,
        isDirty: false,
        isReadOnly: false,
        encoding: 'UTF-8',
        lineEnding: isCrlf ? 'CRLF' : 'LF',
        cursorPos: { line: 1, col: 1 },
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (err: any) {
      setErrorMessage(t('monaco.readFailed').replace('{err}', err?.message || err));
    } finally {
      setIsLoading(false);
    }
  }, [tabs, sessionId, appRpc]);

  // 当 initialFile 变化时自动加载
  useEffect(() => {
    if (isOpen && initialFile && !diffData) {
      loadFile(initialFile.path, initialFile.name);
    }
  }, [isOpen, initialFile, diffData, loadFile]);

  // 如果传入 diffData，初始化 Diff 模式
  useEffect(() => {
    if (isOpen && diffData) {
      setIsDiffMode(true);
      const diffTab: EditorTab = {
        id: `diff_${diffData.path}_${Date.now()}`,
        sessionId,
        filePath: diffData.path,
        fileName: `[Git Diff] ${diffData.path.split('/').pop() || diffData.path}`,
        originalContent: diffData.original,
        currentContent: diffData.modified,
        originalModTime: 0,
        isDirty: false,
        isReadOnly: false,
        encoding: 'UTF-8',
        lineEnding: 'LF',
        cursorPos: { line: 1, col: 1 },
      };
      setTabs([diffTab]);
      setActiveTabId(diffTab.id);
    }
  }, [isOpen, diffData, sessionId]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // 更新当前 Tab 内容
  const handleContentChange = (val: string | undefined) => {
    if (!activeTab || activeTab.isReadOnly) return;
    const newContent = val ?? '';
    const isDirty = newContent !== activeTab.originalContent;
    setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, currentContent: newContent, isDirty } : t));
  };

  // 保存当前 Tab 文件（乐观并发锁）
  const handleSave = async (forceOverwrite: boolean = false) => {
    if (!activeTab || !activeTab.isDirty) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      if (appRpc?.SftpSaveFileWithOptimisticLock) {
        const modTimeToPass = forceOverwrite ? 0 : activeTab.originalModTime;
        await appRpc.SftpSaveFileWithOptimisticLock(
          activeTab.sessionId,
          activeTab.filePath,
          activeTab.currentContent,
          modTimeToPass
        );
      } else if (appRpc?.SftpUploadPaths) {
        // fallback
        setErrorMessage(t('monaco.noSaveInterface'));
        return;
      }

      // 重新读取一次获取最新 modTime
      let newModTime = Date.now();
      if (appRpc?.SftpReadFileDetail) {
        try {
          const detail = await appRpc.SftpReadFileDetail(activeTab.sessionId, activeTab.filePath);
          if (detail) newModTime = detail.modTime;
        } catch { /* ignore */ }
      }

      setTabs(prev => prev.map(t => t.id === activeTab.id ? {
        ...t,
        originalContent: t.currentContent,
        originalModTime: newModTime,
        isDirty: false,
      } : t));

      setConflictModal({ isOpen: false, tabId: '', errorText: '' });
      setSaveSuccessNotice(t('monaco.saveSuccess'));
      setTimeout(() => setSaveSuccessNotice(''), 2500);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('FILE_CONFLICT')) {
        setConflictModal({ isOpen: true, tabId: activeTab.id, errorText: errMsg });
      } else {
        setErrorMessage(t('monaco.saveFailed').replace('{err}', errMsg));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 快捷键 Cmd+S / Ctrl+S 拦截
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        handleSave(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, activeTab]);

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabToClose = tabs.find(t => t.id === id);
    if (tabToClose?.isDirty) {
      if (!confirm(t('monaco.unsavedConfirm').replace('{file}', tabToClose.fileName))) {
        return;
      }
    }
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : '');
    }
    if (newTabs.length === 0) {
      onClose();
    }
  };

  // 换行符与只读切换
  const toggleLineEnding = () => {
    if (!activeTab) return;
    const newEnding = activeTab.lineEnding === 'LF' ? 'CRLF' : 'LF';
    const converted = newEnding === 'CRLF' 
      ? activeTab.currentContent.replace(/\r?\n/g, '\r\n')
      : activeTab.currentContent.replace(/\r\n/g, '\n');
    setTabs(prev => prev.map(t => t.id === activeTab.id ? {
      ...t,
      lineEnding: newEnding,
      currentContent: converted,
      isDirty: converted !== t.originalContent
    } : t));
  };

  const toggleReadOnly = () => {
    if (!activeTab) return;
    setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, isReadOnly: !t.isReadOnly } : t));
  };

  if (!isOpen) return null;

  const currentLang = activeTab ? getLanguage(activeTab.fileName) : 'plaintext';
  const totalLines = activeTab ? activeTab.currentContent.split('\n').length : 0;
  const totalChars = activeTab ? activeTab.currentContent.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="flex flex-col w-[94vw] max-w-[1300px] h-[88vh] bg-[#252526] border border-[#2b2b2b] rounded-lg shadow-[0_16px_36px_rgba(0,0,0,0.65)] overflow-hidden text-[#cccccc]">
        
        {/* Header / Tabs Bar */}
        <div className="flex items-center justify-between bg-[#1f1f1f] border-b border-[#2b2b2b] px-3 py-1 select-none shrink-0">
          {/* Tabs Container */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[75%] scrollbar-thin">
            {tabs.map(tab => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-t text-xs cursor-pointer border-t-2 transition-all ${
                    isActive 
                      ? 'bg-[#1e1e1e] border-t-[#0078d4] text-white font-medium shadow-sm' 
                      : 'bg-[#2d2d2d] border-t-transparent text-[#858585] hover:bg-[#333333] hover:text-[#cccccc]'
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-[#0078d4]' : 'text-[#858585]'}`} />
                  <span className="truncate max-w-[160px]">{tab.fileName}</span>
                  {tab.isDirty && (
                    <span className="w-2 h-2 rounded-full bg-[#cca700] animate-pulse" title={t('monaco.unsavedChanges')} />
                  )}
                  <button
                    onClick={(e) => closeTab(tab.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:bg-[#444444] rounded p-0.5 text-[#858585] hover:text-white transition-opacity"
                    title={t('monaco.closeTab')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            {saveSuccessNotice && (
              <span className="flex items-center gap-1 text-xs text-[#89d185] bg-[#388a34]/20 border border-[#388a34]/40 px-2 py-0.5 rounded">
                <Check className="w-3 h-3" />
                {saveSuccessNotice}
              </span>
            )}

            {/* Toggle Diff Mode */}
            <button
              onClick={() => setIsDiffMode(!isDiffMode)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs border transition-colors ${
                isDiffMode 
                  ? 'bg-[#04395e] border-[#0078d4] text-white' 
                  : 'bg-[#3c3c3c] border-[#3c3c3c] text-[#cccccc] hover:bg-[#484848]'
              }`}
              title={t('monaco.diffToggle')}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>{isDiffMode ? t('monaco.singleFileMode') : t('monaco.diffMode')}</span>
            </button>

            {/* Save Button */}
            <button
              onClick={() => handleSave(false)}
              disabled={!activeTab || !activeTab.isDirty || isLoading}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab?.isDirty
                  ? 'bg-[#0078d4] hover:bg-[#006cbe] text-white shadow-sm'
                  : 'bg-[#3c3c3c]/50 text-[#666666] cursor-not-allowed'
              }`}
              title={t('monaco.saveTip')}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('common.save')}</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333] transition-colors ml-1"
              title={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Remote Path Breadcrumb */}
        {activeTab && (
          <div className="flex items-center justify-between px-3 py-1 bg-[#181818] border-b border-[#2b2b2b] text-[11px] text-[#858585] shrink-0">
            <div className="flex items-center gap-1 truncate max-w-[80%]">
              <span className="text-[#858585]">{t('monaco.remotePath')}</span>
              <span className="text-[#cccccc] font-mono select-all truncate">{activeTab.filePath}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{t('monaco.lang')} <strong className="text-[#0078d4] uppercase">{currentLang}</strong></span>
              <span>{t('monaco.size')} <strong className="text-[#cccccc]">{t('monaco.chars').replace('{count}', String(totalChars))}</strong></span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#a1260d]/15 border-b border-[#a1260d]/40 text-xs text-[#f48771] shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {/* Editor Viewport */}
        <div className="flex-1 w-full h-full relative overflow-hidden bg-[#1e1e1e]">
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="flex items-center gap-2 bg-[#252526] border border-[#2b2b2b] px-4 py-2 rounded text-[#cccccc] text-xs shadow-xl">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0078d4]" />
                <span>{t('monaco.syncingRemote')}</span>
              </div>
            </div>
          )}

          {activeTab ? (
            isDiffMode ? (
              <DiffEditor
                height="100%"
                language={currentLang}
                theme="vs-dark"
                original={activeTab.originalContent}
                modified={activeTab.currentContent}
                options={{
                  renderSideBySide: true,
                  readOnly: activeTab.isReadOnly,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                }}
              />
            ) : (
              <Editor
                height="100%"
                language={currentLang}
                theme="vs-dark"
                value={activeTab.currentContent}
                onChange={handleContentChange}
                options={{
                  readOnly: activeTab.isReadOnly,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                  wordWrap: 'off',
                  tabSize: 2,
                  automaticLayout: true,
                }}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#858585] gap-2">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">{t('monaco.noOpenFile')}</p>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#1f1f1f] border-t border-[#2b2b2b] text-[11px] text-[#858585] select-none shrink-0">
          <div className="flex items-center gap-3">
            {/* Read-only Toggle */}
            <button
              onClick={toggleReadOnly}
              className={`flex items-center gap-1 hover:text-[#cccccc] transition-colors ${
                activeTab?.isReadOnly ? 'text-[#cca700]' : 'text-[#858585]'
              }`}
              title="Toggle Read-only Protection"
            >
              {activeTab?.isReadOnly ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{activeTab?.isReadOnly ? t('monaco.readOnly') : t('monaco.editable')}</span>
            </button>

            {/* Line Ending LF/CRLF */}
            <button
              onClick={toggleLineEnding}
              className="hover:text-[#0078d4] transition-colors font-mono"
              title="Toggle LF / CRLF"
            >
              {activeTab?.lineEnding || 'LF'}
            </button>

            {/* Encoding */}
            <span className="text-[#858585] font-mono">
              {activeTab?.encoding || 'UTF-8'}
            </span>

            {/* Indent info */}
            <span className="text-[#858585]">Spaces: 2</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[#858585]">
            <span>{t('monaco.totalLines').replace('{count}', String(totalLines))}</span>
            <span className="text-[#555555]">|</span>
            <span>OmniTerminal Monaco Pro</span>
          </div>
        </div>
      </div>

      {/* 乐观并发锁冲突弹窗 (Optimistic Lock Conflict Dialog) */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#252526] border border-[#cca700] rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-[#cca700] font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-base text-[#e0e0e0]">{t('monaco.conflictTitle')}</h3>
            </div>
            
            <p className="text-xs text-[#cccccc] leading-relaxed">
              {conflictModal.errorText || t('monaco.conflictDesc')}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConflictModal({ isOpen: false, tabId: '', errorText: '' })}
                className="px-3 py-1 rounded text-xs bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc]"
              >
                {t('monaco.cancelConflict')}
              </button>
              <button
                onClick={() => {
                  setConflictModal({ isOpen: false, tabId: '', errorText: '' });
                  setIsDiffMode(true);
                }}
                className="px-3 py-1 rounded text-xs bg-[#04395e] border border-[#0078d4] text-white hover:bg-[#006cbe]"
              >
                {t('monaco.enterDiff')}
              </button>
              <button
                onClick={() => handleSave(true)}
                className="px-3 py-1 rounded text-xs bg-[#a1260d] hover:bg-[#b82a0e] text-white font-medium"
              >
                {t('monaco.forceOverwrite')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
