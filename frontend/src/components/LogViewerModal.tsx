import React, { useState, useEffect } from 'react';
import { X, RefreshCcw, FileText, Trash2, HardDrive, Download, Shield } from 'lucide-react';
import { ListLogFiles, ReadLogContent, DeleteLogFile } from '../../wailsjs/go/app/App';
import { useI18n } from '../i18n/I18nContext';

interface LogViewerModalProps {
  onClose: () => void;
}

export const LogViewerModal: React.FC<LogViewerModalProps> = ({ onClose }) => {
  const { t } = useI18n();
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [hexView, setHexView] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const result = await ListLogFiles();
      setFiles(result || []);
      if (result && result.length > 0 && !selectedFile) {
        handleSelect(result[0]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleSelect = async (file: any) => {
    setSelectedFile(file);
    setContent(t('common.loading') + '...');
    try {
      const data = await ReadLogContent(file.path);
      setContent(data);
    } catch (e) {
      setContent(t('logViewer.readFailed') + String(e));
    }
  };

  const handleDelete = async (e: React.MouseEvent, file: any) => {
    e.stopPropagation();
    if (!confirm(t('logViewer.deleteConfirm').replace('{name}', file.name))) return;
    try {
      await DeleteLogFile(file.path);
      if (selectedFile?.path === file.path) {
        setSelectedFile(null);
        setContent('');
      }
      fetchFiles();
    } catch (err) {
      alert(t('logViewer.deleteFailed') + err);
    }
  };

  const toHexDump = (str: string) => {
    let out = '';
    for (let i = 0; i < str.length; i += 16) {
      const chunk = str.slice(i, i + 16);
      let hex = '';
      let ascii = '';
      for (let j = 0; j < chunk.length; j++) {
        const code = chunk.charCodeAt(j);
        hex += code.toString(16).padStart(2, '0').toUpperCase() + ' ';
        ascii += (code >= 32 && code <= 126) ? chunk[j] : '.';
      }
      out += i.toString(16).padStart(8, '0').toUpperCase() + '  ' + hex.padEnd(48, ' ') + '  |' + ascii + '|\n';
    }
    return out;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-[#cccccc]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e0e0e0] leading-tight">{t('logViewer.title')}</h2>
              <span className="text-[11px] text-[#858585] font-normal">Audit Trail & Terminal Session Log Viewer</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={fetchFiles}
              className="p-1 text-[#858585] hover:text-[#e0e0e0] hover:bg-[#333333] rounded transition-colors"
              title={t('common.refresh')}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={onClose}
              className="p-1 text-[#858585] hover:text-[#e0e0e0] hover:bg-[#333333] rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar - File List */}
          <div className="w-64 border-r border-[#2b2b2b] bg-[#181818] flex flex-col shrink-0 p-3 space-y-2">
            <div className="px-2 py-1 text-xs font-semibold text-[#858585] uppercase tracking-wider">
              {t('logViewer.localAudit')}
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
              {loading && files.length === 0 ? (
                <div className="text-center text-xs text-[#858585] py-6">{t('logViewer.loading')}</div>
              ) : files.length === 0 ? (
                <div className="text-center text-xs text-[#858585] py-6">{t('logViewer.noLogs')}</div>
              ) : (
                files.map(f => (
                  <div 
                    key={f.path}
                    onClick={() => handleSelect(f)}
                    className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-xs ${
                      selectedFile?.path === f.path 
                        ? 'bg-[#04395e] text-white border-l-2 border-l-[#0078d4] font-medium' 
                        : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <div className="truncate">{f.name}</div>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, f)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#858585] hover:text-[#f14c4c] hover:bg-[#331c19] rounded transition-colors shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main - Content View */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] relative">
            {selectedFile ? (
              <>
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#2b2b2b] bg-[#1f1f1f]">
                  <div className="text-xs text-[#858585] truncate flex items-center gap-2">
                    <span className="font-medium text-[#e0e0e0]">{selectedFile.name}</span>
                    <span>•</span>
                    <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="font-mono">{selectedFile.modTime}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-[#858585] hover:text-[#cccccc] transition-colors">
                      <input 
                        type="checkbox" 
                        checked={hexView} 
                        onChange={e => setHexView(e.target.checked)} 
                        className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#0078d4] focus:ring-0 w-3.5 h-3.5"
                      />
                      <span>{t('logViewer.hexView')}</span>
                    </label>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-[#1e1e1e]">
                  {selectedFile.name.endsWith('.html') && !hexView ? (
                    <div className="w-full h-full bg-white text-black p-4 rounded overflow-auto" dangerouslySetInnerHTML={{ __html: content }} />
                  ) : (
                    <pre className="text-xs font-mono text-[#cccccc] whitespace-pre-wrap word-break-all leading-relaxed font-normal">
                      {hexView ? toHexDump(content) : content}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#858585] text-xs">
                <div className="w-10 h-10 rounded bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4] mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <p>{t('logViewer.selectPrompt')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

